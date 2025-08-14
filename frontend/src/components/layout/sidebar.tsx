"use client"

import Link from "next/link"
import { useParams, usePathname } from "next/navigation"
import { LayoutGrid, Server, FileText, Cloud, Settings as SettingsIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type NavItem = {
  label: string
  href: string
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
}

const items: Array<{ label: string; path: string; Icon: NavItem["Icon"] }> = [
  { label: "Information", path: "information", Icon: LayoutGrid },
  { label: "Device Control", path: "device-control", Icon: Server },
  { label: "Schedule", path: "schedule", Icon: FileText },
  { label: "Predictions", path: "predictions", Icon: Cloud },
  { label: "Settings", path: "settings", Icon: SettingsIcon },
]

export function Sidebar() {
  const pathname = usePathname()
  const params = useParams<{ zoneId?: string }>()
  const zoneId = params?.zoneId

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex-shrink-0">
      <nav className="px-3 py-8 space-y-2">
        {items.map(({ label, path, Icon }) => {
          const href = zoneId ? `/dashboard/${zoneId}/${path}` : `/dashboard/${path}`
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer",
                isActive
                  ? "bg-green-50 text-green-700"
                  : "text-gray-600 hover:bg-gray-50"
              )}
            >
              <Icon className={cn("h-6 w-6", isActive ? "text-green-600" : "text-gray-400")} />
              <span className={cn(isActive ? "font-medium" : undefined)}>{label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}

