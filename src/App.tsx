import { useState, useRef, useEffect } from 'react';
import Map3D from './components/Map3D';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { TimeSlider } from './components/TimeSlider';
import { ChartPanel } from './components/ChartPanel';
import type { Layer, Scenario, Comment, ChartDataPoint } from './types';

const initialLayers: Layer[] = [
  { id: 'buildings', name: '3D Buildings', enabled: true, opacity: 0.8, type: 'buildings' },
  { id: 'terrain', name: 'Terrain', enabled: true, opacity: 1, type: 'terrain' },
  { id: 'population', name: 'Population Density', enabled: false, opacity: 0.6, type: 'data' },
  { id: 'transport', name: 'Transportation', enabled: false, opacity: 0.7, type: 'overlay' },
  { id: 'green-space', name: 'Green Spaces', enabled: false, opacity: 0.5, type: 'overlay' },
];

const initialScenarios: Scenario[] = [
  {
    id: 'baseline',
    name: 'Baseline',
    description: 'Current urban development patterns',
    active: true,
    year: 2024,
  },
  {
    id: 'growth',
    name: 'High Growth',
    description: 'Projected growth scenario with increased density',
    active: false,
    year: 2035,
  },
  {
    id: 'sustainable',
    name: 'Sustainable Development',
    description: 'Green infrastructure and mixed-use focus',
    active: false,
    year: 2030,
  },
  {
    id: 'transit',
    name: 'Transit-Oriented',
    description: 'Development centered around public transit hubs',
    active: false,
    year: 2028,
  },
];

const initialComments: Comment[] = [
  {
    id: '1',
    author: 'Sarah Chen',
    avatar: 'SC',
    text: 'The current zoning in this district allows for mixed-use development. We should consider increasing residential density here.',
    timestamp: new Date('2024-10-20'),
    replies: [
      {
        id: '1-1',
        author: 'Mike Johnson',
        avatar: 'MJ',
        text: 'Agreed. The transit access here makes it ideal for higher density.',
        timestamp: new Date('2024-10-21'),
      },
    ],
  },
  {
    id: '2',
    author: 'Alex Rivera',
    avatar: 'AR',
    text: 'Have we considered the impact on local traffic patterns? This might require infrastructure upgrades.',
    timestamp: new Date('2024-10-22'),
  },
];

const chartData: ChartDataPoint[] = [
  { year: 2015, value: 820000, label: 'Population' },
  { year: 2017, value: 845000, label: 'Population' },
  { year: 2019, value: 890000, label: 'Population' },
  { year: 2021, value: 920000, label: 'Population' },
  { year: 2023, value: 950000, label: 'Population' },
  { year: 2025, value: 985000, label: 'Population' },
];

function App() {
  const [layers, setLayers] = useState<Layer[]>(initialLayers);
  const [scenarios, setScenarios] = useState<Scenario[]>(initialScenarios);
  const [comments] = useState<Comment[]>(initialComments);
  const [currentYear, setCurrentYear] = useState(2024);
  const [pitch, setPitch] = useState(60);
  const [bearing, setBearing] = useState(-17.6);

  // Use useRef for pitch and bearing to avoid unnecessary re-renders
  const pitchRef = useRef(pitch);
  const bearingRef = useRef(bearing);

  useEffect(() => {
    pitchRef.current = pitch;
  }, [pitch]);

  useEffect(() => {
    bearingRef.current = bearing;
  }, [bearing]);

  const handleLayerToggle = (layerId: string) => {
    setLayers((prev) =>
      prev.map((layer) =>
        layer.id === layerId ? { ...layer, enabled: !layer.enabled } : layer
      )
    );
  };

  const handleScenarioSelect = (scenarioId: string) => {
    setScenarios((prev) =>
      prev.map((scenario) => ({
        ...scenario,
        active: scenario.id === scenarioId,
      }))
    );
    const selected = scenarios.find((s) => s.id === scenarioId);
    if (selected) {
      setCurrentYear(selected.year);
    }
  };

  const handleSearch = (query: string) => {
    console.log('Search:', query);
  };

  const handleDownload = () => {
    console.log('Download data');
  };

  const handleUpload = () => {
    console.log('Upload data');
  };

  const buildingsLayer = layers.find((l) => l.id === 'buildings');
  const terrainLayer = layers.find((l) => l.id === 'terrain');

  return (
    <div className="w-screen h-screen overflow-hidden bg-slate-50 font-sans">
      <TopBar onSearch={handleSearch} onDownload={handleDownload} onUpload={handleUpload} />
      <div className="w-full h-full">
        <Map3D
          {...({
            pitch: pitchRef.current,
            bearing: bearingRef.current,
            showBuildings: buildingsLayer?.enabled ?? true,
            showTerrain: terrainLayer?.enabled ?? true,
          } as any)}
        />
      </div>
      <ChartPanel data={chartData} />

      <div className="absolute top-4 left-4 z-30 bg-white/95 backdrop-blur-md rounded-lg shadow-xl border border-gray-200/50 px-4 py-2">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <span className="w-8 h-8 bg-gradient-to-br from-slate-600 to-slate-800 rounded-lg flex items-center justify-center text-white text-sm font-bold">
            U
          </span>
          Urban Simulation Dashboard
        </h1>
      </div>
    </div>
  );
}

export default App;
