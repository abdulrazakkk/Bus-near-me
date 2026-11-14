import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { stops } from './data/stops';
import { routes } from './data/routes';
import { calculateDistance, calculateETA } from './utils/geo';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

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

interface Location {
  name: string;
  lat: number;
  lng: number;
}

const BENGALURU_LOCATIONS: Location[] = [
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
];

let currentCenter: Location = BENGALURU_LOCATIONS[0];
let isSimulationRunning = true;

const createBus = (id: string, routeNumber: string, lat: number, lng: number): Bus => ({
  id,
  routeNumber,
  routeName: `Simulated Route ${routeNumber}`,
  origin: currentCenter.name,
  destination: 'Terminal',
  latitude: lat,
  longitude: lng,
  speed: 20 + Math.floor(Math.random() * 30),
  heading: Math.floor(Math.random() * 360),
  capacity: 60,
  occupancy: Math.floor(Math.random() * 50),
  nextStop: 'Central Station',
  etaMinutes: 2 + Math.floor(Math.random() * 10),
  status: 'Active',
});

const generateBusesForLocation = (loc: Location): Bus[] => {
  return Array.from({ length: 15 }, (_, i) =>
    createBus(`SIM-${loc.name.replace(/\s+/g, '')}-${i + 1}`, `50${i}`, loc.lat + (Math.random() - 0.5) * 0.04, loc.lng + (Math.random() - 0.5) * 0.04)
  );
};

let buses: Bus[] = generateBusesForLocation(currentCenter);

// Simulate movement
setInterval(() => {
  if (!isSimulationRunning) return;
  buses = buses.map((bus) => {
    if (bus.status === 'Inactive') return bus;
    const deltaLat = (Math.random() - 0.49) * 0.0012;
    const deltaLng = (Math.random() - 0.49) * 0.0012;
    const speedChange = (Math.random() - 0.5) * 6;
    const newSpeed = Math.max(10, Math.min(65, Math.round(bus.speed + speedChange)));

    return {
      ...bus,
      latitude: Number((bus.latitude + deltaLat).toFixed(4)),
      longitude: Number((bus.longitude + deltaLng).toFixed(4)),
      speed: newSpeed,
      etaMinutes: Math.max(1, bus.etaMinutes + (Math.random() > 0.7 ? (Math.random() > 0.5 ? 1 : -1) : 0))
    };
  });
}, 3000);

app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'Smart Bus BMTC API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      buses: '/api/buses',
      locations: '/api/locations',
      busDetail: '/api/buses/:id',
      nearbyBuses: '/api/buses/nearby (POST)',
      nearbyStops: '/api/stops/nearby (GET)',
      stops: '/api/stops'
    }
  });
});

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/api/locations', (req: Request, res: Response) => {
  res.json(BENGALURU_LOCATIONS);
});

app.post('/api/location', (req: Request, res: Response) => {
  const { name, lat, lng } = req.body;
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({ error: 'Invalid coordinates' });
  }
  currentCenter = { name: name || 'Custom Location', lat, lng };
  buses = generateBusesForLocation(currentCenter);
  res.json({ success: true, currentCenter, buses });
});

app.post('/api/simulation/start', (req: Request, res: Response) => {
  isSimulationRunning = true;
  res.json({ success: true, status: 'running' });
});

app.post('/api/simulation/pause', (req: Request, res: Response) => {
  isSimulationRunning = false;
  res.json({ success: true, status: 'paused' });
});

app.post('/api/simulation/reset', (req: Request, res: Response) => {
  buses = generateBusesForLocation(currentCenter);
  res.json({ success: true, buses });
});

app.get('/api/stops', (req: Request, res: Response) => {
  res.json(stops);
});

app.get('/api/stops/nearby', (req: Request, res: Response) => {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);
  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ error: 'Invalid coordinates' });
  }
  const nearbyStops = stops.map(stop => ({
    ...stop,
    distanceKm: calculateDistance(lat, lng, stop.latitude, stop.longitude)
  })).sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 10);
  res.json(nearbyStops);
});

app.get('/api/buses', (req: Request, res: Response) => {
  res.json(buses);
});

app.get('/api/buses/:id', (req: Request, res: Response) => {
  const bus = buses.find((b) => b.id === req.params.id);
  if (!bus) {
    return res.status(404).json({ error: 'Bus not found' });
  }
  res.json(bus);
});

app.post('/api/buses/nearby', (req: Request, res: Response) => {
  const { latitude, longitude, radius } = req.body;

  if (typeof latitude !== 'number' || typeof longitude !== 'number' || isNaN(latitude) || isNaN(longitude)) {
    return res.status(400).json({ success: false, error: 'Invalid coordinates' });
  }

  const searchRadius = typeof radius === 'number' && radius > 0 ? radius : 5;

  const nearbyStops = stops.map(stop => {
    const dist = calculateDistance(latitude, longitude, stop.latitude, stop.longitude);
    return { ...stop, distanceKm: dist };
  }).filter(stop => stop.distanceKm <= searchRadius)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  const nearbyBusesResult: any[] = [];

  buses.forEach(bus => {
    if (bus.status === 'Inactive') return;
    const distBus = calculateDistance(latitude, longitude, bus.latitude, bus.longitude);
    if (distBus <= searchRadius * 2) {
      nearbyBusesResult.push({
        busId: bus.id,
        routeNumber: bus.routeNumber,
        route: bus.routeName,
        origin: bus.origin,
        destination: bus.destination,
        boardingStop: nearbyStops[0]?.name || 'Nearby Hub',
        boardingStopDistanceKm: nearbyStops[0] ? Number(nearbyStops[0].distanceKm.toFixed(2)) : 0.5,
        distanceKm: Number(distBus.toFixed(2)),
        etaMinutes: Math.max(1, Math.round(distBus * 3)),
        speed: bus.speed,
        status: bus.status === 'Delayed' ? 'Delayed' : 'Approaching'
      });
    }
  });

  nearbyBusesResult.sort((a, b) => a.etaMinutes - b.etaMinutes);

  res.json({
    success: true,
    userLocation: { latitude, longitude },
    nearbyStops: nearbyStops.slice(0, 5).map(s => ({
      id: s.id,
      name: s.name,
      latitude: s.latitude,
      longitude: s.longitude,
      distanceKm: Number(s.distanceKm.toFixed(2))
    })),
    nearbyBuses: nearbyBusesResult
  });
});

app.listen(port, () => {
  console.log(`Smart Bus Backend API running on http://localhost:${port}`);
});
