export interface Layer {
  id: string;
  name: string;
  enabled: boolean;
  opacity: number;
  type: 'buildings' | 'terrain' | 'data' | 'overlay';
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  active: boolean;
  year: number;
}

export interface Comment {
  id: string;
  author: string;
  avatar: string;
  text: string;
  timestamp: Date;
  replies?: Comment[];
}

export interface ChartDataPoint {
  year: number;
  value: number;
  label: string;
}
