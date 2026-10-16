import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";
import { createRequire } from "module";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const require = createRequire(import.meta.url);
const { PDFParse } = require("pdf-parse");

const ORGANIZATION_ID = "d52a0a28-bff4-4fbf-b288-165f33f958e4";

function chunkText(text, chunkSize = 1200, overlap = 200) {
  const clean = text.replace(/\r\n/g, "\n").replace(/\n{2,}/g, "\n\n").trim();
  const chunks = [];
  let startIndex = 0;

  while (startIndex < clean.length) {
    let endIndex = startIndex + chunkSize;
    if (endIndex >= clean.length) {
      chunks.push(clean.slice(startIndex).trim());
      break;
    }

    const breakPoint = clean.lastIndexOf("\n", endIndex);
    if (breakPoint > startIndex + (chunkSize / 2)) {
      endIndex = breakPoint;
    }

    const slice = clean.slice(startIndex, endIndex).trim();
    if (slice.length > 50) {
      chunks.push(slice);
    }
    startIndex = endIndex - overlap;
  }
  return chunks;
}

async function processSourceToChunks() {
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

  console.log("🔍 Buscando fonte para processamento em knowledge_sources...");
  const { data: source, error: errSource } = await supabase
    .from("knowledge_sources")
    .select("id, title, drive_file_id")
    .in("processing_status", ["pending", "extracting"])
    .limit(1)
    .maybeSingle();

  if (errSource || !source) {
    console.log("ℹ️ Nenhuma fonte pendente ou em extração encontrada.");
    return;
  }

  console.log(`📄 Processando: "${source.title}" (Drive ID: ${source.drive_file_id})`);

  await supabase
    .from("knowledge_sources")
    .update({ processing_status: "extracting" })
    .eq("id", source.id);

  console.log("📥 Baixando stream do Google Drive...");
  const res = await drive.files.get(
    { fileId: source.drive_file_id, alt: "media" },
    { responseType: "arraybuffer" }
  );

  const buffer = Buffer.from(res.data);
  console.log(`📦 Download concluído (${(buffer.length / 1024 / 1024).toFixed(2)} MB). Extraindo texto...`);

  const parser = new PDFParse({ data: buffer });
  const parsedResult = await parser.getText();
  const text = parsedResult?.text || "";
  const numPages = parsedResult?.total || parsedResult?.pages?.length || 1;
  await parser.destroy();

  console.log(`📑 Extração realizada: ~${numPages} páginas, ${text.length} caracteres.`);

  const chunks = chunkText(text);
  console.log(`✂️ Gerados ${chunks.length} chunks.`);

  // Inserção em lotes de 50 chunks
  const batchSize = 50;
  for (let i = 0; i < chunks.length; i += batchSize) {
    const slice = chunks.slice(i, i + batchSize);
    const rows = slice.map((content, idx) => ({
      source_id: source.id,
      organization_id: ORGANIZATION_ID,
      chunk_index: i + idx,
      content,
      token_count: Math.round(content.length / 4),
      metadata: {
        page_count: numPages,
        char_count: content.length
      }
    }));

    const { error: errInsert } = await supabase.from("source_chunks").insert(rows);
    if (errInsert) {
      console.error(`❌ Erro no lote ${i} a ${i + slice.length}:`, errInsert.message);
      await supabase.from("knowledge_sources").update({ processing_status: "failed" }).eq("id", source.id);
      return;
    }
    console.log(` 💾 Lote gravado: chunks ${i + 1} a ${i + slice.length}`);
  }

  await supabase
    .from("knowledge_sources")
    .update({
      processing_status: "completed",
      page_count: numPages
    })
    .eq("id", source.id);

  console.log(`\n🎉 Processamento concluído com sucesso! Fonte marcada como 'completed'.`);
}

processSourceToChunks();
