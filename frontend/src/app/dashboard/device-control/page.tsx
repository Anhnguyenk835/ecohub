"use client";

import dynamic from "next/dynamic";
import { Card, CardContent } from "@/components/ui/card";

// Dynamic import để dùng MQTT client-side
const EcoHubSwitches = dynamic(() => import("@/components/ui/EcoHubSwitches"), {
  ssr: false,
});

export default function DeviceControlPage() {
  return (
    <div className="flex gap-6 h-full">
      {/* Cột điều khiển thiết bị (nút tròn) */}
      <div className="flex-1">
        <EcoHubSwitches embedded />
      </div>

      {/* Cột Recent Actions */}
      <div className="w-80 flex-shrink-0">
        <Card>
          <CardContent className="p-6">
            <h3 className="font-medium text-gray-900 mb-2">Recent Actions</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Toggled heater (theo trạng thái thực tế)</li>
              <li>• Toggled fan (theo trạng thái thực tế)</li>
              <li>• Toggled light (nếu thêm)</li>
              <li>• Toggled irrigation</li>
            </ul>
            <p className="text-xs text-muted-foreground mt-2">
              * Hành động được cập nhật trực tiếp qua MQTT status topics.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
