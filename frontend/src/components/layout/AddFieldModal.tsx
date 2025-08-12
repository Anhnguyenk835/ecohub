"use client"

import { useState, useEffect, FormEvent } from "react";

interface ThresholdSetting {
  enabled: boolean;
  min: number;
  max: number;
}

interface Thresholds {
  temperature: ThresholdSetting;
  airHumidity: ThresholdSetting;
  soilMoisture: ThresholdSetting;
  lightIntensity: ThresholdSetting;
  pH: ThresholdSetting;
  Co2: ThresholdSetting;
}

interface FormState {
  name: string;
  location: string;
  thresholds: Thresholds;
}

interface AddFieldModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FormState) => Promise<void>;
  fieldCount: number;
}

const getDefaultFormState = (fieldCount: number): FormState => ({
  name: `New Field #${fieldCount + 1}`,
  location: "",
  thresholds: {
    temperature: { enabled: true, min: 15, max: 30 },
    airHumidity: { enabled: true, min: 40, max: 70 },
    soilMoisture: { enabled: true, min: 30, max: 60 },
    lightIntensity: { enabled: true, min: 0, max: 10000 },
    pH: { enabled: true, min: 6, max: 7 },
    Co2: { enabled: true, min: 400, max: 1000 },
  },
});

export function AddFieldModal({ isOpen, onClose, onSubmit, fieldCount }: AddFieldModalProps) {
  const [formData, setFormData] = useState<FormState>(getDefaultFormState(fieldCount));
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
      setFormData(getDefaultFormState(fieldCount));
    }
  }, [isOpen, fieldCount]);

  if (!isOpen) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleThresholdChange = (key: keyof Thresholds, field: 'min' | 'max', value: string) => {
    setFormData(prev => ({
      ...prev,
      thresholds: {
        ...prev.thresholds,
        [key]: {
          ...prev.thresholds[key],
          [field]: parseFloat(value) || 0
        }
      }
    }));
  };
  
  const handleThresholdToggle = (key: keyof Thresholds) => {
     setFormData(prev => ({
      ...prev,
      thresholds: {
        ...prev.thresholds,
        [key]: {
          ...prev.thresholds[key],
          enabled: !prev.thresholds[key].enabled
        }
      }
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert("Field name is required.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDisplayName = (key: string) => {
    if (key === 'airHumidity') return 'Air Humidity';
    if (key === 'soilMoisture') return 'Soil Moisture';
    if (key === 'lightIntensity') return 'Light Intensity';
    return key.charAt(0).toUpperCase() + key.slice(1);
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 m-4 overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">Add a New Field</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* --- Informations --- */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Field Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text" id="name" name="name" value={formData.name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                required
              />
            </div>
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                Location (Optional)
              </label>
              <input
                type="text" id="location" name="location" value={formData.location}
                onChange={handleInputChange} placeholder="E.g., Greenhouse A, Section 2"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
              />
            </div>
            
            {/* --- Thresholds --- */}
            <div className="pt-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Sensor Thresholds</h3>
                <div className="space-y-3">
                    {Object.keys(formData.thresholds).map((key) => {
                        const thresholdKey = key as keyof Thresholds;
                        const setting = formData.thresholds[thresholdKey];
                        return (
                            <div key={thresholdKey} className="p-3 bg-gray-50 rounded-md border">
                                <div className="flex items-center justify-between">
                                    <label htmlFor={`enable-${thresholdKey}`} className="font-medium text-gray-700">
                                      {getDisplayName(thresholdKey)}
                                    </label>
                                    <input
                                        type="checkbox"
                                        id={`enable-${thresholdKey}`}
                                        checked={setting.enabled}
                                        onChange={() => handleThresholdToggle(thresholdKey)}
                                        className="h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                                    />
                                </div>
                                <div className={`mt-2 grid grid-cols-2 gap-4 transition-opacity ${!setting.enabled ? 'opacity-50' : 'opacity-100'}`}>
                                    <div>
                                        <label htmlFor={`min-${thresholdKey}`} className="block text-xs text-gray-500">Min</label>
                                        <input
                                            type="number"
                                            id={`min-${thresholdKey}`}
                                            value={setting.min}
                                            onChange={(e) => handleThresholdChange(thresholdKey, 'min', e.target.value)}
                                            disabled={!setting.enabled}
                                            className="w-full mt-1 px-2 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm disabled:bg-gray-100"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor={`max-${thresholdKey}`} className="block text-xs text-gray-500">Max</label>
                                        <input
                                            type="number"
                                            id={`max-${thresholdKey}`}
                                            value={setting.max}
                                            onChange={(e) => handleThresholdChange(thresholdKey, 'max', e.target.value)}
                                            disabled={!setting.enabled}
                                            className="w-full mt-1 px-2 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm disabled:bg-gray-100"
                                        />
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
          </div>
          
          <div className="mt-8 flex justify-end space-x-3">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting || !formData.name.trim()} className="px-4 py-2 bg-[#29513F] text-white rounded-md hover:bg-[#1e3d2f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {isSubmitting ? "Creating..." : "Create Field"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}