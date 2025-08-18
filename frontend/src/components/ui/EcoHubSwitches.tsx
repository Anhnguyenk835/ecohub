"use client";

import React, { useState } from "react";
import { Droplets, Fan, Lightbulb, Power, Wifi, AlertTriangle } from "lucide-react";
import { post } from '@/lib/api';
import { toast } from 'sonner';
import { useMqtt } from "@/contexts/MqttContext";

/**
 * EcoHub – Circular On/Off Toggles
 * - Component này hiển thị các nút điều khiển thiết bị cho một zone cụ thể.
 * - Nó lấy trạng thái thời gian thực từ MqttContext toàn cục.
 * - Gửi lệnh điều khiển qua API khi người dùng nhấn nút.
 * - Hiển thị trạng thái pending và vô hiệu hóa nút khi offline.
 */

// Định nghĩa kiểu dữ liệu cho trạng thái của các thiết bị
type ActuatorStates = {
  Fan: 'ON' | 'OFF';
  Heater: 'ON' | 'OFF';
  WaterPump: 'ON' | 'OFF';
  Light: 'ON' | 'OFF';
};

// Trạng thái khởi tạo mặc định
const initialActuatorStates: ActuatorStates = {
  Fan: 'OFF',
  Heater: 'OFF',
  WaterPump: 'OFF',
  Light: 'OFF',
};

// Cấu hình cho các nút điều khiển
const deviceControls = [
  { 
    name: 'Pump', 
    deviceKey: 'WaterPump', 
    icon: Droplets, 
    commands: { ON: 'PUMP_WATER_ON', OFF: 'PUMP_WATER_OFF' }, 
    text: { ON: 'Turning on Pump...', OFF: 'Turning off Pump...' } 
  },
  { 
    name: 'Fan', 
    deviceKey: 'Fan', 
    icon: Fan, 
    commands: { ON: 'TURN_FAN_ON', OFF: 'TURN_FAN_OFF' }, 
    text: { ON: 'Turning on Fan...', OFF: 'Turning off Fan...' } 
  },
  { 
    name: 'Heater', 
    deviceKey: 'Heater', 
    icon: Power, 
    commands: { ON: 'TURN_HEATER_ON', OFF: 'TURN_HEATER_OFF' }, 
    text: { ON: 'Turning on Heater...', OFF: 'Turning off Heater...' } 
  },
  { 
    name: 'Light', 
    deviceKey: 'Light', 
    icon: Lightbulb, 
    commands: { ON: 'TURN_LIGHT_ON', OFF: 'TURN_LIGHT_OFF' }, 
    text: { ON: 'Turning on Light...', OFF: 'Turning off Light...' } 
  },
] as const;


// Component nút bấm hình tròn
function CircleButton({
  active,
  disabled,
  label,
  icon,
  onClick,
  pending,
}: {
  active: boolean;
  disabled?: boolean;
  label: string;
  icon: React.ElementType;
  onClick: () => void;
  pending?: boolean;
}) {
  const Icon = icon;
  return (
    <button
      onClick={onClick}
      disabled={disabled || pending}
      aria-pressed={active}
      className={[
        "relative select-none w-40 h-40 rounded-full grid place-items-center",
        "shadow-lg ring-2 transition-all duration-200 ease-out",
        active
          ? "bg-green-400 text-white ring-green-400 hover:scale-105"
          : "bg-red-400 text-white ring-red-400 hover:scale-105",
        disabled ? "opacity-50 cursor-not-allowed hover:scale-100" : "",
      ].join(" ")}
    >
      <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-white/10 to-black/10 blur-sm" />
      <div className="relative grid place-items-center gap-1">
        <Icon className="w-8 h-8" />
        <span className="text-sm font-medium">{label}</span>
        <span className="text-[10px] tracking-wider uppercase opacity-80">{pending ? "…" : active ? "ON" : "OFF"}</span>
      </div>
    </button>
  );
}

// Component hiển thị trạng thái kết nối
function Pill({ children }: { children: React.ReactNode }) {
  return <div className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs bg-neutral-800 text-neutral-100">{children}</div>;
}


// Component chính
export default function EcoHubSwitches({ zoneId, onAction }: { zoneId: string, onAction?: (command: string, actionText: string) => void;}) {
  // Lấy state toàn cục từ MqttContext
  const { connected, actuatorStates, deviceOnlineStatus } = useMqtt();
  
  // State `pending` là state cục bộ, chỉ dùng để hiển thị UI tạm thời
  const [pending, setPending] = useState<Record<string, boolean>>({});

  // Trích xuất dữ liệu cho zone hiện tại từ state toàn cục
  const zoneActuatorStates = actuatorStates[zoneId] || initialActuatorStates;
  const isDeviceOnline = deviceOnlineStatus[zoneId] || false;

  // Hàm gửi lệnh khi người dùng nhấn nút
  const sendCommand = async (
    deviceKey: keyof ActuatorStates,
    commands: { ON: string; OFF: string },
    text: { ON: string; OFF: string }
  ) => {
    // Kiểm tra trạng thái kết nối và thiết bị từ context
    if (!connected || !isDeviceOnline) {
      toast("Cannot send command: Device is offline or not connected.", {
        description: "Please check the device connection and try again.",
      });
      return;
    }

    const currentState = zoneActuatorStates[deviceKey];
    const nextStateOn = currentState !== "ON";
    const commandToSend = nextStateOn ? commands.ON : commands.OFF;
    const actionText = nextStateOn ? text.ON : text.OFF;

    setPending((p) => ({ ...p, [deviceKey]: true }));
    
    // Gọi hàm onAction (nếu có) để tích hợp với hệ thống thông báo
    if (onAction) {
      onAction(commandToSend, actionText);
    }

    try {
      // Gửi lệnh qua API
      await post(`/zones/${zoneId}/command`, { command: commandToSend });
    } catch (error) {
      toast("Failed to send command.", { type: "error" });
      // Rollback trạng thái pending nếu gửi API thất bại
      setPending((p) => ({ ...p, [deviceKey]: false }));
    } finally {
      // Đặt một timeout để gỡ trạng thái pending, phòng trường hợp
      // tin nhắn MQTT phản hồi bị mất và nút bị kẹt ở trạng thái loading
      setTimeout(() => {
        setPending((p) => ({ ...p, [deviceKey]: false }));
      }, 5000); // 5 giây
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md h-full">
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">EcoHub – Device Control</h1>
        <div className="flex items-center gap-2">
          {/* Hiển thị trạng thái kết nối MQTT toàn cục */}
          {connected ? (
            <Pill>
              <Wifi className="w-4 h-4" />
              <span>MQTT connected</span>
            </Pill>
          ) : (
            <Pill>
              <AlertTriangle className="w-4 h-4" />
              <span>Connecting to MQTT...</span>
            </Pill>
          )}
        </div>
      </header>

      <section>
        <h2 className="text-lg font-medium mb-3">Actuators</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 justify-items-center">
          {deviceControls.map((d) => {
            // Lấy trạng thái ON/OFF từ state của zone cụ thể
            const isOn = zoneActuatorStates?.[d.deviceKey] === "ON";
            return (
              <div key={d.deviceKey} className="grid place-items-center gap-2">
                <CircleButton
                  label={d.name}
                  icon={d.icon}
                  active={!!isOn}
                  pending={!!pending[d.deviceKey]}
                  // Vô hiệu hóa nút nếu mất kết nối MQTT hoặc thiết bị của zone này offline
                  disabled={!connected || !isDeviceOnline}
                  onClick={() => sendCommand(d.deviceKey, d.commands, d.text)}
                />
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}