import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function SettingsPage() {
  return (
    <div className="flex gap-4 h-full">
      <div className="flex-1 flex flex-col gap-4">
        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Profile</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input className="border rounded-md px-3 py-2" placeholder="Full name" />
              <input className="border rounded-md px-3 py-2" placeholder="Email" />
            </div>
            <Button className="self-start">Save</Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Preferences</h2>
            <div className="text-sm text-gray-700">Theme, notifications, and language settings.</div>
          </CardContent>
        </Card>
      </div>
      <div className="w-80 flex-shrink-0">
        <Card>
          <CardContent className="p-6">
            <h3 className="font-medium text-gray-900 mb-2">Account</h3>
            <Button variant="outline">Sign out</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


