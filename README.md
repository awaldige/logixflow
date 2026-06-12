LOGIXFLOW

Sistema profissional de gestão de frotas desenvolvido com Next.js 15, TypeScript, Tailwind CSS e Supabase.

Visão Geral

O LOGIXFLOW é uma plataforma para gerenciamento de:

Veículos
Motoristas
Viagens
Manutenções
Abastecimentos

O sistema utiliza o Supabase como banco de dados e sincronização em tempo real.

Tecnologias Utilizadas
Next.js 15
React
TypeScript
Tailwind CSS
Supabase
Realtime
Lucide React
Funcionalidades
Dashboard
Quantidade de veículos
Quantidade de motoristas
Viagens em andamento
Manutenções
Abastecimentos
Frota
Visualização dos veículos cadastrados
Atualização automática em tempo real
Motoristas
Controle dos motoristas cadastrados
Atualização automática em tempo real
Viagens
Controle das viagens
Monitoramento das viagens em andamento
Manutenções
Histórico de manutenção da frota
Abastecimentos
Registro e acompanhamento dos abastecimentos
Banco de Dados

Tabelas principais:

veiculos
motoristas
viagens
manutencoes
abastecimentos

Todas as tabelas possuem sincronização Realtime via Supabase.

Estrutura do Projeto
app/
components/
lib/
services/
types/
public/
Instalação

Clone o repositório:

git clone https://github.com/awaldige/logixflow.git

Entre na pasta:

cd logixflow

Instale as dependências:

npm install

Execute o projeto:

npm run dev
Variáveis de Ambiente

Crie um arquivo:

.env.local

Adicione:

NEXT_PUBLIC_SUPABASE_URL=SEU_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_CHAVE_PUBLICA
Repositório

https://github.com/awaldige/logixflow

Autor

André Waldige

Licença

Projeto de uso privado.
