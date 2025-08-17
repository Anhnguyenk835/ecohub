'use client';

import { useNotifications } from '@/contexts/NotificationContext';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { useSearchParams  } from 'next/navigation'; 
import { ArrowLeft, CheckCircle2, XCircle, Loader2 } from 'lucide-react'; // Import thêm icons

// Helper function để lấy màu dựa trên severity
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
  // Lấy thêm hàm handleNotificationAction từ context
  const { notifications, clearNotifications, handleNotificationAction } = useNotifications();
  const searchParams = useSearchParams();
  const fromZoneId = searchParams.get('fromZone');

  // Xác định URL để quay lại
  const backHref = fromZoneId ? `/dashboard/${fromZoneId}` : '/dashboard';
  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <Link href={backHref} className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {fromZoneId ? 'Back to Zone Dashboard' : 'Back to Dashboard'}
        </Link>
      </div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">All Notifications</h1>
        {notifications.length > 0 && (
          <button onClick={clearNotifications} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700">
            Clear All
          </button>
        )}
      </div>

      {notifications.length > 0 ? (
        <div className="space-y-4">
          {notifications.map((notif) => (
            <div key={notif.id} className="flex items-stretch bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className={`w-2 rounded-l-xl ${getSeverityColor(notif.severity)}`}></div>
              <div className="flex-1 p-4 flex flex-col">
                <div className="flex-grow">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-lg text-gray-900 dark:text-gray-100 capitalize">{notif.type}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{notif.message}</p>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-4">{formatDistanceToNow(notif.timestamp, { addSuffix: true })}</p>
                  </div>
                </div>

                <div className="mt-4">
                  {notif.actionState === 'pending' && notif.suggestion_text && (
                    <>
                      <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Suggestion: <span className="font-medium text-gray-700 dark:text-gray-200">{notif.suggestion_text}</span>
                        </p>
                      </div>
                      <div className="mt-3 flex items-center space-x-3 w-full">
                        <button onClick={() => handleNotificationAction(notif.id, 'yes')} className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">Yes</button>
                        <button onClick={() => handleNotificationAction(notif.id, 'no')} className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-800 bg-gray-200 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 transition-colors">No</button>
                      </div>
                    </>
                  )}

                  <div className="flex items-center justify-between min-h-[24px] pt-2">
                    <div>
                      {notif.actionState === 'activated' && (
                        <div className="flex items-center text-green-600 dark:text-green-400"><CheckCircle2 className="w-5 h-5 mr-2" /><span className="font-semibold">Activated</span></div>
                      )}
                      {notif.actionState === 'in_progress' && (
                        <div className="flex items-center text-yellow-600 dark:text-yellow-400"><Loader2 className="w-5 h-5 mr-2 animate-spin" /><span className="font-semibold">In Progress...</span></div>
                      )}
                      {notif.actionState === 'dismissed' && (
                        notif.message.startsWith('Completed:') ? (
                          <div className="flex items-center text-green-600 dark:text-green-400"><CheckCircle2 className="w-5 h-5 mr-2" /><span className="font-semibold">Completed</span></div>
                        ) : (
                          <div className="flex items-center text-red-500 dark:text-red-400"><XCircle className="w-5 h-5 mr-2" /><span className="font-semibold">Dismissed</span></div>
                        )
                      )}
                    </div>
                    <Link href={`/dashboard/${notif.zoneId}`} className="text-sm font-medium text-blue-600 hover:underline">Go to Zone</Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">You're all caught up!</h2>
          <p className="text-gray-500 mt-2">There are no new notifications.</p>
          <Link href={backHref} className="mt-4 inline-block px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700">
            {fromZoneId ? 'Back to Zone Dashboard' : 'Back to Dashboard'}
          </Link>
        </div>
      )}
    </div>
  );
}