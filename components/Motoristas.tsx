'use client'

import { useEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
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
        console.error(error)
        return
      }

      setMotoristas(data || [])

    } catch (error) {
      console.error('Erro ao buscar motoristas:', error)
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
        {
          event: '*',
          schema: 'public',
          table: 'motoristas'
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

      if (editId) {
        await supabase
          .from('motoristas')
          .update(form)
          .eq('id', editId)
      } else {
        await supabase
          .from('motoristas')
          .insert([form])
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

    if (!confirm('Deseja excluir este motorista?')) return

    await supabase
      .from('motoristas')
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
            Motoristas
          </h2>

          <p className="text-zinc-500 mt-1">
            Controle dos motoristas cadastrados.
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
          Novo Motorista
        </button>

      </div>

      {/* LOADING */}
      {loading && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
          Carregando motoristas...
        </div>
      )}

      {/* GRID */}
      {!loading && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

          {motoristas.map((m) => (
            <div
              key={m.id}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6"
            >

              <div className="flex items-center justify-between">

                <div>
                  <h3 className="text-xl font-black text-white">
                    {m.nome}
                  </h3>

                  <p className="text-zinc-500 mt-1">
                    CNH {m.cnh}
                  </p>
                </div>

                <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-xl text-sm font-bold">
                  {m.status}
                </span>

              </div>

              <div className="mt-6 space-y-2 text-zinc-400">

                <p>
                  Categoria:
                  <span className="text-white ml-2">{m.categoria_cnh}</span>
                </p>

                <p>
                  Telefone:
                  <span className="text-white ml-2">{m.telefone}</span>
                </p>

              </div>

              {/* ACTIONS */}
              <div className="flex gap-2 mt-4">

                <button
                  onClick={() => openEdit(m)}
                  className="bg-yellow-600 hover:bg-yellow-500 px-3 py-1 rounded-xl text-sm font-bold"
                >
                  Editar
                </button>

                <button
                  onClick={() => deleteMotorista(m.id)}
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

            <h2 className="text-2xl font-black">
              {editId ? 'Editar Motorista' : 'Novo Motorista'}
            </h2>

            <input
              className="w-full p-3 rounded bg-zinc-800"
              placeholder="Nome"
              value={form.nome}
              onChange={e => setForm({ ...form, nome: e.target.value })}
            />

            <input
              className="w-full p-3 rounded bg-zinc-800"
              placeholder="CNH"
              value={form.cnh}
              onChange={e => setForm({ ...form, cnh: e.target.value })}
            />

            <input
              className="w-full p-3 rounded bg-zinc-800"
              placeholder="Categoria CNH"
              value={form.categoria_cnh}
              onChange={e => setForm({ ...form, categoria_cnh: e.target.value })}
            />

            <input
              className="w-full p-3 rounded bg-zinc-800"
              placeholder="Telefone"
              value={form.telefone}
              onChange={e => setForm({ ...form, telefone: e.target.value })}
            />

            <div className="flex justify-end gap-2 pt-4">

              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 bg-gray-600 rounded-xl"
              >
                Cancelar
              </button>

              <button
                onClick={saveMotorista}
                className="px-4 py-2 bg-blue-600 rounded-xl"
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