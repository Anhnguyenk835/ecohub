import { Bell, User } from "lucide-react"
import Image from "next/image"

export function Navbar() {
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
          <button className="relative p-2 text-white hover:text-green-700 transition-colors cursor-pointer">
            <Bell className="w-6 h-6" />
          </button>
          <button className="p-2 text-white hover:text-green-700 transition-colors cursor-pointer">
            <User className="w-6 h-6" />
          </button>
        </div>
      </div>
    </header>
  )
}
