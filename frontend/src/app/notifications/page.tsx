'use client';

import { useNotifications } from '@/contexts/NotificationContext';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

// Helper function để lấy màu dựa trên severity (có thể copy từ NotificationBell)
const getSeverityColor = (severity: 'info' | 'warning' | 'critical') => {
  switch (severity) {
    case 'critical':
      return 'bg-red-500';
    case 'warning':
      return 'bg-orange-400';
    case 'info':
    default:
      return 'bg-green-500';
  }
};

export default function NotificationsPage() {
  const { notifications, clearNotifications } = useNotifications();

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <Link href="/dashboard" legacyBehavior>
          <a className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </a>
        </Link>
      </div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
          All Notifications
        </h1>
        {notifications.length > 0 && (
          <button
            onClick={clearNotifications}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
          >
            Clear All
          </button>
        )}
      </div>

      {notifications.length > 0 ? (
        <div className="space-y-4">
          {notifications.map((notif) => (
            <div 
              key={notif.id} 
              className="flex items-stretch bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
            >
              {/* Thanh màu bên trái */}
              <div className={`w-2 rounded-l-xl ${getSeverityColor(notif.severity)}`}></div>
              
              {/* Nội dung thông báo */}
              <div className="flex-1 p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-lg text-gray-900 dark:text-gray-100 capitalize">
                      {notif.type}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                      {notif.message}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-4">
                    {formatDistanceToNow(notif.timestamp, { addSuffix: true })}
                  </p>
                </div>
                {notif.suggestion && (
                  <p className="mt-2 text-xs text-blue-500">
                    Suggestion: <span className="font-semibold">{notif.suggestion}</span>
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">You're all caught up!</h2>
          <p className="text-gray-500 mt-2">There are no new notifications.</p>
          <Link href="/dashboard" legacyBehavior>
            <a className="mt-4 inline-block px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700">
              Back to Dashboard
            </a>
          </Link>
        </div>
      )}
    </div>
  );
}