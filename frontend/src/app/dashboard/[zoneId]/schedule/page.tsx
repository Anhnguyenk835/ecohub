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

interface ScheduleFormData {
  name: string;
  deviceId: string;
  deviceType: 'pump' | 'fan' | 'heater' | 'light';
  action: 'activate' | 'deactivate';
  command: string; // Add command field
  time: string; // Keep time string for UI
  date: string | undefined;
  repetition: RepetitionType;
  daysOfWeek: number[] | undefined;
  dayOfMonth: number | undefined;
  isActive: boolean;
}
import { getSchedules, createSchedule, updateSchedule, deleteSchedule, toggleScheduleStatus } from '@/lib/api';
import { useParams } from 'next/navigation';
import { Calendar, Settings, Trash2, Edit, Plus, Power, PowerOff, Droplets, Wind, Flame, Lightbulb, Zap } from 'lucide-react';
import { format } from "date-fns";
import { getDeviceCommand } from '@/lib/deviceUtils';

export default function SchedulePage() {
  const params = useParams();
  const zoneId = params.zoneId as string;
  
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  
  // Confirmation popup states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showToggleConfirm, setShowToggleConfirm] = useState(false);
  const [scheduleToAction, setScheduleToAction] = useState<Schedule | null>(null);

  
  // Mock devices - replace with actual API call
  const devices: ScheduleDevice[] = [
    { id: 'pump-1', name: 'Water Pump', type: 'pump', status: 'off' },
    { id: 'fan-1', name: 'Ventilation Fan', type: 'fan', status: 'off' },
    { id: 'heater-1', name: 'Heating System', type: 'heater', status: 'off' },
    { id: 'light-1', name: 'Grow Light', type: 'light', status: 'off' },
  ];



  const [formData, setFormData] = useState<ScheduleFormData>({
    name: '',
    deviceId: '',
    deviceType: 'pump',
    action: 'activate',
    command: getDeviceCommand('pump', 'activate'), // Generate proper command
    time: '06:00',
    date: undefined,
    repetition: 'daily',
    daysOfWeek: undefined,
    dayOfMonth: undefined,
    isActive: true,
  });

  useEffect(() => {
    loadSchedules();
  }, [zoneId]);

  // Ensure command is always in sync with device type and action
  useEffect(() => {
    if (formData.deviceType && formData.action) {
      const expectedCommand = getDeviceCommand(formData.deviceType, formData.action);
      if (formData.command !== expectedCommand) {
        console.log(`Updating command from "${formData.command}" to "${expectedCommand}" for ${formData.deviceType} ${formData.action}`);
        setFormData(prev => ({
          ...prev,
          command: expectedCommand
        }));
      }
    }
  }, [formData.deviceType, formData.action]);

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
    
    console.log('Form Data:', formData);
    
    // Validate form data
    if (!formData.name.trim()) {
      alert('Schedule name is required');
      return;
    }
    
    if (!formData.deviceId) {
      alert('Please select a device');
      return;
    }

    if (!formData.command) {
      alert('Please select an action for the device');
      return;
    }
    
    // Validate repetition-specific fields
    if (formData.repetition === 'weekly' && (!formData.daysOfWeek || formData.daysOfWeek.length === 0)) {
      alert('Please select at least one day of the week for weekly schedules');
      return;
    }
    
    if (formData.repetition === 'monthly' && !formData.dayOfMonth) {
      alert('Please select a day of the month for monthly schedules');
      return;
    }
    
    if (formData.repetition === 'once' && !formData.date) {
      alert('Please select a date for one-time schedules');
      return;
    }
    
    try {
      // Convert time string to hour and minute
      const [hourStr, minuteStr] = formData.time.split(':');
      const hour = parseInt(hourStr, 10);
      const minute = parseInt(minuteStr, 10);
      
      // Clean up repetition fields based on the selected repetition type
      let cleanedScheduleData: any = {
        zoneid: zoneId,
        name: formData.name,
        deviceId: formData.deviceId,
        deviceType: formData.deviceType,
        action: formData.action,
        command: formData.command, // Ensure command is always included
        hour: hour,
        minute: minute,
        repetition: formData.repetition,
        isActive: formData.isActive,
      };
      
      // Double-check that command is set
      if (!cleanedScheduleData.command) {
        console.warn('Command is missing, generating it now');
        cleanedScheduleData.command = getDeviceCommand(formData.deviceType, formData.action);
      }

      // Only include relevant fields based on repetition type
      switch (formData.repetition) {
        case 'once':
          cleanedScheduleData.date = formData.date;
          cleanedScheduleData.daysOfWeek = null;
          cleanedScheduleData.dayOfMonth = null;
          console.log(`Once schedule: keeping date=${formData.date}, setting daysOfWeek=null, dayOfMonth=null`);
          break;
        case 'daily':
          cleanedScheduleData.date = null;
          cleanedScheduleData.daysOfWeek = null;
          cleanedScheduleData.dayOfMonth = null;
          console.log(`Daily schedule: setting date=null, daysOfWeek=null, dayOfMonth=null`);
          break;
        case 'weekly':
          cleanedScheduleData.date = null;
          cleanedScheduleData.daysOfWeek = formData.daysOfWeek && formData.daysOfWeek.length > 0 ? formData.daysOfWeek : null;
          cleanedScheduleData.dayOfMonth = null;
          console.log(`Weekly schedule: setting date=null, keeping daysOfWeek=${cleanedScheduleData.daysOfWeek}, setting dayOfMonth=null`);
          break;
        case 'monthly':
          cleanedScheduleData.date = null;
          cleanedScheduleData.daysOfWeek = null;
          cleanedScheduleData.dayOfMonth = formData.dayOfMonth || null;
          console.log(`Monthly schedule: setting date=null, setting daysOfWeek=null, keeping dayOfMonth=${cleanedScheduleData.dayOfMonth}`);
          break;
        default:
          // Fallback: set all to null
          cleanedScheduleData.date = null;
          cleanedScheduleData.daysOfWeek = null;
          cleanedScheduleData.dayOfMonth = null;
          console.log(`Unknown repetition type: setting all fields to null`);
      }
      
      console.log('Original formData command:', formData.command);
      console.log('Cleaned schedule data:', cleanedScheduleData);
      
      // Validate that the cleaned data is correct
      console.log('Validation: repetition type =', cleanedScheduleData.repetition);
      console.log('Validation: command field =', cleanedScheduleData.command);
      console.log('Validation: date field =', cleanedScheduleData.date);
      console.log('Validation: daysOfWeek field =', cleanedScheduleData.daysOfWeek);
      console.log('Validation: dayOfMonth field =', cleanedScheduleData.dayOfMonth);
      
      if (editingSchedule) {
        console.log(`Updating schedule ${editingSchedule.id} with data:`, cleanedScheduleData);
        await updateSchedule(zoneId, editingSchedule.id, cleanedScheduleData);
        setEditingSchedule(null);
      } else {
        console.log('Creating new schedule with data:', cleanedScheduleData);
        await createSchedule(zoneId, cleanedScheduleData);
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
    
    // Generate the command based on device type and action
    const command = getDeviceCommand(schedule.deviceType, schedule.action);
    console.log(`Editing schedule: ${schedule.name}, device: ${schedule.deviceType}, action: ${schedule.action}, generated command: ${command}`);
    
    const newFormData = {
      name: schedule.name,
      deviceId: schedule.deviceId,
      deviceType: schedule.deviceType,
      action: schedule.action,
      command: command, // Use generated command
      time: `${schedule.hour.toString().padStart(2, '0')}:${schedule.minute.toString().padStart(2, '0')}`,
      date: schedule.date || undefined,
      repetition: schedule.repetition,
      daysOfWeek: schedule.daysOfWeek || undefined,
      dayOfMonth: schedule.dayOfMonth || undefined,
      isActive: schedule.isActive,
    };
    
    console.log('Setting form data with command:', newFormData.command);
    setFormData(newFormData);
    setShowCreateForm(true);
  };

  const handleDelete = (schedule: Schedule) => {
    setScheduleToAction(schedule);
    setShowDeleteConfirm(true);
  };

  const handleToggleStatus = (schedule: Schedule) => {
    setScheduleToAction(schedule);
    setShowToggleConfirm(true);
  };

  const confirmDelete = async () => {
    if (!scheduleToAction) return;
    
    try {
      await deleteSchedule(zoneId, scheduleToAction.id);
      await loadSchedules();
      setShowDeleteConfirm(false);
      setScheduleToAction(null);
    } catch (error) {
      console.error('Failed to delete schedule:', error);
    }
  };

  const confirmToggle = async () => {
    if (!scheduleToAction) return;
    
    try {
      await toggleScheduleStatus(zoneId, scheduleToAction.id, !scheduleToAction.isActive);
      await loadSchedules();
      setShowToggleConfirm(false);
      setScheduleToAction(null);
    } catch (error) {
      console.error('Failed to toggle schedule status:', error);
    }
  };

  const cancelAction = () => {
    setShowDeleteConfirm(false);
    setShowToggleConfirm(false);
    setScheduleToAction(null);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      deviceId: '',
      deviceType: 'pump',
      action: 'activate',
      command: getDeviceCommand('pump', 'activate'), // Generate proper command
      time: '06:00',
      date: undefined,
      repetition: 'daily',
      daysOfWeek: undefined,
      dayOfMonth: undefined,
      isActive: true,
    });
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'pump': return <Droplets className="w-5 h-5" />;
      case 'fan': return <Wind className="w-5 h-5" />;
      case 'heater': return <Flame className="w-5 h-5" />;
      case 'light': return <Lightbulb className="w-5 h-5" />;
      default: return <Zap className="w-5 h-5" />;
    }
  };

  const getRepetitionText = (schedule: Schedule) => {
    switch (schedule.repetition) {
      case 'daily':
        return 'Daily';
      case 'weekly':
        const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const selectedDays = schedule.daysOfWeek?.map(d => dayNames[d - 1]).join(', ');
        return `Weekly on ${selectedDays}`;
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
                        const newDeviceType = selectedDevice?.type || 'pump';
                        const newCommand = getDeviceCommand(newDeviceType, formData.action);
                        console.log(`Device changed to ${newDeviceType}, updating command to: ${newCommand}`);
                        setFormData({ 
                          ...formData, 
                          deviceId: v,
                          deviceType: newDeviceType,
                          command: newCommand // Update command on device change
                        });
                      }}
                    >
                      <SelectTrigger className="w-full cursor-pointer">
                        <SelectValue placeholder="Select a device" />
                      </SelectTrigger>
                      <SelectContent>
                        {devices.map(device => (
                          <SelectItem className='cursor-pointer' key={device.id} value={device.id}>
                            <span className="flex items-center gap-2">
                              {getDeviceIcon(device.type)}
                              {device.name}
                            </span>
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
                      onValueChange={(v: string) => {
                        const newAction = v as 'activate' | 'deactivate';
                        const newCommand = getDeviceCommand(formData.deviceType, newAction);
                        console.log(`Action changed to ${newAction}, updating command to: ${newCommand}`);
                        setFormData({ 
                          ...formData, 
                          action: newAction,
                          command: newCommand // Update command on action change
                        });
                      }}
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

                {/* Command Display */}
                <div>
                  <Label className='pl-1 pb-2'>Command</Label>
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                    <code className="text-sm font-mono text-gray-700">{formData.command}</code>
                    <p className="text-xs text-gray-500 mt-1">
                      This command will be sent to the device when the schedule executes
                    </p>
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
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
                        <label key={day} className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={formData.daysOfWeek?.includes(index + 1) || false}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  daysOfWeek: [...(formData.daysOfWeek || []), index + 1]
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  daysOfWeek: (formData.daysOfWeek || []).filter(d => d !== index + 1)
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
                          : 'border-gray-300 bg-gray-100 hover:bg-gray-200 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`transition-transform hover:scale-110 cursor-pointer ${
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
                                                         <p className={`text-xs ${
                               schedule.isActive ? 'text-gray-500' : 'text-gray-400'
                             }`}>
                               Command: <code className="bg-gray-100 px-1 rounded">{getDeviceCommand(schedule.deviceType, schedule.action)}</code>
                             </p>
                            <div className={`flex items-center gap-4 mt-1 text-xs ${
                              schedule.isActive ? 'text-gray-500' : 'text-gray-400'
                            }`}>
                              <span className="flex items-center gap-1 cursor-pointer group">
                                {/* <Clock className="w-3 h-3 transition-transform hover:scale-125 cursor-pointer" /> */}
                                <span className={`transition-colors ${
                                  schedule.isActive ? 'group-hover:text-blue-600' : ''
                                }`}>{`${schedule.hour.toString().padStart(2, '0')}:${schedule.minute.toString().padStart(2, '0')}`}</span>
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
                            onClick={() => handleDelete(schedule)}
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
                  <span className="transition-transform hover:scale-110 cursor-pointer">{getDeviceIcon(device.type)}</span>
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

      {/* Confirmation Popups */}
      {showDeleteConfirm && scheduleToAction && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl border border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="text-red-500">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Delete Schedule</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete &quot;{scheduleToAction.name}&quot; schedule? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button
                onClick={confirmDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white cursor-pointer"
              >
                Delete
              </Button>
              <Button
                onClick={cancelAction}
                variant="outline"
                className="flex-1 cursor-pointer"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {showToggleConfirm && scheduleToAction && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl border border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <div className={scheduleToAction.isActive ? 'text-orange-500' : 'text-green-500'}>
                {scheduleToAction.isActive ? (
                  <PowerOff className="w-6 h-6" />
                ) : (
                  <Power className="w-6 h-6" />
                )}
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                {scheduleToAction.isActive ? 'Disable Schedule' : 'Enable Schedule'}
              </h3>
            </div>
            <p className="text-gray-600 mb-6">
              {scheduleToAction.isActive 
                ? `Are you sure you want to disable &quot;${scheduleToAction.name}&quot; schedule? The schedule will stop running.`
                : `Are you sure you want to enable &quot;${scheduleToAction.name}&quot; schedule? The schedule will start running.`
              }
            </p>
            <div className="flex gap-3">
              <Button
                onClick={confirmToggle}
                className={`flex-1 cursor-pointer ${
                  scheduleToAction.isActive 
                    ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {scheduleToAction.isActive ? 'Disable' : 'Enable'}
              </Button>
              <Button
                onClick={cancelAction}
                variant="outline"
                className="flex-1 cursor-pointer"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


