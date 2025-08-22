'use client'

import { useParams } from 'next/navigation' 
import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { cn } from "@/lib/utils" // GIẢ SỬ: bạn có hàm cn từ shadcn/ui. Nếu không, dùng clsx

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import NotificationPreferences from "@/components/layout/NotificationPreferences" 

const SENSOR_DISPLAY_NAMES: { [key: string]: string } = {
  'PH': 'pH Sensor',
  'CO2': 'CO2 Sensor',
  'Light': 'Light Intensity Sensor',
  'Soil': 'Soil Moisture Sensor',
  'DHT22': 'Temperature & Humidity Sensor'
};

const ACTUATOR_DISPLAY_NAMES: { [key: string]: string } = {
  'Light': 'Led',
  'Fan': 'Fan',
  'WaterPump': 'Water Pump',
  'Heater': 'Heater'
};

interface ThresholdSetting {
  enabled: boolean
  min: number
  max: number
}

interface ZoneData {
  id: string
  name: string
  location: string | null
  createdAt: string 
  thresholds: {
    temperature?: ThresholdSetting
    airHumidity?: ThresholdSetting
    soilMoisture?: ThresholdSetting
    lightIntensity?: ThresholdSetting
    ph?: ThresholdSetting
    co2?: ThresholdSetting
  }
}

