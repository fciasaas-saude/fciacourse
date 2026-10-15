import { getVouchers } from './actions';
import { GenerateVoucherForm } from './generate-form';

export default async function AdminVouchersPage() {
  const { vouchers, error } = await getVouchers();

  if (error) {
    return (
      <div className="rounded bg-red-50 p-4 text-sm text-red-700">
        Erro ao carregar vouchers: {error}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Vouchers</h1>
        <p className="mt-1 text-sm text-gray-600">
          Gere lotes de códigos de convite e monitore o uso de cada voucher.
        </p>
      </div>

      <GenerateVoucherForm />

      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Vouchers Existentes ({vouchers.length})
        </h2>
        {vouchers.length === 0 ? (
          <div className="rounded border border-dashed border-gray-300 p-8 text-center text-gray-500">
            Nenhum voucher gerado ainda. Use o formulário acima para criar um lote.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Código
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Lote
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Usos
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Criado em
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {vouchers.map((voucher) => (
                  <tr key={voucher.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-mono text-gray-900">
                      {voucher.code}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                      {voucher.batch_name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                      {voucher.current_uses} / {voucher.max_uses}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                          voucher.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {voucher.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {new Date(voucher.created_at).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}