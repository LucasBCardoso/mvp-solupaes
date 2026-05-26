import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';
import { api, type ApiOk } from '../lib/api';

interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  fantasyName: string;
  classification: 'A' | 'B' | 'C';
  viabilityScore: number;
  visitedAt: string;
}

const COLORS = { A: '#f59e0b', B: '#10b981', C: '#64748b' } as const;

export function MapPage() {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  const { data } = useQuery({
    queryKey: ['map-points'],
    queryFn: async () => {
      const res = await api.get<ApiOk<MapPoint[]>>('/dashboard/map');
      return res.data.data;
    },
  });

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = L.map(ref.current).setView([-29.5, -52.5], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !data) return;
    const map = mapRef.current;
    // markerClusterGroup vem do plugin leaflet.markercluster
    const cluster = (L as unknown as { markerClusterGroup: (opts: unknown) => L.LayerGroup }).markerClusterGroup({
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
    });

    const validPoints = data.filter((p) => p.lat != null && p.lng != null);
    validPoints.forEach((p) => {
      const color = COLORS[p.classification];
      const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="background:${color};width:16px;height:16px;border-radius:9999px;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      const marker = L.marker([p.lat, p.lng], { icon }).bindPopup(
        `<strong>${p.fantasyName}</strong><br/>Classe ${p.classification} · Score ${p.viabilityScore}<br/><small>${new Date(p.visitedAt).toLocaleString('pt-BR')}</small>`,
      );
      cluster.addLayer(marker);
    });

    map.addLayer(cluster);

    if (validPoints.length > 0) {
      const bounds = L.latLngBounds(validPoints.map((p) => [p.lat, p.lng] as [number, number]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    }

    return () => {
      map.removeLayer(cluster);
    };
  }, [data]);

  return (
    <div className="h-full flex flex-col">
      <header className="p-4 md:p-6 border-b border-slate-200 bg-white">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Mapa de PDVs</h2>
        <p className="text-sm text-slate-500 mt-1">
          {data?.length ?? 0} visitas geolocalizadas · clique nos pins para detalhes
        </p>
      </header>
      <div ref={ref} className="flex-1 relative" style={{ minHeight: '500px' }} />
      <div className="absolute top-32 right-4 md:right-6 z-[400] bg-white rounded-xl shadow-lg border border-slate-200 p-3 text-xs space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-amber-500" /> Classe A
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500" /> Classe B
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-slate-500" /> Classe C
        </div>
      </div>
    </div>
  );
}
