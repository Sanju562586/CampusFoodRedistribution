"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Check, X, Search, Navigation, Loader2, AlertCircle, Target } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (lat: number, lng: number) => void;
  initialLat?: number | null;
  initialLng?: number | null;
};

export default function LocationMapPicker({
  open,
  onClose,
  onConfirm,
  initialLat,
  initialLng,
}: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);

  const [selectedLat, setSelectedLat] = useState<number | null>(initialLat ?? null);
  const [selectedLng, setSelectedLng] = useState<number | null>(initialLng ?? null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  
  const [gpsState, setGpsState] = useState<"idle" | "acquiring" | "done">("idle");
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const watchRef = useRef<number | null>(null);

  // ── Create / destroy Leaflet map ──────────────────────────────────────────
  useEffect(() => {
    if (!open) return;

    let destroyed = false;

    const init = async () => {
      // Dynamically import leaflet to avoid SSR issues
      const L = (await import("leaflet")).default;

      // Import leaflet CSS imperatively
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      if (destroyed || !mapContainerRef.current) return;

      leafletRef.current = L;

      // Custom beautiful green pin icon
      const pinIcon = L.divIcon({
        html: `
          <div style="position:relative;width:36px;height:44px;filter:drop-shadow(0 4px 8px rgba(26,92,46,0.4))">
            <svg viewBox="0 0 36 44" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:36px;height:44px">
              <path d="M18 0C8.059 0 0 8.059 0 18c0 12.314 16.298 25.032 17.004 25.578a1.6 1.6 0 001.992 0C19.702 43.032 36 30.314 36 18 36 8.059 27.941 0 18 0z" fill="#1a5c2e"/>
              <circle cx="18" cy="18" r="8" fill="white"/>
              <circle cx="18" cy="18" r="5" fill="#1a5c2e"/>
            </svg>
          </div>`,
        iconSize: [36, 44],
        iconAnchor: [18, 44],
        className: "",
      });

      const centerLat = initialLat ?? 12.9716;
      const centerLng = initialLng ?? 77.5946;

      const map = L.map(mapContainerRef.current, {
        center: [centerLat, centerLng],
        zoom: initialLat ? 18 : 15,
        zoomControl: true,
        attributionControl: true,
      });

      // Use high-detail OpenStreetMap tiles
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 21,
        maxNativeZoom: 19,
      }).addTo(map);

      // Place initial marker if coordinates exist
      if (initialLat && initialLng) {
        const m = L.marker([initialLat, initialLng], {
          icon: pinIcon,
          draggable: true,
        }).addTo(map);
        m.on("dragend", (e: any) => {
          const pos = e.target.getLatLng();
          setSelectedLat(pos.lat);
          setSelectedLng(pos.lng);
        });
        markerRef.current = m;
      }

      // Click to place / move pin
      map.on("click", (e: any) => {
        const { lat, lng } = e.latlng;

        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          const m = L.marker([lat, lng], {
            icon: pinIcon,
            draggable: true,
          }).addTo(map);
          m.on("dragend", (ev: any) => {
            const pos = ev.target.getLatLng();
            setSelectedLat(pos.lat);
            setSelectedLng(pos.lng);
          });
          markerRef.current = m;
        }

        setSelectedLat(lat);
        setSelectedLng(lng);
      });

      leafletMapRef.current = map;

      // Wait for modal animation then fix map size
      setTimeout(() => {
        if (!destroyed) map.invalidateSize();
      }, 150);
    };

    init();

    return () => {
      destroyed = true;
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
        markerRef.current = null;
      }
      if (watchRef.current !== null) {
        navigator.geolocation.clearWatch(watchRef.current);
        watchRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ── Place marker helper (reused by GPS + search) ─────────────────────────
  const placeMarker = useCallback(
    (lat: number, lng: number, zoom = 18) => {
      const L = leafletRef.current;
      const map = leafletMapRef.current;
      if (!L || !map) return;

      const pinIcon = L.divIcon({
        html: `
          <div style="position:relative;width:36px;height:44px;filter:drop-shadow(0 4px 8px rgba(26,92,46,0.4))">
            <svg viewBox="0 0 36 44" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:36px;height:44px">
              <path d="M18 0C8.059 0 0 8.059 0 18c0 12.314 16.298 25.032 17.004 25.578a1.6 1.6 0 001.992 0C19.702 43.032 36 30.314 36 18 36 8.059 27.941 0 18 0z" fill="#1a5c2e"/>
              <circle cx="18" cy="18" r="8" fill="white"/>
              <circle cx="18" cy="18" r="5" fill="#1a5c2e"/>
            </svg>
          </div>`,
        iconSize: [36, 44],
        iconAnchor: [18, 44],
        className: "",
      });

      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        const m = L.marker([lat, lng], { icon: pinIcon, draggable: true }).addTo(map);
        m.on("dragend", (e: any) => {
          const pos = e.target.getLatLng();
          setSelectedLat(pos.lat);
          setSelectedLng(pos.lng);
        });
        markerRef.current = m;
      }

      map.flyTo([lat, lng], zoom, { animate: true, duration: 0.8 });
      setSelectedLat(lat);
      setSelectedLng(lng);
    },
    []
  );

  // ── GPS: watch position for best accuracy ────────────────────────────────
  const handleGPS = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current);
    }

    setGpsState("acquiring");
    setGpsAccuracy(null);
    let bestAccuracy = Infinity;

    const stop = () => {
      if (watchRef.current !== null) {
        navigator.geolocation.clearWatch(watchRef.current);
        watchRef.current = null;
      }
      setGpsState("done");
    };

    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setGpsAccuracy(Math.round(accuracy));

        if (accuracy < bestAccuracy) {
          bestAccuracy = accuracy;
          placeMarker(latitude, longitude, 19);
        }

        if (accuracy <= 15) stop();
      },
      () => {
        stop();
        setGpsState("idle");
        alert("Could not get your location. Please allow location access.");
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 }
    );

    setTimeout(() => {
      if (watchRef.current !== null) stop();
    }, 20000);
  };

  // ── Nominatim place search ────────────────────────────────────────────────
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchError("");
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}&limit=1`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();
      if (data.length > 0) {
        placeMarker(parseFloat(data[0].lat), parseFloat(data[0].lon), 18);
      } else {
        setSearchError("Place not found. Try a different search.");
      }
    } catch {
      setSearchError("Search failed. Check your connection.");
    }
    setSearching(false);
  };

  const handleConfirm = () => {
    if (selectedLat !== null && selectedLng !== null) {
      onConfirm(selectedLat, selectedLng);
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="bg-white rounded-3xl overflow-hidden shadow-2xl w-full flex flex-col"
        style={{ maxWidth: 700, maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#1a5c2e] flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-black text-gray-900 text-sm leading-tight">Select Pickup Location</p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Powered by OpenStreetMap — Free & secure
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* ── Search + GPS bar ───────────────────────────────────────────── */}
        <div className="px-4 py-3 border-b border-gray-100 flex gap-2 flex-shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search address, place or landmark…"
              className="w-full h-10 pl-9 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1a5c2e]/20 focus:border-[#1a5c2e]/40 transition-all"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={searching || !searchQuery.trim()}
            className="px-4 h-10 bg-[#1a5c2e] text-white text-sm font-bold rounded-xl hover:bg-[#16502a] transition-colors flex-shrink-0 disabled:opacity-50 flex items-center gap-1.5"
          >
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span className="hidden sm:inline">{searching ? "Searching…" : "Search"}</span>
          </button>
          <button
            onClick={handleGPS}
            disabled={gpsState === "acquiring"}
            title="Use my current GPS location"
            className={`px-3 h-10 text-xs font-bold rounded-xl flex items-center gap-1.5 flex-shrink-0 transition-all border ${
              gpsState === "done"
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
            } disabled:opacity-60`}
          >
            {gpsState === "acquiring" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : gpsState === "done" ? (
              <Target className="w-4 h-4" />
            ) : (
              <Navigation className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">
              {gpsState === "acquiring"
                ? gpsAccuracy !== null
                  ? `±${gpsAccuracy} m`
                  : "Acquiring…"
                : gpsState === "done" && gpsAccuracy !== null
                ? `±${gpsAccuracy} m`
                : "My Location"}
            </span>
          </button>
        </div>

        {/* Search error */}
        <AnimatePresence>
          {searchError && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="px-4 py-2 text-xs text-red-600 bg-red-50 border-b border-red-100 flex items-center gap-2"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              {searchError}
            </motion.p>
          )}
        </AnimatePresence>

        {/* ── GPS accuracy warning ───────────────────────────────────────── */}
        <AnimatePresence>
          {gpsState !== "idle" && gpsAccuracy !== null && gpsAccuracy > 50 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-100 flex-shrink-0"
            >
              <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              <p className="text-[11px] text-amber-700 font-medium">
                GPS accuracy is ±{gpsAccuracy} m — move to open sky or drag the pin to the exact spot.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Map ────────────────────────────────────────────────────────── */}
        <div className="relative flex-1" style={{ minHeight: 360 }}>
          <div
            ref={mapContainerRef}
            className="w-full h-full absolute inset-0 z-0"
            style={{ minHeight: 360 }}
          />

          {/* Instruction overlay (only shown until pin placed) */}
          {!selectedLat && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs font-semibold px-5 py-2 rounded-full backdrop-blur-sm pointer-events-none z-[1000] flex items-center gap-2 shadow-lg"
            >
              <MapPin className="w-3.5 h-3.5" />
              Tap anywhere on the map to drop a pin
            </motion.div>
          )}

          {/* GPS accuracy indicator */}
          <AnimatePresence>
            {gpsState === "acquiring" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-semibold px-5 py-2 rounded-full flex items-center gap-2 z-[1000] shadow-lg"
              >
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {gpsAccuracy !== null
                  ? `Refining GPS… accuracy ±${gpsAccuracy} m`
                  : "Acquiring GPS signal…"}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between gap-3 flex-shrink-0 bg-gray-50/80">
          {selectedLat !== null && selectedLng !== null ? (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-emerald-700 leading-tight">
                  Pin placed ✓
                  {gpsState === "done" && gpsAccuracy !== null && (
                    <span className="ml-1.5 font-normal text-emerald-600">
                      (GPS ±{gpsAccuracy} m)
                    </span>
                  )}
                </p>
                <p className="text-[11px] font-mono text-gray-500 truncate">
                  {selectedLat.toFixed(7)}, {selectedLng.toFixed(7)}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-gray-400">
              <MapPin className="w-4 h-4" />
              <p className="text-xs">No location selected yet</p>
            </div>
          )}

          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors z-[1000]"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedLat === null || selectedLng === null}
              className="px-5 py-2 text-sm font-bold text-white bg-[#1a5c2e] rounded-xl hover:bg-[#16502a] transition-colors disabled:opacity-40 flex items-center gap-2 shadow-sm z-[1000]"
            >
              <Check className="w-4 h-4" />
              Confirm Location
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
