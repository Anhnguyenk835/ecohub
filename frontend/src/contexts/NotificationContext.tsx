'use client';

import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import mqtt, { MqttClient } from 'mqtt';
import { v4 as uuidv4 } from 'uuid';
import { auth } from '@/lib/firebase';

/**
 * Định nghĩa cấu trúc dữ liệu cho một đối tượng thông báo.
 */
export type ActionState = 'pending' | 'activated' | 'dismissed' | 'in_progress';
export interface Notification {
  id: string;
  type: string;
  message: string;
  suggestion?: string;
  suggestion_text?: string;
  timestamp: Date;
  zoneId: string;
  severity: 'info' | 'warning' | 'critical';
  actionState: ActionState;
  is_completion_signal?: boolean;
  completed_command?: string;
}

/**
 * Định nghĩa cấu trúc của giá trị mà Context sẽ cung cấp.
 */
interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'actionState'>) => void;
  clearNotifications: () => void;

  handleNotificationAction: (notificationId: string, action: 'yes' | 'no') => void;
  trackUserAction: (zoneId: string, command: string, actionText: string) => void;
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
         actionState: notif.actionState === 'pending' 
          ? 'dismissed' 
          : (notif.actionState || 'dismissed'),
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
          suggestion_text: message.suggestion_text,
          zoneId: zoneId,
          severity: severity,
          is_completion_signal: message.is_completion_signal, // Lấy cờ từ payload
          completed_command: message.completed_command,     // Lấy lệnh đã hoàn thành
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
  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'actionState'>) => {
    // Kiểm tra xem có thông báo nào đang 'activated' với cùng suggestion không
    setNotifications((prev) => {
      if (notification.is_completion_signal && notification.completed_command) {
      const completedCommand = notification.completed_command;
      
      return prev.map(n => {
        // Tìm thông báo đang chạy (activated/in_progress) có suggestion khớp với lệnh đã hoàn thành
        if (
          n.zoneId === notification.zoneId &&
          n.suggestion === completedCommand &&
          (n.actionState === 'in_progress' || n.actionState === 'activated')
        ) {
          // Cập nhật trạng thái thành "dismissed" và thay đổi message
          return { ...n, actionState: 'dismissed', message: `Completed: ${n.message.replace('In progress: ', '')}` };
        }
        // Giữ nguyên các thông báo khác
        return n;
      });
    }

    // KỊCH BẢN 2: Đây là một thông báo cảnh báo thông thường
    
    // Logic 2a: Xử lý in_progress
    const existingInProgressIndex = prev.findIndex(
      (n) =>
        n.zoneId === notification.zoneId &&
        n.suggestion && notification.suggestion && n.suggestion === notification.suggestion &&
        (n.actionState === 'activated' || n.actionState === 'in_progress')
    );

    if (existingInProgressIndex !== -1) {
      const updatedNotifications = [...prev];
      updatedNotifications[existingInProgressIndex] = {
        ...updatedNotifications[existingInProgressIndex],
        actionState: 'in_progress',
        message: `In progress: ${notification.message}`,
        timestamp: new Date(),
      };
      return updatedNotifications;
    }

    // Logic 2b: Vô hiệu hóa các 'pending' cũ hơn cùng loại
    const newNotification: Notification = {
      ...notification,
      id: uuidv4(),
      timestamp: new Date(),
      actionState: notification.suggestion ? 'pending' : 'dismissed',
    };

    const updatedPrev = prev.map(n => {
      if (
        n.zoneId === newNotification.zoneId &&
        n.suggestion && newNotification.suggestion && n.suggestion === newNotification.suggestion &&
        n.actionState === 'pending'
      ) {
        return { ...n, actionState: 'dismissed' };
      }
      return n;
    });

    // Thêm thông báo mới vào đầu
    return [newNotification, ...updatedPrev.slice(0, 49)];
  });
  };

  const handleNotificationAction = async (notificationId: string, action: 'yes' | 'no') => {
    const notification = notifications.find(n => n.id === notificationId);
    if (!notification) return;

    if (action === 'no') {
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, actionState: 'dismissed' } : n)
      );
      return; // Dừng hàm ở đây
    }
    
    if (action === 'yes' && notification.suggestion) {
      // Cập nhật UI trước
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, actionState: 'activated' } : n)
      );
      
      try {
        // === CÁCH LẤY TOKEN ĐÚNG ===
        if (!auth?.currentUser) {
          console.error("User is not authenticated.");
          throw new Error("User not authenticated");
        }
        const token = await auth.currentUser.getIdToken(true); // true để ép làm mới token nếu cần

        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
        if (!apiBaseUrl) {
          throw new Error("API_BASE_URL is not defined");
        }
        
        const apiUrl = `${apiBaseUrl}/zones/${notification.zoneId}/command`;
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` // Gửi token mới nhất
          },
          body: JSON.stringify({ command: notification.suggestion })
        });

        if (!response.ok) {
          const errorBody = await response.text();
          console.error(`Failed to send command. Status: ${response.status}`, errorBody);
          throw new Error(`API Error: ${response.status}`);
        }

        console.log("Command sent successfully!");

      } catch (error) {
        console.error("Error in handleNotificationAction:", error);
        // Rollback trạng thái về 'pending' nếu có lỗi
        setNotifications(prev => 
          prev.map(n => {
            if (n.id === notificationId) {
              return { ...n, actionState: 'pending', message: `Failed: ${n.message}` };
            }
            return n;
          })
        );
      }
    }
  };


  const trackUserAction = (zoneId: string, command: string, actionText: string) => {
    setNotifications((prev) => {
      let foundAndTransformed = false;
      
      // *** LOGIC MỚI: TÌM VÀ BIẾN ĐỔI ***
      // Bước 1: Duyệt qua danh sách, tìm thông báo pending phù hợp để "biến đổi"
      const transformedList = prev.map(n => {
        if (
          !foundAndTransformed &&         // Chỉ biến đổi cái đầu tiên tìm thấy
          n.zoneId === zoneId &&
          n.suggestion === command &&
          n.actionState === 'pending'
        ) {
          foundAndTransformed = true;
          // Biến đổi nó thành một hành động "in_progress"
          return {
            ...n, // Giữ lại message, id, etc. của thông báo gốc
            type: 'Manual Control', // Đổi type để có màu xanh
            severity: 'info' as 'info',
            actionState: 'in_progress' as 'in_progress', // Cập nhật trạng thái
            timestamp: new Date(), // Cập nhật thời gian
          };
        }
        return n;
      });

      // Bước 2: Nếu không tìm thấy thông báo nào để biến đổi (hành động hoàn toàn mới)
      // thì hãy tạo một thông báo mới từ đầu.
      if (!foundAndTransformed) {
        const newActionNotification: Notification = {
          id: uuidv4(),
          type: 'Manual Control',
          message: actionText,
          suggestion: command,
          timestamp: new Date(),
          zoneId: zoneId,
          severity: 'info',
          actionState: 'in_progress',
        };
        // Thêm vào đầu danh sách
        return [newActionNotification, ...prev.slice(0, 49)];
      }

      // Bước 3: Nếu đã biến đổi thành công, trả về danh sách đã được cập nhật.
      return transformedList;
    });
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
    <NotificationContext.Provider value={{ notifications, addNotification, clearNotifications, handleNotificationAction, trackUserAction }}>
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