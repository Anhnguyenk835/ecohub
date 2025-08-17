'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useNotifications } from '@/contexts/NotificationContext';
import { Bell, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
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
  const { notifications, clearNotifications, handleNotificationAction } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const unreadCount = notifications.filter(n => n.actionState === 'pending').length; // Chỉ đếm thông báo chờ xử lý
  const pathname = usePathname();
  const handleToggle = () => setIsOpen((prev) => !prev);

  const pathParts = pathname.match(/^\/dashboard\/(.+)/);
  const currentZoneId = pathParts ? pathParts[1] : null;

  const handleNotificationClick = (zoneId: string) => {
    // Đóng dropdown
    setIsOpen(false);
    // Điều hướng đến trang dashboard của zone đó
    router.push(`/dashboard/${zoneId}`);
  };

  return (
    <div className="relative">
      {/* Nút chuông không thay đổi nhiều */}
      <button
        onClick={handleToggle}
        className={`relative p-2 rounded-full focus:outline-none transition-colors
                    ${isOpen ? 'bg-gray-700 text-yellow-400' : 'text-gray-300 hover:text-white hover:bg-gray-700'}`}
      >
        {isOpen ? (
          <Bell className="h-6 w-6 fill-yellow-400 text-yellow-400" />
        ) : (
          <Bell className="h-6 w-6" />
        )}
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
                     flex flex-col z-50"
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
                  onClick={() => handleNotificationClick(notif.zoneId)}
                  className="flex items-stretch bg-white dark:bg-gray-800 rounded-xl shadow-sm my-2 
                             transition-all hover:shadow-md hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
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
                    {notif.actionState === 'pending' && notif.suggestion && (
                      <>
                        {/* Dòng Suggestion */}
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Suggestion: <span className="font-medium text-gray-700 dark:text-gray-200">{notif.suggestion_text}</span>
                          </p>
                        </div>
                        {/* Container cho các nút */}
                        <div className="mt-2 flex items-center space-x-2 w-full">
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleNotificationAction(notif.id, 'yes'); }}
                            className="flex-1 px-3 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Yes
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleNotificationAction(notif.id, 'no'); }}
                            className="flex-1 px-3 py-2 text-sm font-semibold text-gray-800 bg-gray-200 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 transition-colors"
                          >
                            No
                          </button>
                        </div>
                      </>
                    )}
                    
                    {notif.actionState === 'activated' && (
                      <div className="mt-2 flex items-center text-green-600 dark:text-green-400">
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        <span className="text-xs font-semibold">Activated</span>
                      </div>
                    )}

                    {notif.actionState === 'dismissed' && (
                       <div className="mt-2 flex items-center text-gray-500 dark:text-gray-400">
                        {notif.message.startsWith('Completed:') ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                            <span className="text-xs font-semibold text-green-500">Completed</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 mr-2 text-red-500" />
                            <span className="text-xs font-semibold text-red-500">Dismissed</span>
                          </>
                        )}
                      </div>
                    )}

                    {notif.actionState === 'in_progress' && (
                      <div className="mt-2 flex items-center text-yellow-600 dark:text-yellow-400">
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        <span className="text-xs font-semibold">In Progress...</span>
                      </div>
                    )}
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
                href={currentZoneId ? `/notifications?fromZone=${currentZoneId}` : "/notifications"}
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