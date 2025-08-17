'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { TimePickerInput } from "@/components/ui/time-picker-input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Schedule, ScheduleDevice, RepetitionType } from '@/types';
import { getSchedules, createSchedule, updateSchedule, deleteSchedule, toggleScheduleStatus } from '@/lib/api';
import { useParams } from 'next/navigation';
import { Clock, Calendar, Settings, Trash2, Edit, Plus, Power, PowerOff } from 'lucide-react';
import { format } from "date-fns";

export default function SchedulePage() {
  const params = useParams();
  const zoneId = params.zoneId as string;
  
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  
  // Mock devices - replace with actual API call
  const devices: ScheduleDevice[] = [
    { id: 'pump-1', name: 'Water Pump', type: 'pump', status: 'off' },
    { id: 'fan-1', name: 'Ventilation Fan', type: 'fan', status: 'off' },
    { id: 'heater-1', name: 'Heating System', type: 'heater', status: 'off' },
    { id: 'light-1', name: 'Grow Light', type: 'light', status: 'off' },
  ];

  const [formData, setFormData] = useState({
    name: '',
    deviceId: '',
    deviceType: 'pump' as 'pump' | 'fan' | 'heater' | 'light',
    action: 'activate' as 'activate' | 'deactivate',
    time: '06:00',
    date: new Date().toISOString().split('T')[0], // Today's date as default
    repetition: 'daily' as RepetitionType,
    daysOfWeek: [] as number[],
    dayOfMonth: 1,
    isActive: true,
  });

  useEffect(() => {
    loadSchedules();
  }, [zoneId]);

  const loadSchedules = async () => {
    try {
      setLoading(true);
      const data = await getSchedules(zoneId);
      setSchedules(data);
    } catch (error) {
      console.error('Failed to load schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSchedule) {
        await updateSchedule(zoneId, editingSchedule.id, formData);
        setEditingSchedule(null);
      } else {
        await createSchedule(zoneId, formData);
      }
      await loadSchedules();
      resetForm();
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to save schedule:', error);
    }
  };

  const handleEdit = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setFormData({
      name: schedule.name,
      deviceId: schedule.deviceId,
      deviceType: schedule.deviceType,
      action: schedule.action,
      time: schedule.time,
      date: schedule.date || new Date().toISOString().split('T')[0],
      repetition: schedule.repetition,
      daysOfWeek: schedule.daysOfWeek || [],
      dayOfMonth: schedule.dayOfMonth || 1,
      isActive: schedule.isActive,
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (scheduleId: string) => {
    if (confirm('Are you sure you want to delete this schedule?')) {
      try {
        await deleteSchedule(zoneId, scheduleId);
        await loadSchedules();
      } catch (error) {
        console.error('Failed to delete schedule:', error);
      }
    }
  };

  const handleToggleStatus = async (schedule: Schedule) => {
    try {
      await toggleScheduleStatus(zoneId, schedule.id, !schedule.isActive);
      await loadSchedules();
    } catch (error) {
      console.error('Failed to toggle schedule status:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      deviceId: '',
      deviceType: 'pump',
      action: 'activate',
      time: '06:00',
      date: new Date().toISOString().split('T')[0],
      repetition: 'daily',
      daysOfWeek: [],
      dayOfMonth: 1,
      isActive: true,
    });
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'pump': return '💧';
      case 'fan': return '💨';
      case 'heater': return '🔥';
      case 'light': return '💡';
      default: return '⚙️';
    }
  };

  const getRepetitionText = (schedule: Schedule) => {
    switch (schedule.repetition) {
      case 'daily':
        return 'Daily';
      case 'weekly':
        return `Weekly on ${schedule.daysOfWeek?.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')}`;
      case 'monthly':
        return `Monthly on day ${schedule.dayOfMonth}`;
      case 'once':
        if (schedule.date) {
          const date = new Date(schedule.date);
          return `Once on ${date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}`;
        }
        return 'Once';
      default:
        return schedule.repetition;
    }
  };

  const getActionText = (action: string) => {
    return action === 'activate' ? 'Turn On' : 'Turn Off';
  };

  const getSelectedDeviceName = () => {
    const device = devices.find(d => d.id === formData.deviceId);
    return device ? `${getDeviceIcon(device.type)} ${device.name}` : 'Select a device';
  };

  const getSelectedActionText = () => {
    return formData.action === 'activate' ? 'Turn On' : 'Turn Off';
  };

  const getSelectedRepetitionText = () => {
    switch (formData.repetition) {
      case 'daily': return 'Daily';
      case 'weekly': return 'Weekly';
      case 'monthly': return 'Monthly';
      case 'once': return 'Once';
      default: return 'Daily';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg">Loading schedules...</div>
      </div>
    );
  }

  return (
    <div className="flex gap-6 h-full p-6 overflow-y-auto">
      <div className="flex-1 flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Schedule Management</h1>
            <p className="text-gray-600">Automate your devices with custom schedules</p>
          </div>
          <Button 
            onClick={() => {
              setShowCreateForm(true);
              setEditingSchedule(null);
              resetForm();
            }}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create Schedule
          </Button>
        </div>

        {/* Create/Edit Form */}
        {showCreateForm && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                {editingSchedule ? 'Edit Schedule' : 'Create New Schedule'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name" className='pl-1 pb-2'>Schedule Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Morning Watering"
                      className='w-full h-10 p-2 border border-gray-300 rounded-md cursor-pointer'
                      required
                    />
                  </div>
                  <div>
                    <Label className='pl-1 pb-2'>Device</Label>
                    <Select 
                      value={formData.deviceId} 
                      onValueChange={(v: string) => {
                        const selectedDevice = devices.find(d => d.id === v);
                        setFormData({ 
                          ...formData, 
                          deviceId: v,
                          deviceType: selectedDevice?.type || 'pump'
                        });
                      }}
                    >
                      <SelectTrigger className="w-full cursor-pointer">
                        <SelectValue placeholder="Select a device" />
                      </SelectTrigger>
                      <SelectContent>
                        {devices.map(device => (
                          <SelectItem className='cursor-pointer' key={device.id} value={device.id}>
                            {getDeviceIcon(device.type)} {device.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className='pl-1 pb-2'>Action</Label>
                    <Select 
                      value={formData.action} 
                      onValueChange={(v: string) => setFormData({ ...formData, action: v as 'activate' | 'deactivate' })}
                    >
                      <SelectTrigger className="w-full cursor-pointer">
                        <SelectValue placeholder="Select action" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem className='cursor-pointer' value="activate">Turn On</SelectItem>
                        <SelectItem className='cursor-pointer' value="deactivate">Turn Off</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="time" className="pl-1 pb-2">Time</Label>
                    <TimePickerInput
                      value={formData.time}                   // "HH:mm"
                      onChange={(v) => setFormData({ ...formData, time: v })}
                      step={1}                                
                      use12Hour={false}                       // set true for AM/PM UI
                    />
                  </div>
                </div>

                <div>
                  <Label className='pl-1 pb-2'>Repetition</Label>
                  <Select 
                    value={formData.repetition} 
                    onValueChange={(v: string) => setFormData({ ...formData, repetition: v as RepetitionType })}
                  >
                    <SelectTrigger className="w-full cursor-pointer">
                      <SelectValue placeholder="Select repetition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem className='cursor-pointer' value="daily">Daily</SelectItem>
                      <SelectItem className='cursor-pointer' value="weekly">Weekly</SelectItem>
                      <SelectItem className='cursor-pointer' value="monthly">Monthly</SelectItem>
                      <SelectItem className='cursor-pointer' value="once">Once</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.repetition === 'weekly' && (
                  <div>
                    <Label>Days of Week</Label>
                    <div className="flex gap-2 mt-2">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                        <label key={day} className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={formData.daysOfWeek.includes(index)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  daysOfWeek: [...formData.daysOfWeek, index]
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  daysOfWeek: formData.daysOfWeek.filter(d => d !== index)
                                });
                              }
                            }}
                          />
                          {day}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {formData.repetition === 'monthly' && (
                  <div>
                    <Label htmlFor="dayOfMonth">Day of Month</Label>
                    <Input
                      id="dayOfMonth"
                      type="number"
                      min="1"
                      max="31"
                      value={formData.dayOfMonth}
                      onChange={(e) => setFormData({ ...formData, dayOfMonth: parseInt(e.target.value) })}
                      required
                    />
                  </div>
                )}

                {formData.repetition === 'once' && (
                  <div>
                    <Label className='pl-1 pb-2'>Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal cursor-pointer"
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {formData.date ? format(new Date(formData.date), "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={formData.date ? new Date(formData.date) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              setFormData({ ...formData, date: date.toISOString().split('T')[0] });
                            }
                          }}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <p className="text-xs text-gray-500 mt-1">
                      Select a future date for your one-time schedule
                    </p>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1 cursor-pointer">
                    {editingSchedule ? 'Update Schedule' : 'Create Schedule'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className='cursor-pointer'
                    onClick={() => {
                      setShowCreateForm(false);
                      setEditingSchedule(null);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Schedules List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Active Schedules ({schedules.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {schedules.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No schedules created yet</p>
                <p className="text-sm">Create your first schedule to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {schedules
                  .sort((a, b) => {
                    // Active schedules first, then inactive ones
                    if (a.isActive && !b.isActive) return -1;
                    if (!a.isActive && b.isActive) return 1;
                    return 0;
                  })
                  .map((schedule) => {
                  const device = devices.find(d => d.id === schedule.deviceId);
                  return (
                    <div
                      key={schedule.id}
                      className={`p-4 border rounded-lg transition-all hover:shadow-md hover:scale-[1.002] cursor-pointer ${
                        schedule.isActive 
                          ? 'border-green-200 bg-green-50 hover:bg-green-100' 
                          : 'border-gray-300 bg-gray-100 hover:bg-gray-200 opacity-60 blur-[0.5px]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`text-2xl transition-transform hover:scale-110 cursor-pointer ${
                            schedule.isActive ? '' : 'opacity-50'
                          }`}>{getDeviceIcon(schedule.deviceType)}</div>
                          <div>
                            <h3 className={`font-medium ${
                              schedule.isActive ? 'text-gray-900' : 'text-gray-500'
                            }`}>{schedule.name}</h3>
                            <p className={`text-sm ${
                              schedule.isActive ? 'text-gray-600' : 'text-gray-400'
                            }`}>
                              {device?.name} • {getActionText(schedule.action)}
                            </p>
                            <div className={`flex items-center gap-4 mt-1 text-xs ${
                              schedule.isActive ? 'text-gray-500' : 'text-gray-400'
                            }`}>
                              <span className="flex items-center gap-1 cursor-pointer group">
                                {/* <Clock className="w-3 h-3 transition-transform hover:scale-125 cursor-pointer" /> */}
                                <span className={`transition-colors ${
                                  schedule.isActive ? 'group-hover:text-blue-600' : ''
                                }`}>{schedule.time}</span>
                              </span>
                              {schedule.repetition === 'once' && schedule.date && (
                                <span className="flex items-center gap-1 cursor-pointer group">
                                  <Calendar className="w-3 h-3 transition-transform hover:scale-125 cursor-pointer" />
                                  <span className={`transition-colors ${
                                    schedule.isActive ? 'group-hover:text-blue-600' : ''
                                  }`}>
                                    {new Date(schedule.date).toLocaleDateString('en-US', { 
                                      month: 'short', 
                                      day: 'numeric', 
                                      year: 'numeric' 
                                    })}
                                  </span>
                                </span>
                              )}
                              <span className="flex items-center gap-1 cursor-pointer group">
                                <Calendar className="w-3 h-3 transition-transform hover:scale-125 cursor-pointer" />
                                <span className={`transition-colors ${
                                  schedule.isActive ? 'group-hover:text-blue-600' : ''
                                }`}>{getRepetitionText(schedule)}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant={schedule.isActive ? "outline" : "default"}
                            onClick={() => handleToggleStatus(schedule)}
                            className="flex items-center cursor-pointer gap-1 transition-all hover:scale-105"
                          >
                            {schedule.isActive ? (
                              <>
                                <PowerOff className="w-3 h-3" />
                                Disable
                              </>
                            ) : (
                              <>
                                <Power className="w-3 h-3" />
                                Enable
                              </>
                            )}
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(schedule)}
                            className="transition-all cursor-pointer hover:scale-105 hover:bg-blue-50 hover:border-blue-300"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(schedule.id)}
                            className="text-red-600 hover:text-red-700 cursor-pointer transition-all hover:scale-105 hover:bg-red-50 hover:border-red-300"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Sidebar */}
      <div className="w-80 flex-shrink-0 space-y-6">
        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Schedule Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Schedules</span>
              <span className="font-semibold">{schedules.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Active Schedules</span>
              <span className="font-semibold text-green-600">
                {schedules.filter(s => s.isActive).length}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Inactive Schedules</span>
              <span className="font-semibold text-gray-500">
                {schedules.filter(s => !s.isActive).length}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Device Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Device Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {devices.map(device => (
              <div key={device.id} className="flex items-center justify-between group hover:bg-gray-50 p-2 rounded-md transition-colors cursor-pointer">
                <div className="flex items-center gap-2">
                  <span className="text-lg transition-transform hover:scale-110 cursor-pointer">{getDeviceIcon(device.type)}</span>
                  <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">{device.name}</span>
                </div>
                <div className={`w-3 h-3 rounded-full transition-all ${
                  device.status === 'on' ? 'bg-green-500' : 'bg-gray-300'
                }`} />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Help */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">How it works</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600 space-y-2">
            <p>• Create schedules to automate your devices</p>
            <p>• Daily: Runs every day at the same time</p>
            <p>• Weekly: Runs on selected days of the week</p>
            <p>• Monthly: Runs on a specific day each month</p>
            <p>• Once: Runs once on a specific date and time</p>
            <p>• Enable/disable schedules without deleting them</p>
            <p>• All schedules are timezone-aware</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


