import { createClient } from '../../../utils/supabase/server'
import { redirect } from 'next/navigation'
import { SyncButton } from './sync-button'
import { MetricsCards } from './metrics-cards'
import { SourcesTable } from './sources-table'
import { BookOpen } from 'lucide-react'

export default async function SourcesPage() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/login')
  }

  // Buscar organizaÃ§Ã£o do usuÃ¡rio
  const { data: memberData } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()

  if (!memberData?.organization_id) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Nenhuma organizaÃ§Ã£o encontrada</h2>
          <p className="mt-2 text-gray-600">Entre em contato com o administrador.</p>
        </div>
      </div>
    )
  }

  const organizationId = memberData.organization_id

  // Buscar estatÃ­sticas
  const { count: totalCount } = await supabase
    .from('knowledge_sources')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)

  const { count: completedCount } = await supabase
    .from('knowledge_sources')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('processing_status', 'completed')

  const { count: pendingCount } = await supabase
    .from('knowledge_sources')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .in('processing_status', ['pending', 'processing'])

  const { count: reviewCount } = await supabase
    .from('knowledge_sources')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('rights_status', 'pending_review')

  // Buscar fontes
  const { data: sources } = await supabase
    .from('knowledge_sources')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-8 p-8">
      {/* CabeÃ§alho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-blue-600" />
            Biblioteca de Conhecimento
          </h1>
          <p className="mt-2 text-gray-600">
            Fontes de consulta, livros e documentos sincronizados do Google Drive para geraÃ§Ã£o pedagÃ³gica.
          </p>
        </div>
        <SyncButton organizationId={organizationId} />
      </div>

      {/* Cards de MÃ©tricas */}
      <MetricsCards
        total={totalCount || 0}
        completed={completedCount || 0}
        pending={pendingCount || 0}
        review={reviewCount || 0}
      />

      {/* Tabela de Fontes */}
      <SourcesTable sources={sources || []} />
    </div>
  )
}
