import {
  VILLAGE_BENCH_SPOTS,
  VILLAGE_FIREBOWL_SPOT,
  VillageAmbientNpc,
  VillageBird,
  VillageButterfly,
  VillageCat,
  VillageLifeState,
  VillageVehicle,
} from '../engine/villageLife';
import { Season, WeatherType } from '../types/game';

function px(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  scale = 3
) {
  ctx.fillStyle = color;
  ctx.fillRect(
    Math.floor(ox + x * scale),
    Math.floor(oy + y * scale),
    Math.ceil(w * scale),
    Math.ceil(h * scale)
  );
}

const LAUNDRY_LINES: ReadonlyArray<{ x1: number; x2: number; y: number; rowSeed: number }> = [
  { x1: 4.65, x2: 5.35, y: -14.1, rowSeed: 1 },
  { x1: 10.65, x2: 11.35, y: -14.1, rowSeed: 2 },
  { x1: 22.65, x2: 23.35, y: -4.1, rowSeed: 3 },
];

const LAUNDRY_COLORS = ['#fef2f2', '#bae6fd', '#fde68a', '#bbf7d0', '#fbcfe8'];

export function drawVillageEnvironmentProps(
  ctx: CanvasRenderingContext2D,
  tilePx: number,
  season: Season,
  weather: WeatherType,
  tick: number,
  nightFactor: number
) {
  const s = tilePx / 16;

  // 1. Two wooden benches at the Dorfplatz fountain
  for (const bench of VILLAGE_BENCH_SPOTS) {
    const bx = Math.floor(bench.x * tilePx);
    const by = Math.floor(bench.y * tilePx);
    px(ctx, bx, by, 1, 9, 14, 2, 'rgba(0,0,0,0.2)', s); // shadow
    px(ctx, bx, by, 2, 7, 2, 4, '#451a03', s); // left leg
    px(ctx, bx, by, 12, 7, 2, 4, '#451a03', s); // right leg
    px(ctx, bx, by, 1, 5, 14, 2, '#92400e', s); // backrest
    px(ctx, bx, by, 1, 7, 14, 2, '#b45309', s); // seat
    if (season === 'winter') {
      px(ctx, bx, by, 2, 5, 12, 1, '#f8fafc', s);
    }
  }

  // 2. Dorfplatz stone fire-bowl / brazier (flames flicker from dusk through night & winter)
  {
    const fx = Math.floor(VILLAGE_FIREBOWL_SPOT.wx * tilePx);
    const fy = Math.floor(VILLAGE_FIREBOWL_SPOT.wy * tilePx);
    px(ctx, fx, fy, 2, 11, 12, 3, 'rgba(0,0,0,0.22)', s);
    px(ctx, fx, fy, 3, 7, 10, 5, '#475569', s);
    px(ctx, fx, fy, 2, 6, 12, 2, '#64748b', s);
    px(ctx, fx, fy, 5, 6, 6, 2, '#451a03', s); // logs
    const lit = nightFactor > 0.18 || season === 'winter';
    if (lit) {
      const flick = Math.floor(tick / 6) % 3;
      px(ctx, fx, fy, 5, 3 - (flick % 2), 6, 4, '#ea580c', s);
      px(ctx, fx, fy, 6, 2 - (flick === 1 ? 1 : 0), 4, 4, '#facc15', s);
      px(ctx, fx, fy, 7, 3, 2, 2, '#fef9c3', s);
    }
  }

  // 3. Shopfront & craft props in front of signature village houses
  // Dorfbäckerei (vh_05: x=11.1, y=-15) bread barrel & sign
  {
    const px0 = Math.floor(11.1 * tilePx);
    const py0 = Math.floor(-15.0 * tilePx);
    px(ctx, px0, py0, 2, 23, 4, 5, '#78350f', s);
    px(ctx, px0, py0, 2, 22, 4, 1, '#fde68a', s); // fresh loaves in basket
  }
  // Gasthof Zum Tal (vh_15: x=11.1, y=-10) cozy tavern lantern sign + oak barrel
  {
    const gx0 = Math.floor(11.1 * tilePx);
    const gy0 = Math.floor(-10.0 * tilePx);
    px(ctx, gx0, gy0, 2, 22, 4, 6, '#92400e', s);
    px(ctx, gx0, gy0, 2, 24, 4, 1, '#451a03', s);
    px(ctx, gx0, gy0, 23, 21, 3, 3, nightFactor > 0.2 ? '#fde047' : '#f59e0b', s);
  }
  // Schmiedehaus (vh_17: x=17.6, y=-10) tiny anvil outside
  {
    const sx0 = Math.floor(17.6 * tilePx);
    const sy0 = Math.floor(-10.0 * tilePx);
    px(ctx, sx0, sy0, 23, 24, 5, 3, '#334155', s);
    px(ctx, sx0, sy0, 22, 23, 6, 2, '#64748b', s);
  }
  // Imker-Hütte (vh_19: x=23.1, y=-10) beehive box
  {
    const hx0 = Math.floor(23.1 * tilePx);
    const hy0 = Math.floor(-10.0 * tilePx);
    px(ctx, hx0, hy0, 24, 22, 4, 5, '#eab308', s);
    px(ctx, hx0, hy0, 24, 21, 4, 1, '#78350f', s);
  }

  // 4. Gently swaying clotheslines between cottages (dry daytime weather only)
  const showLaundry =
    nightFactor < 0.35 && weather !== 'rainy' && weather !== 'stormy' && season !== 'winter';
  if (showLaundry) {
    for (const line of LAUNDRY_LINES) {
      const lx1 = line.x1 * tilePx;
      const lx2 = line.x2 * tilePx;
      const ly = line.y * tilePx;
      const sway = Math.sin(tick * 0.08 + line.rowSeed * 1.4) * 1.5 * s;
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = Math.max(1, s * 0.6);
      ctx.beginPath();
      ctx.moveTo(lx1, ly);
      ctx.quadraticCurveTo((lx1 + lx2) * 0.5, ly + 3 * s, lx2, ly);
      ctx.stroke();

      for (let i = 0; i < 3; i++) {
        const cx = lx1 + (lx2 - lx1) * (0.22 + i * 0.28) + sway * 0.5;
        const cy = ly + 1.5 * s;
        const col = LAUNDRY_COLORS[(line.rowSeed + i) % LAUNDRY_COLORS.length];
        px(ctx, cx, cy, -1, 0, 2.5, 3.2, col, s);
      }
    }
  }
}

