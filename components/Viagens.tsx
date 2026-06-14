'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Plus, CheckCircle, Navigation, MapPin } from 'lucide-react'
import { supabase } from '@/lib/supabase'

// 1. TIPAGENS
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
  motoristas: { nome: string } | { nome: string }[] | null
  veiculos: { placa: string; modelo: string } | { placa: string; modelo: string }[] | null
}

interface Motorista {
  id: number
  nome: string
}

interface Veiculo {
  id: number
  placa: string
  modelo: string
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

  // 2. BUSCA DE DADOS
  const fetchData = useCallback(async () => {
    if (isFetchingRef.current) return
    isFetchingRef.current = true

    try {
      const { data, error } = await supabase
        .from("viagens")
        .select(`
          id, origem, destino, veiculo_id, motorista_id,
          data_saida, data_retorno, status, km_inicial, km_final,
          motoristas ( nome ), veiculos ( placa, modelo )
        `)
        .order("data_saida", { ascending: false })

      if (error) throw error
      setViagens((data as unknown as Viagem[]) || [])
    } catch (error) {
      console.error('Erro ao buscar viagens:', error)
      alert('Não foi possível carregar as viagens.')
    } finally {
      setLoading(false)
      isFetchingRef.current = false
    }
  }, [])

  useEffect(() => {
    async function loadAuxiliaryData() {
      try {
        const [motoristasRes, veiculosRes] = await Promise.all([
          supabase.from('motoristas').select('id, nome'),
          supabase.from('veiculos').select('id, placa, modelo')
        ])
        setMotoristas(motoristasRes.data || [])
        setVeiculos(veiculosRes.data || [])
      } catch (error) {
        console.error('Erro ao carregar dados auxiliares:', error)
      }
    }
    loadAuxiliaryData()
  }, [])

