import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function SchedulePage() {
  return (
    <div className="flex gap-4 h-full">
      <div className="flex-1 flex flex-col gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Upcoming Tasks</h2>
              <Button>Add Task</Button>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-gray-700">
              <li>• Water Tomato Field – 06:00</li>
              <li>• Check pH sensor – 09:30</li>
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <h3 className="font-medium text-gray-900 mb-2">Calendar</h3>
            <div className="h-56 bg-gray-100 rounded-lg" />
          </CardContent>
        </Card>
      </div>
      <div className="w-80 flex-shrink-0">
        <Card>
          <CardContent className="p-6">
            <h3 className="font-medium text-gray-900 mb-2">Notes</h3>
            <p className="text-sm text-gray-600">Add reminders and observations here.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

