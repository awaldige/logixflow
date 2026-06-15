'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Plus, CheckCircle, Navigation, MapPin, X } from 'lucide-react'
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
  const [manutencoesAtivas, setManutencoesAtivas] = useState<number[]>([]) 
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState(INITIAL_FORM_STATE)

  const isFetchingRef = useRef(false)

  // 2. BUSCA DE VIAGENS
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
    } finally {
      setLoading(false)
      isFetchingRef.current = false
    }
  }, [])

  // 3. BUSCA DADOS AUXILIARES (Motoristas, Veículos e Oficina)
  const loadAuxiliaryData = useCallback(async () => {
    try {
      const [motoristasRes, veiculosRes, manutencoesRes] = await Promise.all([
        supabase.from('motoristas').select('id, nome'),
        supabase.from('veiculos').select('id, placa, modelo'),
        supabase.from('manutencoes').select('veiculo_id, status')
      ])

      // Se houver algum erro de comunicação com a tabela, gera um aviso legível
      if (manutencoesRes.error) {
        console.error("Erro na tabela de manutenções:", manutencoesRes.error.message)
        alert(`Atenção: Erro ao ler tabela de manutenções. Verifique o nome da tabela no Supabase.`)
        return
      }

      setMotoristas(motoristasRes.data || [])
      setVeiculos(veiculosRes.data || [])
      
      // Filtra de forma segura aceitando "em andamento" independente de espaços ou maiúsculas
      const ativas = (manutencoesRes.data || []).filter(
        m => m.status?.toLowerCase().trim() === 'em andamento'
      )
      
      const idsEmManutencao = ativas.map(m => m.veiculo_id)
      setManutencoesAtivas(idsEmManutencao)

    } catch (error) {
      console.error('Erro geral no carregamento auxiliar:', error)
    }
  }, [])

  // Gatilhos de carregamento primário
  useEffect(() => {
    loadAuxiliaryData()
    fetchData()
  }, [loadAuxiliaryData, fetchData])

  // Recarrega sempre que o modal abre ou fecha para atualizar o status dos carros
  useEffect(() => {
    if (modalOpen) {
      loadAuxiliaryData()
    }
  }, [modalOpen, loadAuxiliaryData])

  useEffect(() => {
    const channel = supabase
      .channel('viagens_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'viagens' }, () => { fetchData() })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchData])

  // Filtros de Ocupação (Fixado e Limpo)
  const motoristasOcupadosIds = viagens
    .filter(v => v.status === 'em andamento' && v.id !== editId)
    .map(v => v.motorista_id)

  const veiculosOcupadosIds = viagens
    .filter(v => v.status === 'em andamento' && v.id !== editId)
    .map(v => v.veiculo_id)

  // 4. FUNÇÃO PARA CONCLUIR A VIAGEM
  async function concluirViagem(id: number) {
    const kmFinalStr = prompt('Digite o KM Final para concluir a viagem:')
    if (kmFinalStr === null) return 
    
    const kmFinal = Number(kmFinalStr)
    if (isNaN(kmFinal) || kmFinal <= 0) {
      return alert('Por favor, informe um KM final válido e maior que zero.')
    }

    try {
      const hoje = new Date().toISOString().substring(0, 10)
      const { error } = await supabase
        .from('viagens')
        .update({ status: 'concluída', km_final: kmFinal, data_retorno: hoje })
        .eq('id', id)

      if (error) throw error
      alert('Viagem concluída com sucesso!')
      fetchData()
    } catch (error) {
      console.error('Erro ao concluir viagem:', error)
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
    if (!form.origem || !form.destino || !form.data_saida) {
      alert('Por favor, preencha os campos obrigatórios (*)')
      return
    }

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
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto text-white">
      {/* HEADER */}
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight truncate">Viagens</h2>
          <p className="text-zinc-500 text-xs md:text-sm mt-1 truncate">Controle das viagens em andamento.</p>
        </div>
        <button 
          onClick={openCreate} 
          className="bg-blue-600 hover:bg-blue-500 text-white transition-all px-4 py-2.5 md:px-5 md:py-3 rounded-xl font-bold flex items-center gap-2 flex-shrink-0 text-xs md:text-sm shadow-lg"
        >
          <Plus size={16} /> 
          <span>Nova Viagem</span>
        </button>
      </div>

      {loading && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-zinc-400 animate-pulse">
          Carregando viagens...
        </div>
      )}

      {/* CARDS */}
      {!loading && (
        <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {viagens.map((v) => (
            <div key={v.id} className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-5 flex flex-col justify-between hover:border-zinc-700 transition duration-300 shadow-xl min-w-0">
              <div>
                <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3 mb-4 gap-2">
                  <span className="text-zinc-500 font-bold text-xs md:text-sm">Viagem #{v.id}</span>
                  <span className={`px-2.5 py-0.5 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-wider flex-shrink-0 ${
                    v.status === 'em andamento' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                    v.status === 'concluída' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    'bg-zinc-800 text-zinc-400'
                  }`}>
                    {v.status}
                  </span>
                </div>

                <div className="space-y-3 mb-5">
                  <div className="flex items-start gap-2 min-w-0">
                    <Navigation size={16} className="text-blue-500 mt-1 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Origem</p>
                      <p className="text-white font-bold text-sm md:text-base truncate">{v.origem}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2 min-w-0">
                    <MapPin size={16} className="text-red-500 mt-1 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Destino</p>
                      <p className="text-white font-bold text-sm md:text-base truncate">{v.destino}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-950/40 rounded-xl p-3 space-y-2 text-xs md:text-sm text-zinc-400 border border-zinc-800/40">
                  <p className="flex justify-between items-center gap-2 min-w-0">
                    <span className="text-zinc-500 font-medium flex-shrink-0">Motorista:</span> 
                    <span className="text-white font-semibold truncate text-right flex-1">{getMotoristaNome(v)}</span>
                  </p>
                  <p className="flex justify-between items-center gap-2 min-w-0">
                    <span className="text-zinc-500 font-medium flex-shrink-0">Veículo:</span> 
                    <span className="text-white font-semibold truncate text-right flex-1">{getVeiculoTexto(v)}</span>
                  </p>
                  <hr className="border-zinc-800/40 my-1" />
                  <p className="flex justify-between text-xs">
                    <span className="text-zinc-500 font-medium">KM Inicial:</span> 
                    <span className="text-white font-semibold font-mono">{v.km_inicial.toLocaleString('pt-BR')} km</span>
                  </p>
                  {v.km_final && (
                    <p className="flex justify-between text-xs">
                      <span className="text-zinc-500 font-medium">KM Final:</span> 
                      <span className="text-emerald-400 font-semibold font-mono">{v.km_final.toLocaleString('pt-BR')} km</span>
                    </p>
                  )}
                  <p className="flex justify-between text-xs">
                    <span className="text-zinc-500 font-medium">Saída:</span> 
                    <span className="text-white font-semibold font-mono">{formatarData(v.data_saida)}</span>
                  </p>
                  {v.data_retorno && (
                    <p className="flex justify-between text-xs">
                      <span className="text-zinc-500 font-medium">Retorno:</span> 
                      <span className="text-white font-semibold font-mono">{formatarData(v.data_retorno)}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2 mt-5">
                {v.status === 'em andamento' && (
                  <button
                    onClick={() => concluirViagem(v.id)}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl text-xs md:text-sm font-black transition flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={15} />
                    Concluir Viagem
                  </button>
                )}

                <div className="flex gap-2">
                  <button onClick={() => openEdit(v)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-xl text-xs font-bold transition flex-1">
                    Editar
                  </button>
                  <button onClick={() => deleteViagem(v.id)} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/10 px-4 py-2 rounded-xl text-xs font-bold transition flex-1">
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-zinc-950 p-5 sm:p-8 border border-zinc-800/80 rounded-2xl w-full max-w-xl space-y-5 relative text-zinc-300 max-h-[calc(100vh-2rem)] overflow-y-auto">
            
            <button 
              onClick={() => { setModalOpen(false); resetForm(); }}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition p-1"
            >
              <X size={20} />
            </button>

            <div className="border-b border-zinc-800/60 pb-3">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {editId ? '🛠️ Editar Viagem' : '🗺️ Nova Viagem'}
              </h2>
              <p className="text-xs text-zinc-500 mt-1">Insira os dados da rota e aloque recursos disponíveis.</p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Origem *</label>
                  <input className="w-full p-3 rounded-xl bg-zinc-900 text-white border border-zinc-800 focus:outline-none focus:border-blue-500 transition text-xs sm:text-sm font-medium" placeholder="Ponto de partida" value={form.origem} onChange={e => setForm({ ...form, origem: e.target.value })} />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Destino *</label>
                  <input className="w-full p-3 rounded-xl bg-zinc-900 text-white border border-zinc-800 focus:outline-none focus:border-blue-500 transition text-xs sm:text-sm font-medium" placeholder="Destino final" value={form.destino} onChange={e => setForm({ ...form, destino: e.target.value })} />
                </div>
              </div>

              {/* MOTORISTA */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Motorista</label>
                <select className="w-full p-3 rounded-xl bg-zinc-900 text-white border border-zinc-800 focus:outline-none focus:border-blue-500 transition text-xs sm:text-sm font-medium" value={form.motorista_id} onChange={e => setForm({ ...form, motorista_id: Number(e.target.value) })}>
                  <option value={0}>Selecione um motorista</option>
                  {motoristas.map((m) => {
                    const estaOcupado = motoristasOcupadosIds.includes(m.id);
                    return (
                      <option key={m.id} value={m.id} disabled={estaOcupado}>
                        🚗 {m.nome} {estaOcupado ? '(Ocupado em Viagem)' : ''}
                      </option>
                    )
                  })}
                </select>
              </div>

              {/* VEÍCULO REFORMULADO */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Veículo</label>
                <select className="w-full p-3 rounded-xl bg-zinc-900 text-white border border-zinc-800 focus:outline-none focus:border-blue-500 transition text-xs sm:text-sm font-medium" value={form.veiculo_id} onChange={e => setForm({ ...form, veiculo_id: Number(e.target.value) })}>
                  <option value={0}>Selecione um veículo</option>
                  {veiculos.map((v) => {
                    const ehOVeiculoAtualDestaViagem = v.id === form.veiculo_id;

                    const emViagem = veiculosOcupadosIds.includes(v.id) && !ehOVeiculoAtualDestaViagem;
                    const emManutencao = manutencoesAtivas.includes(v.id);
                    
                    const estaIndisponivel = emViagem || emManutencao;

                    let motivo = '';
                    if (emViagem) motivo = '(Ocupado em Viagem)';
                    else if (emManutencao) motivo = '(Em Manutenção)';

                    return (
                      <option key={v.id} value={v.id} disabled={estaIndisponivel}>
                          🚛 {v.placa} - {v.modelo} {motivo}
                      </option>
                    )
                  })}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Data Saída *</label>
                  <input type="date" className="w-full p-3 rounded-xl bg-zinc-900 text-white border border-zinc-800 focus:outline-none focus:border-blue-500 transition text-xs sm:text-sm font-mono" value={form.data_saida} onChange={e => setForm({ ...form, data_saida: e.target.value })} />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">KM Inicial</label>
                  <input type="number" className="w-full p-3 rounded-xl bg-zinc-900 text-white border border-zinc-800 focus:outline-none focus:border-blue-500 transition text-xs sm:text-sm font-mono" placeholder="Ex: 142000" value={form.km_inicial || ''} onChange={e => setForm({ ...form, km_inicial: Number(e.target.value) })} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Status do Fluxo</label>
                <select className="w-full p-3 rounded-xl bg-zinc-900 text-white border border-zinc-800 focus:outline-none focus:border-blue-500 transition text-xs sm:text-sm font-medium" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  <option value="em andamento">Em andamento</option>
                  <option value="concluída">Concluída</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-900">
              <button type="button" onClick={() => { setModalOpen(false); resetForm(); }} className="px-4 py-2.5 bg-zinc-900 text-zinc-400 hover:text-white rounded-xl font-medium transition text-xs sm:text-sm">
                Cancelar
              </button>
              <button type="button" onClick={saveViagem} className="px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold transition text-xs sm:text-sm shadow-lg">
                Salvar
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
