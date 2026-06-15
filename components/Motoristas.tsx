'use client'

import { useEffect, useRef, useState } from 'react'
import { Plus, User, IdCard, Phone, Trash2, Edit3, X, UserCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Motorista {
  id: number
  nome: string
  cnh: string
  categoria_cnh: string
  telefone: string
  status: string
}

export default function Motoristas() {
  const [motoristas, setMotoristas] = useState<Motorista[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)

  const [form, setForm] = useState({
    nome: '',
    cnh: '',
    categoria_cnh: '',
    telefone: '',
    status: 'ativo'
  })

  const isFetchingRef = useRef(false)

  async function fetchData() {
    if (isFetchingRef.current) return
    isFetchingRef.current = true

    try {
      const { data, error } = await supabase
        .from('motoristas')
        .select('*')
        .order('nome')

      if (error) {
        console.error('Erro ao buscar motoristas:', error.message)        
        return
      }

      setMotoristas(data || [])
    } catch (error) {
      console.error('Erro inesperado ao buscar motoristas:', error)
    } finally {
      setLoading(false)
      isFetchingRef.current = false
    }
  }

  useEffect(() => {
    fetchData()

    const channel = supabase
      .channel('motoristas_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'motoristas' },
        () => fetchData()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  function resetForm() {
    setForm({
      nome: '',
      cnh: '',
      categoria_cnh: '',
      telefone: '',
      status: 'ativo'
    })
  }

  function openCreate() {
    setEditId(null)
    resetForm()
    setModalOpen(true)
  }

  function openEdit(m: Motorista) {
    setEditId(m.id)
    setForm({
      nome: m.nome,
      cnh: m.cnh,
      categoria_cnh: m.categoria_cnh,
      telefone: m.telefone,
      status: m.status
    })
    setModalOpen(true)
  }

  async function saveMotorista() {
    try {
      if (!form.nome || !form.cnh) {
        alert('Por favor, preencha o Nome e a CNH.')
        return
      }

      let response

      if (editId) {
        response = await supabase
          .from('motoristas')
          .update(form)
          .eq('id', editId)
      } else {
        response = await supabase
          .from('motoristas')
          .insert([form])
      }

      if (response.error) {
        console.error('Erro Supabase:', response.error.message)
        alert('Erro ao salvar motorista')
        return
      }

      setModalOpen(false)
      setEditId(null)
      resetForm()
      fetchData()
    } catch (error) {
      console.error('Erro ao salvar motorista:', error)
    }
  }

  async function deleteMotorista(id: number) {
    if (!confirm('Deseja realmente remover este motorista do sistema?')) return

    const { error } = await supabase
      .from('motoristas')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Erro ao deletar:', error.message)
      return
    }

    fetchData()
  }

  const getStatusStyle = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'ativo':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
      case 'em viagem':
      case 'viagem':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
      case 'suspenso':
      case 'inativo':
        return 'bg-red-500/10 text-red-400 border border-red-500/20'
      default:
        return 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
    }
  }

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight">Motoristas</h2>
          <p className="text-zinc-500 mt-1">Controle de condutores, permissões e disponibilidade da equipe.</p>
        </div>

        <button
          onClick={openCreate}
          className="bg-blue-600 hover:bg-blue-500 text-white transition-all px-5 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-600/10"
        >
          <Plus size={20} />
          Novo Motorista
        </button>
      </div>

      {/* LOADING STATE */}
      {loading && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-12 text-center text-zinc-500 animate-pulse">
          Buscando motoristas na base de dados...
        </div>
      )}

      {/* GRID DE CARDS */}
      {!loading && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {motoristas.map((m) => (
            <div
              key={m.id}
              className="bg-zinc-900 border border-zinc-800/80 rounded-3xl p-6 flex flex-col justify-between hover:border-zinc-700/80 transition-all duration-300 group shadow-xl"
            >
              <div>
                {/* Topo do Card */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 group-hover:border-blue-500/30 transition-colors">
                      <User size={22} className="text-blue-500" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white tracking-tight group-hover:text-blue-400 transition-colors">
                        {m.nome}
                      </h3>
                      <p className="text-zinc-500 text-xs mt-0.5 flex items-center gap-1">
                        <IdCard size={12} /> CNH: <span className="text-zinc-400 font-mono font-medium">{m.cnh}</span>
                      </p>
                    </div>
                  </div>
                  
                  <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider ${getStatusStyle(m.status)}`}>
                    {m.status}
                  </span>
                </div>

                {/* Divisor */}
                <hr className="border-zinc-800/60 my-5" />

                {/* Info do Condutor */}
                <div className="space-y-3 text-sm text-zinc-400">
                  <div className="flex items-center justify-between bg-zinc-950/40 p-3 rounded-xl border border-zinc-800/40">
                    <span className="text-xs text-zinc-500 font-medium flex items-center gap-1.5">
                      <UserCheck size={14} className="text-purple-500" /> Categoria Habilitação
                    </span>
                    <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2.5 py-0.5 rounded-lg text-xs font-black font-mono">
                      {m.categoria_cnh || '—'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between bg-zinc-950/40 p-3 rounded-xl border border-zinc-800/40">
                    <span className="text-xs text-zinc-500 font-medium flex items-center gap-1.5">
                      <Phone size={14} className="text-zinc-400" /> Contato / Telefone
                    </span>
                    <span className="text-white font-medium font-mono text-xs">
                      {m.telefone || 'Não informado'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex gap-2 mt-6 pt-4 border-t border-zinc-800/40">
                <button
                  onClick={() => openEdit(m)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <Edit3 size={14} /> Editar
                </button>
                <button
                  onClick={() => deleteMotorista(m.id)}
                  className="bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition border border-red-500/10"
                >
                  <Trash2 size={14} /> Excluir
                </button>
              </div>
            </div>
          ))}

          {motoristas.length === 0 && (
            <div className="col-span-full bg-zinc-900/30 border border-zinc-800 border-dashed rounded-3xl p-12 text-center text-zinc-500">
              Nenhum motorista cadastrado na base operacional até o momento.
            </div>
          )}
        </div>
      )}

      {/* MODAL RESPONSIVO PREMIUM */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
          <div className="bg-zinc-950 border border-zinc-800 p-6 sm:p-8 rounded-3xl w-full max-w-xl space-y-6 shadow-2xl relative">
            
            <button 
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition"
            >
              <X size={20} />
            </button>

            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">
                {editId ? 'Editar Motorista' : 'Novo Motorista'}
              </h2>
              <p className="text-zinc-500 text-xs mt-1">Insira os dados cadastrais e profissionais do condutor.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* NOME COMPLETO */}
              <div className="col-span-1 sm:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Nome Completo</label>
                <input
                  className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-blue-500 transition text-sm font-semibold placeholder:font-normal"
                  placeholder="Ex: João Silva de Souza"
                  value={form.nome}
                  onChange={e => setForm({ ...form, nome: e.target.value })}
                />
              </div>

              {/* CNH */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Registro CNH</label>
                <input
                  className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-blue-500 transition text-sm font-mono"
                  placeholder="Ex: 12345678910"
                  value={form.cnh}
                  onChange={e => setForm({ ...form, cnh: e.target.value })}
                />
              </div>

              {/* CATEGORIA CNH */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Categoria</label>
                <input
                  className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-blue-500 transition text-sm uppercase font-mono"
                  placeholder="Ex: AD, D, E"
                  value={form.categoria_cnh}
                  onChange={e => setForm({ ...form, categoria_cnh: e.target.value })}
                />
              </div>

              {/* TELEFONE */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Telefone de Contato</label>
                <input
                  className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-blue-500 transition text-sm font-mono"
                  placeholder="Ex: (11) 99999-9999"
                  value={form.telefone}
                  onChange={e => setForm({ ...form, telefone: e.target.value })}
                />
              </div>

              {/* STATUS */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Status Operacional</label>
                <select
                  className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-blue-500 transition text-sm font-medium"
                  value={form.status}
                  onChange={e => setForm({ ...form, status: e.target.value })}
                >
                  <option value="ativo">Ativo</option>
                  <option value="em viagem">Em Viagem</option>
                  <option value="suspenso">Suspenso</option>
                  <option value="inativo">Inativo</option>
                </select>
              </div>
            </div>

            {/* BOTÕES DE AÇÃO */}
            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-900">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-5 py-2.5 text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-850 rounded-xl transition font-medium text-sm"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveMotorista}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition font-bold text-sm shadow-lg shadow-blue-600/10"
              >
                Salvar Motorista
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
