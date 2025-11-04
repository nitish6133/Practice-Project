import { useState } from 'react';
import { Home, CheckCircle, XCircle } from 'lucide-react';

interface Plot {
  id: number;
  row: number;
  col: number;
  plotNumber: string;
  status: 'pass' | 'fail';
  message: string;
}

const mockPlots: Plot[] = [
  { id: 1, row: 0, col: 0, plotNumber: 'A1', status: 'pass', message: 'Meets all policy requirements' },
  { id: 2, row: 0, col: 1, plotNumber: 'A2', status: 'pass', message: 'Compliant with green space standards' },
  { id: 3, row: 0, col: 2, plotNumber: 'A3', status: 'fail', message: 'More green space required as per policy' },
  { id: 4, row: 0, col: 3, plotNumber: 'A4', status: 'pass', message: 'Meets all policy requirements' },
  { id: 5, row: 0, col: 4, plotNumber: 'A5', status: 'fail', message: 'Building height exceeds permitted limit' },

  { id: 6, row: 1, col: 0, plotNumber: 'B1', status: 'fail', message: 'Insufficient parking provision' },
  { id: 7, row: 1, col: 1, plotNumber: 'B2', status: 'pass', message: 'Fully compliant with local policy' },
  { id: 8, row: 1, col: 2, plotNumber: 'B3', status: 'pass', message: 'Meets all policy requirements' },
  { id: 9, row: 1, col: 3, plotNumber: 'B4', status: 'fail', message: 'More green space required as per policy' },
  { id: 10, row: 1, col: 4, plotNumber: 'B5', status: 'pass', message: 'Compliant with all standards' },

  { id: 11, row: 2, col: 0, plotNumber: 'C1', status: 'pass', message: 'Meets all policy requirements' },
  { id: 12, row: 2, col: 1, plotNumber: 'C2', status: 'fail', message: 'Density exceeds local plan allowance' },
  { id: 13, row: 2, col: 2, plotNumber: 'C3', status: 'pass', message: 'Fully compliant with local policy' },
  { id: 14, row: 2, col: 3, plotNumber: 'C4', status: 'pass', message: 'Meets all policy requirements' },
  { id: 15, row: 2, col: 4, plotNumber: 'C5', status: 'fail', message: 'Inadequate drainage infrastructure' },

  { id: 16, row: 3, col: 0, plotNumber: 'D1', status: 'fail', message: 'More green space required as per policy' },
  { id: 17, row: 3, col: 1, plotNumber: 'D2', status: 'pass', message: 'Compliant with green space standards' },
  { id: 18, row: 3, col: 2, plotNumber: 'D3', status: 'fail', message: 'Building setback requirements not met' },
  { id: 19, row: 3, col: 3, plotNumber: 'D4', status: 'pass', message: 'Meets all policy requirements' },
  { id: 20, row: 3, col: 4, plotNumber: 'D5', status: 'pass', message: 'Fully compliant with local policy' },
];

