import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { create, getNumericDate } from 'https://deno.land/x/djwt@v2.8/mod.ts'

interface SyncRequest {
	organization_id: string
	folder_id: string
}

// 1. Geração de JWT para a Google Drive API via Service Account
async function getGoogleAccessToken(clientEmail: string, privateKeyRaw: string): Promise<string> {
	const pemHeader = '-----BEGIN PRIVATE KEY-----'
	const pemFooter = '-----END PRIVATE KEY-----'
	// Normaliza a chave: substitui quebras de linha literais '\n' por novas linhas reais e remove espaços em branco extras
	const cleanKey = privateKeyRaw
		.replace(/\\n/g, '\n')
		.replace(pemHeader, '')
		.replace(pemFooter, '')
		.replace(/\s/g, '')

	const binaryDer = Uint8Array.from(atob(cleanKey), (c) => c.charCodeAt(0))
	const cryptoKey = await crypto.subtle.importKey(
		'pkcs8',
		binaryDer,
		{ name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
		false,
		['sign']
	)

	const jwt = await create(
		{ alg: 'RS256', typ: 'JWT' },
		{
			iss: clientEmail,
			scope: 'https://www.googleapis.com/auth/drive.readonly',
			aud: 'https://oauth2.googleapis.com/token',
			exp: getNumericDate(3600),
			iat: getNumericDate(0),
		},
		cryptoKey
	)

	const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
			assertion: jwt,
		}),
	})

	const tokenData = await tokenResponse.json()
	if (!tokenResponse.ok) {
		throw new Error(`Falha ao obter token Google: ${tokenData.error_description || tokenData.error}`)
	}

	return tokenData.access_token
}

// 2. Handler Principal
serve(async (req) => {
	if (req.method !== 'POST') {
		return new Response(JSON.stringify({ error: 'Método não permitido' }), { status: 405 })
	}

	try {
		const { organization_id, folder_id }: SyncRequest = await req.json()

		if (!organization_id || !folder_id) {
			return new Response(JSON.stringify({ error: 'organization_id e folder_id são obrigatórios' }), { status: 400 })
		}

		const supabase = createClient(
			Deno.env.get('SUPABASE_URL') ?? '',
			Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
			{ auth: { persistSession: false, autoRefreshToken: false } }
		)

		const googleEmail = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL') ?? ''
		const googleKey = Deno.env.get('GOOGLE_PRIVATE_KEY') ?? ''

		if (!googleEmail || !googleKey) {
			return new Response(JSON.stringify({ error: 'Credenciais do Google não configuradas' }), { status: 500 })
		}

		const accessToken = await getGoogleAccessToken(googleEmail, googleKey)

		// 3. Listar ficheiros PDF / documentos suportados na pasta especificada
		const query = encodeURIComponent(`'${folder_id}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`)
		const driveUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType,md5Checksum,size,modifiedTime)`

		const driveRes = await fetch(driveUrl, {
			headers: { Authorization: `Bearer ${accessToken}` },
		})

		const driveData = await driveRes.json()
		if (!driveRes.ok) {
			throw new Error(`Erro na API do Google Drive: ${driveData.error?.message || 'Erro desconhecido'}`)
		}

		const files = driveData.files || []
		const syncResults = []

		// 4. Inserção / Atualização idempotente na tabela knowledge_sources
		for (const file of files) {
			const checksum = file.md5Checksum || file.modifiedTime || 'no-checksum'

			const { data: existingSource } = await supabase
				.from('knowledge_sources')
				.select('id, checksum, processing_status')
				.eq('drive_file_id', file.id)
				.single()

			if (existingSource) {
				// Se o ficheiro foi alterado (checksum mudou), marca para reprocessamento
				if (existingSource.checksum !== checksum) {
					await supabase
						.from('knowledge_sources')
						.update({
							checksum: checksum,
							title: file.name,
							processing_status: 'pending',
							coverage_percent: 0.00,
							updated_at: new Date().toISOString(),
						})
						.eq('id', existingSource.id)

					syncResults.push({ id: existingSource.id, title: file.name, status: 'updated_pending_reprocess' })
				} else {
					syncResults.push({ id: existingSource.id, title: file.name, status: 'unchanged' })
				}
			} else {
				// Novo ficheiro registado com rights_status em 'pending' por padrão
				// Nota: mime_type movido para metadata pois a coluna não existe no schema atual
				const { data: inserted, error: insertError } = await supabase
					.from('knowledge_sources')
					.insert({
						organization_id: organization_id,
						source_type: 'book',
						title: file.name,
						drive_file_id: file.id,
						checksum: checksum,
						rights_status: 'pending_review',
						processing_status: 'pending',
						coverage_percent: 0.00,
						metadata: { size: file.size, mime_type: file.mimeType, drive_metadata: file },
					})
					.select()
					.single()

				if (insertError) {
					console.error(`[CRITICAL] Erro ao inserir ${file.name}:`, JSON.stringify(insertError))
					// Adiciona ao results com status de erro para debug
					syncResults.push({ id: null, title: file.name, status: 'insert_failed', error: insertError.message })
				} else {
					syncResults.push({ id: inserted.id, title: file.name, status: 'registered' })
				}
			}
		}

		return new Response(
			JSON.stringify({
				success: true,
				total_files_found: files.length,
				results: syncResults,
			}),
			{ headers: { 'Content-Type': 'application/json' }, status: 200 }
		)
	} catch (err: any) {
		return new Response(JSON.stringify({ error: err.message }), {
			headers: { 'Content-Type': 'application/json' },
			status: 500,
		})
	}
})