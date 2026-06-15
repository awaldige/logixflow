'use client'

import { useEffect, useRef, useState } from 'react'
import { Plus, Car, Milestone, Calendar, Trash2, Edit3, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Veiculo {
  id: number
  placa: string
  modelo: string
  marca: string
  ano: number
  tipo: string
  status: string
  km_atual: number
}

export default function Frota() {
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)

  const [form, setForm] = useState({
    placa: '',
    modelo: '',
    marca: '',
    ano: new Date().getFullYear(),
    tipo: '',
    status: 'ativo',
    km_atual: 0
  })

  const isFetchingRef = useRef(false)

  async function fetchData() {
    if (isFetchingRef.current) return
    isFetchingRef.current = true

    try {
      const { data, error } = await supabase
        .from('veiculos')
        .select('*')
        .order('placa')

      if (error) {
        console.error(error)
        return
      }
      setVeiculos(data || [])
    } catch (error) {
      console.error('Erro ao buscar veículos:', error)
    } finally {
      setLoading(false)
      isFetchingRef.current = false
    }
  }

  useEffect(() => {
    fetchData()

    const channel = supabase
      .channel('veiculos_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'veiculos' },
        () => { fetchData() }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  function resetForm() {
    setForm({
      placa: '',
      modelo: '',
      marca: '',
      ano: new Date().getFullYear(),
      tipo: '',
      status: 'ativo',
      km_atual: 0
    })
  }

  function openCreate() {
    setEditId(null)
    resetForm()
    setModalOpen(true)
  }

  function openEdit(v: Veiculo) {
    setEditId(v.id)
    setForm({
      placa: v.placa,
      modelo: v.modelo,
      marca: v.marca,
      ano: v.ano,
      tipo: v.tipo,
      status: v.status,
      km_atual: v.km_atual
    })
    setModalOpen(true)
  }

  async function saveVehicle() {
    let response
    if (editId) {
      response = await supabase
        .from('veiculos')
        .update(form)
        .eq('id', editId)
    } else {
      response = await supabase
        .from('veiculos')
        .insert([form])
    }

    if (response.error) {
      console.error(response.error)
      alert(response.error.message)
      return
    }

    setModalOpen(false)
    resetForm()
    setEditId(null)
    fetchData()
  }

  async function deleteVehicle(id: number) {
    if (!confirm('Deseja realmente remover este veículo da frota?')) return
    await supabase.from('veiculos').delete().eq('id', id)
    fetchData()
  }

  // MAPEAMENTO INTELIGENTE DE CORES E TEXTOS DE STATUS
  const getStatusStyle = (status: string) => {
    const s = status?.toLowerCase() || ''
    if (s === 'ativo') {
      return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
    }
    if (s === 'manutencao' || s === 'manutenção') {
      return 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
    }
    if (s === 'ocupado' || s === 'em viagem') {
      return 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
    }
    return 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
  }

  const formatarStatusTexto = (status: string) => {
    const s = status?.toLowerCase() || ''
    if (s === 'manutencao' || s === 'manutenção') return 'Em Manutenção'
    if (s === 'ativo') return 'Disponível'
    if (s === 'ocupado') return 'Em Viagem'
    return status
  }

  return (
    <div className="space-y-8 text-white p-6 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight">Frota</h2>
          <p className="text-zinc-500 mt-1">Gerenciamento e monitoramento dos ativos da sua operação.</p>
        </div>

        <button
          onClick={openCreate}
          className="bg-blue-600 hover:bg-blue-500 text-white transition-all px-5 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-600/10"
        >
          <Plus size={20} />
          Novo Veículo
        </button>
      </div>

      {loading && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-12 text-center text-zinc-500 animate-pulse">
          Buscando registros na base de dados...
        </div>
      )}

      {/* GRID DE CARDS */}
      {!loading && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {veiculos.map((veiculo) => (
            <div
              key={veiculo.id}
              className="bg-zinc-900 border border-zinc-800/80 rounded-3xl p-6 flex flex-col justify-between hover:border-zinc-700/80 transition-all duration-300 group shadow-xl"
            >
              <div>
                {/* Topo do Card */}
                <div className="flex items-start justify-between gap-2">
                  <div className="truncate flex-1">
                    <span className="text-xs uppercase font-semibold tracking-widest text-zinc-500">{veiculo.marca || 'Sem Marca'}</span>
                    <h3 className="text-2xl font-black text-white tracking-tight mt-0.5 group-hover:text-blue-400 transition-colors uppercase">
                      {veiculo.placa}
                    </h3>
                    <p className="text-zinc-400 text-sm mt-1 font-medium truncate">{veiculo.modelo}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap ${getStatusStyle(veiculo.status)}`}>
                    {formatarStatusTexto(veiculo.status)}
                  </span>
                </div>

                {/* Divisor */}
                <hr className="border-zinc-800/60 my-5" />

                {/* Info Técnica Básica */}
                <div className="grid grid-cols-2 gap-4 text-sm text-zinc-400">
                  <div className="flex items-center gap-2 bg-zinc-950/40 p-3 rounded-xl border border-zinc-800/40">
                    <Milestone size={16} className="text-blue-500 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider">Quilometragem</p>
                      <p className="text-white font-bold mt-0.5 font-mono">{(veiculo.km_atual || 0).toLocaleString('pt-BR')} KM</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-zinc-950/40 p-3 rounded-xl border border-zinc-800/40">
                    <Calendar size={16} className="text-purple-500 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider">Ano Fab.</p>
                      <p className="text-white font-bold mt-0.5 font-mono">{veiculo.ano}</p>
                    </div>
                  </div>
                </div>

                {veiculo.tipo && (
                  <p className="text-xs text-zinc-500 mt-4 flex items-center gap-1.5% truncate">
                    <Car size={12} className="text-zinc-600" /> Categoria: <span className="text-zinc-400 font-medium">{veiculo.tipo}</span>
                  </p>
                )}
              </div>

              {/* Botões de Ação */}
              <div className="flex gap-2 mt-6 pt-4 border-t border-zinc-800/40">
                <button
                  onClick={() => openEdit(veiculo)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <Edit3 size={14} /> Editar
                </button>
                <button
                  onClick={() => deleteVehicle(veiculo.id)}
                  className="bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition border border-red-500/10"
                >
                  <Trash2 size={14} /> Excluir
                </button>
              </div>
            </div>
          ))}

          {veiculos.length === 0 && (
            <div className="col-span-full bg-zinc-900/30 border border-zinc-800 border-dashed rounded-3xl p-12 text-center text-zinc-500">
              Nenhum veículo cadastrado na frota até o momento.
            </div>
          )}
        </div>
      )}

      {/* MODAL RESPONSIVO */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
          <div className="bg-zinc-950 border border-zinc-800 p-6 sm:p-8 rounded-3xl w-full max-w-xl space-y-6 shadow-2xl relative text-zinc-300">
            
            <button 
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition"
            >
              <X size={20} />
            </button>

            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">
                {editId ? 'Editar Veículo' : 'Novo Veículo'}
              </h2>
              <p className="text-zinc-500 text-xs mt-1">Preencha as especificações técnicas básicas do ativo.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* PLACA */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Placa</label>
                <input
                  className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-blue-500 transition text-sm font-semibold uppercase placeholder:normal-case"
                  placeholder="ABC-1234"
                  value={form.placa}
                  onChange={e => setForm({ ...form, placa: e.target.value })}
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
                  <option value="ativo">Disponível (Ativo)</option>
                  <option value="manutencao">Em Manutenção</option>
                  <option value="ocupado">Em Viagem (Ocupado)</option>
                  <option value="inativo">Inativo</option>
                </select>
              </div>

              {/* MARCA */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Marca</label>
                <input
                  className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-blue-500 transition text-sm"
                  placeholder="Ex: Volvo, Scania, Fiat..."
                  value={form.marca}
                  onChange={e => setForm({ ...form, marca: e.target.value })}
                />
              </div>

              {/* MODELO */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Modelo</label>
                <input
                  className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-blue-500 transition text-sm"
                  placeholder="Ex: FH 540 / Uno 1.0"
                  value={form.modelo}
                  onChange={e => setForm({ ...form, modelo: e.target.value })}
                />
              </div>

              {/* TIPO */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Tipo / Categoria</label>
                <input
                  className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-blue-500 transition text-sm"
                  placeholder="Ex: Caminhão, Van, Passeio"
                  value={form.tipo}
                  onChange={e => setForm({ ...form, tipo: e.target.value })}
                />
              </div>

              {/* ANO */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Ano Fabricação</label>
                <input
                  type="number"
                  className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-blue-500 transition text-sm font-mono"
                  value={form.ano || ''}
                  onChange={e => setForm({ ...form, ano: Number(e.target.value) })}
                />
              </div>

              {/* KM ATUAL */}
              <div className="col-span-1 sm:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Odômetro (KM Atual)</label>
                <input
                  type="number"
                  className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-blue-500 transition text-sm font-mono"
                  placeholder="Ex: 85000"
                  value={form.km_atual || ''}
                  onChange={e => setForm({ ...form, km_atual: Number(e.target.value) })}
                />
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
                onClick={saveVehicle}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition font-bold text-sm shadow-lg shadow-blue-600/10"
              >
                Salvar Veículo
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
