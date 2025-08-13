"use client"

import { ChevronRight, Trash2 } from "lucide-react"

export interface FieldData {
  id: string
  name: string
  area: string
  status: "Good" | "Need water" | "Warning" | "Critical" | "Unknown" | "Error" | string;
  image: string
  lastUpdated?: string
}

interface FieldCardProps {
  field: FieldData
  onClick?: () => void
  onDelete?: (id: string) => void;
}

export function FieldCard({ field, onClick, onDelete }: FieldCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Good":
        return "bg-green-100 text-green-800 border-green-200"
      case "Need water":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "Warning":
        return "bg-orange-100 text-orange-800 border-orange-200"
      case "Critical":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    if (onDelete) {
      onDelete(field.id);
    }
  };

  return (
    <div
      className="flex-shrink-0 w-80 bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer group overflow-hidden"
      onClick={onClick}
    >
      <div className="relative">
        {onDelete && (
          <button
            onClick={handleDeleteClick}
            className="absolute top-2 right-2 z-20 p-2 bg-white/70 rounded-full text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all"
            aria-label={`Delete field ${field.name}`}
          >
            <Trash2 size={18} />
          </button>
        )}
        <img
          src={
            field.image || "/placeholder.svg"
          }
          alt={`${field.name} field`}
          className="w-full h-42 object-cover rounded-t-[20px]"
          style={{ objectPosition: "center" }}
        />
        <div className="absolute top-4 left-4">
          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(field.status)}`}>
            {field.status}
          </span>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-green-600 transition-colors">
              {field.name}
            </h3>
            <p className="text-gray-600 text-sm mt-1">{field.area}</p>
          </div>
        </div>
      </div>
    </div>
  )
}