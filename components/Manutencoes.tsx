'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Plus, Wrench, Calendar, DollarSign, ShieldAlert } from 'lucide-react'
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

const INITIAL_FORM_STATE = {
  veiculo_id: '',
  descricao: '',
  data_manutencao: '',
  custo: '',
  oficina: '',
  status: 'pendente'
}

export default function Manutencoes() {
  const [manutencoes, setManutencoes] = useState<Manutencao[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)

  // Usamos strings no form para melhor manipulação dos inputs numéricos vazios
  const [form, setForm] = useState(INITIAL_FORM_STATE)

  const isFetchingRef = useRef(false)

  // Memoizando a busca para evitar loops de re-renderização
  const fetchData = useCallback(async () => {
    if (isFetchingRef.current) return
    isFetchingRef.current = true

    try {
      const { data, error } = await supabase
        .from('manutencoes')
        .select('*')
        .order('data_manutencao', { ascending: false })

      if (error) throw error
      setManutencoes(data || [])
    } catch (error) {
      console.error('Erro ao buscar manutenções:', error)
      alert('Não foi possível carregar o histórico de manutenções.')
    } finally {
      setLoading(false)
      isFetchingRef.current = false
    }
  }, [])

  // Inicialização e Realtime
  useEffect(() => {
    fetchData()

    const channel = supabase
      .channel('manutencoes_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'manutencoes' },
        () => fetchData()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchData])

  function resetForm() {
    setForm(INITIAL_FORM_STATE)
  }

  function openCreate() {
    setEditId(null)
