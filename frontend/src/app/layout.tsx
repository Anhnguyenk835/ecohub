import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from 'sonner';
// Import NotificationProvider của bạn
import { NotificationProvider } from '@/contexts/NotificationContext'; 
import { MqttProvider } from '@/contexts/MqttContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'EcoHub',
  description: 'Interactive physics laboratory platform', // Bạn có thể cập nhật lại mô tả này cho phù hợp
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* AuthProvider bọc ngoài cùng để quản lý xác thực */}
        <AuthProvider>
          {/* NotificationProvider bọc bên trong AuthProvider và bọc children */}
          {/* Điều này cho phép các thông báo có thể truy cập thông tin người dùng nếu cần */}
         <MqttProvider> 
            <NotificationProvider>
              {children}
            </NotificationProvider>
          </MqttProvider>
        </AuthProvider>
        
        {/* Toaster có thể đặt ở đây, nó không phụ thuộc vào context */}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}