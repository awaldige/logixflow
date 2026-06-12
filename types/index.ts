// =========================
// VEÍCULOS
// =========================
export interface Veiculo {
  id: number
  placa: string
  modelo: string
  marca: string
  ano: number
  tipo: string
  km_atual: number
  status: 'DISPONIVEL' | 'OCUPADO'
}

// =========================
// MOTORISTAS
// =========================
export interface Motorista {
  id: number
  nome: string
  cnh: string
  categoria_cnh: string
  telefone: string
  status: 'ATIVO' | 'OCUPADO'
}

// =========================
// VIAGENS
// =========================
export interface Viagem {
  id: number
  origem: string
  destino: string
  veiculo_id: number
  motorista_id: number

  data_saida: string
  data_retorno?: string

  km_inicial: number
  km_final?: number

  status: 'EM_ANDAMENTO' | 'CONCLUIDA'

  veiculo_modelo?: string
  veiculo_placa?: string
  motorista_nome?: string
}

// =========================
// MANUTENÇÕES
// =========================
export interface Manutencao {
  id: number
  veiculo_id: number

  descricao: string
  oficina: string

  data_manutencao: string

  custo: number

  status: string

  veiculo_placa?: string
}

// =========================
// ABASTECIMENTOS
// =========================
export interface Abastecimento {
  id: number

  viagem_id: number

  litros: number
  valor_litro: number
  total: number

  local_abastecimento: string
}

// =========================
// DASHBOARD
// =========================
export interface DashboardStats {
  totalVeiculos: number
  totalMotoristas: number
  viagensAtivas: number
  totalManutencoes: number
  totalAbastecimentos: number
}