'use client';

import React, { createContext, useState, useContext, ReactNode, useEffect, useRef } from 'react';
import mqtt, { MqttClient } from 'mqtt';

// Định nghĩa các kiểu dữ liệu
type ActuatorStates = {
  Fan: 'ON' | 'OFF';
  Heater: 'ON' | 'OFF';
  WaterPump: 'ON' | 'OFF';
  Light: 'ON' | 'OFF';
};

// State sẽ được lưu trữ theo zoneId
type ZoneActuatorStates = Record<string, ActuatorStates>;
type ZoneDeviceStatus = Record<string, boolean>;

interface MqttContextType {
  connected: boolean;
  actuatorStates: ZoneActuatorStates;
  deviceOnlineStatus: ZoneDeviceStatus;
  // Chúng ta không cần hàm publish ở đây vì component vẫn gọi qua API
}

const MqttContext = createContext<MqttContextType | undefined>(undefined);

export const MqttProvider = ({ children }: { children: ReactNode }) => {
  const [connected, setConnected] = useState(false);
  const [actuatorStates, setActuatorStates] = useState<ZoneActuatorStates>({});
  const [deviceOnlineStatus, setDeviceOnlineStatus] = useState<ZoneDeviceStatus>({});
  const clientRef = useRef<MqttClient | null>(null);

  useEffect(() => {
    // Chỉ kết nối một lần duy nhất
    if (clientRef.current) return;

    const brokerUrl = process.env.NEXT_PUBLIC_MQTT_BROKER_URL || 'ws://localhost:8884';
    const client = mqtt.connect(brokerUrl);
    clientRef.current = client;

    client.on('connect', () => {
      console.log('Global MQTT Client connected.');
      setConnected(true);
      // Lắng nghe tất cả các zone
      client.subscribe('ecohub/+/sensors', { qos: 1 });
      client.subscribe('ecohub/+/device_status', { qos: 1 });
    });

    const setOffline = () => {
      console.log('Global MQTT Client disconnected or reconnecting.');
      setConnected(false);
      // Reset trạng thái online của tất cả thiết bị khi mất kết nối broker
      setDeviceOnlineStatus({}); 
    };

    client.on('reconnect', setOffline);
    client.on('close', setOffline);
    client.on('error', (err) => {
      console.error('Global MQTT Client Error:', err);
      setOffline();
    });

    client.on('message', (topic: string, payload: Uint8Array) => {
      const parts = topic.split('/');
      if (parts.length < 3 || parts[0] !== 'ecohub') return;
      
      const zoneId = parts[1];
      const messageType = parts[2];
      const message = payload.toString();

      if (messageType === 'device_status') {
        console.log(`Global MQTT: Device status for ${zoneId}: ${message}`);
        setDeviceOnlineStatus(prev => ({ ...prev, [zoneId]: message === 'online' }));
      }

      if (messageType === 'sensors') {
        try {
          const data = JSON.parse(message);
          if (data.actuatorStates) {
            setActuatorStates(prev => ({ ...prev, [zoneId]: data.actuatorStates }));
          }
        } catch (e) {
          console.error(`Failed to parse sensor data for zone ${zoneId}:`, e);
        }
      }
    });

    // Hàm dọn dẹp khi ứng dụng đóng
    return () => {
      if (clientRef.current) {
        console.log('Disconnecting global MQTT client...');
        clientRef.current.end(true);
        clientRef.current = null;
      }
    };
  }, []); // Mảng rỗng đảm bảo useEffect chỉ chạy một lần

  const value = { connected, actuatorStates, deviceOnlineStatus };

  return (
    <MqttContext.Provider value={value}>
      {children}
    </MqttContext.Provider>
  );
};

export const useMqtt = () => {
  const context = useContext(MqttContext);
  if (context === undefined) {
    throw new Error('useMqtt must be used within a MqttProvider');
  }
  return context;
};