function PolicyCheckerReport() {
  const [hoveredPlot, setHoveredPlot] = useState<Plot | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const passCount = mockPlots.filter(p => p.status === 'pass').length;
  const failCount = mockPlots.filter(p => p.status === 'fail').length;

  const handleMouseEnter = (plot: Plot, event: React.MouseEvent<HTMLDivElement>) => {
    setHoveredPlot(plot);
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
    });
  };

  const handleMouseLeave = () => {
    setHoveredPlot(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <Home className="w-8 h-8 text-slate-700" />
            <h1 className="text-4xl font-bold text-slate-800">Policy Compliance Report</h1>
          </div>
          <div className="space-y-1">
            <p className="text-slate-600 text-lg font-medium">Digbeth, Birmingham - Residential Development Site</p>
            <p className="text-slate-500 text-sm">Location: Typhoo Wharf & Canal Basin Area | Coordinates: 52.4769°N, 1.8979°W</p>
            <p className="text-slate-500 text-sm">Status: Mixed-use regeneration project with residential, retail, and office spaces</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
              <div className="text-3xl font-bold text-slate-800 mb-1">{mockPlots.length}</div>
              <div className="text-sm text-slate-600 font-medium">Total Plots</div>
            </div>
            <div className="bg-green-50 rounded-lg p-6 border border-green-200">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <div className="text-3xl font-bold text-green-700">{passCount}</div>
              </div>
              <div className="text-sm text-green-700 font-medium">Compliant Plots</div>
            </div>
            <div className="bg-red-50 rounded-lg p-6 border border-red-200">
              <div className="flex items-center gap-2 mb-1">
                <XCircle className="w-6 h-6 text-red-600" />
                <div className="text-3xl font-bold text-red-700">{failCount}</div>
              </div>
              <div className="text-sm text-red-700 font-medium">Non-Compliant Plots</div>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-slate-800 mb-2">Site Map</h2>
            <p className="text-slate-600">Hover over plots to view detailed compliance information</p>
          </div>

          <div className="bg-slate-50 rounded-lg p-8 border-2 border-slate-200 relative overflow-hidden">
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27100%27 height=%27100%27%3E%3Crect width=%27100%27 height=%27100%27 fill=%27%238b7355%27/%3E%3Cpath d=%27M10,10 Q50,0 90,10%27 stroke=%27%23a0826d%27 stroke-width=%272%27 fill=%27none%27/%3E%3Ccircle cx=%2730%27 cy=%2730%27 r=%275%27 fill=%27%2334a853%27 opacity=%270.3%27/%3E%3Ccircle cx=%2770%27 cy=%2750%27 r=%274%27 fill=%2334a853%27 opacity=%270.3%27/%3E%3Crect x=%2715%27 y=%2760%27 width=%2720%27 height=%2720%27 fill=%27%236c5d54%27 opacity=%270.3%27/%3E%3Crect x=%2770%27 y=%2710%27 width=%2715%27 height=%2725%27 fill=%27%236c5d54%27 opacity=%270.3%27/%3E%3C/svg%3E")',
                backgroundRepeat: 'repeat',
              }}
            ></div>
            <div className="grid grid-cols-5 gap-4 max-w-4xl mx-auto relative z-10">
              {mockPlots.map((plot) => (
                <div
                  key={plot.id}
                  className={`
                    aspect-square rounded-lg cursor-pointer transition-all duration-200
                    flex items-center justify-center font-semibold text-white text-lg
                    shadow-md hover:shadow-xl hover:scale-105
                    ${plot.status === 'pass'
                      ? 'bg-green-500 hover:bg-green-600'
                      : 'bg-red-500 hover:bg-red-600'
                    }
                  `}
                  onMouseEnter={(e) => handleMouseEnter(plot, e)}
                  onMouseLeave={handleMouseLeave}
                >
                  {plot.plotNumber}
                </div>
              ))}
            </div>

            {hoveredPlot && (
              <div
                className="fixed z-50 bg-slate-900 text-white px-4 py-3 rounded-lg shadow-2xl max-w-xs pointer-events-none transform -translate-x-1/2 -translate-y-full"
                style={{
                  left: `${tooltipPosition.x}px`,
                  top: `${tooltipPosition.y}px`,
                  minWidth: '200px',
                }}
              >
                <div className="font-bold text-lg mb-1">Plot {hoveredPlot.plotNumber}</div>
                <div className={`text-sm font-semibold mb-1 ${hoveredPlot.status === 'pass' ? 'text-green-300' : 'text-red-300'}`}>
                  {hoveredPlot.status === 'pass' ? '✓ Pass' : '✗ Fail'}
                </div>
                <div className="text-sm text-slate-200">{hoveredPlot.message}</div>
                <div
                  className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-slate-900"
                ></div>
              </div>
            )}
          </div>

          <div className="mt-8 bg-slate-50 rounded-lg p-6 border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Legend</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-500 rounded shadow-sm"></div>
                <span className="text-slate-700 font-medium">Meets Policy Requirements</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-red-500 rounded shadow-sm"></div>
                <span className="text-slate-700 font-medium">Policy Issues Found</span>
              </div>
            </div>
          </div>

          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">About This Location</h3>
            <p className="text-blue-800 text-sm mb-3">
              The Digbeth area in central Birmingham is undergoing significant regeneration as part of the Big City Plan. The Typhoo Wharf and Canal Basin area represents a major mixed-use development opportunity.
            </p>
            <div className="text-sm text-blue-700 space-y-1">
              <p><strong>Project Status:</strong> Active redevelopment with BBC relocation (2024+)</p>
              <p><strong>Scale:</strong> ~10 acres of land around Typhoo Wharf and canal basin</p>
              <p><strong>Development Mix:</strong> 800,000+ sq ft of residential, office, retail, and catering spaces</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8 mt-8">
          <h2 className="text-2xl font-semibold text-slate-800 mb-4">Common Policy Issues</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
              <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold text-red-900">Green Space Requirements</div>
                <div className="text-sm text-red-700">Several plots require additional green space to meet Birmingham City Council standards</div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
              <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold text-red-900">Building Height & Density</div>
                <div className="text-sm text-red-700">Some plots exceed permitted building height and density allowances</div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
              <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold text-red-900">Infrastructure Requirements</div>
                <div className="text-sm text-red-700">Parking and drainage infrastructure needs review on specific plots</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PolicyCheckerReport;
