"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Leaf, Loader2 } from "lucide-react"

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { signIn } = useAuth()
  const router = useRouter()

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row">
      {/* Left side - Login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-white p-8 lg:p-12">
        <div className="w-full max-w-md space-y-8">
          {/* Logo and header */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-4 mb-6">
              <div className="flex items-center justify-center">
                <img src="/Logo.png" alt="EcoHub Logo" className="w-16 h-16" />
              </div>
              <h1 className="text-4xl font-medium text-[#357133]">EcoHub</h1>
            </div>
            <p className="text-sm text-[#357133] leading-relaxed max-w-sm mx-auto">
              Sign in to stay updated on field insights and manage resources with ease
            </p>
          </div>

          {/* Login form */}
          <form
            className="space-y-6"
            onSubmit={async (e) => {
              e.preventDefault()
              setError(null)
              setIsLoading(true)
              try {
                await signIn(email, password)
                // Log user id and token for debugging as requested
                try {
                  const token = await (await import("@/lib/firebase-auth")).getIdToken()
                  // eslint-disable-next-line no-console
                  console.log("UserID:", (await import("firebase/auth")).getAuth().currentUser?.uid)
                  // eslint-disable-next-line no-console
                  console.log("Token:", token)
                } catch {}
                router.push('/home')
              } catch (err: any) {
                setError(err?.message || "Failed to sign in")
              } finally {
                setIsLoading(false)
              }
            }}
          >
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="w-full h-12 px-4 border border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 focus:outline-none transition-all duration-200 text-gray-900 placeholder-gray-500 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-70"
                />
              </div>

              <div className="relative">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="w-full h-12 px-4 border border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 focus:outline-none transition-all duration-200 text-gray-900 placeholder-gray-500 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-70"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  className="absolute right-4 top-1/2 transform translate-y-1 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="text-right">
              <a href="#" className="text-sm text-green-600 hover:text-green-700 font-medium transition-colors">
                Forgot password?
              </a>
            </div>

            {error && (
              <div className="text-sm text-red-600">{error}</div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-[#648E7F] hover:bg-[#5A7F71] active:bg-[#507063] text-white font-semibold rounded-lg transition-all duration-200 cursor-pointer disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:bg-gray-400 flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>SIGNING IN...</span>
                </>
              ) : (
                "SIGN IN"
              )}
            </button>
          </form>

          {/* Sign up link */}
          <div className="text-center pt-4">
            <p className="text-sm text-gray-600">
              Don't have an account?{" "}
              <a href="/signup" className="text-green-600 hover:text-green-700 font-semibold transition-colors">
                Sign Up Now
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Hero image and branding */}
      <div className="w-full lg:w-1/2 min-h-[400px] lg:min-h-screen relative">
        {/* Background image */}
        <div className="absolute inset-0">
          <img
            src="/login_image.png"
            alt="Login background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-green-900/40" />
        </div>

        {/* Content overlay */}
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-white p-8 lg:p-12">
          <div className="text-center space-y-8 max-w-lg">

            {/* Welcome message */}
            <div className="space-y-4">
              <p className="text-lg leading-relaxed">
              Welcome to EcoHub – your complete solution for crop and resource management
              </p>
            </div>

            {/* Feature highlights */}
            {/* <div className="grid grid-cols-1 gap-4 mt-8 text-left">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-300 rounded-full"></div>
                <span className="text-green-100">Real-time field monitoring</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-300 rounded-full"></div>
                <span className="text-green-100">Resource optimization</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-300 rounded-full"></div>
                <span className="text-green-100">Data-driven insights</span>
              </div>
            </div> */}
          </div>
        </div>
      </div>
    </div>
  )
}
