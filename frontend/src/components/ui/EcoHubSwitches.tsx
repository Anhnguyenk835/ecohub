"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Droplets, Fan, Lightbulb, Power, Wifi, AlertTriangle } from "lucide-react";
import mqtt, { MqttClient } from "mqtt";
import { post } from '@/lib/api';
import { toast } from 'sonner';
/**
 * EcoHub – Circular On/Off Toggles (React + MQTT over WebSocket)
 * - Kết nối MQTT qua WebSocket (NEXT_PUBLIC_MQTT_URL hoặc HiveMQ public).
 * - Subscribe status (retained) để hiển thị đúng ON/OFF ngay khi load.
 * - Publish lệnh khi bấm nút.
 * - Có trạng thái pending và báo offline/online.
 *
 * Dùng:
 *  import dynamic from "next/dynamic";
 *  const EcoHubSwitches = dynamic(() => import("@/components/ui/EcoHubSwitches"), { ssr: false });
 *  <EcoHubSwitches embedded /> // khi nhúng vào một trang khác
 */

const initialActuatorStates: ActuatorStates = {
  Fan: 'OFF',
  Heater: 'OFF',
  WaterPump: 'OFF',
  Light: 'OFF',
};

const deviceControls = [
  { name: 'Pump', deviceKey: 'WaterPump', icon: Droplets, commands: { ON: 'PUMP_WATER_ON', OFF: 'PUMP_WATER_OFF' } },
  { name: 'Fan', deviceKey: 'Fan', icon: Fan, commands: { ON: 'TURN_FAN_ON', OFF: 'TURN_FAN_OFF' } },
  { name: 'Heater', deviceKey: 'Heater', icon: Power, commands: { ON: 'TURN_HEATER_ON', OFF: 'TURN_HEATER_OFF' } },
  { name: 'Light', deviceKey: 'Light', icon: Lightbulb, commands: { ON: 'TURN_LIGHT_ON', OFF: 'TURN_LIGHT_OFF' } },
] as const;

type DeviceIcon = "pump" | "fan" | "light" | "power";

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
  icon: React.ElementType; // Sửa lại để nhận component icon trực tiếp
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

function Pill({ children }: { children: React.ReactNode }) {
  return <div className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs bg-neutral-800 text-neutral-100">{children}</div>;
}

export default function EcoHubSwitches({ zoneId }: { zoneId: string }) {
  const [connected, setConnected] = useState(false);
  const [actuatorStates, setActuatorStates] = useState<ActuatorStates>(initialActuatorStates);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const clientRef = useRef<MqttClient | null>(null);
  const [deviceOnline, setDeviceOnline] = useState(false);

  useEffect(() => {
    if (!zoneId) return;

    const wsUrl = process.env.NEXT_PUBLIC_MQTT_BROKER_URL || "ws://localhost:8884";
    const client = mqtt.connect(wsUrl);
    clientRef.current = client;

    // Lắng nghe topic sensors của zone cụ thể
    const sensorTopic = `ecohub/${zoneId}/sensors`;
    const deviceStatusTopic = `ecohub/${zoneId}/device_status`;

    client.on("connect", () => {
      setConnected(true);
      client.subscribe(sensorTopic, { qos: 1 });
      client.subscribe(deviceStatusTopic, { qos: 1 });
    });

    const setOffline = () => {
      setConnected(false);
      setDeviceOnline(false);
    };

    client.on("reconnect", setOffline);
    client.on("close", setOffline);
    client.on("error", setOffline);

    client.on("message", (topic: string, payload: Uint8Array) => {
      const message = payload.toString();
      if (topic === deviceStatusTopic) {
        console.log(`Device status for ${zoneId}: ${message}`);
        setDeviceOnline(message === 'online');
      }
      if (topic === sensorTopic) {
        try {
          const data = JSON.parse(payload.toString());
          // Đọc trạng thái từ object actuatorStates
          if (data.actuatorStates) {
            setActuatorStates(data.actuatorStates);
            setPending({}); // Xóa pending khi nhận được trạng thái mới
          }
        } catch (e) {
          console.error("Failed to parse sensor data:", e);
        }
      }
    });

    return () => {
      if (clientRef.current) {
        clientRef.current.end(true);
      }
    };
  }, [zoneId]);

  // Hàm gửi lệnh đã được cập nhật
  const sendCommand = async (
    deviceKey: keyof ActuatorStates,
    commands: { ON: string; OFF: string }
  ) => {
    if (!connected || !deviceOnline) {
      toast.error("Cannot send command: Not connected to MQTT.");
      return;
    }

    const currentState = actuatorStates[deviceKey];
    const nextStateOn = currentState !== "ON";
    const commandToSend = nextStateOn ? commands.ON : commands.OFF;

    setPending((p) => ({ ...p, [deviceKey]: true }));

    try {
      // Gửi lệnh qua API
      await post(`/zones/${zoneId}/command`, { command: commandToSend });
      toast.success(`Command '${commandToSend}' sent.`);
    } catch (error) {
      toast.error("Failed to send command.");
      setPending((p) => ({ ...p, [deviceKey]: false }));
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md h-full">
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">EcoHub – Điều khiển thiết bị</h1>
        <div className="flex items-center gap-2">
          {connected ? (
            <Pill>
              <Wifi className="w-4 h-4" />
              <span>MQTT connected</span>
            </Pill>
          ) : (
            <Pill>
              <AlertTriangle className="w-4 h-4" />
              <span>Đang kết nối MQTT…</span>
            </Pill>
          )}
        </div>
      </header>

      <section>
        <h2 className="text-lg font-medium mb-3">Thiết bị</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 justify-items-center">
          {/* Sử dụng cấu trúc dữ liệu mới để render các nút */}
          {deviceControls.map((d) => {
            const isOn = actuatorStates?.[d.deviceKey] === "ON";
            return (
              <div key={d.deviceKey} className="grid place-items-center gap-2">
                <CircleButton
                  label={d.name}
                  icon={d.icon} // Truyền thẳng component icon
                  active={!!isOn}
                  pending={!!pending[d.deviceKey]}
                  disabled={!connected || !actuatorStates}
                  onClick={() => sendCommand(d.deviceKey, d.commands)}
                />
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
