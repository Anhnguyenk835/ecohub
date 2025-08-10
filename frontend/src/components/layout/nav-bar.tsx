"use client"

import { Bell, User } from "lucide-react"
import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"

export function Navbar() {
  const { signOut } = useAuth()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const handleLogout = async () => {
    try {
      await signOut()
    } finally {
      try { localStorage.clear() } catch {}
      try { sessionStorage.clear() } catch {}
      setOpen(false)
      router.replace('/login')
    }
  }

  return (
    <header className="bg-[#29513F]">
      <div className="flex items-center justify-between h-16 px-4">
        {/* Logo */}
        <div className="flex items-center space-x-3 ml-4">
          <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden">
            <Image
              src="/Logo.png"
              alt="EcoHub Logo"
              width={32}
              height={32}
              className="object-contain brightness-0 invert"
            />
          </div>
          <h1 className="text-xl font-medium text-white">EcoHub</h1>
        </div>

        {/* Right side icons */}
        <div className="flex items-center space-x-4 mr-2">
          <button className="p-2 text-white hover:text-green-700 transition-colors cursor-pointer focus:outline-none focus:ring-0">
            <Bell className="w-6 h-6" />
          </button>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setOpen((v) => !v)}
              className="p-2 text-white hover:text-green-700 transition-colors cursor-pointer focus:outline-none focus:ring-0"
              aria-haspopup="menu"
              aria-expanded={open}
            >
              <User className="w-6 h-6" />
            </button>
            {open && (
              <div className="absolute right-0 mt-2 w-30 bg-white rounded-md shadow-lg py-2 z-50 select-none">
                <ul className="text-sm text-gray-700">
                  <li>
                    <button
                      onClick={() => { setOpen(false); router.push('/settings') }}
                      className="w-full text-center px-4 py-2 hover:bg-gray-100 cursor-pointer"
                    >
                      Settings
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={handleLogout}
                      className="w-full text-center px-4 py-2 hover:bg-gray-100 cursor-pointer"
                    >
                      Logout
                    </button>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
