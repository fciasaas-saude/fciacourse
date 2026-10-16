import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const ORGANIZATION_ID = "d52a0a28-bff4-4fbf-b288-165f33f958e4";
const USER_ID = "6141fb51-8377-4d95-9c8d-463e8978471a";
const AI_GATEWAY_URL = "https://iron-cody-api.fly.dev/v1/chat/completions";

// Termos-chave de busca no RAG de acordo com o tema de cada módulo
function getKeywordsForModule(title) {
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
  return ["negociação", "estratégia", "tática"];
}

async function generateRemainingModules() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const aiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;

  const supabase = createClient(supabaseUrl, serviceKey);

  console.log("🔍 Buscando todos os módulos cadastrados em course_modules...");
  const { data: allModules, error: errMods } = await supabase
    .from("course_modules")
    .select("id, module_number, title, description, learning_objective, course_id")
    .order("sort_order", { ascending: true });

  if (errMods || !allModules || allModules.length === 0) {
    console.error("❌ Nenhum módulo encontrado:", errMods?.message);
    return;
  }

  // Verifica quais já têm versão salva
  const { data: existingVersions } = await supabase
    .from("module_versions")
    .select("module_id");

  const completedIds = new Set((existingVersions || []).map(v => v.module_id));
  const pendingModules = allModules.filter(m => !completedIds.has(m.id));

  console.log(`📋 Total de módulos: ${allModules.length} | Já gerados: ${completedIds.size} | Pendentes: ${pendingModules.length}`);

  if (pendingModules.length === 0) {
    console.log("✅ Todos os módulos já possuem conteúdo gerado!");
    return;
  }

  const systemPrompt = `Você é o Redator Pedagógico Master da FCIA Academy.
Seu objetivo é transformar as diretrizes do módulo e os trechos de referência (RAG) em uma aula prática, densa, sem enrolação e pronta para consumo executivo.
A resposta deve ser em formato JSON puro com duas chaves obrigatórias:
1. "markdown": Uma aula completa estruturada em Markdown (Introdução, Conceito Central, Aplicação Prática no Mercado, Estudo de Caso Rápido, Checklist de Ação).
2. "lessons": Array de tópicos/lições da aula: [{"lesson_number": 1, "title": "...", "duration_minutes": 15}]

Sem tags markdown fora do JSON.`;

  for (const mod of pendingModules) {
    console.log(`\n======================================================`);
    console.log(`🚀 Processando Módulo ${mod.module_number}: [${mod.title}]`);

    // Busca de chunks relevantes no RAG
    const keywords = getKeywordsForModule(mod.title);
    let chunks = [];

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

    // Fallback se não encontrar por palavra-chave específica
    if (chunks.length === 0) {
      const { data } = await supabase.from("source_chunks").select("content, chunk_index").limit(4);
      chunks = data || [];
    }

    const ragContext = chunks
      .map((c, i) => `--- TRECHO ${i + 1} (Chunk #${c.chunk_index}) ---\n${c.content}`)
      .join("\n\n");

    console.log(`📚 RAG: ${chunks.length} trechos conceituais injetados no contexto.`);
    console.log(`🧠 Solicitando redação ao Claude (lv3/claude-sonnet-5)...`);

    const userPrompt = `MÓDULO: ${mod.title}
OBJETIVO DE APRENDIZAGEM: ${mod.learning_objective}
DESCRIÇÃO: ${mod.description}

MATERIAL DE REFERÊNCIA ORIGINAL DO LIVRO (RAG):
${ragContext}

Redija a aula executiva baseada nessas fontes.`;

    const aiResponse = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${aiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "lv3/claude-sonnet-5",
        stream: false,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.4
      })
    });

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content;

    if (!rawContent) {
      console.error(`❌ Resposta vazia para o módulo ${mod.module_number}:`, JSON.stringify(aiData));
      continue;
    }

    const cleanJson = rawContent.replace(/```json/gi, "").replace(/```/g, "").trim();
    let generatedData;
    try {
      generatedData = JSON.parse(cleanJson);
    } catch (e) {
      console.error(`❌ Falha no parse JSON da IA (Módulo ${mod.module_number}):`, rawContent);
      continue;
    }

    console.log(`✅ Aula gerada! Lições estruturadas: ${generatedData.lessons?.length || 0}`);

    // Grava no Supabase
    const versionPayload = {
      module_id: mod.id,
      version: 1,
      content_markdown: generatedData.markdown,
      content_jsonb: {
        lessons: generatedData.lessons || [],
        sources_used: chunks.map(c => c.chunk_index)
      },
      generation_metadata: {
        model: "lv3/claude-sonnet-5",
        chunks_count: chunks.length,
        timestamp: new Date().toISOString()
      },
      status: "draft",
      created_by: USER_ID
    };

    const { data: savedVersion, error: errSave } = await supabase
      .from("module_versions")
      .insert(versionPayload)
      .select()
      .single();

    if (errSave) {
      console.error(`❌ Erro ao salvar módulo ${mod.module_number}:`, errSave.message);
    } else {
      console.log(`🌟 Módulo ${mod.module_number} gravado com sucesso! (ID: ${savedVersion.id} | ${savedVersion.content_markdown.length} caracteres)`);
    }
  }

  console.log("\n🎉 TODOS OS MÓDULOS FORAM PROCESSADOS E SALVOS COM SUCESSO!");
}

generateRemainingModules();
