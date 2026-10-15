'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { signupSchema } from '@/lib/validations/auth';
import { voucherCodeSchema } from '@/lib/validations/voucher';
import Link from 'next/link';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherStatus, setVoucherStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
  const [voucherMessage, setVoucherMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function validateVoucher() {
    const parsed = voucherCodeSchema.safeParse(voucherCode);
    if (!parsed.success) {
      setVoucherStatus('invalid');
      setVoucherMessage(parsed.error.issues[0].message);
      return;
    }
    setVoucherStatus('validating');
    setVoucherMessage('');
    try {
      const supabase = createClient();
      const { data, error: rpcError } = await supabase.rpc('validate_voucher', {
        _code: voucherCode.trim(),
      });
      if (rpcError || !data?.valid) {
        setVoucherStatus('invalid');
        setVoucherMessage(data?.error ?? rpcError?.message ?? 'Código inválido.');
      } else {
        setVoucherStatus('valid');
        setVoucherMessage(`Válido — lote "${data.batch_name}", ${data.uses_remaining} uso(s) restante(s).`);
      }
    } catch (err) {
      setVoucherStatus('invalid');
      setVoucherMessage((err as Error).message);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    const result = signupSchema.safeParse({ email, password, confirmPassword });
    if (!result.success) {
      setError(result.error.issues[0].message);
      setLoading(false);
      return;
    }

    const voucherParsed = voucherCodeSchema.safeParse(voucherCode);
    if (!voucherParsed.success) {
      setError('Código de voucher obrigatório: ' + voucherParsed.error.issues[0].message);
      setLoading(false);
      return;
    }

    const supabase = createClient();

    // Validar voucher antes de criar conta
    const { data: voucherCheck, error: voucherRpcError } = await supabase.rpc('validate_voucher', {
      _code: voucherCode.trim(),
    });
    if (voucherRpcError || !voucherCheck?.valid) {
      setError(voucherCheck?.error ?? voucherRpcError?.message ?? 'Código de voucher inválido.');
      setLoading(false);
      return;
    }

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: result.data.email,
      password: result.data.password,
    });

    if (signUpError || !authData.user) {
      setError(signUpError?.message ?? 'Erro ao criar conta.');
      setLoading(false);
      return;
    }

    // Resgatar voucher vinculando ao novo usuário
    const { data: redemption, error: redeemError } = await supabase.rpc('redeem_voucher', {
      _code: voucherCode.trim(),
      _user_id: authData.user.id,
    });

    if (redeemError || !redemption?.success) {
      setError(
        'Conta criada, mas falha ao resgatar voucher: ' +
          (redemption?.error ?? redeemError?.message ?? 'erro desconhecido') +
          '. Entre em contato com o suporte.'
      );
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow">
        <h1 className="text-center text-2xl font-bold text-gray-900">Criar conta</h1>

        {error && (
          <div className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        {success ? (
          <div className="space-y-4 text-center">
            <div className="rounded bg-green-50 p-4 text-sm text-green-700">
              Conta criada e voucher resgatado com sucesso! Verifique seu email para confirmar o cadastro.
            </div>
            <Link href="/login" className="text-sm text-blue-600 hover:underline">
              Voltar para login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label htmlFor="voucherCode" className="block text-sm font-medium text-gray-700">
                Código de Voucher <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  id="voucherCode"
                  type="text"
                  value={voucherCode}
                  onChange={(e) => {
                    setVoucherCode(e.target.value.toUpperCase());
                    setVoucherStatus('idle');
                    setVoucherMessage('');
                  }}
                  placeholder="FCIA-XXXX-XXXX"
                  className="block w-full rounded border border-gray-300 px-3 py-2 font-mono uppercase focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
                <button
                  type="button"
                  onClick={validateVoucher}
                  disabled={voucherStatus === 'validating' || !voucherCode}
                  className="shrink-0 rounded border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {voucherStatus === 'validating' ? '...' : 'Validar'}
                </button>
              </div>
              {voucherStatus === 'valid' && (
                <p className="mt-1 text-xs text-emerald-700">✓ {voucherMessage}</p>
              )}
              {voucherStatus === 'invalid' && (
                <p className="mt-1 text-xs text-red-600">✗ {voucherMessage}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Código obrigatório fornecido pelo administrador do curso.
              </p>
            </div>

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

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Senha
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirmar senha
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Criando...' : 'Criar conta'}
            </button>
          </form>
        )}

        {!success && (
          <p className="text-center text-sm text-gray-600">
            Já tem conta?{' '}
            <Link href="/login" className="text-blue-600 hover:underline">
              Entrar
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}