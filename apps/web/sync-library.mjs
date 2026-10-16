import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const ORGANIZATION_ID = "d52a0a28-bff4-4fbf-b288-165f33f958e4"; // FCIA
const BIBLIOTECA_FOLDER_ID = "1TJjgqeAPDk9vkAjRAT3uK4EsVadTWaL2"; // 01_BIBLIOTECA_FCIA

async function syncDriveToSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, serviceKey);

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;
  if (privateKey && privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.slice(1, -1);
  }
  if (privateKey) privateKey = privateKey.replace(/\\n/g, "\n");

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/drive.readonly"]
  });

  const drive = google.drive({ version: "v3", auth });

  console.log("🔍 Mapeando estrutura da pasta 01_BIBLIOTECA_FCIA...");
  const res = await drive.files.list({
    q: `'${BIBLIOTECA_FOLDER_ID}' in parents and trashed = false`,
    fields: "files(id, name, mimeType)"
  });

  const items = res.data.files || [];
  console.log(`📁 Encontrados ${items.length} itens raiz.`);

  let totalFiles = 0;

  for (const item of items) {
    if (item.mimeType === "application/vnd.google-apps.folder") {
      console.log(`\n📂 Explorando categoria: [${item.name}]...`);
      const subRes = await drive.files.list({
        q: `'${item.id}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`,
        fields: "files(id, name, mimeType, webViewLink, size)"
      });

      const files = subRes.data.files || [];
      console.log(`   Encontrados ${files.length} arquivos em "${item.name}".`);

      for (const file of files) {
        totalFiles++;
        await upsertSource(supabase, file, item.name);
      }
    } else {
      totalFiles++;
      await upsertSource(supabase, item, "Geral");
    }
  }

  console.log(`\n Sincronização concluída! Total de ${totalFiles} arquivos processados.`);
}

async function upsertSource(supabase, file, category) {
  // Verifica se já existe
  const { data: existing } = await supabase
    .from("knowledge_sources")
    .select("id, title")
    .eq("drive_file_id", file.id)
    .maybeSingle();

  if (existing) {
    console.log(`   ⏩ Já existente: ${file.name}`);
    return;
  }

  const isPdf = file.mimeType ? file.mimeType.includes("pdf") : false;

  const payload = {
    organization_id: ORGANIZATION_ID,
    source_type: isPdf ? "book" : "internal_document",
    title: file.name,
    language: "pt-BR",
    rights_status: "proprietary",
    classification: category,
    processing_status: "pending",
    drive_file_id: file.id,
    drive_url: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`,
    metadata: {
      category: category,
      mimeType: file.mimeType,
      size: file.size || 0
    }
  };

  const { data, error } = await supabase
    .from("knowledge_sources")
    .insert(payload)
    .select("id, title")
    .single();

  if (error) {
    console.error(`   ❌ Erro ao gravar [${file.name}]:`, error.message);
  } else {
    console.log(`   ✅ Cadastrado: ${data.title} (ID: ${data.id})`);
  }
}

syncDriveToSupabase();
