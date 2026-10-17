'use client';

import { useState } from 'react';

export default function CoursesPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  function handleCreateCourse(e: React.FormEvent) {
    e.preventDefault();
    if (!title) return;
    setCourses([...courses, { id: Date.now(), title, description }]);
    setTitle('');
    setDescription('');
    setShowModal(false);
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Cursos & Módulos</h1>
          <p className="text-gray-400 mt-1">Crie e organize a estrutura pedagógica dos seus treinamentos.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition"
        >
          Novo Curso
        </button>
      </div>

      {/* Modal / Formulário de Criação */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold text-white mb-4">Adicionar Novo Curso</h2>
            <form onSubmit={handleCreateCourse} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Título do Curso</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: IA Prática para Negócios"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Descrição</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Resumo do conteúdo programático..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
                >
                  Guardar Curso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Listagem de Cursos */}
      {courses.length === 0 ? (
        <div className="border border-dashed border-gray-800 rounded-xl p-12 text-center">
          <p className="text-gray-400 mb-4">Nenhum curso cadastrado ainda.</p>
          <button
            onClick={() => setShowModal(true)}
            className="text-blue-400 hover:text-blue-300 font-medium text-sm"
          >
            Criar o seu primeiro curso agora
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <div key={course.id} className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow">
              <h3 className="text-xl font-semibold text-white mb-2">{course.title}</h3>
              <p className="text-gray-400 text-sm">{course.description || 'Sem descrição.'}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}