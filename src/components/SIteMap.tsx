// src/components/Map3D.tsx
import React, { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface Plot {
  id: number;
  plotNumber: string;
  status: "pass" | "fail";
  message: string;
}

const mockPlots: Plot[] = [
  { id: 1, plotNumber: "Plot-A1", status: "pass", message: "Meets all policy requirements" },
  { id: 2, plotNumber: "Plot-A2", status: "pass", message: "Compliant with green space standards" },
  { id: 3, plotNumber: "Plot-A3", status: "fail", message: "More green space required" },
  { id: 4, plotNumber: "Plot-A4", status: "pass", message: "Fully compliant" },
  { id: 5, plotNumber: "Plot-B1", status: "fail", message: "Height exceeds limit" },
  { id: 6, plotNumber: "Plot-B2", status: "pass", message: "All good" },
  { id: 7, plotNumber: "Plot-B3", status: "fail", message: "Insufficient parking" },
  { id: 8, plotNumber: "Plot-B4", status: "pass", message: "OK" },
  { id: 9, plotNumber: "Plot-C1", status: "fail", message: "More drainage needed" },
  { id: 10, plotNumber: "Plot-C2", status: "pass", message: "Compliant" },
  { id: 11, plotNumber: "Plot-C3", status: "pass", message: "Fine" },
  { id: 12, plotNumber: "Plot-C4", status: "fail", message: "Density high" },
];

const Map3D: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    const center: [number, number] = [-1.9182, 52.492];

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
          },
        },
        layers: [{ id: "osm", type: "raster", source: "osm" }],
      },
      center,
      zoom: 18.3,
      pitch: 60,
      bearing: -20,
      antialias: true,
    });

    map.on("load", () => {
      const areaCoords: [number, number][] = [
        [-1.91851, 52.49232], 
        [-1.917893,52.492346],
        [ -1.917671,52.492110],
        [-1.91773, 52.49195],
        [-1.91782, 52.49184],
        [-1.918283,52.491869],
        [-1.918503,52.491906],
        [-1.91857, 52.49202],
        [-1.91851, 52.49232],
      ];

      // Blue dotted boundary
      map.addSource("main-area", {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: { type: "Polygon", coordinates: [areaCoords] },
        },
      });

      map.addLayer({
        id: "main-area-outline",
        type: "line",
        source: "main-area",
        paint: {
          "line-color": "#004CBB",
          "line-width": 2,
          "line-dasharray": [2, 2],
        },
      });

      // Grid settings
      const cols = 4;
      const rows = 3;

      const minLon = Math.min(...areaCoords.map((c) => c[0]));
      const maxLon = Math.max(...areaCoords.map((c) => c[0]));
      const minLat = Math.min(...areaCoords.map((c) => c[1]));
      const maxLat = Math.max(...areaCoords.map((c) => c[1]));

      // Increase border offset so boxes are well inside the boundary
      const borderOffset = 0.00010;
      const safeMinLon = minLon + borderOffset;
      const safeMaxLon = maxLon - borderOffset;
      const safeMinLat = minLat + borderOffset;
      const safeMaxLat = maxLat - borderOffset;

      // Use full grid area (no 0.8 multiplier)
      const lonStep = (safeMaxLon - safeMinLon) / cols;
      const latStep = (safeMaxLat - safeMinLat) / rows;

      // Slightly smaller boxes to stay inside
      const shrinkRatio = 0.6;

      const plotsGeoJSON: any = { type: "FeatureCollection", features: [] };

      mockPlots.slice(0, rows * cols).forEach((plot, i) => {
        const row = Math.floor(i / cols);
        const col = i % cols;

        const xCenter = safeMinLon + (col + 0.5) * lonStep;
        const yCenter = safeMaxLat - (row + 0.5) * latStep;

        const halfLon = (lonStep * shrinkRatio) / 2;
        const halfLat = (latStep * shrinkRatio) / 2;

        const rect: [number, number][] = [
          [xCenter - halfLon, yCenter + halfLat],
          [xCenter + halfLon, yCenter + halfLat],
          [xCenter + halfLon, yCenter - halfLat],
          [xCenter - halfLon, yCenter - halfLat],
          [xCenter - halfLon, yCenter + halfLat],
        ];

        plotsGeoJSON.features.push({
          type: "Feature",
          properties: {
            plotNumber: plot.plotNumber,
            status: plot.status,
            message: plot.message,
          },
          geometry: { type: "Polygon", coordinates: [rect] },
        });
      });

      map.addSource("plots", { type: "geojson", data: plotsGeoJSON });

      // ✅ Pass = green, Fail = red
      map.addLayer({
        id: "plot-fills",
        type: "fill",
        source: "plots",
        paint: {
          "fill-color": [
            "case",
            ["==", ["get", "status"], "pass"],
            "rgba(0,200,0,0.6)", // green
            "rgba(200,0,0,0.6)", // red
          ],
          "fill-outline-color": "#333",
        },
      });

      // Tooltip
      const popup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
      });

      map.on("mousemove", "plot-fills", (e) => {
        if (!e.features || !e.features[0]) return;
        const props = e.features[0].properties!;
        popup
          .setLngLat(e.lngLat)
          .setHTML(
            `<div class="text-[13px]">
              <b>${props.plotNumber}</b><br/>
              <b>Status:</b> <span class="${
                props.status === "pass" ? "text-green-600" : "text-red-600"
              }">${props.status.toUpperCase()}</span><br/>
              ${props.message}
            </div>`
          )
          .addTo(map);
      });

      map.on("mouseleave", "plot-fills", () => popup.remove());
    });

    return () => map.remove();
  }, []);

  return (
     <>
      <div className="relative">
      <div ref={mapContainer} className="w-full h-[500px] rounded-lg border-2 border-gray-200" />
      </div>
     </>
  )
};

export default Map3D;
