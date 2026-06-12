import { supabase } from '@/lib/supabase'
import { Veiculo } from '@/types/veiculo'

export async function getVeiculos() {
  const { data, error } = await supabase
    .from('veiculos')
    .select('*')
    .order('id', { ascending: false })

  if (error) throw error
  return data as Veiculo[]
}

export async function createVeiculo(veiculo: Omit<Veiculo, 'id'>) {
  const { error } = await supabase
    .from('veiculos')
    .insert([veiculo])

  if (error) throw error
}

export async function updateVeiculo(id: number, veiculo: Partial<Veiculo>) {
  const { error } = await supabase
    .from('veiculos')
    .update(veiculo)
    .eq('id', id)

  if (error) throw error
}

export async function deleteVeiculo(id: number) {
  const { error } = await supabase
    .from('veiculos')
    .delete()
    .eq('id', id)

  if (error) throw error
}