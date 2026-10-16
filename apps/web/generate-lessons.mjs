import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const ORGANIZATION_ID = "d52a0a28-bff4-4fbf-b288-165f33f958e4";
const USER_ID = "6141fb51-8377-4d95-9c8d-463e8978471a";
const AI_GATEWAY_URL = "https://iron-cody-api.fly.dev/v1/chat/completions";

async function generateModuleContent() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const aiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;

  const supabase = createClient(supabaseUrl, serviceKey);

  console.log("🔍 [1/4] Carregando o primeiro módulo cadastrado...");
  const { data: moduleData, error: errMod } = await supabase
    .from("course_modules")
    .select("id, title, description, learning_objective, course_id")
    .order("sort_order", { ascending: true })
    .limit(1)
    .single();

  if (errMod || !moduleData) {
    console.error("❌ Erro ao buscar módulo:", errMod?.message);
    return;
  }
  console.log(`📌 Módulo alvo: [${moduleData.title}]`);

  console.log("\n📚 [2/4] Recuperando chunks semânticos relevantes (RAG) em source_chunks...");
  // Busca textual com termos centrais da preparação
  const { data: chunks, error: errChunks } = await supabase
    .from("source_chunks")
    .select("content, chunk_index")
    .ilike("content", "%preparação%")
    .limit(4);

  let ragContext = "";
  if (chunks && chunks.length > 0) {
    ragContext = chunks.map((c, i) => `--- TRECHO ${i + 1} (Chunk #${c.chunk_index}) ---\n${c.content}`).join("\n\n");
    console.log(`✅ ${chunks.length} trechos conceituais recuperados do e-book!`);
  } else {
    // Fallback: pega os 3 primeiros chunks caso ilike específico não retorne
    const { data: fallbackChunks } = await supabase.from("source_chunks").select("content").limit(3);
    ragContext = (fallbackChunks || []).map(c => c.content).join("\n\n");
  }

  console.log("\n🧠 [3/4] Redigindo lição com Claude (lv3/claude-sonnet-5)...");

  const systemPrompt = `Você é o Redator Pedagógico Master da FCIA Academy.
Seu objetivo é transformar as diretrizes do módulo e os trechos de referência (RAG) em uma aula prática, densa, sem enrolação e pronta para consumo.
A resposta deve ser em formato JSON puro com duas chaves obrigatórias:
1. "markdown": Uma aula completa estruturada em Markdown (Introdução, Conceito Central, Aplicação Prática no Mercado, Estudo de Caso Rápido, Checklist de Ação).
2. "lessons": Array de tópicos/lições da aula: [{"lesson_number": 1, "title": "...", "duration_minutes": 15}]

Sem tags markdown fora do JSON.`;

  const userPrompt = `MÓDULO: ${moduleData.title}
OBJETIVO DE APRENDIZAGEM: ${moduleData.learning_objective}
DESCRIÇÃO: ${moduleData.description}

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
    console.error("❌ Resposta vazia do gateway de IA:", JSON.stringify(aiData));
    return;
  }

  const cleanJson = rawContent.replace(/```json/gi, "").replace(/```/g, "").trim();
  let generatedData;
  try {
    generatedData = JSON.parse(cleanJson);
  } catch (e) {
    console.error("❌ Falha no parse JSON da IA:", rawContent);
    return;
  }

  console.log(`✅ Aula gerada! Lições estruturadas: ${generatedData.lessons?.length || 0}`);

  console.log("\n📦 [4/4] Gravando versão da aula em module_versions no Supabase...");
  const versionPayload = {
    module_id: moduleData.id,
    version: 1,
    content_markdown: generatedData.markdown,
    content_jsonb: {
      lessons: generatedData.lessons || [],
      sources_used: chunks?.map(c => c.chunk_index) || []
    },
    generation_metadata: {
      model: "lv3/claude-sonnet-5",
      chunks_count: chunks?.length || 0,
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
    console.error("❌ Erro ao salvar module_versions:", errSave.message);
    return;
  }

  console.log(`🎉 VERSÃO DO MÓDULO GRAVADA COM SUCESSO!`);
  console.log(`🆔 Version ID: ${savedVersion.id}`);
  console.log(`📄 Tamanho do Markdown: ${savedVersion.content_markdown.length} caracteres.`);
}

generateModuleContent();
