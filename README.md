<div align="center">

# 🚌 Smart Bus (Bus-near-me)

**Real-time bus tracking and simulation platform for Bengaluru (BMTC prototype)**

![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/license-ISC-blue)

</div>

---

## Overview

**Smart Bus** is a full-stack prototype that shows buses moving live on a map around any Bengaluru locality. Pick an area (or use your GPS), and the app spawns a simulated fleet, streams position updates every few seconds, and tells you which buses and stops are closest to you.

> ⚠️ **Prototype notice:** All bus movement is **simulated**. No real BMTC data feed is used.

## Deployment

**Hosted Backend API:**  
https://bus-near-me-1.onrender.com/

The backend API is deployed on Render.

**Local development addresses:**
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`

> Note: The Render URL is the hosted backend API, not the complete frontend website.

## Features

- 🗺️ **Live map** powered by Leaflet + OpenStreetMap with animated bus markers
- 📍 **Locality switcher** with searchable list of 12 Bengaluru hubs (Majestic, Silk Board, Hebbal, Whitefield, Electronic City, and more)
- 🎯 **"Locate me"** via the browser Geolocation API
- 🔎 **Find buses near me**: nearest stops, boarding stop, distance and ETA per bus
- 🚦 **Occupancy and status colours**: green, amber, and red markers by crowding; red for delayed, grey for inactive
- 📋 **Fleet list view** with search by route, destination, or bus ID, plus status filters
- ▶️ **Simulation controls**: pause, resume, and reset the fleet
- 🚏 **Nearest stops** computed with the Haversine formula

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4, Framer Motion, Axios |
| Map | Leaflet, React-Leaflet, OpenStreetMap tiles |
| Backend | Node.js, Express 5, TypeScript, ts-node, nodemon |
| Tooling | Oxlint, dotenv, CORS |

## Project Structure

```text
Bus-near-me/
├── backend/
│   ├── src/
│   │   ├── index.ts          # Express app, simulation loop, REST API
│   │   ├── data/
│   │   │   ├── stops.ts      # 15 bus stops (id, name, lat/lng)
│   │   │   ├── routes.ts     # Route definitions (ordered stop IDs)
│   │   │   └── buses.ts      # Seed bus data (BMTC-style)
│   │   └── utils/
│   │       └── geo.ts        # Haversine distance + ETA helpers
│   ├── frontend/             # React + Vite client
│   │   ├── src/
│   │   │   ├── App.tsx       # Map, fleet list, controls
│   │   │   └── main.tsx
│   │   └── vite.config.ts
│   ├── package.json
│   └── tsconfig.json
└── README.md
```

## Getting Started

### Prerequisites

- **Node.js** 20 or newer
- **npm** 10 or newer

### 1. Clone the repository

```bash
git clone https://github.com/<your-username>/Bus-near-me.git
cd Bus-near-me
```

### 2. Start the backend

```bash
cd backend
npm install
npm run dev        # nodemon (auto-reload)
# or
npm start          # ts-node (single run)
```

The API runs at **http://localhost:3000**.

### 3. Start the frontend

Open a second terminal:

```bash
cd backend/frontend
npm install
npm run dev
```

Open the URL Vite prints (typically **http://localhost:5173**).

### Environment variables

Create `backend/.env` (optional):

```env
PORT=3000
```

## Available Scripts

### Backend (`backend/`)

| Script | Description |
|---|---|
| `npm run dev` | Start with nodemon (hot reload) |
| `npm start` | Start with ts-node (single run) |

### Frontend (`backend/frontend/`)

| Script | Description |
|---|---|
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build |
| `npm run lint` | Lint with Oxlint |

## API Reference

Base URL: `http://localhost:3000`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | API index and endpoint list |
| GET | `/api/health` | Health check |
| GET | `/api/locations` | Predefined Bengaluru localities |
| POST | `/api/location` | Set simulation centre and regenerate fleet |
| GET | `/api/buses` | All simulated buses |
| GET | `/api/buses/:id` | Single bus by ID |
| POST | `/api/buses/nearby` | Nearby stops and buses for a coordinate |
| GET | `/api/stops` | All bus stops |
| GET | `/api/stops/nearby` | 10 closest stops (`?lat=&lng=`) |
| POST | `/api/simulation/start` | Resume simulation |
| POST | `/api/simulation/pause` | Pause simulation |
| POST | `/api/simulation/reset` | Regenerate fleet around current centre |

### Example: Nearby buses

```bash
curl -X POST http://localhost:3000/api/buses/nearby \
  -H "Content-Type: application/json" \
  -d '{"latitude": 12.9767, "longitude": 77.5713, "radius": 3}'
```

Example response:

```json
{
  "success": true,
  "userLocation": {
    "latitude": 12.9767,
    "longitude": 77.5713
  },
  "nearbyStops": [
    {
      "id": "STOP009",
      "name": "Kempegowda Bus Station",
      "latitude": 12.9767,
      "longitude": 77.5713,
      "distanceKm": 0
    }
  ],
  "nearbyBuses": [
    {
      "busId": "SIM-Majestic-3",
      "routeNumber": "502",
      "boardingStop": "Kempegowda Bus Station",
      "distanceKm": 0.84,
      "etaMinutes": 3,
      "speed": 32,
      "status": "Approaching"
    }
  ]
}
```

### Bus model

```typescript
interface Bus {
  id: string;
  routeNumber: string;
  routeName: string;
  origin: string;
  destination: string;
  latitude: number;
  longitude: number;
  speed: number;        // km/h
  heading: number;      // degrees
  capacity: number;
  occupancy: number;
  nextStop: string;
  etaMinutes: number;
  status: 'Active' | 'Delayed' | 'Inactive';
}
```

## How It Works

1. On startup (and whenever the location changes), the server generates **15 simulated buses** scattered around the chosen centre.
2. Every **3 seconds**, a timer nudges each bus's position, speed, and ETA with small random deltas.
3. The frontend polls `/api/buses` every 3 seconds and re-renders markers.
4. Distances use the **Haversine formula**; nearby-bus ETA is a simple distance-based estimate.

## Known Limitations

- Fleet data is randomly generated; routes in `routes.ts` and seed buses in `buses.ts` are not yet wired into the live simulation.
- The frontend has the API URL hardcoded to `http://localhost:3000`.
- Polling is used instead of WebSockets.
- No automated tests yet.
- Bus positions, speeds, and ETAs are simulated and should not be treated as actual BMTC tracking information.

## Roadmap

- [ ] Move API base URL to a `VITE_API_URL` environment variable
- [ ] Drive simulation from real `routes.ts` paths and stops
- [ ] WebSocket / SSE for push updates
- [ ] Integrate real GTFS or BMTC data
- [ ] Unit tests (Vitest, Jest) and CI via GitHub Actions
- [ ] Docker Compose for one-command setup
- [ ] Deploy frontend (Vercel or Netlify) and backend (Render)

## Contributing

1. Fork the repository.
2. Create a branch: `git checkout -b feature/your-feature`
3. Commit: `git commit -m "feat: add your feature"`
4. Push: `git push origin feature/your-feature`
5. Open a Pull Request.

## License

Distributed under the ISC License.
