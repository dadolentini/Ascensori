import type { Point3 } from './pose';

export type ArchitectureMaterial =
  | 'stone' | 'floor' | 'ceiling' | 'dark' | 'wood' | 'steel' | 'rail'
  | 'glass' | 'facade' | 'light' | 'leaf';
export interface ArchitecturalBox {
  role: string;
  zone: 'tower' | 'lobby';
  position: Point3;
  scale: Point3;
  material: ArchitectureMaterial;
  color?: string;
}
export interface ReferenceArchitectureLayout {
  boxes: ArchitecturalBox[];
  columns: Point3[];
  pendants: { position: Point3; yaw: number; scale: number }[];
}
export const REFERENCE_TOWER_BOUNDS = {
  min: [-11.4, 5, -15.7] as Point3,
  max: [9.3, 54.4, -0.4] as Point3,
};
export function buildReferenceArchitecture(): ReferenceArchitectureLayout {
  const boxes: ArchitecturalBox[] = [];
  const add = (
    role: string, zone: ArchitecturalBox['zone'], material: ArchitectureMaterial,
    position: Point3, scale: Point3, color?: string,
  ) => boxes.push({ role, zone, material, position, scale, ...(color ? { color } : {}) });

  // Relative form follows IMG_3928/3932/3938, not surveyed building dimensions.
  add('tower-core', 'tower', 'dark', [0, 28.4, -8.8], [18, 46.8, 13.2]);
  const bays = [{ x: -6, front: -1.1 }, { x: 0, front: -1.8 }, { x: 6, front: -0.7 }];
  for (let floor = 0; floor < 15; floor++) {
    const y = 7.4 + floor * 3.05;
    for (const [bayIndex, bay] of bays.entries()) {
      add('facade-spandrel', 'tower', 'rail', [bay.x, y - 1.43, bay.front + 0.13], [6, 0.25, 0.43]);
      for (const column of [-1.42, 1.42]) {
        const lit = (floor * 5 + bayIndex * 3 + (column > 0 ? 1 : 0)) % 7 < 2;
        add('facade-window', 'tower', 'facade', [bay.x + column, y, bay.front], [2.67, 2.67, 0.08],
          lit ? '#e0c4a0' : (floor + bayIndex) % 3 === 0 ? '#61788a' : '#36566e');
        add('facade-mullion', 'tower', 'rail', [bay.x + column + 1.36, y, bay.front + 0.06], [0.075, 2.83, 0.16]);
        if (lit) {
          add('window-curtain', 'tower', 'ceiling', [bay.x + column - 0.99, y, bay.front + 0.05], [0.27, 2.58, 0.035]);
          add('window-curtain', 'tower', 'ceiling', [bay.x + column + 0.99, y, bay.front + 0.05], [0.27, 2.58, 0.035]);
        }
      }
    }
    // Balconies project to the left, as in the low three-quarter reference.
    add('balcony-slab', 'tower', 'stone', [-10.1, y - 1.28, -3.2], [2.6, 0.21, 4.5]);
    add('balcony-rail', 'tower', 'rail', [-11.32, y - 0.65, -3.2], [0.07, 1.06, 4.45]);
    add('balcony-glass', 'tower', 'glass', [-11.28, y - 0.65, -3.2], [0.025, 0.94, 4.2]);
    for (const z of [-5.35, -1.05]) {
      add('balcony-rail', 'tower', 'rail', [-10.1, y - 0.65, z], [2.45, 0.065, 0.055]);
      add('balcony-glass', 'tower', 'glass', [-10.1, y - 0.99, z], [2.4, 0.62, 0.025]);
    }
    for (let side = 0; side < 4; side++)
      add('facade-window', 'tower', 'facade', [-9.02, y, -7 - side * 2.25], [0.06, 2.67, 2.07],
        (floor + side) % 6 === 0 ? '#e0c4a0' : '#496779');
  }
  for (const [x, z] of [[-8.95, -0.84], [-3.05, -0.94], [3.05, -0.52], [8.95, -0.45]]) {
    add('facade-pier', 'tower', 'rail', [x, 28.6, z], [0.18, 47.1, 0.29]);
  }
  for (const [x, z] of [[-8.81, -0.65], [3.18, -0.42]])
    add('vertical-facade-light', 'tower', 'light', [x, 28.5, z], [0.045, 46.4, 0.055]);
  add('crown-volume', 'tower', 'dark', [0.35, 51.1, -8], [15.5, 3, 11.7]);
  for (let fin = 0; fin < 23; fin++) {
    const height = 2.1 + (fin % 5) * 0.2;
    add('crown-fin', 'tower', 'rail', [-7.2 + fin * 0.67, 52.85, -2.05], [0.14, height, 0.4]);
  }
  add('terrace-planter', 'tower', 'dark', [-5.2, 51.1, -0.9], [2.2, 0.48, 0.75]);
  add('terrace-greenery', 'tower', 'leaf', [-5.2, 51.48, -0.9], [1.9, 0.46, 0.65]);

  // The central line remains open. Side furnishings are grounded in the lobby frame.
  add('lobby-floor', 'lobby', 'floor', [0, -0.095, -7.7], [11.3, 0.18, 18]);
  add('lobby-ceiling', 'lobby', 'ceiling', [0, 4.25, -7.7], [11.3, 0.2, 18]);
  add('lobby-left-wall', 'lobby', 'wood', [-5.6, 2.1, -7.7], [0.18, 4.2, 18]);
  add('lobby-right-wall', 'lobby', 'wood', [5.6, 2.1, -7.7], [0.18, 4.2, 18]);
  for (const x of [-3.15, 3.15])
    add('lobby-rear-wall', 'lobby', 'stone', [x, 2.1, -16.78], [4.4, 4.2, 0.22]);
  add('portal-overhead-wall', 'lobby', 'steel', [0, 3.65, -16.78], [1.9, 1.1, 0.22]);
  add('reception-desk', 'lobby', 'stone', [-3.8, 0.55, -14.1], [2.8, 1.1, 1]);
  add('reception-top', 'lobby', 'ceiling', [-3.8, 1.14, -14.1], [2.9, 0.08, 1.07]);
  add('reception-background', 'lobby', 'stone', [-3.1, 2.1, -16.62], [3.8, 4.15, 0.08]);
  for (const x of [-5.1, -1.05])
    add('reception-back-light', 'lobby', 'light', [x, 2.02, -16.55], [0.045, 3.5, 0.04]);
  for (const z of [-4.5, -9]) {
    for (const x of [-5.08, 5.08]) {
      add('lobby-side-seat', 'lobby', 'ceiling', [x, 0.43, z], [0.74, 0.36, 1.48]);
      add('lobby-seat-back', 'lobby', 'ceiling', [x + Math.sign(x) * 0.27, 0.83, z], [0.2, 0.61, 1.48]);
      add('lobby-seat-base', 'lobby', 'dark', [x, 0.2, z], [0.62, 0.12, 1.28]);
    }
  }
  for (let seam = 0; seam < 8; seam++)
    add('floor-seam', 'lobby', 'stone', [0, 0.002, -seam * 2.3], [11, 0.006, 0.012]);
  for (const x of [-3, 0, 3])
    add('floor-seam', 'lobby', 'stone', [x, 0.002, -7.7], [0.012, 0.006, 17.8]);
  for (const x of [-5.4, 5.4])
    add('lobby-cove-light', 'lobby', 'light', [x, 4.04, -8], [0.08, 0.045, 16]);
  return {
    boxes,
    columns: [[-3.4, 2.05, -5.5], [3.4, 2.05, -5.5], [-3.4, 2.05, -11.5], [3.4, 2.05, -11.5]],
    pendants: [-3.4, -6.6, -9.8, -13.6].map((z, index) => ({
      position: [index % 2 ? -0.38 : 0.38, 3.53 + (index % 2) * 0.14, z] as Point3,
      yaw: index * 0.85, scale: index === 3 ? 0.76 : 1,
    })),
  };
}
