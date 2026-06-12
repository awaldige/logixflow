
import Card from './Card'

interface DashboardProps {
  totalVeiculos: number
  totalMotoristas: number
  totalViagens: number
  totalManutencoes: number
  totalAbastecimentos: number
}

export default function Dashboard({
  totalVeiculos,
  totalMotoristas,
  totalViagens,
  totalManutencoes,
  totalAbastecimentos
}: DashboardProps) {

  // simulação de KPIs (depois pode vir do banco)
  const veiculos = Number(totalVeiculos || 0)
const manutencoes = Number(totalManutencoes || 0)
const abastecimentos = Number(totalAbastecimentos || 0)

const custoManutencao = manutencoes * 350
const custoCombustivel = abastecimentos * 250
const custoTotal = custoManutencao + custoCombustivel

const mediaCustoPorVeiculo =
  veiculos > 0 ? custoTotal / veiculos : 0

  

  return (
    <div className="space-y-8">

      {/* HEADER EXECUTIVO */}
      <div>
        <h2 className="text-3xl font-black text-white">
          Visão Executiva
        </h2>

        <p className="text-zinc-500 mt-1">
          Indicadores financeiros e operacionais da frota em tempo real.
        </p>
      </div>

      {/* KPIs PRINCIPAIS */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">

        <Card
          titulo="Custo Total"
          valor={custoTotal}
          cor="text-red-400"
          descricao="Manutenção + combustível"
        />

        <Card
          titulo="Manutenção"
          valor={custoManutencao}
          cor="text-yellow-400"
          descricao="Gastos com oficina"
        />

        <Card
          titulo="Combustível"
          valor={custoCombustivel}
          cor="text-emerald-400"
          descricao="Abastecimentos"
        />

        <Card
          titulo="Custo por Veículo"
          valor={Math.round(mediaCustoPorVeiculo)}
          cor="text-blue-400"
          descricao="Média operacional"
        />

      </div>

      {/* KPIs OPERACIONAIS */}
      <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">

        <Card
          titulo="Veículos"
          valor={totalVeiculos}
          cor="text-white"
          descricao="Frota ativa"
        />

        <Card
          titulo="Motoristas"
          valor={totalMotoristas}
          cor="text-white"
          descricao="Equipe cadastrada"
        />

        <Card
          titulo="Viagens"
          valor={totalViagens}
          cor="text-blue-400"
          descricao="Operações registradas"
        />

        <Card
          titulo="Manutenções"
          valor={totalManutencoes}
          cor="text-yellow-400"
          descricao="Histórico técnico"
        />

        <Card
          titulo="Abastecimentos"
          valor={totalAbastecimentos}
          cor="text-emerald-400"
          descricao="Consumo total"
        />

      </div>

      {/* PAINEL EXECUTIVO FINAL */}
      <div className="
        bg-zinc-900
        border border-zinc-800
        rounded-3xl
        p-6
        hover:border-zinc-700
        transition
      ">

        <h3 className="text-white font-bold text-lg">
          Status da Operação
        </h3>

        <p className="text-zinc-500 text-sm mt-2">
          A frota está operando normalmente com monitoramento em tempo real via Supabase.
        </p>

        <div className="mt-4 flex items-center gap-2 text-emerald-400 text-sm font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          Operação estável
        </div>

      </div>

    </div>
  )
}