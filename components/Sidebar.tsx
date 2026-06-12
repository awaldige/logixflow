'use client'

import {
  Truck,
  User,
  MapPin,
  Wrench,
  Fuel
} from 'lucide-react'

interface SidebarProps {
  aba: string
  setAba: (aba: string) => void
}

export default function Sidebar({ aba, setAba }: SidebarProps) {

  const menus = [
    { nome: 'Frota', icon: Truck },
    { nome: 'Motoristas', icon: User },
    { nome: 'Viagens', icon: MapPin },
    { nome: 'Manutenções', icon: Wrench },
    { nome: 'Abastecimentos', icon: Fuel }
  ]

  return (
    <aside className="w-72 bg-zinc-900 border-r border-zinc-800 p-6">

      {/* TITLE */}
      <h2 className="text-white font-bold text-xl mb-8">
        Menu
      </h2>

      {/* NAV */}
      <div className="space-y-3">

        {menus.map((item) => {
          const Icon = item.icon
          const active = aba === item.nome

          return (
            <button
              key={item.nome}
              onClick={() => setAba(item.nome)}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold transition-all border
                ${
                  active
                    ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20'
                    : 'bg-zinc-800 text-zinc-300 border-transparent hover:bg-zinc-700 hover:text-white hover:border-zinc-600'
                }
              `}
            >
              <Icon size={20} />
              {item.nome}
            </button>
          )
        })}

      </div>

      {/* FOOTER STATUS (TOQUE SaaS) */}
      <div className="mt-10 pt-6 border-t border-zinc-800">

        <div className="text-xs text-zinc-500 mb-2">
          Status do sistema
        </div>

        <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          Online
        </div>

      </div>

    </aside>
  )
}