export function drawVillageVehicle(
  ctx: CanvasRenderingContext2D,
  tilePx: number,
  veh: VillageVehicle,
  tick: number,
  nightFactor: number
) {
  const s = Math.max(2, Math.floor(tilePx / 16));
  const ox = Math.floor(veh.x * tilePx);
  const oy = Math.floor(veh.y * tilePx);
  const wheelSpin = veh.pauseMs > 0 ? 0 : Math.floor(tick / 5) % 2;

  // Ground shadow
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(ox + 1 * s, oy + 13 * s, 16 * s, 2 * s);

  if (veh.kind === 'bicycle') {
    const face = veh.dir;
    // Two wheels
    px(ctx, ox, oy, 2, 10, 4, 4, '#1e293b', s);
    px(ctx, ox, oy, 3, 11, 2, 2, wheelSpin ? '#cbd5e1' : '#94a3b8', s);
    px(ctx, ox, oy, 11, 10, 4, 4, '#1e293b', s);
    px(ctx, ox, oy, 12, 11, 2, 2, wheelSpin ? '#94a3b8' : '#cbd5e1', s);
    // Frame
    px(ctx, ox, oy, 4, 9, 9, 1, '#dc2626', s);
    px(ctx, ox, oy, face > 0 ? 11 : 4, 7, 1, 4, '#475569', s);
    // Rider
    px(ctx, ox, oy, 6, 5, 5, 4, veh.riderColor, s);
    px(ctx, ox, oy, 7, 1, 4, 4, '#f5d0b5', s);
    px(ctx, ox, oy, 7, 0, 4, 2, '#facc15', s); // straw/bike cap
    if (nightFactor > 0.25) {
      px(ctx, ox, oy, face > 0 ? 13 : 2, 8, 2, 2, '#fef08a', s);
    }
  } else {
    // Wooden farm cart loaded with crates/apples
    px(ctx, ox, oy, 2, 6, 13, 6, '#92400e', s);
    px(ctx, ox, oy, 3, 4, 4, 3, '#f59e0b', s); // pumpkin crate
    px(ctx, ox, oy, 8, 4, 4, 3, '#22c55e', s); // cabbage crate
    px(ctx, ox, oy, 4, 10, 4, 4, '#451a03', s);
    px(ctx, ox, oy, 5, 11, 2, 2, wheelSpin ? '#d97706' : '#f59e0b', s);
    px(ctx, ox, oy, 11, 10, 4, 4, '#451a03', s);
    px(ctx, ox, oy, 12, 11, 2, 2, wheelSpin ? '#f59e0b' : '#d97706', s);
    // Farmer pushing/pulling cart
    const driverX = veh.dir > 0 ? -3 : 15;
    px(ctx, ox, oy, driverX, 5, 4, 6, veh.riderColor, s);
    px(ctx, ox, oy, driverX, 1, 4, 4, '#f5d0b5', s);
    px(ctx, ox, oy, driverX, 0, 4, 1, '#78350f', s);
  }
}

