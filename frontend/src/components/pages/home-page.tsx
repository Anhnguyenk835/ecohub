"use client"

import { useState } from "react"
import { Star, ArrowRight, ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { Navbar } from "../layout/nav-bar"
import { FieldCard, type FieldData } from "../layout/field-card"

// Sample field data
const sampleFields: FieldData[] = [
  {
    id: "1",
    name: "Tomatoes",
    area: "1,2 ha",
    status: "Good",
    image: "/field.jpg",
  },
  {
    id: "2",
    name: "Lettuce",
    area: "1,6 ha",
    status: "Need water",
    image: "/field.jpg",
  },
  {
    id: "3",
    name: "Rice",
    area: "2,4 ha",
    status: "Good",
    image: "/field.jpg",
  },
  {
    id: "4",
    name: "Corn",
    area: "3,1 ha",
    status: "Warning",
    image: "/field.jpg",
  },
  {
    id: "5",
    name: "Wheat",
    area: "2,8 ha",
    status: "Good",
    image: "/field.jpg",
  },
]

export default function HomePage() {
  const [scrollPosition, setScrollPosition] = useState(0)

  const scroll = (direction: "left" | "right") => {
    const container = document.getElementById("fields-container")
    if (container) {
      const scrollAmount = 320 // Width of card + gap
      const newPosition =
        direction === "left"
          ? Math.max(0, scrollPosition - scrollAmount)
          : Math.min(container.scrollWidth - container.clientWidth, scrollPosition + scrollAmount)

      container.scrollTo({ left: newPosition, behavior: "smooth" })
      setScrollPosition(newPosition)
    }
  }

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
          {/* Navigation buttons */}
          <button
            onClick={() => scroll("left")}
            className="absolute ml-1 top-[45%] -translate-y-1/2 z-10 w-10 h-10 bg-white opacity-80 shadow-lg rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors cursor-pointer"
            disabled={scrollPosition === 0}
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 hover:text-green-600 transition-colors cursor-pointer" />
          </button>

          <button
            onClick={() => scroll("right")}
            className="absolute mr-2 right-0 top-[45%] -translate-y-1/2 z-10 w-10 h-10 bg-white opacity-80 shadow-lg rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-5 h-5 text-gray-600 hover:text-green-600 transition-colors cursor-pointer" />
          </button>

          {/* Fields container */}
          <div
            id="fields-container"
            className="flex space-x-6 overflow-x-auto scrollbar-hide pb-4"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {sampleFields.map((field) => (
              <FieldCard key={field.id} field={field} onClick={() => console.log(`Clicked on ${field.name}`)} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
