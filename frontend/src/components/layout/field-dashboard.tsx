'use client';
import React from 'react';

export default function FieldDashboard({
  field,
}: {
  field: {
    id: string;
    name: string;
    area: string;
    sensors: {
      temperature: number;
      humidity: number;
      soilMoisture: number;
      wind: number;
      ph: number;
      health: number;
    };
  };
}) {
  const { sensors } = field;

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Thông tin chung */}
      <div className="col-span-2 bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-bold mb-2">{field.name}</h2>
        <p className="text-gray-600 mb-4">Area: {field.area}</p>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-green-100 p-4 rounded-lg">
            <div className="text-lg font-bold">{sensors.health}%</div>
            <div className="text-sm text-green-800">Health</div>
          </div>
          <div className="bg-blue-100 p-4 rounded-lg">
            <div className="text-lg font-bold">{sensors.wind} m/s</div>
            <div className="text-sm">Wind</div>
          </div>
          <div className="bg-red-100 p-4 rounded-lg">
            <div className="text-lg font-bold">{sensors.temperature} °C</div>
            <div className="text-sm">Temperature</div>
          </div>
          <div className="bg-yellow-100 p-4 rounded-lg">
            <div className="text-lg font-bold">{sensors.ph}</div>
            <div className="text-sm">pH Level</div>
          </div>
          <div className="bg-indigo-100 p-4 rounded-lg">
            <div className="text-lg font-bold">{sensors.humidity}%</div>
            <div className="text-sm">Humidity</div>
          </div>
          <div className="bg-teal-100 p-4 rounded-lg">
            <div className="text-lg font-bold">{sensors.soilMoisture}%</div>
            <div className="text-sm">Soil Moisture</div>
          </div>
        </div>
      </div>

      {/* Cảm biến danh sách bên phải */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex justify-between mb-4">
          <h3 className="font-bold text-lg">Sensor</h3>
          <button className="text-sm text-green-600">Add new</button>
        </div>
        <ul className="space-y-3">
          <li className="flex justify-between">
            <span>Sensor 1: Temp</span>
            <span className="text-green-600 text-sm">●</span>
          </li>
          <li className="flex justify-between">
            <span>Sensor 2: pH</span>
            <span className="text-red-600 text-sm">●</span>
          </li>
          <li className="flex justify-between">
            <span>Sensor 3: Soil Moisture</span>
            <span className="text-green-600 text-sm">●</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
