// src/components/Map3D.tsx
import React, { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import Draw from "@mapbox/mapbox-gl-draw";
import "maplibre-gl/dist/maplibre-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import * as THREE from "three";

// ---------- Types ----------
interface Map3DProps {
  pitch?: number;
  bearing?: number;
  showBuildings?: boolean;
  showTerrain?: boolean;
  center?: [number, number];
  zoom?: number;
}

type BuildingFeature = GeoJSON.Feature<
  GeoJSON.Polygon,
  {
    height?: number;
    base?: number;
    color?: string;
    id?: string;
    rotation?: number;
    content?: string;
  }
>;

type TreeFeature = GeoJSON.Feature<
  GeoJSON.Point,
  { size?: number; id?: string; model?: "circle" | "extrude" | "gltf" }
>;

// ---------- Constants ----------
const USER_BUILDINGS_KEY = "user_buildings_geojson_v3";
const USER_TREES_KEY = "user_trees_geojson_v2";

// ---------- Utils (meters <-> degrees helpers) ----------
const metersToLatDegrees = (meters: number) => meters / 111320;
const metersToLngDegrees = (meters: number, lat: number) =>
  meters / (111320 * Math.cos((lat * Math.PI) / 180));

function rectanglePolygonAround(
  lng: number,
  lat: number,
  widthMeters: number,
  depthMeters: number,
  rotationDeg = 0
): GeoJSON.Position[] {
  const hw = widthMeters / 2;
  const hd = depthMeters / 2;
  const local = [
    [-hw, -hd],
    [hw, -hd],
    [hw, hd],
    [-hw, hd],
  ];
  const angle = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const coords = local.map(([dxMeters, dyMeters]) => {
    const dLng = metersToLngDegrees(dxMeters, lat);
    const dLat = metersToLatDegrees(dyMeters);
    const rx = dLng * cos - dLat * sin;
    const ry = dLng * sin + dLat * cos;
    return [lng + rx, lat + ry] as GeoJSON.Position;
  });
  coords.push(coords[0]);
  return coords;
}

function circlePolygonAround(
  lng: number,
  lat: number,
  radiusMeters: number,
  segments = 24
): GeoJSON.Position[] {
  const coords: GeoJSON.Position[] = [];
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const dx = Math.cos(angle) * radiusMeters;
    const dy = Math.sin(angle) * radiusMeters;
    const dLng = metersToLngDegrees(dx, lat);
    const dLat = metersToLatDegrees(dy);
    coords.push([lng + dLng, lat + dLat]);
  }
  coords.push(coords[0]);
  return coords;
}

function ensureClosedRing(coords: GeoJSON.Position[]) {
  if (!coords || coords.length === 0) return coords;
  const first = coords[0];
  const last = coords[coords.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) return coords;
  return [...coords, [first[0], first[1]]];
}

function polygonCentroidCoords(coords: GeoJSON.Position[]) {
  const ring = coords.slice(0, coords.length - 1);
  let x = 0,
    y = 0;
  ring.forEach((c) => {
    x += c[0];
    y += c[1];
  });
  return [x / ring.length, y / ring.length] as [number, number];
}

function cryptoRandomId() {
  try {
    return crypto.getRandomValues(new Uint32Array(2)).join("-");
  } catch {
    return Math.random().toString(36).slice(2, 9);
  }
}

// ---------- Three Layer Manager ----------
interface ThreeLayerManager {
  layerId: string;
  renderer?: THREE.WebGLRenderer;
  scene?: THREE.Scene;
  camera?: THREE.Camera;
  clock?: THREE.Clock;
  meshes: Map<string, THREE.Mesh>;
  addMeshForFeature: (feature: BuildingFeature, map: maplibregl.Map) => void;
  removeById: (id: string) => void;
  updateHeight: (id: string, heightMeters: number, map: maplibregl.Map) => void;
  dispose: () => void;
}

