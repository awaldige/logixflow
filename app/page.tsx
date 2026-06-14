'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

import Navbar from '@/components/Navbar'
import Dashboard from '@/components/Dashboard'
import Frota from '@/components/Frota'
import Motoristas from '@/components/Motoristas'
import Viagens from '@/components/Viagens'
import Manutencoes from '@/components/Manutencoes'
import Abastecimentos from '@/components/Abastecimentos'

export default function Home() {
  const [aba, setAba] = useState('Dashboard')

  const [totalVeiculos, setTotalVeiculos] = useState(0)
  const [totalMotoristas, setTotalMotoristas] = useState(0)
  const [totalViagens, setTotalViagens] = useState(0)
  const [totalManutencoes, setTotalManutencoes] = useState(0)
  const [totalAbastecimentos, setTotalAbastecimentos] = useState(0)

  const isFetchingRef = useRef(false)

  async function carregarDashboard() {
    if (isFetchingRef.current) return

    isFetchingRef.current = true

    try {
      const [
        { count: veiculos },
        { count: motoristas },
        { count: viagens },
        { count: manutencoes },
        { count: abastecimentos }
      ] = await Promise.all([
        supabase
          .from('veiculos')
          .select('*', { count: 'exact', head: true }),

        supabase
          .from('motoristas')
          .select('*', { count: 'exact', head: true }),

        // CORREÇÃO: Removido o filtro .eq('status', 'Em Andamento') para contar todas as viagens cadastradas
        supabase
          .from('viagens')
          .select('*', { count: 'exact', head: true }),

        supabase
          .from('manutencoes')
          .select('*', { count: 'exact', head: true }),

        supabase
          .from('abastecimentos')
          .select('*', { count: 'exact', head: true })
      ])

      setTotalVeiculos(veiculos || 0)
      setTotalMotoristas(motoristas || 0)
      setTotalViagens(viagens || 0)
      setTotalManutencoes(manutencoes || 0)
      setTotalAbastecimentos(abastecimentos || 0)
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error)
    } finally {
      isFetchingRef.current = false
    }
  }

  useEffect(() => {
    carregarDashboard()

    const channel = supabase
      .channel('dashboard_realtime')

      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'veiculos'
        },
        carregarDashboard
      )

      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'motoristas'
        },
        carregarDashboard
      )

      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'viagens'
        },
        carregarDashboard
      )

      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'manutencoes'
        },
        carregarDashboard
      )

      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'abastecimentos'
        },
        carregarDashboard
      )

      .subscribe((status) => {
        console.log('Realtime Dashboard:', status)
      })

    // fallback caso o websocket caia
    const interval = setInterval(() => {
      carregarDashboard()
    }, 10000)

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <Navbar
        aba={aba}
        setAba={setAba}
      />

      <section className="max-w-7xl mx-auto p-6">

        {aba === 'Dashboard' && (
          <>
            <Dashboard
              totalVeiculos={totalVeiculos}
              totalMotoristas={totalMotoristas}
              totalViagens={totalViagens}
              totalManutencoes={totalManutencoes}
              totalAbastecimentos={totalAbastecimentos}
            />

            <div className="mt-8 bg-zinc-900 border border-zinc-800 rounded-3xl p-10">

              <h2 className="text-3xl font-black mb-4">
                Bem-vindo ao LOGIX
                <span className="text-blue-600">FLOW</span>
              </h2>

              <p className="text-zinc-400 leading-7 max-w-2xl">
                Sistema profissional para gerenciamento de
                frotas, motoristas, viagens, abastecimentos
                e manutenções, totalmente integrado com
                Supabase e sincronização em tempo real.
              </p>

            </div>
          </>
        )}

        {aba === 'Frota' && <Frota />}

        {aba === 'Motoristas' && <Motoristas />}

        {aba === 'Viagens' && <Viagens />}

        {aba === 'Manutenções' && <Manutencoes />}

        {aba === 'Abastecimentos' && <Abastecimentos />}

      </section>
    </main>
  )
}
