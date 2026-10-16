'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import { syncSources } from '../../actions/sync-sources'

interface SyncButtonProps {
  organizationId: string
}

export function SyncButton({ organizationId }: SyncButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false)
  const router = useRouter()

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      await syncSources(organizationId)
      alert('SincronizaÃ§Ã£o concluÃ­da com sucesso!')
      router.refresh()
    } catch (error) {
      console.error(error)
      alert('Erro ao sincronizar. Verifique o console.')
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <button
      onClick={handleSync}
      disabled={isSyncing}
      className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
    >
      <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
      {isSyncing ? 'Sincronizando...' : 'Sincronizar Google Drive'}
    </button>
  )
}
