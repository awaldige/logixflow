'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Plus, Wrench, Calendar, DollarSign, ShieldAlert, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Manutencao {
  id: number
  veiculo_id: number
  descricao: string
  data_manutencao: string
  custo: number
  oficina: string
  status: string
}

const INITIAL_FORM_STATE = {
  veiculo_id: '',
  descricao: '',
  data_manutencao: '',
  custo: '',
  oficina: '',
  status: 'pendente'
}

export default function Manutencoes() {
  const [manutencoes, setManutencoes] = useState<Manutencao[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)

  // Usamos strings no form para melhor manipulação dos inputs numéricos vazios
  const [form, setForm] = useState(INITIAL_FORM_STATE)

  const isFetchingRef = useRef(false)

  // Memoizando a busca para evitar loops de re-renderização
  const fetchData = useCallback(async () => {
    if (isFetchingRef.current) return
    isFetchingRef.current = true

    try {
      const { data, error } = await supabase
        .from('manutencoes')
        .select('*')
        .order('data_manutencao', { ascending: false })

      if (error) throw error
      setManutencoes(data || [])
    } catch (error) {
      console.error('Erro ao buscar manutenções:', error)
      alert('Não foi possível carregar o histórico de manutenções.')
    } finally {
      setLoading(false)
      isFetchingRef.current = false
    }
  }, [])

  // Inicialização e Realtime
  useEffect(() => {
    fetchData()

    const channel = supabase
      .channel('manutencoes_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'manutencoes' },
        () => fetchData()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchData])

  function resetForm() {
    setForm(INITIAL_FORM_STATE)
  }

  function openCreate() {
    setEditId(null)
    resetForm()
    setModalOpen(true)
  }

  function openEdit(m: Manutencao) {
    setEditId(m.id)
    setForm({
      veiculo_id: String(m.veiculo_id),
      descricao: m.descricao,
      data_manutencao: m.data_manutencao ? m.data_manutencao.substring(0, 10) : '',
      custo: String(m.custo),
      oficina: m.oficina,
      status: m.status
    })
    setModalOpen(true)
  }

  // FUNÇÃO PARA SALVAR E TRATAR OS NÚMEROS
  async function saveManutencao() {
    if (!form.veiculo_id) return alert('Por favor, informe o ID do veículo.')
    if (!form.descricao.trim()) return alert('Por favor, informe a descrição.')
    if (!form.data_manutencao) return alert('Por favor, selecione a data.')
    if (!form.custo) return alert('Por favor, informe o custo.')

    try {
      // Monta o payload convertendo os campos numéricos corretamente
      const payload = {
        veiculo_id: Number(form.veiculo_id),
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

      setModalOpen(false)
      setEditId(null)
      resetForm()
      fetchData()
    } catch (error: any) {
      console.error('Erro ao salvar manutenção:', error)
      alert(`Erro ao salvar: ${error.message || 'Verifique as permissões do banco.'}`)
    }
  }

  async function deleteManutencao(id: number) {
    if (!confirm('Deseja excluir este registro de manutenção?')) return
    try {
      const { error } = await supabase.from('manutencoes').delete().eq('id', id)
      if (error) throw error
      fetchData()
    } catch (error) {
      console.error('Erro ao deletar:', error)
      alert('Não foi possível excluir a manutenção.')
    }
  }

  const formatarData = (dataStr: string) => {
    if (!dataStr) return ''
    const partes = dataStr.substring(0, 10).split('-')
    return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : dataStr
  }

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto text-white">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-white">Manutenções</h2>
          <p className="text-zinc-500 mt-1">Histórico e controle de reparos da frota.</p>
        </div>
        <button onClick={openCreate} className="bg-blue-600 hover:bg-blue-500 transition px-5 py-3 rounded-2xl font-bold flex items-center gap-2">
          <Plus size={18} /> Nova Manutenção
        </button>
      </div>

      {loading && <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-zinc-400">Carregando manutenções...</div>}

      {/* GRID */}
      {!loading && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {manutencoes.map((m) => (
            <div key={m.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col justify-between hover:border-zinc-700 transition">
              <div>
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
                  <span className="text-zinc-500 font-bold text-sm">Veículo ID #{m.veiculo_id}</span>
                  <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase ${
                    m.status === 'concluida' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    m.status === 'pendente' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                    'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}>
                    {m.status}
                  </span>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-start gap-2">
                    <Wrench size={16} className="text-blue-500 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-zinc-500 font-medium uppercase">Descrição</p>
                      <p className="text-white font-bold text-base">{m.descricao}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-950/40 rounded-2xl p-4 space-y-2 text-sm text-zinc-400 border border-zinc-800/50">
                  <p className="flex justify-between">
                    <span className="flex items-center gap-1"><Calendar size={14} /> Data:</span> 
                    <span className="text-white font-semibold">{formatarData(m.data_manutencao)}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="flex items-center gap-1"><DollarSign size={14} /> Custo:</span> 
                    <span className="text-emerald-400 font-bold">R$ {Number(m.custo).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </p>
                  <p className="flex justify-between">
                    <span>Oficina:</span> 
                    <span className="text-white font-semibold truncate max-w-[180px]">{m.oficina}</span>
                  </p>
                </div>
              </div>

              {/* AÇÕES */}
              <div className="flex gap-2 mt-6 border-t border-zinc-800/60 pt-4">
                <button onClick={() => openEdit(m)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2.5 rounded-xl text-xs font-bold transition flex-1">
                  Editar
                </button>
                <button onClick={() => deleteManutencao(m.id)} className="bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-900/30 px-3 py-2.5 rounded-xl text-xs font-bold transition flex-shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-zinc-900 p-6 rounded-3xl w-full max-w-xl space-y-4 my-auto border border-zinc-800">
            <h2 className="text-2xl font-black text-white">
              {editId ? 'Editar Manutenção' : 'Nova Manutenção'}
            </h2>

            <div className="space-y-3">
              <div>
                <label className="text-zinc-400 text-xs ml-1">ID do Veículo *</label>
                <input
                  type="number"
                  className="w-full p-3 rounded-xl bg-zinc-800 text-white border border-zinc-700 focus:outline-none focus:border-blue-500"
                  placeholder="Ex: 3"
                  value={form.veiculo_id}
                  onChange={e => setForm({ ...form, veiculo_id: e.target.value })}
                />
              </div>

              <div>
                <label className="text-zinc-400 text-xs ml-1">Descrição do Serviço *</label>
                <input
                  className="w-full p-3 rounded-xl bg-zinc-800 text-white border border-zinc-700 focus:outline-none focus:border-blue-500"
                  placeholder="Ex: Troca de óleo e filtros"
                  value={form.descricao}
                  onChange={e => setForm({ ...form, descricao: e.target.value })}
                />
              </div>

              <div>
                <label className="text-zinc-400 text-xs ml-1">Oficina / Fornecedor</label>
                <input
                  className="w-full p-3 rounded-xl bg-zinc-800 text-white border border-zinc-700 focus:outline-none focus:border-blue-500"
                  placeholder="Ex: Oficina Mecânica Central"
                  value={form.oficina}
                  onChange={e => setForm({ ...form, oficina: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 text-xs ml-1">Data da Manutenção *</label>
                  <input
                    type="date"
                    className="w-full p-3 rounded-xl bg-zinc-800 text-white border border-zinc-700 focus:outline-none focus:border-blue-500"
                    value={form.data_manutencao}
                    onChange={e => setForm({ ...form, data_manutencao: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-zinc-400 text-xs ml-1">Custo Total (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full p-3 rounded-xl bg-zinc-800 text-white border border-zinc-700 focus:outline-none focus:border-blue-500"
                    placeholder="0.00"
                    value={form.custo}
                    onChange={e => setForm({ ...form, custo: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-400 text-xs ml-1">Status</label>
                <select
                  className="w-full p-3 rounded-xl bg-zinc-800 text-white border border-zinc-700 focus:outline-none focus:border-blue-500"
                  value={form.status}
                  onChange={e => setForm({ ...form, status: e.target.value })}
                >
                  <option value="pendente">Pendente</option>
                  <option value="em andamento">Em Andamento</option>
                  <option value="concluida">Concluída</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-zinc-800">
              <button
                onClick={() => { setModalOpen(false); resetForm(); }}
                className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-medium transition"
              >
                Cancelar
              </button>
              <button
                onClick={saveManutencao}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition"
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
