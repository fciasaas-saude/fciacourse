import { BookOpen, CheckCircle, Clock, AlertTriangle } from 'lucide-react'

interface MetricsCardsProps {
  total: number
  completed: number
  pending: number
  review: number
}

export function MetricsCards({ total, completed, pending, review }: MetricsCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Total de Fontes</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{total}</p>
          </div>
          <BookOpen className="h-8 w-8 text-blue-500" />
        </div>
      </div>
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Processadas</p>
            <p className="mt-2 text-3xl font-bold text-green-600">{completed}</p>
          </div>
          <CheckCircle className="h-8 w-8 text-green-500" />
        </div>
      </div>
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Em Análise</p>
            <p className="mt-2 text-3xl font-bold text-yellow-600">{pending}</p>
          </div>
          <Clock className="h-8 w-8 text-yellow-500" />
        </div>
      </div>
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Revisão de Direitos</p>
            <p className="mt-2 text-3xl font-bold text-red-600">{review}</p>
          </div>
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>
      </div>
    </div>
  )
}