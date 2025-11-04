// src/components/Map3D.tsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import * as THREE from "three";
import "maplibre-gl/dist/maplibre-gl.css";
import Draw from "@mapbox/mapbox-gl-draw";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

interface Map3DProps {
  center?: [number, number];
  zoom?: number;
  pitch?: number;
  bearing?: number;
}

const Map3D: React.FC<Map3DProps> = ({
  center = [77.5946, 12.9716], // Default: Bangalore
  zoom = 15,
  pitch = 60,
  bearing = 0,
}) => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const threeRef = useRef<{
    scene: THREE.Scene;
    renderer: THREE.WebGLRenderer;
    camera: THREE.PerspectiveCamera;
    animationId?: number;
  } | null>(null);
  const drawRef = useRef<Draw | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Debounce utility
  const debounce = (func: Function, delay: number) => {
    let timer: any;
    return (...args: any[]) => {
      clearTimeout(timer);
      timer = setTimeout(() => func(...args), delay);
    };
  };

  const handleMapMove = useCallback(() => {
    if (threeRef.current) {
      threeRef.current.renderer.render(
        threeRef.current.scene,
        threeRef.current.camera
      );
    }
  }, []);

  const debouncedMapMove = useCallback(debounce(handleMapMove, 120), [handleMapMove]);

  useEffect(() => {
    if (!mapContainer.current) return;

    // --- Initialize MapLibre ---
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            maxzoom: 19,
          },
        },
        layers: [
          {
            id: "osm",
            type: "raster",
            source: "osm",
          },
        ],
      },
      center,
      zoom,
      pitch,
      bearing,
      antialias: true,
    });

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "top-right"
    );

    // --- Optional Drawing Controls ---
    const draw = new Draw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        trash: true,
      },
    });
    map.addControl(draw);

    // --- Three.js Scene Setup ---
    const scene = new THREE.Scene();
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);

    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 5, 10);

    threeRef.current = { scene, renderer, camera };

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    scene.add(ambientLight, directionalLight);

    // --- Load GLB Model ---
    const loader = new GLTFLoader();
    loader.load(
      "/models/building.glb",
      (gltf:any) => {
        const model = gltf.scene;
        model.scale.set(5, 5, 5);
        model.position.set(0, 0, 0);
        scene.add(model);
        renderer.render(scene, camera);
        console.log("✅ GLB model loaded successfully");
      },
      undefined,
      (error:any) => console.error("❌ Error loading GLB model:", error)
    );

    // --- Add Renderer Canvas ---
    mapContainer.current.appendChild(renderer.domElement);

    // --- Resize Handler ---
    const onResize = () => {
      if (!threeRef.current) return;
      const { camera, renderer } = threeRef.current;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    // --- Smooth Animation Loop ---
    const animate = () => {
      if (!threeRef.current) return;
      const { scene, camera, renderer } = threeRef.current;
      renderer.render(scene, camera);
      threeRef.current.animationId = requestAnimationFrame(animate);
    };
    animate();

    // --- Map Move Events (debounced) ---
    map.on("move", debouncedMapMove);
    map.on("zoom", debouncedMapMove);

    setIsLoaded(true);
    mapRef.current = map;
    drawRef.current = draw;

    // --- Cleanup ---
    return () => {
      console.log("🧹 Cleaning up Map3D...");

      window.removeEventListener("resize", onResize);

      if (threeRef.current?.animationId) {
        cancelAnimationFrame(threeRef.current.animationId);
      }

      if (threeRef.current) {
        threeRef.current.renderer.dispose();
        threeRef.current.scene.traverse((obj) => {
          if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
          if ((obj as THREE.Mesh).material) {
            const mat = (obj as THREE.Mesh).material as THREE.Material;
            mat.dispose();
          }
        });
        threeRef.current = null;
      }

      if (mapRef.current) {
        mapRef.current.off("move", debouncedMapMove);
        mapRef.current.off("zoom", debouncedMapMove);
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [center, zoom, pitch, bearing, debouncedMapMove]);

  return (
    <div className="w-full h-screen relative">
      <div ref={mapContainer} className="w-full h-full" />
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-lg font-semibold">
          Loading Map...
        </div>
      )}
    </div>
  );
};

export default Map3D;
