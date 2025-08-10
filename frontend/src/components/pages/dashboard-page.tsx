import { Plus, LayoutGrid, Server, FileText, Cloud, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
// content-only; layout provides Navbar and Sidebar
import MetricsGrid from "../layout/metrics-grid"

export default function Dashboard() {
  const sensorData = [
    { id: "W001", name: "Wind sensor", type: "Wind", status: "active" },
    { id: "T001", name: "Temperature sensor", type: "Temperature", status: "active" },
    { id: "PH001", name: "pH sensor", type: "pH", status: "warning", warning: "Signal issue since 05:02 AM" },
    { id: "H001", name: "Humidity sensor", type: "Humidity", status: "active" },
    { id: "S001", name: "Soil sensor", type: "Soil", status: "active" },
  ]

  return (
    <div className="flex gap-4 h-full">
            {/* Left Content */}
            <div className="flex-1 flex flex-col">
              {/* Map */}
              <Card className="mb-4 flex-[3] min-h-0">
                <CardContent className="p-0 h-full relative">
                  <div className="w-full h-full bg-gray-100 rounded-lg relative overflow-hidden">
                    {/* Map background with subtle pattern */}
                    <div className="absolute inset-0 opacity-20">
                      <svg className="w-full h-full" viewBox="0 0 400 300">
                        <path
                          d="M50 50 Q100 30 150 50 T250 50 Q300 70 350 50"
                          stroke="#ccc"
                          strokeWidth="2"
                          fill="none"
                        />
                        <path
                          d="M30 100 Q80 80 130 100 T230 100 Q280 120 330 100"
                          stroke="#ccc"
                          strokeWidth="2"
                          fill="none"
                        />
                        <path
                          d="M70 150 Q120 130 170 150 T270 150 Q320 170 370 150"
                          stroke="#ccc"
                          strokeWidth="2"
                          fill="none"
                        />
                        <path
                          d="M40 200 Q90 180 140 200 T240 200 Q290 220 340 200"
                          stroke="#ccc"
                          strokeWidth="2"
                          fill="none"
                        />
                      </svg>
                    </div>

                    {/* Weather info overlay - top left */}
                    <div className="absolute top-4 left-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                          <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                        </div>
                        <div>
                          <div className="text-4xl font-bold text-gray-900">24°C</div>
                          <div className="text-gray-600">Sunny</div>
                        </div>
                      </div>
                    </div>

                    {/* Sensor device */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                      <div className="w-16 h-10 bg-gray-800 rounded-lg flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                    </div>

                    {/* Field info */}
                    <div className="absolute bottom-4 left-4">
                      <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3">
                        <div className="font-semibold text-gray-900">TOMOTO FIELD</div>
                        <div className="text-sm text-gray-600">Area</div>
                        <div className="text-sm text-gray-900">1,2 ha</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Metrics Grid */}
              <div className="h-[360px] min-h-0">
                <MetricsGrid />
              </div>
            </div>

            {/* Right Sidebar - Sensors */}
            <div className="w-80 flex flex-col flex-shrink-0">
              <div className="flex items-center justify-between mb-3 mt-6 flex-shrink-0">
                <h2 className="text-xl font-semibold text-gray-900">Sensor</h2>
                <Button className="bg-[#29513F] hover:bg-green-800">
                  <Plus className="h-4 w-4 mr-2" />
                  Add new
                </Button>
              </div>

              <div className="space-y-3 overflow-y-auto flex-1">
                {sensorData.map((sensor) => (
                  <Card key={sensor.id} className="p-6">
                    <CardContent className="p-0">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-3 h-3 rounded-full mt-1 ${
                              sensor.status === "active"
                                ? "bg-green-500"
                                : sensor.status === "warning"
                                  ? "bg-red-500"
                                  : "bg-gray-400"
                            }`}
                          />
                          <div>
                            <div className="font-medium text-gray-900">Sensor 1: {sensor.name}</div>
                            <div className="text-sm text-gray-500">#{sensor.id}</div>
                            {sensor.warning && (
                              <div className="flex items-center gap-1 mt-1">
                                <div className="w-4 h-4 bg-yellow-100 rounded flex items-center justify-center">
                                  <span className="text-yellow-600 text-xs">⚠</span>
                                </div>
                                <span className="text-xs text-yellow-600">{sensor.warning}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
    </div>
  )
}
