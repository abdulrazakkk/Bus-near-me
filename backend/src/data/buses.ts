export interface Bus {
  id: string;
  routeNumber: string;
  origin: string;
  destination: string;
  latitude: number;
  longitude: number;
  speed: number; // in km/h
  heading: number; // in degrees
  capacity: number;
  occupancy: number; // current passengers
  nextStop: string;
}

export const initialBuses: Bus[] = [
  {
    id: 'BMTC-500D-01',
    routeNumber: '500D',
    origin: 'Silk Board',
    destination: 'Hebbal',
    latitude: 12.9172,
    longitude: 77.6228,
    speed: 35,
    heading: 15,
    capacity: 60,
    occupancy: 45,
    nextStop: 'HSR Layout',
  },
  {
    id: 'BMTC-500D-02',
    routeNumber: '500D',
    origin: 'Hebbal',
    destination: 'Silk Board',
    latitude: 13.0358,
    longitude: 77.5970,
    speed: 28,
    heading: 195,
    capacity: 60,
    occupancy: 20,
    nextStop: 'Nagawara',
  },
  {
    id: 'BMTC-335E-01',
    routeNumber: '335E',
    origin: 'Kempegowda Bus Station',
    destination: 'ITPL',
    latitude: 12.9784,
    longitude: 77.6408,
    speed: 40,
    heading: 90,
    capacity: 50,
    occupancy: 50, // Full
    nextStop: 'Indiranagar 100ft Road',
  },
  {
    id: 'BMTC-201-01',
    routeNumber: '201',
    origin: 'Banashankari',
    destination: 'Domlur',
    latitude: 12.9255,
    longitude: 77.5838,
    speed: 22,
    heading: 45,
    capacity: 60,
    occupancy: 30,
    nextStop: 'Jayanagar 4th Block',
  },
];
