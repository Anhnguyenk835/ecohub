"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Wind, Thermometer, Droplets, TestTube, Waves, Leaf, ExternalLink } from "lucide-react"
import ChartPopup from "@/components/ui/chart-popup"

interface MetricCardProps {
  title: string
  value: string
  unit?: string
  description: string
  icon: React.ReactNode
  variant?: "default" | "success"
  badge?: string
  onClick?: () => void
  clickable?: boolean
}

function MetricCard({ title, value, unit, description, icon, variant = "default", badge, onClick, clickable }: MetricCardProps) {
  return (
    <Card 
      className={`relative ${variant === "success" ? "bg-green-600 text-white" : "bg-white"} h-full ${clickable ? "cursor-pointer hover:shadow-lg hover:bg-green-50 transition-all duration-200" : ""} overflow-hidden`}
      onClick={clickable ? onClick : undefined}
    >
      <CardContent className="px-4 h-full flex flex-col justify-between min-h-0">
        <div className="flex items-start justify-between mb-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className={`p-0.5 rounded`}>{icon}</div>
            <h3 className={`text-sm font-medium ${variant === "success" ? "text-white" : "text-gray-600"} line-clamp-1`}>
              {title}
            </h3>
          </div>
          <ExternalLink className={`h-2.5 w-2.5 ${variant === "success" ? "text-white" : "text-gray-400"}`} />
        </div>

        <div className="flex-1 flex flex-col justify-center min-h-0">
          <div className="flex items-baseline gap-1 mb-3">
            <span className={`text-base font-bold ${variant === "success" ? "text-white" : "text-gray-900"}`}>
              {value}
            </span>
            {unit && (
              <span className={`text-xs ${variant === "success" ? "text-white" : "text-gray-600"}`}>{unit}</span>
            )}
            {badge && (
              <span className="ml-1 px-1 py-0.5 bg-white text-green-600 text-xs font-medium rounded">{badge}</span>
            )}
          </div>

          <p
            className={`text-xs leading-tight ${variant === "success" ? "text-green-100" : "text-gray-500"} line-clamp-2 flex-1`}
          >
            {description}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export type ZoneStatusReadings = {
  temperature?: number
  airHumidity?: number
  soilMoisture?: number
  pH?: number
  lightIntensity?: number
  co2?: number
}

export default function MetricsGrid({
  readings,
  overallStatus,
  zoneId,
}: {
  readings?: Partial<ZoneStatusReadings>
  overallStatus?: string
  zoneId?: string
}) {
  const [chartPopup, setChartPopup] = useState<{
    isOpen: boolean
    metricType: string
    metricTitle: string
    metricUnit?: string
  }>({
    isOpen: false,
    metricType: "",
    metricTitle: "",
    metricUnit: ""
  })

  const openChart = (metricType: string, metricTitle: string, metricUnit?: string) => {
    setChartPopup({
      isOpen: true,
      metricType,
      metricTitle,
      metricUnit
    })
  }

  const closeChart = () => {
    setChartPopup({
      isOpen: false,
      metricType: "",
      metricTitle: "",
      metricUnit: ""
    })
  }
  const formatNumber = (value: number | undefined, fractionDigits = 0): string => {
    if (value === undefined || value === null || Number.isNaN(value)) return "—"
    return value.toFixed(fractionDigits)
  }

  const metrics = [
    {
      title: "Health",
      value: overallStatus ?? "—",
      description: "Overall field condition",
      icon: <Leaf className="h-5 w-5" />,
      variant: overallStatus ? (overallStatus.toLowerCase().includes("good") ? ("success" as const) : ("default" as const)) : ("default" as const),
      badge: overallStatus ? undefined : undefined,
      clickable: false, // Health metric is not clickable
    },
    {
      title: "Temperature",
      value: `${formatNumber(readings?.temperature, 1)}`,
      unit: "°C",
      description: "Maintain temperature consistent",
      icon: <Thermometer className="h-5 w-5" />,
      clickable: true,
      metricType: "temperature",
      onClick: () => openChart("temperature", "Temperature", "°C"),
    },
    {
      title: "Humidity",
      value: `${formatNumber(readings?.airHumidity)}`,
      unit: "%",
      description: "Ensure ventilation is sufficient to prevent mold growth",
      icon: <Droplets className="h-5 w-5" />,
      clickable: true,
      metricType: "airHumidity", 
      onClick: () => openChart("airHumidity", "Air Humidity", "%"),
    },
    {
      title: "Soil moisture",
      value: `${formatNumber(readings?.soilMoisture)}`,
      unit: "%",
      description: "Keep monitoring to ensure it remains consistent",
      icon: <Waves className="h-5 w-5" />,
      clickable: true,
      metricType: "soilMoisture",
      onClick: () => openChart("soilMoisture", "Soil Moisture", "%"),
    },
    {
      title: "pH Level",
      value: `${formatNumber(readings?.pH, 1)}`,
      description: "Add acid compost to balance the pH",
      icon: <TestTube className="h-5 w-5" />,
      clickable: true,
      metricType: "ph",
      onClick: () => openChart("ph", "ph Level"),
    },
    {
      title: "Light",
      value: `${formatNumber(readings?.lightIntensity)}`,
      description: "Lighting level",
      icon: <Wind className="h-5 w-5" />,
      clickable: true,
      metricType: "lightIntensity",
      onClick: () => openChart("lightIntensity", "Light Intensity"),
    },
  ]

  return (
    <>
      <div className="grid grid-cols-3 gap-2 h-full overflow-hidden">
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
            clickable={metric.clickable}
            onClick={metric.onClick}
          />
        ))}
      </div>
      
      {zoneId && (
        <ChartPopup
          isOpen={chartPopup.isOpen}
          onClose={closeChart}
          zoneId={zoneId}
          metricType={chartPopup.metricType}
          metricTitle={chartPopup.metricTitle}
          metricUnit={chartPopup.metricUnit}
        />
      )}
    </>
  )
}
