import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/** Full India geographic bounds — map always shows whole country */
const INDIA_BOUNDS = L.latLngBounds(
  L.latLng(6.5, 68.0), // southwest (Kerala / Lakshadweep edge)
  L.latLng(35.5, 97.5), // northeast (Kashmir / Arunachal)
);
const INDIA_CENTER: [number, number] = [22.5, 82.0];
const INDIA_ZOOM = 4.6;

/** Approximate centroids for Indian states / common region labels */
const REGION_COORDS: Record<string, [number, number]> = {
  "andhra pradesh": [15.9129, 79.74],
  "arunachal pradesh": [28.218, 94.7278],
  assam: [26.2006, 92.9376],
  bihar: [25.0961, 85.3131],
  chhattisgarh: [21.2787, 81.8661],
  goa: [15.2993, 74.124],
  gujarat: [22.2587, 71.1924],
  haryana: [29.0588, 76.0856],
  "himachal pradesh": [31.1048, 77.1734],
  jharkhand: [23.6102, 85.2799],
  karnataka: [15.3173, 75.7139],
  kerala: [10.8505, 76.2711],
  "madhya pradesh": [22.9734, 78.6569],
  madhya: [22.9734, 78.6569],
  maharashtra: [19.7515, 75.7139],
  manipur: [24.6637, 93.9063],
  meghalaya: [25.467, 91.3662],
  mizoram: [23.1645, 92.9376],
  nagaland: [26.1584, 94.5624],
  odisha: [20.9517, 85.0985],
  orissa: [20.9517, 85.0985],
  punjab: [31.1471, 75.3412],
  rajasthan: [27.0238, 74.2179],
  sikkim: [27.533, 88.5122],
  "tamil nadu": [11.1271, 78.6569],
  telangana: [18.1124, 79.0193],
  tripura: [23.9408, 91.9882],
  "uttar pradesh": [26.8467, 80.9462],
  uttarakhand: [30.0668, 79.0193],
  "west bengal": [22.9868, 87.855],
  delhi: [28.7041, 77.1025],
  "new delhi": [28.6139, 77.209],
  gurugram: [28.4595, 77.0266],
  gurgaon: [28.4595, 77.0266],
  hyderabad: [17.385, 78.4867],
  chennai: [13.0827, 80.2707],
  mumbai: [19.076, 72.8777],
  pune: [18.5204, 73.8567],
  bangalore: [12.9716, 77.5946],
  bengaluru: [12.9716, 77.5946],
  kolkata: [22.5726, 88.3639],
  ahmedabad: [23.0225, 72.5714],
  surat: [21.1702, 72.8311],
  jaipur: [26.9124, 75.7873],
  lucknow: [26.8467, 80.9462],
  chandigarh: [30.7333, 76.7794],
  "n+e": [26.5, 88.0],
  "north east": [26.5, 88.0],
  "s+w": [15.5, 74.5],
  "south west": [15.5, 74.5],
  cr: [22.5, 78.5],
  central: [22.5, 78.5],
  "central region": [22.5, 78.5],
  beverage: [19.0, 73.0],
};

const MARKER_COLORS = ["#F59E0B", "#64748B", "#0D9488", "#16A34A", "#2563EB", "#8B5CF6", "#DC2626"];

function resolveCoords(region: string): [number, number] | null {
  const key = region.trim().toLowerCase();
  if (REGION_COORDS[key]) return REGION_COORDS[key]!;
  for (const [name, coords] of Object.entries(REGION_COORDS)) {
    if (key.includes(name) || name.includes(key)) return coords;
  }
  return null;
}

/** Always lock camera to whole India — never zoom into a cluster of markers */
function FitIndiaOnly() {
  const map = useMap();
  useEffect(() => {
    map.setMaxBounds(INDIA_BOUNDS.pad(0.05));
    map.fitBounds(INDIA_BOUNDS, { padding: [12, 12], maxZoom: 5 });
    map.setMinZoom(4);
    map.setMaxZoom(7);
  }, [map]);
  return null;
}

export type RegionMapItem = {
  region: string;
  openCalls: number;
  assigned?: number;
  wip?: number;
  mrf?: number;
  intensity?: number;
};

export function IndiaLeafletMap({
  regions,
  onSelect,
  height = 320,
}: {
  regions: RegionMapItem[];
  onSelect?: (region: string) => void;
  height?: number;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  const markers = useMemo(() => {
    const max = Math.max(1, ...regions.map((r) => r.openCalls));
    return regions
      .map((r, i) => {
        const coords = resolveCoords(r.region);
        if (!coords) return null;
        // Cap radius so markers stay readable on country view
        const radius = 8 + Math.round((r.openCalls / max) * 12);
        return {
          ...r,
          coords,
          radius,
          color: MARKER_COLORS[i % MARKER_COLORS.length]!,
        };
      })
      .filter(Boolean) as Array<
      RegionMapItem & { coords: [number, number]; radius: number; color: string }
    >;
  }, [regions]);

  if (!ready) {
    return (
      <div
        className="flex items-center justify-center rounded-lg bg-[#F7F8FA] text-[13px] text-[#667085]"
        style={{ height }}
      >
        Loading India map…
      </div>
    );
  }

  return (
    <div
      className="relative z-0 overflow-hidden rounded-lg border border-[#E7EAF0] [&_.leaflet-container]:z-0 [&_.leaflet-pane]:z-auto"
      style={{ height }}
    >
      <MapContainer
        center={INDIA_CENTER}
        zoom={INDIA_ZOOM}
        minZoom={4}
        maxZoom={7}
        maxBounds={INDIA_BOUNDS.pad(0.05)}
        maxBoundsViscosity={1}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        className="h-full w-full"
        style={{ height: "100%", width: "100%", background: "#E8EEF5" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitIndiaOnly />
        {markers.map((m) => (
          <CircleMarker
            key={m.region}
            center={m.coords}
            radius={m.radius}
            pathOptions={{
              color: "#fff",
              weight: 2,
              fillColor: m.color,
              fillOpacity: 0.88,
            }}
            eventHandlers={{
              click: () => onSelect?.(m.region),
            }}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={1}>
              <span className="font-semibold">{m.region}</span>
              <span className="ml-1">{m.openCalls} open</span>
            </Tooltip>
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">{m.region}</p>
                <p>{m.openCalls} open calls</p>
                {m.assigned != null && <p>Assigned: {m.assigned}</p>}
                {m.wip != null && <p>WIP: {m.wip}</p>}
                <button
                  type="button"
                  className="mt-1 text-xs font-medium text-[#2563EB] underline"
                  onClick={() => onSelect?.(m.region)}
                >
                  Filter dashboard
                </button>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
