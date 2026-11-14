import { useState, useEffect } from 'react';
import axios from 'axios';

axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Polyline } from 'react-leaflet';
import L from 'leaflet';
import {
  Bus as BusIcon, Navigation, Map as MapIcon,
  List, Clock, RefreshCw, MapPin,
  LocateFixed, Crosshair, Target, Search, Play, Pause, RotateCcw, ChevronDown
} from 'lucide-react';
import './App.css';
import 'leaflet/dist/leaflet.css';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

const createBusMarker = (occupancy: number, capacity: number, status: string, isSelected: boolean) => {
  const percentage = (occupancy / capacity) * 100;
  let bg = '#10B981';
  if (status === 'Inactive') bg = '#64748B';
  else if (status === 'Delayed') bg = '#EF4444';
  else if (percentage > 85) bg = '#EF4444';
  else if (percentage > 60) bg = '#F59E0B';

  return L.divIcon({
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center;">
        ${isSelected ? '<div style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background: rgba(59, 130, 246, 0.4); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>' : ''}
        <div style="background-color: ${bg}; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.35); transition: transform 0.2s;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-1.1 0-2 .9-2 2v7c0 1.1.9 2 2 2h10"></path>
            <circle cx="7" cy="17" r="2"></circle><circle cx="17" cy="17" r="2"></circle>
          </svg>
        </div>
      </div>
    `,
    className: 'custom-bus-marker',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
};

const createStopMarker = () => {
  return L.divIcon({
    html: `
      <div style="background-color: #3B82F6; width: 14px; height: 14px; border-radius: 50%; border: 2px solid #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>
    `,
    className: 'custom-stop-marker',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
};

const createUserMarker = () => {
  return L.divIcon({
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; width: 32px; height: 32px; border-radius: 50%; background: rgba(59, 130, 246, 0.3); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="background-color: #2563EB; width: 16px; height: 16px; border-radius: 50%; border: 3px solid #ffffff; box-shadow: 0 0 8px rgba(0,0,0,0.3);"></div>
      </div>
    `,
    className: 'custom-user-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

interface Bus {
  id: string;
  routeNumber: string;
  routeName: string;
  origin: string;
  destination: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  capacity: number;
  occupancy: number;
  nextStop: string;
  etaMinutes: number;
  status: 'Active' | 'Delayed' | 'Inactive';
}

interface LocationOption {
  name: string;
  lat: number;
  lng: number;
}

interface Stop {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  distanceKm?: number;
}

function MapController({
  center,
  zoom,
  onMapDrag,
}: {
  center: [number, number] | null;
  zoom?: number;
  onMapDrag?: () => void;
}) {
  const map = useMap();
  useMapEvents({
    dragstart: () => onMapDrag?.(),
  });
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom || 14, { animate: true, duration: 1 });
    }
  }, [center, map, zoom]);
  return null;
}