export function drawVillageCat(
  ctx: CanvasRenderingContext2D,
  tilePx: number,
  cat: VillageCat,
  tick: number
) {
  const s = Math.max(2, Math.floor(tilePx / 16));
  const ox = Math.floor(cat.x * tilePx);
  const oy = Math.floor(cat.y * tilePx);
  const walking = cat.pauseMs <= 0;
  const step = walking ? Math.sin(tick * 0.4 + cat.x) * 0.8 : 0;
  const tailWag = Math.floor(tick / 14) % 2;

  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(ox + 4 * s, oy + 13 * s, 7 * s, 2 * s);

  const headX = cat.facing === 'right' ? 9 : 4;
  const tailX = cat.facing === 'right' ? 3 : 11;
  px(ctx, ox, oy, 5, 9, 6, 4, cat.furColor, s); // body
  px(ctx, ox, oy, 6, 10, 3, 2, cat.accentColor, s);
  px(ctx, ox, oy, 5, 12 + Math.max(0, step), 1, 2, cat.furColor, s);
  px(ctx, ox, oy, 9, 12 + Math.max(0, -step), 1, 2, cat.furColor, s);
  px(ctx, ox, oy, headX, 7, 3, 3, cat.furColor, s); // head
  px(ctx, ox, oy, headX, 6, 1, 1, cat.furColor, s); // ear
  px(ctx, ox, oy, headX + 2, 6, 1, 1, cat.furColor, s); // ear
  px(ctx, ox, oy, tailX, 8 - tailWag, 2, 2, cat.furColor, s); // tail
}

export function drawVillageBird(
  ctx: CanvasRenderingContext2D,
  tilePx: number,
  bird: VillageBird,
  tick: number,
  nowMs: number
) {
  const s = Math.max(2, Math.floor(tilePx / 16));
  const flying = nowMs < bird.flyingUntilMs;
  const hop = flying ? Math.sin(tick * 0.6) * 2 : Math.abs(Math.sin(bird.hopPhase)) * 1.3;
  const ox = Math.floor(bird.x * tilePx);
  const oy = Math.floor(bird.y * tilePx - hop * s);

  px(ctx, ox, oy, 6, 9, 3, 2, bird.color, s);
  px(ctx, ox, oy, 8, 8, 2, 2, bird.color, s);
  px(ctx, ox, oy, 10, 9, 1, 1, '#facc15', s); // beak
  if (flying && Math.floor(tick / 4) % 2 === 0) {
    px(ctx, ox, oy, 6, 7, 2, 2, '#f8fafc', s); // flapping wing
  }
}

