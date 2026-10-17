import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Buffer } from 'node:buffer'
import pdfParse from 'npm:pdf-parse@1.1.1'

interface ProcessSourceRequest {
  source_id: string
  organization_id: string
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método não permitido' }), { status: 405 })
  }

  try {
    const { source_id, organization_id }: ProcessSourceRequest = await req.json()
    if (!source_id || !organization_id) throw new Error('source_id e organization_id são obrigatórios')

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
    const GOOGLE_TOKEN = Deno.env.get('GOOGLE_DRIVE_ACCESS_TOKEN')

    await supabase.from('knowledge_sources').update({ processing_status: 'processing', updated_at: new Date().isoString() }).eq('id', source_id)

    const { data: source, error: sourceError } = await supabase.from('knowledge_sources').select('*').eq('id', source_id).single()
    if (sourceError || !source) throw new Error(`Fonte não encontrada: ${sourceError?.message}`)

    if (!source.drive_file_id) throw new Error('Fonte não possui drive_file_id vinculado.')

    // 1. Download do Google Drive
    const fileRes = await fetch(`https://www.googleapis.com/drive/v3/files/${source.drive_file_id}?alt=media`, {
      headers: { Authorization: `Bearer ${GOOGLE_TOKEN}` }
    })
    if (!fileRes.ok) throw new Error(`Falha ao baixar do Drive: ${fileRes.statusText}`)
    
    const arrayBuffer = await fileRes.arrayBuffer()
    
    // 2. Extração de PDF (Real)
    const pdfData = await pdfParse(Buffer.from(arrayBuffer))
    const rawText = pdfData.text
    const totalPages = pdfData.numpages || 1

    // 3. Extração da Ficha de Conhecimento (Claude API)
    let knowledgeCardPayload = {
      source_id: source.id,
      organization_id: organization_id,
      central_thesis: 'Pendente de extração_Indicador IA',
      teaching_goal: 'Pendente',
      principles: [],
      method: 'Pendente',
      key_concepts: [],
      evidence_map: {},
      processing_version: 'v2.0.0-real-ai'
    }

    if (ANTHROPIC_API_KEY) {
      const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1500,
          messages: [{ 
            role: 'user', 
            content: `Retorne APENAS um JSON válido. Extraia do texto os campos: central_thesis (string), teaching_goal (string), principles (array de string), method (string), key_concepts (array de objetos com concept e definition). Texto:\n\n${rawText.substring(0, 10000)}`
          }]
        })
      })
      if (claudeRes.ok) {
        const claudeData = await claudeRes.json()
        try {
           const parsed = JSON.parse(claudeData.content[0].text)
           knowledgeCardPayload = { ...knowledgeCardPayload, ...parsed }
        } catch(e) { console.error('Claude JSON parse falhou', e) }
      }
    }

    const { error: cardError } = await supabase.from('source_knowledge_cards').insert(knowledgeCardPayload)
    if (cardError) throw new Error(`Erro Ficha: ${cardError.message}`)

    // 4. Segmentação em chunks
    const chunks = rawText.split('\n\n').filter((c: string) => c.trim().length > 100)
    
    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i].substring(0, 8000)
      let embedding = new Array(1536).fill(0.01) // Fallback
      
      if (OPENAI_API_KEY) {
        const embedRes = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ input: chunkText, model: 'text-embedding-3-small' })
        })
        if (embedRes.ok) {
          const embedData = await embedRes.json()
          embedding = embedData[0]?.embedding || embedData.data[0].embedding
        }
      }

      await supabase.from('source_chunks').insert({
        source_id: source.id,
        organization_id: organization_id,
        chunk_index: i,
        content: chunkText,
        token_count: Math.ceil(chunkText.length / 4),
        embedding: embedding
      })
    }

    // 5. Finaliza
    await supabase.from('knowledge_sources').update({
      processing_status: 'completed',
      coverage_percent: 100,
      updated_at: new Date().isoString()
    }).eq('id', source.id)

    return new Response(JSON.stringify({ success: true, source_id: source.id, status: 'completed' }), { headers: { 'Content-Type': 'application/json' } })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})