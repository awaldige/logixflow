'use client'

import { useEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Abastecimento {
  id: number
  viagem_id: number
  litros: number
  valor_litro: number
  total: number
  local_abastecimento: string
}

export default function Abastecimentos() {

  const [abastecimentos, setAbastecimentos] = useState<Abastecimento[]>([])
  const [loading, setLoading] = useState(true)

  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)

  const [form, setForm] = useState({
    viagem_id: 0,
    litros: 0,
    valor_litro: 0,
    total: 0,
    local_abastecimento: ''
  })

  const isFetchingRef = useRef(false)

  async function fetchData() {

    if (isFetchingRef.current) return
    isFetchingRef.current = true

    try {

      const { data, error } = await supabase
        .from('abastecimentos')
        .select('*')
        .order('id', { ascending: false })

     if (error) {
     console.error('Erro Supabase:', error)
     alert(error.message)
     return
     }

      setAbastecimentos(data || [])

    } catch (error) {
      console.error('Erro ao buscar abastecimentos:', error)
    } finally {
      setLoading(false)
      isFetchingRef.current = false
    }
  }

  useEffect(() => {

    fetchData()

    const channel = supabase
      .channel('abastecimentos_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'abastecimentos'
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
      viagem_id: 0,
      litros: 0,
      valor_litro: 0,
      total:0,
      local_abastecimento: ''
    })
  }

  function openCreate() {
    setEditId(null)
    resetForm()
    setModalOpen(true)
  }

  function openEdit(item: Abastecimento) {
    setEditId(item.id)
    setForm({
      viagem_id: item.viagem_id,
      litros: item.litros,
      valor_litro: item.valor_litro,
      total: item.total,
      local_abastecimento: item.local_abastecimento
    })
    setModalOpen(true)
  }

  async function saveAbastecimento() {

    try {

      if (editId) {
        await supabase
          .from('abastecimentos')
          .update(form)
          .eq('id', editId)
      } else {
        await supabase
          .from('abastecimentos')
          .insert([form])
      }

      setModalOpen(false)
      setEditId(null)
      resetForm()
      fetchData()

    } catch (error) {
      console.error('Erro ao salvar abastecimento:', error)
    }
  }

  async function deleteAbastecimento(id: number) {

    if (!confirm('Deseja excluir este abastecimento?')) return

    await supabase
      .from('abastecimentos')
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
            Abastecimentos
          </h2>

          <p className="text-zinc-500 mt-1">
            Controle dos abastecimentos realizados.
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
          Novo Abastecimento
        </button>

      </div>

      {/* LOADING */}
      {loading && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
          Carregando abastecimentos...
        </div>
      )}

      {/* GRID */}
      {!loading && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

          {abastecimentos.map((item) => (
            <div
              key={item.id}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6"
            >

              <div className="flex items-center justify-between">

                <div>
                  <h3 className="text-xl font-black text-white">
                    Viagem #{item.viagem_id}
                  </h3>

                  <p className="text-zinc-500 mt-1">
                    {item.local_abastecimento}
                  </p>
                </div>

                <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-xl text-sm font-bold">
                  Registrado
                </span>

              </div>

              <div className="mt-6 space-y-2 text-zinc-400">

                <p>
                  Litros:
                  <span className="text-white ml-2">{item.litros} L</span>
                </p>

                <p>
                  Valor/Litro:
                  <span className="text-white ml-2">R$ {item.valor_litro}</span>
                </p>

                <p>
                  Total:
                  <span className="text-emerald-400 ml-2 font-bold">
                    R$ {item.total}
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
                  onClick={() => deleteAbastecimento(item.id)}
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
        {editId ? 'Editar Abastecimento' : 'Novo Abastecimento'}
      </h2>

      {/* VIAGEM */}
      <div className="space-y-1">
        <label className="text-zinc-400 text-sm">
          ID da viagem
        </label>

        <input
          className="w-full p-3 rounded bg-zinc-800 text-white"
          placeholder="Ex: 1"
          type="number"
          value={form.viagem_id}
          onChange={e => setForm({ ...form, viagem_id: Number(e.target.value) })}
        />
      </div>

      {/* LITROS */}
      <div className="space-y-1">
        <label className="text-zinc-400 text-sm">
          Litros abastecidos
        </label>

        <input
          className="w-full p-3 rounded bg-zinc-800 text-white"
          placeholder="Ex: 50"
          type="number"
          value={form.litros}
          onChange={e => setForm({ ...form, litros: Number(e.target.value) })}
        />
      </div>

      {/* VALOR LITRO */}
      <div className="space-y-1">
        <label className="text-zinc-400 text-sm">
          Valor por litro
        </label>

        <input
          className="w-full p-3 rounded bg-zinc-800 text-white"
          placeholder="Ex: 5.89"
          type="number"
          value={form.valor_litro}
          onChange={e => setForm({ ...form, valor_litro: Number(e.target.value) })}
        />
      </div>

      {/* LOCAL */}
      <div className="space-y-1">
        <label className="text-zinc-400 text-sm">
          Local do abastecimento
        </label>

        <input
          className="w-full p-3 rounded bg-zinc-800 text-white"
          placeholder="Ex: Posto Shell - Centro"
          value={form.local_abastecimento}
          onChange={e => setForm({ ...form, local_abastecimento: e.target.value })}
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
          onClick={saveAbastecimento}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl"
        >
          Salvar
        </button>

      </div>

    </div>

  </div>
)}    </div>
  )
}
