export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

export interface Field {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  slug: string;
}

export interface NavItem {
  label: string;
  href: string;
  icon?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
  read: boolean;
}

export type RepetitionType = 'daily' | 'weekly' | 'monthly' | 'once';

export interface ScheduleDevice {
  id: string;
  name: string;
  type: 'pump' | 'fan' | 'heater' | 'light';
  status: 'on' | 'off';
}

export interface Schedule {
  id: string;
  name: string;
  deviceId: string;
  deviceType: 'pump' | 'fan' | 'heater' | 'light';
  action: 'activate' | 'deactivate';
  time: string; // HH:MM format
  date?: string; // YYYY-MM-DD format, used for once schedules
  repetition: RepetitionType;
  daysOfWeek?: number[]; // 0-6 for Sunday-Saturday, used for weekly
  dayOfMonth?: number; // 1-31, used for monthly
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
} 