'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface NotificationPreferences {
  email: boolean;
  severity: {
    minimum: string;
  };
  maxPerHour: number;
  maxPerDay: number;
  zones: string[];
}

export default function NotificationPreferences() {
  const { user, getToken } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email: true,
    severity: { minimum: 'info' },
    maxPerHour: 10,
    maxPerDay: 50,
    zones: []
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [simpleTesting, setSimpleTesting] = useState(false);

  useEffect(() => {
    if (user) {
      loadPreferences();
    }
  }, [user]);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) return;

      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
      if (!apiBaseUrl) {
        toast('API base URL not configured', { type: 'error' });
        return;
      }

      const response = await fetch(`${apiBaseUrl}/users/me/notifications`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPreferences({
          email: data.email ?? true,
          severity: data.severity ?? { minimum: 'info' },
          maxPerHour: data.maxPerHour ?? 10,
          maxPerDay: data.maxPerDay ?? 50,
          zones: data.zones ?? []
        });
      } else {
        console.error('Failed to load preferences');
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      toast('Failed to load notification preferences', { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    try {
      setSaving(true);
      const token = await getToken();
      if (!token) return;

      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
      if (!apiBaseUrl) {
        toast('API base URL not configured', { type: 'error' });
        return;
      }

      const response = await fetch(`${apiBaseUrl}/users/me/notifications`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(preferences)
      });

      if (response.ok) {
        toast('Notification preferences saved successfully', { type: 'success' });
      } else {
        toast('Failed to save preferences', { type: 'error' });
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast('Failed to save notification preferences', { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleSeverityChange = (value: string) => {
    setPreferences(prev => ({
      ...prev,
      severity: { ...prev.severity, minimum: value }
    }));
  };

  const testEmail = async () => {
    try {
      setTesting(true);
      const token = await getToken();
      if (!token) return;

      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
      if (!apiBaseUrl) {
        toast('API base URL not configured', { type: 'error' });
        return;
      }

      const response = await fetch(`${apiBaseUrl}/users/me/test-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        toast(`Test email sent successfully to ${data.email}`, { type: 'success' });
      } else {
        const errorData = await response.json();
        toast(errorData.detail || 'Failed to send test email', { type: 'error' });
      }
    } catch (error) {
      console.error('Error testing email:', error);
      toast('Failed to send test email', { type: 'error' });
    } finally {
      setTesting(false);
    }
  };

  const simpleTestEmail = async () => {
    try {
      setSimpleTesting(true);
      const token = await getToken();
      if (!token) return;

      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
      if (!apiBaseUrl) {
        toast('API base URL not configured', { type: 'error' });
        return;
      }

      const response = await fetch(`${apiBaseUrl}/users/me/simple-test-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        toast(`Simple test email sent successfully to ${data.email}`, { type: 'success' });
      } else {
        const errorData = await response.json();
        toast(errorData.detail || 'Failed to send simple test email', { type: 'error' });
        console.error('Simple test email error:', errorData);
      }
    } catch (error) {
      console.error('Error testing simple email:', error);
      toast('Failed to send simple test email', { type: 'error' });
    } finally {
      setSimpleTesting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Notification Preferences</CardTitle>
        <CardDescription>
          Configure how and when you receive email notifications for system alerts.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Email Notifications Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="email-notifications">Email Notifications</Label>
            <p className="text-sm text-muted-foreground">
              Receive email notifications for system alerts and warnings
            </p>
          </div>
          <Switch
            id="email-notifications"
            checked={preferences.email}
            onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, email: checked }))}
          />
        </div>

        {/* Minimum Severity */}
        <div className="space-y-2">
          <Label htmlFor="minimum-severity">Minimum Alert Severity</Label>
          <Select value={preferences.severity.minimum} onValueChange={handleSeverityChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select minimum severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="info">Info - All notifications</SelectItem>
              <SelectItem value="warning">Warning - Warnings and critical alerts only</SelectItem>
              <SelectItem value="critical">Critical - Critical alerts only</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Only receive notifications at or above this severity level
          </p>
        </div>

        {/* Rate Limiting */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="max-per-hour">Max per Hour</Label>
            <Input
              id="max-per-hour"
              type="number"
              min="1"
              max="100"
              value={preferences.maxPerHour}
              onChange={(e) => setPreferences(prev => ({ ...prev, maxPerHour: parseInt(e.target.value) || 1 }))}
            />
            <p className="text-sm text-muted-foreground">Maximum notifications per hour</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="max-per-day">Max per Day</Label>
            <Input
              id="max-per-day"
              type="number"
              min="1"
              max="1000"
              value={preferences.maxPerDay}
              onChange={(e) => setPreferences(prev => ({ ...prev, maxPerDay: parseInt(e.target.value) || 1 }))}
            />
            <p className="text-sm text-muted-foreground">Maximum notifications per day</p>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end space-x-2">
          <Button 
            variant="outline" 
            onClick={testEmail} 
            disabled={testing}
          >
            {testing ? 'Testing...' : 'Test Email'}
          </Button>
          <Button 
            variant="outline" 
            onClick={simpleTestEmail} 
            disabled={simpleTesting}
            className="bg-yellow-50 hover:bg-yellow-100"
          >
            {simpleTesting ? 'Testing...' : 'Simple Test Email'}
          </Button>
          <Button onClick={savePreferences} disabled={saving}>
            {saving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>

        {/* Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">How it works:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>Info:</strong> Temperature, humidity, and general system updates</li>
            <li>• <strong>Warning:</strong> Soil moisture, light intensity, and moderate issues</li>
            <li>• <strong>Critical:</strong> Extreme temperature, system failures, and urgent alerts</li>
            <li>• Rate limiting prevents notification spam while ensuring important alerts get through</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
