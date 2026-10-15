'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);

  useEffect(() => {
    // Check if user arrived via recovery link (Supabase sets session automatically)
    async function checkSession() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        setHasRecoverySession(true);
      } else {
        // No session - user may have arrived directly without clicking email link
        setError('Sessão de recuperação não encontrada. Clique no link enviado por email para redefinir sua senha.');
      }
      setCheckingSession(false);
    }

    checkSession();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    const supabase = createClient();

    // updateUser works when user has a valid recovery session
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    }
    setLoading(false);
  }

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow text-center">
          <p className="text-sm text-gray-600">Verificando sessão de recuperação...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow">
        <h1 className="text-center text-2xl font-bold text-gray-900">Redefinir senha</h1>

        {error && (
          <div className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        {success ? (
          <div className="space-y-4 text-center">
            <div className="rounded bg-green-50 p-4 text-sm text-green-700">
              Senha redefinida com sucesso! Redirecionando...
            </div>
            <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">
              Ir para dashboard
            </Link>
          </div>
        ) : hasRecoverySession ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-center text-sm text-gray-600">
              Digite sua nova senha abaixo.
            </p>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Nova senha
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                minLength={8}
                required
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirmar nova senha
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                minLength={8}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Redefinindo...' : 'Redefinir senha'}
            </button>
          </form>
        ) : (
          <div className="text-center">
            <Link href="/forgot-password" className="text-sm text-blue-600 hover:underline">
              Solicitar novo link de recuperação
            </Link>
          </div>
        )}

        {!success && hasRecoverySession && (
          <p className="text-center text-sm text-gray-600">
            <Link href="/login" className="text-blue-600 hover:underline">
              Voltar para login
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}