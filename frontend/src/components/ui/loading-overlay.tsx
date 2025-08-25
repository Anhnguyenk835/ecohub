import { Loader2 } from "lucide-react"

interface LoadingOverlayProps {
  message?: string
  isVisible: boolean
}

export function LoadingOverlay({ message = "Loading...", isVisible }: LoadingOverlayProps) {
  if (!isVisible) return null

  return (
    <div className="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="w-12 h-12 text-green-600 animate-spin" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Dashboard</h3>
        </div>
      </div>
    </div>
  )
}
