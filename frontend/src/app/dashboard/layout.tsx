"use client"

import RequireAuth from '@/components/auth/RequireAuth'
import { Navbar } from "@/components/layout/nav-bar"
import { Sidebar } from "@/components/layout/sidebar"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <div className="h-screen bg-gray-50 overflow-hidden">
        <Navbar />
        <div className="flex h-[calc(100vh-60px)]">
          <Sidebar />
          <main className="flex-1 p-4 overflow-hidden">{children}</main>
        </div>
      </div>
    </RequireAuth>
  )
}

