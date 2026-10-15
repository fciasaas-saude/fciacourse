-- Migration: 20261015000004_create_source_chunks
-- Cria tabela de chunks com suporte a vetores, função de busca vetorial e índice HNSW
-- =============================================================================

-- 1. Habilitar extensão pgvector se ainda não estiver ativa
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Tabela de Chunks com Suporte a Vetores
CREATE TABLE public.source_chunks (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 source_id UUID REFERENCES public.knowledge_sources(id) ON DELETE CASCADE NOT NULL,
 organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
 chunk_index INT NOT NULL,
 content TEXT NOT NULL,
 token_count INT,
 embedding VECTOR(1536),
 metadata JSONB DEFAULT '{}'::jsonb,
 created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS estrito na tabela de chunks
ALTER TABLE public.source_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Isolamento por organização em source_chunks"
 ON public.source_chunks
 FOR ALL
 USING (organization_id IN (
 SELECT organization_id FROM public.organization_members
 WHERE user_id = auth.uid()
 ));

-- 3. Índice HNSW para busca vetorial performática filtrada por organização
CREATE INDEX idx_source_chunks_embedding_hnsw
 ON public.source_chunks USING hnsw (embedding vector_cosine_ops);

-- 4. Função SQL para Busca Vetorial com Autorização Prévia
CREATE OR REPLACE FUNCTION public.match_source_chunks(
 query_embedding VECTOR(1536),
 match_threshold FLOAT,
 match_count INT,
 p_organization_id UUID
)
RETURNS TABLE (
 id UUID,
 source_id UUID,
 content TEXT,
 similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
 RETURN QUERY
 SELECT
 source_chunks.id,
 source_chunks.source_id,
 source_chunks.content,
 1 - (source_chunks.embedding <=> query_embedding) AS similarity
 FROM source_chunks
 WHERE source_chunks.organization_id = p_organization_id
 AND 1 - (source_chunks.embedding <=> query_embedding) > match_threshold
 ORDER BY source_chunks.embedding <=> query_embedding
 LIMIT match_count;
END;
$$;