function createThreeLayerManager(map: maplibregl.Map): ThreeLayerManager {
  const manager: ThreeLayerManager = {
    layerId: "threejs-buildings",
    meshes: new Map(),

    addMeshForFeature: (feature: BuildingFeature, mapArg: maplibregl.Map) => {
      const id = feature.properties?.id ?? cryptoRandomId();
      // if exists, remove first (replace)
      if (manager.meshes.has(id)) {
        const old = manager.meshes.get(id)!;
        manager.scene?.remove(old);
        manager.meshes.delete(id);
      }
      const coords = feature.geometry.coordinates[0];
      const color = feature.properties?.color ?? "#c44e3b";
      const height = Number(feature.properties?.height ?? 10);
      const mesh = buildMeshFromPolygon(coords, height, color, mapArg);
      mesh.userData = { id, heightMeters: height };
      manager.scene?.add(mesh);
      manager.meshes.set(id, mesh);
      // animate rise
      mesh.scale.z = 0.001;
      const start = performance.now();
      const dur = 700;
      const from = 0.001;
      const to = 1;
      const anim = (now: number) => {
        const t = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - t, 3);
        mesh.scale.z = from + (to - from) * eased;
        if (t < 1) requestAnimationFrame(anim);
        else mesh.scale.z = 1;
      };
      requestAnimationFrame(anim);
    },

    removeById: (id: string) => {
      const m = manager.meshes.get(id);
      if (m && manager.scene) {
        manager.scene.remove(m);
        manager.meshes.delete(id);
      }
    },

    updateHeight: (id: string, heightMeters: number, mapArg: maplibregl.Map) => {
      const mesh = manager.meshes.get(id);
      if (!mesh) return;
      // easiest route: scale z according to ratio of newHeight / oldHeight if geometry built with height=1 unit
      // Our buildMeshFromPolygon created geometry with depth=1 (we multiply later).
      const old = mesh.userData.heightMeters ?? heightMeters;
      const newH = heightMeters;
      mesh.userData.heightMeters = newH;
      // animate scale.z
      const start = performance.now();
      const dur = 500;
      const from = mesh.scale.z;
      const to = newH / (old || newH || 1);
      // We baked geometry so we just animate a multiplier
      const anim = (now: number) => {
        const t = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - t, 3);
        mesh.scale.z = from + (to - from) * eased;
        if (t < 1) requestAnimationFrame(anim);
        else mesh.scale.z = to;
      };
      requestAnimationFrame(anim);
    },

    dispose: () => {
      // remove layer from map if exists
      try {
        if (map.getLayer(manager.layerId)) map.removeLayer(manager.layerId);
      } catch {}
      manager.meshes.forEach((m) => {
        manager.scene?.remove(m);
      });
      manager.meshes.clear();
      if (manager.renderer) {
        manager.renderer.dispose();
      }
      manager.scene = undefined;
      manager.camera = undefined;
      manager.renderer = undefined;
    },
  };

  // create custom layer object to add to the map
  const customLayer: maplibregl.CustomLayerInterface = {
    id: manager.layerId,
    type: "custom",
    renderingMode: "3d",
    onAdd: function (mapObj: any, gl: WebGLRenderingContext) {
      // Three renderer using the map's GL context
      const renderer = new THREE.WebGLRenderer({
        canvas: mapObj.getCanvas(),
        context: gl as any,
        antialias: true,
      } as any);
      renderer.autoClear = false;
      renderer.setSize(mapObj.getCanvas().width, mapObj.getCanvas().height);

      const scene = new THREE.Scene();
      const camera = new THREE.Camera();
      const clock = new THREE.Clock();

      // lights
      scene.add(new THREE.AmbientLight(0xffffff, 0.6));
      const dir = new THREE.DirectionalLight(0xffffff, 0.6);
      dir.position.set(0.5, -1, 1).normalize();
      scene.add(dir);

      manager.renderer = renderer;
      manager.scene = scene;
      manager.camera = camera;
      manager.clock = clock;
    },
    render: function (gl: WebGLRenderingContext, matrix: number[]) {
      if (!manager.renderer || !manager.scene || !manager.camera || !manager.clock) return;
      // update camera projection from MapLibre matrix
      const m = new THREE.Matrix4().fromArray(matrix);
      manager.camera.projectionMatrix = m;

      // small per-mesh animation (blinking windows via emissiveIntensity)
      const t = manager.clock.getElapsedTime();
      manager.meshes.forEach((mesh) => {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (mat && mat.emissive) {
          // subtle blinking based on id string hash
          const id = mesh.userData.id ?? "";
          const hash = id
            .split("")
            .reduce((s: number, ch: string) => (s + ch.charCodeAt(0)) % 1000, 0);
          const phase = (t * 0.8 + (hash % 10) * 0.12) % (Math.PI * 2);
          mat.emissiveIntensity = 0.08 + 0.4 * Math.abs(Math.sin(phase));
        }
      });

      manager.renderer.state.reset();
      manager.renderer.render(manager.scene, manager.camera);
      // request MapLibre to repaint next frame
      (map as any).triggerRepaint?.();
    },
  };

  // add layer now
  try {
    if (!map.getLayer(customLayer.id)) {
      map.addLayer(customLayer);
    }
  } catch (e) {
    // may fail if layer already exists — ignore
    // console.warn("three layer add failed", e);
  }

  return manager;
}

