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
  zoneid: string; // ID of the zone
  name: string;
  deviceId: string;
  deviceType: 'pump' | 'fan' | 'heater' | 'light';
  action: 'activate' | 'deactivate';
  command: string; // Specific command to send to the device
  hour: number; // Hour in 24-hour format (0-23)
  minute: number; // Minute (0-59)
  repetition: RepetitionType;
  date?: string; // YYYY-MM-DD format, used for once schedules
  daysOfWeek?: number[]; // 1-7 for Monday-Sunday, used for weekly
  dayOfMonth?: number; // 1-31, used for monthly
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
} 