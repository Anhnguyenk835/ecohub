'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useNotifications } from '@/contexts/NotificationContext';
import { Bell, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns'; // Import hàm mới

// Helper function để lấy màu dựa trên severity
const getSeverityColor = (severity: 'info' | 'warning' | 'critical') => {
  switch (severity) {
    case 'critical':
      return 'bg-red-500'; // Màu đỏ cho cảnh báo nghiêm trọng
    case 'warning':
      return 'bg-orange-400'; // Màu cam cho cảnh báo
    case 'info':
    default:
      return 'bg-green-500'; // Màu xanh cho thông tin
  }
};

export default function NotificationBell() {
  const { notifications, clearNotifications } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const unreadCount = notifications.length;

  const handleToggle = () => setIsOpen((prev) => !prev);

  return (
    <div className="relative">
      {/* Nút chuông không thay đổi nhiều */}
      <button
        onClick={handleToggle}
        className="relative p-2 rounded-full text-gray-300 hover:text-white focus:outline-none"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown thông báo - Đây là phần chúng ta sẽ làm lại */}
      {isOpen && (
        <div 
          className="origin-top-right absolute right-0 mt-4 w-80 sm:w-96 
                     bg-gray-50 dark:bg-gray-900 rounded-2xl shadow-lg 
                     ring-1 ring-black ring-opacity-5 focus:outline-none
                     flex flex-col"
        >
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Notifications
            </h3>
            {notifications.length > 0 && (
              <button onClick={clearNotifications} className="text-sm text-blue-600 hover:underline">
                Clear All
              </button>
            )}
          </div>

          {/* Danh sách thông báo */}
          <div className="flex-grow p-2 overflow-y-auto max-h-[60vh]">
            {notifications.length > 0 ? (
              notifications.map((notif) => (
                <div 
                  key={notif.id} 
                  className="flex items-stretch bg-white dark:bg-gray-800 rounded-xl shadow-sm my-2 transition-all hover:shadow-md"
                >
                  {/* Thanh màu bên trái */}
                  <div className={`w-1.5 rounded-l-xl ${getSeverityColor(notif.severity)}`}></div>
                  
                  {/* Nội dung thông báo */}
                  <div className="flex-1 p-3">
                    <div className="flex justify-between items-center">
                      <p className="font-bold text-gray-800 dark:text-gray-100">
                        {notif.type}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDistanceToNow(notif.timestamp, { addSuffix: false })}
                      </p>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                      {notif.message}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-gray-500">
                You're all caught up!
              </div>
            )}
          </div>

          {/* Footer với nút "View All" */}
          <div className="p-2 border-t border-gray-200 dark:border-gray-700">
            {/* 
                - Bỏ prop "legacyBehavior".
                - Bỏ thẻ <a> bên trong.
                - Chuyển tất cả các props (className, onClick) từ thẻ <a> cũ
                lên thẳng component <Link>.
            */}
            <Link 
                href="/notifications"
                onClick={() => setIsOpen(false)}
                className="block w-full text-center py-2 text-blue-600 bg-blue-100 dark:bg-blue-900/50 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900"
            >
                View All
            </Link>
            </div>
        </div>
      )}
    </div>
  );
}