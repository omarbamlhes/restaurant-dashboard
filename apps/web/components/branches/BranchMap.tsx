'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { formatSAR, formatNumber } from '@/lib/utils';

interface Branch {
  id: string;
  name: string;
  nameAr: string;
  address: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  isMain: boolean;
  totalRevenue: number;
  todayOrders: number;
  availableTables: number;
  _count: { orders: number; employees: number; tables: number };
}

interface BranchMapProps {
  branches: Branch[];
  selectedBranch: Branch | null;
  onSelectBranch: (branch: Branch) => void;
}

function createBranchIcon(isMain: boolean, isSelected: boolean) {
  const size = isSelected ? 44 : 36;
  const color = isMain ? '#8b5cf6' : '#3b82f6';
  const ring = isSelected ? `<circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="none" stroke="${color}" stroke-width="3" opacity="0.4"/>` : '';

  return L.divIcon({
    html: `<div style="position:relative;width:${size}px;height:${size}px;">
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        ${ring}
        <circle cx="${size/2}" cy="${size/2}" r="${isSelected ? 16 : 14}" fill="${color}" stroke="white" stroke-width="3"/>
        <text x="${size/2}" y="${size/2 + 1}" text-anchor="middle" dominant-baseline="middle" fill="white" font-size="${isSelected ? 14 : 12}" font-weight="bold">🏪</text>
      </svg>
    </div>`,
    className: 'branch-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

function FlyToSelected({ branch }: { branch: Branch | null }) {
  const map = useMap();
  useEffect(() => {
    if (branch?.latitude && branch?.longitude) {
      map.flyTo([branch.latitude, branch.longitude], 12, { duration: 1 });
    }
  }, [branch, map]);
  return null;
}

export default function BranchMap({ branches, selectedBranch, onSelectBranch }: BranchMapProps) {
  const mappableBranches = branches.filter(b => b.latitude && b.longitude);

  if (mappableBranches.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-dark-hover">
        <div className="text-center p-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-200 dark:bg-dark-card flex items-center justify-center">
            <span className="text-3xl">🗺️</span>
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">لا توجد إحداثيات للفروع</p>
          <p className="text-xs text-gray-400 mt-1">أضف خط العرض والطول لعرض الفروع على الخريطة</p>
        </div>
      </div>
    );
  }

  const center: [number, number] = selectedBranch?.latitude && selectedBranch?.longitude
    ? [selectedBranch.latitude, selectedBranch.longitude]
    : [mappableBranches[0].latitude!, mappableBranches[0].longitude!];

  const bounds = L.latLngBounds(
    mappableBranches.map(b => [b.latitude!, b.longitude!] as [number, number])
  );

  return (
    <MapContainer
      center={center}
      zoom={6}
      bounds={mappableBranches.length > 1 ? bounds.pad(0.3) : undefined}
      style={{ height: '100%', width: '100%' }}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FlyToSelected branch={selectedBranch} />
      {mappableBranches.map((branch) => (
        <Marker
          key={branch.id}
          position={[branch.latitude!, branch.longitude!]}
          icon={createBranchIcon(branch.isMain, selectedBranch?.id === branch.id)}
          eventHandlers={{
            click: () => onSelectBranch(branch),
          }}
        >
          <Popup>
            <div className="text-right min-w-[200px] p-1" dir="rtl">
              <h3 className="font-bold text-base mb-1">{branch.nameAr}</h3>
              {branch.address && <p className="text-xs text-gray-500 mb-2">{branch.address}، {branch.city}</p>}
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-blue-50 rounded-lg p-2">
                  <p className="text-sm font-bold text-blue-700">{formatNumber(branch._count.orders)}</p>
                  <p className="text-[10px] text-blue-500">طلب</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-2">
                  <p className="text-sm font-bold text-purple-700">{branch._count.employees}</p>
                  <p className="text-[10px] text-purple-500">موظف</p>
                </div>
                <div className="bg-emerald-50 rounded-lg p-2 col-span-2">
                  <p className="text-sm font-bold text-emerald-700">{formatSAR(Number(branch.totalRevenue))} ر.س</p>
                  <p className="text-[10px] text-emerald-500">إجمالي الإيرادات</p>
                </div>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
