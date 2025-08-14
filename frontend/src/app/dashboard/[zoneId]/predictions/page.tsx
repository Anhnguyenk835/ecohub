import { Card, CardContent } from "@/components/ui/card"

export default function PredictionsPage() {
  return (
    <div className="flex gap-4 h-full">
      <div className="flex-1 flex flex-col gap-4">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Yield Forecast</h2>
            <div className="h-56 bg-gray-100 rounded-lg" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Irrigation Recommendation</h2>
            <div className="text-sm text-gray-700">Based on current humidity and temperature, irrigate Tomato Field in 2 hours.</div>
          </CardContent>
        </Card>
      </div>
      <div className="w-80 flex-shrink-0">
        <Card>
          <CardContent className="p-6">
            <h3 className="font-medium text-gray-900 mb-2">Model Status</h3>
            <p className="text-sm text-gray-600">Last updated 10 min ago.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


