"use client"

import { useState, useEffect } from 'react'
import RequireAuth from '@/components/auth/RequireAuth'
import { Navbar } from "@/components/layout/nav-bar"
import { Sidebar } from "@/components/layout/sidebar"
import { MqttProvider } from '@/contexts/MqttContext';
import { LoadingOverlay } from '@/components/ui/loading-overlay';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Simulate dashboard initialization time
    const timer = setTimeout(() => {
      setIsInitializing(false);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  return (
    <RequireAuth>
      <MqttProvider>
        <div className="h-screen bg-gray-50 overflow-hidden">
          <LoadingOverlay 
            isVisible={isInitializing} 
            message="Initializing dashboard..."
          />
          <Navbar />
          <div className="flex h-[calc(100vh-60px)]">
            <Sidebar />
            <main className="flex-1 p-4 overflow-hidden">{children}</main>
          </div>
        </div>
      </MqttProvider>
    </RequireAuth>
  )
}

