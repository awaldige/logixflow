'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Plus, Wrench, Calendar, DollarSign, Trash2, CheckCircle, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Manutencao {
  id: number
  veiculo_id: number
  descricao: string
  data_manutencao: string
  custo: number
  oficina: string
  status: string
  veiculos: { placa: string; modelo: string } | { placa: string; modelo: string }[] | null
}

interface Veiculo {
  id: number
  placa: string
  modelo: string
}

const INITIAL_FORM_STATE = {
  veiculo_id: 0,
  descricao: '',
  data_manutencao: '',
  custo: '',
  oficina: '',
  status: 'pendente'
}

export default function Manutencoes() {
  const [manutencoes, setManutencoes] = useState<Manutencao[]>([])
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState(INITIAL_FORM_STATE)

  const isFetchingRef = useRef(false)

  const fetchData = useCallback(async () => {
    if (isFetchingRef.current) return
    isFetchingRef.current = true

    try {
      const { data, error } = await supabase
        .from('manutencoes')
        .select(`
          id, veiculo_id, descricao, data_manutencao, custo, oficina, status,
          veiculos ( placa, modelo )
        `)
        .order('data_manutencao', { ascending: false })

      if (error) throw error
      setManutencoes((data as unknown as Manutencao[]) || [])
    } catch (error) {
      console.error('Erro ao buscar manutenções:', error)
      alert('Não foi possível carregar o histórico de manutenções.')
    } finally {
      setLoading(false)
      isFetchingRef.current = false
    }
  }, [])

  useEffect(() => {
    async function loadVeiculos() {
      try {
        const { data } = await supabase.from('veiculos').select('id, placa, modelo').order('modelo')
        setVeiculos(data || [])
      } catch (error) {
        console.error('Erro ao carregar veículos:', error)
      }
    }
    loadVeiculos()
  }, [])

  useEffect(() => {
    fetchData()

    const channel = supabase
      .channel('manutencoes_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'manutencoes' }, () => fetchData())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchData])

  async function concluirManutencao(id: number, veiculoId: number) {
    if (!veiculoId) return alert('ID do veículo inválido para conclusão.');

    try {
      const { error: manutencaoError } = await supabase
        .from('manutencoes')
        .update({ status: 'concluida' })
        .eq('id', id)

      if (manutencaoError) throw manutencaoError

      const { error: veiculoError } = await supabase
        .from('veiculos')
        .update({ status: 'ativo' })
        .eq('id', Number(veiculoId))

      if (veiculoError) {
        console.warn('Manutenção concluída, mas falhou ao ativar veículo:', veiculoError)
        alert('Manutenção concluída! No entanto, o veículo não mudou para Disponível automaticamente por restrições do banco. Altere-o manualmente se necessário.')
      }

      fetchData()
    } catch (error: any) {
      console.error('Erro ao concluir manutenção:', error)
      alert(`Não foi possível concluir a manutenção: ${error.message || error}`)
    }
  }

  function resetForm() { setForm(INITIAL_FORM_STATE) }
  function openCreate() { setEditId(null); resetForm(); setModalOpen(true); }

  function openEdit(m: Manutencao) {
    setEditId(m.id)
    setForm({
      veiculo_id: m.veiculo_id,
      descricao: m.descricao,
      data_manutencao: m.data_manutencao ? m.data_manutencao.substring(0, 10) : '',
      custo: String(m.custo),
      oficina: m.oficina,
      status: m.status
    })
    setModalOpen(true)
  }

  async function saveManutencao() {
    const idDoVeiculo = Number(form.veiculo_id)

    if (!idDoVeiculo || idDoVeiculo === 0) return alert('Por favor, selecione o veículo.')
    if (!form.descricao.trim()) return alert('Por favor, informe a descrição.')
    if (!form.data_manutencao) return alert('Por favor, selecione a data.')
    if (!form.custo) return alert('Por favor, informe o custo.')

    try {
      const payload = {
        veiculo_id: idDoVeiculo,
        descricao: form.descricao,
        data_manutencao: form.data_manutencao,
        custo: Number(form.custo),
        oficina: form.oficina || 'Não informada',
        status: form.status
      }

      let error
      if (editId) {
        const res = await supabase.from('manutencoes').update(payload).eq('id', editId)
        error = res.error
      } else {
        const res = await supabase.from('manutencoes').insert([payload])
        error = res.error
      }

      if (error) throw error

      const novoStatusVeiculo = form.status === 'concluida' ? 'ativo' : 'manutencao'
      
      const { error: errorVeiculo } = await supabase
        .from('veiculos')
        .update({ status: novoStatusVeiculo })
        .eq('id', idDoVeiculo)

      if (errorVeiculo) {
        console.warn('Manutenção salva, mas falhou ao atualizar status do veículo:', errorVeiculo)
        alert('Manutenção registrada com sucesso! No entanto, o status do veículo na Frota não mudou sozinho devido a políticas do banco. Modifique-o na tela de frotas manualmente.')
      }

      setModalOpen(false)
      resetForm()
      fetchData()
    } catch (error: any) {
      console.error('Erro ao salvar manutenção:', error)
      alert(`Erro ao salvar: ${error.message || error}`)
    }
  }

  async function deleteManutencao(id: number) {
    if (!confirm('Deseja excluir este registro de manutenção?')) return
    try {
      const { error } = await supabase.from('manutencoes').delete().eq('id', id)
      if (error) throw error
      fetchData()
    } catch (error) { console.error(error) }
  }

  const getVeiculoTexto = (m: Manutencao) => {
    if (!m.veiculos) return `ID #${m.veiculo_id}`
    if (Array.isArray(m.veiculos)) {
      const target = m.veiculos[0]
      return target ? `${target.modelo} (${target.placa})` : `ID #${m.veiculo_id}`
    }
    return `${m.veiculos.modelo} (${m.veiculos.placa})`
  }

  const formatarData = (dataStr: string) => {
    if (!dataStr) return ''
    const partes = dataStr.substring(0, 10).split('-')
    return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : dataStr
  }

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto text-white">
      
      {/* HEADER RESPONSIVO */}
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight truncate">Manutenções</h2>
          <p className="text-zinc-500 text-xs md:text-sm mt-1 truncate">Histórico e controle de reparos.</p>
        </div>
        <button 
          onClick={openCreate} 
          className="bg-blue-600 hover:bg-blue-500 text-white transition-all px-4 py-2.5 md:px-5 md:py-3 rounded-xl md:rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-blue-600/10 flex-shrink-0 text-xs md:text-sm"
        >
          <Plus size={16} /> 
          <span className="hidden sm:inline">Nova Manutenção</span>
        </button>
      </div>

      {loading && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl md:rounded-3xl p-8 text-zinc-400 animate-pulse">
          Carregando manutenções...
        </div>
      )}

      {/* GRID RESPONSIVO: 1 coluna no mobile, 2 no tablet, 3 no desktop */}
      {!loading && (
        <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {manutencoes.map((m) => (
            <div key={m.id} className="bg-zinc-900 border border-zinc-800/80 rounded-2xl md:rounded-3xl p-5 md:p-6 flex flex-col justify-between hover:border-zinc-700 transition duration-300 shadow-xl min-w-0">
              <div>
                <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3 mb-4 gap-2">
                  <span className="text-white font-bold text-xs md:text-sm truncate flex-1" title={getVeiculoTexto(m)}>
                    {getVeiculoTexto(m)}
                  </span>
                  <span className={`px-2.5 py-0.5 md:px-3 md:py-1 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-wider flex-shrink-0 ${
                    m.status === 'concluida' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    m.status === 'pendente' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                    'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}>
                    {m.status}
                  </span>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-start gap-2 min-w-0">
                    <Wrench size={16} className="text-blue-500 mt-1 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] md:text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Descrição</p>
                      <p className="text-white font-bold text-sm md:text-base leading-snug break-words">{m.descricao}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-950/40 rounded-xl md:rounded-2xl p-3 md:p-4 space-y-2 text-xs md:text-sm text-zinc-400 border border-zinc-800/40">
                  <p className="flex justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-zinc-500 text-xs font-medium"><Calendar size={14} /> Data</span> 
                    <span className="text-white font-semibold font-mono text-xs">{formatarData(m.data_manutencao)}</span>
                  </p>
                  <p className="flex justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-zinc-500 text-xs font-medium"><DollarSign size={14} /> Custo</span> 
                    <span className="text-emerald-400 font-bold font-mono text-xs">R$ {Number(m.custo).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </p>
                  <p className="flex justify-between gap-2 min-w-0">
                    <span className="text-zinc-500 text-xs font-medium flex-shrink-0">Oficina</span> 
                    <span className="text-white font-semibold text-xs truncate text-right flex-1" title={m.oficina}>{m.oficina}</span>
                  </p>
                </div>
              </div>

              {/* LISTA DE AÇÕES OPERACIONAIS */}
              <div className="space-y-2 mt-5 md:mt-6">
                {m.status !== 'concluida' && (
                  <button
                    onClick={() => concluirManutencao(m.id, m.veiculo_id)}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2 md:py-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/10"
                  >
                    <CheckCircle size={14} />
                    Concluir Manutenção
                  </button>
                )}

                <div className="flex gap-2">
                  <button onClick={() => openEdit(m)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-xl text-xs font-bold transition flex-1">
                    Editar
                  </button>
                  <button onClick={() => deleteManutencao(m.id)} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/10 px-3 py-2 rounded-xl text-xs font-bold transition flex-shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL RESPONSIVO COM ROLAGEM INTERNA INTELIGENTE */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 transition-all">
          <div className="bg-zinc-950 p-5 sm:p-8 rounded-2xl sm:rounded-3xl w-full max-w-xl space-y-5 sm:space-y-6 border border-zinc-800 shadow-2xl relative text-zinc-300 max-h-[calc(100vh-2rem)] overflow-y-auto">
            
            <button 
              onClick={() => { setModalOpen(false); resetForm(); }}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition p-1"
            >
              <X size={20} />
            </button>

            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {editId ? 'Editar Manutenção' : 'Nova Manutenção'}
              </h2>
              <p className="text-zinc-500 text-xs mt-1">Insira os dados do chamado técnico para controle operacional.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Veículo *</label>
                <select 
                  className="w-full p-3 rounded-xl bg-zinc-900 text-white border border-zinc-800 focus:outline-none focus:border-blue-500 transition text-xs sm:text-sm font-medium" 
                  value={form.veiculo_id} 
                  onChange={e => setForm({ ...form, veiculo_id: Number(e.target.value) })}
                >
                  <option value={0}>Selecione um veículo da frota</option>
                  {veiculos.map((v) => (
                    <option key={v.id} value={v.id}> 🚛 {v.modelo} — ({v.placa})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Descrição do Serviço *</label>
                <input
                  className="w-full p-3 rounded-xl bg-zinc-900 text-white border border-zinc-800 focus:outline-none focus:border-blue-500 transition text-xs sm:text-sm font-medium"
                  placeholder="Ex: Troca de pastilhas de freio e óleo"
                  value={form.descricao}
                  onChange={e => setForm({ ...form, descricao: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Oficina / Fornecedor</label>
                <input
                  className="w-full p-3 rounded-xl bg-zinc-900 text-white border border-zinc-800 focus:outline-none focus:border-blue-500 transition text-xs sm:text-sm font-medium"
                  placeholder="Ex: Auto Mecânica Diesel Central"
                  value={form.oficina}
                  onChange={e => setForm({ ...form, oficina: e.target.value })}
                />
              </div>

              {/* GRID DUPLO: Se molda em 1 coluna no mobile e 2 a partir do tamanho 'sm' */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Data da Manutenção *</label>
                  <input
                    type="date"
                    className="w-full p-3 rounded-xl bg-zinc-900 text-white border border-zinc-800 focus:outline-none focus:border-blue-500 transition text-xs sm:text-sm font-mono"
                    value={form.data_manutencao}
                    onChange={e => setForm({ ...form, data_manutencao: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Custo Total (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full p-3 rounded-xl bg-zinc-900 text-white border border-zinc-800 focus:outline-none focus:border-blue-500 transition text-xs sm:text-sm font-mono"
                    placeholder="0.00"
                    value={form.custo}
                    onChange={e => setForm({ ...form, custo: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Status Operacional</label>
                <select
                  className="w-full p-3 rounded-xl bg-zinc-900 text-white border border-zinc-800 focus:outline-none focus:border-blue-500 transition text-xs sm:text-sm font-medium"
                  value={form.status}
                  onChange={e => setForm({ ...form, status: e.target.value })}
                >
                  <option value="pendente">Pendente</option>
                  <option value="em andamento">Em Andamento</option>
                  <option value="concluida">Concluída</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-900/60">
              <button
                onClick={() => { setModalOpen(false); resetForm(); }}
                className="px-4 py-2.5 sm:px-5 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-white rounded-xl font-medium transition text-xs sm:text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={saveManutencao}
                className="px-4 py-2.5 sm:px-5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition text-xs sm:text-sm shadow-lg shadow-blue-600/10"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
