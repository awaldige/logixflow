'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'

// 1. TIPAGENS ATUALIZADAS (Incluindo os relacionamentos do banco)
interface Viagem {
  id: number
  origem: string
  destino: string
  veiculo_id: number | null
  motorista_id: number | null
  data_saida: string
  data_retorno: string | null
  status: string
  km_inicial: number
  km_final: number | null
  // Joins do Supabase
  motoristas: { nome: string } | null
  veiculos: { nome: string } | null
}

interface Motorista {
  id: number
  nome: string
}

interface Veiculo {
  id: number
  nome: string
}

const INITIAL_FORM_STATE = {
  origem: '',
  destino: '',
  veiculo_id: 0,
  motorista_id: 0,
  data_saida: '',
  data_retorno: '',
  status: 'em andamento',
  km_inicial: 0,
  km_final: 0
}

export default function Viagens() {
  const [viagens, setViagens] = useState<Viagem[]>([])
  const [motoristas, setMotoristas] = useState<Motorista[]>([])
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState(INITIAL_FORM_STATE)

  const isFetchingRef = useRef(false)

  // 2. BUSCA DE VIAGENS COM VALORES RELACIONAIS (Join)
  const fetchData = useCallback(async () => {
    if (isFetchingRef.current) return
    isFetchingRef.current = true

    try {
      const { data, error } = await supabase
        .from('viagens')
        .select(`
          *,
          motoristas ( nome ),
          veiculos ( nome )
        `)
        .order('data_saida', { ascending: false })

      if (error) throw error
      setViagens(data || [])
    } catch (error) {
      console.error('Erro ao buscar viagens:', error)
      alert('Não foi possível carregar as viagens.')
    } finally {
      setLoading(false)
      isFetchingRef.current = false
    }
  }, [])

  // 3. CARGA INICIAL DE MOTORISTAS E VEÍCULOS
  useEffect(() => {
    async function loadAuxiliaryData() {
      try {
        const [motoristasRes, veiculosRes] = await Promise.all([
          supabase.from('motoristas').select('id, nome'),
          supabase.from('veiculos').select('id, nome')
        ])

        if (motoristasRes.error) throw motoristasRes.error
        if (veiculosRes.error) throw veiculosRes.error

        setMotoristas(motoristasRes.data || [])
        setVeiculos(veiculosRes.data || [])
      } catch (error) {
        console.error('Erro ao carregar dados auxiliares:', error)
        alert('Erro ao carregar listas de motoristas ou veículos.')
      }
    }

    loadAuxiliaryData()
  }, [])

  // 4. REALTIME ESCUTANDO MUTAÇÕES E ATUALIZANDO A LISTA
  useEffect(() => {
    fetchData()

    const channel = supabase
      .channel('viagens_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'viagens' },
        () => {
          fetchData()
        }
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

  function openEdit(v: Viagem) {
    setEditId(v.id)
    setForm({
      origem: v.origem,
      destino: v.destino,
      veiculo_id: v.veiculo_id || 0,
      motorista_id: v.motorista_id || 0,
      data_saida: v.data_saida,
      data_retorno: v.data_retorno || '',
      status: v.status,
      km_inicial: v.km_inicial,
      km_final: v.km_final || 0
    })
    setModalOpen(true)
  }

  // 5. SALVAR COM VALIDAÇÕES DE CAMPOS OBRIGATÓRIOS
  async function saveViagem() {
    // Validações no Front-end antes de enviar ao Supabase
    if (!form.origem.trim()) return alert('Por favor, informe a origem.')
    if (!form.destino.trim()) return alert('Por favor, informe o destino.')
    if (form.motorista_id === 0) return alert('Por favor, selecione um motorista.')
    if (form.veiculo_id === 0) return alert('Por favor, selecione um veículo.')
    if (!form.data_saida) return alert('Por favor, selecione a data de saída.')

    try {
      const payload = {
        ...form,
        motorista_id: form.motorista_id || null,
        veiculo_id: form.veiculo_id || null,
        data_retorno: form.data_retorno || null,
        km_final: form.km_final || null
      }

      let error

      if (editId) {
        const res = await supabase.from('viagens').update(payload).eq('id', editId)
        error = res.error
      } else {
        const res = await supabase.from('viagens').insert([payload])
        error = res.error
      }

      if (error) {
        console.error('Erro Supabase:', error)
        alert(`Erro ao salvar: ${error.message}`)
        return
      }

      setModalOpen(false)
      setEditId(null)
      resetForm()
      fetchData()
    } catch (error) {
      console.error('Erro geral ao salvar:', error)
    }
  }

  async function deleteViagem(id: number) {
    if (!confirm('Deseja excluir esta viagem?')) return

    try {
      const { error } = await supabase.from('viagens').delete().eq('id', id)
      if (error) throw error
      fetchData()
    } catch (error) {
      console.error('Erro ao deletar:', error)
      alert('Não foi possível excluir a viagem.')
    }
  }

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-white">Viagens</h2>
          <p className="text-zinc-500 mt-1">Controle das viagens em andamento.</p>
        </div>

        <button
          onClick={openCreate}
          className="bg-blue-600 hover:bg-blue-500 transition px-5 py-3 rounded-2xl font-bold flex items-center gap-2 text-white"
        >
          <Plus size={18} />
          Nova Viagem
        </button>
      </div>

      {/* LOADING */}
      {loading && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-zinc-400">
          Carregando viagens...
        </div>
      )}

      {/* GRID COM EXIBIÇÃO DE NOMES */}
      {!loading && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {viagens.map((v) => (
            <div key={v.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xl font-black text-white truncate">
                    {v.origem} → {v.destino}
                  </h3>
                  <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-xl text-sm font-bold whitespace-nowrap">
                    {v.status}
                  </span>
                </div>
                <p className="text-zinc-500 mt-1 text-sm">Viagem #{v.id}</p>

                <div className="mt-6 space-y-2 text-zinc-400 text-sm">
                  {/* Nomes buscados via relacionamento ao invés de IDs numéricos */}
                  <p>Motorista: <span className="text-white ml-2">{v.motoristas?.nome || 'Não vinculado'}</span></p>
                  <p>Veículo: <span className="text-white ml-2">{v.veiculos?.nome || 'Não vinculado'}</span></p>
                  <p>KM Inicial: <span className="text-white ml-2">{v.km_inicial}</span></p>
                  {v.km_final && <p>KM Final: <span className="text-white ml-2">{v.km_final}</span></p>}
                  <p>Data Saída: <span className="text-white ml-2">{new Date(v.data_saida).toLocaleDateString('pt-BR')}</span></p>
                </div>
              </div>

              {/* ACTIONS */}
              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => openEdit(v)}
                  className="bg-yellow-600 hover:bg-yellow-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition flex-1"
                >
                  Editar
                </button>
                <button
                  onClick={() => deleteViagem(v.id)}
                  className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition flex-1"
                >
                  Excluir
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
              {editId ? 'Editar Viagem' : 'Nova Viagem'}
            </h2>

            <div className="space-y-3">
              <input
                className="w-full p-3 rounded-xl bg-zinc-800 text-white border border-zinc-700 focus:outline-none focus:border-blue-500"
                placeholder="Origem *"
                value={form.origem}
                onChange={e => setForm({ ...form, origem: e.target.value })}
              />

              <input
                className="w-full p-3 rounded-xl bg-zinc-800 text-white border border-zinc-700 focus:outline-none focus:border-blue-500"
                placeholder="Destino *"
                value={form.destino}
                onChange={e => setForm({ ...form, destino: e.target.value })}
              />
<div>
  <label className="text-zinc-400 text-xs ml-1">
    Motorista
  </label>

  <select
    className="w-full p-3 rounded-xl bg-zinc-800 text-white border border-zinc-700"
    value={form.motorista_id}
    onChange={e =>
      setForm({ ...form, motorista_id: Number(e.target.value) })
    }
  >
    <option value={0}>Selecione um motorista</option>

    {motoristas.map((m) => (
      <option key={m.id} value={m.id}>
        🚗 {m.nome}
      </option>
    ))}
  </select>
</div>

              <div>
  <label className="text-zinc-400 text-xs ml-1">
    Veículo
  </label>

  <select
    className="w-full p-3 rounded-xl bg-zinc-800 text-white border border-zinc-700"
    value={form.veiculo_id}
    onChange={e =>
      setForm({ ...form, veiculo_id: Number(e.target.value) })
    }
  >
    <option value={0}>Selecione um veículo</option>

    {veiculos.map((v) => (
      <option key={v.id} value={v.id}>
        🚛 {v.nome}
      </option>
    ))}
  </select>
</div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 text-xs ml-1">Data Saída *</label>
                  <input
                    type="date"
                    className="w-full p-3 rounded-xl bg-zinc-800 text-white border border-zinc-700 focus:outline-none focus:border-blue-500"
                    value={form.data_saida}
                    onChange={e => setForm({ ...form, data_saida: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-zinc-400 text-xs ml-1">KM Inicial</label>
                  <input
                    type="number"
                    className="w-full p-3 rounded-xl bg-zinc-800 text-white border border-zinc-700 focus:outline-none focus:border-blue-500"
                    value={form.km_inicial || ''}
                    onChange={e => setForm({ ...form, km_inicial: Number(e.target.value) })}
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
                  <option value="em andamento">Em andamento</option>
                  <option value="concluída">Concluída</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>
            </div>

            {/* BOTÕES */}
            <div className="flex justify-end gap-2 pt-4 border-t border-zinc-800">
              <button
                onClick={() => { setModalOpen(false); resetForm(); }}
                className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-medium transition"
              >
                Cancelar
              </button>
              <button
                onClick={saveViagem}
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