export function drawVillageButterfly(
  ctx: CanvasRenderingContext2D,
  tilePx: number,
  bf: VillageButterfly,
  tick: number
) {
  const s = Math.max(2, Math.floor(tilePx / 16));
  const ox = Math.floor(bf.x * tilePx);
  const oy = Math.floor(bf.y * tilePx);
  const open = Math.floor(tick / 6 + bf.phase * 3) % 2 === 0;
  if (open) {
    px(ctx, ox, oy, 6, 7, 2, 2, bf.color, s);
    px(ctx, ox, oy, 9, 7, 2, 2, bf.color, s);
    px(ctx, ox, oy, 8, 7, 1, 2, '#1e293b', s);
  } else {
    px(ctx, ox, oy, 7, 6, 2, 3, bf.color, s);
  }
}

export function drawVillageAmbientNpc(
  ctx: CanvasRenderingContext2D,
  tilePx: number,
  npc: VillageAmbientNpc,
  tick: number,
  weather: WeatherType,
  season: Season,
  nowMs: number
) {
  const s = Math.max(2, Math.floor(tilePx / 16));
  const ox = Math.floor(npc.x * tilePx + (tilePx - 16 * s) / 2);
  const oy = Math.floor(npc.y * tilePx + (tilePx - 16 * s) / 2 - s * 2);
  const isMoving = npc.pauseMs <= 0;
  const isSitting = !isMoving && npc.activity === 'sit_bench';
  const isChoring = !isMoving && npc.activity === 'chore_yard';
  const isWaving = Boolean(npc.wavingUntilMs && nowMs < npc.wavingUntilMs);
  const hasUmbrella = (weather === 'rainy' || weather === 'stormy') && !isSitting;

  const bob = isMoving && Math.sin(tick * 0.36 + npc.x * 2) > 0 ? -1 : 0;
  const step = isMoving ? Math.sin(tick * 0.42 + npc.y * 2) * 1.1 : 0;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(ox + 4 * s, oy + 14 * s, 8 * s, 2 * s);

  const by = oy + (isSitting ? 1 * s : bob * s);

  // Legs
  if (isSitting) {
    px(ctx, ox, by, 5, 11, 2, 2, '#334155', s);
    px(ctx, ox, by, 9, 11, 2, 2, '#334155', s);
  } else {
    px(ctx, ox, oy, 5, 11 + Math.max(0, step), 2, 3, '#334155', s);
    px(ctx, ox, oy, 9, 11 + Math.max(0, -step), 2, 3, '#334155', s);
  }

  // Shirt & winter scarf
  px(ctx, ox, by, 4, 7, 8, 5, npc.shirtColor, s);
  if (season === 'winter') {
    px(ctx, ox, by, 5, 7, 6, 1, '#ef4444', s);
  }

  // Arms (animated wave or chore)
  px(ctx, ox, by, 3, 7, 1, 3, npc.skinTone, s);
  if (isWaving) {
    const waveY = Math.floor(tick / 8) % 2 === 0 ? 4 : 5;
    px(ctx, ox, by, 12, waveY, 2, 3, npc.skinTone, s);
  } else if (isChoring) {
    const swing = Math.sin(tick * 0.32) * 1.5;
    px(ctx, ox, by, 12, 7, 1, 3, npc.skinTone, s);
    if (npc.choreKind === 'sweep') {
      px(ctx, ox, by, 13 + swing, 6, 1, 7, '#78350f', s);
      px(ctx, ox, by, 12 + swing, 12, 3, 2, '#eab308', s);
    } else {
      px(ctx, ox, by, 13, 9, 3, 2, '#0284c7', s); // watering can
    }
  } else {
    px(ctx, ox, by, 12, 7, 1, 3, npc.skinTone, s);
  }

  // Head & hair
  px(ctx, ox, by, 5, 3, 6, 4, npc.skinTone, s);
  px(ctx, ox, by, 4, 1, 8, 2, npc.hairColor, s);
  if (npc.hatColor) {
    px(ctx, ox, by, 4, 0, 8, 2, npc.hatColor, s);
  } else if (season === 'winter') {
    px(ctx, ox, by, 4, 0, 8, 2, '#b91c1c', s);
  }

  // Eyes facing direction
  const eyeOffset = npc.facing === 'left' ? -1 : npc.facing === 'right' ? 1 : 0;
  if (npc.facing !== 'up') {
    px(ctx, ox, by, 6 + eyeOffset, 5, 1, 1, '#1e293b', s);
    px(ctx, ox, by, 9 + eyeOffset, 5, 1, 1, '#1e293b', s);
  }

  // Colorful rain umbrella above head during rain/storm
  if (hasUmbrella) {
    px(ctx, ox, by, 12, 1, 1, 7, '#451a03', s); // handle
    px(ctx, ox, by, 3, -4, 11, 3, npc.umbrellaColor, s);
    px(ctx, ox, by, 5, -5, 7, 1, npc.umbrellaColor, s);
    px(ctx, ox, by, 8, -6, 1, 1, '#cbd5e1', s);
  }

  // Small pixel chat indicator while chatting on Dorfplatz or visiting bakery/tavern
  if (!npc.greetingText && !isMoving && npc.chatIcon && (tick + npc.name.length * 13) % 160 < 95) {
    const bubbleY = hasUmbrella ? -11 : -5;
    px(ctx, ox, by, 4, bubbleY, 8, 4, '#faf6ee', s);
    if (npc.chatIcon === 'heart') {
      px(ctx, ox, by, 7, bubbleY + 1, 2, 2, '#f43f5e', s);
    } else if (npc.chatIcon === 'bread') {
      px(ctx, ox, by, 6, bubbleY + 1, 4, 2, '#d97706', s);
    } else {
      const dot = Math.floor(tick / 12) % 3;
      for (let i = 0; i <= dot; i++) {
        px(ctx, ox, by, 5 + i * 2, bubbleY + 1, 1, 1, '#4a321f', s);
      }
    }
  }
}

