import { getIdToken } from '@/lib/firebase-auth'
import { Schedule } from '@/types'

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

async function authHeaders(): Promise<Headers> {
  const headers = new Headers()
  headers.set('Content-Type', 'application/json')
  const token = await getIdToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  return headers
}

export async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: await authHeaders(),
    credentials: 'include',
  })
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`)
  return (await res.json()) as T
}

export async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(body),
    credentials: 'include',
  })
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`)
  return (await res.json()) as T
}

export async function del(path: string): Promise<void> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'DELETE',
    headers: await authHeaders(),
    credentials: 'include',
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(`DELETE ${path} failed: ${res.status} - ${errorBody.detail}`);
  }

  return;
}

// Schedule API functions (placeholder implementations)
export async function getSchedules(zoneId: string): Promise<Schedule[]> {
  // Placeholder API call - replace with actual implementation
  console.log(`Fetching schedules for zone: ${zoneId}`);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Return mock data
  return [
    {
      id: '1',
      name: 'Morning Watering',
      deviceId: 'pump-1',
      deviceType: 'pump',
      action: 'activate',
      time: '06:00',
      repetition: 'daily',
      isActive: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    },
    {
      id: '2',
      name: 'Evening Light',
      deviceId: 'light-1',
      deviceType: 'light',
      action: 'activate',
      time: '18:00',
      repetition: 'daily',
      isActive: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    },
    {
      id: '3',
      name: 'Special Event',
      deviceId: 'heater-1',
      deviceType: 'heater',
      action: 'activate',
      time: '10:00',
      date: '2024-12-25',
      repetition: 'once',
      isActive: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    },
    {
      id: '4',
      name: 'Special Event',
      deviceId: 'heater-1',
      deviceType: 'heater',
      action: 'activate',
      time: '10:00',
      date: '2024-12-25',
      repetition: 'once',
      isActive: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    },
    {
      id: '5',
      name: 'Special Event',
      deviceId: 'heater-1',
      deviceType: 'heater',
      action: 'activate',
      time: '10:00',
      date: '2024-12-25',
      repetition: 'once',
      isActive: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    }
  ];
}

export async function createSchedule(zoneId: string, schedule: Omit<Schedule, 'id' | 'createdAt' | 'updatedAt'>): Promise<Schedule> {
  // Placeholder API call - replace with actual implementation
  console.log(`Creating schedule for zone: ${zoneId}`, schedule);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Return mock created schedule
  return {
    ...schedule,
    id: Math.random().toString(36).substr(2, 9),
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

export async function updateSchedule(zoneId: string, scheduleId: string, updates: Partial<Schedule>): Promise<Schedule> {
  // Placeholder API call - replace with actual implementation
  console.log(`Updating schedule ${scheduleId} for zone: ${zoneId}`, updates);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Return mock updated schedule
  return {
    id: scheduleId,
    name: 'Updated Schedule',
    deviceId: 'pump-1',
    deviceType: 'pump',
    action: 'activate',
    time: '07:00',
    repetition: 'daily',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date()
  };
}

export async function deleteSchedule(zoneId: string, scheduleId: string): Promise<void> {
  // Placeholder API call - replace with actual implementation
  console.log(`Deleting schedule ${scheduleId} for zone: ${zoneId}`);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Mock successful deletion
  return;
}

export async function toggleScheduleStatus(zoneId: string, scheduleId: string, isActive: boolean): Promise<Schedule> {
  // Placeholder API call - replace with actual implementation
  console.log(`Toggling schedule ${scheduleId} status to ${isActive} for zone: ${zoneId}`);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Return mock updated schedule
  return {
    id: scheduleId,
    name: 'Sample Schedule',
    deviceId: 'pump-1',
    deviceType: 'pump',
    action: 'activate',
    time: '06:00',
    repetition: 'daily',
    isActive,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date()
  };
}

