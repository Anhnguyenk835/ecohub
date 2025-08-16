"use client"

import { useEffect, useMemo, useState, useRef } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import MetricsGrid, { type ZoneStatusReadings } from "@/components/layout/metrics-grid"
import { get } from "@/lib/api"
import mqtt from "mqtt"

type ZoneStatusResponse = {
  status?: string
  lastUpdated?: string | number
  lastReadings?: {
    temperature?: number
    airHumidity?: number
    soilMoisture?: number
    lightIntensity?: number
    pH?: number
    co2?: number
  }
}

export default function ZoneInformationPage() {
  const params = useParams<{ zoneId: string }>()
  const zoneId = params?.zoneId

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [zoneStatus, setZoneStatus] = useState<ZoneStatusResponse | null>(null)
  const clientRef = useRef<any>(null)

  // Initial data fetch
  useEffect(() => {
    let cancelled = false
    async function fetchStatus() {
      if (!zoneId) return
      setLoading(true)
      setError(null)
      try {
        const data = await get<ZoneStatusResponse>(`/zones/${encodeURIComponent(zoneId)}/status/`)
        if (!cancelled) setZoneStatus(data)
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to load zone status"
        if (!cancelled) setError(message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchStatus()
    return () => {
      cancelled = true
    }
  }, [zoneId])

  // Real-time MQTT updates
  useEffect(() => {
    if (!zoneId) return

    const wsUrl = process.env.NEXT_PUBLIC_MQTT_BROKER_URL || "ws://localhost:8884"
    const client = mqtt.connect(wsUrl)
    clientRef.current = client

    // Subscribe to zone-specific status updates
    const statusTopic = `ecohub/zones/${zoneId}/status_update`

    client.on("connect", () => {
      console.log(`MQTT connected for zone ${zoneId} status updates`)
      client.subscribe(statusTopic, { qos: 1 })
    })

    client.on("message", (topic: string, payload: Buffer) => {
      if (topic === statusTopic) {
        try {
          const updatedStatusData = JSON.parse(payload.toString())
          console.log(`Received real-time update for zone ${zoneId}:`, updatedStatusData)
          
          // Update zone status with real-time data
          setZoneStatus(prevStatus => ({
            ...prevStatus,
            status: updatedStatusData.status || prevStatus?.status,
            lastUpdated: updatedStatusData.lastUpdated || prevStatus?.lastUpdated,
            lastReadings: {
              ...prevStatus?.lastReadings,
              ...updatedStatusData.lastReadings
            }
          }))
        } catch (e) {
          console.error("Error processing real-time status update:", e)
        }
      }
    })

    client.on("error", (err) => {
      console.error("MQTT error:", err)
    })

    return () => {
      if (clientRef.current) {
        clientRef.current.end(true)
      }
    }
  }, [zoneId])

  const readings: Partial<ZoneStatusReadings> | undefined = useMemo(() => zoneStatus?.lastReadings, [zoneStatus])
  const overallStatus = zoneStatus?.status

  const formattedUpdated = useMemo(() => {
    const value = zoneStatus?.lastUpdated
    if (!value) return null
    const date = typeof value === "number" ? new Date(value) : new Date(value)
    if (isNaN(date.getTime())) return null
    return date.toLocaleString()
  }, [zoneStatus?.lastUpdated])

  // Real-time timestamp for live updates
  const [liveTimestamp, setLiveTimestamp] = useState<string>("")
  
  useEffect(() => {
    if (zoneStatus?.lastUpdated) {
      const updateTimestamp = () => {
        const value = zoneStatus.lastUpdated
        if (!value) return
        const date = typeof value === "number" ? new Date(value) : new Date(value)
        if (!isNaN(date.getTime())) {
          setLiveTimestamp(date.toLocaleString())
        }
      }
      
      updateTimestamp()
      const interval = setInterval(updateTimestamp, 1000) // Update every second
      return () => clearInterval(interval)
    }
  }, [zoneStatus?.lastUpdated])

  return (
    <div className="flex gap-4 h-[95%]">
      <div className="flex-1 flex flex-col">
        <Card className="mb-4 flex-[3] min-h-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xl font-semibold text-gray-900">Zone {zoneId}</div>
                {overallStatus && (
                  <div className="text-sm text-gray-600">Status: {overallStatus}</div>
                )}
                {formattedUpdated && (
                  <div className="text-xs text-gray-500">
                    Last updated: {formattedUpdated}
                    {liveTimestamp && liveTimestamp !== formattedUpdated && (
                      <span className="ml-2 text-green-600">• Live: {liveTimestamp}</span>
                    )}
                  </div>
                )}
              </div>
              {loading && <div className="text-sm text-gray-500">Loading…</div>}
              {error && <div className="text-sm text-red-600">{error}</div>}
            </div>
          </CardContent>
        </Card>

        <div className="h-[360px] min-h-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-gray-500">Live updates</span>
            </div>
          </div>
          <MetricsGrid readings={readings} overallStatus={overallStatus} zoneId={zoneId} />
        </div>
      </div>

      {/* Keep original sensor sidebar UI from the generic dashboard */}
      <div className="w-80 flex flex-col flex-shrink-0">
        <div className="flex items-center justify-between mb-3 mt-6 flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900">Sensor</h2>
        </div>
        <div className="space-y-3 overflow-y-auto flex-1 pr-1">
          {[{ id: "W001", name: "Wind sensor", status: "active" },
            { id: "T001", name: "Temperature sensor", status: "active" },
            { id: "PH001", name: "pH sensor", status: "warning", warning: "Signal issue since 05:02 AM" },
            { id: "H001", name: "Humidity sensor", status: "active" },
            { id: "S001", name: "Soil sensor", status: "active" }].map((sensor: { id: string; name: string; status: string; warning?: string }) => (
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