export default function App() {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [selectedBus, setSelectedBus] = useState<Bus | null>(null);
  const [view, setView] = useState<'map' | 'list'>('map');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(true);

  // Location selector state
  const [locations, setLocations] = useState<LocationOption[]>([
    { name: 'Majestic', lat: 12.9767, lng: 77.5713 },
    { name: 'Silk Board', lat: 12.9172, lng: 77.6228 },
    { name: 'Hebbal', lat: 13.0358, lng: 77.5970 },
    { name: 'Banashankari', lat: 12.9255, lng: 77.5468 },
    { name: 'Shivajinagar', lat: 12.9857, lng: 77.6057 },
    { name: 'KR Market', lat: 12.9639, lng: 77.5763 },
    { name: 'Whitefield', lat: 12.9698, lng: 77.7499 },
    { name: 'Electronic City', lat: 12.8452, lng: 77.6602 },
    { name: 'Indiranagar', lat: 12.9784, lng: 77.6408 },
    { name: 'Jayanagar', lat: 12.9250, lng: 77.5938 },
    { name: 'Yeshwanthpur', lat: 13.0285, lng: 77.5401 },
    { name: 'Marathahalli', lat: 12.9591, lng: 77.6974 },
  ]);
  const [selectedLocation, setSelectedLocation] = useState<LocationOption>(locations[0]);
  const [locationSearchInput, setLocationSearchInput] = useState('');
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);

  // Simulation controls
  const [isSimulationRunning, setIsSimulationRunning] = useState(true);

  // Nearby stops & route path
  const [nearbyStops, setNearbyStops] = useState<Stop[]>([]);
  const [routePath, setRoutePath] = useState<[number, number][]>([]);

  // GPS State
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [, setLocationError] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([selectedLocation.lat, selectedLocation.lng]);

  // Find My Bus State
  const [nearbyResults, setNearbyResults] = useState<any | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Fetch locations from backend if available
  useEffect(() => {
    axios.get('/api/locations')
      .then(res => {
        if (res.data && res.data.length > 0) {
          setLocations(res.data);
        }
      })
      .catch(() => {});
  }, []);

  const handleLocationChange = async (loc: LocationOption) => {
    setSelectedLocation(loc);
    setMapCenter([loc.lat, loc.lng]);
    setSelectedBus(null);
    setIsLocationDropdownOpen(false);
    try {
      const res = await axios.post('/api/location', {
        name: loc.name,
        lat: loc.lat,
        lng: loc.lng,
      });
      if (res.data.success) {
        setBuses(res.data.buses);
      }
      // Fetch nearby stops
      const stopsRes = await axios.get(`/api/stops/nearby?lat=${loc.lat}&lng=${loc.lng}`);
      setNearbyStops(stopsRes.data);

      // Generate a nice route polyline around this location
      const generatedPath: [number, number][] = [
        [loc.lat - 0.015, loc.lng - 0.015],
        [loc.lat - 0.005, loc.lng + 0.010],
        [loc.lat + 0.010, loc.lng + 0.015],
        [loc.lat + 0.015, loc.lng - 0.005],
        [loc.lat - 0.015, loc.lng - 0.015],
      ];
      setRoutePath(generatedPath);
    } catch (err) {
      console.error('Failed to update location:', err);
    }
  };

  const fetchBuses = async () => {
    try {
      const res = await axios.get('/api/buses');
      setBuses(res.data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch buses:', err);
    }
  };

  useEffect(() => {
    fetchBuses();
    // Initial fetch for nearby stops
    axios.get(`/api/stops/nearby?lat=${selectedLocation.lat}&lng=${selectedLocation.lng}`)
      .then(res => setNearbyStops(res.data))
      .catch(() => {});

    // Initial route path
    setRoutePath([
      [selectedLocation.lat - 0.015, selectedLocation.lng - 0.015],
      [selectedLocation.lat - 0.005, selectedLocation.lng + 0.010],
      [selectedLocation.lat + 0.010, selectedLocation.lng + 0.015],
      [selectedLocation.lat + 0.015, selectedLocation.lng - 0.005],
      [selectedLocation.lat - 0.015, selectedLocation.lng - 0.015],
    ]);

    const interval = setInterval(fetchBuses, 3000);
    return () => clearInterval(interval);
  }, []);

  const toggleSimulation = async () => {
    try {
      if (isSimulationRunning) {
        await axios.post('/api/simulation/pause');
        setIsSimulationRunning(false);
      } else {
        await axios.post('/api/simulation/start');
        setIsSimulationRunning(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const resetSimulation = async () => {
    try {
      const res = await axios.post('/api/simulation/reset');
      if (res.data.success) {
        setBuses(res.data.buses);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const locateSelectedLocation = () => {
    setMapCenter([selectedLocation.lat, selectedLocation.lng]);
  };

  const handleGeoError = (error: GeolocationPositionError) => {
    let errorMsg = 'An unknown error occurred.';
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMsg = 'Location permission denied.';
        break;
      case error.POSITION_UNAVAILABLE:
        errorMsg = 'Location information unavailable.';
        break;
      case error.TIMEOUT:
        errorMsg = 'Location request timed out.';
        break;
    }
    setLocationError(errorMsg);
  };

  const locateMe = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(coords);
        setMapCenter(coords);
      },
      (err) => handleGeoError(err),
      { enableHighAccuracy: true }
    );
  };

  const findBusesNearMe = () => {
    setIsSearching(true);
    const searchCoord = userLocation || [selectedLocation.lat, selectedLocation.lng];
    axios.post('/api/buses/nearby', { latitude: searchCoord[0], longitude: searchCoord[1], radius: 3 })
      .then(res => {
        setNearbyResults(res.data);
        setIsSearching(false);
      })
      .catch(() => setIsSearching(false));
  };

  const filteredLocations = locations.filter(l => l.name.toLowerCase().includes(locationSearchInput.toLowerCase()));

  const filteredBuses = buses.filter(bus => {
    const matchesSearch =
      bus.routeNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bus.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bus.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || bus.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* Top Professional Navigation & Location Selector Bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex flex-wrap items-center justify-between shadow-lg z-50 gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-blue-600 to-indigo-500 p-2.5 rounded-xl shadow-md shadow-blue-500/20">
            <BusIcon className="text-white w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                Bengaluru Smart Transit
              </h1>
              <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2.5 py-0.5 rounded-full border border-emerald-500/20 font-medium flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span> Live SIM
              </span>
            </div>
            <p className="text-xs text-slate-400">BMTC Intelligent Fleet Command Center</p>
          </div>
        </div>

        {/* FEATURE 1 & 4: Location Selector & Search Dropdown */}
        <div className="relative flex items-center gap-2">
          <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 shadow-inner">
            <MapPin size={16} className="text-blue-400" />
            <div className="relative">
              <button
                onClick={() => setIsLocationDropdownOpen(!isLocationDropdownOpen)}
                className="flex items-center gap-2 text-sm font-semibold text-white focus:outline-none"
              >
                <span>{selectedLocation.name}</span>
                <ChevronDown size={14} className="text-slate-400" />
              </button>

              {isLocationDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                  <div className="p-2 border-b border-slate-800">
                    <div className="relative">
                      <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search Bengaluru locality..."
                        value={locationSearchInput}
                        onChange={(e) => setLocationSearchInput(e.target.value)}
                        className="w-full bg-slate-800 text-xs text-white pl-8 pr-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-blue-500"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="max-h-60 overflow-y-auto p-1">
                    {filteredLocations.map((loc) => (
                      <button
                        key={loc.name}
                        onClick={() => handleLocationChange(loc)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                          selectedLocation.name === loc.name
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <span>{loc.name}</span>
                        <span className="text-[10px] opacity-75">{loc.lat.toFixed(2)}, {loc.lng.toFixed(2)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={locateSelectedLocation}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-2 rounded-xl border border-slate-700 transition-colors text-xs font-medium flex items-center gap-1.5"
            title="Locate selected hub on map"
          >
            <LocateFixed size={15} className="text-blue-400" />
            <span className="hidden sm:inline">Center Hub</span>
          </button>
        </div>

        {/* Simulation Controls & Metrics */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
            <button
              onClick={toggleSimulation}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                isSimulationRunning ? 'bg-amber-600 text-white' : 'bg-emerald-600 text-white'
              }`}
            >
              {isSimulationRunning ? <Pause size={13} /> : <Play size={13} />}
              {isSimulationRunning ? 'Pause Sim' : 'Start Sim'}
            </button>
            <button
              onClick={resetSimulation}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-700 hover:bg-slate-600 text-slate-200 flex items-center gap-1.5 transition-all"
              title="Reset simulation buses around location"
            >
              <RotateCcw size={13} /> Reset
            </button>
          </div>

          <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setView('map')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                view === 'map' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <MapIcon size={14} /> Map
            </button>
            <button
              onClick={() => setView('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                view === 'list' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <List size={14} /> Fleet ({buses.length})
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar */}
        <aside className={`${view === 'list' ? 'w-full' : 'hidden md:flex'} w-96 flex-col bg-slate-900/90 backdrop-blur-md border-r border-slate-800 z-40 transition-all`}>
          {/* Search & Filters */}
          <div className="p-4 border-b border-slate-800 space-y-3">
            <button
              onClick={findBusesNearMe}
              disabled={isSearching}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 text-xs"
            >
              {isSearching ? <RefreshCw className="animate-spin" size={15} /> : <MapPin size={15} />}
              {isSearching ? 'Locating Buses...' : `Find Buses Around ${selectedLocation.name}`}
            </button>

            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                placeholder="Search bus number or destination..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-800 text-slate-100 pl-10 pr-4 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-blue-500 text-xs placeholder:text-slate-500"
              />
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {['ALL', 'Active', 'Delayed', 'Inactive'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all border ${
                    filterStatus === status
                      ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                      : 'bg-slate-800/50 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            {/* Nearby Stops Summary */}
            <div className="pt-2">
              <div className="text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Nearby Stops ({nearbyStops.length})</span>
                <span className="text-[10px] text-blue-400 font-normal">Auto-generated</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {nearbyStops.slice(0, 4).map(stop => (
                  <div key={stop.id} className="bg-slate-800/80 border border-slate-700 px-2.5 py-1.5 rounded-lg text-[11px] whitespace-nowrap text-slate-200">
                    <span className="font-semibold">{stop.name}</span>
                    <span className="text-slate-400 ml-1">({stop.distanceKm?.toFixed(1)} km)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bus List Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {nearbyResults ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm text-slate-300">
                  <h2 className="font-bold">Buses Around {selectedLocation.name}</h2>
                  <button onClick={() => setNearbyResults(null)} className="text-blue-400 text-xs">Clear</button>
                </div>
                {nearbyResults.nearbyBuses.length === 0 ? (
                  <div className="text-slate-500 text-center py-4 text-xs">No simulated buses found in this radius.</div>
                ) : (
                  nearbyResults.nearbyBuses.map((bus: any) => (
                    <div key={bus.busId} className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                      <div className="flex justify-between">
                        <span className="font-bold text-blue-400">{bus.routeNumber}</span>
                        <span className="text-xs text-slate-400">{bus.distanceKm} km away</span>
                      </div>
                      <div className="text-xs font-semibold text-white mt-1">{bus.destination}</div>
                      <div className="flex justify-between mt-2 pt-2 border-t border-slate-700 text-xs">
                        <span className="font-bold text-emerald-400">{bus.etaMinutes} min ETA</span>
                        <span className="bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded text-[10px]">SIMULATED</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : loading ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
                <p className="text-xs">Loading simulated telemetry...</p>
              </div>
            ) : filteredBuses.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <BusIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs">No buses match criteria</p>
              </div>
            ) : (
              filteredBuses.map((bus) => {
                const occupancyPercent = Math.round((bus.occupancy / bus.capacity) * 100);
                const isSelected = selectedBus?.id === bus.id;

                return (
                  <div
                    key={bus.id}
                    onClick={() => {
                      setSelectedBus(bus);
                      setView('map');
                    }}
                    className={`group p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-gradient-to-r from-blue-950/80 to-slate-900 border-blue-500 shadow-lg shadow-blue-500/10'
                        : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="bg-blue-500/20 text-blue-400 font-bold px-2 py-0.5 rounded-lg text-xs border border-blue-500/30">
                          {bus.routeNumber}
                        </span>
                        <span className="bg-amber-500/10 text-amber-400 text-[10px] px-1.5 py-0.5 rounded border border-amber-500/20 font-medium">
                          SIMULATED
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-1">
                        <Navigation size={11} className="text-blue-400" />
                        <span>{bus.speed} km/h</span>
                      </div>
                    </div>

                    <h3 className="font-semibold text-slate-200 text-xs mb-1 truncate">
                      Destination: {bus.destination}
                    </h3>

                    <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>Occupancy</span>
                        <span className={occupancyPercent > 80 ? 'text-rose-400 font-medium' : 'text-slate-300'}>
                          {bus.occupancy}/{bus.capacity} ({occupancyPercent}%)
                        </span>
                      </div>
                      <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            occupancyPercent > 80 ? 'bg-rose-500' :
                            occupancyPercent > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${occupancyPercent}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between text-[11px] pt-1.5 text-slate-400 border-t border-slate-800/40">
                      <span>Next: <strong className="text-slate-200">{bus.nextStop}</strong></span>
                      <span className="flex items-center gap-1 text-blue-400 font-medium">
                        <Clock size={11} /> {bus.etaMinutes}m ETA
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Map View Area */}
        <main className={`flex-1 ${view === 'list' ? 'hidden md:flex' : 'flex'} relative z-30`}>
          {/* Floating Map Controls */}
          <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
            <button
              onClick={locateMe}
              className="bg-slate-900 text-slate-100 p-2.5 rounded-xl border border-slate-700 shadow-xl hover:bg-slate-800 transition-colors"
              title="My Device Location"
            >
              <Crosshair size={18} className="text-blue-400" />
            </button>
            <button
              onClick={locateSelectedLocation}
              className="bg-slate-900 text-slate-100 p-2.5 rounded-xl border border-slate-700 shadow-xl hover:bg-slate-800 transition-colors"
              title={`Center on ${selectedLocation.name}`}
            >
              <Target size={18} className="text-emerald-400" />
            </button>
          </div>

          {/* Selected Location Banner on Map */}
          <div className="absolute top-4 left-4 z-[1000] bg-slate-900/90 backdrop-blur-md border border-slate-700 px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-3">
            <div className="bg-blue-600/20 text-blue-400 p-2 rounded-xl border border-blue-500/30">
              <MapPin size={18} />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Active Hub</div>
              <div className="text-sm font-bold text-white">{selectedLocation.name}</div>
            </div>
            <div className="h-6 w-px bg-slate-700 mx-1"></div>
            <div className="text-xs text-emerald-400 font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              {filteredBuses.length} Simulated Buses
            </div>
          </div>

          <MapContainer
            center={mapCenter}
            zoom={14}
            className="w-full h-full bg-slate-950"
            zoomControl={false}
          >
            <TileLayer
             attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
             url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Draw Bus Routes */}
            {routePath.length > 0 && (
              <Polyline positions={routePath} color="#3B82F6" weight={4} opacity={0.6} dashArray="6, 6" />
            )}

            {/* Nearby Bus Stops */}
            {nearbyStops.map(stop => (
              <Marker
                key={stop.id}
                position={[stop.latitude, stop.longitude]}
                icon={createStopMarker()}
              >
                <Popup>
                  <div className="text-xs">
                    <strong className="text-slate-900 font-bold">{stop.name}</strong>
                    <div className="text-slate-600 mt-0.5">Bus Stop (BMTC)</div>
                    <div className="text-blue-600 font-medium mt-1">{stop.distanceKm?.toFixed(2)} km from hub</div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Simulated Buses */}
            {filteredBuses.map((bus) => (
              <Marker
                key={bus.id}
                position={[bus.latitude, bus.longitude]}
                icon={createBusMarker(bus.occupancy, bus.capacity, bus.status, selectedBus?.id === bus.id)}
                eventHandlers={{
                  click: () => setSelectedBus(bus),
                }}
              >
                <Popup className="custom-popup">
                  <div className="p-1 min-w-[220px]">
                    <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100">
                      <span className="font-bold text-blue-600 text-base">{bus.routeNumber}</span>
                      <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold uppercase">SIMULATED</span>
                    </div>
                    <div className="text-xs font-semibold text-slate-900 mb-1">Destination: {bus.destination}</div>
                    <div className="space-y-1 text-xs text-slate-600 mb-3">
                      <div className="flex justify-between">
                        <span>Speed:</span>
                        <span className="font-medium text-slate-900">{bus.speed} km/h</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Next Stop:</span>
                        <span className="font-medium text-slate-900">{bus.nextStop}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>ETA:</span>
                        <span className="font-medium text-blue-600">{bus.etaMinutes} mins</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedBus(bus)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded-lg text-xs font-medium transition-colors"
                    >
                      View Live Telemetry
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}

            {userLocation && (
              <Marker position={userLocation} icon={createUserMarker()} />
            )}

            <MapController center={mapCenter} />
          </MapContainer>

          {/* Floating Selected Bus Overlay */}
          {selectedBus && view === 'map' && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-md bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl p-5 z-[1000] animate-in fade-in slide-in-from-bottom-6">
              <button
                onClick={() => setSelectedBus(null)}
                className="absolute top-3 right-3 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 p-1.5 rounded-full transition-colors"
              >
                ✕
              </button>

              <div className="flex items-start gap-4">
                <div className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-bold shadow-lg shadow-blue-500/20">
                  <span className="text-lg leading-none">{selectedBus.routeNumber}</span>
                  <span className="text-[9px] uppercase tracking-wider opacity-75 mt-0.5">SIM</span>
                </div>
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-base text-white truncate">Destination: {selectedBus.destination}</h3>
                    <span className="bg-amber-500/20 text-amber-300 text-[10px] px-2 py-0.5 rounded-full font-medium border border-amber-500/30">
                      SIMULATED BUS
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate">Hub: {selectedLocation.name}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-800">
                <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/50">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Speed</div>
                  <div className="text-sm font-bold text-slate-200 mt-0.5 flex items-center gap-1">
                    <Navigation size={13} className="text-blue-400" /> {selectedBus.speed} km/h
                  </div>
                </div>
                <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/50">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Next Stop</div>
                  <div className="text-xs font-bold text-slate-200 mt-0.5 truncate">{selectedBus.nextStop}</div>
                </div>
                <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/50">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Arrival ETA</div>
                  <div className="text-sm font-bold text-blue-400 mt-0.5 flex items-center gap-1">
                    <Clock size={13} /> {selectedBus.etaMinutes} mins
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
