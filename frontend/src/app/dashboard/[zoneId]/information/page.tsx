"use client"

import { useEffect, useMemo, useState, useRef } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import MetricsGrid, { type ZoneStatusReadings } from "@/components/layout/metrics-grid"
import ZoneMap from "@/components/ui/zone-map"
import { get } from "@/lib/api"
import mqtt from "mqtt"
import { Leaf, MapPin, Clock, Activity, CheckCircle, AlertTriangle, XCircle } from "lucide-react"

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

type ZoneInfo = {
  id: string
  name: string
  location?: string
  createdAt?: string
}

export default function ZoneInformationPage() {
  const params = useParams<{ zoneId: string }>()
  const zoneId = params?.zoneId

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [zoneStatus, setZoneStatus] = useState<ZoneStatusResponse | null>(null)
  const [zoneInfo, setZoneInfo] = useState<ZoneInfo | null>(null)
  const clientRef = useRef<any>(null)

  // Fetch zone information
  useEffect(() => {
    let cancelled = false
    async function fetchZoneInfo() {
      if (!zoneId) return
      try {
        const data = await get<ZoneInfo>(`/zones/${encodeURIComponent(zoneId)}`)
        if (!cancelled) setZoneInfo(data)
      } catch (e) {
        console.error("Failed to load zone info:", e)
        // Set default zone info if API fails
        if (!cancelled) setZoneInfo({ id: zoneId, name: `Zone ${zoneId}` })
      }
    }
    fetchZoneInfo()
    return () => { cancelled = true }
  }, [zoneId])

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

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'good':
      case 'healthy':
      case 'normal':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'warning':
      case 'caution':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />
      case 'danger':
      case 'critical':
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />
      default:
        return <Activity className="w-5 h-5 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'good':
      case 'healthy':
      case 'normal':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'warning':
      case 'caution':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'danger':
      case 'critical':
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="flex gap-4 h-[100%]">
      <div className="flex-1 flex flex-col">
        <Card className="mb-4 h-[50%] border-0 shadow-lg bg-gradient-to-br from-white to-gray-50">
          <CardContent className="px-6 py-3 flex flex-col h-full">
            {loading ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <Skeleton className="h-8 w-48" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-40" />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Skeleton className="w-4 h-4" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="flex-1 min-h-0 rounded-lg" />
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-full space-y-2">
                {/* Header Section */}
                <div className="flex items-start justify-between flex-shrink-0">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                      <Leaf className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900">
                        {zoneInfo?.name || `Zone ${zoneId}`}
                      </h1>
                      {zoneInfo?.location && (
                        <div className="flex items-center space-x-2 text-gray-600 mt-1">
                          <MapPin className="w-4 h-4" />
                          <span className="text-sm">{zoneInfo.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Status Badge */}
                  {overallStatus && (
                    <div className={`flex items-center space-x-2 px-4 py-2 rounded-full border ${getStatusColor(overallStatus)}`}>
                      {getStatusIcon(overallStatus)}
                      <span className="font-medium text-sm capitalize">{overallStatus}</span>
                    </div>
                  )}
                </div>

                {/* Zone Map */}
                <div className="flex-1 min-h-0 flex flex-col">
                  <ZoneMap 
                    zoneName={zoneInfo?.name || `Zone ${zoneId}`}
                    location={zoneInfo?.location}
                  />
                </div>

                {/* Error Display */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex-shrink-0">
                    <div className="flex items-center space-x-2 text-red-800">
                      <XCircle className="w-5 h-5" />
                      <span className="font-medium">Error: {error}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="h-[50%] min-h-0 overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-gray-500">Live updates</span>
            </div>
          </div>
          <div className="h-[calc(100%-2rem)]">
            {loading ? (
              <div className="grid grid-cols-3 gap-2 h-full">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="p-4">
                    <CardContent className="p-0 space-y-3">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-8 w-16" />
                      <Skeleton className="h-3 w-24" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <MetricsGrid readings={readings} overallStatus={overallStatus} zoneId={zoneId} />
            )}
          </div>
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


