'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { OmniStore } from '@/lib/store';
import { SecondBrainNote, NoteCategory } from '@/lib/types';
import {
  Brain,
  Plus,
  Tag,
  Search,
  Trash2,
  BookOpen,
  Lightbulb,
  Dumbbell,
  MessageSquare,
  X,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

const categories: { label: string; value: 'all' | NoteCategory; icon: any }[] = [
  { label: 'Todos', value: 'all', icon: Brain },
  { label: 'Treino', value: 'treino', icon: Dumbbell },
  { label: 'Estudos', value: 'estudos', icon: BookOpen },
  { label: 'Pensamentos', value: 'pensamentos', icon: MessageSquare },
  { label: 'Ideias', value: 'ideias', icon: Lightbulb },
];

export default function SecondBrainPage() {
  const [notes, setNotes] = useState<SecondBrainNote[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | NoteCategory>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Form State for Quick Capture
  const [newTitle, setNewTitle] = useState<string>('');
  const [newCategory, setNewCategory] = useState<NoteCategory>('pensamentos');
  const [newContent, setNewContent] = useState<string>('');
  const [newTagsStr, setNewTagsStr] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadNotes = async () => {
    const data = await OmniStore.getNotes();
    setNotes(data);
  };

  useEffect(() => {
    loadNotes();
  }, []);

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim() || isSaving) return;

    setIsSaving(true);
    try {
      const tags = newTagsStr
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

      await OmniStore.addNote({
        title: newTitle.trim(),
        category: newCategory,
        content: newContent.trim(),
        tags,
      });

      setNewTitle('');
      setNewContent('');
      setNewTagsStr('');
      setIsModalOpen(false);
      await loadNotes();
      setStatusMessage('Nota adicionada ao Segundo Cérebro!');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await OmniStore.deleteNote(id);
    await loadNotes();
  };

  // Filtered Notes
  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      const matchesCategory = activeTab === 'all' || n.category === activeTab;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.tags.some((tag) => tag.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [notes, activeTab, searchQuery]);

  const getCategoryBadgeStyle = (cat: NoteCategory) => {
    switch (cat) {
      case 'treino':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      case 'estudos':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
      case 'ideias':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'pensamentos':
      default:
        return 'bg-violet-500/10 text-violet-400 border-violet-500/30';
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl mx-auto">
      {/* Header */}
      <div className="glass-panel p-6 border-slate-800 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-slate-900/90 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-violet-500/10 text-violet-400">
              <Brain className="h-4 w-4" />
            </span>
            <span className="text-xs font-semibold text-violet-400 uppercase tracking-wider">
              Knowledge Hub & Insights
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Segundo Cérebro
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Centralize pensamentos, resumos de artigos, estratégias de treino e ideias de projetos.
          </p>
        </div>

        {/* Quick Capture Button */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-3 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 text-white font-bold text-xs flex items-center gap-2 hover:opacity-90 transition shadow-lg shadow-violet-500/20"
        >
          <Plus className="h-4 w-4" />
          Captura Rápida
        </button>
      </div>

      {/* Toast Notification */}
      {statusMessage && (
        <div className="p-3 rounded-xl bg-violet-950/60 border border-violet-500/40 text-violet-300 text-xs font-medium flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="h-4 w-4 text-violet-400" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Inline Create Note Form */}
      <div className="glass-card p-6 rounded-2xl border-l-4 border-l-violet-500 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-white text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-400" />
            Nova Anotação / Insight
          </h2>
          <span className="text-[11px] text-slate-400">Inserção Rápida</span>
        </div>

        <form onSubmit={handleCreateNote} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-300 block mb-1">Título da Nota</label>
              <input
                type="text"
                placeholder="Ex: Estratégia de progressão de carga ou Reflexão sobre rotina..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 placeholder-slate-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Categoria</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as NoteCategory)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500"
              >
                <option value="treino">🏋️‍♂️ Treino</option>
                <option value="estudos">📚 Estudos</option>
                <option value="pensamentos">💭 Pensamentos</option>
                <option value="ideias">💡 Ideias</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Conteúdo / Detalhes da Anotação
            </label>
            <textarea
              rows={3}
              placeholder="Escreva sua síntese, estratégia, aprendizado ou pensamento..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              required
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500 resize-none placeholder-slate-500"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
            <div className="flex-1 max-w-md">
              <label className="text-[11px] font-medium text-slate-400 block mb-1">
                Tags (opcional, separadas por vírgula)
              </label>
              <input
                type="text"
                placeholder="Ex: hipertrofia, nutricao, foco"
                value={newTagsStr}
                onChange={(e) => setNewTagsStr(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500 placeholder-slate-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSaving || !newTitle.trim() || !newContent.trim()}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 text-white text-xs font-bold hover:opacity-90 transition shadow-lg shadow-violet-500/20 disabled:opacity-40 flex items-center justify-center gap-2 self-end sm:self-center"
            >
              <Plus className="h-4 w-4" />
              {isSaving ? 'Salvando...' : 'Salvar no Segundo Cérebro'}
            </button>
          </div>
        </form>
      </div>

      {/* Category Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeTab === cat.value;
            return (
              <button
                key={cat.value}
                onClick={() => setActiveTab(cat.value)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition shrink-0 ${
                  isActive
                    ? 'bg-slate-800 text-white border border-slate-700 shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-cyan-400' : ''}`} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="h-4 w-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por palavra-chave ou #tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/90 text-xs text-slate-100 placeholder-slate-500 rounded-xl pl-9 pr-4 py-2.5 border border-slate-800 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Cards Grid (Masonry Style layout) */}
      {filteredNotes.length === 0 ? (
        <div className="glass-card p-12 rounded-2xl text-center text-slate-500 space-y-3">
          <Brain className="h-12 w-12 mx-auto text-slate-600 opacity-40" />
          <p className="text-base font-semibold text-slate-400">Seu Second Brain está vazio. Crie sua primeira nota rápida.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              className="glass-card p-5 rounded-2xl flex flex-col justify-between space-y-4 group hover:border-slate-700 transition"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wide ${getCategoryBadgeStyle(
                      note.category
                    )}`}
                  >
                    {note.category}
                  </span>
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-red-400 transition"
                    title="Excluir nota"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <h3 className="font-bold text-white text-base leading-snug">{note.title}</h3>
                <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">
                  {note.content}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800/80 space-y-2">
                {/* Tags */}
                {note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {note.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded bg-slate-800/80 text-slate-400 text-[10px] font-medium flex items-center gap-1"
                      >
                        <Tag className="h-2.5 w-2.5 text-slate-500" />
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                <p className="text-[10px] text-slate-500">
                  {new Date(note.created_at).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Capture Modal Drawer */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 space-y-5 shadow-2xl relative animate-scaleUp">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-400" />
                <h3 className="font-bold text-white text-lg">Captura Rápida de Pensamento</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNote} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Título</label>
                <input
                  type="text"
                  placeholder="Ex: Protocolo de Sobrecarga Progressiva..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Categoria</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as NoteCategory)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500"
                  >
                    <option value="treino">Treino</option>
                    <option value="estudos">Estudos</option>
                    <option value="pensamentos">Pensamentos</option>
                    <option value="ideias">Ideias</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Tags (separadas por vírgula)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: foco, nutricao, hipertrofia"
                    value={newTagsStr}
                    onChange={(e) => setNewTagsStr(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Conteúdo da Nota</label>
                <textarea
                  rows={4}
                  placeholder="Escreva sua reflexão, síntese ou ideia rápida..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  required
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !newTitle.trim() || !newContent.trim()}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-bold hover:opacity-90 transition shadow-lg shadow-violet-500/20 disabled:opacity-40"
                >
                  {isSaving ? 'Salvar...' : 'Salvar Nota'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
