import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, useGLTF } from "@react-three/drei";

function BuildingModel() {
  const { scene } = useGLTF("/models/Building.glb"); // this should be accessible via browser
  return <primitive object={scene} scale={1.5} position={[0, -1, 0]} />;
}

export default function BuildingScene() {
  return (
    <div className="w-full h-screen">
      <Canvas camera={{ position: [5, 3, 5], fov: 50 }}>
        <ambientLight intensity={1} />
        <directionalLight position={[5, 10, 5]} intensity={1.5} />
        <Suspense fallback={null}>
          <BuildingModel />
          <Environment preset="city" />
        </Suspense>
        <OrbitControls enableZoom={true} autoRotate autoRotateSpeed={1} />
      </Canvas>
    </div>
  );
}