// Helper: create a Three Mesh from polygon coordinates (lng/lat positions)
function buildMeshFromPolygon(
  polygonCoords: GeoJSON.Position[],
  heightMeters: number,
  colorHex: string,
  map: maplibregl.Map
) {
  // Convert polygon coords to MercatorCoordinate units (three units)
  const mercCoords: { x: number; y: number }[] = [];
  for (let i = 0; i < polygonCoords.length; i++) {
    const [lng, lat] = polygonCoords[i];
    const mc = (maplibregl as any).MercatorCoordinate.fromLngLat({
      lon: lng,
      lat,
    });
    // Use (x, y) as planar coords — flip Y for three
    mercCoords.push({ x: mc.x, y: -mc.y });
  }
  // Build a THREE.Shape
  const shape = new THREE.Shape();
  mercCoords.forEach((p, idx) => {
    if (idx === 0) shape.moveTo(p.x, p.y);
    else shape.lineTo(p.x, p.y);
  });

  // Convert height meters to mercator units using a center sample
  const center = polygonCentroidCoords(polygonCoords);
  const mcCenter = (maplibregl as any).MercatorCoordinate.fromLngLat({
    lon: center[0],
    lat: center[1],
  });
  const meterToMerc = mcCenter.meterInMercatorCoordinateUnits ?? 1;
  const depth = (heightMeters / meterToMerc) || heightMeters;

  const extrudeSettings: any = {
    depth: depth || 1,
    bevelEnabled: false,
    steps: 1,
  };

  const geom = new (THREE as any).ExtrudeGeometry(shape, extrudeSettings);
  // move geometry so base sits at z=0
  geom.translate(0, 0, 0);

  // simple material with emissive for windows
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(colorHex),
    metalness: 0.05,
    roughness: 0.8,
    emissive: new THREE.Color(0x222222),
    emissiveIntensity: 0.2,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geom as THREE.BufferGeometry, mat);
  // position mesh at correct z offset so base sits at map altitude 0 — using extrude depth means it's already along +Z
  // We'll keep mesh.position.z = 0
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}

