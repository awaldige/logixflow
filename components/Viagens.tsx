'use client'

import { useEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Viagem {
  id: number
  origem: string
  destino: string
  veiculo_id: number
  motorista_id: number
  data_saida: string
  data_retorno: string | null
  status: string
  km_inicial: number
  km_final: number | null
}

export default function Viagens() {

  const [viagens, setViagens] = useState<Viagem[]>([])
  const [loading, setLoading] = useState(true)

  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)

  const [form, setForm] = useState({
    origem: '',
    destino: '',
    veiculo_id: 0,
    motorista_id: 0,
    data_saida: '',
    data_retorno: '',
    status: 'em andamento',
    km_inicial: 0,
    km_final: 0
  })

  const isFetchingRef = useRef(false)

  async function fetchData() {

    if (isFetchingRef.current) return
    isFetchingRef.current = true

    try {

      const { data, error } = await supabase
        .from('viagens')
        .select('*')
        .order('data_saida', { ascending: false })

      if (error) {
        console.error(error)
        return
      }

      setViagens(data || [])

    } catch (error) {
      console.error('Erro ao buscar viagens:', error)
    } finally {
      setLoading(false)
      isFetchingRef.current = false
    }
  }
 const [motoristas, setMotoristas] = useState<any[]>([])
const [veiculos, setVeiculos] = useState<any[]>([])
useEffect(() => {
  async function load() {
    const { data: m } = await supabase.from('motoristas').select('id, nome')
    const { data: v } = await supabase.from('veiculos').select('id, nome')

    setMotoristas(m || [])
    setVeiculos(v || [])
  }

  load()
}, [])
  
  useEffect(() => {

    fetchData()

    const channel = supabase
      .channel('viagens_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'viagens'
        },
        () => fetchData()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }

  }, [])

  function resetForm() {
    setForm({
      origem: '',
      destino: '',
      veiculo_id: 0,
      motorista_id: 0,
      data_saida: '',
      data_retorno: '',
      status: 'em andamento',
      km_inicial: 0,
      km_final: 0
    })
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
      veiculo_id: v.veiculo_id,
      motorista_id: v.motorista_id,
      data_saida: v.data_saida,
      data_retorno: v.data_retorno || '',
      status: v.status,
      km_inicial: v.km_inicial,
      km_final: v.km_final || 0
    })
    setModalOpen(true)
  }

 async function saveViagem() {
  try {

    const payload = {
      ...form,
      motorista_id: form.motorista_id || null,
      veiculo_id: form.veiculo_id || null
    }

    let response

    if (editId) {
      response = await supabase
        .from('viagens')
        .update(payload)
        .eq('id', editId)
    } else {
      response = await supabase
        .from('viagens')
        .insert([payload])
    }

    const { error } = response

    if (error) {
      console.error('Erro Supabase:', error)
      alert(error.message)
      return
    }

    setModalOpen(false)
    setEditId(null)
    resetForm()
    fetchData()

  } catch (error) {
    console.error('Erro geral:', error)
  }
}

  async function deleteViagem(id: number) {

    if (!confirm('Deseja excluir esta viagem?')) return

    await supabase
      .from('viagens')
      .delete()
      .eq('id', id)

    fetchData()
  }

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex items-center justify-between">

        <div>
          <h2 className="text-3xl font-black text-white">
            Viagens
          </h2>

          <p className="text-zinc-500 mt-1">
            Controle das viagens em andamento.
          </p>
        </div>

        <button
          onClick={openCreate}
          className="
            bg-blue-600
            hover:bg-blue-500
            transition
            px-5
            py-3
            rounded-2xl
            font-bold
            flex
            items-center
            gap-2
          "
        >
          <Plus size={18} />
          Nova Viagem
        </button>

      </div>

      {/* LOADING */}
      {loading && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
          Carregando viagens...
        </div>
      )}

      {/* GRID */}
      {!loading && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

          {viagens.map((v) => (
            <div
              key={v.id}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6"
            >

              <div className="flex items-center justify-between">

                <div>
                  <h3 className="text-xl font-black text-white">
                    {v.origem} → {v.destino}
                  </h3>

                  <p className="text-zinc-500 mt-1">
                    Viagem #{v.id}
                  </p>
                </div>

                <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-xl text-sm font-bold">
                  {v.status}
                </span>

              </div>

              <div className="mt-6 space-y-2 text-zinc-400">

                <p>
                  KM Inicial:
                  <span className="text-white ml-2">{v.km_inicial}</span>
                </p>

                <p>
                  Data Saída:
                  <span className="text-white ml-2">
                    {new Date(v.data_saida).toLocaleDateString('pt-BR')}
                  </span>
                </p>

                <p>
                  Destino:
                  <span className="text-white ml-2">{v.destino}</span>
                </p>

              </div>

              {/* ACTIONS */}
              <div className="flex gap-2 mt-4">

                <button
                  onClick={() => openEdit(v)}
                  className="bg-yellow-600 hover:bg-yellow-500 px-3 py-1 rounded-xl text-sm font-bold"
                >
                  Editar
                </button>

                <button
                  onClick={() => deleteViagem(v.id)}
                  className="bg-red-600 hover:bg-red-500 px-3 py-1 rounded-xl text-sm font-bold"
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
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center">

    <div className="bg-zinc-900 p-6 rounded-3xl w-[90%] max-w-xl space-y-4">

      <h2 className="text-2xl font-black text-white">
        {editId ? 'Editar Viagem' : 'Nova Viagem'}
      </h2>

      {/* ORIGEM */}
      <input
        className="w-full p-3 rounded bg-zinc-800 text-white"
        placeholder="Origem"
        value={form.origem}
        onChange={e => setForm({ ...form, origem: e.target.value })}
      />

      {/* DESTINO */}
      <input
        className="w-full p-3 rounded bg-zinc-800 text-white"
        placeholder="Destino"
        value={form.destino}
        onChange={e => setForm({ ...form, destino: e.target.value })}
      />

      {/* MOTORISTA */}
      <div>
        <label className="text-zinc-400 text-sm">Motorista</label>
        <select
          className="w-full p-3 rounded bg-zinc-800 text-white"
          value={form.motorista_id}
          onChange={e => setForm({ ...form, motorista_id: Number(e.target.value) })}
        >
          <option value="">Selecione um motorista</option>
          {motoristas.map((m: any) => (
            <option key={m.id} value={m.id}>
              {m.nome}
            </option>
          ))}
        </select>
      </div>

      {/* VEÍCULO */}
      <div>
        <label className="text-zinc-400 text-sm">Veículo</label>
        <select
          className="w-full p-3 rounded bg-zinc-800 text-white"
          value={form.veiculo_id}
          onChange={e => setForm({ ...form, veiculo_id: Number(e.target.value) })}
        >
          <option value="">Selecione um veículo</option>
          {veiculos.map((v: any) => (
            <option key={v.id} value={v.id}>
              {v.nome}
            </option>
          ))}
        </select>
      </div>

      {/* DATA SAÍDA */}
      <input
        type="date"
        className="w-full p-3 rounded bg-zinc-800 text-white"
        value={form.data_saida}
        onChange={e => setForm({ ...form, data_saida: e.target.value })}
      />

      {/* STATUS */}
      <select
        className="w-full p-3 rounded bg-zinc-800 text-white"
        value={form.status}
        onChange={e => setForm({ ...form, status: e.target.value })}
      >
        <option value="em andamento">Em andamento</option>
        <option value="concluída">Concluída</option>
        <option value="cancelada">Cancelada</option>
      </select>

      {/* BOTÕES */}
      <div className="flex justify-end gap-2 pt-4">

        <button
          onClick={() => setModalOpen(false)}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-xl"
        >
          Cancelar
        </button>

        <button
          onClick={saveViagem}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl"
        >
          Salvar
        </button>

      </div>

    </div>

  </div>
)}
