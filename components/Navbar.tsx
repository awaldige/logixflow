interface NavbarProps {
  aba: string
  setAba: (aba: string) => void
}

export default function Navbar({ aba, setAba }: NavbarProps) {
  const menus = [
    'Dashboard',
    'Frota',
    'Motoristas',
    'Viagens',
    'Manutenções',
    'Abastecimentos'
  ]

  return (
    <header className="border-b border-zinc-800 bg-[#050505]">

      <div className="max-w-7xl mx-auto px-6 py-6">

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">

          {/* LOGO */}
          <div>
            <h1 className="text-4xl font-black tracking-tight text-white">
              LOGIX<span className="text-blue-600">FLOW</span>
            </h1>

            <p className="text-[10px] uppercase tracking-[0.35em] text-zinc-500 mt-1">
              Sistema de Gestão de Frotas
            </p>
          </div>

          {/* STATUS INDICATOR (PORTFÓLIO UPGRADE) */}
          <div className="hidden lg:flex items-center gap-3">

            <div className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold">
              Sistema Online
            </div>

            <div className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-bold">
              Supabase Sync
            </div>

          </div>

          {/* MENU */}
          <nav className="flex flex-wrap gap-3">

            {menus.map(menu => (
              <button
                key={menu}
                onClick={() => setAba(menu)}
                className={`
                  px-5 py-2 rounded-2xl font-semibold transition-all
                  border border-transparent
                  ${
                    aba === menu
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white hover:border-zinc-700'
                  }
                `}
              >
                {menu}
              </button>
            ))}

          </nav>

        </div>

      </div>

    </header>
  )
}