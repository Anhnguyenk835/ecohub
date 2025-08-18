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
            toast.error("Bạn cần đăng nhập để xem trang này.");
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

        if (!zoneRes.ok) throw new Error(`Lỗi tải dữ liệu khu vực: ${zoneRes.status} ${zoneRes.statusText}`)
        if (!sensorsRes.ok) throw new Error(`Lỗi tải danh sách cảm biến: ${sensorsRes.statusText}`)
        if (!actuatorsRes.ok) throw new Error(`Lỗi tải danh sách động cơ: ${actuatorsRes.statusText}`)
        
        const zoneJson: ZoneData = await zoneRes.json()
        const sensorsJson: Sensor[] = await sensorsRes.json()
        const actuatorsJson: Actuator[] = await actuatorsRes.json()

        setZoneData(zoneJson)
        setOriginalZoneData(JSON.parse(JSON.stringify(zoneJson)));
        setSensors(sensorsJson)
        setActuators(actuatorsJson)
        
      } catch (error: any) {
        console.error("Lỗi khi fetch dữ liệu:", error)
        toast.error(error.message || "Không thể tải dữ liệu cài đặt.")
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

        toast.success("Update successfully");
        setIsDirty(false);
        setZoneData(updatedZone);
        setOriginalZoneData(JSON.parse(JSON.stringify(updatedZone)));

      } catch (error: any) {
        toast.error(error.message || "Can't update");
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
    
      toast.success("Đã xóa khu vực thành công!");
      setIsDeleteModalOpen(false)
      window.location.href = '/dashboard'; 
    } catch (error: any) {
      toast.error(error.message || "Không thể xóa khu vực.");
    }
  }

  if (isLoading || authLoading) {
    return <SettingsPageSkeleton />
  }

  if (!zoneData) {
    return <div className="p-6">Không tìm thấy dữ liệu cho khu vực này hoặc bạn không có quyền truy cập.</div>
  }

  return (
    <div className="space-y--2 p-4 md:p-6">
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
            <CardTitle>Quản lý Thiết bị</CardTitle>
            <CardDescription>Xem và quản lý các cảm biến và cơ cấu chấp hành trong khu vực.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="sensors">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="sensors">Cảm biến ({sensors.length})</TabsTrigger>
                <TabsTrigger value="actuators">Cơ cấu chấp hành ({actuators.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="sensors" className="mt-4 space-y-2">
                 {sensors.map(sensor => (
                    <div key={sensor.id} className="flex items-center justify-between p-2 border rounded-md">
                        <div>
                            <p className="font-medium">{sensor.name}</p>
                            <p className="text-sm text-muted-foreground">{sensor.type}</p>
                        </div>
                        <Button variant="ghost" size="sm">Chỉnh sửa</Button>
                    </div>
                 ))}
              </TabsContent>
              <TabsContent value="actuators" className="mt-4 space-y-2">
                 {actuators.map(actuator => (
                    <div key={actuator.id} className="flex items-center justify-between p-2 border rounded-md">
                        <div>
                            <p className="font-medium">{actuator.name}</p>
                            <p className="text-sm text-muted-foreground">{actuator.type}</p>
                        </div>
                        <Button variant="ghost" size="sm">Chỉnh sửa</Button>
                    </div>
                 ))}
              </TabsContent>
            </Tabs>
          </CardContent>
      </Card>

      <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Vùng Nguy hiểm</CardTitle>
            <CardDescription>Các hành động sau không thể hoàn tác. Hãy cẩn thận.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="font-medium">Xóa khu vực này</p>
              <p className="text-sm text-muted-foreground">Toàn bộ dữ liệu, thiết bị và lịch sử sẽ bị xóa vĩnh viễn.</p>
            </div>
            <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <DialogTrigger asChild>
                    <Button variant="destructive">Xóa khu vực</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                    <DialogTitle>Bạn có chắc chắn muốn xóa?</DialogTitle>
                    <DialogDescription>
                        Hành động này không thể hoàn tác. Toàn bộ dữ liệu của khu vực 
                        <span className="font-bold text-foreground"> {zoneData?.name} </span> 
                        sẽ bị xóa vĩnh viễn. Để xác nhận, vui lòng nhập tên của khu vực vào ô bên dưới.
                    </DialogDescription>
                    </DialogHeader>
                    <Input 
                        value={deleteConfirmationInput}
                        onChange={(e) => setDeleteConfirmationInput(e.target.value)}
                        placeholder={zoneData?.name}
                    />
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Hủy</Button>
                      <Button 
                          variant="destructive"
                          disabled={deleteConfirmationInput !== zoneData?.name}
                          onClick={handleDeleteZone}
                      >
                          Tôi hiểu, xóa khu vực này
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