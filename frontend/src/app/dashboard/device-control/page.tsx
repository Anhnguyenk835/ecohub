"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Flame, Fan, Lightbulb, Droplets } from "lucide-react"

export default function DeviceControlPage() {
  const [heaterOn, setHeaterOn] = useState(false)
  const [fanOn, setFanOn] = useState(false)
  const [lightOn, setLightOn] = useState(false)
  const [irrigationOn, setIrrigationOn] = useState(false)

  const ToggleRow = ({
    title,
    on,
    setOn,
    Icon,
  }: {
    title: string
    on: boolean
    setOn: (next: boolean) => void
    Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon className={`h-6 w-6 ${on ? "text-green-600" : "text-gray-400"}`} />
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setOn(true)} className={on ? "bg-green-700 hover:bg-green-800" : undefined}>
              On
            </Button>
            <Button variant="outline" onClick={() => setOn(false)}>
              Off
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="flex gap-4 h-full">
      <div className="flex-1 flex flex-col gap-4">
        <ToggleRow title="Heater" on={heaterOn} setOn={setHeaterOn} Icon={Flame} />
        <ToggleRow title="Fan" on={fanOn} setOn={setFanOn} Icon={Fan} />
        <ToggleRow title="Light" on={lightOn} setOn={setLightOn} Icon={Lightbulb} />
        <ToggleRow title="Irrigation" on={irrigationOn} setOn={setIrrigationOn} Icon={Droplets} />
      </div>
      <div className="w-80 flex-shrink-0">
        <Card>
          <CardContent className="p-6">
            <h3 className="font-medium text-gray-900 mb-2">Recent Actions</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Toggled heater {heaterOn ? "On" : "Off"}</li>
              <li>• Toggled fan {fanOn ? "On" : "Off"}</li>
              <li>• Toggled light {lightOn ? "On" : "Off"}</li>
              <li>• Toggled irrigation {irrigationOn ? "On" : "Off"}</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

