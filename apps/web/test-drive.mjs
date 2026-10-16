import { google } from "googleapis";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function testDrive() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (privateKey && privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.slice(1, -1);
  }
  if (privateKey) {
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  console.log("🔍 Autenticando com:", email);
  console.log("📁 Pasta alvo:", folderId);

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/drive.readonly"]
  });

  const drive = google.drive({ version: "v3", auth });

  try {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "files(id, name, mimeType, size)"
    });

    const files = res.data.files || [];
    console.log(`\n✅ Sucesso! Encontrados ${files.length} arquivos na pasta:`);
    files.forEach(f => {
      console.log(` - 📄 ${f.name} (${f.mimeType}) [ID: ${f.id}]`);
    });
  } catch (err) {
    console.error("\n❌ Erro ao acessar o Google Drive:", err.message);
  }
}

testDrive();
