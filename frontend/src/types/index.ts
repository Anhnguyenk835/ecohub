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