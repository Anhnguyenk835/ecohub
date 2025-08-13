"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Droplets, Fan, Lightbulb, Power, Wifi, AlertTriangle } from "lucide-react";
// import mqtt from "mqtt/dist/mqtt";

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

type DeviceIcon = "pump" | "fan" | "light" | "power";

interface DeviceConfig {
  id: string;
  label: string;
  statusTopic: string;
  commandTopic: string;
  onPayload: string;
  offPayload: string;
  icon: DeviceIcon;
}

const DEVICES: DeviceConfig[] = [
  {
    id: "pump",
    label: 'Pump',
    statusTopic: "ecohub/pump/status",
    commandTopic: "ecohub/area1/commands",
    onPayload: "PUMP_WATER_ON",
    offPayload: "PUMP_WATER_OFF",
    icon: "pump",
  },
  {
    id: "fan",
    label: "Fan",
    statusTopic: "ecohub/fan/status",
    commandTopic: "ecohub/area1/commands",
    onPayload: "TURN_FAN_ON",
    offPayload: "TURN_FAN_OFF",
    icon: "fan",
  },
  {
    id: 'heater',
    label: 'Heater',
    statusTopic: 'ecohub/heater/status',
    commandTopic: 'ecohub/area1/commands',
    onPayload: 'TURN_HEATER_ON',
    offPayload: 'TURN_HEATER_OFF',
    icon: 'power',
  },
  // Thêm đèn sau
];

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
  icon: DeviceIcon;
  onClick: () => void;
  pending?: boolean;
}) {
  const Icon = useMemo(() => {
    switch (icon) {
      case "pump":
        return Droplets;
      case "fan":
        return Fan;
      case "light":
        return Lightbulb;
      default:
        return Power;
    }
  }, [icon]);

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={[
        "relative select-none w-28 h-28 rounded-full grid place-items-center",
        "shadow-lg ring-1 ring-black/5 transition-all",
        active ? "bg-emerald-500 text-white hover:scale-105" : "bg-neutral-800 text-neutral-100 hover:scale-105",
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

export default function EcoHubSwitches({ embedded = false }: { embedded?: boolean }) {
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState<Record<string, "ON" | "OFF" | undefined>>({});
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [lastSensor, setLastSensor] = useState<any>(null);
  const clientRef = useRef<any>(null);

  // URL MQTT (wss/ws). Ví dụ: wss://broker.hivemq.com:8884/mqtt
  const wsUrl = process.env.NEXT_PUBLIC_MQTT_URL || "wss://broker.hivemq.com:8884/mqtt";
  const decoder = useMemo(() => new TextDecoder(), []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const clientId = `ecohub-web-${Math.random().toString(16).slice(2)}`;
    const client = mqtt.connect(wsUrl, {
      clientId,
      keepalive: 30,
      reconnectPeriod: 2000,
      connectTimeout: 5000,
      clean: true,
      // username: process.env.NEXT_PUBLIC_MQTT_USER,
      // password: process.env.NEXT_PUBLIC_MQTT_PASS,
    });
    clientRef.current = client;

    client.on("connect", () => {
      setConnected(true);
      DEVICES.forEach((d) => client.subscribe(d.statusTopic));
      // Tuỳ chọn: nhận strip cảm biến
      client.subscribe("ecohub/area1/sensors");
    });

    const setOffline = () => setConnected(false);
    client.on("reconnect", setOffline);
    client.on("close", setOffline);
    client.on("error", setOffline);

    client.on("message", (topic: string, payload: Uint8Array) => {
      const text = decoder.decode(payload);

      // status thiết bị
      DEVICES.forEach((d) => {
        if (topic === d.statusTopic) {
          setStatus((s) => ({ ...s, [d.id]: text === "ON" ? "ON" : "OFF" }));
          setPending((p) => ({ ...p, [d.id]: false }));
        }
      });

      // strip cảm biến (optional)
      if (topic === "ecohub/area1/sensors") {
        try {
          const j = JSON.parse(text);
          setLastSensor(j);
          if (typeof j.pump_status === "string") {
            setStatus((s) => ({ ...s, pump: j.pump_status === "ON" ? "ON" : "OFF" }));
          }
        } catch {
          /* ignore */
        }
      }
    });

    return () => {
      try {
        client.end(true);
      } catch {}
    };
  }, [wsUrl, decoder]);

  const sendCommand = (d: DeviceConfig, nextOn: boolean) => {
    const client = clientRef.current;
    if (!client || !connected) return;

    setPending((p) => ({ ...p, [d.id]: true }));
    const payload = nextOn ? d.onPayload : d.offPayload;
    client.publish(d.commandTopic, payload, { qos: 0, retain: false });

    // Tự gỡ pending nếu không có ack sau 3s
    setTimeout(() => setPending((p) => ({ ...p, [d.id]: false })), 3000);
  };

  return (
    <div
      className={
        (embedded ? "" : "min-h-screen ") +
        "w-full bg-neutral-900 text-neutral-50 px-6 py-8 rounded-2xl overflow-hidden"
      }
    >
      <div className="max-w-4xl mx-auto grid gap-6">
        <header className="flex items-center justify-between">
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

        {/* Sensor strip (optional) */}
        {lastSensor && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-2xl p-4 bg-neutral-800/70 shadow border border-white/5">
              <div className="text-sm opacity-70">Nhiệt độ</div>
              <div className="text-xl font-medium">{lastSensor.temperature ?? "–"} °C</div>
            </div>
            <div className="rounded-2xl p-4 bg-neutral-800/70 shadow border border-white/5">
              <div className="text-sm opacity-70">Độ ẩm</div>
              <div className="text-xl font-medium">{lastSensor.humidity ?? "–"} %</div>
            </div>
            <div className="rounded-2xl p-4 bg-neutral-800/70 shadow border border-white/5">
              <div className="text-sm opacity-70">Độ ẩm đất</div>
              <div className="text-xl font-medium">{lastSensor.soil_moisture ?? "–"}</div>
            </div>
            <div className="rounded-2xl p-4 bg-neutral-800/70 shadow border border-white/5">
              <div className="text-sm opacity-70">Trạng thái bơm</div>
              <div className="text-xl font-medium">{status.pump ?? "–"}</div>
            </div>
          </div>
        )}

        <section>
          <h2 className="text-lg font-medium mb-3">Thiết bị</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {DEVICES.map((d) => {
              const isOn = status[d.id] === "ON";
              return (
                <div key={d.id} className="grid place-items-center gap-2">
                  <CircleButton
                    label={d.label}
                    icon={d.icon}
                    active={!!isOn}
                    pending={!!pending[d.id]}
                    disabled={!connected}
                    onClick={() => sendCommand(d, !isOn)}
                  />
                </div>
              );
            })}
          </div>
          <div className="text-xs opacity-70 mt-4">
            • Nút hiển thị theo trạng thái thật từ topic status (retained). Khi bấm, web gửi lệnh lên topic
            commands và chờ phản hồi trạng thái để xác nhận. Nếu không có phản hồi trong 3 giây, trạng thái
            pending sẽ tự tắt.
          </div>
        </section>

        <footer className="text-xs opacity-60 pt-8">
        </footer>
      </div>
    </div>
  );
}
