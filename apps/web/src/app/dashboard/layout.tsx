import React from 'react'
import Link from 'next/link'
import { BookOpen, Sparkles, FolderGit2, Award, Ticket, Settings } from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      {/* Sidebar Lateral */}
      <aside className="w-64 border-r border-slate-800 bg-slate-900/60 backdrop-blur-md p-5 flex flex-col justify-between hidden md:flex">
        <div className="space-y-6">
          <div className="flex items-center gap-2 px-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/30">
              FC
            </div>
            <span className="font-bold tracking-tight text-lg text-white">FCIA Engine</span>
          </div>

          <nav className="space-y-1 text-sm font-medium">
            <Link href="/dashboard/sources" className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-indigo-600/10 text-indigo-400 border border-indigo-500/20">
              <BookOpen className="w-4 h-4" />
              <span>Biblioteca de Fontes</span>
            </Link>
            <Link href="/dashboard/briefings" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition">
              <Sparkles className="w-4 h-4" />
              <span>Briefings Pedagógicos</span>
            </Link>
            <Link href="/dashboard/projects" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition">
              <FolderGit2 className="w-4 h-4" />
              <span>Cursos & Módulos</span>
            </Link>
            <Link href="/dashboard/certificates" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition">
              <Award className="w-4 h-4" />
              <span>Certificados</span>
            </Link>
            <Link href="/dashboard/admin/vouchers" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition">
              <Ticket className="w-4 h-4" />
              <span>Vouchers</span>
            </Link>
          </nav>
        </div>

        <div className="border-t border-slate-800 pt-4 px-2">
          <div className="text-xs text-slate-500">FCIA Course Engine v2.0</div>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <main className="flex-1 overflow-y-auto">
        <header className="h-16 border-b border-slate-800/80 bg-slate-900/30 backdrop-blur px-8 flex items-center justify-between">
          <div className="text-sm font-medium text-slate-400">
            Painel Administrativo &bull; <span className="text-slate-200">Fontes de Conhecimento</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
              Ambiente Local Ativo
            </span>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
