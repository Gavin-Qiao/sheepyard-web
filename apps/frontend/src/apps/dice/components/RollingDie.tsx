import React, { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Edges } from '@react-three/drei';
import * as THREE from 'three';

import { getNumberedD20 } from '../three/numberedD20';

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export interface RollingDieProps {
  index: number;
  position: [number, number, number];
  value: number | null;
  rolling: boolean;
  rollId: number;
  reducedMotion?: boolean;
  onSettled?: (dieIndex: number, rollId: number) => void;
  baseScale?: number;
  cameraDir?: [number, number, number];
}

export const RollingDie: React.FC<RollingDieProps> = ({
  index,
  position,
  value,
  rolling,
  rollId,
  reducedMotion = false,
  onSettled,
  baseScale = 1.02,
  cameraDir,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const axisRef = useRef(new THREE.Vector3(0.2, 0.8, 0.5).normalize());
  const spinSpeedRef = useRef(10);
  const targetQuatRef = useRef(new THREE.Quaternion());
  const baseY = position[1];
  const settledFramesRef = useRef(0);
  const reportedRollIdRef = useRef<number | null>(null);

  const d20 = getNumberedD20();

  useEffect(() => {
    const rand = mulberry32((rollId * 15485863) ^ (index * 32452843));
    axisRef.current.set(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1).normalize();
    spinSpeedRef.current = (reducedMotion ? 4 : 10) + rand() * (reducedMotion ? 1.5 : 6.5);
    settledFramesRef.current = 0;
    reportedRollIdRef.current = null;
  }, [rollId, index, reducedMotion]);

  useEffect(() => {
    if (value === null) {
      const rand = mulberry32(0xA53A9E37 ^ (index * 2654435761));
      const euler = new THREE.Euler(rand() * Math.PI * 2, rand() * Math.PI * 2, rand() * Math.PI * 2, 'XYZ');
      targetQuatRef.current.setFromEuler(euler);
      return;
    }
    const faceIndex = Math.max(0, Math.min(19, value - 1));
    const faceNormal = d20.faceNormals[faceIndex];
    const faceTextUp = d20.faceTextUps[faceIndex];

    // Align the rolled face to the camera direction so the visible face matches the UI result.
    const cam = cameraDir
      ? new THREE.Vector3(cameraDir[0], cameraDir[1], cameraDir[2]).normalize()
      : new THREE.Vector3(0, 0.19, 0.98).normalize();

    // 1) Rotate desired face normal -> camera direction (rolled face is the "front" face).
    const q1 = new THREE.Quaternion().setFromUnitVectors(faceNormal, cam);

    // 2) Rotate within the face plane so the numeral is upright (screen up is world up).
    const textUpWorld = faceTextUp.clone().applyQuaternion(q1);
    textUpWorld.addScaledVector(cam, -textUpWorld.dot(cam));
    if (textUpWorld.lengthSq() < 1e-8) textUpWorld.set(0, 1, 0);
    textUpWorld.normalize();

    const desiredUp = new THREE.Vector3(0, 1, 0);
    desiredUp.addScaledVector(cam, -desiredUp.dot(cam));
    if (desiredUp.lengthSq() < 1e-8) desiredUp.set(0, 1, 0);
    desiredUp.normalize();

    const q2 = new THREE.Quaternion().setFromUnitVectors(textUpWorld, desiredUp);
    targetQuatRef.current.copy(q2.multiply(q1));
  }, [value, index, cameraDir]);

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const t = state.clock.elapsedTime;

    // Subtle hovering to keep it alive.
    const hoverAmp = reducedMotion ? 0.01 : 0.03;
    mesh.position.y = baseY + Math.sin(t * 1.2 + index * 0.6) * hoverAmp;

    const targetScale = rolling && !reducedMotion ? 1.05 : 1.0;
    const scaleTarget = baseScale * targetScale;
    const scale = mesh.scale.x + (scaleTarget - mesh.scale.x) * (1 - Math.exp(-delta * 10));
    mesh.scale.setScalar(scale);

    if (rolling) {
      const speed = spinSpeedRef.current;
      mesh.rotateOnAxis(axisRef.current, delta * speed);
      mesh.rotation.x += delta * 0.9;
      mesh.rotation.y += delta * 0.6;
      mesh.rotation.z += delta * 0.3;
      return;
    }

    // Settle to the target orientation.
    const slerpAlpha = 1 - Math.exp(-delta * (reducedMotion ? 14 : 7));
    mesh.quaternion.slerp(targetQuatRef.current, slerpAlpha);

    // Report settle completion once per rollId.
    if (onSettled && value !== null && reportedRollIdRef.current !== rollId) {
      const angle = mesh.quaternion.angleTo(targetQuatRef.current);
      const threshold = reducedMotion ? 0.09 : 0.07; // radians
      if (angle < threshold) {
        settledFramesRef.current += 1;
      } else {
        settledFramesRef.current = 0;
      }
      const needed = reducedMotion ? 2 : 5;
      if (settledFramesRef.current >= needed) {
        reportedRollIdRef.current = rollId;
        onSettled(index, rollId);
      }
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={position}
      geometry={d20.geometry}
      material={d20.materials}
      castShadow
      receiveShadow
    >
      <Edges scale={1.01} color="#D6B15E" />
    </mesh>
  );
};


