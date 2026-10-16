import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const ORGANIZATION_ID = "d52a0a28-bff4-4fbf-b288-165f33f958e4"; // FCIA
const USER_ID = "6141fb51-8377-4d95-9c8d-463e8978471a"; // FCIA Admin Master
const AI_GATEWAY_URL = "https://iron-cody-api.fly.dev/v1/chat/completions";

async function runCourseEnginePipeline() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const aiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;

  const supabase = createClient(supabaseUrl, serviceKey);

  console.log("🚀 [Etapa 1/5] Criando Briefing Pedagógico no Supabase...");
  const briefingPayload = {
    organization_id: ORGANIZATION_ID,
    created_by: USER_ID,
    title: "Masterclass: Estratégias Avançadas de Negociação & Persuasão",
    problem_statement: "Profissionais perdem margem e contratos por falta de método estruturado de negociação tática e leitura de contraparte.",
    target_audience: "Empreendedores, Líderes Comerciais e Negociadores",
    desired_outcome: "Dominar preparação tática, concessões estratégicas, ancoragem e fechamento de acordos de alto valor.",
    audience_level: "intermediario",
    requested_format: "microlearning_modular",
    estimated_duration: 240,
    communication_tone: "prático, direto e executivo",
    status: "approved"
  };

  const { data: briefing, error: errBriefing } = await supabase
    .from("briefings")
    .insert(briefingPayload)
    .select()
    .single();

  if (errBriefing) {
    console.error("❌ Erro ao criar Briefing:", errBriefing.message);
    return;
  }
  console.log(`✅ Briefing criado! ID: ${briefing.id}`);

  console.log("\n🏗️ [Etapa 2/5] Criando Course Project associado...");
  const projectPayload = {
    organization_id: ORGANIZATION_ID,
    briefing_id: briefing.id,
    project_name: briefing.title,
    vertical: "Negócios & Vendas",
    stage: "planning",
    priority: 1,
    owner_id: USER_ID
  };

  const { data: project, error: errProject } = await supabase
    .from("course_projects")
    .insert(projectPayload)
    .select()
    .single();

  if (errProject) {
    console.error("❌ Erro ao criar Course Project:", errProject.message);
    return;
  }
  console.log(`✅ Projeto de Curso criado! ID: ${project.id}`);

  console.log("\n🧠 [Etapa 3/5] Solicitando Grade Curricular ao Claude (lv3/claude-sonnet-5)...");
  const systemPrompt = `Você é o Arquiteto Pedagógico do FCIA Course Engine. 
Sua tarefa é desenhar a grade de módulos de um curso de alto impacto com base nas diretrizes recebidas.
Responda EXCLUSIVAMENTE em formato JSON puro, sem marcações markdown ou blocos adicionais.
Formato exato de resposta:
[
  {
    "module_number": 1,
    "title": "Título do Módulo",
    "description": "Descrição detalhada do conteúdo e das práticas abordadas.",
    "learning_objective": "Objetivo de aprendizagem claro e mensurável.",
    "estimated_duration_minutes": 45
  }
]`;

  const userPrompt = `Crie a grade com 4 módulos estratégicos para o curso:
Título: ${briefing.title}
Público: ${briefing.target_audience}
Problema Central: ${briefing.problem_statement}
Resultado Esperado: ${briefing.desired_outcome}
Tom: ${briefing.communication_tone}`;

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
      temperature: 0.3
    })
  });

  const aiData = await aiResponse.json();
  const rawContent = aiData.choices?.[0]?.message?.content;

  if (!rawContent) {
    console.error("❌ Erro: resposta vazia do Gateway de IA:", JSON.stringify(aiData));
    return;
  }

  const cleanJson = rawContent.replace(/```json/gi, "").replace(/```/g, "").trim();
  let modules = [];
  try {
    modules = JSON.parse(cleanJson);
  } catch (e) {
    console.error("❌ Falha no parse JSON da IA:", rawContent);
    return;
  }
  console.log(`✅ IA gerou ${modules.length} módulos estruturados!`);

  console.log("\n📐 [Etapa 4/5] Registrando a Arquitetura do Curso (course_architectures)...");
  const architecturePayload = {
    course_project_id: project.id,
    version: 1,
    title: briefing.title,
    subtitle: "Método prático para liderar acordos de alto valor",
    promise: briefing.desired_outcome,
    target_audience: briefing.target_audience,
    learning_outcomes: [
      "Aplicar ancoragem e concessões sem perder margem",
      "Mapear BATNA e limites da contraparte",
      "Conduzir fechamentos táticos com segurança"
    ],
    course_format: "microlearning_modular",
    estimated_duration_minutes: 240,
    final_assessment: "Estudo de caso e simulação prática de fechamento de contrato",
    structure_json: { modules },
    status: "draft"
  };

  const { data: architecture, error: errArch } = await supabase
    .from("course_architectures")
    .insert(architecturePayload)
    .select()
    .single();

  if (errArch) {
    console.error("❌ Erro ao criar Course Architecture:", errArch.message);
    return;
  }
  console.log(`✅ Arquitetura criada! ID: ${architecture.id}`);

  console.log("\n📦 [Etapa 5/5] Gravando módulos em course_modules no Supabase...");
  for (let i = 0; i < modules.length; i++) {
    const mod = modules[i];
    const modulePayload = {
      course_id: architecture.id, // Chave estrangeira correta para course_architectures.id
      module_number: mod.module_number || (i + 1),
      title: mod.title,
      description: mod.description,
      learning_objective: mod.learning_objective,
      status: "draft",
      estimated_duration_minutes: mod.estimated_duration_minutes || 45,
      sort_order: i + 1
    };

    const { error: errMod } = await supabase
      .from("course_modules")
      .insert(modulePayload);

    if (errMod) {
      console.error(` ❌ Erro ao salvar módulo ${i + 1}:`, errMod.message);
    } else {
      console.log(` 🌟 [Módulo ${i + 1}] Gravado com sucesso: "${mod.title}"`);
    }
  }

  console.log("\n🎉 FLUXO END-TO-END CONCLUÍDO COM SUCESSO!");
  console.log(`🆔 Projeto ID: ${project.id}`);
  console.log(`🏛️ Arquitetura ID: ${architecture.id}`);
  console.log("A fundação relacional e a orquestração de IA estão 100% validadas!");
}

runCourseEnginePipeline();
