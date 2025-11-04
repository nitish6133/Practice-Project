import React, { useRef, useEffect, useState } from "react";

const MAP_CENTER: [number, number] = [77.5946, 12.9716];

interface Building {
  id: string;
  model: any;
  coords: [number, number];
  scale: number;
  color: string;
  modelPath: string;
}

export default function MapBuilding() {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any | null>(null);
  const tbRef = useRef<any | null>(null);
  const buildingsRef = useRef<Building[]>([]);
  const [isReady, setIsReady] = useState(false);

  const addBuilding = (
    coords: [number, number],
    modelPath: string,
    scale: number = 1,
    color: string = "#ffffff"
  ) => {
    if (!tbRef.current || !mapRef.current) {
      console.error("Map not ready yet");
      return;
    }

    const maplibregl = (window as any).maplibregl;
    const THREE = (window as any).THREE;

    tbRef.current.loadObj(
      {
        type: "gltf",
        obj: modelPath,
        scale: scale,
        rotation: { x: 90, y: 0, z: 0 },
        anchor: "center",
      },
      function (model: any) {
        if (!model) {
          console.error("Failed to load model:", modelPath);
          return;
        }

        model.setCoords(coords);
        model.set({ altitude: 0 });

        if (color !== "#ffffff") {
          model.traverse((child: any) => {
            if (child.isMesh) {
              child.material = new THREE.MeshStandardMaterial({
                color: color,
                metalness: 0.3,
                roughness: 0.7,
              });
            }
          });
        }

        tbRef.current.add(model);

        const building: Building = {
          id: `building-${Date.now()}-${Math.random()}`,
          model: model,
          coords: coords,
          scale: scale,
          color: color,
          modelPath: modelPath,
        };

        buildingsRef.current.push(building);

        new maplibregl.Marker({ color: "blue" })
          .setLngLat(coords)
          .addTo(mapRef.current);

        console.log("Building placed at", coords, "with scale", scale, "and color", color);
      }
    );
  };

  useEffect(() => {
    if (!mapContainer.current) return;
    if (mapRef.current) return;

    const initMap = () => {
      const maplibregl = (window as any).maplibregl;
      const Threebox = (window as any).Threebox;
      const THREE = (window as any).THREE;

      if (!maplibregl || !Threebox || !THREE) {
        console.log("Waiting for libraries to load...");
        setTimeout(initMap, 100);
        return;
      }

      mapRef.current = new maplibregl.Map({
        container: mapContainer.current,
        style: {
          version: 8,
          sources: {
            "osm-tiles": {
              type: "raster",
              tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
              tileSize: 256,
              attribution: "© OpenStreetMap contributors",
            },
          },
          layers: [
            {
              id: "osm-tiles-layer",
              type: "raster",
              source: "osm-tiles",
            },
          ],
        },
        center: MAP_CENTER,
        zoom: 17,
        pitch: 60,
        bearing: -20,
        antialias: true,
      });

      mapRef.current.addControl(new maplibregl.NavigationControl(), "top-left");

      mapRef.current.on("load", () => {
        try {
          tbRef.current = new Threebox(
            mapRef.current,
            mapRef.current.getCanvas().getContext("webgl"),
            {
              defaultLights: true,
              enableSelectingObjects: true,
              enableDraggingObjects: true,
            }
          );

          (window as any).tb = tbRef.current;

          mapRef.current.addLayer({
            id: "3d-model-layer",
            type: "custom",
            renderingMode: "3d",
            onAdd: function () {
              addBuilding(MAP_CENTER, "models/House.glb", 1, "#ffffff");

              addBuilding([77.5948, 12.9716], "models/House.glb", 0.8, "#ff6b6b");

              addBuilding([77.5944, 12.9716], "models/House.glb", 1.2, "#4ecdc4");

              addBuilding([77.5946, 12.9718], "models/House.glb", 1.5, "#ffe66d");
            },
            render: function (_gl: WebGLRenderingContext) {
              if (tbRef.current) tbRef.current.update();
            },
          });

          setIsReady(true);
          (window as any).addBuilding = addBuilding;
          console.log("Map ready! Use addBuilding([lng, lat], 'models/House.glb', scale, color) to add more buildings");
        } catch (err) {
          console.error("Error setting up Threebox:", err);
        }
      });
    };

    initMap();

    return () => {
      if (mapRef.current) {
        try {
          if ((window as any).tb === tbRef.current) (window as any).tb = undefined;
          if ((window as any).addBuilding) delete (window as any).addBuilding;
          mapRef.current.remove();
          mapRef.current = null;
          tbRef.current = null;
          buildingsRef.current = [];
        } catch (e) {
          console.warn("Error cleaning up map:", e);
        }
      }
    };
  }, []);

  return (
    <div className="relative w-full h-screen">
      <div
        ref={mapContainer}
        style={{ width: "100%", height: "100vh" }}
        className="bg-gray-900"
      />
      {isReady && (
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm p-4 rounded-lg shadow-lg max-w-sm z-10">
          <h3 className="font-bold text-lg mb-2">3D Building Map</h3>
          <p className="text-sm text-gray-700 mb-2">Map is ready! Buildings placed with different colors and sizes.</p>
          <div className="text-xs bg-blue-50 p-2 rounded border border-blue-200">
            <p className="font-semibold mb-1">Open browser console and use:</p>
            <code className="block bg-white p-1 rounded text-xs overflow-x-auto">
              addBuilding([lng, lat], 'models/House.glb', scale, color)
            </code>
          </div>
        </div>
      )}
    </div>
  );
}