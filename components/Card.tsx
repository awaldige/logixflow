interface CardProps {
  titulo: string
  valor: number
  cor?: string
  descricao?: string
  icone?: React.ReactNode
}

export default function Card({
  titulo,
  valor,
  cor = 'text-white',
  descricao,
  icone
}: CardProps) {
  return (
    <div className="
      bg-zinc-900
      border border-zinc-800
      rounded-3xl
      p-6
      transition-all
      hover:border-zinc-700
      hover:bg-zinc-800/40
      shadow-lg shadow-black/20
    ">

      {/* HEADER */}
      <div className="flex items-center justify-between">

        <p className="text-zinc-500 text-sm uppercase tracking-wider">
          {titulo}
        </p>

        {icone && (
          <div className="text-zinc-400">
            {icone}
          </div>
        )}

      </div>

      {/* VALOR */}
      <h2 className={`text-4xl font-black mt-3 ${cor}`}>
        {valor}
      </h2>

      {/* DESCRIÇÃO (opcional) */}
      {descricao && (
        <p className="text-zinc-500 text-sm mt-2">
          {descricao}
        </p>
      )}

    </div>
  )
}