// ---------- React Component ----------
export const Map3D: React.FC<Map3DProps> = ({
  pitch = 60,
  bearing = -17.6,
  showBuildings = false,
  showTerrain = true,
  center = [-0.1276, 51.5072],
  zoom = 15,
}) => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const drawRef = useRef<any>(null);
  const threeManagerRef = useRef<ThreeLayerManager | null>(null);

  // UI state
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isPlacingMode, setIsPlacingMode] = useState(false);
  const [placingType, setPlacingType] = useState<"building" | "tree">("building");
  const [shape, setShape] = useState<"rectangle" | "circle" | "custom">("rectangle");
  const [buildingColor, setBuildingColor] = useState("#c44e3b");
  const [buildingWidth, setBuildingWidth] = useState(12);
  const [buildingDepth, setBuildingDepth] = useState(12);
  const [buildingHeight, setBuildingHeight] = useState(12);
  const [circleRadius, setCircleRadius] = useState(8);
  const [treeSize, setTreeSize] = useState(6);
  const [error, setError] = useState<string | null>(null);
  const [buildingsCount, setBuildingsCount] = useState(0);
  const [treesCount, setTreesCount] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  // storage helpers
  const loadFromStorage = (key: string) => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };
  const saveToStorage = (key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch {}
  };

  // Append building: update GeoJSON source + three mesh
  function appendBuildingFeature(feat: BuildingFeature, animateHeight = false) {
    if (!map.current) return;
    const src = map.current.getSource("user-buildings") as maplibregl.GeoJSONSource | undefined;
    if (!src) return;
    let current: GeoJSON.FeatureCollection<GeoJSON.Geometry, any> = {
      type: "FeatureCollection",
      features: [],
    };
    try {
      // @ts-ignore - internal _data used for convenience
      const maybe = (src as any)._data ?? null;
      if (maybe && typeof maybe === "object") current = maybe;
    } catch {}
    // ensure id
    if (!feat.properties) feat.properties = {};
    feat.properties.id = feat.properties.id ?? cryptoRandomId();

    // when animateHeight true, temporarily set height to 0 so we can animate
    const targetHeight = Number(feat.properties.height ?? buildingHeight);
    if (animateHeight) feat.properties = { ...feat.properties, height: 0 };

    const newData: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [...(current.features ?? []), feat],
    };
    try {
      src.setData(newData as any);
      saveToStorage(USER_BUILDINGS_KEY, newData);
      setBuildingsCount(newData.features.length);
    } catch {
      setError("Failed to add building (source error)");
      return;
    }
    // add three mesh if manager exists
    const manager = threeManagerRef.current;
    if (manager) {
      manager.addMeshForFeature(feat, map.current);
      // if animateHeight true, update to target height after creating mesh
      if (animateHeight) {
        // little timeout so mesh exists
        setTimeout(() => {
          manager.updateHeight(feat.properties!.id!, targetHeight, map.current!);
          // also update persisted feature height to target
          // read source and update
          try {
            const srcCur = map.current!.getSource("user-buildings") as any;
            const cur = (srcCur as any)._data;
            const idx = cur.features.findIndex((f: any) => f.properties && f.properties.id === feat.properties!.id);
            if (idx !== -1) {
              cur.features[idx].properties.height = targetHeight;
              srcCur.setData(cur);
              saveToStorage(USER_BUILDINGS_KEY, cur);
            }
          } catch {}
        }, 450);
      }
    }
  }

  // Append tree (simple)
  function appendTreeFeature(feat: TreeFeature) {
    if (!map.current) return;
    const src = map.current.getSource("user-trees") as maplibregl.GeoJSONSource | undefined;
    if (!src) return;
    let current: GeoJSON.FeatureCollection<GeoJSON.Geometry, any> = {
      type: "FeatureCollection",
      features: [],
    };
    try {
      // @ts-ignore
      const maybe = (src as any)._data ?? null;
      if (maybe && typeof maybe === "object") current = maybe;
    } catch {}
    if (!feat.properties) feat.properties = {};
    feat.properties.id = feat.properties.id ?? cryptoRandomId();
    const newData = {
      type: "FeatureCollection",
      features: [...(current.features ?? []), feat],
    };
    try {
      src.setData(newData as any);
      saveToStorage(USER_TREES_KEY, newData);
      setTreesCount(newData.features.length);
    } catch {
      setError("Failed to add tree (source error)");
    }
  }

  // animate helper
  function easeOutCubic(t: number) {
    return 1 - Math.pow(1 - t, 3);
  }

  // delete selected
  const deleteSelected = () => {
    if (!map.current || !selectedId) return;
    const bsrc = map.current.getSource("user-buildings") as maplibregl.GeoJSONSource | undefined;
    if (bsrc) {
      // @ts-ignore
      const cur = (bsrc as any)._data ?? null;
      if (cur && cur.features) {
        const idx = cur.features.findIndex((f: any) => f.properties && f.properties.id === selectedId);
        if (idx !== -1) {
          // remove from three too
          threeManagerRef.current?.removeById(selectedId);
          cur.features.splice(idx, 1);
          try {
            bsrc.setData(cur as any);
            saveToStorage(USER_BUILDINGS_KEY, cur);
            setBuildingsCount(cur.features.length);
            setSelectedId(null);
            return;
          } catch {}
        }
      }
    }
    const tsrc = map.current.getSource("user-trees") as maplibregl.GeoJSONSource | undefined;
    if (tsrc) {
      // @ts-ignore
      const cur = (tsrc as any)._data ?? null;
      if (cur && cur.features) {
        const idx = cur.features.findIndex((f: any) => f.properties && f.properties.id === selectedId);
        if (idx !== -1) {
          cur.features.splice(idx, 1);
          try {
            tsrc.setData(cur as any);
            saveToStorage(USER_TREES_KEY, cur);
            setTreesCount(cur.features.length);
            setSelectedId(null);
            return;
          } catch {}
        }
      }
    }
  };

  // load and initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // tile JSON sample replaced with simple raster OSM as base; keep terrain vector defined
    map.current = new maplibregl.Map({
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
          "terrain-source": {
            type: "raster-dem",
            url: "https://demotiles.maplibre.org/terrain-tiles/tiles.json",
            tileSize: 256,
          },
        },
        layers: [
          {
            id: "osm",
            type: "raster",
            source: "osm",
          },
        ],
        terrain: {
          source: "terrain-source",
          exaggeration: 1.2,
        },
        light: { anchor: "viewport", color: "#ffffff", intensity: 0.7 },
      },
      center,
      zoom,
      pitch,
      bearing,
    });

    // Draw control
    drawRef.current = new Draw({
      displayControlsDefault: false,
      controls: { polygon: true, trash: true },
    });
    map.current.addControl(new maplibregl.NavigationControl(), "top-right");
    map.current.addControl(drawRef.current as any as maplibregl.IControl, "top-left");

    map.current.on("load", () => {
      if (!map.current) return;

      // add sources
      const savedBuildings = loadFromStorage(USER_BUILDINGS_KEY);
      if (!map.current.getSource("user-buildings")) {
        map.current.addSource("user-buildings", {
          type: "geojson",
          data: savedBuildings ?? { type: "FeatureCollection", features: [] },
        } as any);
      } else {
        (map.current.getSource("user-buildings") as any).setData(savedBuildings ?? { type: "FeatureCollection", features: [] });
      }

      const savedTrees = loadFromStorage(USER_TREES_KEY);
      if (!map.current.getSource("user-trees")) {
        map.current.addSource("user-trees", {
          type: "geojson",
          data: savedTrees ?? { type: "FeatureCollection", features: [] },
        } as any);
      } else {
        (map.current.getSource("user-trees") as any).setData(savedTrees ?? { type: "FeatureCollection", features: [] });
      }

      // add fallback fill-extrusion (still useful as LOD)
      try {
        if (!map.current.getLayer("user-buildings-3d")) {
          map.current.addLayer({
            id: "user-buildings-3d",
            type: "fill-extrusion",
            source: "user-buildings",
            paint: {
              "fill-extrusion-height": ["coalesce", ["to-number", ["get", "height"]], 8],
              "fill-extrusion-base": ["coalesce", ["to-number", ["get", "base"]], 0],
              "fill-extrusion-color": [
                "case",
                ["has", "color"],
                ["get", "color"],
                ["interpolate", ["linear"], ["coalesce", ["to-number", ["get", "height"]], 8], 0, "#b0b0b0", 20, "#c44e3b", 60, "#7eb8f1"],
              ],
              "fill-extrusion-opacity": 0.98,
              "fill-extrusion-vertical-gradient": true,
            },
          } as any);
        }
      } catch (e) {
        console.warn("could not add extrusion", e);
      }

      // outline
      try {
        if (!map.current.getLayer("user-buildings-outline")) {
          map.current.addLayer({
            id: "user-buildings-outline",
            type: "line",
            source: "user-buildings",
            paint: { "line-color": "#222", "line-width": 0.6, "line-opacity": 0.6 },
          } as any);
        }
      } catch {}

      // trees visual
      try {
        if (!map.current.getLayer("user-trees-circle")) {
          map.current.addLayer({
            id: "user-trees-circle",
            type: "circle",
            source: "user-trees",
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 12, 3, 16, 10],
              "circle-color": "#2e8b57",
              "circle-opacity": 0.95,
              "circle-stroke-color": "#144d2b",
              "circle-stroke-width": 1,
            },
          } as any);
        }
      } catch {}

      // create Three manager and populate existing features as meshes
      try {
        const mgr = createThreeLayerManager(map.current);
        threeManagerRef.current = mgr;
        // add current building features as meshes
        const src = map.current!.getSource("user-buildings") as any;
        const curData = (src as any)._data ?? { type: "FeatureCollection", features: [] };
        (curData.features ?? []).forEach((f: any) => {
          try {
            mgr.addMeshForFeature(f as BuildingFeature, map.current!);
          } catch (err) {
            // ignore
          }
        });
      } catch (err) {
        console.warn("three manager init failed", err);
      }

      // counts
      setBuildingsCount((savedBuildings?.features?.length) ?? 0);
      setTreesCount((savedTrees?.features?.length) ?? 0);
      setMapLoaded(true);
    });

    // draw.create -> create building from drawn polygon
    map.current.on("draw.create", (ev: any) => {
      const feat = ev.features?.[0];
      if (!feat || feat.geometry?.type !== "Polygon") return;
      const coords = feat.geometry.coordinates[0] as GeoJSON.Position[];
      // quick prompts (demo)
      const hStr = window.prompt("Enter building height in meters:", String(buildingHeight));
      let height = buildingHeight;
      if (hStr !== null) {
        const parsed = parseFloat(hStr);
        if (!isNaN(parsed) && isFinite(parsed)) height = parsed;
      }
      const color = window.prompt("Enter building color hex (e.g. #c44e3b):", buildingColor) || buildingColor;
      const b: BuildingFeature = {
        type: "Feature",
        geometry: feat.geometry,
        properties: { id: cryptoRandomId(), color, height, base: 0, rotation: 0, content: "" },
      };
      appendBuildingFeature(b, true);
      try {
        drawRef.current?.delete(feat.id);
      } catch {}
    });

    // click handling for placing / selection
    map.current.on("click", (e) => {
      if (!map.current) return;
      if (isPlacingMode) {
        const lng = e.lngLat.lng;
        const lat = e.lngLat.lat;
        const hits = map.current.queryRenderedFeatures(e.point, { layers: ["user-buildings-3d", "user-trees-circle"] });
        if (hits && hits.length > 0) {
          setError("Cannot place here — occupied by existing feature.");
          return;
        }
        if (placingType === "building") {
          let coords: GeoJSON.Position[] = [];
          if (shape === "rectangle") coords = rectanglePolygonAround(lng, lat, buildingWidth, buildingDepth);
          else if (shape === "circle") coords = circlePolygonAround(lng, lat, circleRadius, 32);
          else coords = rectanglePolygonAround(lng, lat, buildingWidth, buildingDepth);
          const newFeat: BuildingFeature = {
            type: "Feature",
            properties: { id: cryptoRandomId(), color: buildingColor, height: buildingHeight, base: 0, rotation: 0, content: shape },
            geometry: { type: "Polygon", coordinates: [coords] },
          };
          appendBuildingFeature(newFeat, true);
          setError(null);
        } else {
          const t: TreeFeature = {
            type: "Feature",
            properties: { id: cryptoRandomId(), size: treeSize },
            geometry: { type: "Point", coordinates: [lng, lat] },
          };
          appendTreeFeature(t);
          setError(null);
        }
        return;
      }
      // selection when not placing
      const userHits = map.current.queryRenderedFeatures(e.point, { layers: ["user-buildings-3d", "user-trees-circle"] });
      if (userHits && userHits.length > 0) {
        const top = userHits[0];
        const props: any = top.properties ?? {};
        const id = props.id ?? props.ID ?? props.Id ?? null;
        if (id) setSelectedId(id);
        else setSelectedId(null);
      } else {
        setSelectedId(null);
      }
    });

    // cleanup on unmount
    const onResize = () => map.current?.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      try {
        threeManagerRef.current?.dispose();
      } catch {}
      try {
        if (map.current) {
          try {
            if (drawRef.current) map.current.removeControl(drawRef.current as any as maplibregl.IControl);
          } catch {}
          map.current.remove();
        }
      } catch {}
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // helper: get selected building props
  const getSelectedBuildingProps = (): any | null => {
    if (!map.current || !selectedId) return null;
    const src = map.current.getSource("user-buildings") as maplibregl.GeoJSONSource | undefined;
    if (!src) return null;
    // @ts-ignore
    const cur = (src as any)._data;
    if (!cur) return null;
    const f = cur.features.find((ff: any) => ff.properties && ff.properties.id === selectedId);
    return f?.properties ?? null;
  };

  const selectedProps = getSelectedBuildingProps();

  // export/import/clear helpers
  const exportGeoJSON = (key: string, filename: string) => {
    const data = loadFromStorage(key);
    if (!data) {
      setError("Nothing to export");
      return;
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importGeoJSON = (file: File | null, key: string, sourceId: string, setCount: (n: number) => void) => {
    if (!file || !map.current) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        const src = map.current!.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;
        if (!src) throw new Error("source not found");
        src.setData(parsed as any);
        saveToStorage(key, parsed);
        setCount(parsed.features?.length ?? 0);
        setError(null);
        // add three meshes for buildings
        if (sourceId === "user-buildings" && threeManagerRef.current) {
          (parsed.features ?? []).forEach((f: any) => {
            try {
              threeManagerRef.current!.addMeshForFeature(f as BuildingFeature, map.current!);
            } catch {}
          });
        }
      } catch (e) {
        console.error(e);
        setError("Invalid GeoJSON");
      }
    };
    reader.readAsText(file);
  };

  // rotate selected building
  function rotateSelectedBuilding(deltaDeg: number) {
    if (!map.current || !selectedId) return;
    const src = map.current.getSource("user-buildings") as maplibregl.GeoJSONSource | undefined;
    if (!src) return;
    // @ts-ignore
    const cur = (src as any)._data;
    if (!cur) return;
    const idx = cur.features.findIndex((f: any) => f.properties && f.properties.id === selectedId);
    if (idx === -1) return;
    const feat = cur.features[idx];
    const poly = feat.geometry.coordinates[0] as GeoJSON.Position[];
    const centroid = polygonCentroid(poly);
    const oldRotation = feat.properties.rotation ?? 0;
    const newRotation = (oldRotation + deltaDeg) % 360;
    // compute bbox to estimate width/depth
    const bbox = polygonBBox(poly);
    const widthMeters = Math.abs((bbox.maxLng - bbox.minLng) * (111320 * Math.cos((centroid[1] * Math.PI) / 180)));
    const depthMeters = Math.abs((bbox.maxLat - bbox.minLat) * 111320);
    const newPoly = rectanglePolygonAround(centroid[0], centroid[1], widthMeters || buildingWidth, depthMeters || buildingDepth, newRotation);
    cur.features[idx].geometry = { type: "Polygon", coordinates: [newPoly] };
    cur.features[idx].properties.rotation = newRotation;
    try {
      src.setData(cur as any);
      saveToStorage(USER_BUILDINGS_KEY, cur);
      // update three mesh by removing and re-adding
      threeManagerRef.current?.removeById(selectedId);
      threeManagerRef.current?.addMeshForFeature(cur.features[idx] as BuildingFeature, map.current!);
    } catch {}
  }
  function polygonCentroid(coords: GeoJSON.Position[]) {
    const pts = coords.slice(0, coords.length - 1);
    let x = 0,
      y = 0;
    pts.forEach((p) => {
      x += p[0];
      y += p[1];
    });
    return [x / pts.length, y / pts.length] as [number, number];
  }
  function polygonBBox(coords: GeoJSON.Position[]) {
    let minLng = Infinity,
      minLat = Infinity,
      maxLng = -Infinity,
      maxLat = -Infinity;
    coords.forEach((c) => {
      if (c[0] < minLng) minLng = c[0];
      if (c[0] > maxLng) maxLng = c[0];
      if (c[1] < minLat) minLat = c[1];
      if (c[1] > maxLat) maxLat = c[1];
    });
    return { minLng, minLat, maxLng, maxLat };
  }

  // update selected building props (height/color/content)
  function updateSelectedBuildingProps(updates: Partial<BuildingFeature["properties"]>) {
    if (!map.current || !selectedId) return;
    const src = map.current.getSource("user-buildings") as maplibregl.GeoJSONSource | undefined;
    if (!src) return;
    // @ts-ignore
    const cur = (src as any)._data;
    if (!cur) return;
    const idx = cur.features.findIndex((f: any) => f.properties && f.properties.id === selectedId);
    if (idx === -1) return;
    if (updates.height !== undefined) {
      const startH = cur.features[idx].properties.height ?? 0;
      const targetH = updates.height;
      cur.features[idx].properties = { ...cur.features[idx].properties, ...updates };
      src.setData(cur as any);
      saveToStorage(USER_BUILDINGS_KEY, cur);
      // update three
      threeManagerRef.current?.updateHeight(selectedId, Number(targetH), map.current);
    } else {
      cur.features[idx].properties = { ...cur.features[idx].properties, ...updates };
      src.setData(cur as any);
      saveToStorage(USER_BUILDINGS_KEY, cur);
      // if color changed, update material
      const mesh = threeManagerRef.current?.meshes.get(selectedId);
      if (mesh && updates.color) {
        (mesh.material as THREE.MeshStandardMaterial).color = new THREE.Color(updates.color);
      }
    }
  }

  // UI rendering
  return (
    <div className="fixed inset-0 z-0">
      <div ref={mapContainer} className="w-full h-full" />
      <div className="absolute top-4 left-4 z-50 bg-white/95 p-3 rounded shadow-md w-96 space-y-2">
        <div className="flex items-center justify-between">
          <strong>Place</strong>
          <div className="text-xs text-gray-600">Mode: {isPlacingMode ? "Click-to-place" : "Idle"}</div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setPlacingType("building")} className={`flex-1 px-2 py-1 rounded ${placingType === "building" ? "bg-blue-600 text-white" : "bg-white"}`}>Building</button>
          <button onClick={() => setPlacingType("tree")} className={`flex-1 px-2 py-1 rounded ${placingType === "tree" ? "bg-green-600 text-white" : "bg-white"}`}>Tree</button>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIsPlacingMode((s) => !s)} className={`px-3 py-1 rounded ${isPlacingMode ? "bg-red-500 text-white" : "bg-white"}`}>{isPlacingMode ? "Stop Placing" : "Click-to-place"}</button>
          <button onClick={() => {
            if (!map.current) { setError("Map not ready"); return; }
            const c = map.current.getCenter();
            if (placingType === "building") {
              let coords: GeoJSON.Position[] = [];
              if (shape === "rectangle") coords = rectanglePolygonAround(c.lng, c.lat, buildingWidth, buildingDepth);
              else coords = circlePolygonAround(c.lng, c.lat, circleRadius, 32);
              const feat: BuildingFeature = { type: "Feature", properties: { id: cryptoRandomId(), color: buildingColor, height: buildingHeight, base: 0, rotation: 0, content: shape }, geometry: { type: "Polygon", coordinates: [coords] } };
              appendBuildingFeature(feat, true);
            } else {
              const t: TreeFeature = { type: "Feature", properties: { id: cryptoRandomId(), size: treeSize }, geometry: { type: "Point", coordinates: [c.lng, c.lat] } };
              appendTreeFeature(t);
            }
          }} className="px-3 py-1 rounded bg-white">Add at center</button>
        </div>

        <div className="space-y-1">
          <div className="text-xs font-medium">Shape</div>
          <div className="flex gap-2">
            <button onClick={() => setShape("rectangle")} className={`flex-1 px-2 py-1 rounded ${shape === "rectangle" ? "bg-sky-600 text-white" : "bg-white"}`}>Rectangle</button>
            <button onClick={() => setShape("circle")} className={`flex-1 px-2 py-1 rounded ${shape === "circle" ? "bg-sky-600 text-white" : "bg-white"}`}>Circle</button>
            <button onClick={() => setShape("custom")} className={`flex-1 px-2 py-1 rounded ${shape === "custom" ? "bg-sky-600 text-white" : "bg-white"}`}>Custom</button>
          </div>
          <div className="mt-2">
            <div className="text-xs font-medium">Building color</div>
            <input type="color" value={buildingColor} onChange={(e) => setBuildingColor(e.target.value)} className="w-full h-8 p-0 border rounded" />
          </div>
          {shape === "rectangle" && (
            <div className="flex gap-2 text-xs mt-2">
              <label className="flex-1"> Width (m)
                <input type="number" min={1} value={buildingWidth} onChange={(e) => setBuildingWidth(Number(e.target.value))} className="w-full mt-1 border rounded px-2 py-1" />
              </label>
              <label className="flex-1"> Depth (m)
                <input type="number" min={1} value={buildingDepth} onChange={(e) => setBuildingDepth(Number(e.target.value))} className="w-full mt-1 border rounded px-2 py-1" />
              </label>
            </div>
          )}
          {shape === "circle" && (
            <div className="mt-2 text-xs">
              <label>Radius (m)
                <input type="number" min={1} value={circleRadius} onChange={(e) => setCircleRadius(Number(e.target.value))} className="w-full mt-1 border rounded px-2 py-1" />
              </label>
            </div>
          )}
          <div className="text-xs mt-2">
            <label>Height (m)
              <input type="number" min={1} value={buildingHeight} onChange={(e) => setBuildingHeight(Number(e.target.value))} className="w-full mt-1 border rounded px-2 py-1" />
            </label>
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-xs font-medium">Tree size (m)</div>
          <input type="range" min={1} max={20} value={treeSize} onChange={(e) => setTreeSize(Number(e.target.value))} className="w-full" />
          <div className="text-xs">{treeSize} m</div>
        </div>

        <div className="flex gap-2">
          <button onClick={() => exportGeoJSON(USER_BUILDINGS_KEY, "buildings.geojson")} className="flex-1 px-2 py-1 border rounded text-xs">Export Bldgs</button>
          <label className="flex-1 px-2 py-1 border rounded text-xs text-center cursor-pointer">Import
            <input type="file" accept=".json,.geojson" className="hidden" onChange={(e) => importGeoJSON(e.target.files?.[0] ?? null, USER_BUILDINGS_KEY, "user-buildings", setBuildingsCount)} />
          </label>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportGeoJSON(USER_TREES_KEY, "trees.geojson")} className="flex-1 px-2 py-1 border rounded text-xs">Export Trees</button>
          <label className="flex-1 px-2 py-1 border rounded text-xs text-center cursor-pointer">Import
            <input type="file" accept=".json,.geojson" className="hidden" onChange={(e) => importGeoJSON(e.target.files?.[0] ?? null, USER_TREES_KEY, "user-trees", setTreesCount)} />
          </label>
        </div>

        <div className="flex gap-2">
          <button onClick={() => {
            if (!map.current) return;
            const src = map.current.getSource("user-buildings") as maplibregl.GeoJSONSource | undefined;
            if (!src) return;
            const empty = { type: "FeatureCollection", features: [] };
            try { src.setData(empty as any); saveToStorage(USER_BUILDINGS_KEY, empty); setBuildingsCount(0); threeManagerRef.current?.meshes.forEach((m, id) => threeManagerRef.current?.removeById(id)); } catch { setError("Failed clearing buildings"); }
          }} className="flex-1 px-2 py-1 bg-white border rounded text-xs">Clear Buildings</button>

          <button onClick={() => {
            if (!map.current) return;
            const src = map.current.getSource("user-trees") as maplibregl.GeoJSONSource | undefined;
            if (!src) return;
            const empty = { type: "FeatureCollection", features: [] };
            try { src.setData(empty as any); saveToStorage(USER_TREES_KEY, empty); setTreesCount(0); } catch { setError("Failed clearing trees"); }
          }} className="flex-1 px-2 py-1 bg-white border rounded text-xs">Clear Trees</button>
        </div>

        <div className="text-xs text-gray-600">Buildings: <strong>{buildingsCount}</strong> · Trees: <strong>{treesCount}</strong></div>

        <div className="pt-2 border-t">
          <div className="flex items-center justify-between">
            <strong className="text-sm">Selected</strong>
            <div className="text-xs">{selectedId ? selectedId : "none"}</div>
          </div>
          <div className="mt-2 space-y-2">
            <div className="flex gap-2">
              <button onClick={() => setDragging((d) => !d)} className={`flex-1 px-2 py-1 rounded ${dragging ? "bg-orange-500 text-white" : "bg-white"}`}>{dragging ? "Stop Drag" : "Start Drag"}</button>
              <button onClick={() => rotateSelectedBuilding(15)} className="px-2 py-1 bg-white rounded">Rotate +15°</button>
              <button onClick={() => rotateSelectedBuilding(-15)} className="px-2 py-1 bg-white rounded">Rotate −15°</button>
            </div>

            <div className="flex gap-2">
              <button onClick={deleteSelected} className="flex-1 px-2 py-1 bg-rose-500 text-white rounded text-xs" disabled={!selectedId}>Delete Selected</button>
            </div>

            {selectedProps && (
              <div className="space-y-1">
                <label className="text-xs">Color</label>
                <input type="color" value={selectedProps.color ?? "#c44e3b"} onChange={(e) => updateSelectedBuildingProps({ color: e.target.value })} className="w-full h-8 p-0 border rounded" />
                <label className="text-xs">Height (m)</label>
                <input type="number" min={1} value={Math.round((selectedProps.height ?? 10) * 100) / 100} onChange={(e) => updateSelectedBuildingProps({ height: Number(e.target.value) })} className="w-full border rounded px-2 py-1" />
                <label className="text-xs">Content / Notes</label>
                <textarea defaultValue={selectedProps.content ?? ""} onBlur={(ev) => updateSelectedBuildingProps({ content: ev.target.value })} className="w-full border rounded px-2 py-1" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* error toast */}
      <div className="absolute bottom-6 left-6 z-50">
        {error && (
          <div className="bg-red-600 text-white px-4 py-2 rounded shadow flex items-center gap-3">
            <div className="text-sm">{error}</div>
            <button className="ml-3 underline" onClick={() => setError(null)}>dismiss</button>
          </div>
        )}
      </div>

      {/* small help */}
      <div className="absolute top-4 right-4 z-50 bg-white/95 p-2 rounded shadow text-sm">
        <div><strong>Tips</strong></div>
        <div className="text-xs">Use Draw (top-left) to draw footprints. After drawing you will be prompted for height & color. Click-to-place works too.</div>
      </div>
    </div>
  );
};

export default Map3D;
