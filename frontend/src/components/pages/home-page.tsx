"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Star, ArrowRight, ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { Navbar } from "../layout/nav-bar"
import { FieldCard, type FieldData } from "../layout/field-card"
import { AddFieldModal } from "../layout/AddFieldModal"
import { LoadingOverlay } from "../ui/loading-overlay"
import { get, post, del } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"  
import { useRouter } from "next/navigation"
// Import động mqtt sẽ được thực hiện trong useEffect

export default function HomePage() {
  const [scrollPosition, setScrollPosition] = useState(0)
  const [fields, setFields] = useState<FieldData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)
  const [navigatingToZone, setNavigatingToZone] = useState<string | null>(null)
  const { user } = useAuth()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [hasOverflow, setHasOverflow] = useState(false)
  const router = useRouter()

  const ownerId = useMemo(() => {
    if (user?.uid) return user.uid
    try { return sessionStorage.getItem('uid') || undefined } catch { return undefined }
  }, [user?.uid])

  // ====================================================================
  // === BƯỚC 1: THAY THẾ LOGIC FETCH DỮ LIỆU BAN ĐẦU =====================
  // ====================================================================
  useEffect(() => {
    if (!ownerId) {
      setFields([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchInitialFields() {
      setLoading(true);
      setError(null);
      try {
        // Gọi API mới - chỉ một lần duy nhất để lấy cả zone và status
        const zonesWithStatus = await get<any[]>(`/zones/user/my-zones`);

        if (!cancelled) {
          const mappedFields: FieldData[] = zonesWithStatus.map(z => ({
            id: z.id,
            name: z.name,
            area: z.location || '',
            status: z.status?.status || 'Unknown', // Lấy status từ dữ liệu trả về
            image: '/field.jpg',
          }));
          setFields(mappedFields);
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Failed to load fields';
        if (!cancelled) setError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchInitialFields();

    return () => { cancelled = true; };
  }, [ownerId]);

  // ====================================================================
  // === BƯỚC 2: THÊM LOGIC LẮNG NGHE MQTT/WEBSOCKET =====================
  // ====================================================================
  useEffect(() => {
    // Chỉ kết nối MQTT khi đã có danh sách fields để tránh kết nối không cần thiết
    if (fields.length === 0) {
      return;
    }

    let client: any = null;
    // Import động thư viện mqtt để đảm bảo nó chỉ chạy ở phía client
    import('mqtt').then(mqtt => {
      const brokerUrl = process.env.NEXT_PUBLIC_MQTT_BROKER_URL || 'ws://localhost:9001';
      client = mqtt.connect(brokerUrl);

      client.on('connect', () => {
        console.log('MQTT connected for Home Page status updates.');
        // Lắng nghe trên topic wildcard cho tất cả các zone
        client.subscribe('ecohub/zones/+/status_update', { qos: 1 });
      });

      client.on('message', (topic: string, payload: Buffer) => {
        try {
          const updatedStatusData = JSON.parse(payload.toString());
          const topicParts = topic.split('/');
          const updatedZoneId = topicParts[2]; // Lấy zoneId từ topic

          // Cập nhật state của component
          setFields(prevFields =>
            prevFields.map(field =>
              field.id === updatedZoneId
                ? { ...field, status: updatedStatusData.status || 'Updated' } // Cập nhật status cho đúng field
                : field
            )
          );
        } catch (e) {
          console.error("Error processing status update:", e);
        }
      });
    });

    // Hàm dọn dẹp để ngắt kết nối khi component unmount
    return () => {
      if (client) {
        client.end();
      }
    };
  }, [fields.length]); // Chạy lại effect này khi số lượng field thay đổi (sau khi fetch lần đầu)

  // ====================================================================
  // === CÁC HÀM VÀ LOGIC KHÁC GIỮ NGUYÊN ===============================
  // ====================================================================

  // Logic cuộn ngang
  useEffect(() => {
    function computeOverflow() {
      const el = containerRef.current
      if (!el) return setHasOverflow(false)
      setHasOverflow(el.scrollWidth > el.clientWidth)
    }
    computeOverflow()
    const onResize = () => computeOverflow()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [fields])

  const scroll = (direction: "left" | "right") => {
    const el = containerRef.current
    if (!el) return
    const scrollAmount = 320
    const maxScroll = el.scrollWidth - el.clientWidth
    const newPosition =
      direction === "left"
        ? Math.max(0, scrollPosition - scrollAmount)
        : Math.min(maxScroll, scrollPosition + scrollAmount)
    el.scrollTo({ left: newPosition, behavior: "smooth" })
    setScrollPosition(newPosition)
  }

  const canScrollLeft = scrollPosition > 0
  const canScrollRight = (() => {
    const el = containerRef.current
    if (!el) return false
    const maxScroll = el.scrollWidth - el.clientWidth
    return scrollPosition < maxScroll
  })()

  // Logic thêm/xóa field
  type CreateZoneRequest = { name: string; location?: string }
  const handleCreateField = async (formDataFromModal: CreateZoneRequest) => {
    if (!ownerId) {
      alert("Cannot add field: User not identified.");
      throw new Error("User not identified.");
    }
    const newFieldData = { ...formDataFromModal, owner: ownerId };
    try {
      type CreatedZone = { id: string; name: string; location?: string }
      const createdZone = await post<CreatedZone>('/zones/', newFieldData);
      const newFieldForUI: FieldData = {
        id: createdZone.id,
        name: createdZone.name,
        area: createdZone.location || '',
        status: 'Initializing', // Trạng thái ban đầu
        image: '/field.jpg',
      };
      setFields(prevFields => [...prevFields, newFieldForUI]);
      setIsModalOpen(false); 
    } catch (error) {
      console.error("Failed to add new field:", error);
      const errorMessage = error instanceof Error ? error.message : "Could not add field";
      alert(`Error: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  };

  const handleDeleteField = async (id: string) => {
    const fieldToDelete = fields.find(f => f.id === id);
    const fieldName = fieldToDelete ? fieldToDelete.name : 'this field';
    if (!window.confirm(`Are you sure you want to delete "${fieldName}"? This will delete all associated devices and data, and cannot be undone.`)) {
      return;
    }
    try {
      await del(`/zones/${id}`);
      setFields(prevFields => prevFields.filter(field => field.id !== id));
      alert(`Field "${fieldName}" has been deleted successfully.`);
    } catch (error) {
      console.error(`Failed to delete field ${id}:`, error);
      alert("Error: Could not delete the field. Please try again.");
    }
  };

  const handleFieldClick = (zoneId: string, zoneName: string) => {
    setIsNavigating(true);
    setNavigatingToZone(zoneName);
    
    // Add a small delay to show the loading state
    setTimeout(() => {
      router.push(`/dashboard/${zoneId}`);
    }, 100);
  };

  // Phần JSX để render giao diện
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Loading Overlay */}
      <LoadingOverlay 
        isVisible={isNavigating} 
        message={navigatingToZone ? `Loading ${navigatingToZone} dashboard...` : "Loading dashboard..."}
      />

      {/* Hero Section */}
      <div className="relative h-64 bg-gradient-to-r from-green-600 to-green-800">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/home_image.png')" }}>
          <div className="absolute inset-0 bg-green-900/30" />
        </div>
      </div>

      {/* AI Recommendation Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 relative z-10">
        <div className="bg-gradient-to-r from-[#B7CAC4] to-[#5A8776] hover:from-[#a6bcb5] hover:to-[#4d7868] transition-colors rounded-full px-6 py-3 flex items-center justify-between cursor-pointer group shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <Star className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-medium">Check our AI recommendation for your fields</span>
          </div>
          <ArrowRight className="w-5 h-5 text-white group-hover:translate-x-1 transition-transform" />
        </div>
      </div>

      {/* My Fields Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">My Fields</h2>
          <div className="flex items-center space-x-4">
            <button
                onClick={() => setIsModalOpen(true)}
                disabled={!ownerId}        
                className="bg-[#29513F]/80 hover:bg-[#1e3d2f]/80 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              <span>Add new</span>
            </button>
          </div>
        </div>

        <div className="relative">
          {hasOverflow && (
            <>
              <button onClick={() => scroll("left")} disabled={!canScrollLeft} className="...">
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <button onClick={() => scroll("right")} disabled={!canScrollRight} className="...">
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </>
          )}

          <div
            id="fields-container"
            ref={containerRef}
            onScroll={(e) => setScrollPosition((e.target as HTMLDivElement).scrollLeft)}
            className="flex space-x-6 overflow-x-auto scrollbar-hide pb-4"
          >
            {loading && <p>Loading fields...</p>}
            {error && <p className="text-red-500">Error: {error}</p>}
            {!loading && !error && fields.map((field) => (
              <FieldCard
                key={field.id}
                field={field}
                onClick={() => handleFieldClick(field.id, field.name)}
                onDelete={handleDeleteField}
              />
            ))}
            {!loading && fields.length === 0 && (
              <div className="text-gray-500">No fields yet. Click 'Add new' to get started.</div>
            )}
          </div>
        </div>
      </div>
      <AddFieldModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateField}
        fieldCount={fields.length}
      />
    </div>
  )
}