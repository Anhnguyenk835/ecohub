import type React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Wind, Thermometer, Droplets, TestTube, Waves, Leaf, ExternalLink } from "lucide-react"

interface MetricCardProps {
  title: string
  value: string
  unit?: string
  description: string
  icon: React.ReactNode
  variant?: "default" | "success"
  badge?: string
}

function MetricCard({ title, value, unit, description, icon, variant = "default", badge }: MetricCardProps) {
  return (
    <Card className={`relative ${variant === "success" ? "bg-green-600 text-white" : "bg-white"} h-full`}>
      <CardContent className="px-6 h-full flex flex-col justify-between">
        <div className="flex items-start justify-between mb-1">
          <div className={`p-1 rounded`}>{icon}</div>
          <ExternalLink className={`h-3 w-3 ${variant === "success" ? "text-white" : "text-gray-400"}`} />
        </div>

        <div className="flex-1 flex flex-col justify-center">
          <h3 className={`text-md font-medium mb-1 ${variant === "success" ? "text-white" : "text-gray-600"}`}>
            {title}
          </h3>

          <div className="flex items-baseline gap-1 mb-3">
            <span className={`text-lg font-bold ${variant === "success" ? "text-white" : "text-gray-900"}`}>
              {value}
            </span>
            {unit && (
              <span className={`text-sm ${variant === "success" ? "text-white" : "text-gray-600"}`}>{unit}</span>
            )}
            {badge && (
              <span className="ml-1 px-1 py-0.5 bg-white text-green-600 text-xs font-medium rounded">{badge}</span>
            )}
          </div>

          <p
            className={`text-xs leading-tight ${variant === "success" ? "text-green-100" : "text-gray-500"} line-clamp-2`}
          >
            {description}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function MetricsGrid() {
  const metrics = [
    {
      title: "Health",
      value: "92",
      unit: "%",
      description: "Excellent health",
      icon: <Leaf className="h-6 w-6" />,
      variant: "success" as const,
      badge: "Good",
    },
    {
      title: "Wind",
      value: "2",
      unit: "m/s",
      description: "Make sure there is still adequate airflow",
      icon: <Wind className="h-6 w-6" />,
    },
    {
      title: "Temperature",
      value: "25",
      unit: "°C",
      description: "Maintain temperature consistent",
      icon: <Thermometer className="h-6 w-6" />,
    },
    {
      title: "pH Level",
      value: "7.6",
      description: "Add acid compost to balance the pH",
      icon: <TestTube className="h-6 w-6" />,
    },
    {
      title: "Humidity",
      value: "82",
      unit: "%",
      description: "Ensure ventilation is sufficient to prevent mold growth",
      icon: <Droplets className="h-6 w-6" />,
    },
    {
      title: "Soil moisture",
      value: "62",
      unit: "%",
      description: "Keep monitoring to ensure it remains consistent",
      icon: <Waves className="h-6 w-6" />,
    },
  ]

  return (
    <div className="grid grid-cols-3 gap-2 h-full">
      {metrics.map((metric, index) => (
        <MetricCard
          key={index}
          title={metric.title}
          value={metric.value}
          unit={metric.unit}
          description={metric.description}
          icon={metric.icon}
          variant={metric.variant}
          badge={metric.badge}
        />
      ))}
    </div>
  )
}
