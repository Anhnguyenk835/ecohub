"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Star, ArrowRight, ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { Navbar } from "../layout/nav-bar"
import { FieldCard, type FieldData } from "../layout/field-card"
import { get } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"

export default function HomePage() {
  const [scrollPosition, setScrollPosition] = useState(0)
  const [fields, setFields] = useState<FieldData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [hasOverflow, setHasOverflow] = useState(false)

  const ownerId = useMemo(() => {
    if (user?.uid) return user.uid
    try { return sessionStorage.getItem('uid') || undefined } catch { return undefined }
  }, [user?.uid])

  useEffect(() => {
    let cancelled = false
    async function fetchZones() {
      if (!ownerId) { setFields([]); setLoading(false); return }
      setLoading(true)
      setError(null)
      try {
        console.log("fetching zones", ownerId)
        const data = await get<any[]>(`/zones?owner_id=${encodeURIComponent(ownerId)}`)
        const mapped: FieldData[] = (data || []).map((z) => ({
          id: z.id,
          name: z.name,
          area: z.location || '',
          status: 'Good',
          image: '/field.jpg',
        }))
        if (!cancelled) setFields(mapped)
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load fields')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchZones()
    return () => { cancelled = true }
  }, [ownerId])

  // Determine if navigation is needed based on overflow
  useEffect(() => {
    function computeOverflow() {
      const el = containerRef.current
      if (!el) return setHasOverflow(false)
      setHasOverflow(el.scrollWidth > el.clientWidth)
    }
    computeOverflow()
    const onResize = () => computeOverflow()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [fields])

  const scroll = (direction: "left" | "right") => {
    const el = containerRef.current
    if (!el) return
    const scrollAmount = 320
    const maxScroll = el.scrollWidth - el.clientWidth
    const newPosition =
      direction === "left"
        ? Math.max(0, scrollPosition - scrollAmount)
        : Math.min(maxScroll, scrollPosition + scrollAmount)
    el.scrollTo({ left: newPosition, behavior: "smooth" })
    setScrollPosition(newPosition)
  }

  const canScrollLeft = scrollPosition > 0
  const canScrollRight = (() => {
    const el = containerRef.current
    if (!el) return false
    const maxScroll = el.scrollWidth - el.clientWidth
    return scrollPosition < maxScroll
  })()

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Hero Section */}
      <div className="relative h-64 bg-gradient-to-r from-green-600 to-green-800">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: "url('/home_image.png')",
          }}
        >
          <div className="absolute inset-0 bg-green-900/30" />
        </div>
      </div>

      {/* AI Recommendation Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 relative z-10">
        <div className="bg-gradient-to-r from-[#B7CAC4] to-[#5A8776] hover:from-[#a6bcb5] hover:to-[#4d7868] transition-colors rounded-full px-6 py-3 flex items-center justify-between cursor-pointer group shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <Star className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-medium">Check our AI recommendation for your fields</span>
          </div>
          <ArrowRight className="w-5 h-5 text-white group-hover:translate-x-1 transition-transform" />
        </div>
      </div>

      {/* My Fields Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">My Fields</h2>
          <div className="flex items-center space-x-4">
            <button className="bg-[#29513F]/80 hover:bg-[#1e3d2f]/80 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors cursor-pointer">
              <Plus className="w-4 h-4" />
              <span>Add new</span>
            </button>
            {/* <button className="text-green-600 hover:text-green-700 font-medium transition-colors">See all</button> */}
          </div>
        </div>

        <div className="relative">
          {/* Navigation buttons (only if overflow) */}
          {hasOverflow && (
            <>
              <button
                onClick={() => scroll("left")}
                className="absolute ml-1 top-[45%] -translate-y-1/2 z-10 w-10 h-10 bg-white opacity-80 shadow-lg rounded-full flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-300"
                disabled={!canScrollLeft}
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>

              <button
                onClick={() => scroll("right")}
                className="absolute mr-2 right-0 top-[45%] -translate-y-1/2 z-10 w-10 h-10 bg-white opacity-80 shadow-lg rounded-full flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-300"
                disabled={!canScrollRight}
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </>
          )}

          {/* Fields container */}
          <div
            id="fields-container"
            ref={containerRef}
            onScroll={(e) => setScrollPosition((e.target as HTMLDivElement).scrollLeft)}
            className="flex space-x-6 overflow-x-auto scrollbar-hide pb-4"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {fields.map((field) => (
              <FieldCard key={field.id} field={field} onClick={() => console.log(`Clicked on ${field.name}`)} />
            ))}
            {(!loading && fields.length === 0) && (
              <div className="text-gray-500">No fields yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
