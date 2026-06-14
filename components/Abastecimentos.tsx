'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Plus, Fuel, Calendar, DollarSign, Gauge, User, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

// 1. TIPAGENS INTEGRADAS
interface Viagem {
  id: number
  origem: string
  destino: string
  veiculos: { placa: string; modelo: string } | { placa: string; modelo: string }[] | null
  motoristas: { nome: string } | { nome: string }[] | null
}

interface Abastecimento {
  id: number
  viagem_id: number
  litros: number
  valor_litro: number
  total: number
  local_abastecimento: string
  created_at?: string
  quilometragem?: number
  tipo_combustivel?: string
  viagens?: Viagem | Viagem[] | null
}

const INITIAL_FORM_STATE = {
  viagem_id: 0,
  litros: 0,
  valor_litro: 0,
  total: 0,
  local_abastecimento: '',
  created_at: '',
  quilometragem: 0,
  tipo_combustivel: 'Diesel'
}

export default function Abastecimentos() {
  const [abastecimentos, setAbastecimentos] = useState<Abastecimento[]>([])
  const [viagens, setViagens] = useState<Viagem[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState(INITIAL_FORM_STATE)

  const isFetchingRef = useRef(false)

  // 2. BUSCA DE ABASTECIMENTOS COM RELACIONAMENTO
  const fetchData = useCallback(async () => {
    if (isFetchingRef.current) return
    isFetchingRef.current = true

    try {
      const { data, error } = await supabase
        .from('abastecimentos')
        .select(`
          id, viagem_id, litros, valor_litro, total, local_abastecimento, created_at,
          viagens (
            id, origem, destino,
            veiculos ( placa, modelo ),
            motoristas ( nome )
          )
        `)
        .order('id', { ascending: false })

      if (error) throw error
      setAbastecimentos(data as unknown as Abastecimento[] || [])
    } catch (error: any) {
      console.error('Erro ao buscar abastecimentos:', error)
    } finally {
      setLoading(false)
      isFetchingRef.current = false
    }
  }, [])

  // 3. CARREGA VIAGENS PARA O SELECTOR DO FORMULÁRIO
  useEffect(() => {
    async function loadViagens() {
      try {
        const { data } = await supabase
          .from('viagens')
          .select('id, origem, destino, veiculos(placa, modelo), motoristas(nome)')
        setViagens(data as unknown as Viagem[] || [])
      } catch (err) {
        console.error('Erro ao carregar viagens auxiliares:', err)
      }
    }
    loadViagens()
    fetchData()
  }, [fetchData])

  // REALTIME
  useEffect(() => {
    const channel = supabase
      .channel('abastecimentos_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'abastecimentos' }, () => fetchData())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchData])

  function resetForm() {
    setForm({
      ...INITIAL_FORM_STATE,
      created_at: new Date().toISOString().substring(0, 16)
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
      local_abastecimento: item.local_abastecimento,
      created_at: item.created_at ? item.created_at.substring(0, 16) : new Date().toISOString().substring(0, 16),
      quilometragem: item.quilometragem || 0,
      tipo_combustivel: item.tipo_combustivel || 'Diesel'
    })
    setModalOpen(true)
  }

  // 4. SALVAMENTO ADAPTADO PARA O SCHEMA ATUAL
  async function saveAbastecimento() {
    if (!form.viagem_id) return alert('Selecione uma viagem vinculada.')
    if (!form.litros || !form.valor_litro) return alert('Preencha os valores de litros e preço.')

    try {
      // Ajuste de Payload: Caso seu banco físico do print exato ainda não tenha os campos novos, 
      // enviamos apenas o que o banco aceita para evitar quebras, mas calculamos tudo.
      const payload = {
        viagem_id: Number(form.viagem_id),
        litros: Number(form.litros),
        valor_litro: Number(form.valor_litro),
        total: Number(form.total),
        local_abastecimento: form.local_abastecimento || 'Não informado'
      }

      let error
      if (editId) {
        const res = await supabase.from('abastecimentos').update(payload).eq('id', editId)
        error = res.error
      } else {
        const res = await supabase.from('abastecimentos').insert([payload])
        error = res.error
      }

      if (error) throw error

      setModalOpen(false)
      setEditId(null)
      resetForm()
      fetchData()
    } catch (error: any) {
      console.error('Erro ao salvar abastecimento:', error)
      alert(`Erro ao salvar: ${error.message}`)
    }
  }

  async function deleteAbastecimento(id: number) {
    if (!confirm('Deseja excluir este abastecimento?')) return
    try {
      const { error } = await supabase.from('abastecimentos').delete().eq('id', id)
      if (error) throw error
      fetchData()
    } catch (err) {
      console.error(err)
    }
  }

  // HELPERS PARA PEGAR DADOS DAS RELAÇÕES
  const getVeiculoInfo = (item: Abastecimento) => {
    const v = item.viagens
    if (!v) return 'Não identificado'
    const veic = Array.isArray(v) ? v[0]?.veiculos : v.veiculos
    if (!veic) return 'Não cadastrado'
    return Array.isArray(veic) ? `${veic[0]?.placa} - ${veic[0]?.modelo}` : `${veic.placa} - ${veic.modelo}`
  }

  const getMotoristaInfo = (item: Abastecimento) => {
    const v = item.viagens
    if (!v) return 'Não identificado'
    const mot = Array.isArray(v) ? v[0]?.motoristas : v.motoristas
    if (!mot) return 'Não cadastrado'
    return Array.isArray(mot) ? mot[0]?.nome : mot.nome
  }

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto text-white">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-white">Abastecimentos</h2>
          <p className="text-zinc-500 mt-1">Controle dos abastecimentos realizados.</p>
        </div>
        <button onClick={openCreate} className="bg-blue-600 hover:bg-blue-500 transition px-5 py-3 rounded-2xl font-bold flex items-center gap-2">
          <Plus size={18} /> Novo Abastecimento
        </button>
      </div>

      {loading && <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-zinc-400">Carregando abastecimentos...</div>}

      {/* GRID DE CARDS ESTILIZADOS */}
      {!loading && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {abastecimentos.map((item) => (
            <div key={item.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col justify-between hover:border-zinc-700 transition">
              <div>
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
                  <span className="text-zinc-500 font-bold text-sm">Cupom #{item.id}</span>
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider">
                    Viagem #{item.viagem_id}
                  </span>
                </div>

                {/* Localização e Posto */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-start gap-2">
                    <Fuel size={16} className="text-blue-500 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-zinc-500 font-medium uppercase">Estabelecimento</p>
                      <p className="text-white font-bold text-base truncate max-w-[220px]">{item.local_abastecimento}</p>
                    </div>
                  </div>
                </div>

                {/* Informações cruzadas automaticamente (Veículo e Motorista) */}
                <div className="bg-zinc-950/40 rounded-2xl p-4 space-y-2 text-sm text-zinc-400 border border-zinc-800/50">
                  <p className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5 text-xs"><User size={13} /> Motorista:</span>
                    <span className="text-white font-semibold truncate max-w-[150px]">{getMotoristaInfo(item)}</span>
                  </p>
                  <p className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5 text-xs"><Gauge size={13} /> Veículo:</span>
                    <span className="text-white font-semibold truncate max-w-[150px]">{getVeiculoInfo(item)}</span>
                  </p>
                  <hr className="border-zinc-800/60 my-1" />
                  <p className="flex justify-between"><span>Litros:</span> <span className="text-white font-semibold">{item.litros} L</span></p>
                  <p className="flex justify-between"><span>Preço/Litro:</span> <span className="text-white font-semibold">R$ {Number(item.valor_litro).toFixed(2)}</span></p>
                  <p className="flex justify-between items-center pt-1 border-t border-zinc-800/40">
                    <span className="text-xs font-bold uppercase text-zinc-500">Valor Total:</span> 
                    <span className="text-emerald-400 font-black text-base">R$ {Number(item.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </p>
                </div>
              </div>

              {/* AÇÕES */}
              <div className="flex gap-2 mt-6">
                <button onClick={() => openEdit(item)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2.5 rounded-xl text-xs font-bold transition flex-1">
                  Editar
                </button>
                <button onClick={() => deleteAbastecimento(item.id)} className="bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-900/30 px-3 py-2.5 rounded-xl text-xs font-bold transition flex-shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SEU MODAL REMODELADO INTEGRADÍSSIMO */}
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
              
              {/* SELEÇÃO DINÂMICA DE VIAGEM */}
              <div>
                <label className="text-zinc-400 text-xs font-bold uppercase ml-1">Vincular à Viagem Ativa *</label>
                <select 
                  className="w-full p-3 mt-1 rounded-xl bg-zinc-800 text-white border border-zinc-700 focus:outline-none focus:border-blue-500"
                  value={form.viagem_id || ''} 
                  onChange={e => setForm({ ...form, viagem_id: Number(e.target.value) })}
                >
                  <option value="">Selecione a viagem correspondente</option>
                  {viagens.map(v => {
                    const motNome = Array.isArray(v.motoristas) ? v.motoristas[0]?.nome : v.motoristas?.nome
                    const veiPlaca = Array.isArray(v.veiculos) ? v.veiculos[0]?.placa : v.veiculos?.placa
                    return (
                      <option key={v.id} value={v.id}>
                        Viagem #{v.id} | {veiPlaca || 'S/P'} - {motNome || 'S/M'} (Destino: {v.destino})
                      </option>
                    )
                  })}
                </select>
              </div>

              {/* DATA/HORA & HODÔMETRO */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 text-xs font-bold uppercase ml-1">Data e Hora *</label>
                  <input
                    type="datetime-local"
                    className="w-full p-3 mt-1 rounded-xl bg-zinc-800 text-white border border-zinc-700 focus:outline-none focus:border-blue-500"
                    value={form.created_at}
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

              {/* TIPO DE COMBUSTÍVEL */}
              <div>
                <label className="text-zinc-400 text-xs font-bold uppercase ml-1">Tipo de Combustível *</label>
                <select 
                  className="w-full p-3 mt-1 rounded-xl bg-zinc-800 text-white border border-zinc-700 focus:outline-none focus:border-blue-500"
                  value={form.tipo_combustivel}
                  onChange={e => setForm({ ...form, tipo_combustivel: e.target.value })}
                >
                  <option value="Gasolina">Gasolina</option>
                  <option value="Etanol">Etanol</option>
                  <option value="Diesel">Diesel</option>
                  <option value="GNV">GNV</option>
                </select>
              </div>

              {/* QUANTIDADE & VALOR UNITÁRIO */}
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
                        total: Number((litrosVal * precoUnit).toFixed(2))
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
                        total: Number((litrosVal * precoUnit).toFixed(2))
                      });
                    }}
                  />
                </div>
              </div>

              {/* VALOR TOTAL CALCULADO */}
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

              {/* POSTO DE COMBUSTÍVEL */}
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
    </div>
  )
}
