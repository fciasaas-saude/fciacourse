import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const AI_GATEWAY_URL = "https://iron-cody-api.fly.dev/v1/chat/completions";

function getKeywordsForModule(title: string): string[] {
  const t = title.toLowerCase();
  if (t.includes("psicologia") || t.includes("influência") || t.includes("contraparte")) {
    return ["psicologia", "emoção", "perfil", "ouvir", "comportamento"];
  }
  if (t.includes("concessões") || t.includes("ancoragem") || t.includes("valor")) {
    return ["concessão", "ancoragem", "preço", "proposta", "troca"];
  }
  if (t.includes("fechamento") || t.includes("contratual") || t.includes("acordo")) {
    return ["fechamento", "acordo", "contrato", "conclusão", "compromisso"];
  }
  return ["negociação", "estratégia", "tática", "preparação"];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { course_id, module_id } = body;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const aiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;

    if (!supabaseUrl || !serviceKey || !aiKey) {
      return NextResponse.json(
        { error: "Variáveis de ambiente (Supabase ou AI Key) ausentes." },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Consulta os módulos alvos
    let query = supabase
      .from("course_modules")
      .select("id, module_number, title, description, learning_objective, course_id")
      .order("sort_order", { ascending: true });

    if (module_id) {
      query = query.eq("id", module_id);
    } else if (course_id) {
      query = query.eq("course_id", course_id);
    }

    const { data: modules, error: errMods } = await query;
    if (errMods || !modules || modules.length === 0) {
      return NextResponse.json(
        { error: "Nenhum módulo encontrado para o critério informado." },
        { status: 404 }
      );
    }

    // Busca quais módulos já possuem versão gerada
    const moduleIds = modules.map((m) => m.id);
    const { data: existingVersions } = await supabase
      .from("module_versions")
      .select("module_id")
      .in("module_id", moduleIds);

    const completedSet = new Set((existingVersions || []).map((v) => v.module_id));
    const pendingModules = modules.filter((m) => !completedSet.has(m.id));

    if (pendingModules.length === 0) {
      return NextResponse.json({
        message: "Todos os módulos solicitados já possuem conteúdo gerado.",
        total: modules.length,
        processed: 0,
      });
    }

    const systemPrompt = `Você é o Redator Pedagógico Master da FCIA Academy.
Seu objetivo é transformar as diretrizes do módulo e os trechos de referência (RAG) em uma aula prática, densa, sem enrolação e pronta para consumo executivo.
A resposta deve ser em formato JSON puro com duas chaves obrigatórias:
1. "markdown": Uma aula completa estruturada em Markdown (Introdução, Conceito Central, Aplicação Prática no Mercado, Estudo de Caso Rápido, Checklist de Ação).
2. "lessons": Array de tópicos/lições da aula: [{"lesson_number": 1, "title": "...", "duration_minutes": 15}]

Sem tags markdown fora do JSON.`;

    const results = [];

    for (const mod of pendingModules) {
      const keywords = getKeywordsForModule(mod.title);
      let chunks: Array<{ content: string; chunk_index: number }> = [];

      for (const kw of keywords) {
        const { data } = await supabase
          .from("source_chunks")
          .select("content, chunk_index")
          .ilike("content", `%${kw}%`)
          .limit(2);

        if (data && data.length > 0) {
          chunks.push(...data);
        }
        if (chunks.length >= 4) break;
      }

      if (chunks.length === 0) {
        const { data } = await supabase
          .from("source_chunks")
          .select("content, chunk_index")
          .limit(4);
        chunks = data || [];
      }

      const ragContext = chunks
        .map((c, i) => `--- TRECHO ${i + 1} (Chunk #${c.chunk_index}) ---\n${c.content}`)
        .join("\n\n");

      const userPrompt = `MÓDULO: ${mod.title}
OBJETIVO DE APRENDIZAGEM: ${mod.learning_objective}
DESCRIÇÃO: ${mod.description}

MATERIAL DE REFERÊNCIA ORIGINAL DO LIVRO (RAG):
${ragContext}

Redija a aula executiva baseada nessas fontes.`;

      const aiResponse = await fetch(AI_GATEWAY_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${aiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "lv3/claude-sonnet-5",
          stream: false,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.4,
        }),
      });

      const aiData = await aiResponse.json();
      const rawContent = aiData.choices?.[0]?.message?.content;

      if (!rawContent) continue;

      const cleanJson = rawContent.replace(/```json/gi, "").replace(/```/g, "").trim();
      let generatedData;
      try {
        generatedData = JSON.parse(cleanJson);
      } catch {
        continue;
      }

      const versionPayload = {
        module_id: mod.id,
        version: 1,
        content_markdown: generatedData.markdown,
        content_jsonb: {
          lessons: generatedData.lessons || [],
          sources_used: chunks.map((c) => c.chunk_index),
        },
        generation_metadata: {
          model: "lv3/claude-sonnet-5",
          chunks_count: chunks.length,
          timestamp: new Date().toISOString(),
        },
        status: "draft",
      };

      const { data: savedVersion, error: errSave } = await supabase
        .from("module_versions")
        .insert(versionPayload)
        .select("id, module_id, status")
        .single();

      if (!errSave && savedVersion) {
        results.push({
          module_id: mod.id,
          module_number: mod.module_number,
          title: mod.title,
          version_id: savedVersion.id,
          lessons_count: generatedData.lessons?.length || 0,
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed_count: results.length,
      modules: results,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Erro interno ao processar a rota." },
      { status: 500 }
    );
  }
}
