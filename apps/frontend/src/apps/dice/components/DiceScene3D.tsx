import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

import { RollingDie } from './RollingDie';

export interface DiceScene3DProps {
  diceCount: number;
  diceValues: number[];
  rollId: number;
  reducedMotion?: boolean;
  onRollComplete?: (rollId: number) => void;
}

function CameraRig({
  rolling,
  reducedMotion,
  distance,
  height,
}: {
  rolling: boolean;
  reducedMotion: boolean;
  distance: number;
  height: number;
}) {
  const { camera } = useThree();
  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const wobble = reducedMotion ? 0.0 : (rolling ? 0.14 : 0.06);
    const target = new THREE.Vector3(
      Math.sin(t * 0.22) * wobble,
      height + Math.sin(t * 0.18) * wobble * 0.45,
      distance + (rolling && !reducedMotion ? -0.22 : 0)
    );

    camera.position.lerp(target, 1 - Math.exp(-delta * 3.5));
    camera.lookAt(0, 0, 0);
  });
  return null;
}

function Lights({ rolling }: { rolling: boolean }) {
  const keyRef = React.useRef<THREE.DirectionalLight>(null);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (keyRef.current) {
      keyRef.current.position.x = 4 + Math.sin(t * 0.4) * 0.8;
      keyRef.current.position.z = 4 + Math.cos(t * 0.4) * 0.8;
      keyRef.current.intensity = rolling ? 1.55 : 1.35;
    }
  });

  return (
    <>
      <ambientLight intensity={0.65} />
      <hemisphereLight intensity={0.35} color="#ffffff" groundColor="#E8F0F2" />
      <directionalLight
        ref={keyRef}
        position={[4, 6, 4]}
        intensity={1.35}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[-4, 3.5, 5.5]} intensity={0.7} color="#E8F0F2" />
      <pointLight position={[3.5, 2.2, 2.0]} intensity={0.4} color="#FDFBF7" />
    </>
  );
}

function computeLayout(count: number) {
  const safeCount = Math.max(1, Math.min(12, Math.floor(count)));

  // More columns once we hit multiple rows to avoid crowding and overlap.
  const cols =
    safeCount <= 3 ? safeCount :
    safeCount <= 6 ? 3 :
    4;

  const rows = Math.ceil(safeCount / cols);

  const dieScale =
    safeCount <= 3 ? 1.02 :
    safeCount <= 6 ? 0.92 :
    safeCount <= 9 ? 0.82 :
    0.74;

  const spacingX = 2.65;
  const spacingY = 2.35;

  const positions: [number, number, number][] = [];
  for (let i = 0; i < safeCount; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = (col - (cols - 1) / 2) * spacingX;
    const y = ((rows - 1) / 2 - row) * spacingY;
    positions.push([x, y, 0]);
  }

  return { safeCount, cols, rows, dieScale, spacingX, spacingY, positions };
}

function RollDirector({
  rollId,
  reducedMotion,
  phase,
  setPhase,
  visibleDiceCount,
  settledSetRef,
  spinStartRef,
  settleStartRef,
  completedRollIdRef,
  onRollComplete,
}: {
  rollId: number;
  reducedMotion: boolean;
  phase: 'idle' | 'spinning' | 'settling';
  setPhase: React.Dispatch<React.SetStateAction<'idle' | 'spinning' | 'settling'>>;
  visibleDiceCount: number;
  settledSetRef: React.MutableRefObject<Set<number>>;
  spinStartRef: React.MutableRefObject<number | null>;
  settleStartRef: React.MutableRefObject<number | null>;
  completedRollIdRef: React.MutableRefObject<number | null>;
  onRollComplete?: (rollId: number) => void;
}) {
  useFrame((state) => {
    if (rollId <= 0) return;

    if (phase === 'spinning') {
      if (spinStartRef.current === null) spinStartRef.current = state.clock.elapsedTime;
      const spinDuration = reducedMotion ? 0.18 : 0.75;
      if (state.clock.elapsedTime - spinStartRef.current > spinDuration) {
        settleStartRef.current = state.clock.elapsedTime;
        setPhase('settling');
      }
      return;
    }

    if (phase === 'settling') {
      if (settleStartRef.current === null) settleStartRef.current = state.clock.elapsedTime;
      const maxSettle = reducedMotion ? 0.55 : 1.6;
      const settledAll = settledSetRef.current.size >= visibleDiceCount;
      const timedOut = state.clock.elapsedTime - settleStartRef.current > maxSettle;

      if ((settledAll || timedOut) && completedRollIdRef.current !== rollId) {
        completedRollIdRef.current = rollId;
        setPhase('idle');
        onRollComplete?.(rollId);
      }
    }
  });

  return null;
}

export const DiceScene3D: React.FC<DiceScene3DProps> = ({
  diceCount,
  diceValues,
  rollId,
  reducedMotion = false,
  onRollComplete,
}) => {
  const layout = useMemo(() => computeLayout(diceCount), [diceCount]);
  const positions = layout.positions;
  const visibleDiceCount = layout.safeCount;
  const [phase, setPhase] = useState<'idle' | 'spinning' | 'settling'>('idle');
  const settledSetRef = useRef<Set<number>>(new Set());
  const spinStartRef = useRef<number | null>(null);
  const settleStartRef = useRef<number | null>(null);
  const completedRollIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (rollId <= 0) return;
    settledSetRef.current = new Set();
    spinStartRef.current = null;
    settleStartRef.current = null;
    completedRollIdRef.current = null;
    setPhase('spinning');
  }, [rollId]);

  const cameraDistance = useMemo(() => {
    const { cols, rows } = layout;
    return 6.0 + (rows - 1) * 1.6 + (cols - 1) * 0.95;
  }, [layout]);

  const cameraHeight = useMemo(() => {
    const { rows } = layout;
    return 1.15 + (rows - 1) * 0.15;
  }, [layout]);

  const cameraDir = useMemo(() => {
    const v = new THREE.Vector3(0, cameraHeight, cameraDistance).normalize();
    return [v.x, v.y, v.z] as [number, number, number];
  }, [cameraHeight, cameraDistance]);

  const rolling = phase !== 'idle';
  const spinning = phase === 'spinning';

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      camera={{ position: [0, cameraHeight, cameraDistance], fov: 42 }}
      style={{ width: '100%', height: '100%', background: 'transparent' }}
    >
      <fog attach="fog" args={['#FDFBF7', 8, 16]} />
      <CameraRig rolling={rolling} reducedMotion={reducedMotion} distance={cameraDistance} height={cameraHeight} />
      <Lights rolling={rolling} />
      <RollDirector
        rollId={rollId}
        reducedMotion={reducedMotion}
        phase={phase}
        setPhase={setPhase}
        visibleDiceCount={visibleDiceCount}
        settledSetRef={settledSetRef}
        spinStartRef={spinStartRef}
        settleStartRef={settleStartRef}
        completedRollIdRef={completedRollIdRef}
        onRollComplete={onRollComplete}
      />

      {positions.map((pos, i) => (
        <RollingDie
          key={`die-${i}`}
          index={i}
          position={pos}
          value={diceValues[i] ?? null}
          rolling={spinning}
          rollId={rollId}
          reducedMotion={reducedMotion}
          baseScale={layout.dieScale}
          cameraDir={cameraDir}
          onSettled={(dieIndex) => {
            settledSetRef.current.add(dieIndex);
          }}
        />
      ))}

      <ContactShadows position={[0, -1.6, 0]} opacity={0.35} scale={14} blur={2.2} far={10} />
    </Canvas>
  );
};


