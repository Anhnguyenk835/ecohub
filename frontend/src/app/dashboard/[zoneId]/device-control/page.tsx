"use client"

import dynamic from "next/dynamic"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useParams } from 'next/navigation'
import { useNotifications } from "@/contexts/NotificationContext";
import { useState, useEffect } from "react"

const EcoHubSwitches = dynamic(() => import("@/components/ui/EcoHubSwitches") as Promise<{ default: 
  React.ComponentType<{ zoneId: string; onAction: (command: string, actionText: string) => void; }> }>, { ssr: false })

export default function DeviceControlPage() {
  const params = useParams<{ zoneId: string }>();
  const zoneId = params?.zoneId;
  const { trackUserAction } = useNotifications();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading time for the dynamic component
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  if (!zoneId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-600">Loading zone information...</span>
        </div>
      </div>
    );
  }

  // 3. Tạo một hàm để truyền xuống
  const handleActionTracking = (command: string, actionText: string) => {
    trackUserAction(zoneId, command, actionText);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      <div className="flex-1">
        {isLoading ? (
          <div className="space-y-6">
            <div className="space-y-4">
              <Skeleton className="h-8 w-48" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="p-6">
                    <CardContent className="p-0 space-y-4">
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-10 w-20" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <EcoHubSwitches zoneId={zoneId} onAction={handleActionTracking} />
        )}
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