interface Sensor {
  id: string
  name: string
  type: string
}
interface Actuator {
  id: string
  name: string
  type: string
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"; 

export default function ZoneSettingsPage() {
  const params = useParams()
  const { user, isLoading: authLoading, getToken } = useAuth() 

  const zoneId = params.zoneId as string 

  const [zoneData, setZoneData] = useState<ZoneData | null>(null)
  const [originalZoneData, setOriginalZoneData] = useState<ZoneData | null>(null); 
  const [sensors, setSensors] = useState<Sensor[]>([])
  const [actuators, setActuators] = useState<Actuator[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDirty, setIsDirty] = useState(false)
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState("")
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

  useEffect(() => {
    if (!zoneId || authLoading || !user) {
        if (authLoading) return;
        if (!user) {
            toast("Bạn cần đăng nhập để xem trang này.", { type: "error" });
            setIsLoading(false);
        }
        return;
    };

    const fetchData = async () => {
      setIsLoading(true)
      try {
        const token = await getToken();
        if (!token) throw new Error("Không thể lấy token xác thực.");
        
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        const [zoneRes, sensorsRes, actuatorsRes] = await Promise.all([
            fetch(`${API_BASE_URL}/zones/${zoneId}/settings-data`, { headers }),
            fetch(`${API_BASE_URL}/sensors?zone_id=${zoneId}`, { headers }),
            fetch(`${API_BASE_URL}/actuators?zone_id=${zoneId}`, { headers })
        ]);

        if (!zoneRes.ok) throw new Error(`Error loading area data: ${zoneRes.status} ${zoneRes.statusText}`)
        if (!sensorsRes.ok) throw new Error(`Error loadinng sensors: ${sensorsRes.statusText}`)
        if (!actuatorsRes.ok) throw new Error(`Error loading actuators: ${actuatorsRes.statusText}`)
        
        const zoneJson: ZoneData = await zoneRes.json()
        const sensorsJson: Sensor[] = await sensorsRes.json()
        const actuatorsJson: Actuator[] = await actuatorsRes.json()

        setZoneData(zoneJson)
        setOriginalZoneData(JSON.parse(JSON.stringify(zoneJson)));
        setSensors(sensorsJson)
        setActuators(actuatorsJson)
        
      } catch (error: any) {
        console.error("Lỗi khi fetch dữ liệu:", error)
        toast(error.message || "Không thể tải dữ liệu cài đặt.", { type: "error" })
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchData()
  }, [zoneId, user, authLoading, getToken])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setZoneData(prev => {
        const newData = prev ? { ...prev, [name]: value } : null;
        if (newData && originalZoneData) {
            if (newData.name !== originalZoneData.name || newData.location !== originalZoneData.location) {
                setIsDirty(true);
            } else {
                setIsDirty(false);
            }
        }
        return newData;
    })
  }

  const handleSaveChanges = async () => {
      if (!zoneData) return
      
      try {
        const token = await getToken();
        if (!token) throw new Error("Không thể lấy token xác thực.");
        
        const updatePayload = {
            name: zoneData.name,
            location: zoneData.location,
        };

        const response = await fetch(`${API_BASE_URL}/zones/${zoneId}`, {
          method: 'PUT',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify(updatePayload),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || "Error.");
        }
        
        const updatedZone = await response.json();

        toast("Update successfully", { type: "success" });
        setIsDirty(false);
        setZoneData(updatedZone);
        setOriginalZoneData(JSON.parse(JSON.stringify(updatedZone)));

      } catch (error: any) {
        toast(error.message || "Can't update", { type: "error" });
      }
  }

  const handleDeleteZone = async () => {
    try {
      const token = await getToken();
      if (!token) throw new Error("Không thể lấy token xác thực.");

      const response = await fetch(`${API_BASE_URL}/zones/${zoneId}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status !== 204) throw new Error("Lỗi khi xóa khu vực.");
    
      toast("Đã xóa khu vực thành công!", { type: "success" });
      setIsDeleteModalOpen(false)
      window.location.href = '/dashboard'; 
    } catch (error: any) {
      toast(error.message || "Không thể xóa khu vực.", { type: "error" });
    }
  }

  if (isLoading || authLoading) {
    return <SettingsPageSkeleton />
  }

  if (!zoneData) {
    return <div className="p-6">Không tìm thấy dữ liệu cho khu vực này hoặc bạn không có quyền truy cập.</div>
  }

  return (
    <div className="space-y-6 p-4 md:p-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Setting</h1>
          <p className="text-muted-foreground">{zoneData.name}</p>
          <code className="text-xs text-muted-foreground mt-1 block">{zoneData.id}</code>
        </div>
        {/* ========================== BẮT ĐẦU VÙNG SỬA ĐỔI ========================== */}
        <Button 
          onClick={handleSaveChanges} 
          disabled={!isDirty}
          className={cn(
            "transition-colors", // Thêm hiệu ứng chuyển màu mượt mà
            isDirty && "bg-destructive hover:bg-destructive/90" // Nếu có thay đổi, áp dụng class màu đỏ
          )}
        >
          Update
        </Button>
        {/* ========================== KẾT THÚC VÙNG SỬA ĐỔI ========================== */}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Information</CardTitle>
          <CardDescription>Show info & update for zone.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Zone Name</Label>
              <Input id="name" name="name" value={zoneData.name} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" name="location" value={zoneData.location || ''} onChange={handleInputChange} placeholder="VD: Lô A, Vườn 2" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Thresholds</CardTitle>
          <CardDescription>Safe limits for environmental fields (read-only).</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          {Object.entries({
              temperature: { title: "Temperature", unit: "°C" },
              airHumidity: { title: "Air Humidity", unit: "%" },
              soilMoisture: { title: "Soil Moisture", unit: "%" },
              lightIntensity: { title: "Light Intensity", unit: "lux" },
              ph: { title: "pH", unit: "" },
              co2: { title: "CO2", unit: "ppm" },
          }).map(([key, labelInfo]) => {
            const metricKey = key as keyof ZoneData['thresholds'];
            const value = (zoneData.thresholds && zoneData.thresholds[metricKey]) 
                           ? zoneData.thresholds[metricKey] 
                           : { enabled: false, min: 0, max: 0 };

            return (
              <div key={key} className="space-y-3 opacity-70">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold">{labelInfo.title}</Label>
                  <Switch
                    checked={value!.enabled}
                    disabled
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Input type="number" placeholder="Min" value={value!.min} disabled />
                  <span>-</span>
                  <Input type="number" placeholder="Max" value={value!.max} disabled />
                  <span className="w-12 text-sm text-muted-foreground text-right">{labelInfo.unit}</span>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
      
      <Card>
          <CardHeader>
            <CardTitle>Device Control</CardTitle>
            <CardDescription>Manage Sensors & Actuators in the zone</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="sensors">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="sensors">Sensors ({sensors.length})</TabsTrigger>
                <TabsTrigger value="actuators">Actuators ({actuators.length})</TabsTrigger>
                <TabsTrigger value="notifications">Notification</TabsTrigger>
              </TabsList>
              <TabsContent value="sensors" className="mt-4 space-y-2">
                 {sensors.map(sensor => (
                    <div key={sensor.id} className="flex items-center justify-between p-2 border rounded-md">
                        <div>
                            <p className="font-medium">
                              {SENSOR_DISPLAY_NAMES[sensor.type] || sensor.name}
                            </p>
                            <p className="text-sm text-muted-foreground">{sensor.type}</p>
                        </div>
                    </div>
                 ))}
              </TabsContent>
              <TabsContent value="actuators" className="mt-4 space-y-2">
                 {actuators.map(actuator => (
                    <div key={actuator.id} className="flex items-center justify-between p-2 border rounded-md">
                        <div>
                            <p className="font-medium">
                              {ACTUATOR_DISPLAY_NAMES[actuator.type] || actuator.name}
                            </p>
                            <p className="text-sm text-muted-foreground">{actuator.type}</p>
                        </div>
                    </div>
                 ))}
              </TabsContent>
              <TabsContent value="notifications" className="mt-4">
                <NotificationPreferences />
              </TabsContent>
            </Tabs>
          </CardContent>
      </Card>

      <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Dangerous Zone</CardTitle>
            <CardDescription>The following actions cannot be undone. Be careful.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="font-medium">Delete zone</p>
              <p className="text-sm text-muted-foreground">All data, devices and history will be permanently deleted.</p>
            </div>
            <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <DialogTrigger asChild>
                    <Button variant="destructive">Delete</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                    <DialogTitle>Are you sure you want to delete?</DialogTitle>
                    <DialogDescription>
                        This action cannot be undone. All data for the 
                        <span className="font-bold text-foreground"> {zoneData?.name} </span> 
                        will be deleted. To confirm, please enter the name of the area in the box below.
                    </DialogDescription>
                    </DialogHeader>
                    <Input 
                        value={deleteConfirmationInput}
                        onChange={(e) => setDeleteConfirmationInput(e.target.value)}
                        placeholder={zoneData?.name}
                    />
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
                      <Button 
                          variant="destructive"
                          disabled={deleteConfirmationInput !== zoneData?.name}
                          onClick={handleDeleteZone}
                      >
                          I understand, delete this zone
                      </Button>
                  </DialogFooter>
                </DialogContent>
            </Dialog> 
          </CardContent>
        </Card>
    </div>
  )
}

function SettingsPageSkeleton() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-5 w-48" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40 mb-2" />
          <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}