import React, { useRef, useEffect } from "react";

const MAP_CENTER: [number, number] = [77.5946, 12.9716]; // Bangalore

export default function MapBuilding() {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any | null>(null);
  const tbRef = useRef<any | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;
    if (mapRef.current) return;

    // Use global objects injected by script tags in index.html
    // @ts-ignore
    const maplibregl = window.maplibregl;
    // @ts-ignore
    const Threebox = window.Threebox;
    // @ts-ignore
    const THREE = window.THREE;

    if (!maplibregl) {
      console.error("maplibregl not found on window. Make sure maplibre script is loaded.");
      return;
    }
    if (!Threebox) {
      console.error("Threebox not found on window. Make sure threebox script is loaded after THREE and maplibre.");
      return;
    }
    if (!THREE) {
      console.error("THREE not found on window. Make sure three.js script is loaded.");
      return;
    }

    // create map
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
        // create Threebox instance; pass the WebGL context
        tbRef.current = new Threebox(
          mapRef.current,
          mapRef.current.getCanvas().getContext("webgl"),
          {
            defaultLights: true,
            enableSelectingObjects: true,
            enableDraggingObjects: true,
          }
        );

        // expose tb globally so threebox internals that reference window.tb succeed
        // @ts-ignore
        window.tb = tbRef.current;

        // Add a custom 3D layer that uses Threebox
        mapRef.current.addLayer({
          id: "3d-model-layer",
          type: "custom",
          renderingMode: "3d",
          onAdd: function () {
            // Load GLTF/GLB using Threebox's loader helper
            tbRef.current.loadObj(
              {
                type: "gltf",
                obj: "models/House.glb", // relative to the server root (dist/models/big_building.glb)
                scale: 1,
                rotation: { x: 90, y: 0, z: 0 },
                anchor: "center",
              },
              function (model: any) {
                if (!model) {
                  console.error("❌ Failed to load GLB model.");
                  return;
                }

                model.setCoords(MAP_CENTER);
                model.set({ altitude: 0 });
                tbRef.current.add(model);

                new maplibregl.Marker({ color: "red" })
                  .setLngLat(MAP_CENTER)
                  .addTo(mapRef.current);

                console.log("📍 Model placed at", MAP_CENTER);
              }
            );
          },
          render: function (_gl: WebGLRenderingContext) {
            if (tbRef.current) tbRef.current.update();
          },
        });
      } catch (err) {
        console.error("Error setting up Threebox:", err);
      }
    });

    return () => {
      if (mapRef.current) {
        try {
          // remove global reference
          // @ts-ignore
          if (window.tb === tbRef.current) window.tb = undefined;
          mapRef.current.remove();
          mapRef.current = null;
          tbRef.current = null;
        } catch (e) {
          console.warn("Error cleaning up map:", e);
        }
      }
    };
  }, []);

  return (
    <div
      ref={mapContainer}
      style={{ width: "100%", height: "100vh" }}
      className="bg-gray-900 rounded-lg shadow-lg border border-gray-800"
    />
  );
}