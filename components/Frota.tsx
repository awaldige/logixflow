'use client'

import { useEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
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
    ano: 0,
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
        {
          event: '*',
          schema: 'public',
          table: 'veiculos'
        },
        () => {
          fetchData()
        }
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
      ano: 0,
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
    try {

      if (editId) {
        await supabase
          .from('veiculos')
          .update(form)
          .eq('id', editId)
      } else {
        await supabase
          .from('veiculos')
          .insert([form])
      }

      setModalOpen(false)
      resetForm()
      setEditId(null)
      fetchData()

    } catch (error) {
      console.error('Erro ao salvar veículo:', error)
    }
  }

  async function deleteVehicle(id: number) {
    if (!confirm('Deseja excluir este veículo?')) return

    await supabase
      .from('veiculos')
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
            Frota
          </h2>

          <p className="text-zinc-500 mt-1">
            Gerenciamento dos veículos cadastrados.
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
          Novo Veículo
        </button>

      </div>

      {/* LOADING */}
      {loading && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
          Carregando veículos...
        </div>
      )}

      {/* GRID */}
      {!loading && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

          {veiculos.map((veiculo) => (
            <div
              key={veiculo.id}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6"
            >

              <div className="flex items-center justify-between">

                <div>
                  <h3 className="text-xl font-black text-white">
                    {veiculo.placa}
                  </h3>

                  <p className="text-zinc-500 mt-1">
                    {veiculo.modelo}
                  </p>
                </div>

                <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-xl text-sm font-bold">
                  {veiculo.status}
                </span>

              </div>

              <div className="mt-6 space-y-2 text-zinc-400">

                <p>
                  Marca:
                  <span className="text-white ml-2">{veiculo.marca}</span>
                </p>

                <p>
                  Ano:
                  <span className="text-white ml-2">{veiculo.ano}</span>
                </p>

                <p>
                  KM Atual:
                  <span className="text-white ml-2">{veiculo.km_atual}</span>
                </p>

              </div>

              {/* ACTIONS */}
              <div className="flex gap-2 mt-4">

                <button
                  onClick={() => openEdit(veiculo)}
                  className="bg-yellow-600 hover:bg-yellow-500 px-3 py-1 rounded-xl text-sm font-bold"
                >
                  Editar
                </button>

                <button
                  onClick={() => deleteVehicle(veiculo.id)}
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
        {editId ? 'Editar Veículo' : 'Novo Veículo'}
      </h2>

      {/* PLACA */}
      <input
        className="w-full p-3 rounded bg-zinc-800 text-white"
        placeholder="Placa"
        value={form.placa}
        onChange={e => setForm({ ...form, placa: e.target.value })}
      />

      {/* MODELO */}
      <input
        className="w-full p-3 rounded bg-zinc-800 text-white"
        placeholder="Modelo do veículo"
        value={form.modelo}
        onChange={e => setForm({ ...form, modelo: e.target.value })}
      />

      {/* MARCA */}
      <input
        className="w-full p-3 rounded bg-zinc-800 text-white"
        placeholder="Marca (ex: Fiat, Ford...)"
        value={form.marca}
        onChange={e => setForm({ ...form, marca: e.target.value })}
      />
      <input
  className="w-full p-3 rounded bg-zinc-800 text-white"
  placeholder="Tipo do veículo"
  value={form.tipo}
  onChange={e =>
    setForm({
      ...form,
      tipo: e.target.value
    })
  }
/>

     <div className="space-y-1">
  <label className="text-zinc-400 text-sm">
    Ano de fabricação
  </label>

  <input
    className="w-full p-3 rounded bg-zinc-800 text-white"
    placeholder="Ex: 2020"
    value={form.ano}
    onChange={e => setForm({ ...form, ano: Number(e.target.value) })}
  />
</div>

      {/* KM ATUAL */}
      <div className="space-y-1">
  <label className="text-zinc-400 text-sm">
    KM atual do veículo
  </label>

  <input
    className="w-full p-3 rounded bg-zinc-800 text-white"
    placeholder="Ex: 125000"
    value={form.km_atual}
    onChange={e => setForm({ ...form, km_atual: Number(e.target.value) })}
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
          onClick={saveVehicle}
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
