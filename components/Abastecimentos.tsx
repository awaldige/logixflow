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
     
    {/* MODAL REMODELADO */}
    {modalOpen && (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl w-full max-w-xl space-y-4 my-auto text-zinc-300">
          
          <div className="border-b border-zinc-800 pb-3">
            <h2 className="text-2xl font-black text-white">
              {editId ? '🛠️ Editar Abastecimento' : '⛽ Novo Abastecimento'}
            </h2>
            <p className="text-xs text-zinc-500 mt-1">Insira os dados do cupom fiscal para auditoria de frota.</p>
          </div>

          <div className="space-y-4">
            
            {/* SELEÇÃO DE VIAGEM (Traz veículo e motorista juntos) */}
            <div>
              <label className="text-zinc-400 text-xs font-bold uppercase ml-1">Vincular à Viagem Ativa *</label>
              <select 
                className="w-full p-3 mt-1 rounded-xl bg-zinc-800 text-white border border-zinc-700 focus:outline-none focus:border-blue-500"
                value={form.viagem_id || ''} 
                onChange={e => {
                  const vId = Number(e.target.value);
                  // Aqui você pode buscar a viagem na sua lista para preencher motorista/veículo na tela se quiser
                  setForm({ ...form, viagem_id: vId });
                }}
              >
                <option value="">Selecione a viagem correspondente</option>
                {/* Mapeie suas viagens aqui dentro. Exemplo: */}
                {/* viagens.map(v => (
                  <option key={v.id} value={v.id}>
                    Viagem #{v.id} | {v.veiculos?.placa} - {v.motoristas?.nome} ({v.destino})
                  </option>
                )) */}
                <option value="1">Viagem #1 | ABC-1234 - João Silva (Rota: SP)</option> {/* Temporário para testes */}
              </select>
            </div>

            {/* LINHA 1: DATA/HORA & HODÔMETRO */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-zinc-400 text-xs font-bold uppercase ml-1">Data e Hora *</label>
                <input
                  type="datetime-local"
                  className="w-full p-3 mt-1 rounded-xl bg-zinc-800 text-white border border-zinc-700 focus:outline-none focus:border-blue-500"
                  value={form.created_at || new Date().toISOString().substring(0, 16)}
                  onChange={e => setForm({ ...form, created_at: e.target.value })}
                />
              </div>
              <div>
                <label className="text-zinc-400 text-xs font-bold uppercase ml-1">Hodômetro Atual (KM) *</label>
                <input
                  type="number"
                  placeholder="Ex: 145200"
                  className="w-full p-3 mt-1 rounded-xl bg-zinc-800 text-white border border-zinc-700 focus:outline-none focus:border-blue-500"
                  value={form.quilometragem || ''}
                  onChange={e => setForm({ ...form, quilometragem: Number(e.target.value) })}
                />
              </div>
            </div>

            {/* LINHA 2: TIPO DE COMBUSTÍVEL */}
            <div>
              <label className="text-zinc-400 text-xs font-bold uppercase ml-1">Tipo de Combustível *</label>
              <select 
                className="w-full p-3 mt-1 rounded-xl bg-zinc-800 text-white border border-zinc-700 focus:outline-none focus:border-blue-500"
                value={form.tipo_combustivel || 'Diesel'}
                onChange={e => setForm({ ...form, tipo_combustivel: e.target.value })}
              >
                <option value="Gasolina">Gasolina</option>
                <option value="Etanol">Etanol</option>
                <option value="Diesel">Diesel</option>
                <option value="GNV">GNV</option>
              </select>
            </div>

            {/* LINHA 3: QUANTIDADE & VALOR UNITÁRIO */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-zinc-400 text-xs font-bold uppercase ml-1">Qtd. Abastecida (Litros) *</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 50.00"
                  className="w-full p-3 mt-1 rounded-xl bg-zinc-800 text-white border border-zinc-700 focus:outline-none focus:border-blue-500"
                  value={form.litros || ''}
                  onChange={e => {
                    const litrosVal = Number(e.target.value);
                    const precoUnit = Number(form.valor_litro || 0);
                    setForm({ 
                      ...form, 
                      litros: litrosVal,
                      total: Number((litrosVal * precoUnit).toFixed(2)) // Cálculo automático do Total
                    });
                  }}
                />
              </div>
              <div>
                <label className="text-zinc-400 text-xs font-bold uppercase ml-1">Valor Unitário (por Litro) *</label>
                <input
                  type="number"
                  step="0.001"
                  placeholder="Ex: 5.89"
                  className="w-full p-3 mt-1 rounded-xl bg-zinc-800 text-white border border-zinc-700 focus:outline-none focus:border-blue-500"
                  value={form.valor_litro || ''}
                  onChange={e => {
                    const precoUnit = Number(e.target.value);
                    const litrosVal = Number(form.litros || 0);
                    setForm({ 
                      ...form, 
                      valor_litro: precoUnit,
                      total: Number((litrosVal * precoUnit).toFixed(2)) // Cálculo automático do Total
                    });
                  }}
                />
              </div>
            </div>

            {/* LINHA 4: VALOR TOTAL (CALCULADO AUTOMATICAMENTE) */}
            <div className="bg-zinc-950/50 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-500 font-bold uppercase">Custo Total da Operação</p>
                <p className="text-xs text-zinc-400 mt-0.5">(Multiplicação automática de Litros × Valor por litro)</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-emerald-500 font-bold mr-1">R$</span>
                <span className="text-2xl font-black text-emerald-400">
                  {form.total ? Number(form.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
                </span>
              </div>
            </div>

            {/* LINHA 5: POSTO DE COMBUSTÍVEL */}
            <div>
              <label className="text-zinc-400 text-xs font-bold uppercase ml-1">Posto de Combustível (Nome/Bandeira) *</label>
              <input
                type="text"
                className="w-full p-3 mt-1 rounded-xl bg-zinc-800 text-white border border-zinc-700 focus:outline-none focus:border-blue-500"
                placeholder="Ex: Posto Ipiranga - Av. Paulista, 1500"
                value={form.local_abastecimento || ''}
                onChange={e => setForm({ ...form, local_abastecimento: e.target.value })}
              />
            </div>

          </div>

          {/* BOTÕES DE AÇÃO */}
          <div className="flex justify-end gap-2 pt-4 border-t border-zinc-800">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-medium transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={saveAbastecimento}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition"
            >
              Confirmar e Salvar
            </button>
          </div>

        </div>
      </div>
    )}