  useEffect(() => {
    fetchData()
    const channel = supabase
      .channel('viagens_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'viagens' }, () => { fetchData() })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchData])

  // 3. FUNÇÃO PARA CONCLUIR A VIAGEM
  async function concluirViagem(id: number) {
    const kmFinalStr = prompt('Digite o KM Final para concluir a viagem:')
    if (kmFinalStr === null) return // Cancelou o prompt
    
    const kmFinal = Number(kmFinalStr)
    if (isNaN(kmFinal) || kmFinal <= 0) {
      return alert('Por favor, informe um KM final válido e maior que zero.')
    }

    try {
      const hoje = new Date().toISOString().substring(0, 10) // Pega a data atual (AAAA-MM-DD)

      const { error } = await supabase
        .from('viagens')
        .update({
          status: 'concluída',
          km_final: kmFinal,
          data_retorno: hoje
        })
        .eq('id', id)

      if (error) throw error
      
      alert('Viagem concluída com sucesso!')
      fetchData()
    } catch (error) {
      console.error('Erro ao concluir viagem:', error)
      alert('Não foi possível concluir a viagem.')
    }
  }

  // CRUDS E AUXILIARES
  function resetForm() { setForm(INITIAL_FORM_STATE) }
  function openCreate() { setEditId(null); resetForm(); setModalOpen(true); }
  
  function openEdit(v: Viagem) {
    setEditId(v.id)
    setForm({
      origem: v.origem,
      destino: v.destino,
      veiculo_id: v.veiculo_id || 0,
      motorista_id: v.motorista_id || 0,
      data_saida: v.data_saida ? v.data_saida.substring(0, 10) : '',
      data_retorno: v.data_retorno ? v.data_retorno.substring(0, 10) : '',
      status: v.status,
      km_inicial: v.km_inicial,
      km_final: v.km_final || 0
    })
    setModalOpen(true)
  }

  async function saveViagem() {
    try {
      const payload = {
        origem: form.origem,
        destino: form.destino,
        motorista_id: form.motorista_id || null,
        veiculo_id: form.veiculo_id || null,
        data_saida: form.data_saida,
        data_retorno: form.data_retorno || null,
        status: form.status,
        km_inicial: Number(form.km_inicial) || 0,
        km_final: form.km_final ? Number(form.km_final) : null
      }
      let error
      if (editId) {
        const res = await supabase.from('viagens').update(payload).eq('id', editId)
        error = res.error
      } else {
        const res = await supabase.from('viagens').insert([payload])
        error = res.error
      }
      if (error) throw error
      setModalOpen(false)
      resetForm()
      fetchData()
    } catch (error) {
      console.error(error)
    }
  }

  async function deleteViagem(id: number) {
    if (!confirm('Deseja excluir esta viagem?')) return
    try {
      await supabase.from('viagens').delete().eq('id', id)
      fetchData()
    } catch (error) { console.error(error) }
  }

  const getMotoristaNome = (v: Viagem) => {
    if (!v.motoristas) return 'Não informado'
    if (Array.isArray(v.motoristas)) return v.motoristas[0]?.nome || 'Não informado'
    return v.motoristas.nome
  }

  const getVeiculoTexto = (v: Viagem) => {
    if (!v.veiculos) return 'Não informado'
    if (Array.isArray(v.veiculos)) {
      const target = v.veiculos[0]
      return target ? `${target.placa} - ${target.modelo}` : 'Não informado'
    }
    return `${v.veiculos.placa} - ${v.veiculos.modelo}`
  }

  const formatarData = (dataStr: string | null) => {
    if (!dataStr) return 'Não cadastrada'
    const apenasData = dataStr.includes('T') ? dataStr.split('T')[0] : dataStr
    const partes = apenasData.trim().split(' ')[0].split('-')
    return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : new Date(dataStr).toLocaleDateString('pt-BR')
  }

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto text-white">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-white">Viagens</h2>
          <p className="text-zinc-500 mt-1">Controle das viagens em andamento.</p>
        </div>
        <button onClick={openCreate} className="bg-blue-600 hover:bg-blue-500 transition px-5 py-3 rounded-2xl font-bold flex items-center gap-2">
          <Plus size={18} /> Nova Viagem
        </button>
      </div>

      {loading && <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-zinc-400">Carregando viagens...</div>}

      {/* GRID DE CARDS MELHORADO */}
      {!loading && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {viagens.map((v) => (
            <div key={v.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col justify-between hover:border-zinc-700 transition duration-200">
              <div>
                {/* ID da Viagem e Badge de Status lado a lado no topo */}
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
                  <span className="text-zinc-500 font-bold text-sm">Viagem #{v.id}</span>
                  <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider ${
                    v.status === 'em andamento' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                    v.status === 'concluída' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    'bg-zinc-800 text-zinc-400'
                  }`}>
                    {v.status}
                  </span>
                </div>

                {/* Origem e Destino empilhados e organizados */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-start gap-2">
                    <Navigation size={16} className="text-blue-500 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-zinc-500 font-medium uppercase">Origem</p>
                      <p className="text-white font-bold text-base truncate">{v.origem}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <MapPin size={16} className="text-red-500 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-zinc-500 font-medium uppercase">Destino</p>
                      <p className="text-white font-bold text-base truncate">{v.destino}</p>
                    </div>
                  </div>
                </div>

                {/* Informações Auxiliares */}
                <div className="bg-zinc-950/40 rounded-2xl p-4 space-y-2 text-sm text-zinc-400 border border-zinc-800/50">
                  <p className="flex justify-between"><span>Motorista:</span> <span className="text-white font-semibold">{getMotoristaNome(v)}</span></p>
                  <p className="flex justify-between"><span>Veículo:</span> <span className="text-white font-semibold truncate max-w-[180px]">{getVeiculoTexto(v)}</span></p>
                  <p className="flex justify-between"><span>KM Inicial:</span> <span className="text-white font-semibold">{v.km_inicial} km</span></p>
                  {v.km_final && <p className="flex justify-between"><span>KM Final:</span> <span className="text-emerald-400 font-semibold">{v.km_final} km</span></p>}
                  <p className="flex justify-between"><span>Saída:</span> <span className="text-white font-semibold">{formatarData(v.data_saida)}</span></p>
                  {v.data_retorno && <p className="flex justify-between"><span>Retorno:</span> <span className="text-white font-semibold">{formatarData(v.data_retorno)}</span></p>}
                </div>
              </div>

              {/* LISTA DE AÇÕES */}
              <div className="space-y-2 mt-6">
                {/* Botão Dinâmico de Concluir Viagem */}
                {v.status === 'em andamento' && (
                  <button
                    onClick={() => concluirViagem(v.id)}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl text-sm font-black transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20"
                  >
                    <CheckCircle size={16} />
                    Concluir Viagem
                  </button>
                )}

                <div className="flex gap-2">
                  <button onClick={() => openEdit(v)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2.5 rounded-xl text-xs font-bold transition flex-1">
                    Editar
                  </button>
                  <button onClick={() => deleteViagem(v.id)} className="bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-900/30 px-4 py-2.5 rounded-xl text-xs font-bold transition flex-1">
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL (O código do modal permanece igual) */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
          {/* ... conteúdo do modal permanece intacto ... */}
          <div className="bg-zinc-900 p-6 rounded-3xl w-full max-w-xl space-y-4 border border-zinc-800 text-zinc-300">
             <h2 className="text-2xl font-black text-white">{editId ? 'Editar Viagem' : 'Nova Viagem'}</h2>
             <div className="space-y-3">
               <input className="w-full p-3 rounded-xl bg-zinc-800 text-white border border-zinc-700" placeholder="Origem *" value={form.origem} onChange={e => setForm({ ...form, origem: e.target.value })} />
               <input className="w-full p-3 rounded-xl bg-zinc-800 text-white border border-zinc-700" placeholder="Destino *" value={form.destino} onChange={e => setForm({ ...form, destino: e.target.value })} />
               <div>
                 <label className="text-zinc-400 text-xs ml-1">Motorista</label>
                 <select className="w-full p-3 rounded-xl bg-zinc-800 text-white border border-zinc-700" value={form.motorista_id} onChange={e => setForm({ ...form, motorista_id: Number(e.target.value) })}>
                   <option value={0}>Selecione um motorista</option>
                   {motoristas.map((m) => (<option key={m.id} value={m.id}>🚗 {m.nome}</option>))}
                 </select>
               </div>
               <div>
                 <label className="text-zinc-400 text-xs ml-1">Veículo</label>
                 <select className="w-full p-3 rounded-xl bg-zinc-800 text-white border border-zinc-700" value={form.veiculo_id} onChange={e => setForm({ ...form, veiculo_id: Number(e.target.value) })}>
                   <option value={0}>Selecione um veículo</option>
                   {veiculos.map((v) => (<option key={v.id} value={v.id}> do 🚛 {v.placa} - {v.modelo}</option>))}
                 </select>
               </div>
               <div className="grid grid-cols-2 gap-3">
                 <div>
                   <label className="text-zinc-400 text-xs ml-1">Data Saída *</label>
                   <input type="date" className="w-full p-3 rounded-xl bg-zinc-800 text-white border border-zinc-700" value={form.data_saida} onChange={e => setForm({ ...form, data_saida: e.target.value })} />
                 </div>
                 <div>
                   <label className="text-zinc-400 text-xs ml-1">KM Inicial</label>
                   <input type="number" className="w-full p-3 rounded-xl bg-zinc-800 text-white border border-zinc-700" value={form.km_inicial || ''} onChange={e => setForm({ ...form, km_inicial: Number(e.target.value) })} />
                 </div>
               </div>
               <div>
                 <label className="text-zinc-400 text-xs ml-1">Status</label>
                 <select className="w-full p-3 rounded-xl bg-zinc-800 text-white border border-zinc-700" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                   <option value="em andamento">Em andamento</option>
                   <option value="concluída">Concluída</option>
                   <option value="cancelada">Cancelada</option>
                 </select>
               </div>
             </div>
             <div className="flex justify-end gap-2 pt-4 border-t border-zinc-800">
               <button onClick={() => { setModalOpen(false); resetForm(); }} className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-medium">Cancelar</button>
               <button onClick={saveViagem} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium">Salvar</button>
             </div>
          </div>
        </div>
      )}
    </div>
  )
}
