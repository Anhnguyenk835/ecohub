"use client"

import { useState, useEffect, useRef } from "react"
import { X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import 'chartjs-adapter-date-fns'
import zoomPlugin from 'chartjs-plugin-zoom'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { get } from "@/lib/api"

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  zoomPlugin
)

interface HistoricalDataPoint {
  id: string
  sensorId: string
  zoneId: string
  type: string
  value: number
  readAt: string
}

interface ChartPopupProps {
  isOpen: boolean
  onClose: () => void
  zoneId: string
  metricType: string
  metricTitle: string
  metricUnit?: string
}

export default function ChartPopup({ 
  isOpen, 
  onClose, 
  zoneId, 
  metricType, 
  metricTitle, 
  metricUnit 
}: ChartPopupProps) {
  const [allData, setAllData] = useState<HistoricalDataPoint[]>([])
  const [filteredData, setFilteredData] = useState<HistoricalDataPoint[]>([])
  const [timeFilter, setTimeFilter] = useState<'hours' | 'day' | 'month' | 'all'>('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chartRef, setChartRef] = useState<any>(null)
  const popupRef = useRef<HTMLDivElement>(null)

  // Handle click outside to close popup
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        popupRef.current &&
        !popupRef.current.contains(event.target as Node)
      ) {
        onClose()
      }
    };

    // Add event listener
    document.addEventListener('mousedown', handleClickOutside);

    // Cleanup
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !zoneId || !metricType) {
      console.log("Skipping fetch - missing required params:", { isOpen, zoneId, metricType })
      return
    }

    let cancelled = false
    async function fetchHistoricalData() {
      setLoading(true)
      setError(null)
      try {
        const url = `/readings_history/?zone_id=${encodeURIComponent(zoneId)}&type=${encodeURIComponent(metricType)}`
        console.log("Fetching historical data from:", url)
        console.log("Zone ID:", zoneId, "Metric Type:", metricType)
        
        const response = await get<HistoricalDataPoint[]>(url)
        console.log("API Response:", response)
        console.log("Response length:", response?.length || 0)
        
        // If no data, show some mock data for testing
        
        if (!cancelled) {
          // Sort data by timestamp for proper display - show ALL data
          const sortedData = response
            .sort((a, b) => new Date(a.readAt).getTime() - new Date(b.readAt).getTime())
          
          console.log("Chart data:", sortedData)
          setAllData(sortedData)
          setFilteredData(sortedData) // Initially show all data
        }
      } catch (e) {
        console.error("Error fetching historical data:", e)
        const message = e instanceof Error ? e.message : "Failed to load historical data"
        if (!cancelled) setError(message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchHistoricalData()
    return () => {
      cancelled = true
    }
  }, [isOpen, zoneId, metricType])

  // Filter data based on time period
  useEffect(() => {
    if (allData.length === 0) return

    const now = new Date()
    let filtered = allData

    switch (timeFilter) {
      case 'hours':
        // Last 24 hours
        const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        filtered = allData.filter(item => new Date(item.readAt) >= last24Hours)
        break
      case 'day':
        // Last 7 days
        const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        filtered = allData.filter(item => new Date(item.readAt) >= last7Days)
        break
      case 'month':
        // Last 30 days
        const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        filtered = allData.filter(item => new Date(item.readAt) >= last30Days)
        break
      case 'all':
      default:
        filtered = allData
        break
    }

    setFilteredData(filtered)
  }, [allData, timeFilter])

  // Chart.js zoom controls
  const handleZoomIn = () => {
    if (chartRef) {
      chartRef.zoom(1.1)
    }
  }

  const handleZoomOut = () => {
    if (chartRef) {
      chartRef.zoom(0.9)
    }
  }

  const handleResetZoom = () => {
    if (chartRef) {
      chartRef.resetZoom()
    }
  }

  // Prepare chart data
  const chartData = {
    labels: filteredData.map(item => new Date(item.readAt)),
    datasets: [
      {
        label: metricTitle,
        data: filteredData.map(item => ({
          x: new Date(item.readAt),
          y: item.value
        })),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.1,
      },
    ],
  }

  // Determine time unit based on filter
  const getTimeUnit = () => {
    switch (timeFilter) {
      case 'hours': return 'hour'
      case 'day': return 'day'
      case 'month': return 'day'
      case 'all': return 'day'
      default: return 'hour'
    }
  }

  // Chart.js

  // Chart.js options with zoom functionality
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: `${metricTitle} Over Time`,
      },
      tooltip: {
        callbacks: {
          label: function(context: { parsed: { y: number } }) {
            return `${metricTitle}: ${context.parsed.y.toFixed(2)}${metricUnit ? ` ${metricUnit}` : ''}`
          }
        }
      },
      zoom: {
        zoom: {
          wheel: {
            enabled: true,
          },
          pinch: {
            enabled: true
          },
          mode: 'x' as const,
        },
        pan: {
          enabled: true,
          mode: 'x' as const,
        }
      }
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          unit: getTimeUnit() as any,
          displayFormats: {
            hour: 'MMM dd, HH:mm',
            day: 'MMM dd',
            month: 'MMM yyyy'
          },
          tooltipFormat: 'MMM dd, yyyy HH:mm'
        },
        title: {
          display: true,
        },
        ticks: {
          maxTicksLimit: 10,
          autoSkip: true
        }
      },
      y: {
        title: {
          display: true,
          text: metricUnit ? `${metricTitle} (${metricUnit})` : metricTitle
        }
      }
    },
    interaction: {
      intersect: false,
    },
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-1001 p-4">
        <Card ref={popupRef} className="w-full max-w-4xl max-h-[90vh] bg-white relative">
          {/* Close button - Top right corner */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors z-10"
          >
            <X className="h-6 w-6 cursor-pointer" />
          </button>
          
          <CardContent className="p-10">
            <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {/* {metricTitle} History - Zone {zoneId} */}
              {metricTitle} History
            </h2>
            <div className="flex items-center gap-2">
              {/* Left side: Time Filter Controls */}
              <div className="flex flex-col gap-2 mr-4">
                {/* Time filter buttons */}
                <div className="flex gap-3">
                  <Button
                    variant={timeFilter === 'hours' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTimeFilter('hours')}
                    disabled={loading || allData.length === 0}
                    className="cursor-pointer"
                  >
                    24H
                  </Button>
                  <Button
                    variant={timeFilter === 'day' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTimeFilter('day')}
                    disabled={loading || allData.length === 0}
                    className="cursor-pointer"
                  >
                    7D
                  </Button>
                  <Button
                    variant={timeFilter === 'month' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTimeFilter('month')}
                    disabled={loading || allData.length === 0}
                    className="cursor-pointer"
                  >
                    30D
                  </Button>
                  <Button
                    variant={timeFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTimeFilter('all')}
                    disabled={loading || allData.length === 0}
                    className="cursor-pointer"
                  >
                    All
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Zoom controls */}
          <div className="flex gap-5 justify-center mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomIn}
              disabled={loading || filteredData.length === 0}
              className="flex items-center gap-1 cursor-pointer"
            >
              <ZoomIn className="h-4 w-4" />
              Zoom In
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomOut}
              disabled={loading || filteredData.length === 0}
              className="flex items-center gap-1 cursor-pointer"
            >
              <ZoomOut className="h-4 w-4" />
              Zoom Out
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetZoom}
              disabled={loading || filteredData.length === 0}
              className="flex items-center gap-1 cursor-pointer"
              >
            <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          </div>
          <div className="h-96 relative"
               onWheel={(e) => e.preventDefault()} // Prevent page scroll when zooming
          >
            {loading && (
              <div className="flex items-center justify-center h-full">
                <div className="text-gray-500">Loading historical data...</div>
              </div>
            )}

            {error && (
              <div className="flex items-center justify-center h-full">
                <div className="text-red-600">{error}</div>
              </div>
            )}

            {!loading && !error && filteredData.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <div className="text-gray-500">No data available for selected time period</div>
              </div>
            )}

            {!loading && !error && filteredData.length > 0 && (
              <Line
                ref={(ref) => setChartRef(ref || null)}
                data={chartData}
                options={chartOptions}
              />
            )}
          </div>

          {!loading && !error && filteredData.length > 0 && (
            <div className="mt-4 text-sm text-gray-600 text-center">
              Showing {filteredData.length} of {allData.length} readings • Use mouse wheel to zoom • Click and drag to pan
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