export function drawVillageGreetingBubbles(
  ctx: CanvasRenderingContext2D,
  tilePx: number,
  lifeState: VillageLifeState,
  nowMs: number
) {
  for (const npc of lifeState.npcs) {
    if (!npc.greetingText || !npc.greetingUntilMs || nowMs > npc.greetingUntilMs) continue;
    const cx = (npc.x + 0.5) * tilePx;
    const cy = (npc.y - 0.52) * tilePx;

    ctx.save();
    const fontSize = Math.max(11, Math.min(14, Math.round(tilePx * 0.25)));
    ctx.font = `700 ${fontSize}px "Outfit", sans-serif`;
    const padX = 8;
    const textW = ctx.measureText(npc.greetingText).width;
    const boxW = textW + padX * 2;
    const boxH = fontSize + 10;
    const bx = Math.round(cx - boxW / 2);
    const by = Math.round(cy - boxH);

    ctx.fillStyle = '#faf6ee';
    ctx.strokeStyle = '#4a321f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(bx, by, boxW, boxH, 6);
    ctx.fill();
    ctx.stroke();

    // Pointer triangle
    ctx.fillStyle = '#faf6ee';
    ctx.beginPath();
    ctx.moveTo(cx - 4, by + boxH - 1);
    ctx.lineTo(cx + 4, by + boxH - 1);
    ctx.lineTo(cx, by + boxH + 5);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#2b2118';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(npc.greetingText, cx, by + boxH / 2 + 0.5);
    ctx.restore();
  }
}
