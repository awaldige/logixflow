'use client'

import { useEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
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

export default function Manutencoes() {

  const [manutencoes, setManutencoes] = useState<Manutencao[]>([])
  const [loading, setLoading] = useState(true)

  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)

  const [form, setForm] = useState({
    veiculo_id: 0,
    descricao: '',
    data_manutencao: '',
    custo: 0,
    oficina: '',
    status: 'pendente'
  })

  const isFetchingRef = useRef(false)

  async function fetchData() {

    if (isFetchingRef.current) return
    isFetchingRef.current = true

    try {

      const { data, error } = await supabase
        .from('manutencoes')
        .select('*')
        .order('data_manutencao', { ascending: false })

      if (error) {
        console.error(error)
        return
      }

      setManutencoes(data || [])

    } catch (error) {
      console.error('Erro ao buscar manutenções:', error)
    } finally {
      setLoading(false)
      isFetchingRef.current = false
    }
  }

  useEffect(() => {

    fetchData()

    const channel = supabase
      .channel('manutencoes_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'manutencoes'
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
      veiculo_id: 0,
      descricao: '',
      data_manutencao: '',
      custo: 0,
      oficina: '',
      status: 'pendente'
    })
  }

  function openCreate() {
    setEditId(null)
    resetForm()
    setModalOpen(true)
  }

  function openEdit(item: Manutencao) {
    setEditId(item.id)
    setForm({
      veiculo_id: item.veiculo_id,
      descricao: item.descricao,
      data_manutencao: item.data_manutencao,
      custo: item.custo,
      oficina: item.oficina,
      status: item.status
    })
    setModalOpen(true)
  }

  async function saveManutencao() {

    try {

      if (editId) {
        await supabase
          .from('manutencoes')
          .update(form)
          .eq('id', editId)
      } else {
        await supabase
          .from('manutencoes')
          .insert([form])
      }

      setModalOpen(false)
      setEditId(null)
      resetForm()
      fetchData()

    } catch (error) {
      console.error('Erro ao salvar manutenção:', error)
    }
  }

  async function deleteManutencao(id: number) {

    if (!confirm('Deseja excluir esta manutenção?')) return

    await supabase
      .from('manutencoes')
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
            Manutenções
          </h2>

          <p className="text-zinc-500 mt-1">
            Histórico e custos das manutenções.
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
          Nova Manutenção
        </button>

      </div>

      {/* LOADING */}
      {loading && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
          Carregando manutenções...
        </div>
      )}

      {/* GRID */}
      {!loading && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

          {manutencoes.map((item) => (
            <div
              key={item.id}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6"
            >

              <div className="flex items-center justify-between">

                <div>
                  <h3 className="text-xl font-black text-white">
                    Veículo #{item.veiculo_id}
                  </h3>

                  <p className="text-zinc-500 mt-1">
                    {item.descricao}
                  </p>
                </div>

                <span className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-xl text-sm font-bold">
                  {item.status}
                </span>

              </div>

              <div className="mt-6 space-y-2 text-zinc-400">

                <p>
                  Oficina:
                  <span className="text-white ml-2">{item.oficina}</span>
                </p>

                <p>
                  Data:
                  <span className="text-white ml-2">
                    {new Date(item.data_manutencao).toLocaleDateString('pt-BR')}
                  </span>
                </p>

                <p>
                  Custo:
                  <span className="text-emerald-400 ml-2 font-bold">
                    R$ {item.custo}
                  </span>
                </p>

              </div>

              {/* ACTIONS */}
              <div className="flex gap-2 mt-4">

                <button
                  onClick={() => openEdit(item)}
                  className="bg-yellow-600 hover:bg-yellow-500 px-3 py-1 rounded-xl text-sm font-bold"
                >
                  Editar
                </button>

                <button
                  onClick={() => deleteManutencao(item.id)}
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
              {editId ? 'Editar Manutenção' : 'Nova Manutenção'}
            </h2>

            {/* VEÍCULO */}
            <div className="space-y-1">
              <label className="text-zinc-400 text-sm">
                ID do veículo
              </label>

              <input
                className="w-full p-3 rounded bg-zinc-800 text-white"
                placeholder="Ex: 1"
                type="number"
                value={form.veiculo_id}
                onChange={e => setForm({ ...form, veiculo_id: Number(e.target.value) })}
              />
            </div>

            {/* DESCRIÇÃO */}
            <div className="space-y-1">
              <label className="text-zinc-400 text-sm">
                Descrição da manutenção
              </label>

              <input
                className="w-full p-3 rounded bg-zinc-800 text-white"
                placeholder="Ex: Troca de óleo"
                value={form.descricao}
                onChange={e => setForm({ ...form, descricao: e.target.value })}
              />
            </div>

            {/* DATA */}
            <div className="space-y-1">
              <label className="text-zinc-400 text-sm">
                Data da manutenção
              </label>

              <input
                className="w-full p-3 rounded bg-zinc-800 text-white"
                type="date"
                value={form.data_manutencao}
                onChange={e => setForm({ ...form, data_manutencao: e.target.value })}
              />
            </div>

            {/* OFICINA */}
            <div className="space-y-1">
              <label className="text-zinc-400 text-sm">
                Oficina
              </label>

              <input
                className="w-full p-3 rounded bg-zinc-800 text-white"
                placeholder="Ex: Auto Center Silva"
                value={form.oficina}
                onChange={e => setForm({ ...form, oficina: e.target.value })}
              />
            </div>

            {/* CUSTO */}
            <div className="space-y-1">
              <label className="text-zinc-400 text-sm">
                Custo da manutenção
              </label>

              <input
                className="w-full p-3 rounded bg-zinc-800 text-white"
                placeholder="Ex: 350"
                type="number"
                value={form.custo}
                onChange={e => setForm({ ...form, custo: Number(e.target.value) })}
              />
            </div>

            {/* BOTÕES */}
            <div className="flex justify-end gap-2 pt-4">

              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-xl"
              >
                Cancelar
              </button>

              <button
                onClick={saveManutencao}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl"
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
