'use client';

import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import mqtt, { MqttClient } from 'mqtt';
import { v4 as uuidv4 } from 'uuid';

/**
 * Định nghĩa cấu trúc dữ liệu cho một đối tượng thông báo.
 */
export interface Notification {
  id: string;
  type: string;
  message: string;
  suggestion?: string;
  timestamp: Date;
  zoneId: string;
  severity: 'info' | 'warning' | 'critical';
}

/**
 * Định nghĩa cấu trúc của giá trị mà Context sẽ cung cấp.
 */
interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  clearNotifications: () => void;
}

const LOCAL_STORAGE_KEY = 'ecohub_notifications';

// Tạo Context với giá trị ban đầu là undefined.
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

/**
 * Component Provider: Chịu trách nhiệm quản lý state, logic MQTT,
 * và cung cấp chúng cho các component con.
 */
// Khởi tạo state từ localStorage
export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    // Chỉ chạy ở phía client
    if (typeof window === 'undefined') {
      return [];
    }
    try {
      const item = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!item) return [];
      
      // Parse JSON và chuyển đổi chuỗi timestamp về lại object Date
      const parsedItems = JSON.parse(item);
      return parsedItems.map((notif: any) => ({
        ...notif,
        timestamp: new Date(notif.timestamp),
      }));
    } catch (error) {
      console.error("Failed to parse notifications from localStorage", error);
      return [];
    }
  });

  // Auto save to local storage
  useEffect(() => {
    try {
      // Chuyển đổi object Date thành chuỗi ISO để lưu trữ an toàn
      const itemsToStore = notifications.map(notif => ({
        ...notif,
        timestamp: notif.timestamp.toISOString(),
      }));
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(itemsToStore));
    } catch (error) {
      console.error("Failed to save notifications to localStorage", error);
    }
  }, [notifications]); // useEffect này sẽ chạy mỗi khi `notifications` thay đổi

  // Sử dụng useEffect để kết nối MQTT chỉ một lần khi component được mount.
  useEffect(() => {
    // Lấy URL của MQTT Broker từ biến môi trường, có giá trị dự phòng.
    const brokerUrl = process.env.NEXT_PUBLIC_MQTT_BROKER_URL || 'ws://localhost:8884';
    const client = mqtt.connect(brokerUrl);

    // Xử lý khi kết nối thành công
    client.on('connect', () => {
      console.log('MQTT Client connected for notifications');
      // Lắng nghe trên topic wildcard cho tất cả các zone
      client.subscribe('ecohub/+/notifications', { qos: 1 }, (err) => {
        if (!err) {
          console.log('Successfully subscribed to ecohub/+/notifications');
        }
      });
    });

    // Xử lý khi nhận được tin nhắn
    client.on('message', (topic, payload) => {
      try {
        const message = JSON.parse(payload.toString());
        const topicParts = topic.split('/');
        const zoneId = topicParts.length > 1 ? topicParts[1] : 'unknown';

        // Logic để xác định mức độ nghiêm trọng (severity) dựa trên loại thông báo
        let severity: 'info' | 'warning' | 'critical' = 'info';
        const messageType = message.type?.toLowerCase() || '';

        if (messageType.includes('hot') || messageType.includes('cool') || messageType.includes('high') || messageType.includes('low')) {
            severity = 'critical';
        } else if (messageType.includes('water') || messageType.includes('light')) {
            severity = 'warning';
        }

        // Thêm thông báo mới vào state
        addNotification({
          type: message.type || 'System',
          message: message.message,
          suggestion: message.suggestion,
          zoneId: zoneId,
          severity: severity,
        });

      } catch (e) {
        console.error('Failed to parse notification message:', e);
      }
    });

    // Xử lý lỗi kết nối
    client.on('error', (err) => {
      console.error('MQTT Connection Error:', err);
      client.end();
    });

    // Hàm dọn dẹp: sẽ được gọi khi component unmount
    return () => {
      if (client) {
        console.log('Disconnecting MQTT client...');
        client.end();
      }
    };
  }, []); // Mảng rỗng đảm bảo useEffect chỉ chạy một lần

  /**
   * Hàm để thêm một thông báo mới vào danh sách.
   * Nó tự động thêm id và timestamp.
   */
  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const newNotification: Notification = {
      ...notification,
      id: uuidv4(),
      timestamp: new Date(),
    };
    // Thêm vào đầu mảng để thông báo mới nhất luôn ở trên cùng
    setNotifications((prev) => [newNotification, ...prev.slice(0, 49)]);
  };

  /**
   * Hàm để xóa tất cả các thông báo.
   */
  const clearNotifications = () => {
    setNotifications([]);

    try {
      window.localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch (error) {
      console.error("Failed to clear notifications from localStorage", error);
    }

  };

  // Cung cấp state và các hàm cho các component con
  return (
    <NotificationContext.Provider value={{ notifications, addNotification, clearNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
};

/**
 * Custom Hook: Một cách tiện lợi để các component con có thể truy cập
 * vào context mà không cần import useContext và NotificationContext trực tiếp.
 */
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};