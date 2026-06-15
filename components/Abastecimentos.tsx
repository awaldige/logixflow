'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Plus, Fuel, Gauge, User, Trash2, X } from 'lucide-react'
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

  // 2. BUSCA DE ABASTECIMENTOS COM RELACIONAMENTO (CORRIGIDO: origem)
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

  // 4. SALVAMENTO ADAPTADO
  async function saveAbastecimento() {
    if (!form.viagem_id) return alert('Selecione uma viagem vinculada.')
    if (!form.litros || !form.valor_litro) return alert('Preencha os valores de litros e preço.')

    try {
      const payload = {
        viagem_id: Number(form.viagem_id),
        litros: Number(form.litros),
        valor_litro: Number(form.valor_litro),
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
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto text-white">
      
      {/* HEADER RESPONSIVO */}
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight truncate">Abastecimentos</h2>
          <p className="text-zinc-500 text-xs md:text-sm mt-1 truncate">Controle dos abastecimentos realizados.</p>
        </div>
        <button 
          onClick={openCreate} 
          className="bg-blue-600 hover:bg-blue-500 transition px-4 py-2.5 md:px-5 md:py-3 rounded-xl md:rounded-2xl font-bold flex items-center gap-2 flex-shrink-0 text-xs md:text-sm shadow-lg shadow-blue-600/10"
        >
          <Plus size={16} /> 
          <span className="hidden sm:inline">Novo Abastecimento</span>
        </button>
      </div>

      {loading && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl md:rounded-3xl p-8 text-zinc-400 animate-pulse">
          Carregando abastecimentos...
        </div>
      )}

      {/* GRID DE CARDS RESPONSIVO */}
      {!loading && (
        <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {abastecimentos.map((item) => (
            <div key={item.id} className="bg-zinc-900 border border-zinc-800/80 rounded-2xl md:rounded-3xl p-5 md:p-6 flex flex-col justify-between hover:border-zinc-700 transition duration-300 shadow-xl min-w-0">
              <div>
                <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3 mb-4 gap-2">
                  <span className="text-zinc-500 font-bold text-xs md:text-sm">Cupom #{item.id}</span>
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 md:px-3 md:py-1 rounded-lg md:rounded-xl text-[10px] md:text-xs font-black uppercase tracking-wider flex-shrink-0">
                    Viagem #{item.viagem_id}
                  </span>
                </div>

                {/* Localização e Posto */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-start gap-2 min-w-0">
                    <Fuel size={16} className="text-blue-500 mt-1 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] md:text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Estabelecimento</p>
                      <p className="text-white font-bold text-sm md:text-base truncate" title={item.local_abastecimento}>
                        {item.local_abastecimento}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Informações Cruzadas */}
                <div className="bg-zinc-950/40 rounded-xl md:rounded-2xl p-3 md:p-4 space-y-2 text-xs md:text-sm text-zinc-400 border border-zinc-800/40">
                  <p className="flex justify-between items-center gap-2 min-w-0">
                    <span className="flex items-center gap-1.5 text-zinc-500 text-xs font-medium flex-shrink-0"><User size={13} /> Motorista:</span>
                    <span className="text-white font-semibold truncate text-right flex-1" title={getMotoristaInfo(item)}>{getMotoristaInfo(item)}</span>
                  </p>
                  <p className="flex justify-between items-center gap-2 min-w-0">
                    <span className="flex items-center gap-1.5 text-zinc-500 text-xs font-medium flex-shrink-0"><Gauge size={13} /> Veículo:</span>
                    <span className="text-white font-semibold truncate text-right flex-1" title={getVeiculoInfo(item)}>{getVeiculoInfo(item)}</span>
                  </p>
                  <hr className="border-zinc-800/40 my-1" />
                  <p className="flex justify-between text-xs md:text-sm">
                    <span className="text-zinc-500 font-medium">Litros:</span> 
                    <span className="text-white font-semibold font-mono">{item.litros} L</span>
                  </p>
                  <p className="flex justify-between text-xs md:text-sm">
                    <span className="text-zinc-500 font-medium">Preço/Litro:</span> 
                    <span className="text-white font-semibold font-mono">R$ {Number(item.valor_litro).toFixed(2)}</span>
                  </p>
                  <p className="flex justify-between items-center pt-1.5 border-t border-zinc-800/40 gap-2">
                    <span className="text-[10px] md:text-xs font-bold uppercase text-zinc-500">Valor Total:</span> 
                    <span className="text-emerald-400 font-black text-sm md:text-base font-mono">
                      R$ {Number(item.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </p>
                </div>
              </div>

              {/* AÇÕES DE EXCLUSÃO/EDIÇÃO */}
              <div className="flex gap-2 mt-5 md:mt-6">
                <button onClick={() => openEdit(item)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 md:py-2.5 rounded-xl text-xs font-bold transition flex-1">
                  Editar
                </button>
                <button onClick={() => deleteAbastecimento(item.id)} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/10 px-3 py-2 md:py-2.5 rounded-xl text-xs font-bold transition flex-shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL RESPONSIVO */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-zinc-950 border border-zinc-800/80 p-5 sm:p-8 rounded-2xl sm:rounded-3xl w-full max-w-xl space-y-5 relative text-zinc-300 max-h-[calc(100vh-2rem)] overflow-y-auto">
            
            <button 
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition p-1"
            >
              <X size={20} />
            </button>

            <div className="border-b border-zinc-800/60 pb-3">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {editId ? '🛠️ Editar Abastecimento' : '⛽ Novo Abastecimento'}
              </h2>
              <p className="text-xs text-zinc-500 mt-1">Insira os dados do cupom fiscal para auditoria de frota.</p>
            </div>

            <div className="space-y-4">
              
              {/* SELEÇÃO DINÂMICA DE VIAGEM */}
              <div className="space-y-1.5">
                <label className="text-zinc-400 text-[11px] sm:text-xs font-bold uppercase tracking-wider">Vincular à Viagem Ativa *</label>
                <select 
                  className="w-full p-3 rounded-xl bg-zinc-900 text-white border border-zinc-800 focus:outline-none focus:border-blue-500 text-xs sm:text-sm font-medium transition"
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-zinc-400 text-[11px] sm:text-xs font-bold uppercase tracking-wider">Data e Hora *</label>
                  <input
                    type="datetime-local"
                    className="w-full p-3 rounded-xl bg-zinc-900 text-white border border-zinc-800 focus:outline-none focus:border-blue-500 text-xs sm:text-sm font-mono transition"
                    value={form.created_at}
                    onChange={e => setForm({ ...form, created_at: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-zinc-400 text-[11px] sm:text-xs font-bold uppercase tracking-wider">Hodômetro Atual (KM) *</label>
                  <input
                    type="number"
                    placeholder="Ex: 145200"
                    className="w-full p-3 rounded-xl bg-zinc-900 text-white border border-zinc-800 focus:outline-none focus:border-blue-500 text-xs sm:text-sm font-mono transition"
                    value={form.quilometragem || ''}
                    onChange={e => setForm({ ...form, quilometragem: Number(e.target.value) })}
                  />
                </div>
              </div>

              {/* TIPO DE COMBUSTÍVEL */}
              <div className="space-y-1.5">
                <label className="text-zinc-400 text-[11px] sm:text-xs font-bold uppercase tracking-wider">Tipo de Combustível *</label>
                <select 
                  className="w-full p-3 rounded-xl bg-zinc-900 text-white border border-zinc-800 focus:outline-none focus:border-blue-500 text-xs sm:text-sm font-medium transition"
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-zinc-400 text-[11px] sm:text-xs font-bold uppercase tracking-wider">Qtd. Abastecida (Litros) *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ex: 50.00"
                    className="w-full p-3 rounded-xl bg-zinc-900 text-white border border-zinc-800 focus:outline-none focus:border-blue-500 text-xs sm:text-sm font-mono transition"
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
                <div className="space-y-1.5">
                  <label className="text-zinc-400 text-[11px] sm:text-xs font-bold uppercase tracking-wider">Valor Unitário (por Litro) *</label>
                  <input
                    type="number"
                    step="0.001"
                    placeholder="Ex: 5.89"
                    className="w-full p-3 rounded-xl bg-zinc-900 text-white border border-zinc-800 focus:outline-none focus:border-blue-500 text-xs sm:text-sm font-mono transition"
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
              <div className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Custo Total da Operação</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">(Multiplicação automática de Litros × Preço)</p>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-xs text-emerald-500 font-bold mr-1">R$</span>
                  <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
                    {form.total ? Number(form.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
                  </span>
                </div>
              </div>

              {/* POSTO DE COMBUSTÍVEL */}
              <div className="space-y-1.5">
                <label className="text-zinc-400 text-[11px] sm:text-xs font-bold uppercase tracking-wider">Posto de Combustível *</label>
                <input
                  type="text"
                  className="w-full p-3 rounded-xl bg-zinc-900 text-white border border-zinc-800 focus:outline-none focus:border-blue-500 text-xs sm:text-sm font-medium transition"
                  placeholder="Ex: Posto Ipiranga - Av. Paulista, 1500"
                  value={form.local_abastecimento || ''}
                  onChange={e => setForm({ ...form, local_abastecimento: e.target.value })}
                />
              </div>

            </div>

            {/* BOTÕES DE AÇÃO DO FORMULÁRIO */}
            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-900/60">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-white rounded-xl font-medium transition text-xs sm:text-sm"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveAbastecimento}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition text-xs sm:text-sm shadow-lg shadow-blue-600/10"
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
