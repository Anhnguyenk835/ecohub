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

export async function put<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'PUT',
    headers: await authHeaders(),
    body: JSON.stringify(body),
    credentials: 'include',
  })
  if (!res.ok) throw new Error(`PUT ${path} failed: ${res.status}`)
  return (await res.json()) as T
}

export async function patch<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'PATCH',
    headers: await authHeaders(),
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  })
  if (!res.ok) throw new Error(`PATCH ${path} failed: ${res.status}`)
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

// Schedule API functions 
export async function getSchedules(zoneId: string): Promise<Schedule[]> {
  try {
    const schedules = await get<Schedule[]>(`/schedules/?zone_id=${zoneId}`);
    return schedules;
  } catch (error) {
    console.error('Failed to fetch schedules:', error);
    throw error;
  }
}

export async function createSchedule(zoneId: string, schedule: Omit<Schedule, 'id' | 'createdAt' | 'updatedAt'>): Promise<Schedule> {
  try {
    // Add zoneId to the schedule data as required by backend
    const scheduleData = {
      ...schedule,
      zoneid: zoneId // Backend expects 'zoneid' field
    };
    
    const createdSchedule = await post<Schedule>('/schedules/', scheduleData);
    return createdSchedule;
  } catch (error) {
    console.error('Failed to create schedule:', error);
    throw error;
  }
}

export async function updateSchedule(zoneId: string, scheduleId: string, updates: Partial<Schedule>): Promise<Schedule> {
  try {
    // Add zoneId to updates if not present
    const updateData = {
      ...updates,
      zoneid: zoneId
    };
    
    const updatedSchedule = await put<Schedule>(`/schedules/${scheduleId}`, updateData);
    return updatedSchedule;
  } catch (error) {
    console.error('Failed to update schedule:', error);
    throw error;
  }
}

export async function deleteSchedule(zoneId: string, scheduleId: string): Promise<void> {
  try {
    await del(`/schedules/${scheduleId}`);
  } catch (error) {
    console.error('Failed to delete schedule:', error);
    throw error;
  }
}

export async function toggleScheduleStatus(zoneId: string, scheduleId: string, isActive: boolean): Promise<Schedule> {
  try {
    // Use the toggle endpoint which automatically toggles the status
    const updatedSchedule = await patch<Schedule>(`/schedules/${scheduleId}/toggle`);
    return updatedSchedule;
  } catch (error) {
    console.error('Failed to toggle schedule status:', error);
    throw error;
  }
}

