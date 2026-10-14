'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Informe um email válido.');
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    if (resetError && resetError.status === 429) {
      setError('Muitas solicitações. Tente novamente em alguns minutos.');
    } else {
      // Anti-enumeration: always show neutral message regardless of email existence
      setMessage(
        'Se este e-mail estiver cadastrado, enviamos um link para redefinir sua senha. Verifique sua caixa de entrada e spam.'
      );
    }
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow">
        <h1 className="text-center text-2xl font-bold text-gray-900">Recuperar senha</h1>

        {error && (
          <div className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        {message ? (
          <div className="space-y-4 text-center">
            <div className="rounded bg-green-50 p-4 text-sm text-green-700">{message}</div>
            <Link href="/login" className="text-sm text-blue-600 hover:underline">
              Voltar para login
            </Link>
          </div>
        ) : (
          <>
            <p className="text-center text-sm text-gray-600">
              Informe seu email e enviaremos um link para redefinir sua senha.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Enviando...' : 'Enviar link de recuperação'}
              </button>
            </form>
            <p className="text-center text-sm text-gray-600">
              <Link href="/login" className="text-blue-600 hover:underline">
                Voltar para login
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}