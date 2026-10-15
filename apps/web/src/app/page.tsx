import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  const supabase = createServerComponentClient({ cookies })
  const { data: { session } } = await supabase.auth.getSession()

  // Se o usuário já estiver logado, redireciona para o dashboard apropriado
  if (session) {
    redirect('/dashboard')
  }

  // Se não estiver logado, redireciona para a tela de login
  redirect('/login')
}