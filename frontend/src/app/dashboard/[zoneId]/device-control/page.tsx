"use client"

import dynamic from "next/dynamic"
import { Card, CardContent } from "@/components/ui/card"
import { useParams } from 'next/navigation'
const EcoHubSwitches = dynamic(() => import("@/components/ui/EcoHubSwitches"), { ssr: false })

export default function DeviceControlPage() {
  const params = useParams<{ zoneId: string }>();
  const zoneId = params?.zoneId;
  if (!zoneId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Loading zone information...</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      <div className="flex-1">
        <EcoHubSwitches zoneId={zoneId} />
      </div>

      <div className="w-80 lg:w-80 flex-shrink-0">
        <Card>
          <CardContent className="p-6">
            <h3 className="font-medium text-gray-900 mb-2">Recent Actions</h3>
            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>Heater status updated</li>
              <li>Fan status updated</li>
            </ul>
            <p className="text-xs text-gray-500 mt-4">* Actions are updated in real-time via MQTT.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


