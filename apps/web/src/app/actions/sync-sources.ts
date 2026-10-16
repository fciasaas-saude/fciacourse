'use server'

import { revalidatePath } from 'next/cache'

export async function syncSources(organizationId: string) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return { success: false, error: 'Configuracao do Supabase ausente.' }
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/sync-google-drive`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        organization_id: organizationId || '5b4f2734-b601-4977-86b4-adaccf566842',
        folder_id: '1Opd0Ly_GcXTUklAH-jHoOyLGCoXI5lP4',
      }),
    })

    const data = await response.json()
    if (!response.ok) return { success: false, error: data.error || 'Erro ao sincronizar' }

    revalidatePath('/dashboard/sources')
    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro inesperado' }
  }
}
