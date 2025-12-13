import * as THREE from 'three';

export interface NumberedD20Resources {
  geometry: THREE.BufferGeometry;
  materials: THREE.MeshPhysicalMaterial[];
  faceNormals: THREE.Vector3[];
  faceTextUps: THREE.Vector3[];
}

let cached: NumberedD20Resources | null = null;

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function drawBg3InspiredFace(ctx: CanvasRenderingContext2D, size: number, faceNumber: number, seed: number) {
  const rand = mulberry32(seed);

  const pad = Math.round(size * 0.11);
  const top = { x: size / 2, y: pad };
  const left = { x: pad, y: size - pad };
  const right = { x: size - pad, y: size - pad };
  const center = { x: (top.x + left.x + right.x) / 3, y: (top.y + left.y + right.y) / 3 };

  // Triangle clip
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(top.x, top.y);
  ctx.lineTo(right.x, right.y);
  ctx.lineTo(left.x, left.y);
  ctx.closePath();
  ctx.clip();

  // Obsidian/jade base gradient (BG3-inspired, original)
  const base = ctx.createRadialGradient(center.x, center.y, size * 0.05, center.x, center.y, size * 0.75);
  base.addColorStop(0, '#1D2A28');
  base.addColorStop(0.45, '#0E1416');
  base.addColorStop(1, '#050708');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  // Subtle noise speckle
  ctx.globalAlpha = 0.08;
  for (let i = 0; i < 2600; i++) {
    const x = Math.floor(rand() * size);
    const y = Math.floor(rand() * size);
    const v = 150 + Math.floor(rand() * 70);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(x, y, 1, 1);
  }
  ctx.globalAlpha = 1;

  // Thin rune-like lines near edges
  ctx.strokeStyle = 'rgba(214, 177, 94, 0.22)';
  ctx.lineWidth = Math.max(1, Math.round(size * 0.004));
  for (let i = 0; i < 9; i++) {
    const t = 0.14 + i * 0.08 + rand() * 0.015;
    ctx.beginPath();
    ctx.moveTo(top.x + (left.x - top.x) * t, top.y + (left.y - top.y) * t);
    ctx.lineTo(top.x + (right.x - top.x) * t, top.y + (right.y - top.y) * t);
    ctx.stroke();
  }

  ctx.restore();

  // Outer gilded border
  const gold = ctx.createLinearGradient(left.x, left.y, right.x, top.y);
  gold.addColorStop(0, '#7D5B1D');
  gold.addColorStop(0.35, '#E9D18A');
  gold.addColorStop(0.7, '#D6B15E');
  gold.addColorStop(1, '#7D5B1D');

  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(top.x, top.y);
  ctx.lineTo(right.x, right.y);
  ctx.lineTo(left.x, left.y);
  ctx.closePath();
  ctx.strokeStyle = gold;
  ctx.lineWidth = Math.round(size * 0.028);
  ctx.stroke();

  // Inner border
  ctx.strokeStyle = 'rgba(23, 31, 31, 0.85)';
  ctx.lineWidth = Math.round(size * 0.012);
  ctx.stroke();

  // Center number (gold inlay)
  const num = String(faceNumber);
  const fontSize = Math.round(size * 0.30);
  ctx.font = `800 ${fontSize}px "Noto Serif SC","Times New Roman",serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const textGrad = ctx.createLinearGradient(center.x - 80, center.y - 120, center.x + 80, center.y + 140);
  textGrad.addColorStop(0, '#F3E6B4');
  textGrad.addColorStop(0.45, '#E2C978');
  textGrad.addColorStop(1, '#A97A24');

  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = Math.round(size * 0.025);
  ctx.shadowOffsetY = Math.round(size * 0.01);

  ctx.lineWidth = Math.max(2, Math.round(size * 0.012));
  ctx.strokeStyle = 'rgba(43, 29, 6, 0.85)';
  ctx.strokeText(num, center.x, center.y + size * 0.04);

  ctx.fillStyle = textGrad;
  ctx.fillText(num, center.x, center.y + size * 0.04);

  // Subtle highlight cross
  ctx.shadowColor = 'transparent';
  ctx.globalAlpha = 0.12;
  ctx.strokeStyle = '#E8F0F2';
  ctx.lineWidth = Math.max(1, Math.round(size * 0.006));
  ctx.beginPath();
  ctx.moveTo(center.x, center.y - size * 0.22);
  ctx.lineTo(center.x, center.y + size * 0.16);
  ctx.moveTo(center.x - size * 0.18, center.y - size * 0.02);
  ctx.lineTo(center.x + size * 0.18, center.y - size * 0.02);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function createFaceTexture(faceNumber: number, seed: number): THREE.CanvasTexture {
  if (typeof document === 'undefined') {
    // Should not happen in the browser app, but protects build/test environments.
    const empty = new THREE.CanvasTexture(undefined as unknown as HTMLCanvasElement);
    return empty;
  }

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable.');

  drawBg3InspiredFace(ctx, size, faceNumber, seed);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

export function getNumberedD20(): NumberedD20Resources {
  if (cached) return cached;

  const base = new THREE.IcosahedronGeometry(1.0, 0);
  const geometry = base.toNonIndexed();
  base.dispose();

  const pos = geometry.getAttribute('position') as THREE.BufferAttribute;
  const faceCount = Math.floor(pos.count / 3);

  if (faceCount !== 20) {
    throw new Error(`Expected 20 faces for d20, got ${faceCount}.`);
  }

  // Create UVs and per-face groups for multi-material rendering.
  const uvs = new Float32Array(pos.count * 2);
  const uvAttr = new THREE.BufferAttribute(uvs, 2);
  geometry.setAttribute('uv', uvAttr);

  geometry.clearGroups();
  for (let face = 0; face < faceCount; face++) {
    geometry.addGroup(face * 3, 3, face);
  }

  const faceNormals: THREE.Vector3[] = [];
  const faceTextUps: THREE.Vector3[] = [];

  const tmp0 = new THREE.Vector3();
  const tmp1 = new THREE.Vector3();
  const tmp2 = new THREE.Vector3();
  const center = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const edge1 = new THREE.Vector3();
  const edge2 = new THREE.Vector3();

  const worldUp = new THREE.Vector3(0, 1, 0);
  const worldX = new THREE.Vector3(1, 0, 0);
  const tangent = new THREE.Vector3();
  const bitangent = new THREE.Vector3();

  for (let face = 0; face < faceCount; face++) {
    const i0 = face * 3;
    const i1 = i0 + 1;
    const i2 = i0 + 2;

    tmp0.fromBufferAttribute(pos, i0);
    tmp1.fromBufferAttribute(pos, i1);
    tmp2.fromBufferAttribute(pos, i2);

    center.copy(tmp0).add(tmp1).add(tmp2).multiplyScalar(1 / 3);

    edge1.subVectors(tmp1, tmp0);
    edge2.subVectors(tmp2, tmp0);
    normal.copy(edge1).cross(edge2).normalize();
    // Ensure outward normal (points away from center)
    if (normal.dot(center) < 0) normal.negate();

    // Build a stable basis in the face plane to avoid mirrored UVs.
    const axis = Math.abs(normal.y) < 0.9 ? worldUp : worldX;
    tangent.crossVectors(axis, normal).normalize();
    bitangent.crossVectors(normal, tangent).normalize();

    const verts = [tmp0.clone(), tmp1.clone(), tmp2.clone()];
    const coords = verts.map((v) => {
      const rel = v.sub(center);
      return { x: rel.dot(tangent), y: rel.dot(bitangent) };
    });

    let top = 0;
    for (let j = 1; j < 3; j++) {
      if (coords[j].y > coords[top].y) top = j;
    }
    const others = [0, 1, 2].filter((j) => j !== top);
    const left = coords[others[0]].x < coords[others[1]].x ? others[0] : others[1];
    const right = others[0] === left ? others[1] : others[0];

    // Assign UVs to the existing vertex slots.
    const setUv = (vi: number, u: number, v: number) => {
      uvs[vi * 2] = u;
      uvs[vi * 2 + 1] = v;
    };
    setUv(i0 + top, 0.5, 1.0);
    setUv(i0 + left, 0.0, 0.0);
    setUv(i0 + right, 1.0, 0.0);

    // Face-local "text up" direction: center → UV-top vertex, projected to the face plane.
    const topVertex = (top === 0 ? tmp0 : top === 1 ? tmp1 : tmp2);
    const textUp = new THREE.Vector3().subVectors(topVertex, center);
    textUp.addScaledVector(normal, -textUp.dot(normal)).normalize();

    faceNormals.push(normal.clone());
    faceTextUps.push(textUp);
  }

  uvAttr.needsUpdate = true;
  geometry.computeVertexNormals();

  const materials: THREE.MeshPhysicalMaterial[] = [];
  for (let face = 0; face < faceCount; face++) {
    const faceNumber = face + 1;
    const texture = createFaceTexture(faceNumber, 0xC0FFEE ^ (faceNumber * 9973));

    const mat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#FFFFFF'),
      map: texture,
      metalness: 0.35,
      roughness: 0.55,
      clearcoat: 0.35,
      clearcoatRoughness: 0.25,
    });
    materials.push(mat);
  }

  cached = { geometry, materials, faceNormals, faceTextUps };
  return cached;
}



