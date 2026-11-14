export interface Route {
  id: string;
  name: string;
  stops: string[]; // Stop IDs in order
}

export const routes: Route[] = [
  {
    id: '500D',
    name: 'Silk Board to Hebbal',
    stops: ['STOP001', 'STOP002', 'STOP003', 'STOP004', 'STOP005', 'STOP006', 'STOP012']
  },
  {
    id: '335E',
    name: 'Majestic to ITPL',
    stops: ['STOP009', 'STOP008', 'STOP006', 'STOP007']
  },
  {
    id: '201',
    name: 'Banashankari to Domlur',
    stops: ['STOP011', 'STOP013']
  },
  {
    id: 'K-3',
    name: 'KBS to Electronic City',
    stops: ['STOP009', 'STOP015', 'STOP014', 'STOP013', 'STOP010']
  },
  {
    id: '356C',
    name: 'KBS to Electronic City',
    stops: ['STOP009', 'STOP014', 'STOP010']
  }
];
