export default function Header() {
  return (
    <header className="
      flex items-center justify-between
      border-b border-zinc-800
      pb-6 mb-8
    ">

      {/* BRAND */}
      <div>
        <h1 className="text-4xl font-black tracking-tight text-white">
          LOGIX<span className="text-blue-600">FLOW</span>
        </h1>

        <p className="text-zinc-500 text-sm mt-1">
          Sistema de Gestão de Frotas
        </p>
      </div>

      {/* STATUS / INFO (melhora MUITO o portfólio) */}
      <div className="hidden md:flex items-center gap-3">

        <div className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold">
          Online
        </div>

        <div className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-bold">
          Supabase Sync
        </div>

      </div>

    </header>
  )
}