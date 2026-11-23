import {
  CATALOG_BY_ID,
  GRID_SIZE,
  IDLE_TILLED_REVERT_MS,
  MAX_MOISTURE_MS,
  WITHER_CROP_DRY_MS,
  WITHER_MUSHROOM_DRY_MS,
  WORLD_MARGIN,
  WORLD_SIZE,
} from '../data/catalog';
import {
  getFireBrigadeVisualState,
  VILLAGE_BUSINESSES,
  VILLAGE_HOUSE_BY_ID,
  VILLAGE_HOUSES,
  VillageBusinessSpec,
  VillageHouse,
  VillageHouseStyle,
} from '../data/village';
import { THEME_PARK_ATTRACTIONS, THEME_PARK_BOUNDS } from '../data/themePark';
import { isFenceLike, isRoamingAnimal, SANTA_DROP_DELAY_MS } from '../engine/gameLogic';
import {
  AvatarConfig,
  CatalogItem,
  FarmShopState,
  FarmWorker,
  FireworksState,
  FishDensity,
  FishingRegionId,
  GameState,
  HouseState,
  MailboxState,
  PetType,
  PlayerPosition,
  PostmanState,
  SantaSleighState,
  Season,
  ShopVisitor,
  ThemeParkState,
  TileData,
  ToolType,
  UfoAbductionAnimation,
  VillageBusinessId,
  VillageFireState,
  WeatherType,
} from '../types/game';

// Helper to draw crisp pixel blocks inside a base coordinate
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

export { drawPixelAvatar } from './avatarSprite';

export function getSeasonGrassColors(season: Season): { base: string; alt: string; locked: string; border: string } {
  switch (season) {
    case 'spring':
      return { base: '#5ea845', alt: '#53993b', locked: '#3a662b', border: '#4b8a36' };
    case 'summer':
      return { base: '#6ab03f', alt: '#5da134', locked: '#416d27', border: '#54922f' };
    case 'autumn':
      return { base: '#9e8f3c', alt: '#8b7c32', locked: '#5f5527', border: '#7c6d2c' };
    case 'winter':
      return { base: '#cbd5e1', alt: '#bac8d8', locked: '#7d8fa3', border: '#9eb0c4' };
  }
}

export interface DayNightAtmosphere {
  phase: 'night' | 'dawn' | 'day' | 'dusk';
  phaseLabel: string;
  tintCss: string;
  nightFactor: number;
  moonGlowAlpha: number;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

function lerpRgba(
  c1: [number, number, number, number],
  c2: [number, number, number, number],
  t: number
): string {
  const r = Math.round(lerp(c1[0], c2[0], t));
  const g = Math.round(lerp(c1[1], c2[1], t));
  const b = Math.round(lerp(c1[2], c2[2], t));
  const a = lerp(c1[3], c2[3], t);
  if (a <= 0.004) return 'rgba(0,0,0,0)';
  return `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`;
}

/**
 * Smooth 24h cycle with an atmospheric, genuinely darker night
 * where farm lanterns and handheld lamps cast warm light.
 */
export function getDayNightAtmosphere(ingameMinutes: number): DayNightAtmosphere {
  const m = ((ingameMinutes % 1440) + 1440) % 1440;
  const FULL_MOON: [number, number, number, number] = [14, 22, 54, 0.44];
  const SUNRISE: [number, number, number, number] = [251, 146, 60, 0.14];
  const DAY: [number, number, number, number] = [255, 255, 255, 0];
  const SUNSET: [number, number, number, number] = [235, 100, 45, 0.2];

  if (m < 300) {
    // 00:00 - 05:00 Full Moon
    return {
      phase: 'night',
      phaseLabel: 'Vollmond',
      tintCss: lerpRgba(FULL_MOON, FULL_MOON, 0),
      nightFactor: 1,
      moonGlowAlpha: 0.08,
    };
  }
  if (m < 390) {
    // 05:00 - 06:30 Full Moon -> Dawn
    const t = (m - 300) / 90;
    const nightFactor = lerp(1, 0.25, t);
    return {
      phase: 'dawn',
      phaseLabel: 'Morgenrot',
      tintCss: lerpRgba(FULL_MOON, SUNRISE, t),
      nightFactor,
      moonGlowAlpha: 0.08 * nightFactor,
    };
  }
  if (m < 480) {
    // 06:30 - 08:00 Dawn -> Bright Day
    const t = (m - 390) / 90;
    const nightFactor = lerp(0.25, 0, t);
    return {
      phase: t < 0.65 ? 'dawn' : 'day',
      phaseLabel: t < 0.65 ? 'Morgenrot' : 'Tag',
      tintCss: lerpRgba(SUNRISE, DAY, t),
      nightFactor,
      moonGlowAlpha: 0,
    };
  }
  if (m < 1050) {
    // 08:00 - 17:30 Bright Day
    return {
      phase: 'day',
      phaseLabel: 'Tag',
      tintCss: 'rgba(0,0,0,0)',
      nightFactor: 0,
      moonGlowAlpha: 0,
    };
  }
  if (m < 1170) {
    // 17:30 - 19:30 Golden Sunset
    const t = (m - 1050) / 120;
    const nightFactor = lerp(0, 0.45, t);
    return {
      phase: 'dusk',
      phaseLabel: 'Abendrot',
      tintCss: lerpRgba(DAY, SUNSET, t),
      nightFactor,
      moonGlowAlpha: 0.04 * t,
    };
  }
  if (m < 1260) {
    // 19:30 - 21:00 Dusk -> Full Moon
    const t = (m - 1170) / 90;
    const nightFactor = lerp(0.45, 1, t);
    return {
      phase: t < 0.55 ? 'dusk' : 'night',
      phaseLabel: t < 0.55 ? 'Abendrot' : 'Vollmond',
      tintCss: lerpRgba(SUNSET, FULL_MOON, t),
      nightFactor,
      moonGlowAlpha: 0.08 * nightFactor,
    };
  }

  // 21:00 - 24:00 Full Moon
  return {
    phase: 'night',
    phaseLabel: 'Vollmond',
    tintCss: lerpRgba(FULL_MOON, FULL_MOON, 0),
    nightFactor: 1,
    moonGlowAlpha: 0.08,
  };
}

export interface SunShadowSpec {
  active: boolean;
  dx: number;
  dy: number;
  alpha: number;
}

export function getSunShadowSpec(ingameMinutes: number, weather: WeatherType): SunShadowSpec {
  const m = ((ingameMinutes % 1440) + 1440) % 1440;
  if (m < 360 || m > 1200) {
    return { active: false, dx: 0, dy: 0, alpha: 0 };
  }
  // 06:00 (u=0) -> leans west (-dx), 13:00 (u~0.5) -> compact south-east, 20:00 (u=1) -> leans east (+dx)
  const u = (m - 360) / 840;
  const sunAngle = (u - 0.5) * 2; // -1..+1
  const dx = sunAngle * 2.8;
  const dy = 0.65 + (1 - Math.abs(sunAngle)) * 0.55;
  const edgeFade = u < 0.12 ? u / 0.12 : u > 0.88 ? (1 - u) / 0.12 : 1;
  const weatherAtten =
    weather === 'stormy'
      ? 0.25
      : weather === 'rainy'
      ? 0.35
      : weather === 'foggy'
      ? 0.3
      : weather === 'cloudy'
      ? 0.55
      : 1;
  return {
    active: true,
    dx,
    dy,
    alpha: Math.max(0.06, Math.min(0.28, 0.24 * edgeFade * weatherAtten)),
  };
}

export function drawTile(
  ctx: CanvasRenderingContext2D,
  tile: TileData,
  tilePx: number,
  season: Season,
  showGrid: boolean,
  tick: number,
  weather: WeatherType,
  isHovered: boolean,
  isShielded: boolean,
  isBoosted: boolean,
  nightFactor = 0,
  tiles?: TileData[][],
  skipRoamingAnimals = false,
  highGraphics = false,
  shadowSpec?: SunShadowSpec
) {
  const ox = tile.x * tilePx;
  const oy = tile.y * tilePx;
  const s = tilePx / 16; // scale 3 at 48px
  const colors = getSeasonGrassColors(season);

  const checker = (tile.x + tile.y) % 2 === 0;

  if (!tile.unlocked) {
    ctx.fillStyle = checker ? colors.locked : '#2d4b23';
    if (season === 'winter') ctx.fillStyle = checker ? '#7d8fa3' : '#6f8196';
    if (season === 'autumn') ctx.fillStyle = checker ? '#5f5527' : '#534a21';
    ctx.fillRect(ox, oy, tilePx, tilePx);
    // Small wild pixel shrubs/trees on locked land
    if ((tile.x * 7 + tile.y * 13) % 5 === 0) {
      if (highGraphics && shadowSpec?.active) {
        px(ctx, ox, oy, 5 + shadowSpec.dx * 0.45, 11 + shadowSpec.dy * 0.45, 6, 3, `rgba(0,0,0,${(shadowSpec.alpha * 0.85).toFixed(2)})`, s);
      }
      px(ctx, ox, oy, 5, 5, 6, 6, season === 'winter' ? '#475569' : '#26461b', s);
      px(ctx, ox, oy, 6, 3, 4, 4, season === 'winter' ? '#e2e8f0' : '#366126', s);
      if (highGraphics) {
        px(ctx, ox, oy, 6, 3, 3, 2, season === 'winter' ? '#f8fafc' : '#4b8236', s);
      }
      px(ctx, ox, oy, 7, 11, 2, 3, '#5c3a21', s);
    }
    return;
  }

  // Unlocked base ground
  if (tile.ground === 'grass') {
    ctx.fillStyle = checker ? colors.base : colors.alt;
    ctx.fillRect(ox, oy, tilePx, tilePx);
    // Tiny pixel grass blades
    if ((tile.x * 3 + tile.y * 5) % 4 === 0) {
      px(ctx, ox, oy, 3, 10, 1, 2, colors.border, s);
      px(ctx, ox, oy, 11, 5, 1, 2, colors.border, s);
    }
    if (highGraphics && !tile.entity) {
      const microHash = Math.abs(tile.x * 19 + tile.y * 37);
      if (microHash % 9 === 0) {
        // Tiny clover tuft or seasonal blossom / snow fleck
        if (season === 'winter') {
          px(ctx, ox, oy, 4, 4, 2, 1, '#f8fafc', s);
          px(ctx, ox, oy, 10, 11, 2, 1, '#e2e8f0', s);
        } else if (season === 'autumn') {
          px(ctx, ox, oy, 5, 6, 2, 1, '#d97706', s);
          px(ctx, ox, oy, 10, 11, 1, 1, '#ea580c', s);
        } else {
          px(ctx, ox, oy, 4, 5, 1, 1, '#84cc16', s);
          px(ctx, ox, oy, 5, 4, 1, 1, microHash % 2 === 0 ? '#fef9c3' : '#f9a8d4', s);
          px(ctx, ox, oy, 11, 10, 2, 1, '#65a30d', s);
        }
      } else if (microHash % 13 === 3) {
        // Subtle tiny meadow pebbles
        px(ctx, ox, oy, 7, 11, 2, 1, 'rgba(100, 116, 139, 0.45)', s);
      }
      // Subtle animated rain puddles during rain/storms
      if ((weather === 'rainy' || weather === 'stormy') && (tile.x * 13 + tile.y * 17) % 11 === 0) {
        px(ctx, ox, oy, 4, 7, 8, 4, 'rgba(56, 189, 248, 0.36)', s);
        px(ctx, ox, oy, 5, 8, 6, 2, 'rgba(186, 230, 253, 0.42)', s);
        const ripple = Math.floor(tick / 10 + tile.x + tile.y) % 3;
        if (ripple === 0) {
          px(ctx, ox, oy, 7, 8, 2, 1, 'rgba(240, 249, 255, 0.65)', s);
        } else if (ripple === 1) {
          px(ctx, ox, oy, 6, 8, 1, 1, 'rgba(224, 242, 254, 0.5)', s);
          px(ctx, ox, oy, 9, 9, 1, 1, 'rgba(224, 242, 254, 0.5)', s);
        }
      }
    }
  } else if (tile.ground === 'tilled') {
    const moistureRatio = tile.watered
      ? Math.max(0.1, Math.min(1, (tile.wateredRemainingMs ?? MAX_MOISTURE_MS) / MAX_MOISTURE_MS))
      : 0;
    const soilBase = !tile.watered
      ? '#94633e'
      : moistureRatio > 0.35
      ? '#52321b'
      : '#6b4326';
    const soilFurrow = !tile.watered
      ? '#754b2c'
      : moistureRatio > 0.35
      ? '#3b2211'
      : '#51311a';
    ctx.fillStyle = checker ? colors.base : colors.alt;
    ctx.fillRect(ox, oy, tilePx, tilePx);
    if (highGraphics && tiles) {
      const nTilled = tiles[tile.y - 1]?.[tile.x]?.ground === 'tilled';
      const sTilled = tiles[tile.y + 1]?.[tile.x]?.ground === 'tilled';
      const wTilled = tiles[tile.y]?.[tile.x - 1]?.ground === 'tilled';
      const eTilled = tiles[tile.y]?.[tile.x + 1]?.ground === 'tilled';
      const bx = wTilled ? 0 : 1;
      const by = nTilled ? 0 : 1;
      const bw = 16 - bx - (eTilled ? 0 : 1);
      const bh = 16 - by - (sTilled ? 0 : 1);
      px(ctx, ox, oy, bx, by, bw, bh, soilBase, s);
      // Soft top/left bevel highlight & bottom/right shadow on exposed bed rims
      if (!nTilled) px(ctx, ox, oy, bx, by, bw, 1, tile.watered ? '#7c4d2b' : '#a8744d', s);
      if (!sTilled) px(ctx, ox, oy, bx, by + bh - 1, bw, 1, soilFurrow, s);
      if (!wTilled) px(ctx, ox, oy, bx, by, 1, bh, tile.watered ? '#7c4d2b' : '#a8744d', s);
      if (!eTilled) px(ctx, ox, oy, bx + bw - 1, by, 1, bh, soilFurrow, s);
      const fxStart = wTilled ? 0 : 2;
      const fxWidth = 16 - fxStart - (eTilled ? 0 : 2);
      for (let fy = 3; fy <= 12; fy += 3) {
        px(ctx, ox, oy, fxStart, fy, fxWidth, 1, soilFurrow, s);
      }
    } else {
      // Framed tilled plot
      px(ctx, ox, oy, 1, 1, 14, 14, soilBase, s);
      for (let fy = 3; fy <= 12; fy += 3) {
        px(ctx, ox, oy, 2, fy, 12, 1, soilFurrow, s);
      }
    }
    if (tile.watered && moistureRatio > 0) {
      // Subtle moisture level bar along top edge of plot
      const barW = Math.max(2, Math.round(10 * moistureRatio));
      px(ctx, ox, oy, 3, 1, barW, 1, moistureRatio > 0.3 ? '#38bdf8' : '#fbbf24', s);
    }
    if (tile.enriched) {
      // Golden sparkle flecks on nutrient-rich soil
      px(ctx, ox, oy, 3, 2, 1, 1, '#facc15', s);
      px(ctx, ox, oy, 12, 12, 1, 1, '#facc15', s);
    }
    if (!tile.entity && (tile.idleTilledMs ?? 0) >= IDLE_TILLED_REVERT_MS * 0.65) {
      // Tiny grass shoots reclaiming unused tilled soil
      px(ctx, ox, oy, 2, 12, 1, 2, colors.base, s);
      px(ctx, ox, oy, 12, 3, 2, 1, colors.base, s);
      px(ctx, ox, oy, 10, 12, 1, 2, '#65a30d', s);
    }
  } else if (tile.ground === 'path') {
    if (highGraphics && tiles) {
      const isPathLike = (t?: TileData) => Boolean(t && (t.ground === 'path' || t.entity?.itemId === 'stone_path'));
      const nP = isPathLike(tiles[tile.y - 1]?.[tile.x]);
      const sP = isPathLike(tiles[tile.y + 1]?.[tile.x]);
      const wP = isPathLike(tiles[tile.y]?.[tile.x - 1]);
      const eP = isPathLike(tiles[tile.y]?.[tile.x + 1]);
      ctx.fillStyle = checker ? colors.base : colors.alt;
      ctx.fillRect(ox, oy, tilePx, tilePx);
      const px0 = wP ? 0 : 1;
      const py0 = nP ? 0 : 1;
      const pw = 16 - px0 - (eP ? 0 : 1);
      const ph = 16 - py0 - (sP ? 0 : 1);
      px(ctx, ox, oy, px0, py0, pw, ph, '#c8b496', s);
      if (!nP) px(ctx, ox, oy, px0, py0, pw, 1, '#dfd0b8', s);
      if (!sP) px(ctx, ox, oy, px0, py0 + ph - 1, pw, 1, '#9c8669', s);
      if (!wP) px(ctx, ox, oy, px0, py0, 1, ph, '#dfd0b8', s);
      if (!eP) px(ctx, ox, oy, px0 + pw - 1, py0, 1, ph, '#9c8669', s);
      px(ctx, ox, oy, 2, 2, 5, 4, '#b39e7f', s);
      px(ctx, ox, oy, 3, 2, 3, 1, '#d6c3a5', s);
      px(ctx, ox, oy, 9, 8, 5, 5, '#b39e7f', s);
      px(ctx, ox, oy, 10, 8, 3, 1, '#d6c3a5', s);
    } else {
      ctx.fillStyle = '#c8b496';
      ctx.fillRect(ox, oy, tilePx, tilePx);
      px(ctx, ox, oy, 2, 2, 5, 4, '#b39e7f', s);
      px(ctx, ox, oy, 9, 8, 5, 5, '#b39e7f', s);
    }
  }

  // Grid outline
  if (showGrid) {
    ctx.strokeStyle = 'rgba(0,0,0,0.09)';
    ctx.lineWidth = 1;
    ctx.strokeRect(ox + 0.5, oy + 0.5, tilePx - 1, tilePx - 1);
  }

  // Subtle aura indicators on hover
  if (isHovered) {
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 2;
    ctx.strokeRect(ox + 1, oy + 1, tilePx - 2, tilePx - 2);
  }

  if (isShielded && isHovered) {
    px(ctx, ox, oy, 1, 1, 2, 2, '#38bdf8', s);
  }
  if (isBoosted && isHovered) {
    px(ctx, ox, oy, 13, 1, 2, 2, '#facc15', s);
  }

  // Draw Entity on tile
  if (!tile.entity) return;

  const item = CATALOG_BY_ID[tile.entity.itemId];
  if (!item) return;

  const progress = item.growthMs > 0 ? Math.min(1, tile.entity.progressMs / item.growthMs) : 1;
  const windMult =
    weather === 'stormy' ? 2.1 : weather === 'windy' ? 1.65 : weather === 'rainy' ? 1.2 : 1.0;
  const sway = highGraphics
    ? Math.sin(tick * (0.08 * windMult) + tile.x * 0.9 + tile.y * 0.5) * (0.5 * windMult)
    : Math.sin(tick * 0.08 + tile.x * 0.9 + tile.y * 0.5) * 0.5;
  const sunDx = highGraphics && shadowSpec?.active ? shadowSpec.dx : 0;
  const sunDy = highGraphics && shadowSpec?.active ? shadowSpec.dy : 0;
  const sunAlpha = highGraphics && shadowSpec?.active ? shadowSpec.alpha : 0.22;

  if (tile.entity.category === 'crop') {
    if (tile.entity.withered) {
      // Dried-out withered crop stalks
      px(ctx, ox, oy, 4, 10, 8, 3, '#713f12', s);
      px(ctx, ox, oy, 6, 6, 2, 5, '#92400e', s);
      px(ctx, ox, oy, 8, 7, 3, 2, '#a16207', s);
      px(ctx, ox, oy, 4, 8, 2, 2, '#a16207', s);
      px(ctx, ox, oy, 12, 2, 2, 2, '#ef4444', s);
    } else if (tile.entity.damaged) {
      // Damaged withered tuft (recoverable!)
      px(ctx, ox, oy, 5, 9, 6, 3, '#78716c', s);
      px(ctx, ox, oy, 7, 7, 2, 2, '#a8a29e', s);
    } else if (progress < 0.3) {
      // Stage 1: Seeds / tiny sprout
      px(ctx, ox, oy, 4, 11, 2, 2, '#a3e635', s);
      px(ctx, ox, oy, 10, 10, 2, 2, '#84cc16', s);
      px(ctx, ox, oy, 7, 12, 2, 2, '#a3e635', s);
    } else if (progress < 0.65) {
      // Stage 2: Growing leafy shoots
      px(ctx, ox, oy, 4, 8, 2, 5, '#22c55e', s);
      px(ctx, ox, oy, 7, 7, 2, 6, '#16a34a', s);
      px(ctx, ox, oy, 10, 8, 2, 5, '#22c55e', s);
    } else if (!tile.entity.ready) {
      // Stage 3: Tall crop forming buds
      px(ctx, ox, oy, 3, 6, 3, 7, '#16a34a', s);
      px(ctx, ox, oy, 7, 5, 3, 8, '#15803d', s);
      px(ctx, ox, oy, 10, 6, 3, 7, '#16a34a', s);
      px(ctx, ox, oy, 7, 4, 2, 2, item.pixelColor, s);
    } else if (item.id === 'seal_hops') {
      // Stage 4: Siegelhopfen on wooden trellis pole with plump green hop cones
      const sx = Math.round(sway);
      px(ctx, ox, oy, 7, 2, 2, 11, '#78350f', s); // wooden trellis stake
      px(ctx, ox, oy, 4, 4, 8, 1, '#92400e', s); // crossbar
      px(ctx, ox + sx, oy, 4, 5, 8, 7, '#15803d', s); // lush vine leaves
      px(ctx, ox + sx, oy, 3, 6, 3, 4, '#65a30d', s); // left hop cones
      px(ctx, ox + sx, oy, 10, 6, 3, 4, '#65a30d', s); // right hop cones
      px(ctx, ox + sx, oy, 6, 3, 4, 4, '#84cc16', s); // top crown cones
      px(ctx, ox + sx, oy, 5, 7, 2, 2, '#d9f99d', s); // lupulin highlight
      px(ctx, ox + sx, oy, 9, 8, 2, 2, '#d9f99d', s);
      if (Math.floor(tick / 12 + tile.x) % 2 === 0) {
        px(ctx, ox, oy, 12, 2, 2, 2, '#fef08a', s);
      }
    } else if (item.id === 'asparagus') {
      // Stage 4: Frühlings-Spargel (creamy white stalks with green tips)
      const sx = Math.round(sway);
      px(ctx, ox, oy, 2, 11, 12, 3, '#78350f', s); // mound
      px(ctx, ox + sx, oy, 4, 5, 2, 6, '#fef9c3', s);
      px(ctx, ox + sx, oy, 4, 3, 2, 2, '#65a30d', s);
      px(ctx, ox + sx, oy, 7, 4, 2, 7, '#fefce8', s);
      px(ctx, ox + sx, oy, 7, 2, 2, 2, '#84cc16', s);
      px(ctx, ox + sx, oy, 10, 6, 2, 5, '#fef9c3', s);
      px(ctx, ox + sx, oy, 10, 4, 2, 2, '#65a30d', s);
      if (Math.floor(tick / 12 + tile.x) % 2 === 0) {
        px(ctx, ox, oy, 12, 2, 2, 2, '#fef08a', s);
      }
    } else if (item.id === 'cucumber') {
      // Stage 4: Salatgurke on leafy vines
      const sx = Math.round(sway);
      px(ctx, ox + sx, oy, 3, 5, 10, 6, '#15803d', s);
      px(ctx, ox + sx, oy, 5, 3, 6, 3, '#22c55e', s);
      px(ctx, ox + sx, oy, 4, 8, 2, 5, '#16a34a', s);
      px(ctx, ox + sx, oy, 4, 9, 1, 3, '#bbf7d0', s);
      px(ctx, ox + sx, oy, 9, 7, 3, 5, '#16a34a', s);
      px(ctx, ox + sx, oy, 10, 8, 1, 3, '#bbf7d0', s);
      if (Math.floor(tick / 12 + tile.x) % 2 === 0) {
        px(ctx, ox, oy, 12, 2, 2, 2, '#fef08a', s);
      }
    } else if (item.id === 'potato') {
      // Stage 4: Ackerkartoffel bush + golden tubers
      const sx = Math.round(sway);
      px(ctx, ox + sx, oy, 4, 4, 8, 5, '#16a34a', s);
      px(ctx, ox + sx, oy, 6, 3, 4, 2, '#4ade80', s);
      px(ctx, ox, oy, 3, 10, 4, 3, '#ca8a04', s);
      px(ctx, ox, oy, 4, 10, 2, 1, '#fde047', s);
      px(ctx, ox, oy, 8, 9, 5, 4, '#a16207', s);
      px(ctx, ox, oy, 9, 10, 3, 1, '#eab308', s);
      if (Math.floor(tick / 12 + tile.x) % 2 === 0) {
        px(ctx, ox, oy, 12, 2, 2, 2, '#fef08a', s);
      }
    } else if (item.id === 'bell_pepper') {
      // Stage 4: Gemüsepaprika (red & yellow glossy peppers)
      const sx = Math.round(sway);
      px(ctx, ox + sx, oy, 3, 5, 10, 7, '#15803d', s);
      px(ctx, ox + sx, oy, 4, 7, 3, 4, '#ef4444', s);
      px(ctx, ox + sx, oy, 9, 6, 3, 4, '#facc15', s);
      px(ctx, ox + sx, oy, 7, 4, 2, 3, '#22c55e', s);
      if (Math.floor(tick / 12 + tile.x) % 2 === 0) {
        px(ctx, ox, oy, 12, 2, 2, 2, '#fef08a', s);
      }
    } else if (item.id === 'chili_pepper') {
      // Stage 4: Feuer-Chili (fiery red hanging pods)
      const sx = Math.round(sway);
      px(ctx, ox + sx, oy, 3, 4, 10, 7, '#166534', s);
      px(ctx, ox + sx, oy, 4, 7, 2, 5, '#dc2626', s);
      px(ctx, ox + sx, oy, 5, 11, 1, 2, '#fb923c', s);
      px(ctx, ox + sx, oy, 8, 6, 2, 5, '#b91c1c', s);
      px(ctx, ox + sx, oy, 10, 8, 2, 4, '#ef4444', s);
      if (Math.floor(tick / 12 + tile.x) % 2 === 0) {
        px(ctx, ox, oy, 12, 2, 2, 2, '#fef08a', s);
      }
    } else if (item.id === 'imperial_truffle_melon') {
      // Stage 4: Royal golden-striped Imperial Truffle Melon on lush vine
      const sx = Math.round(sway * 0.5);
      px(ctx, ox, oy, 2, 9, 12, 5, '#15803d', s);
      px(ctx, ox + sx, oy, 4, 4, 8, 8, '#d97706', s);
      px(ctx, ox + sx, oy, 5, 5, 6, 6, '#facc15', s);
      px(ctx, ox + sx, oy, 7, 4, 2, 8, '#78350f', s);
      px(ctx, ox + sx, oy, 6, 2, 4, 2, '#16a34a', s);
      if (Math.floor(tick / 10 + tile.x) % 2 === 0) {
        px(ctx, ox, oy, 12, 2, 2, 2, '#fef08a', s);
      }
    } else if (item.id === 'celestial_wheat' || item.id === 'aurora_orchid') {
      // Stage 4: High-level shimmering crops
      const sx = Math.round(sway);
      px(ctx, ox + sx, oy, 3, 5, 10, 8, item.category === 'crop' ? '#15803d' : item.accentColor, s);
      px(ctx, ox + sx, oy, 4, 3, 3, 6, item.pixelColor, s);
      px(ctx, ox + sx, oy, 9, 3, 3, 6, item.pixelColor, s);
      px(ctx, ox + sx, oy, 6, 2, 4, 5, item.accentColor, s);
      if (Math.floor(tick / 10 + tile.x) % 2 === 0) {
        px(ctx, ox, oy, 12, 2, 2, 2, '#ffffff', s);
      }
    } else {
      // Stage 4: Ripe & swaying!
      const sx = Math.round(sway);
      px(ctx, ox + sx, oy, 3, 6, 10, 7, item.accentColor, s);
      px(ctx, ox + sx, oy, 4, 4, 3, 4, item.pixelColor, s);
      px(ctx, ox + sx, oy, 9, 4, 3, 4, item.pixelColor, s);
      px(ctx, ox + sx, oy, 6, 3, 4, 4, item.pixelColor, s);
      // Ready sparkle
      if (Math.floor(tick / 12 + tile.x) % 2 === 0) {
        px(ctx, ox, oy, 12, 2, 2, 2, '#fef08a', s);
      }
    }
  } else if (tile.entity.category === 'mushroom') {
    const pulse = tile.entity.ready && Math.floor(tick / 15) % 2 === 0 ? -1 : 0;
    if (tile.entity.withered) {
      // Dried-out shriveled mushroom
      px(ctx, ox, oy, 6, 10, 3, 3, '#78716c', s);
      px(ctx, ox, oy, 5, 8, 5, 2, '#713f12', s);
      px(ctx, ox, oy, 9, 11, 2, 2, '#57534e', s);
      px(ctx, ox, oy, 12, 2, 2, 2, '#ef4444', s);
    } else if (progress < 0.45) {
      // Mycelium spore pins
      px(ctx, ox, oy, 5, 11, 2, 2, '#e7e5e4', s);
      px(ctx, ox, oy, 9, 10, 2, 3, '#d6d3d1', s);
    } else if (!tile.entity.ready) {
      px(ctx, ox, oy, 5, 9, 2, 4, '#f5f5f4', s);
      px(ctx, ox, oy, 4, 7, 4, 2, item.pixelColor, s);
      px(ctx, ox, oy, 10, 10, 2, 3, '#f5f5f4', s);
      px(ctx, ox, oy, 9, 8, 4, 2, item.pixelColor, s);
    } else {
      // Full cluster of mushrooms
      if (item.id === 'glowmorel' || item.id === 'moon_truffle') {
        const glowAlpha = 0.24 + nightFactor * 0.32;
        const glowRadius = tilePx * (0.45 + nightFactor * 0.35);
        ctx.fillStyle =
          item.id === 'moon_truffle'
            ? `rgba(167, 139, 250, ${glowAlpha.toFixed(2)})`
            : `rgba(45, 212, 191, ${glowAlpha.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(ox + tilePx / 2, oy + tilePx / 2, glowRadius, 0, Math.PI * 2);
        ctx.fill();
      }
      // Big mushroom
      px(ctx, ox, oy + pulse, 6, 8, 4, 5, '#f5f5f4', s);
      px(ctx, ox, oy + pulse, 4, 4, 8, 4, item.pixelColor, s);
      px(ctx, ox, oy + pulse, 5, 3, 6, 1, item.pixelColor, s);
      px(ctx, ox, oy + pulse, 6, 5, 1, 1, item.accentColor, s);
      px(ctx, ox, oy + pulse, 9, 6, 1, 1, item.accentColor, s);
      // Small companion mushroom
      px(ctx, ox, oy, 11, 10, 2, 3, '#e7e5e4', s);
      px(ctx, ox, oy, 10, 8, 4, 2, item.pixelColor, s);
    }
  } else if (tile.entity.category === 'animal') {
    if (skipRoamingAnimals && isRoamingAnimal(tile.entity.itemId)) {
      return;
    }
    const hop = Math.sin(tick * 0.12 + tile.x * 2) > 0.7 ? -1 : 0;
    // Shadow
    px(ctx, ox, oy, 4, 13, 8, 2, 'rgba(0,0,0,0.2)', s);

    if (item.id === 'chicken') {
      px(ctx, ox, oy + hop * s, 5, 7, 6, 5, '#fef3c7', s);
      px(ctx, ox, oy + hop * s, 9, 5, 3, 3, '#fef3c7', s);
      px(ctx, ox, oy + hop * s, 10, 4, 2, 1, '#ef4444', s); // comb
      px(ctx, ox, oy + hop * s, 12, 6, 1, 1, '#f59e0b', s); // beak
      px(ctx, ox, oy, 6, 12, 1, 2, '#f59e0b', s);
      px(ctx, ox, oy, 9, 12, 1, 2, '#f59e0b', s);
    } else if (item.id === 'bee') {
      // Wooden hive box
      px(ctx, ox, oy, 4, 6, 8, 7, '#d97706', s);
      px(ctx, ox, oy, 3, 5, 10, 2, '#78350f', s);
      px(ctx, ox, oy, 7, 10, 2, 2, '#451a03', s);
      // Orbiting pixel bees
      const bx = Math.round(Math.cos(tick * 0.18 + tile.x) * 3);
      const by = Math.round(Math.sin(tick * 0.25 + tile.y) * 2);
      px(ctx, ox + bx, oy + by, 5, 3, 2, 1, '#facc15', s);
      px(ctx, ox - bx, oy - by, 10, 4, 2, 1, '#facc15', s);
    } else if (item.id === 'cow') {
      px(ctx, ox, oy + hop * s, 3, 6, 9, 6, '#f8fafc', s);
      px(ctx, ox, oy + hop * s, 5, 7, 3, 3, '#451a03', s); // spot
      px(ctx, ox, oy + hop * s, 10, 4, 4, 4, '#f8fafc', s); // head
      px(ctx, ox, oy + hop * s, 11, 3, 1, 1, '#cbd5e1', s); // horn
      px(ctx, ox, oy + hop * s, 12, 7, 2, 1, '#fda4af', s); // muzzle
      px(ctx, ox, oy, 4, 12, 2, 2, '#334155', s);
      px(ctx, ox, oy, 10, 12, 2, 2, '#334155', s);
    } else if (item.id === 'sheep') {
      px(ctx, ox, oy + hop * s, 4, 6, 8, 6, '#f8fafc', s);
      px(ctx, ox, oy + hop * s, 3, 7, 10, 4, '#f1f5f9', s);
      px(ctx, ox, oy + hop * s, 10, 6, 3, 3, '#334155', s); // face
      px(ctx, ox, oy, 5, 12, 1, 2, '#334155', s);
      px(ctx, ox, oy, 10, 12, 1, 2, '#334155', s);
    } else if (item.id === 'goat') {
      px(ctx, ox, oy + hop * s, 4, 7, 8, 5, '#e7e5e4', s);
      px(ctx, ox, oy + hop * s, 10, 4, 3, 4, '#d6d3d1', s);
      px(ctx, ox, oy + hop * s, 10, 2, 1, 2, '#78716c', s); // horn
      px(ctx, ox, oy + hop * s, 12, 2, 1, 2, '#78716c', s);
      px(ctx, ox, oy, 5, 12, 1, 2, '#78716c', s);
      px(ctx, ox, oy, 10, 12, 1, 2, '#78716c', s);
    } else if (item.id === 'pig') {
      px(ctx, ox, oy + hop * s, 4, 7, 8, 5, '#fda4af', s);
      px(ctx, ox, oy + hop * s, 11, 8, 3, 3, '#fb7185', s); // snout
      px(ctx, ox, oy + hop * s, 3, 8, 1, 2, '#be123c', s); // tail
      px(ctx, ox, oy, 5, 12, 1, 2, '#be123c', s);
      px(ctx, ox, oy, 10, 12, 1, 2, '#be123c', s);
    }

    // Ready bubble indicator (golden star/product ready)
    if (tile.entity.ready) {
      const floatY = Math.round(Math.sin(tick * 0.15) * 2);
      px(ctx, ox, oy + floatY, 6, 0, 4, 4, '#fef08a', s);
      px(ctx, ox, oy + floatY, 7, 1, 2, 2, '#d97706', s);
    }
  } else if (tile.entity.category === 'meat') {
    // Rustic wooden butcher board + savory luxury meat cut + twine highlight
    const floatY = Math.round(Math.sin(tick * 0.14 + tile.x) * 1.5);
    px(ctx, ox, oy, 3, 13, 10, 2, 'rgba(0,0,0,0.22)', s);
    px(ctx, ox, oy, 2, 9, 12, 4, '#78350f', s); // dark board edge
    px(ctx, ox, oy, 3, 8, 10, 4, '#b45309', s); // wood top
    px(ctx, ox, oy, 13, 9, 2, 2, '#92400e', s); // board handle
    // Meat cut on board
    px(ctx, ox, oy, 4, 5, 7, 5, item.pixelColor, s);
    px(ctx, ox, oy, 5, 6, 5, 3, item.accentColor, s);
    px(ctx, ox, oy, 6, 7, 2, 1, '#fef2f2', s); // marbling highlight
    px(ctx, ox, oy, 10, 6, 2, 2, '#fde68a', s); // bone/seal accent
    // Floating collect sparkle above drop
    px(ctx, ox, oy + floatY, 6, 0, 4, 4, '#fef08a', s);
    px(ctx, ox, oy + floatY, 7, 1, 2, 2, '#dc2626', s);
  } else if (tile.entity.category === 'tree') {
    const isGolden = item.id === 'fruit_golden_tree';
    const isDiamond = item.id === 'fruit_diamond_plum';
    const isCherry = item.id === 'fruit_cherry_tree';
    const sx = Math.round(sway * 0.6);

    // Directional Sun Shadow
    if (highGraphics && shadowSpec?.active) {
      px(ctx, ox, oy, 3 + sunDx * 0.9, 12 + sunDy * 0.75, 10, 3, `rgba(0,0,0,${sunAlpha.toFixed(2)})`, s);
    } else {
      px(ctx, ox, oy, 4, 13, 8, 2, 'rgba(0,0,0,0.22)', s);
    }

    if (progress < 0.35 && tile.entity.harvestCount === 0) {
      // Stage 1: Young orchard sapling
      px(ctx, ox, oy, 7, 9, 2, 5, isDiamond ? '#475569' : '#78350f', s);
      px(
        ctx,
        ox,
        oy,
        5,
        6,
        6,
        4,
        isDiamond ? '#38bdf8' : isGolden ? '#eab308' : season === 'winter' ? '#cbd5e1' : '#22c55e',
        s
      );
      px(ctx, ox, oy, 6, 5, 4, 2, isDiamond ? '#e0f2fe' : isGolden ? '#fef08a' : '#4ade80', s);
    } else {
      // Mature Perennial Fruit Tree trunk & seasonal crown
      px(ctx, ox, oy, 6, 8, 4, 6, isDiamond ? '#334155' : isGolden ? '#b45309' : '#78350f', s);
      px(ctx, ox, oy, 7, 9, 1, 5, isDiamond ? '#94a3b8' : isGolden ? '#eab308' : '#92400e', s);

      let crownMain = item.pixelColor;
      let crownHighlight = '#4ade80';
      if (isDiamond) {
        crownMain = '#0284c7';
        crownHighlight = '#bae6fd';
      } else if (isGolden) {
        crownMain = '#eab308';
        crownHighlight = '#fef08a';
      } else if (season === 'spring') {
        crownMain = isCherry ? '#f472b6' : '#22c55e';
        crownHighlight = isCherry ? '#fbcfe8' : '#fdf2f8';
      } else if (season === 'autumn') {
        crownMain = '#d97706';
        crownHighlight = '#fbbf24';
      } else if (season === 'winter') {
        crownMain = '#64748b';
        crownHighlight = '#e2e8f0';
      }

      px(ctx, ox + sx, oy, 2, 3, 12, 7, crownMain, s);
      px(ctx, ox + sx, oy, 3, 1, 10, 4, crownMain, s);
      if (highGraphics) {
        px(ctx, ox + sx, oy, 2, 9, 12, 1, 'rgba(0,0,0,0.18)', s);
      }
      px(ctx, ox + sx, oy, 4, 2, 8, 3, crownHighlight, s);

      if (season === 'spring' && !isGolden && !isDiamond) {
        // Spring blossoms dotted across canopy
        px(ctx, ox + sx, oy, 4, 4, 2, 2, isCherry ? '#fdf2f8' : '#ffffff', s);
        px(ctx, ox + sx, oy, 9, 3, 2, 2, isCherry ? '#fbcfe8' : '#fef2f2', s);
        px(ctx, ox + sx, oy, 7, 6, 2, 2, isCherry ? '#fdf2f8' : '#ffffff', s);
      }

      if (tile.entity.ready) {
        // Plump ripe fruits hanging on branches!
        px(ctx, ox + sx, oy, 3, 5, 2, 2, item.accentColor, s);
        px(ctx, ox + sx, oy, 7, 3, 2, 2, item.accentColor, s);
        px(ctx, ox + sx, oy, 10, 6, 2, 2, item.accentColor, s);
        px(ctx, ox + sx, oy, 6, 7, 2, 2, item.accentColor, s);
        if (Math.floor(tick / 12 + tile.x) % 2 === 0) {
          px(ctx, ox, oy, 12, 1, 2, 2, '#fef08a', s);
        }
      }
    }
  } else if (tile.entity.category === 'decoration') {
    const nFence = Boolean(tiles?.[tile.y - 1]?.[tile.x]?.entity && isFenceLike(tiles[tile.y - 1][tile.x].entity?.itemId));
    const sFence = Boolean(tiles?.[tile.y + 1]?.[tile.x]?.entity && isFenceLike(tiles[tile.y + 1][tile.x].entity?.itemId));
    const eFence = Boolean(tiles?.[tile.y]?.[tile.x + 1]?.entity && isFenceLike(tiles[tile.y][tile.x + 1].entity?.itemId));
    const wFence = Boolean(tiles?.[tile.y]?.[tile.x - 1]?.entity && isFenceLike(tiles[tile.y][tile.x - 1].entity?.itemId));

    if (item.id === 'fence') {
      // Base shadow
      px(ctx, ox, oy, 5, 13, 6, 2, 'rgba(0,0,0,0.18)', s);

      // North / South vertical rail extensions
      if (nFence) {
        px(ctx, ox, oy, 6, 0, 4, 5, '#78350f', s);
        px(ctx, ox, oy, 7, 0, 2, 5, '#b45309', s);
      }
      if (sFence) {
        px(ctx, ox, oy, 6, 12, 4, 4, '#78350f', s);
        px(ctx, ox, oy, 7, 12, 2, 4, '#b45309', s);
      }

      // West / East horizontal rails
      if (wFence) {
        px(ctx, ox, oy, 0, 6, 6, 2, '#92400e', s);
        px(ctx, ox, oy, 0, 6, 6, 1, '#d97706', s);
        px(ctx, ox, oy, 0, 10, 6, 2, '#92400e', s);
        px(ctx, ox, oy, 0, 10, 6, 1, '#b45309', s);
      }
      if (eFence) {
        px(ctx, ox, oy, 10, 6, 6, 2, '#92400e', s);
        px(ctx, ox, oy, 10, 6, 6, 1, '#d97706', s);
        px(ctx, ox, oy, 10, 10, 6, 2, '#92400e', s);
        px(ctx, ox, oy, 10, 10, 6, 1, '#b45309', s);
      }

      // Standalone fence gets small stub rails so it looks clearly like a fence post
      if (!nFence && !sFence && !eFence && !wFence) {
        px(ctx, ox, oy, 3, 6, 10, 2, '#b45309', s);
        px(ctx, ox, oy, 3, 10, 10, 2, '#b45309', s);
      }

      // Central sturdy fence post
      px(ctx, ox, oy, 6, 3, 4, 11, '#78350f', s);
      px(ctx, ox, oy, 7, 4, 2, 9, '#92400e', s);
      px(ctx, ox, oy, 6, 2, 4, 2, '#b45309', s);
      px(ctx, ox, oy, 7, 2, 2, 1, '#d97706', s);
    } else if (item.id === 'fence_gate') {
      const verticalGate = (nFence || sFence) && !eFence && !wFence;
      px(ctx, ox, oy, 3, 13, 10, 2, 'rgba(0,0,0,0.18)', s);
      if (verticalGate) {
        if (nFence) {
          px(ctx, ox, oy, 6, 0, 4, 3, '#78350f', s);
          px(ctx, ox, oy, 7, 0, 2, 3, '#b45309', s);
        }
        if (sFence) {
          px(ctx, ox, oy, 6, 13, 4, 3, '#78350f', s);
          px(ctx, ox, oy, 7, 13, 2, 3, '#b45309', s);
        }
        px(ctx, ox, oy, 5, 2, 6, 3, '#78350f', s);
        px(ctx, ox, oy, 5, 11, 6, 3, '#78350f', s);
        px(ctx, ox, oy, 6, 4, 4, 8, '#d97706', s);
        px(ctx, ox, oy, 7, 5, 2, 6, '#f59e0b', s);
        px(ctx, ox, oy, 8, 7, 2, 2, '#fef08a', s); // brass latch
      } else {
        if (wFence) {
          px(ctx, ox, oy, 0, 6, 2, 2, '#92400e', s);
          px(ctx, ox, oy, 0, 10, 2, 2, '#92400e', s);
        }
        if (eFence) {
          px(ctx, ox, oy, 14, 6, 2, 2, '#92400e', s);
          px(ctx, ox, oy, 14, 10, 2, 2, '#92400e', s);
        }
        // Two gate posts
        px(ctx, ox, oy, 1, 3, 3, 11, '#78350f', s);
        px(ctx, ox, oy, 12, 3, 3, 11, '#78350f', s);
        // Lighter golden-oak gate planks + cross brace + brass latch
        px(ctx, ox, oy, 4, 6, 8, 2, '#d97706', s);
        px(ctx, ox, oy, 4, 6, 8, 1, '#f59e0b', s);
        px(ctx, ox, oy, 4, 10, 8, 2, '#d97706', s);
        px(ctx, ox, oy, 4, 10, 8, 1, '#f59e0b', s);
        px(ctx, ox, oy, 5, 5, 2, 8, '#b45309', s);
        px(ctx, ox, oy, 9, 5, 2, 8, '#b45309', s);
        px(ctx, ox, oy, 10, 8, 2, 2, '#fef08a', s); // brass latch
      }
    } else if (item.id === 'flowerbed') {
      px(ctx, ox, oy, 2, 9, 12, 5, '#65a30d', s);
      px(ctx, ox, oy, 3, 6, 3, 3, '#ec4899', s);
      px(ctx, ox, oy, 7, 5, 3, 3, '#facc15', s);
      px(ctx, ox, oy, 10, 7, 3, 3, '#a855f7', s);
    } else if (item.id === 'lantern') {
      if (highGraphics && shadowSpec?.active) {
        px(ctx, ox, oy, 5 + sunDx * 0.5, 13 + sunDy * 0.5, 6, 2, `rgba(0,0,0,${sunAlpha.toFixed(2)})`, s);
      }
      px(ctx, ox, oy, 7, 6, 2, 8, '#334155', s);
      px(ctx, ox, oy, 5, 13, 6, 2, '#1e293b', s);
      px(ctx, ox, oy, 5, 2, 6, 4, '#f59e0b', s);
      px(ctx, ox, oy, 6, 3, 4, 2, nightFactor > 0.25 ? '#fef9c3' : '#fef08a', s);
      // Warm glow (brightens smoothly at dusk and full-moon night)
      const lanternAlpha = 0.2 + nightFactor * 0.3;
      const lanternRadius = tilePx * (0.65 + nightFactor * 0.65);
      ctx.fillStyle = `rgba(251, 191, 36, ${lanternAlpha.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(ox + tilePx / 2, oy + tilePx * 0.35, lanternRadius, 0, Math.PI * 2);
      ctx.fill();
      if (nightFactor > 0.25) {
        ctx.fillStyle = `rgba(254, 240, 138, ${(nightFactor * 0.24).toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(ox + tilePx / 2, oy + tilePx * 0.35, tilePx * 0.42, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (item.id === 'scarecrow') {
      if (highGraphics && shadowSpec?.active) {
        px(ctx, ox, oy, 5 + sunDx * 0.7, 13 + sunDy * 0.7, 6, 2, `rgba(0,0,0,${sunAlpha.toFixed(2)})`, s);
      }
      px(ctx, ox, oy, 7, 5, 2, 10, '#78350f', s); // post
      px(ctx, ox, oy, 3, 7, 10, 2, '#78350f', s); // arms
      px(ctx, ox, oy, 5, 6, 6, 5, '#3b82f6', s); // shirt
      if (highGraphics) px(ctx, ox, oy, 5, 6, 6, 1, '#60a5fa', s);
      px(ctx, ox, oy, 6, 3, 4, 3, '#fde047', s); // head
      px(ctx, ox, oy, 4, 2, 8, 1, '#d97706', s); // hat brim
      px(ctx, ox, oy, 6, 1, 4, 1, '#b45309', s);
    } else if (item.id === 'well') {
      if (highGraphics && shadowSpec?.active) {
        px(ctx, ox, oy, 3 + sunDx * 0.7, 13 + sunDy * 0.65, 10, 3, `rgba(0,0,0,${sunAlpha.toFixed(2)})`, s);
      }
      px(ctx, ox, oy, 3, 8, 10, 6, '#64748b', s);
      if (highGraphics) px(ctx, ox, oy, 3, 13, 10, 1, '#475569', s);
      px(ctx, ox, oy, 4, 9, 8, 2, '#38bdf8', s);
      px(ctx, ox, oy, 3, 3, 1, 5, '#78350f', s);
      px(ctx, ox, oy, 12, 3, 1, 5, '#78350f', s);
      px(ctx, ox, oy, 2, 2, 12, 2, '#991b1b', s);
      if (highGraphics) px(ctx, ox, oy, 3, 2, 10, 1, '#dc2626', s);
    } else if (item.id === 'appletree') {
      if (highGraphics && shadowSpec?.active) {
        px(ctx, ox, oy, 3 + sunDx * 0.8, 13 + sunDy * 0.7, 10, 3, `rgba(0,0,0,${sunAlpha.toFixed(2)})`, s);
      }
      px(ctx, ox, oy, 6, 9, 4, 6, '#78350f', s);
      px(ctx, ox, oy, 3, 2, 10, 8, '#16a34a', s);
      px(ctx, ox, oy, 4, 1, 8, 2, '#22c55e', s);
      if (highGraphics) px(ctx, ox, oy, 3, 9, 10, 1, '#15803d', s);
      px(ctx, ox, oy, 4, 4, 2, 2, '#ef4444', s);
      px(ctx, ox, oy, 10, 5, 2, 2, '#ef4444', s);
      px(ctx, ox, oy, 7, 3, 2, 2, '#ef4444', s);
    } else if (item.id === 'windmill') {
      if (highGraphics && shadowSpec?.active) {
        px(ctx, ox, oy, 4 + sunDx * 0.9, 13 + sunDy * 0.75, 9, 3, `rgba(0,0,0,${sunAlpha.toFixed(2)})`, s);
      }
      px(ctx, ox, oy, 4, 5, 8, 10, '#f1f5f9', s);
      if (highGraphics) px(ctx, ox, oy, 10, 5, 2, 10, '#cbd5e1', s);
      px(ctx, ox, oy, 5, 3, 6, 3, '#b91c1c', s);
      if (highGraphics) px(ctx, ox, oy, 6, 3, 4, 1, '#ef4444', s);
      px(ctx, ox, oy, 7, 11, 2, 4, '#78350f', s);
      // Rotating blades
      ctx.save();
      ctx.translate(ox + 8 * s, oy + 6 * s);
      ctx.rotate(tick * 0.03);
      ctx.fillStyle = '#92400e';
      ctx.fillRect(-1 * s, -6 * s, 2 * s, 12 * s);
      ctx.fillRect(-6 * s, -1 * s, 12 * s, 2 * s);
      ctx.restore();
    } else if (item.id === 'greenhouse_dome') {
      if (highGraphics && shadowSpec?.active) {
        px(ctx, ox, oy, 2 + sunDx * 0.75, 13 + sunDy * 0.65, 12, 3, `rgba(0,0,0,${sunAlpha.toFixed(2)})`, s);
      }
      px(ctx, ox, oy, 2, 6, 12, 8, '#047857', s);
      px(ctx, ox, oy, 3, 4, 10, 9, '#a7f3d0', s);
      if (highGraphics) px(ctx, ox, oy, 4, 5, 3, 3, '#ecfdf5', s);
      px(ctx, ox, oy, 4, 2, 8, 2, '#6ee7b7', s);
      px(ctx, ox, oy, 7, 9, 2, 5, '#065f46', s);
    } else if (item.id === 'sprinkler') {
      px(ctx, ox, oy, 5, 11, 6, 3, '#475569', s);
      px(ctx, ox, oy, 7, 6, 2, 6, '#94a3b8', s);
      px(ctx, ox, oy, 6, 4, 4, 3, '#0284c7', s);
      const sprayPhase = Math.floor(tick / 10) % 2;
      px(ctx, ox, oy, 4 - sprayPhase, 5, 2, 1, '#7dd3fc', s);
      px(ctx, ox, oy, 10 + sprayPhase, 5, 2, 1, '#7dd3fc', s);
      px(ctx, ox, oy, 3 - sprayPhase, 8, 1, 1, '#bae6fd', s);
      px(ctx, ox, oy, 12 + sprayPhase, 8, 1, 1, '#bae6fd', s);
    } else if (item.id === 'super_sprinkler') {
      px(ctx, ox, oy, 4, 11, 8, 3, '#78350f', s);
      px(ctx, ox, oy, 6, 6, 4, 6, '#d97706', s);
      px(ctx, ox, oy, 5, 3, 6, 4, '#facc15', s);
      px(ctx, ox, oy, 7, 4, 2, 2, '#0284c7', s);
      const sprayPhase = Math.floor(tick / 8) % 3;
      px(ctx, ox, oy, 3 - sprayPhase, 4, 2, 1, '#38bdf8', s);
      px(ctx, ox, oy, 11 + sprayPhase, 4, 2, 1, '#38bdf8', s);
      px(ctx, ox, oy, 2 - sprayPhase, 7, 1, 2, '#bae6fd', s);
      px(ctx, ox, oy, 13 + sprayPhase, 7, 1, 2, '#bae6fd', s);
    } else if (item.id === 'preserve_jar') {
      // Einmachkessel (copper cauldron over hearth)
      px(ctx, ox, oy, 4, 12, 8, 2, '#475569', s);
      px(ctx, ox, oy, 5, 13, 6, 1, '#f97316', s); // embers
      px(ctx, ox, oy, 3, 6, 10, 6, '#b45309', s);
      px(ctx, ox, oy, 4, 5, 8, 2, '#d97706', s);
      px(ctx, ox, oy, 5, 4, 6, 1, '#f59e0b', s);
      const steam = Math.floor(tick / 12) % 3;
      px(ctx, ox, oy, 6, 2 - steam, 1, 2, 'rgba(255,255,255,0.75)', s);
      px(ctx, ox, oy, 9, 1 - ((steam + 1) % 3), 1, 2, 'rgba(255,255,255,0.65)', s);
    } else if (item.id === 'bakery_oven') {
      // Stein-Backofen (brick dome oven with glowing hearth)
      px(ctx, ox, oy, 2, 11, 12, 4, '#57534e', s);
      px(ctx, ox, oy, 3, 5, 10, 7, '#78716c', s);
      px(ctx, ox, oy, 4, 3, 8, 3, '#a8a29e', s);
      px(ctx, ox, oy, 10, 1, 2, 3, '#57534e', s); // chimney
      px(ctx, ox, oy, 6, 7, 4, 5, '#1c1917', s); // oven mouth
      px(ctx, ox, oy, 7, 9, 2, 3, tick % 12 < 6 ? '#f97316' : '#facc15', s); // fire
    } else if (item.id === 'cheese_press') {
      // Hof-Käserei (wooden cheese press + golden wheel)
      px(ctx, ox, oy, 3, 12, 10, 2, '#78350f', s);
      px(ctx, ox, oy, 4, 4, 2, 8, '#92400e', s);
      px(ctx, ox, oy, 10, 4, 2, 8, '#92400e', s);
      px(ctx, ox, oy, 3, 3, 10, 2, '#b45309', s);
      px(ctx, ox, oy, 7, 1, 2, 4, '#64748b', s); // press screw
      px(ctx, ox, oy, 6, 8, 4, 4, '#facc15', s); // cheese wheel
      px(ctx, ox, oy, 7, 9, 2, 2, '#fef08a', s);
    } else if (item.id === 'fish_smoker') {
      // Räucherofen (smokehouse with chimney puffs)
      px(ctx, ox, oy, 4, 4, 8, 10, '#334155', s);
      px(ctx, ox, oy, 5, 5, 6, 8, '#475569', s);
      px(ctx, ox, oy, 3, 3, 10, 2, '#78350f', s);
      px(ctx, ox, oy, 6, 9, 4, 4, '#1e293b', s);
      px(ctx, ox, oy, 7, 11, 2, 2, '#fb923c', s); // embers
      px(ctx, ox, oy, 9, 1, 2, 2, '#1e293b', s);
      const puff = Math.floor(tick / 14) % 3;
      px(ctx, ox, oy, 9, -1 - puff, 2, 2, 'rgba(226,232,240,0.65)', s);
    } else if (item.id === 'brewery') {
      // Hof-Brauerei (copper brew kettle + oak beer barrel + foam steam)
      px(ctx, ox, oy, 2, 12, 12, 2, 'rgba(0,0,0,0.2)', s);
      // Copper kettle on left
      px(ctx, ox, oy, 2, 11, 7, 2, '#475569', s); // stone base
      px(ctx, ox, oy, 3, 12, 5, 1, tick % 12 < 6 ? '#f97316' : '#facc15', s); // hearth embers
      px(ctx, ox, oy, 2, 5, 7, 6, '#b45309', s); // copper pot
      px(ctx, ox, oy, 3, 4, 5, 2, '#d97706', s); // copper dome
      px(ctx, ox, oy, 4, 3, 3, 1, '#fbbf24', s); // brass rim
      // Oak barrel on right
      px(ctx, ox, oy, 10, 7, 4, 6, '#78350f', s);
      px(ctx, ox, oy, 10, 8, 4, 1, '#94a3b8', s); // iron hoop
      px(ctx, ox, oy, 10, 11, 4, 1, '#94a3b8', s);
      px(ctx, ox, oy, 11, 9, 2, 2, '#92400e', s);
      px(ctx, ox, oy, 13, 10, 1, 1, '#fbbf24', s); // brass tap
      const steam = Math.floor(tick / 12) % 3;
      px(ctx, ox, oy, 5, 1 - steam, 1, 2, 'rgba(254,243,199,0.8)', s);
    } else if (item.id === 'feast_kitchen') {
      // Festtags-Küche (rustic brick stove + copper roasting pot + sizzling pan + warm flame)
      px(ctx, ox, oy, 1, 13, 14, 2, 'rgba(0,0,0,0.22)', s);
      px(ctx, ox, oy, 2, 7, 12, 7, '#7c2d12', s); // brick hearth body
      px(ctx, ox, oy, 2, 6, 12, 2, '#b45309', s); // oak counter top
      px(ctx, ox, oy, 5, 10, 6, 4, '#1c1917', s); // fire opening
      px(ctx, ox, oy, 6, 11, 4, 3, tick % 10 < 5 ? '#f97316' : '#facc15', s); // hearth flames
      // Sizzling copper roast pot & skillet on top
      px(ctx, ox, oy, 3, 3, 5, 3, '#c2410c', s); // copper pot
      px(ctx, ox, oy, 4, 2, 3, 1, '#facc15', s); // golden lid
      px(ctx, ox, oy, 9, 4, 4, 2, '#334155', s); // cast-iron roast pan
      px(ctx, ox, oy, 10, 3, 2, 1, '#fca5a5', s); // roast highlight
      // Chimney & savory steam
      px(ctx, ox, oy, 11, 1, 2, 3, '#57534e', s);
      const steam = Math.floor(tick / 11) % 3;
      px(ctx, ox, oy, 5, 0 - steam, 1, 2, 'rgba(254,240,138,0.85)', s);
      px(ctx, ox, oy, 11, -1 - ((steam + 1) % 3), 1, 2, 'rgba(255,255,255,0.75)', s);
    } else if (item.id === 'wooden_bench') {
      // Gemütliche Holzbank
      px(ctx, ox, oy, 2, 12, 12, 2, 'rgba(0,0,0,0.18)', s);
      px(ctx, ox, oy, 3, 6, 10, 3, '#b45309', s);
      px(ctx, ox, oy, 3, 7, 10, 1, '#d97706', s);
      px(ctx, ox, oy, 2, 9, 12, 2, '#92400e', s);
      px(ctx, ox, oy, 3, 11, 2, 3, '#78350f', s);
      px(ctx, ox, oy, 11, 11, 2, 3, '#78350f', s);
    } else if (item.id === 'garden_pond') {
      // Seerosenteich
      px(ctx, ox, oy, 1, 3, 14, 10, '#64748b', s);
      px(ctx, ox, oy, 2, 4, 12, 8, '#0284c7', s);
      px(ctx, ox, oy, 3, 5, 10, 6, '#38bdf8', s);
      px(ctx, ox, oy, 4, 6, 3, 2, '#16a34a', s); // lily pad
      px(ctx, ox, oy, 5, 5, 2, 2, '#f472b6', s); // lotus flower
      px(ctx, ox, oy, 10, 8, 3, 2, '#22c55e', s);
      if (Math.floor(tick / 16) % 2 === 0) {
        px(ctx, ox, oy, 8, 6, 2, 1, '#e0f2fe', s);
      }
    } else if (item.id === 'bee_wagon') {
      // Bunter Bienenwagen
      px(ctx, ox, oy, 2, 5, 12, 7, '#facc15', s);
      px(ctx, ox, oy, 2, 4, 12, 2, '#b91c1c', s); // red roof
      px(ctx, ox, oy, 4, 7, 3, 3, '#d97706', s);
      px(ctx, ox, oy, 9, 7, 3, 3, '#d97706', s);
      px(ctx, ox, oy, 3, 12, 3, 3, '#451a03', s); // wheels
      px(ctx, ox, oy, 10, 12, 3, 3, '#451a03', s);
      const beeShift = Math.floor(tick / 8) % 3;
      px(ctx, ox, oy, 1 + beeShift, 3, 1, 1, '#fef08a', s);
    } else if (item.id === 'stone_path') {
      // Kopfstein-Gartenweg (begehbare Natursteinplatten)
      px(ctx, ox, oy, 2, 2, 5, 5, '#64748b', s);
      px(ctx, ox, oy, 3, 3, 3, 3, '#94a3b8', s);
      px(ctx, ox, oy, 9, 3, 5, 4, '#64748b', s);
      px(ctx, ox, oy, 10, 4, 3, 2, '#cbd5e1', s);
      px(ctx, ox, oy, 3, 9, 6, 5, '#64748b', s);
      px(ctx, ox, oy, 4, 10, 4, 3, '#94a3b8', s);
      px(ctx, ox, oy, 10, 9, 4, 4, '#475569', s);
      px(ctx, ox, oy, 11, 10, 2, 2, '#94a3b8', s);
    } else if (item.id === 'hay_bale') {
      // Goldener Strohballen
      px(ctx, ox, oy, 2, 12, 12, 2, 'rgba(0,0,0,0.18)', s);
      px(ctx, ox, oy, 2, 6, 12, 7, '#ca8a04', s);
      px(ctx, ox, oy, 3, 5, 10, 6, '#eab308', s);
      px(ctx, ox, oy, 4, 6, 8, 2, '#fde047', s);
      // Twine straps
      px(ctx, ox, oy, 5, 5, 1, 8, '#78350f', s);
      px(ctx, ox, oy, 10, 5, 1, 8, '#78350f', s);
      // Loose straw wisps
      px(ctx, ox, oy, 1, 9, 2, 1, '#fde047', s);
      px(ctx, ox, oy, 13, 10, 2, 1, '#facc15', s);
    } else if (item.id === 'water_trough') {
      // Hof-Tränke (rustikaler Wassertrog)
      px(ctx, ox, oy, 2, 12, 12, 2, 'rgba(0,0,0,0.2)', s);
      px(ctx, ox, oy, 2, 7, 12, 6, '#78350f', s);
      px(ctx, ox, oy, 3, 6, 10, 2, '#92400e', s);
      px(ctx, ox, oy, 3, 8, 10, 3, '#0284c7', s);
      px(ctx, ox, oy, 4, 9, 8, 1, '#7dd3fc', s);
      px(ctx, ox, oy, 4, 12, 2, 2, '#451a03', s);
      px(ctx, ox, oy, 10, 12, 2, 2, '#451a03', s);
      if (Math.floor(tick / 14) % 2 === 0) {
        px(ctx, ox, oy, 7, 8, 2, 1, '#e0f2fe', s);
      }
    } else if (item.id === 'wheelbarrow') {
      // Blumen-Schubkarre
      px(ctx, ox, oy, 3, 12, 10, 2, 'rgba(0,0,0,0.18)', s);
      px(ctx, ox, oy, 10, 10, 4, 4, '#292524', s); // wheel
      px(ctx, ox, oy, 11, 11, 2, 2, '#78716c', s);
      px(ctx, ox, oy, 2, 9, 3, 1, '#78350f', s); // handles
      px(ctx, ox, oy, 4, 7, 8, 5, '#b45309', s); // cart bed
      px(ctx, ox, oy, 5, 11, 2, 2, '#78350f', s); // leg
      // Flowers blooming inside
      px(ctx, ox, oy, 4, 5, 8, 3, '#22c55e', s);
      px(ctx, ox, oy, 5, 4, 2, 2, '#f472b6', s);
      px(ctx, ox, oy, 8, 4, 2, 2, '#facc15', s);
      px(ctx, ox, oy, 10, 5, 2, 2, '#a855f7', s);
    } else if (item.id === 'mailbox') {
      // Hof-Briefkasten & Wegweiser
      px(ctx, ox, oy, 6, 13, 4, 2, 'rgba(0,0,0,0.18)', s);
      px(ctx, ox, oy, 7, 7, 2, 7, '#78350f', s); // wooden post
      px(ctx, ox, oy, 4, 3, 8, 5, '#dc2626', s); // red mailbox
      px(ctx, ox, oy, 5, 2, 6, 2, '#ef4444', s);
      px(ctx, ox, oy, 5, 5, 3, 2, '#f8fafc', s); // letter slot
      px(ctx, ox, oy, 11, 4, 2, 2, '#facc15', s); // raised flag
      px(ctx, ox, oy, 3, 9, 10, 2, '#b45309', s); // wooden sign arrow
      px(ctx, ox, oy, 4, 9, 8, 1, '#fde68a', s);
    } else if (item.id === 'oak_barrel') {
      // Eichenfass-Ecke
      px(ctx, ox, oy, 2, 12, 12, 2, 'rgba(0,0,0,0.2)', s);
      // Left barrel
      px(ctx, ox, oy, 2, 6, 6, 7, '#92400e', s);
      px(ctx, ox, oy, 3, 5, 4, 1, '#b45309', s);
      px(ctx, ox, oy, 2, 7, 6, 1, '#475569', s);
      px(ctx, ox, oy, 2, 11, 6, 1, '#475569', s);
      // Right barrel
      px(ctx, ox, oy, 8, 7, 6, 6, '#78350f', s);
      px(ctx, ox, oy, 9, 6, 4, 1, '#b45309', s);
      px(ctx, ox, oy, 8, 8, 6, 1, '#475569', s);
      px(ctx, ox, oy, 8, 11, 6, 1, '#475569', s);
    } else if (item.id === 'campfire') {
      // Gemütliche Feuerstelle
      px(ctx, ox, oy, 2, 10, 12, 4, '#57534e', s); // stones
      px(ctx, ox, oy, 4, 9, 8, 4, '#78716c', s);
      px(ctx, ox, oy, 5, 10, 6, 2, '#78350f', s); // logs
      const flameBob = Math.floor(tick / 6) % 2;
      px(ctx, ox, oy, 6, 5 - flameBob, 4, 5 + flameBob, '#f97316', s);
      px(ctx, ox, oy, 7, 6 - flameBob, 2, 4, '#facc15', s);
      px(ctx, ox, oy, 7, 8, 2, 2, '#fef9c3', s);
      if (nightFactor > 0.25) {
        ctx.fillStyle = `rgba(249, 115, 22, ${(0.22 + nightFactor * 0.25).toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(ox + tilePx / 2, oy + tilePx * 0.55, tilePx * 0.72, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (item.id === 'cherry_tree') {
      // Kirschblütenbaum
      px(ctx, ox, oy, 5 + sunDx * 0.8, 13 + sunDy * 0.7, 6, 2, `rgba(0,0,0,${sunAlpha.toFixed(2)})`, s);
      px(ctx, ox, oy, 6, 9, 4, 5, '#78350f', s);
      px(ctx, ox + Math.round(sway * 0.4), oy, 2, 3, 12, 7, '#ec4899', s);
      px(ctx, ox + Math.round(sway * 0.4), oy, 3, 1, 10, 7, '#f472b6', s);
      px(ctx, ox + Math.round(sway * 0.4), oy, 5, 2, 6, 4, '#fbcfe8', s);
      px(ctx, ox + Math.round(sway * 0.4), oy, 4, 5, 2, 2, '#fdf2f8', s);
      px(ctx, ox + Math.round(sway * 0.4), oy, 10, 4, 2, 2, '#fdf2f8', s);
      const petal = Math.floor(tick / 14) % 3;
      px(ctx, ox, oy, 3 + petal, 10 + petal, 1, 1, '#fbcfe8', s);
    } else if (item.id === 'solar_conservatory') {
      // Sonnen-Orangerie (goldenes Glas-Gewächshaus)
      px(ctx, ox, oy, 1 + sunDx * 0.85, 13 + sunDy * 0.7, 14, 2, `rgba(0,0,0,${sunAlpha.toFixed(2)})`, s);
      px(ctx, ox, oy, 2, 6, 12, 8, '#065f46', s);
      px(ctx, ox, oy, 3, 4, 10, 9, '#fef08a', s);
      px(ctx, ox, oy, 4, 2, 8, 2, '#facc15', s);
      px(ctx, ox, oy, 7, 1, 2, 13, '#b45309', s);
      px(ctx, ox, oy, 3, 7, 10, 1, '#b45309', s);
      px(ctx, ox, oy, 5, 9, 2, 3, '#22c55e', s);
      px(ctx, ox, oy, 9, 9, 2, 3, '#a855f7', s);
    } else if (item.id === 'master_fountain') {
      // Brunnen der Weisen (weiß-blauer Marmor-Sprudelbrunnen)
      px(ctx, ox, oy, 1 + sunDx * 0.7, 12 + sunDy * 0.65, 14, 3, `rgba(0,0,0,${sunAlpha.toFixed(2)})`, s);
      px(ctx, ox, oy, 2, 9, 12, 5, '#cbd5e1', s);
      px(ctx, ox, oy, 3, 8, 10, 3, '#0284c7', s);
      px(ctx, ox, oy, 6, 4, 4, 6, '#e2e8f0', s);
      px(ctx, ox, oy, 5, 3, 6, 2, '#f8fafc', s);
      const jet = Math.floor(tick / 7) % 2;
      px(ctx, ox, oy, 7, 1 - jet, 2, 3 + jet, '#7dd3fc', s);
      px(ctx, ox, oy, 4 - jet, 6, 2, 2, '#bae6fd', s);
      px(ctx, ox, oy, 10 + jet, 6, 2, 2, '#bae6fd', s);
    } else if (item.id === 'golden_statue') {
      // Sonnental-Goldstatue
      px(ctx, ox, oy, 3 + sunDx * 0.85, 13 + sunDy * 0.7, 10, 2, `rgba(0,0,0,${sunAlpha.toFixed(2)})`, s);
      px(ctx, ox, oy, 4, 10, 8, 4, '#57534e', s);
      px(ctx, ox, oy, 5, 9, 6, 1, '#ca8a04', s);
      px(ctx, ox, oy, 6, 3, 4, 6, '#facc15', s);
      px(ctx, ox, oy, 7, 1, 2, 2, '#fef08a', s);
      px(ctx, ox, oy, 4, 5, 8, 2, '#eab308', s);
      if (Math.floor(tick / 10) % 2 === 0) {
        px(ctx, ox, oy, 5, 2, 1, 1, '#ffffff', s);
        px(ctx, ox, oy, 10, 4, 1, 1, '#ffffff', s);
      }
    } else if (item.id === 'fair_pennant') {
      // Dorffest-Wimpel (festive pole + waving colorful pennants)
      px(ctx, ox, oy, 6, 13, 4, 2, 'rgba(0,0,0,0.2)', s);
      px(ctx, ox, oy, 7, 2, 2, 12, '#78350f', s);
      px(ctx, ox, oy, 6, 1, 4, 1, '#facc15', s);
      const wave = Math.floor(tick / 10) % 2;
      px(ctx, ox, oy, 9, 2 + wave, 5, 2, '#ef4444', s);
      px(ctx, ox, oy, 9, 5 + wave, 4, 2, '#facc15', s);
      px(ctx, ox, oy, 9, 8 - wave, 4, 2, '#3b82f6', s);
    } else if (item.id === 'fair_beer_table') {
      // Festzelt-Biertisch (wooden table + white cloth + 2 beer mugs)
      px(ctx, ox, oy, 2, 12, 12, 2, 'rgba(0,0,0,0.2)', s);
      px(ctx, ox, oy, 2, 10, 12, 2, '#92400e', s); // bench
      px(ctx, ox, oy, 3, 6, 10, 4, '#78350f', s); // table
      px(ctx, ox, oy, 4, 5, 8, 3, '#f8fafc', s); // table runner
      px(ctx, ox, oy, 5, 3, 2, 3, '#f59e0b', s); // beer mug 1
      px(ctx, ox, oy, 5, 2, 2, 1, '#ffffff', s);
      px(ctx, ox, oy, 9, 3, 2, 3, '#f59e0b', s); // beer mug 2
      px(ctx, ox, oy, 9, 2, 2, 1, '#ffffff', s);
    } else if (item.id === 'fair_trophy') {
      // Goldener Ernte-Pokal (pedestal + gleaming gold chalice)
      px(ctx, ox, oy, 4, 13, 8, 2, 'rgba(0,0,0,0.24)', s);
      px(ctx, ox, oy, 4, 10, 8, 4, '#451a03', s);
      px(ctx, ox, oy, 6, 8, 4, 2, '#ca8a04', s);
      px(ctx, ox, oy, 4, 3, 8, 5, '#facc15', s);
      px(ctx, ox, oy, 2, 4, 2, 3, '#eab308', s); // left handle
      px(ctx, ox, oy, 12, 4, 2, 3, '#eab308', s); // right handle
      px(ctx, ox, oy, 6, 4, 2, 2, '#fef9c3', s);
      if (Math.floor(tick / 10) % 2 === 0) {
        px(ctx, ox, oy, 7, 1, 2, 2, '#ffffff', s);
      }
    } else if (item.id === 'xmas_tree') {
      // Leuchtender Weihnachtsbaum
      px(ctx, ox, oy, 4, 13, 8, 2, 'rgba(0,0,0,0.22)', s);
      px(ctx, ox, oy, 7, 11, 2, 3, '#78350f', s);
      px(ctx, ox, oy, 2, 9, 12, 3, '#166534', s);
      px(ctx, ox, oy, 3, 6, 10, 4, '#15803d', s);
      px(ctx, ox, oy, 5, 3, 6, 4, '#16a34a', s);
      px(ctx, ox, oy, 7, 1, 2, 2, '#facc15', s); // golden star
      const blink = Math.floor(tick / 10) % 2;
      px(ctx, ox, oy, 5, 10, 1, 1, '#ef4444', s);
      px(ctx, ox, oy, 10, 10, 1, 1, '#38bdf8', s);
      px(ctx, ox, oy, 6, 7, 1, 1, blink === 0 ? '#fef08a' : '#f43f5e', s);
      px(ctx, ox, oy, 9, 7, 1, 1, blink === 1 ? '#fef08a' : '#ef4444', s);
      px(ctx, ox, oy, 7, 4, 1, 1, '#fef08a', s);
    } else if (item.id === 'xmas_snowman') {
      // Fröhlicher Schneemann mit Schal & Zylinder
      px(ctx, ox, oy, 4, 13, 8, 2, 'rgba(0,0,0,0.18)', s);
      px(ctx, ox, oy, 4, 9, 8, 5, '#f8fafc', s); // bottom snowball
      px(ctx, ox, oy, 5, 5, 6, 5, '#f1f5f9', s); // middle torso
      px(ctx, ox, oy, 5, 8, 6, 1, '#dc2626', s); // red scarf
      px(ctx, ox, oy, 9, 9, 2, 2, '#dc2626', s);
      px(ctx, ox, oy, 6, 2, 4, 4, '#ffffff', s); // head
      px(ctx, ox, oy, 5, 2, 6, 1, '#1e293b', s); // top hat brim
      px(ctx, ox, oy, 6, 0, 4, 2, '#0f172a', s); // top hat crown
      px(ctx, ox, oy, 8, 4, 2, 1, '#f97316', s); // carrot nose
      px(ctx, ox, oy, 3, 6, 2, 1, '#78350f', s); // twig arms
      px(ctx, ox, oy, 11, 6, 2, 1, '#78350f', s);
    } else if (item.id === 'xmas_nutcracker') {
      // Nussknacker-Wächter
      px(ctx, ox, oy, 5, 13, 6, 2, 'rgba(0,0,0,0.2)', s);
      px(ctx, ox, oy, 5, 10, 6, 4, '#1e3a8a', s); // blue trousers & boots
      px(ctx, ox, oy, 5, 13, 2, 1, '#0f172a', s);
      px(ctx, ox, oy, 9, 13, 2, 1, '#0f172a', s);
      px(ctx, ox, oy, 4, 6, 8, 5, '#b91c1c', s); // red jacket
      px(ctx, ox, oy, 6, 7, 4, 2, '#facc15', s); // gold trim
      px(ctx, ox, oy, 6, 3, 4, 3, '#fde2c8', s); // face
      px(ctx, ox, oy, 6, 5, 4, 2, '#f8fafc', s); // white beard
      px(ctx, ox, oy, 5, 1, 6, 2, '#1e293b', s); // tall shako hat
      px(ctx, ox, oy, 7, 0, 2, 1, '#facc15', s);
    } else if (item.id === 'xmas_candy_lamp') {
      // Zuckerstangen-Laterne
      px(ctx, ox, oy, 5, 13, 6, 2, 'rgba(0,0,0,0.2)', s);
      px(ctx, ox, oy, 7, 3, 2, 11, '#f8fafc', s); // striped candy pole
      px(ctx, ox, oy, 7, 5, 2, 2, '#ef4444', s);
      px(ctx, ox, oy, 7, 9, 2, 2, '#ef4444', s);
      px(ctx, ox, oy, 7, 13, 2, 1, '#ef4444', s);
      px(ctx, ox, oy, 5, 2, 5, 2, '#ef4444', s); // hook curve
      px(ctx, ox, oy, 4, 3, 2, 3, '#fef08a', s); // hanging warm lantern
      px(ctx, ox, oy, 4, 2, 2, 1, '#b45309', s);
    } else if (item.id === 'xmas_gingerbread') {
      // Lebkuchenhäuschen
      px(ctx, ox, oy, 2, 13, 12, 2, 'rgba(0,0,0,0.2)', s);
      px(ctx, ox, oy, 3, 7, 10, 7, '#b45309', s); // gingerbread walls
      px(ctx, ox, oy, 2, 5, 12, 3, '#f8fafc', s); // thick white icing roof
      px(ctx, ox, oy, 4, 3, 8, 3, '#e2e8f0', s);
      px(ctx, ox, oy, 7, 10, 2, 4, '#78350f', s); // door
      px(ctx, ox, oy, 4, 9, 2, 2, nightFactor > 0.25 ? '#fde047' : '#bae6fd', s); // candy window
      px(ctx, ox, oy, 10, 9, 2, 2, nightFactor > 0.25 ? '#fde047' : '#bae6fd', s);
      px(ctx, ox, oy, 5, 6, 2, 1, '#f43f5e', s); // sugar heart
      px(ctx, ox, oy, 9, 6, 2, 1, '#22c55e', s);
    } else if (item.id === 'xmas_reindeer_arch') {
      // Rentier-Lichterbogen
      px(ctx, ox, oy, 2, 12, 12, 3, '#78350f', s); // wooden base
      px(ctx, ox, oy, 2, 7, 2, 5, '#d97706', s);
      px(ctx, ox, oy, 12, 7, 2, 5, '#d97706', s);
      px(ctx, ox, oy, 3, 5, 10, 2, '#f59e0b', s); // golden arch
      px(ctx, ox, oy, 5, 4, 6, 1, '#fbbf24', s);
      px(ctx, ox, oy, 6, 9, 4, 3, '#92400e', s); // reindeer center silhouette
      px(ctx, ox, oy, 9, 7, 2, 2, '#92400e', s);
      // Warm candle tips along arch
      const flicker = Math.floor(tick / 9) % 2;
      px(ctx, ox, oy, 3, 4 - flicker, 1, 1, '#fef08a', s);
      px(ctx, ox, oy, 6, 3, 1, 1, '#fef9c3', s);
      px(ctx, ox, oy, 9, 3, 1, 1, '#fef08a', s);
      px(ctx, ox, oy, 12, 4 - (1 - flicker), 1, 1, '#fef9c3', s);
    } else if (item.id === 'winter_greenhouse') {
      // Beheiztes Winter-Gewächshaus (ab Lvl 18)
      px(ctx, ox, oy, 1, 13, 14, 2, 'rgba(0,0,0,0.22)', s);
      px(ctx, ox, oy, 2, 11, 12, 3, '#78350f', s); // warm brick/timber base
      px(ctx, ox, oy, 2, 5, 12, 6, '#bae6fd', s); // clear glass walls
      px(ctx, ox, oy, 3, 3, 10, 3, '#e0f2fe', s); // glass gable roof
      px(ctx, ox, oy, 5, 1, 6, 2, '#f8fafc', s); // snow-dusted ridge
      px(ctx, ox, oy, 2, 5, 1, 6, '#e2e8f0', s); // timber glass ribs
      px(ctx, ox, oy, 7, 3, 2, 8, '#cbd5e1', s);
      px(ctx, ox, oy, 13, 5, 1, 6, '#e2e8f0', s);
      px(ctx, ox, oy, 4, 7, 2, 3, '#fde047', s); // warm glowing interior lantern + blooms
      px(ctx, ox, oy, 10, 8, 2, 2, '#22c55e', s);
      px(ctx, ox, oy, 10, 7, 2, 1, '#f43f5e', s);
    } else if (item.id === 'copper_sprinkler') {
      // Kupfer-Sprinkler (3x3)
      px(ctx, ox, oy, 4, 13, 8, 2, 'rgba(0,0,0,0.2)', s);
      px(ctx, ox, oy, 6, 9, 4, 4, '#9a3412', s);
      px(ctx, ox, oy, 5, 6, 6, 4, '#ea580c', s);
      px(ctx, ox, oy, 7, 4, 2, 3, '#fdba74', s);
      const sp = Math.floor(tick / 8) % 2;
      px(ctx, ox, oy, 3 - sp, 5, 2, 1, '#7dd3fc', s);
      px(ctx, ox, oy, 11 + sp, 5, 2, 1, '#7dd3fc', s);
    } else if (item.id === 'moon_sprinkler') {
      // Mondstein-Sprinkler (5x5 + Tempo)
      px(ctx, ox, oy, 4, 13, 8, 2, 'rgba(0,0,0,0.22)', s);
      px(ctx, ox, oy, 5, 9, 6, 4, '#334155', s);
      px(ctx, ox, oy, 6, 6, 4, 4, '#94a3b8', s);
      px(ctx, ox, oy, 6, 3, 4, 3, '#38bdf8', s);
      px(ctx, ox, oy, 7, 2, 2, 2, '#e0f2fe', s);
      const sp = Math.floor(tick / 7) % 3;
      px(ctx, ox, oy, 2 + (sp % 2), 6, 2, 1, '#bae6fd', s);
      px(ctx, ox, oy, 12 - (sp % 2), 6, 2, 1, '#bae6fd', s);
    } else if (item.id === 'crystal_lantern') {
      // Kristall-Laterne
      px(ctx, ox, oy, 5, 13, 6, 2, 'rgba(0,0,0,0.2)', s);
      px(ctx, ox, oy, 7, 7, 2, 7, '#475569', s);
      px(ctx, ox, oy, 5, 3, 6, 5, '#7c3aed', s);
      px(ctx, ox, oy, 6, 4, 4, 3, '#e9d5ff', s);
      px(ctx, ox, oy, 7, 1, 2, 2, '#cbd5e1', s);
    } else if (item.id === 'moonstone_obelisk') {
      // Mondstein-Obelisk
      px(ctx, ox, oy, 3, 13, 10, 2, 'rgba(0,0,0,0.25)', s);
      px(ctx, ox, oy, 4, 11, 8, 3, '#334155', s);
      px(ctx, ox, oy, 5, 5, 6, 6, '#475569', s);
      px(ctx, ox, oy, 6, 3, 4, 3, '#6366f1', s);
      const floatOff = Math.floor(tick / 14) % 2;
      px(ctx, ox, oy, 7, 1 - floatOff, 2, 2, '#7dd3fc', s);
      px(ctx, ox, oy, 7, 7, 2, 2, '#38bdf8', s);
    }
  }

  // Growth progress micro-bar when growing
  if (
    (tile.entity.category === 'crop' ||
      tile.entity.category === 'mushroom' ||
      tile.entity.category === 'animal' ||
      tile.entity.category === 'tree') &&
    !tile.entity.ready &&
    !tile.entity.damaged &&
    !tile.entity.withered
  ) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(ox + 6, oy + tilePx - 7, tilePx - 12, 4);
    ctx.fillStyle =
      tile.entity.category === 'mushroom' ? '#2dd4bf' : tile.entity.category === 'tree' ? '#facc15' : '#4ade80';
    ctx.fillRect(ox + 7, oy + tilePx - 6, Math.max(2, Math.floor((tilePx - 14) * progress)), 2);
  }

  // Needs water drop hint (+ urgent warning color when close to withering!)
  if (
    (tile.entity.category === 'crop' || tile.entity.category === 'mushroom') &&
    !tile.watered &&
    !tile.entity.ready &&
    !tile.entity.withered &&
    weather !== 'rainy' &&
    weather !== 'stormy'
  ) {
    const maxDry = tile.entity.category === 'mushroom' ? WITHER_MUSHROOM_DRY_MS : WITHER_CROP_DRY_MS;
    const dryRatio = (tile.dryMs ?? 0) / maxDry;
    const dropColor = dryRatio >= 0.72 ? '#ef4444' : dryRatio >= 0.4 ? '#f97316' : '#38bdf8';
    const blinkRate = dryRatio >= 0.72 ? 8 : 20;
    if (Math.floor(tick / blinkRate) % 2 === 0) {
      px(ctx, ox, oy, 12, 1, 2, 3, dropColor, s);
    }
  }
}

function drawRoamingAnimalSprite(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  tilePx: number,
  item: CatalogItem,
  ready: boolean,
  progress: number,
  facing: 'left' | 'right',
  tick: number,
  moveProgress: number,
  seedOffset: number,
  shadowDx = 0,
  shadowDy = 0,
  shadowAlpha = 0.2,
  highGraphics = false
) {
  const s = tilePx / 16;
  const isGliding = moveProgress < 1;
  const walkArc = isGliding ? -Math.sin(moveProgress * Math.PI) * 1.8 * s : 0;
  const idleHop = !isGliding && Math.sin(tick * 0.12 + seedOffset) > 0.7 ? -1 * s : 0;
  const bodyYOffset = walkArc + idleHop;

  // Ground shadow
  px(ctx, ox, oy, 4 + shadowDx * 0.45, 13 + shadowDy * 0.45, 8, 2, `rgba(0,0,0,${shadowAlpha.toFixed(2)})`, s);

  ctx.save();
  if (facing === 'left') {
    ctx.translate(ox + tilePx, oy);
    ctx.scale(-1, 1);
  } else {
    ctx.translate(ox, oy);
  }

  if (item.id === 'chicken') {
    px(ctx, 0, bodyYOffset, 5, 7, 6, 5, '#fef3c7', s);
    if (highGraphics) px(ctx, 0, bodyYOffset, 5, 11, 6, 1, '#fde68a', s);
    px(ctx, 0, bodyYOffset, 9, 5, 3, 3, '#fef3c7', s);
    px(ctx, 0, bodyYOffset, 10, 4, 2, 1, '#ef4444', s);
    px(ctx, 0, bodyYOffset, 12, 6, 1, 1, '#f59e0b', s);
    px(ctx, 0, walkArc * 0.3, 6, 12, 1, 2, '#f59e0b', s);
    px(ctx, 0, walkArc * 0.3, 9, 12, 1, 2, '#f59e0b', s);
  } else if (item.id === 'cow') {
    px(ctx, 0, bodyYOffset, 3, 6, 9, 6, '#f8fafc', s);
    if (highGraphics) px(ctx, 0, bodyYOffset, 3, 11, 9, 1, '#cbd5e1', s);
    px(ctx, 0, bodyYOffset, 5, 7, 3, 3, '#451a03', s);
    px(ctx, 0, bodyYOffset, 10, 4, 4, 4, '#f8fafc', s);
    px(ctx, 0, bodyYOffset, 11, 3, 1, 1, '#cbd5e1', s);
    px(ctx, 0, bodyYOffset, 12, 7, 2, 1, '#fda4af', s);
    px(ctx, 0, walkArc * 0.3, 4, 12, 2, 2, '#334155', s);
    px(ctx, 0, walkArc * 0.3, 10, 12, 2, 2, '#334155', s);
  } else if (item.id === 'sheep') {
    px(ctx, 0, bodyYOffset, 4, 6, 8, 6, '#f8fafc', s);
    px(ctx, 0, bodyYOffset, 3, 7, 10, 4, '#f1f5f9', s);
    if (highGraphics) px(ctx, 0, bodyYOffset, 4, 6, 8, 1, '#ffffff', s);
    px(ctx, 0, bodyYOffset, 10, 6, 3, 3, '#334155', s);
    px(ctx, 0, walkArc * 0.3, 5, 12, 1, 2, '#334155', s);
    px(ctx, 0, walkArc * 0.3, 10, 12, 1, 2, '#334155', s);
  } else if (item.id === 'goat') {
    px(ctx, 0, bodyYOffset, 4, 7, 8, 5, '#e7e5e4', s);
    px(ctx, 0, bodyYOffset, 10, 4, 3, 4, '#d6d3d1', s);
    px(ctx, 0, bodyYOffset, 10, 2, 1, 2, '#78716c', s);
    px(ctx, 0, bodyYOffset, 12, 2, 1, 2, '#78716c', s);
    px(ctx, 0, walkArc * 0.3, 5, 12, 1, 2, '#78716c', s);
    px(ctx, 0, walkArc * 0.3, 10, 12, 1, 2, '#78716c', s);
  } else if (item.id === 'pig') {
    px(ctx, 0, bodyYOffset, 4, 7, 8, 5, '#fda4af', s);
    if (highGraphics) px(ctx, 0, bodyYOffset, 4, 11, 8, 1, '#fb7185', s);
    px(ctx, 0, bodyYOffset, 11, 8, 3, 3, '#fb7185', s);
    px(ctx, 0, bodyYOffset, 3, 8, 1, 2, '#be123c', s);
    px(ctx, 0, walkArc * 0.3, 5, 12, 1, 2, '#be123c', s);
    px(ctx, 0, walkArc * 0.3, 10, 12, 1, 2, '#be123c', s);
  }

  ctx.restore();

  if (ready) {
    const floatY = Math.round(Math.sin(tick * 0.15 + seedOffset) * 2);
    px(ctx, ox, oy + floatY, 6, 0, 4, 4, '#fef08a', s);
    px(ctx, ox, oy + floatY, 7, 1, 2, 2, '#d97706', s);
  } else if (item.growthMs > 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(ox + 6, oy + tilePx - 7, tilePx - 12, 4);
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(ox + 7, oy + tilePx - 6, Math.max(2, Math.floor((tilePx - 14) * progress)), 2);
  }
}

export function drawRoamingAnimalsPass(
  ctx: CanvasRenderingContext2D,
  tiles: TileData[][],
  tilePx: number,
  tick: number,
  now: number,
  highGraphics = false,
  shadowSpec?: SunShadowSpec
) {
  const MOVE_MS = 420;
  const list: {
    vx: number;
    vy: number;
    tile: TileData;
    item: CatalogItem;
    t: number;
  }[] = [];

  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const tile = tiles[y]?.[x];
      const ent = tile?.entity;
      if (!tile || !ent || ent.category !== 'animal' || !isRoamingAnimal(ent.itemId)) continue;
      const item = CATALOG_BY_ID[ent.itemId];
      if (!item) continue;
      const t = ent.movedAt ? Math.max(0, Math.min(1, (now - ent.movedAt) / MOVE_MS)) : 1;
      const isGliding = t < 1 && ent.moveFromX !== undefined && ent.moveFromY !== undefined;
      const vx = isGliding ? ent.moveFromX! + (tile.x - ent.moveFromX!) * t : tile.x;
      const vy = isGliding ? ent.moveFromY! + (tile.y - ent.moveFromY!) * t : tile.y;
      list.push({ vx, vy, tile, item, t });
    }
  }

  list.sort((a, b) => a.vy - b.vy || a.vx - b.vx);

  const sDx = highGraphics && shadowSpec?.active ? shadowSpec.dx : 0;
  const sDy = highGraphics && shadowSpec?.active ? shadowSpec.dy : 0;
  const sAlpha = highGraphics && shadowSpec?.active ? shadowSpec.alpha : 0.2;

  for (const entry of list) {
    const ent = entry.tile.entity!;
    const progress = entry.item.growthMs > 0 ? Math.min(1, ent.progressMs / entry.item.growthMs) : 1;
    drawRoamingAnimalSprite(
      ctx,
      Math.round(entry.vx * tilePx),
      Math.round(entry.vy * tilePx),
      tilePx,
      entry.item,
      ent.ready,
      progress,
      ent.facing ?? 'right',
      tick,
      entry.t,
      entry.tile.x * 2 + entry.tile.y,
      sDx,
      sDy,
      sAlpha,
      highGraphics
    );
  }
}

export function drawWildFlyAgaric(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  tilePx: number,
  tick: number
) {
  const s = tilePx / 16;
  const bob = Math.sin(tick * 0.09) > 0.65 ? -0.4 * s : 0;

  // Soft mystic glow underneath so it's easy to spot on green meadow
  const glowAlpha = 0.16 + Math.sin(tick * 0.08) * 0.06;
  ctx.fillStyle = `rgba(248, 113, 113, ${glowAlpha.toFixed(2)})`;
  ctx.beginPath();
  ctx.arc(ox + tilePx / 2, oy + tilePx * 0.56, tilePx * 0.42, 0, Math.PI * 2);
  ctx.fill();

  // Ground shadow
  px(ctx, ox, oy, 5, 13, 6, 2, 'rgba(0,0,0,0.22)', s);

  // Creamy stem & collar
  px(ctx, ox, oy + bob, 6, 8, 4, 5, '#fafaf9', s);
  px(ctx, ox, oy + bob, 5, 9, 6, 1, '#e7e5e4', s);

  // Iconic bright red Fly Agaric cap
  px(ctx, ox, oy + bob, 3, 5, 10, 4, '#dc2626', s);
  px(ctx, ox, oy + bob, 4, 3, 8, 2, '#ef4444', s);
  px(ctx, ox, oy + bob, 5, 2, 6, 1, '#ef4444', s);

  // Crisp white spots
  px(ctx, ox, oy + bob, 5, 4, 2, 1, '#ffffff', s);
  px(ctx, ox, oy + bob, 9, 4, 2, 1, '#ffffff', s);
  px(ctx, ox, oy + bob, 4, 6, 1, 2, '#ffffff', s);
  px(ctx, ox, oy + bob, 7, 6, 2, 1, '#ffffff', s);
  px(ctx, ox, oy + bob, 11, 6, 1, 1, '#ffffff', s);

  // Subtle floating sparkle
  if (Math.floor(tick / 18) % 2 === 0) {
    px(ctx, ox, oy, 12, 2, 1, 1, '#fef08a', s);
  }
}

export function drawUfoAbduction(
  ctx: CanvasRenderingContext2D,
  tilePx: number,
  farmOriginPx: number,
  anim: UfoAbductionAnimation,
  tick: number,
  now: number
) {
  const p = Math.max(0, Math.min(1, (now - anim.startedAt) / anim.durationMs));
  const s = Math.max(2, tilePx / 16);
  const targetOx = farmOriginPx + anim.x * tilePx;
  const targetOy = farmOriginPx + anim.y * tilePx;
  const hoverX = targetOx;
  const hoverY = targetOy - tilePx * 2.35;

  // UFO trajectory: 0..0.22 fly in, 0.22..0.78 beam cow up, 0.78..1.0 zip away!
  let ufoOx = hoverX;
  let ufoOy = hoverY;
  if (p < 0.22) {
    const t = 1 - Math.pow(1 - p / 0.22, 2);
    ufoOx = hoverX - tilePx * 4.5 * (1 - t);
    ufoOy = hoverY - tilePx * 3.2 * (1 - t);
  } else if (p <= 0.78) {
    ufoOx = hoverX + Math.sin(tick * 0.18) * s * 1.2;
    ufoOy = hoverY + Math.cos(tick * 0.24) * s * 0.9;
  } else {
    const t = Math.pow((p - 0.78) / 0.22, 2);
    ufoOx = hoverX + tilePx * 6.0 * t;
    ufoOy = hoverY - tilePx * 5.0 * t;
  }

  // Tractor beam & Beaming Cow during phase 0.20..0.78
  if (p >= 0.2 && p <= 0.78) {
    const beamProgress = Math.max(0, Math.min(1, (p - 0.22) / 0.54));
    const beamTopX = ufoOx + 8 * s;
    const beamTopY = ufoOy + 11 * s;
    const beamBotY = targetOy + 13 * s;

    // Translucent cyan tractor beam cone
    ctx.save();
    const beamAlpha = p < 0.25 ? ((p - 0.2) / 0.05) * 0.34 : p > 0.74 ? ((0.78 - p) / 0.04) * 0.34 : 0.34;
    ctx.fillStyle = `rgba(34, 211, 238, ${Math.max(0.05, beamAlpha).toFixed(2)})`;
    ctx.beginPath();
    ctx.moveTo(beamTopX - 4 * s, beamTopY);
    ctx.lineTo(beamTopX + 4 * s, beamTopY);
    ctx.lineTo(targetOx + 16 * s, beamBotY);
    ctx.lineTo(targetOx, beamBotY);
    ctx.closePath();
    ctx.fill();

    // Animated rising tractor-beam rings
    for (let i = 0; i < 4; i++) {
      const ringPhase = (1 - ((tick * 0.04 + i * 0.25) % 1));
      const ry = beamTopY + (beamBotY - beamTopY) * ringPhase;
      const halfW = (4 + ringPhase * 5.5) * s;
      ctx.fillStyle = 'rgba(165, 243, 252, 0.55)';
      ctx.fillRect(Math.floor(beamTopX - halfW), Math.floor(ry), Math.ceil(halfW * 2), Math.max(2, Math.round(s)));
    }
    ctx.restore();

    // Cow being lifted into the UFO!
    if (beamProgress < 0.98) {
      const cowScale = s * Math.max(0.35, 1 - beamProgress * 0.62);
      const cowCenterX = targetOx + 8 * s + Math.sin(tick * 0.45) * 2.5 * s * (1 - beamProgress * 0.5);
      const cowTopY = targetOy + (beamTopY - targetOy - 4 * s) * beamProgress;
      const cowOx = cowCenterX - 8 * cowScale;

      px(ctx, cowOx, cowTopY, 3, 6, 9, 6, '#f8fafc', cowScale);
      px(ctx, cowOx, cowTopY, 5, 7, 3, 3, '#451a03', cowScale);
      px(ctx, cowOx, cowTopY, 10, 4, 4, 4, '#f8fafc', cowScale);
      px(ctx, cowOx, cowTopY, 11, 3, 1, 1, '#cbd5e1', cowScale);
      px(ctx, cowOx, cowTopY, 12, 7, 2, 1, '#fda4af', cowScale);
      px(ctx, cowOx, cowTopY, 4, 12, 2, 2, '#334155', cowScale);
      px(ctx, cowOx, cowTopY, 10, 12, 2, 2, '#334155', cowScale);
    }
  } else if (p < 0.2) {
    // Nervous cow still standing on the tile as UFO approaches
    const shake = Math.sin(tick * 0.9) * s * 0.6;
    px(ctx, targetOx, targetOy, 4, 13, 8, 2, 'rgba(0,0,0,0.2)', s);
    px(ctx, targetOx + shake, targetOy, 3, 6, 9, 6, '#f8fafc', s);
    px(ctx, targetOx + shake, targetOy, 5, 7, 3, 3, '#451a03', s);
    px(ctx, targetOx + shake, targetOy, 10, 4, 4, 4, '#f8fafc', s);
    px(ctx, targetOx + shake, targetOy, 11, 3, 1, 1, '#cbd5e1', s);
    px(ctx, targetOx + shake, targetOy, 12, 7, 2, 1, '#fda4af', s);
    px(ctx, targetOx, targetOy, 4, 12, 2, 2, '#334155', s);
    px(ctx, targetOx, targetOy, 10, 12, 2, 2, '#334155', s);
  }

  // Pixel UFO Saucer!
  const ufoScale = s * 1.35;
  const ux = ufoOx - 2.5 * s;
  const uy = ufoOy;
  // Shadow/glow under UFO
  ctx.fillStyle = 'rgba(34, 211, 238, 0.26)';
  ctx.beginPath();
  ctx.ellipse(ux + 8 * ufoScale, uy + 10 * ufoScale, 9 * ufoScale, 3.2 * ufoScale, 0, 0, Math.PI * 2);
  ctx.fill();

  // Glass dome + tiny green alien pilot
  px(ctx, ux, uy, 5, 2, 6, 4, '#67e8f9', ufoScale);
  px(ctx, ux, uy, 7, 3, 2, 2, '#4ade80', ufoScale);
  // Metallic saucer body
  px(ctx, ux, uy, 2, 6, 12, 3, '#cbd5e1', ufoScale);
  px(ctx, ux, uy, 0, 7, 16, 2, '#94a3b8', ufoScale);
  px(ctx, ux, uy, 4, 9, 8, 2, '#475569', ufoScale);
  // Blinking rim lights
  const lightColors = ['#fef08a', '#22d3ee', '#f43f5e', '#4ade80'];
  for (let i = 0; i < 4; i++) {
    const col = lightColors[(i + Math.floor(tick / 5)) % lightColors.length];
    px(ctx, ux, uy, 2 + i * 3 + 1, 7, 1, 1, col, ufoScale);
  }
}

export function getRiverRegionForWy(wy: number): FishingRegionId {
  if (wy <= 9) return 'north';
  if (wy <= 17) return 'middle';
  return 'south';
}

export function drawValleyWorld(
  ctx: CanvasRenderingContext2D,
  tilePx: number,
  season: Season,
  tick: number,
  regionDensity?: Record<FishingRegionId, FishDensity>,
  nightFactor = 0,
  isHoverMine = false,
  themePark?: ThemeParkState,
  isHoverThemePark = false,
  highGraphics = false,
  weather: WeatherType = 'sunny',
  shadowSpec?: SunShadowSpec
) {
  const s = tilePx / 16;
  const colors = getSeasonGrassColors(season);
  const windMult =
    weather === 'stormy' ? 2.1 : weather === 'windy' ? 1.65 : weather === 'rainy' ? 1.2 : 1.0;

  const flowerPalettes: Record<Season, string[]> = {
    spring: ['#facc15', '#f472b6', '#ffffff', '#fb7185', '#60a5fa', '#c084fc'],
    summer: ['#facc15', '#ef4444', '#f97316', '#38bdf8', '#ec4899', '#fef08a'],
    autumn: ['#f59e0b', '#ea580c', '#fbbf24', '#a855f7', '#fef3c7', '#dc2626'],
    winter: ['#e0f2fe', '#93c5fd', '#f8fafc', '#fda4af', '#bae6fd', '#fde68a'],
  };
  const fColors = flowerPalettes[season];

  for (let wy = 0; wy < WORLD_SIZE; wy++) {
    for (let wx = -29; wx < WORLD_SIZE; wx++) {
      // Skip interior farm area (drawn separately with tiles)
      const inFarm =
        wx >= WORLD_MARGIN &&
        wx < WORLD_MARGIN + GRID_SIZE &&
        wy >= WORLD_MARGIN &&
        wy < WORLD_MARGIN + GRID_SIZE;
      if (inFarm) continue;

      const ox = wx * tilePx;
      const oy = wy * tilePx;
      const checker = (wx + wy + 100) % 2 === 0;

      // Winding river along the bottom-right / east valley edge (flowing in from north village)
      const isEastRiver = wx === WORLD_SIZE - 2 && wy >= 0 && wy <= WORLD_SIZE - 2;
      const isRiver =
        isEastRiver ||
        (wy === WORLD_SIZE - 2 && wx >= 4 && wx <= WORLD_SIZE - 2);

      // Cobblestone village path leading from north village gate (wx=7..8, wy=0..2), farmhouse road (wx=3..8, wy=3),
      // Hofladen (wx=3, wy=4..6), south bridge, AND Theme Park North/East connectors!
      const isParkConnector =
        ((wx === -9 || wx === -8) && wy === 0) ||
        (wy === 7 && wx >= -1 && wx <= 3);
      const isVillageRoad =
        ((wx === 7 || wx === 8) && wy >= 0 && wy <= 2) ||
        (wy === 3 && wx >= 3 && wx <= WORLD_MARGIN + 4) ||
        (wx === 3 && wy >= 4 && wy <= 6) ||
        (wx === 14 && wy >= WORLD_SIZE - 4 && wy < WORLD_SIZE) ||
        isParkConnector;

      if (isRiver) {
        ctx.fillStyle = highGraphics ? (checker ? '#0284c7' : '#0369a1') : '#0284c7';
        ctx.fillRect(ox, oy, tilePx, tilePx);
        if (highGraphics) {
          // Sandy / grassy shoreline rim on river banks
          if (isEastRiver) {
            px(ctx, ox, oy, 0, 0, 2, 16, season === 'winter' ? '#cbd5e1' : '#a8a29e', s);
            px(ctx, ox, oy, 2, 0, 1, 16, '#0ea5e9', s);
          } else {
            px(ctx, ox, oy, 0, 0, 16, 2, season === 'winter' ? '#cbd5e1' : '#a8a29e', s);
            px(ctx, ox, oy, 0, 2, 16, 1, '#0ea5e9', s);
          }
        }
        // Animated water shimmer (+ silvery full-moon reflections at night)
        const wave = Math.floor(tick / 18 + wx + wy) % 3;
        px(ctx, ox, oy, 2 + wave * 3, 5, 5, 1, nightFactor > 0.35 ? '#e0f2fe' : '#7dd3fc', s);
        px(ctx, ox, oy, 8 - wave * 2, 11, 4, 1, nightFactor > 0.35 ? '#f8fafc' : '#bae6fd', s);
        if (highGraphics) {
          const sunGlint = Math.sin(tick * 0.09 + wx * 1.4 + wy * 0.9) > 0.55;
          if (sunGlint && nightFactor <= 0.35) {
            px(ctx, ox, oy, 4 + ((wx + wy) % 7), 7, 2, 1, '#f0f9ff', s);
          }
          // Cattails / reeds on quiet east river shore away from fishing docks & bridge
          const nearDock = wy === 6 || wy === 13 || wy === 20 || wy === WORLD_SIZE - 2;
          if (isEastRiver && !nearDock && wy % 4 === 2) {
            const reedSway = Math.round(Math.sin(tick * (0.08 * windMult) + wy) * 0.6);
            px(ctx, ox, oy, 1, 6, 1, 8, '#15803d', s);
            px(ctx, ox + reedSway, oy, 2, 4, 1, 6, '#16a34a', s);
            px(ctx, ox + reedSway, oy, 2, 3, 1, 2, '#78350f', s);
          }
        }
        if (nightFactor > 0.45 && (wx + wy) % 2 === 0) {
          px(ctx, ox, oy, 5 + (wave % 2) * 3, 8, 3, 1, `rgba(248, 250, 252, ${(nightFactor * 0.65).toFixed(2)})`, s);
        }

        // Wooden bridge across the river on the south village road
        if (wx === 14 && wy === WORLD_SIZE - 2) {
          px(ctx, ox, oy, 0, 2, 16, 12, '#92400e', s);
          px(ctx, ox, oy, 1, 3, 14, 10, '#b45309', s);
          if (highGraphics) {
            for (let pxPlank = 2; pxPlank <= 13; pxPlank += 3) {
              px(ctx, ox, oy, pxPlank, 3, 1, 10, '#92400e', s);
            }
          }
          px(ctx, ox, oy, 0, 2, 16, 2, '#78350f', s);
          px(ctx, ox, oy, 0, 12, 16, 2, '#78350f', s);
        } else if (isEastRiver && regionDensity) {
          // Animated fish silhouettes & ripples per river region!
          const region = getRiverRegionForWy(wy);
          const density = regionDensity[region];
          const phase = (tick + wy * 19) % 90;

          if (density === 'high') {
            // Multiple visible fish & bright splash rings
            const swimX = 3 + Math.round(Math.sin(tick * 0.08 + wy) * 3 + 3);
            px(ctx, ox, oy, swimX, 7, 4, 2, '#0c4a6e', s);
            px(ctx, ox, oy, swimX - 1, 7, 1, 2, '#0c4a6e', s);
            if ((wy + Math.floor(tick / 30)) % 3 === 0) {
              const jumpY = phase < 25 ? -Math.round(Math.sin((phase / 25) * Math.PI) * 4) : 0;
              px(ctx, ox, oy + jumpY * s, 9, 5, 3, 2, '#bae6fd', s);
              px(ctx, ox, oy, 8, 6, 5, 1, '#e0f2fe', s);
            }
          } else if (density === 'medium') {
            if (wy % 2 === 0) {
              const swimX = 4 + Math.round(Math.cos(tick * 0.06 + wy) * 2 + 2);
              px(ctx, ox, oy, swimX, 9, 3, 2, '#075985', s);
              if (phase < 24) {
                px(ctx, ox, oy, 5, 9, 4, 1, '#bae6fd', s);
              }
            }
          } else if (density === 'low') {
            if (wy % 3 === 0 && phase < 18) {
              px(ctx, ox, oy, 6, 8, 3, 1, '#7dd3fc', s);
            }
          }
        }
        continue;
      }

      if (isVillageRoad) {
        ctx.fillStyle = '#c8b496';
        ctx.fillRect(ox, oy, tilePx, tilePx);
        px(ctx, ox, oy, 2, 2, 5, 4, '#b39e7f', s);
        px(ctx, ox, oy, 9, 9, 5, 4, '#b39e7f', s);
        if (highGraphics) {
          px(ctx, ox, oy, 3, 2, 3, 1, '#dfd0b8', s);
          px(ctx, ox, oy, 10, 9, 3, 1, '#dfd0b8', s);
        }
        continue;
      }

      // Valley meadow grass
      ctx.fillStyle = checker ? colors.locked : season === 'winter' ? '#6d7f94' : '#325925';
      if (season === 'autumn') ctx.fillStyle = checker ? '#5b5124' : '#4f461f';
      ctx.fillRect(ox, oy, tilePx, tilePx);

      // Reserve clean meadow around the Farmhouse footprint (wx 1..4, wy 1..3), Hofladen lot (wx 1..2, wy 4..6), and Waldmine lot (wx 1..3, wy 11..12)
      const inHouseLot = wx >= 1 && wx <= 4 && wy >= 1 && wy <= 3;
      const inShopLot = wx >= 1 && wx <= 2 && wy >= 4 && wy <= 6;
      const inMineLot = wx >= 1 && wx <= 3 && wy >= 11 && wy <= 12;
      if (inHouseLot || inShopLot || inMineLot) {
        ctx.fillStyle = checker ? colors.base : colors.alt;
        ctx.fillRect(ox, oy, tilePx, tilePx);
        // Tiny decorative flower border right next to house lot
        if (inHouseLot && wx === 4 && (wy === 1 || wy === 2)) {
          px(ctx, ox, oy, 11, 4, 2, 2, fColors[0], s);
          px(ctx, ox, oy, 11, 10, 2, 2, fColors[1], s);
        }
        // Small cobblestone welcome doorstep in front of Hofladen
        if (inShopLot && wx === 2 && wy === 6) {
          px(ctx, ox, oy, 2, 3, 14, 7, '#c8b496', s);
          px(ctx, ox, oy, 4, 4, 5, 4, '#b39e7f', s);
          px(ctx, ox, oy, 11, 5, 4, 3, '#b39e7f', s);
        }
        // Gravel mine track path from Waldmine entrance to farm border
        if (inMineLot && wy === 12 && wx >= 2) {
          px(ctx, ox, oy, 0, 5, 16, 6, '#94a3b8', s);
          px(ctx, ox, oy, 0, 6, 16, 1, '#475569', s);
          px(ctx, ox, oy, 0, 9, 16, 1, '#475569', s);
          px(ctx, ox, oy, 3, 5, 2, 6, '#78350f', s);
          px(ctx, ox, oy, 10, 5, 2, 6, '#78350f', s);
        }
        continue;
      }

      // Small wooden fishing docks along the east riverbank (north=6, middle=13, south=20)
      if (wx === WORLD_SIZE - 3 && (wy === 6 || wy === 13 || wy === 20)) {
        if (highGraphics) {
          px(ctx, ox, oy, 6, 12, 10, 2, 'rgba(0,0,0,0.22)', s);
        }
        px(ctx, ox, oy, 6, 4, 10, 8, '#78350f', s);
        px(ctx, ox, oy, 7, 5, 9, 6, '#b45309', s);
        if (highGraphics) px(ctx, ox, oy, 7, 5, 9, 1, '#d97706', s);
        px(ctx, ox, oy, 10, 4, 1, 8, '#78350f', s);
        px(ctx, ox, oy, 13, 4, 1, 8, '#78350f', s);
        continue;
      }

      // Keep riverbank walkable & scenic with extra meadow blossoms along wx === WORLD_SIZE - 3
      const nearRiver = wx === WORLD_SIZE - 3 && wy >= 2 && wy <= WORLD_SIZE - 3;

      // Outer border forest trees, rocks, and MANY wildflowers!
      const hash = Math.abs(wx * 31 + wy * 17) % 13;
      const f1 = fColors[Math.abs(wx + wy) % fColors.length];
      const f2 = fColors[Math.abs(wx * 3 + wy * 5) % fColors.length];
      const f3 = fColors[Math.abs(wx * 7 + wy * 2) % fColors.length];
      const insideParkFootprint = wx >= -19 && wx <= -1 && wy >= 0 && wy <= 20;
      const isWestForestEdge = wx <= -28 || (wx < 0 && wy >= WORLD_SIZE - 1);
      const isInnerEdgeTree = wx === 0 && !isParkConnector;

      if (insideParkFootprint && wy >= 1 && wy <= 19 && wx >= -18 && wx <= -2) {
        // Interior tiles covered by drawThemePark
        continue;
      }

      if (!nearRiver && (isWestForestEdge || isInnerEdgeTree || (wy === 0 && wx >= 0) || wx === WORLD_SIZE - 1 || wy === WORLD_SIZE - 1 || hash <= 2)) {
        // Pine / Oak pixel tree
        const treeSway = highGraphics
          ? Math.round(Math.sin(tick * (0.06 * windMult) + wx * 0.7 + wy * 0.5) * (0.4 * windMult))
          : 0;
        if (highGraphics && shadowSpec?.active) {
          px(ctx, ox, oy, 3 + shadowSpec.dx * 0.75, 13 + shadowSpec.dy * 0.7, 10, 3, `rgba(0,0,0,${shadowSpec.alpha.toFixed(2)})`, s);
        }
        px(ctx, ox, oy, 6, 11, 4, 4, '#5c3a21', s);
        px(ctx, ox + treeSway, oy, 3, 5, 10, 7, season === 'winter' ? '#64748b' : season === 'autumn' ? '#b45309' : '#1e4618', s);
        px(ctx, ox + treeSway, oy, 4, 2, 8, 5, season === 'winter' ? '#e2e8f0' : season === 'autumn' ? '#d97706' : '#2d6623', s);
        if (highGraphics) {
          px(ctx, ox + treeSway, oy, 5, 2, 5, 2, season === 'winter' ? '#f8fafc' : season === 'autumn' ? '#f59e0b' : '#3f8432', s);
        }
      } else if (hash === 3 || hash === 4 || hash === 5 || hash === 6 || hash === 8 || hash === 10 || nearRiver) {
        // Lush wildflower clusters (much more flowers across the entire valley!)
        const stem = season === 'winter' ? '#94a3b8' : '#22c55e';
        px(ctx, ox, oy, 3, 6, 1, 2, stem, s);
        px(ctx, ox, oy, 3, 4, 2, 2, f1, s);

        px(ctx, ox, oy, 9, 10, 1, 2, stem, s);
        px(ctx, ox, oy, 9, 8, 2, 2, f2, s);

        if (hash % 2 === 0 || nearRiver) {
          px(ctx, ox, oy, 11, 4, 1, 2, stem, s);
          px(ctx, ox, oy, 11, 2, 2, 2, f3, s);
          px(ctx, ox, oy, 5, 12, 2, 2, f1, s);
        }
      } else if (hash === 7) {
        // Smooth valley rock with tiny blossom beside it
        px(ctx, ox, oy, 5, 9, 6, 4, '#64748b', s);
        px(ctx, ox, oy, 6, 8, 4, 2, '#94a3b8', s);
        px(ctx, ox, oy, 3, 11, 2, 2, f2, s);
      }
    }
  }

  // Abenteuerpark Sonnental (West of Farm / South of Westviertel)
  drawThemePark(ctx, tilePx, season, tick, nightFactor, themePark, isHoverThemePark);

  // Alte Waldmine & Kristallhöhle entrance at western valley edge (wx 1..2, wy 11..12)
  {
    const mx = 1 * tilePx;
    const my = 11 * tilePx;
    px(ctx, mx, my, 2, 26, 28, 5, 'rgba(0,0,0,0.26)', s); // shadow
    px(ctx, mx, my, 3, 6, 26, 21, '#475569', s); // rocky cliff face
    px(ctx, mx, my, 6, 3, 20, 6, '#64748b', s); // upper ridge
    if (season === 'winter') {
      px(ctx, mx, my, 6, 2, 20, 3, '#e2e8f0', s);
    }
    px(ctx, mx, my, 9, 12, 14, 15, '#0f172a', s); // dark tunnel mouth
    // Heavy timber support beams
    px(ctx, mx, my, 8, 10, 3, 17, '#78350f', s);
    px(ctx, mx, my, 21, 10, 3, 17, '#78350f', s);
    px(ctx, mx, my, 7, 9, 18, 3, '#92400e', s);
    // Warm hanging mine lantern
    px(ctx, mx, my, 15, 11, 2, 2, '#facc15', s);
    px(ctx, mx, my, 15, 13, 2, 2, nightFactor > 0.25 ? '#fef08a' : '#f59e0b', s);
    // Glowing amethyst & sky-blue crystals beside entrance
    px(ctx, mx, my, 4, 19, 3, 5, '#7c3aed', s);
    px(ctx, mx, my, 5, 18, 2, 2, '#e9d5ff', s);
    px(ctx, mx, my, 25, 20, 3, 4, '#0ea5e9', s);
    px(ctx, mx, my, 26, 19, 2, 2, '#e0f2fe', s);
    if (isHoverMine) {
      ctx.strokeStyle = '#7dd3fc';
      ctx.lineWidth = Math.max(2, Math.round(s * 1.2));
      ctx.strokeRect(mx + 2 * s, my + 3 * s, 28 * s, 25 * s);
    }
  }
}

export function drawThemePark(
  ctx: CanvasRenderingContext2D,
  tilePx: number,
  season: Season,
  tick: number,
  nightFactor = 0,
  park?: ThemeParkState,
  isHovered = false
) {
  const s = tilePx / 16;
  const owned = Boolean(park?.owned);
  const attractions = new Set(park?.attractions || []);
  const ox = THEME_PARK_BOUNDS.x * tilePx;
  const oy = THEME_PARK_BOUNDS.y * tilePx;
  const pw = THEME_PARK_BOUNDS.width * tilePx;
  const ph = THEME_PARK_BOUNDS.height * tilePx;

  // 1. Manicured Park Grounds
  const grassA = season === 'winter' ? '#6c8499' : season === 'autumn' ? '#695c26' : '#316a29';
  const grassB = season === 'winter' ? '#7b92a6' : season === 'autumn' ? '#76672b' : '#3a7a30';
  ctx.fillStyle = owned ? grassA : season === 'winter' ? '#5e6f80' : '#3b582c';
  ctx.fillRect(ox, oy, pw, ph);

  const cols = Math.floor(THEME_PARK_BOUNDS.width);
  const rows = Math.floor(THEME_PARK_BOUNDS.height);
  ctx.fillStyle = owned ? grassB : season === 'winter' ? '#677888' : '#436232';
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if ((r + c) % 2 === 0) {
        ctx.fillRect(ox + c * tilePx, oy + r * tilePx, tilePx, tilePx);
      }
    }
  }

  // 2. Cobblestone Promenades & Central Plaza (extended south to Geisterbahn)
  ctx.fillStyle = '#d6c4a8';
  ctx.fillRect((THEME_PARK_BOUNDS.northGateX - 0.9) * tilePx, oy, 1.8 * tilePx, 13.8 * tilePx);
  ctx.fillRect((THEME_PARK_BOUNDS.x + 1.0) * tilePx, 6.2 * tilePx, (THEME_PARK_BOUNDS.width - 1.0) * tilePx, 1.3 * tilePx);
  ctx.beginPath();
  ctx.arc(-8.5 * tilePx, 4.5 * tilePx, 2.25 * tilePx, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#bfa989';
  for (let i = 0; i < 12; i++) {
    ctx.fillRect((-9.2 + (i % 4) * 0.45) * tilePx, (1.2 + Math.floor(i / 4) * 3.8) * tilePx, 4 * s, 3 * s);
    ctx.fillRect((-16.2 + (i % 10) * 1.4) * tilePx, 6.65 * tilePx, 5 * s, 3 * s);
  }

  // 3. Perimeter Park Brick & Iron Wall with North & East Gate Openings
  const wallT = Math.max(3, Math.round(4 * s));
  ctx.fillStyle = '#7c2d12';
  ctx.fillRect(ox, oy, (-9.5 - THEME_PARK_BOUNDS.x) * tilePx, wallT);
  ctx.fillRect(-7.5 * tilePx, oy, (THEME_PARK_BOUNDS.x + THEME_PARK_BOUNDS.width + 7.5) * tilePx, wallT);
  ctx.fillRect(ox, oy + ph - wallT, pw, wallT);
  ctx.fillRect(ox, oy, wallT, ph);
  ctx.fillRect(ox + pw - wallT, oy, wallT, 5.7 * tilePx);
  ctx.fillRect(ox + pw - wallT, 7.7 * tilePx, wallT, oy + ph - 7.7 * tilePx);

  ctx.fillStyle = '#fde68a';
  for (let pxTile = THEME_PARK_BOUNDS.x + 0.5; pxTile < THEME_PARK_BOUNDS.x + THEME_PARK_BOUNDS.width; pxTile += 2) {
    if (pxTile > -9.7 && pxTile < -7.3) continue;
    ctx.fillRect(pxTile * tilePx, oy - 1 * s, 4 * s, 4 * s);
    ctx.fillRect(pxTile * tilePx, oy + ph - wallT - 1 * s, 4 * s, 4 * s);
  }

  // 4. North Entrance Archway & Ticket Booth ("Kasse")
  {
    const gx = -9.6 * tilePx;
    const gy = oy - 0.1 * tilePx;
    px(ctx, gx, gy, 0, 0, 5, 16, '#991b1b', s);
    px(ctx, gx, gy, 30, 0, 5, 16, '#991b1b', s);
    px(ctx, gx, gy, 0, 0, 5, 3, '#fde047', s);
    px(ctx, gx, gy, 30, 0, 5, 3, '#fde047', s);
    px(ctx, gx, gy, 3, 2, 29, 6, '#dc2626', s);
    px(ctx, gx, gy, 5, 3, 25, 4, owned ? '#fef08a' : '#e2e8f0', s);
    for (let b = 0; b < 7; b++) {
      const lit = owned && (Math.floor(tick / 10) + b) % 2 === 0;
      px(ctx, gx, gy, 5 + b * 4, 1, 2, 2, lit ? '#fef08a' : '#f59e0b', s);
    }
    px(ctx, gx, gy, 24, 11, 16, 14, '#fef3c7', s);
    px(ctx, gx, gy, 23, 8, 18, 4, '#dc2626', s);
    px(ctx, gx, gy, 26, 8, 3, 4, '#ffffff', s);
    px(ctx, gx, gy, 32, 8, 3, 4, '#ffffff', s);
    px(ctx, gx, gy, 27, 14, 10, 6, '#1e293b', s);
    px(ctx, gx, gy, 28, 15, 8, 4, owned && nightFactor > 0.2 ? '#fef08a' : '#7dd3fc', s);

    if (owned) {
      drawOwnerBadgeFlag(ctx, -6.8 * tilePx, oy + 0.15 * tilePx, 0, 0, tick, s);
    } else {
      const sx = -11.3 * tilePx;
      const sy = oy + 0.55 * tilePx;
      px(ctx, sx, sy, 0, 0, 20, 11, '#78350f', s);
      px(ctx, sx, sy, 1, 1, 18, 9, '#fef3c7', s);
      px(ctx, sx, sy, 3, 3, 4, 4, '#f59e0b', s);
      px(ctx, sx, sy, 9, 3, 8, 2, '#991b1b', s);
      px(ctx, sx, sy, 9, 6, 7, 2, '#b45309', s);
    }
  }

  // East Gate Arch beside Hofladen/Waldmine footpath
  {
    const ex = (THEME_PARK_BOUNDS.x + THEME_PARK_BOUNDS.width - 0.35) * tilePx;
    const ey = 6.0 * tilePx;
    px(ctx, ex, ey, 0, 0, 5, 5, '#991b1b', s);
    px(ctx, ex, ey, 0, 24, 5, 5, '#991b1b', s);
    px(ctx, ex, ey, 1, 1, 3, 2, '#fde047', s);
    px(ctx, ex, ey, 1, 25, 3, 2, '#fde047', s);
  }

  // 5. Festive Concession Stands (Popcorn & Zuckerwatte) on the Plaza
  {
    const stands = [
      { x: -11.4, y: 1.8, roof: '#ec4899', sign: '#fbcfe8' },
      { x: -6.4, y: 1.8, roof: '#0ea5e9', sign: '#bae6fd' },
    ];
    for (const st of stands) {
      const sx = st.x * tilePx;
      const sy = st.y * tilePx;
      px(ctx, sx, sy, 2, 16, 20, 3, 'rgba(0,0,0,0.2)', s);
      px(ctx, sx, sy, 3, 7, 18, 10, '#fffbeb', s);
      px(ctx, sx, sy, 2, 3, 20, 5, st.roof, s);
      px(ctx, sx, sy, 5, 3, 3, 5, '#ffffff', s);
      px(ctx, sx, sy, 11, 3, 3, 5, '#ffffff', s);
      px(ctx, sx, sy, 17, 3, 3, 5, '#ffffff', s);
      px(ctx, sx, sy, 5, 9, 14, 5, '#451a03', s);
      px(ctx, sx, sy, 6, 10, 12, 3, owned ? st.sign : '#94a3b8', s);
    }
  }

  // 6. Centerpiece of Basis-Park: Animated Nostalgie-Karussell at (-8.5, 4.5)
  {
    const cx = -8.5 * tilePx;
    const cy = 4.5 * tilePx;
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 0.9 * tilePx, 1.55 * tilePx, 0.75 * tilePx, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#92400e';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 0.55 * tilePx, 1.45 * tilePx, 0.65 * tilePx, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 0.45 * tilePx, 1.32 * tilePx, 0.55 * tilePx, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#eab308';
    ctx.fillRect(cx - 4 * s, cy - 1.0 * tilePx, 8 * s, 1.45 * tilePx);

    const horseColors = ['#ffffff', '#f43f5e', '#38bdf8', '#fde047', '#a855f7', '#fb923c'];
    const baseAngle = owned ? tick * 0.045 : 0.35;
    for (let i = 0; i < 6; i++) {
      const a = baseAngle + (i * Math.PI * 2) / 6;
      const hx = cx + Math.cos(a) * 1.05 * tilePx;
      const bob = owned ? Math.sin(tick * 0.14 + i * 1.3) * 3.5 * s : 0;
      const hy = cy + 0.35 * tilePx + Math.sin(a) * 0.38 * tilePx + bob;
      ctx.fillStyle = '#facc15';
      ctx.fillRect(hx - 1 * s, cy - 0.55 * tilePx, 2 * s, hy - (cy - 0.55 * tilePx) + 4 * s);
      ctx.fillStyle = owned ? horseColors[i] : '#94a3b8';
      ctx.fillRect(hx - 4 * s, hy - 3 * s, 8 * s, 5 * s);
      ctx.fillRect(hx + (Math.cos(a) > 0 ? -5 : 2) * s, hy - 5 * s, 3 * s, 4 * s);
    }

    const rW = 1.55 * tilePx;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 1.55 * tilePx);
    ctx.lineTo(cx - rW, cy - 0.35 * tilePx);
    ctx.lineTo(cx + rW, cy - 0.35 * tilePx);
    ctx.closePath();
    ctx.fillStyle = owned ? '#dc2626' : '#64748b';
    ctx.fill();

    ctx.fillStyle = owned ? '#fef3c7' : '#cbd5e1';
    for (let st = -2; st <= 2; st += 2) {
      ctx.beginPath();
      ctx.moveTo(cx, cy - 1.55 * tilePx);
      ctx.lineTo(cx + st * 0.32 * tilePx, cy - 0.35 * tilePx);
      ctx.lineTo(cx + (st + 0.85) * 0.32 * tilePx, cy - 0.35 * tilePx);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = '#eab308';
    ctx.fillRect(cx - rW, cy - 0.38 * tilePx, rW * 2, 4 * s);
    for (let l = 0; l < 9; l++) {
      const lx = cx - rW + 3 * s + l * ((rW * 2 - 6 * s) / 8);
      const lit = owned && (Math.floor(tick / 8) + l) % 2 === 0;
      ctx.fillStyle = lit ? '#fef08a' : '#b45309';
      ctx.fillRect(lx, cy - 0.36 * tilePx, 2.5 * s, 2.5 * s);
    }
    ctx.fillStyle = '#fde047';
    ctx.fillRect(cx - 2 * s, cy - 1.85 * tilePx, 4 * s, 5 * s);
    const wave = owned ? Math.sin(tick * 0.16) * 2 * s : 0;
    ctx.fillStyle = owned ? '#2563eb' : '#94a3b8';
    ctx.fillRect(cx + 2 * s, cy - 1.82 * tilePx + wave * 0.3, 8 * s, 3 * s);
  }

  for (const bx of [-11.3, -5.9]) {
    const pbx = bx * tilePx;
    const pby = 4.9 * tilePx;
    px(ctx, pbx, pby, 2, 6, 14, 4, '#78350f', s);
    px(ctx, pbx, pby, 3, 4, 12, 3, '#b45309', s);
  }

  const drawPlannedPlot = (specX: number, specY: number, specW: number, specH: number, accent: string) => {
    const px0 = specX * tilePx;
    const py0 = specY * tilePx;
    const pw0 = specW * tilePx;
    const ph0 = specH * tilePx;
    ctx.fillStyle = 'rgba(148, 163, 184, 0.22)';
    ctx.fillRect(px0 + 4 * s, py0 + 4 * s, pw0 - 8 * s, ph0 - 8 * s);
    ctx.strokeStyle = owned ? accent : 'rgba(203, 213, 225, 0.55)';
    ctx.lineWidth = Math.max(1.5, 1.5 * s);
    ctx.setLineDash([6 * s, 5 * s]);
    ctx.strokeRect(px0 + 4 * s, py0 + 4 * s, pw0 - 8 * s, ph0 - 8 * s);
    ctx.setLineDash([]);
    const stakeCols = ['#f59e0b', '#78350f'];
    for (const [cx0, cy0] of [
      [px0 + 5 * s, py0 + 5 * s],
      [px0 + pw0 - 9 * s, py0 + 5 * s],
      [px0 + 5 * s, py0 + ph0 - 11 * s],
      [px0 + pw0 - 9 * s, py0 + ph0 - 11 * s],
    ]) {
      ctx.fillStyle = stakeCols[1];
      ctx.fillRect(cx0, cy0, 3 * s, 6 * s);
      ctx.fillStyle = stakeCols[0];
      ctx.fillRect(cx0 - 1 * s, cy0, 5 * s, 2.5 * s);
    }
  };

  // 7. Ausbau 1: Riesenrad „Sonnenblick“
  const ferrisSpec = THEME_PARK_ATTRACTIONS[0];
  if (attractions.has('ferris_wheel')) {
    const cx = -14.4 * tilePx;
    const cy = 3.65 * tilePx;
    const radius = 1.95 * tilePx;

    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 2.25 * tilePx, 1.9 * tilePx, 0.5 * tilePx, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#475569';
    ctx.fillRect(cx - 1.5 * tilePx, cy + 2.0 * tilePx, 3.0 * tilePx, 0.42 * tilePx);

    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = Math.max(3, 3.5 * s);
    ctx.beginPath();
    ctx.moveTo(cx - 1.25 * tilePx, cy + 2.15 * tilePx);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx + 1.25 * tilePx, cy + 2.15 * tilePx);
    ctx.stroke();

    const angle = tick * 0.016;
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = Math.max(2, 2.5 * s);
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = Math.max(1.5, 1.6 * s);
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.65, 0, Math.PI * 2);
    ctx.stroke();

    const gondolaColors = ['#ef4444', '#f59e0b', '#10b981', '#0ea5e9', '#a855f7', '#ec4899', '#facc15', '#14b8a6'];
    for (let i = 0; i < 8; i++) {
      const a = angle + (i * Math.PI * 2) / 8;
      const gx = cx + Math.cos(a) * radius;
      const gy = cy + Math.sin(a) * radius;
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = Math.max(1, 1.5 * s);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(gx, gy);
      ctx.stroke();

      const pulse = Math.floor(tick / 10 + i) % 3 === 0;
      ctx.fillStyle = pulse ? '#fef08a' : gondolaColors[i];
      ctx.fillRect(gx - 2 * s, gy - 2 * s, 4 * s, 4 * s);

      ctx.fillStyle = '#334155';
      ctx.fillRect(gx - 1 * s, gy, 2 * s, 4 * s);
      ctx.fillStyle = gondolaColors[i];
      ctx.fillRect(gx - 5 * s, gy + 3 * s, 10 * s, 6 * s);
      ctx.fillStyle = nightFactor > 0.25 ? '#fef08a' : '#e0f2fe';
      ctx.fillRect(gx - 3 * s, gy + 4 * s, 6 * s, 3 * s);
    }

    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(cx, cy, 5 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(cx, cy, 2.5 * s, 0, Math.PI * 2);
    ctx.fill();
  } else {
    drawPlannedPlot(ferrisSpec.plotX, ferrisSpec.plotY, ferrisSpec.plotW, ferrisSpec.plotH, ferrisSpec.accentColor);
  }

  // 8. Ausbau 2: Holz-Achterbahn „Tal-Blitz“
  const coasterSpec = THEME_PARK_ATTRACTIONS[1];
  if (attractions.has('roller_coaster')) {
    const startX = (coasterSpec.plotX + 0.4) * tilePx;
    const widthPx = (coasterSpec.plotW - 0.8) * tilePx;
    const baseY = (coasterSpec.plotY + coasterSpec.plotH - 0.5) * tilePx;

    const getTrackY = (u: number) => {
      const h1 = Math.sin(u * Math.PI * 3.0);
      const lift = Math.sin(u * Math.PI) * 1.15;
      return baseY - (1.1 + lift + Math.abs(h1) * 1.45) * tilePx;
    };

    const steps = 22;
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const sx = startX + u * widthPx;
      const ty = getTrackY(u);
      ctx.fillStyle = '#92400e';
      ctx.fillRect(sx - 2 * s, ty, 4 * s, baseY - ty);
      if (i < steps) {
        const nextU = (i + 1) / steps;
        const nx = startX + nextU * widthPx;
        const nty = getTrackY(nextU);
        const midY = (ty + baseY) * 0.5;
        ctx.strokeStyle = '#b45309';
        ctx.lineWidth = Math.max(1, 1.4 * s);
        ctx.beginPath();
        ctx.moveTo(sx, midY);
        ctx.lineTo(nx, (nty + baseY) * 0.5);
        ctx.stroke();
      }
    }

    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = Math.max(2.5, 3.2 * s);
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) {
      const u = i / 40;
      const rx = startX + u * widthPx;
      const ry = getTrackY(u);
      if (i === 0) ctx.moveTo(rx, ry);
      else ctx.lineTo(rx, ry);
    }
    ctx.stroke();

    const headU = ((tick * 0.0065) % 1.16) - 0.08;
    const carColors = ['#fef08a', '#38bdf8', '#f43f5e'];
    for (let c = 0; c < 3; c++) {
      const u = headU - c * 0.042;
      if (u < 0 || u > 1) continue;
      const tx = startX + u * widthPx;
      const ty = getTrackY(u);
      ctx.fillStyle = carColors[c];
      ctx.fillRect(tx - 5 * s, ty - 6 * s, 10 * s, 6 * s);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(tx - 3 * s, ty - 5 * s, 6 * s, 2.5 * s);
    }

    const stX = startX + widthPx - 1.9 * tilePx;
    const stY = baseY - 1.65 * tilePx;
    px(ctx, stX, stY, 0, 12, 26, 14, '#fef3c7', s);
    px(ctx, stX, stY, -1, 7, 28, 6, '#b91c1c', s);
    px(ctx, stX, stY, 3, 7, 4, 6, '#fde68a', s);
    px(ctx, stX, stY, 15, 7, 4, 6, '#fde68a', s);
  } else {
    drawPlannedPlot(coasterSpec.plotX, coasterSpec.plotY, coasterSpec.plotW, coasterSpec.plotH, coasterSpec.accentColor);
  }

  // 9. Ausbau 3: Wildwasserbahn „Tal-Splash“
  const flumeSpec = THEME_PARK_ATTRACTIONS[2];
  if (attractions.has('water_flume')) {
    const fx = flumeSpec.plotX * tilePx;
    const fy = flumeSpec.plotY * tilePx;
    const fw = flumeSpec.plotW * tilePx;
    const fh = flumeSpec.plotH * tilePx;

    ctx.fillStyle = '#0369a1';
    ctx.fillRect(fx + 0.35 * tilePx, fy + 2.6 * tilePx, fw - 0.7 * tilePx, fh - 2.9 * tilePx);
    ctx.fillStyle = '#0ea5e9';
    ctx.fillRect(fx + 0.55 * tilePx, fy + 2.8 * tilePx, fw - 1.1 * tilePx, fh - 3.3 * tilePx);

    px(ctx, fx, fy, 10, 4, 38, 38, '#475569', s);
    px(ctx, fx, fy, 14, 0, 26, 14, '#64748b', s);
    if (season === 'winter') {
      px(ctx, fx, fy, 14, 0, 26, 5, '#f1f5f9', s);
    }

    ctx.strokeStyle = '#7dd3fc';
    ctx.lineWidth = Math.max(4, 7 * s);
    ctx.beginPath();
    ctx.moveTo(fx + 1.4 * tilePx, fy + 1.3 * tilePx);
    ctx.lineTo(fx + 2.6 * tilePx, fy + 1.3 * tilePx);
    ctx.lineTo(fx + 4.35 * tilePx, fy + 3.65 * tilePx);
    ctx.stroke();

    const shimmer = (tick * 0.2) % 10;
    ctx.fillStyle = '#e0f2fe';
    ctx.fillRect(fx + (2.7 + shimmer * 0.14) * tilePx, fy + (1.5 + shimmer * 0.2) * tilePx, 5 * s, 2.5 * s);

    const dropPhase = (tick % 85) / 85;
    if (dropPhase < 0.55) {
      const tDrop = dropPhase / 0.55;
      const bx = fx + (2.4 + tDrop * 1.95) * tilePx;
      const by = fy + (1.15 + tDrop * 2.45) * tilePx;
      ctx.fillStyle = '#78350f';
      ctx.fillRect(bx - 6 * s, by - 3 * s, 12 * s, 6 * s);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(bx - 2 * s, by - 5 * s, 4 * s, 3 * s);
    } else {
      const splashT = (dropPhase - 0.55) / 0.45;
      const spread = splashT * 1.1 * tilePx;
      const alpha = Math.max(0.15, 1 - splashT);
      ctx.fillStyle = `rgba(224, 242, 254, ${alpha.toFixed(2)})`;
      ctx.fillRect(fx + 4.25 * tilePx - spread * 0.6, fy + 3.45 * tilePx - Math.sin(splashT * Math.PI) * 14 * s, 6 * s, 6 * s);
      ctx.fillRect(fx + 4.35 * tilePx + spread * 0.5, fy + 3.45 * tilePx - Math.sin(splashT * Math.PI) * 12 * s, 6 * s, 6 * s);
      ctx.fillRect(fx + 4.1 * tilePx, fy + 3.6 * tilePx, 10 * s, 3 * s);
    }
  } else {
    drawPlannedPlot(flumeSpec.plotX, flumeSpec.plotY, flumeSpec.plotW, flumeSpec.plotH, flumeSpec.accentColor);
  }

  // 10. Ausbau 4: Aussichtsturm „Himmelsblick“ (Lvl 215+)
  const skySpec = THEME_PARK_ATTRACTIONS[3];
  if (skySpec) {
    if (attractions.has('sky_tower')) {
      const tx = skySpec.plotX * tilePx;
      const ty = skySpec.plotY * tilePx;
      const tw = skySpec.plotW * tilePx;
      const th = skySpec.plotH * tilePx;
      const cxT = tx + tw * 0.5;
      const baseY = ty + th - 0.35 * tilePx;
      const topY = ty + 0.35 * tilePx;

      // Shadow & concrete pad
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.beginPath();
      ctx.ellipse(cxT, baseY + 0.12 * tilePx, 1.3 * tilePx, 0.38 * tilePx, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#475569';
      ctx.fillRect(cxT - 1.05 * tilePx, baseY - 0.32 * tilePx, 2.1 * tilePx, 0.36 * tilePx);

      // Steel spire shaft & truss highlights
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(cxT - 5 * s, topY + 6 * s, 10 * s, baseY - topY - 8 * s);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(cxT - 2 * s, topY + 8 * s, 4 * s, baseY - topY - 12 * s);
      ctx.fillStyle = '#0ea5e9';
      for (let py0 = topY + 12 * s; py0 < baseY - 10 * s; py0 += 8 * s) {
        ctx.fillRect(cxT - 5 * s, py0, 10 * s, 2 * s);
      }

      // Top Observation Crown & Blinking Beacon
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(cxT - 9 * s, topY + 3 * s, 18 * s, 5 * s);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cxT - 1.5 * s, topY - 8 * s, 3 * s, 11 * s);
      const beaconLit = Math.floor(tick / 14) % 2 === 0;
      ctx.fillStyle = beaconLit ? '#ef4444' : '#fca5a5';
      ctx.beginPath();
      ctx.arc(cxT, topY - 8 * s, 3.2 * s, 0, Math.PI * 2);
      ctx.fill();

      // Animated rising & descending Golden Panorama Ring
      const rideCycle = park?.breakdown ? 0.2 : (Math.sin(tick * 0.032) + 1) * 0.5;
      const gondolaY = baseY - 0.65 * tilePx - rideCycle * (baseY - topY - 1.2 * tilePx);
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(cxT - 15 * s, gondolaY - 4 * s, 30 * s, 8 * s);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(cxT - 16 * s, gondolaY + 3 * s, 32 * s, 2.5 * s);
      ctx.fillStyle = nightFactor > 0.25 ? '#fef08a' : '#e0f2fe';
      for (let wx0 = -12; wx0 <= 9; wx0 += 6) {
        ctx.fillRect(cxT + wx0 * s, gondolaY - 2.5 * s, 4 * s, 4 * s);
      }
    } else {
      drawPlannedPlot(skySpec.plotX, skySpec.plotY, skySpec.plotW, skySpec.plotH, skySpec.accentColor);
    }
  }

  // 11. Ausbau 5: Geisterbahn „Schattenburg“ (Lvl 235+)
  const ghostSpec = THEME_PARK_ATTRACTIONS[4];
  if (ghostSpec) {
    if (attractions.has('ghost_train')) {
      const gx = ghostSpec.plotX * tilePx;
      const gy = ghostSpec.plotY * tilePx;
      const gw = ghostSpec.plotW * tilePx;
      const gh = ghostSpec.plotH * tilePx;

      // Dark courtyard & spooky cobble apron
      ctx.fillStyle = '#334155';
      ctx.fillRect(gx + 0.3 * tilePx, gy + gh - 1.2 * tilePx, gw - 0.6 * tilePx, 1.0 * tilePx);

      // Gothic Haunted Manor Towers & Main Keep
      px(ctx, gx, gy, 18, 12, 108, 46, '#312e81', s);
      px(ctx, gx, gy, 16, 8, 22, 50, '#1e1b4b', s); // Left turret
      px(ctx, gx, gy, 106, 8, 22, 50, '#1e1b4b', s); // Right turret
      px(ctx, gx, gy, 54, 4, 36, 54, '#1e1b4b', s); // Center steeple

      // Pointed Purple Spire Roofs
      for (const [rx, rw] of [
        [15, 24],
        [52, 40],
        [105, 24],
      ]) {
        px(ctx, gx, gy, rx, 2, rw, 7, '#581c87', s);
        px(ctx, gx, gy, rx + 4, -2, rw - 8, 4, '#6b21a8', s);
      }
      if (season === 'winter') {
        px(ctx, gx, gy, 16, 2, 22, 2, '#cbd5e1', s);
        px(ctx, gx, gy, 54, -2, 36, 2, '#cbd5e1', s);
      }

      // Glowing eerie windows + Pumpkin lanterns
      const spookyGlow = Math.floor(tick / 16) % 2 === 0 ? '#facc15' : '#c084fc';
      for (const wxPos of [24, 62, 74, 114]) {
        px(ctx, gx, gy, wxPos, 18, 6, 9, spookyGlow, s);
      }
      // Archway tunnel mouth
      px(ctx, gx, gy, 56, 36, 32, 22, '#090d16', s);
      px(ctx, gx, gy, 62, 32, 20, 6, '#7e22ce', s);
      // Glowing Jack-o'-lanterns flanking track
      px(ctx, gx, gy, 44, 52, 6, 5, '#ea580c', s);
      px(ctx, gx, gy, 46, 54, 2, 2, '#fef08a', s);
      px(ctx, gx, gy, 94, 52, 6, 5, '#ea580c', s);
      px(ctx, gx, gy, 96, 54, 2, 2, '#fef08a', s);

      // Front Rail Track + Animated Ghost Cart
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(gx + 0.9 * tilePx, gy + gh - 0.9 * tilePx, gw - 1.8 * tilePx, 4 * s);
      const cartPhase = park?.breakdown ? 0.5 : (tick * 0.008) % 1;
      const cartX = gx + (1.1 + cartPhase * (gw / tilePx - 2.4)) * tilePx;
      const cartY = gy + gh - 1.15 * tilePx;
      ctx.fillStyle = '#7e22ce';
      ctx.fillRect(cartX, cartY, 14 * s, 7 * s);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(cartX + 4 * s, cartY - 5 * s, 6 * s, 5 * s); // Little passenger ghost figure
      ctx.fillStyle = '#c084fc';
      ctx.fillRect(cartX + 2 * s, cartY + 2 * s, 10 * s, 2 * s);
    } else {
      drawPlannedPlot(ghostSpec.plotX, ghostSpec.plotY, ghostSpec.plotW, ghostSpec.plotH, ghostSpec.accentColor);
    }
  }

  // Park Breakdown Warning Sign & Barrier Flash
  if (owned && park?.breakdown) {
    const bx = -10.8 * tilePx;
    const by = oy + 0.55 * tilePx;
    const blink = Math.floor(tick / 10) % 2 === 0;
    px(ctx, bx, by, 0, 0, 28, 12, '#7f1d1d', s);
    px(ctx, bx, by, 1, 1, 26, 10, blink ? '#ef4444' : '#f59e0b', s);
    px(ctx, bx, by, 4, 4, 20, 4, '#fef3c7', s);
  }

  if (isHovered) {
    ctx.strokeStyle = park?.breakdown ? '#fb7185' : '#fef08a';
    ctx.lineWidth = Math.max(2.5, 2.2 * s);
    ctx.strokeRect(ox + 2 * s, oy + 2 * s, pw - 4 * s, ph - 4 * s);
  }
}

const VILLAGE_LANTERN_SPOTS: Array<{ wx: number; wy: number }> = [
  // Core Dorf lanterns
  { wx: 6.7, wy: 0.4 },
  { wx: 8.6, wy: -1.8 },
  { wx: 2.3, wy: -2.2 },
  { wx: 13.0, wy: -2.2 },
  { wx: 20.2, wy: -2.2 },
  { wx: 25.2, wy: -2.2 },
  { wx: 6.8, wy: -6.8 },
  { wx: 12.1, wy: -6.3 },
  { wx: 15.1, wy: -6.3 },
  { wx: 20.2, wy: -7.2 },
  { wx: 2.3, wy: -7.2 },
  { wx: 7.2, wy: -11.8 },
  { wx: 13.8, wy: -11.8 },
  { wx: 20.2, wy: -11.8 },
  { wx: 25.2, wy: -11.8 },
  // Westviertel & Industriegebiet street lanterns (expanded west to -26.8)
  { wx: -1.3, wy: -2.2 },
  { wx: -7.7, wy: -2.2 },
  { wx: -13.7, wy: -2.2 },
  { wx: -18.7, wy: -2.2 },
  { wx: -24.5, wy: -2.2 },
  { wx: -26.8, wy: -2.2 },
  { wx: -1.3, wy: -7.2 },
  { wx: -7.7, wy: -7.2 },
  { wx: -13.7, wy: -7.2 },
  { wx: -18.7, wy: -7.2 },
  { wx: -24.5, wy: -7.2 },
  { wx: -26.8, wy: -7.2 },
  { wx: -1.3, wy: -11.8 },
  { wx: -7.7, wy: -11.8 },
  { wx: -14.2, wy: -11.8 },
  { wx: -18.7, wy: -11.8 },
  { wx: -24.5, wy: -11.8 },
  { wx: -26.8, wy: -11.8 },
];

function getHouseStyleColors(style: VillageHouseStyle) {
  switch (style) {
    case 'cottage_red':
      return { wall: '#fef3c7', trim: '#b45309', roof: '#b91c1c', roofHi: '#dc2626', door: '#78350f' };
    case 'half_timber':
      return { wall: '#fde68a', trim: '#451a03', roof: '#57534e', roofHi: '#78716c', door: '#78350f' };
    case 'thatched':
      return { wall: '#faf5ff', trim: '#92400e', roof: '#ca8a04', roofHi: '#eab308', door: '#713f12' };
    case 'stone_manor':
      return { wall: '#cbd5e1', trim: '#64748b', roof: '#1e3a8a', roofHi: '#2563eb', door: '#451a03' };
    case 'wood_cabin':
      return { wall: '#b45309', trim: '#78350f', roof: '#365314', roofHi: '#4d7c0f', door: '#451a03' };
    case 'bakery_shop':
      return { wall: '#fed7aa', trim: '#9a3412', roof: '#9a3412', roofHi: '#ea580c', door: '#7c2d12' };
    case 'blue_gable':
      return { wall: '#bae6fd', trim: '#f8fafc', roof: '#0f172a', roofHi: '#334155', door: '#0369a1' };
    case 'garden_villa':
      return { wall: '#dcfce7', trim: '#15803d', roof: '#c2410c', roofHi: '#ea580c', door: '#166534' };
    case 'twin_roof':
      return { wall: '#fecdd3', trim: '#881337', roof: '#4c1d95', roofHi: '#6d28d9', door: '#451a03' };
    case 'atelier':
      return { wall: '#fef08a', trim: '#854d0e', roof: '#0f766e', roofHi: '#14b8a6', door: '#78350f' };
  }
}

function drawVillageHouse(
  ctx: CanvasRenderingContext2D,
  tilePx: number,
  house: VillageHouse,
  season: Season,
  tick: number,
  nightFactor: number,
  isHovered: boolean
) {
  const ox = Math.floor(house.x * tilePx);
  const oy = Math.floor(house.y * tilePx);
  const s = tilePx / 16;
  const pal = getHouseStyleColors(house.style);
  const winCol = nightFactor > 0.3 ? '#fde047' : '#38bdf8';

  // Soft ground shadow
  px(ctx, ox, oy, 2, 26, 26, 5, 'rgba(0,0,0,0.22)', s);

  // Side conservatory / shed / woodpile variations
  if (house.style === 'garden_villa') {
    px(ctx, ox, oy, 23, 16, 6, 11, '#a7f3d0', s);
    px(ctx, ox, oy, 23, 14, 6, 3, '#38bdf8', s);
    px(ctx, ox, oy, 24, 18, 4, 5, '#e0f2fe', s);
  } else if (house.style === 'wood_cabin') {
    px(ctx, ox, oy, 24, 21, 5, 6, '#78350f', s);
    px(ctx, ox, oy, 25, 22, 3, 2, '#d97706', s);
  } else if (house.style === 'twin_roof') {
    px(ctx, ox, oy, 22, 17, 7, 10, pal.wall, s);
    px(ctx, ox, oy, 21, 13, 9, 4, pal.roof, s);
  }

  // Main wall (w ~22px, h ~12px inside 29x30 grid)
  px(ctx, ox, oy, 4, 15, 21, 13, pal.wall, s);
  px(ctx, ox, oy, 4, 26, 21, 2, '#64748b', s); // stone foundation

  // Style-specific facade details
  if (house.style === 'half_timber') {
    px(ctx, ox, oy, 4, 15, 21, 2, pal.trim, s);
    px(ctx, ox, oy, 4, 21, 21, 1, pal.trim, s);
    px(ctx, ox, oy, 4, 15, 2, 11, pal.trim, s);
    px(ctx, ox, oy, 14, 15, 2, 11, pal.trim, s);
    px(ctx, ox, oy, 23, 15, 2, 11, pal.trim, s);
  } else if (house.style === 'wood_cabin') {
    px(ctx, ox, oy, 4, 17, 21, 1, pal.trim, s);
    px(ctx, ox, oy, 4, 20, 21, 1, pal.trim, s);
    px(ctx, ox, oy, 4, 23, 21, 1, pal.trim, s);
  } else if (house.style === 'stone_manor') {
    px(ctx, ox, oy, 6, 17, 4, 2, '#94a3b8', s);
    px(ctx, ox, oy, 18, 19, 4, 2, '#94a3b8', s);
    px(ctx, ox, oy, 7, 22, 3, 2, '#94a3b8', s);
  } else if (house.style === 'blue_gable') {
    px(ctx, ox, oy, 4, 15, 2, 11, '#f8fafc', s);
    px(ctx, ox, oy, 23, 15, 2, 11, '#f8fafc', s);
  }

  // Chimney + animated smoke puffs
  const chimX = house.style === 'thatched' ? 19 : 7;
  px(ctx, ox, oy, chimX, 2, 4, 8, '#78350f', s);
  px(ctx, ox, oy, chimX - 1, 2, 6, 2, '#451a03', s);
  if ((house.x + house.y) % 2 !== 0 || nightFactor > 0.25) {
    const puff = ((tick * 0.14 + house.x * 5) % 10) * 0.45;
    ctx.fillStyle = nightFactor > 0.35 ? 'rgba(226, 232, 240, 0.32)' : 'rgba(248, 250, 252, 0.42)';
    px(ctx, ox, oy, chimX + 1, 0 - puff, 2, 2, ctx.fillStyle as string, s);
    px(ctx, ox, oy, chimX + 2, -2 - puff * 1.2, 2, 2, ctx.fillStyle as string, s);
  }

  // Roof shapes
  if (house.style === 'thatched') {
    // Rounded golden thatched roof
    px(ctx, ox, oy, 5, 5, 19, 4, pal.roof, s);
    px(ctx, ox, oy, 3, 8, 23, 5, pal.roofHi, s);
    px(ctx, ox, oy, 2, 12, 25, 4, pal.roof, s);
    px(ctx, ox, oy, 12, 8, 5, 4, winCol, s); // round attic dormer window
  } else if (house.style === 'blue_gable' || house.style === 'stone_manor') {
    // Steep alpine gable roof
    px(ctx, ox, oy, 11, 3, 7, 3, pal.roofHi, s);
    px(ctx, ox, oy, 7, 6, 15, 4, pal.roof, s);
    px(ctx, ox, oy, 3, 10, 23, 6, pal.roofHi, s);
    px(ctx, ox, oy, 2, 14, 25, 2, pal.roof, s);
  } else {
    // Classic pitched roof
    px(ctx, ox, oy, 6, 6, 17, 4, pal.roofHi, s);
    px(ctx, ox, oy, 3, 10, 23, 6, pal.roof, s);
    px(ctx, ox, oy, 2, 14, 25, 2, pal.roofHi, s);
  }

  if (season === 'winter') {
    px(ctx, ox, oy, 6, 6, 17, 2, '#f8fafc', s);
    px(ctx, ox, oy, 3, 10, 23, 2, '#e2e8f0', s);
  }

  // Dormer or skylight for atelier/cottage
  if (house.style === 'atelier') {
    px(ctx, ox, oy, 9, 8, 10, 5, '#bae6fd', s);
    px(ctx, ox, oy, 13, 8, 2, 5, pal.trim, s);
  } else if (house.style === 'cottage_red') {
    px(ctx, ox, oy, 12, 8, 5, 4, winCol, s);
  }

  // Front door centered cleanly at doorX
  px(ctx, ox, oy, 12, 20, 5, 8, pal.door, s);
  px(ctx, ox, oy, 15, 24, 1, 1, '#facc15', s); // brass doorknob

  // Awning canopy for bakery_shop
  if (house.style === 'bakery_shop') {
    px(ctx, ox, oy, 5, 17, 4, 3, '#ef4444', s);
    px(ctx, ox, oy, 9, 17, 4, 3, '#ffffff', s);
    px(ctx, ox, oy, 13, 17, 4, 3, '#ef4444', s);
    px(ctx, ox, oy, 17, 17, 4, 3, '#ffffff', s);
    px(ctx, ox, oy, 21, 17, 3, 3, '#ef4444', s);
  }

  // Windows & flowerboxes
  px(ctx, ox, oy, 6, 19, 4, 4, winCol, s);
  px(ctx, ox, oy, 19, 19, 4, 4, winCol, s);
  px(ctx, ox, oy, 6, 19, 4, 1, pal.trim, s);
  px(ctx, ox, oy, 19, 19, 4, 1, pal.trim, s);
  if (house.style !== 'stone_manor') {
    px(ctx, ox, oy, 6, 23, 4, 2, '#15803d', s);
    px(ctx, ox, oy, 7, 23, 1, 1, '#f43f5e', s);
    px(ctx, ox, oy, 19, 23, 4, 2, '#15803d', s);
    px(ctx, ox, oy, 21, 23, 1, 1, '#facc15', s);
  }

  // Small front fence hedge accent
  px(ctx, ox, oy, 4, 27, 6, 2, season === 'winter' ? '#cbd5e1' : '#166534', s);
  px(ctx, ox, oy, 19, 27, 6, 2, season === 'winter' ? '#cbd5e1' : '#166534', s);

  if (isHovered) {
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = Math.max(2, Math.round(s * 1.1));
    ctx.strokeRect(ox + 2 * s, oy + 4 * s, 25 * s, 25 * s);
  }
}

function drawHouseFireAndSootOverlay(
  ctx: CanvasRenderingContext2D,
  tilePx: number,
  house: VillageHouse,
  fire: VillageFireState,
  tick: number
) {
  const ox = Math.floor(house.x * tilePx);
  const oy = Math.floor(house.y * tilePx);
  const s = tilePx / 16;

  // Soot aftermath marks after extinguishment
  if (!fire.active && fire.sootHouseId === house.id) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.36)';
    px(ctx, ox, oy, 6, 9, 7, 4, ctx.fillStyle as string, s);
    px(ctx, ox, oy, 16, 11, 6, 4, ctx.fillStyle as string, s);
    px(ctx, ox, oy, 10, 15, 8, 3, 'rgba(30, 41, 59, 0.28)', s);
    return;
  }

  if (!fire.active || fire.houseId !== house.id) return;
  const brigade = getFireBrigadeVisualState(fire, house);
  const fInt = brigade.fireIntensity;
  const sInt = brigade.steamIntensity;

  // Charred roof scorch tint while burning
  if (fInt > 0.05) {
    const scorchAlpha = Math.min(0.45, 0.18 + fInt * 0.26);
    ctx.fillStyle = `rgba(24, 24, 27, ${scorchAlpha.toFixed(2)})`;
    px(ctx, ox, oy, 5, 8, 19, 8, ctx.fillStyle as string, s);
    // Glowing orange interior windows
    px(ctx, ox, oy, 6, 19, 4, 4, tick % 6 < 3 ? '#f97316' : '#fde047', s);
    px(ctx, ox, oy, 19, 19, 4, 4, tick % 8 < 4 ? '#ef4444' : '#fb923c', s);
  }

  // Animated roaring flames across roof & eaves
  if (fInt > 0.04) {
    const flameSpots = [
      { x: 6, y: 12, w: 5, phase: 0 },
      { x: 12, y: 8, w: 6, phase: 2 },
      { x: 18, y: 12, w: 5, phase: 4 },
      { x: 9, y: 16, w: 4, phase: 1 },
      { x: 16, y: 17, w: 4, phase: 3 },
    ];
    for (const sp of flameSpots) {
      const flicker = Math.sin(tick * 0.38 + sp.phase * 1.4);
      const hOuter = Math.max(2, Math.round((4 + flicker * 2) * fInt * 1.35));
      px(ctx, ox, oy, sp.x, sp.y - hOuter + 2, sp.w, hOuter, '#dc2626', s);
      const hMid = Math.max(1, Math.round(hOuter * 0.72));
      px(ctx, ox, oy, sp.x + 1, sp.y - hMid + 2, Math.max(2, sp.w - 2), hMid, '#f97316', s);
      if (fInt > 0.25) {
        const hCore = Math.max(1, Math.round(hOuter * 0.4));
        px(ctx, ox, oy, sp.x + 1, sp.y - hCore + 2, Math.max(1, sp.w - 3), hCore, '#fef08a', s);
      }
    }

    // Drifting glowing embers
    for (let e = 0; e < 4; e++) {
      const rise = ((tick * 0.35 + e * 6) % 16);
      const ex = 7 + ((e * 5 + Math.floor(Math.sin(tick * 0.18 + e) * 2)) % 15);
      const ey = 10 - rise;
      px(ctx, ox, oy, ex, ey, 1, 1, e % 2 === 0 ? '#fde047' : '#fb923c', s);
    }
  }

  // Rising dark smoke plumes (fade into white steam while extinguishing)
  const smokeCount = 5;
  for (let i = 0; i < smokeCount; i++) {
    const cycle = (tick * 0.18 + i * 3.4) % 17;
    const sx = 8 + i * 3 + Math.sin(tick * 0.08 + i) * 2.2;
    const sy = 5 - cycle;
    const sz = 3 + Math.floor(cycle / 6);
    const alpha = Math.max(0.08, (1 - cycle / 17) * (0.52 * Math.max(fInt, sInt * 0.7)));
    const isSteam = sInt > fInt * 1.15 || (i % 2 === 1 && sInt > 0.35);
    ctx.fillStyle = isSteam
      ? `rgba(241, 245, 249, ${alpha.toFixed(2)})`
      : `rgba(51, 65, 85, ${alpha.toFixed(2)})`;
    px(ctx, ox, oy, sx, sy, sz, sz - 1, ctx.fillStyle as string, s);
  }
}

export function drawVillageFireBrigade(
  ctx: CanvasRenderingContext2D,
  tilePx: number,
  fire: VillageFireState,
  tick: number,
  nightFactor: number,
  isHovered: boolean
) {
  if (!fire.active) return;
  const house = VILLAGE_HOUSE_BY_ID[fire.houseId];
  if (!house) return;
  const st = getFireBrigadeVisualState(fire, house);
  const s = tilePx / 16;

  // 1. Fire Engine (Feuerwehrauto LF Sonnental) along house.streetY
  const tx = Math.floor(st.truckX * tilePx);
  const ty = Math.floor(st.truckY * tilePx);
  const bounce = st.truckMoving ? (Math.floor(tick / 4) % 2) * 0.5 : 0;

  // Truck ground shadow
  px(ctx, tx, ty, 1, 13, 24, 3, 'rgba(0,0,0,0.28)', s);

  // Main chassis & cab facing truckDir
  const cabFront = st.truckDir === 1;
  // Lower bumper & body
  px(ctx, tx, ty + bounce * s, 1, 6, 23, 6, '#dc2626', s);
  px(ctx, tx, ty + bounce * s, 1, 9, 23, 2, '#f8fafc', s); // white reflective stripe
  if (cabFront) {
    px(ctx, tx, ty + bounce * s, 16, 3, 7, 4, '#b91c1c', s); // cab top
    px(ctx, tx, ty + bounce * s, 18, 4, 4, 3, '#bae6fd', s); // windshield
    px(ctx, tx, ty + bounce * s, 23, 9, 2, 2, nightFactor > 0.2 ? '#fef08a' : '#fde68a', s); // headlight
  } else {
    px(ctx, tx, ty + bounce * s, 2, 3, 7, 4, '#b91c1c', s);
    px(ctx, tx, ty + bounce * s, 3, 4, 4, 3, '#bae6fd', s);
    px(ctx, tx, ty + bounce * s, 0, 9, 2, 2, nightFactor > 0.2 ? '#fef08a' : '#fde68a', s);
  }
  // Equipment shutters & roof ladder
  px(ctx, tx, ty + bounce * s, cabFront ? 3 : 10, 7, 11, 2, '#cbd5e1', s);
  px(ctx, tx, ty + bounce * s, cabFront ? 2 : 10, 4, 12, 2, '#94a3b8', s); // ladder
  px(ctx, tx, ty + bounce * s, cabFront ? 3 : 11, 3, 10, 1, '#e2e8f0', s);

  // Flashing blue emergency beacons!
  const flashA = Math.floor(tick / 5) % 2 === 0;
  const beaconLeftCol = flashA ? '#38bdf8' : '#1d4ed8';
  const beaconRightCol = flashA ? '#1d4ed8' : '#7dd3fc';
  px(ctx, tx, ty + bounce * s, cabFront ? 19 : 4, 1, 3, 2, beaconLeftCol, s);
  px(ctx, tx, ty + bounce * s, cabFront ? 3 : 19, 4, 2, 2, beaconRightCol, s);

  // Wheels
  const wheelSpin = st.truckMoving ? (Math.floor(tick / 3) % 2) : 0;
  for (const wxPos of [4, 18]) {
    px(ctx, tx, ty, wxPos, 11, 4, 4, '#1e293b', s);
    px(ctx, tx, ty, wxPos + 1 + wheelSpin * 0.5, 12, 2, 2, '#94a3b8', s);
  }

  // 2. Firefighters, Black Hose & Animated Pressurized Water Jet
  if (st.sprayingWater) {
    const truckCenterX = st.truckX + 0.75;
    const hoseStartX = truckCenterX * tilePx;
    const hoseStartY = (st.truckY + 0.6) * tilePx;
    const ffWorldX = truckCenterX < house.doorX ? house.doorX + 0.55 : truckCenterX - 0.5;
    const ffWorldY = house.streetY - 0.35;
    const fx = Math.floor(ffWorldX * tilePx);
    const fy = Math.floor(ffWorldY * tilePx);

    // Firefighter #1 (holding hose nozzle) + Firefighter #2 (assisting beside truck)
    const drawFirefighter = (pxX: number, pxY: number, bob: number) => {
      px(ctx, pxX, pxY, 3, 12, 2, 3, '#1e293b', s);
      px(ctx, pxX, pxY, 7, 12, 2, 3, '#1e293b', s);
      px(ctx, pxX, pxY + bob * s, 2, 7, 8, 5, '#1e293b', s); // turnout coat
      px(ctx, pxX, pxY + bob * s, 2, 9, 8, 1, '#facc15', s); // reflective band
      px(ctx, pxX, pxY + bob * s, 3, 3, 6, 4, '#f5d0b5', s); // face
      px(ctx, pxX, pxY + bob * s, 2, 1, 8, 2, '#fde047', s); // yellow helmet
      px(ctx, pxX, pxY + bob * s, 4, 0, 4, 1, '#facc15', s);
    };
    const ffBob = Math.sin(tick * 0.25) > 0.3 ? -0.5 : 0;
    drawFirefighter(fx, fy, ffBob);
    drawFirefighter(Math.floor((st.truckX + 0.35) * tilePx), Math.floor((st.truckY + 0.25) * tilePx), 0);

    // Hose connecting truck pump to firefighter
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = Math.max(2, Math.round(s * 0.8));
    ctx.beginPath();
    ctx.moveTo(hoseStartX, hoseStartY);
    ctx.quadraticCurveTo((hoseStartX + fx + 6 * s) * 0.5, hoseStartY + 5 * s, fx + 6 * s, fy + 9 * s);
    ctx.stroke();

    // Animated pressurized water stream arcing from nozzle onto burning roof!
    const nozX = fx + 6 * s;
    const nozY = fy + 8 * s;
    const targetX = (house.x + house.width * 0.52) * tilePx + Math.sin(tick * 0.11) * tilePx * 0.28;
    const targetY = (house.y + house.height * 0.42) * tilePx + Math.cos(tick * 0.14) * tilePx * 0.14;
    const midX = (nozX + targetX) * 0.5;
    const midY = Math.min(nozY, targetY) - tilePx * 0.55;

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.88)';
    ctx.lineWidth = Math.max(2.5, Math.round(s * 1.15));
    ctx.beginPath();
    ctx.moveTo(nozX, nozY);
    ctx.quadraticCurveTo(midX, midY, targetX, targetY);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(224, 242, 254, 0.92)';
    ctx.lineWidth = Math.max(1.2, Math.round(s * 0.55));
    ctx.setLineDash([4 * s, 3 * s]);
    ctx.lineDashOffset = -(tick * 1.8);
    ctx.beginPath();
    ctx.moveTo(nozX, nozY);
    ctx.quadraticCurveTo(midX, midY, targetX, targetY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Water splash droplets at impact point
    for (let d = 0; d < 4; d++) {
      const dropPhase = (tick * 0.35 + d * 1.7) % 6;
      const dx = targetX + (Math.cos(d * 2.1 + tick * 0.2) * dropPhase * 1.4) * s * 0.4;
      const dy = targetY + dropPhase * 1.1 * s * 0.4;
      ctx.fillStyle = d % 2 === 0 ? '#bae6fd' : '#ffffff';
      ctx.fillRect(Math.floor(dx), Math.floor(dy), Math.max(2, Math.round(s * 0.9)), Math.max(2, Math.round(s * 0.9)));
    }
  }

  // Hover highlight around truck & emergency badge
  if (isHovered) {
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = Math.max(2, Math.round(s * 1.1));
    ctx.strokeRect(tx, ty, 26 * s, 15 * s);
  }
}

function drawOwnerBadgeFlag(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  pxX: number,
  pxY: number,
  tick: number,
  s: number
) {
  const wave = Math.floor(tick / 10) % 2;
  px(ctx, ox, oy, pxX, pxY, 1, 8, '#f8fafc', s);
  px(ctx, ox, oy, pxX + 1, pxY, 6, 4, '#f59e0b', s);
  px(ctx, ox, oy, pxX + 2 + wave, pxY + 1, 4, 2, '#fef08a', s);
}

function drawVillageBusiness(
  ctx: CanvasRenderingContext2D,
  tilePx: number,
  biz: VillageBusinessSpec,
  season: Season,
  tick: number,
  nightFactor: number,
  isHovered: boolean,
  isOwned: boolean,
  isBroken = false
) {
  const ox = Math.floor(biz.x * tilePx);
  const oy = Math.floor(biz.y * tilePx);
  const s = tilePx / 16;
  const wPx = Math.round(biz.width * 16);
  const hPx = Math.round(biz.height * 16);
  const winCol = isBroken ? '#334155' : nightFactor > 0.28 ? '#fde047' : '#bae6fd';

  // Ground shadow
  px(ctx, ox, oy, 2, hPx - 3, wPx - 2, 5, 'rgba(0,0,0,0.24)', s);

  if (biz.id === 'west_bakery') {
    // Stone oven chimney & animated warm baking smoke
    px(ctx, ox, oy, 7, 1, 5, 9, '#9a3412', s);
    px(ctx, ox, oy, 6, 1, 7, 2, '#451a03', s);
    const puff = ((tick * 0.16) % 10) * 0.4;
    px(ctx, ox, oy, 8, -1 - puff, 3, 2, 'rgba(248, 250, 252, 0.52)', s);
    px(ctx, ox, oy, 10, -3 - puff * 1.1, 2, 2, 'rgba(248, 250, 252, 0.35)', s);

    // Warm cream facade + brick foundation
    px(ctx, ox, oy, 2, 14, wPx - 4, hPx - 14, '#fef3c7', s);
    px(ctx, ox, oy, 2, hPx - 3, wPx - 4, 3, '#78716c', s);

    // Terracotta pitched roof
    px(ctx, ox, oy, 5, 5, wPx - 10, 4, '#c2410c', s);
    px(ctx, ox, oy, 2, 9, wPx - 4, 5, '#ea580c', s);
    px(ctx, ox, oy, 1, 13, wPx - 2, 2, '#9a3412', s);
    if (season === 'winter') {
      px(ctx, ox, oy, 5, 5, wPx - 10, 2, '#f8fafc', s);
      px(ctx, ox, oy, 2, 9, wPx - 4, 2, '#e2e8f0', s);
    }

    // Golden pretzel / bread roof sign
    px(ctx, ox, oy, Math.floor(wPx / 2) - 5, 9, 10, 5, '#78350f', s);
    px(ctx, ox, oy, Math.floor(wPx / 2) - 4, 10, 8, 3, '#f59e0b', s);
    px(ctx, ox, oy, Math.floor(wPx / 2) - 2, 11, 4, 1, '#fef3c7', s);

    // Striped awning + glowing pastry display windows
    for (let sx = 4; sx < wPx - 6; sx += 4) {
      px(ctx, ox, oy, sx, 16, 2, 3, '#dc2626', s);
      px(ctx, ox, oy, sx + 2, 16, 2, 3, '#ffffff', s);
    }
    px(ctx, ox, oy, 5, 21, 9, 6, winCol, s);
    px(ctx, ox, oy, 6, 25, 3, 2, '#d97706', s); // bread loaves in display
    px(ctx, ox, oy, 10, 25, 3, 2, '#b45309', s);
    px(ctx, ox, oy, wPx - 14, 21, 9, 6, winCol, s);
    px(ctx, ox, oy, wPx - 13, 25, 3, 2, '#f59e0b', s);
    // Double wood shop door
    px(ctx, ox, oy, Math.floor(wPx / 2) - 3, 21, 6, 11, '#7c2d12', s);
    px(ctx, ox, oy, Math.floor(wPx / 2) - 2, 22, 4, 4, winCol, s);
    if (isOwned) drawOwnerBadgeFlag(ctx, ox, oy, wPx - 7, 1, tick, s);
  } else if (biz.id === 'west_supermarket') {
    // Modern flat-roofed supermarket with bright produce entrance
    px(ctx, ox, oy, 2, 10, wPx - 4, hPx - 10, '#f1f5f9', s);
    px(ctx, ox, oy, 2, hPx - 3, wPx - 4, 3, '#475569', s);

    // Roof & crisp emerald/teal fascia banner ("MARKT")
    px(ctx, ox, oy, 1, 4, wPx - 2, 6, '#334155', s);
    px(ctx, ox, oy, 3, 5, wPx - 6, 3, '#475569', s);
    px(ctx, ox, oy, 1, 10, wPx - 2, 4, '#0f766e', s);
    px(ctx, ox, oy, Math.floor(wPx / 2) - 12, 10, 24, 4, '#f59e0b', s);
    px(ctx, ox, oy, Math.floor(wPx / 2) - 9, 11, 18, 2, '#fef9c3', s);
    if (season === 'winter') {
      px(ctx, ox, oy, 1, 4, wPx - 2, 2, '#e2e8f0', s);
    }

    // Wide storefront glass windows + sliding auto entrance doors
    px(ctx, ox, oy, 6, 17, 16, 9, winCol, s);
    px(ctx, ox, oy, wPx - 22, 17, 16, 9, winCol, s);
    px(ctx, ox, oy, 6, 17, 16, 1, '#0f766e', s);
    px(ctx, ox, oy, wPx - 22, 17, 16, 1, '#0f766e', s);

    const doorMid = Math.floor(wPx / 2);
    px(ctx, ox, oy, doorMid - 6, 18, 12, 14, '#0ea5e9', s);
    px(ctx, ox, oy, doorMid - 1, 18, 2, 14, '#0f172a', s);
    px(ctx, ox, oy, doorMid - 8, 16, 16, 2, '#14b8a6', s);

    // Fruit & veg outdoor display crates left of door + shopping cart bay right of door
    px(ctx, ox, oy, 6, 28, 12, 5, '#78350f', s);
    px(ctx, ox, oy, 7, 27, 4, 2, '#ef4444', s);
    px(ctx, ox, oy, 12, 27, 5, 2, '#22c55e', s);
    px(ctx, ox, oy, wPx - 18, 28, 12, 5, '#94a3b8', s); // shopping cart shelter
    px(ctx, ox, oy, wPx - 17, 29, 3, 3, '#cbd5e1', s);
    px(ctx, ox, oy, wPx - 13, 29, 3, 3, '#cbd5e1', s);
    px(ctx, ox, oy, wPx - 9, 29, 3, 3, '#cbd5e1', s);
    if (isOwned) drawOwnerBadgeFlag(ctx, ox, oy, wPx - 8, 0, tick, s);
  } else if (biz.id === 'auto_supplier') {
    // === GROSSER AUTOMOBILZULIEFERER ("Sonnental Antriebstechnik GmbH") ===
    // Concrete industrial apron + worker parking bays on the right courtyard
    px(ctx, ox, oy, 1, hPx - 8, wPx - 2, 10, '#64748b', s);

    // Twin tall industrial chimneys rising from production hall 1
    for (const cx of [14, 26]) {
      px(ctx, ox, oy, cx, 0, 5, 14, '#7f1d1d', s);
      px(ctx, ox, oy, cx - 1, 0, 7, 2, '#334155', s);
      px(ctx, ox, oy, cx, 4, 5, 2, '#e2e8f0', s);
      const puff = ((tick * 0.14 + cx) % 12) * 0.45;
      px(ctx, ox, oy, cx + 1, -2 - puff, 4, 3, 'rgba(241, 245, 249, 0.45)', s);
      px(ctx, ox, oy, cx + 3, -5 - puff * 1.15, 3, 2, 'rgba(226, 232, 240, 0.3)', s);
    }

    // Twin large sawtooth factory halls (left ~74px wide)
    const hallW = 74;
    px(ctx, ox, oy, 2, 14, hallW, hPx - 16, '#94a3b8', s);
    px(ctx, ox, oy, 2, 14, hallW, 3, '#1e3a8a', s); // blue corporate industrial stripe
    // Sawtooth skylights along roof
    for (let rx = 4; rx < hallW - 8; rx += 17) {
      px(ctx, ox, oy, rx, 8, 15, 6, '#334155', s);
      px(ctx, ox, oy, rx + 2, 9, 10, 4, '#38bdf8', s);
      if (season === 'winter') {
        px(ctx, ox, oy, rx, 7, 15, 2, '#f8fafc', s);
      }
    }

    // High factory windows glowing warmly at night
    for (let wx = 6; wx < hallW - 10; wx += 11) {
      px(ctx, ox, oy, wx, 19, 8, 6, winCol, s);
      px(ctx, ox, oy, wx + 3, 19, 1, 6, '#334155', s);
    }

    // Two large rolling cargo bays / loading docks + parked delivery truck & crates
    for (const bx of [8, 30]) {
      px(ctx, ox, oy, bx, 28, 16, 15, '#475569', s);
      px(ctx, ox, oy, bx + 1, 29, 14, 12, '#cbd5e1', s);
      for (let ry = 31; ry < 40; ry += 3) {
        px(ctx, ox, oy, bx + 1, ry, 14, 1, '#64748b', s);
      }
    }
    // Parked industrial delivery semi/van at bay 1
    px(ctx, ox, oy, 10, 38, 12, 7, '#f8fafc', s);
    px(ctx, ox, oy, 22, 40, 5, 5, '#ea580c', s);
    px(ctx, ox, oy, 24, 41, 2, 2, '#bae6fd', s);
    px(ctx, ox, oy, 12, 45, 3, 2, '#0f172a', s);
    px(ctx, ox, oy, 23, 45, 3, 2, '#0f172a', s);
    // Steel crates beside bay 2
    px(ctx, ox, oy, 49, 36, 6, 5, '#d97706', s);
    px(ctx, ox, oy, 56, 37, 5, 4, '#2563eb', s);

    // Right Administrative & Engineering Wing + Main Entrance Gate
    const adminX = 76;
    const adminW = wPx - adminX - 2;
    px(ctx, ox, oy, adminX, 11, adminW, hPx - 13, '#e2e8f0', s);
    px(ctx, ox, oy, adminX, 8, adminW, 4, '#1e293b', s);
    if (season === 'winter') {
      px(ctx, ox, oy, adminX, 7, adminW, 2, '#f8fafc', s);
    }
    // Rooftop company sign ("ANTRIEB / WERK") + animated gear accent
    px(ctx, ox, oy, adminX + 4, 4, adminW - 8, 5, '#1d4ed8', s);
    px(ctx, ox, oy, adminX + 6, 5, adminW - 12, 3, '#fef08a', s);
    // 2 floors of office windows
    for (let ax = adminX + 4; ax < wPx - 8; ax += 9) {
      px(ctx, ox, oy, ax, 14, 6, 5, winCol, s);
      px(ctx, ox, oy, ax, 22, 6, 5, winCol, s);
    }
    // Main plant gate at doorX (~ -15.0 -> ~61px from ox)
    px(ctx, ox, oy, 57, 29, 10, 14, '#1e40af', s);
    px(ctx, ox, oy, 58, 31, 8, 12, winCol, s);

    // Worker parking lot with 3 parked commuter cars in front of admin wing
    const carColors = ['#ef4444', '#2563eb', '#eab308'];
    for (let ci = 0; ci < 3; ci++) {
      const carX = adminX + 4 + ci * 12;
      px(ctx, ox, oy, carX, 43, 9, 4, carColors[ci], s);
      px(ctx, ox, oy, carX + 2, 41, 5, 2, '#cbd5e1', s);
      px(ctx, ox, oy, carX + 1, 47, 2, 1, '#0f172a', s);
      px(ctx, ox, oy, carX + 6, 47, 2, 1, '#0f172a', s);
    }
    if (isOwned) drawOwnerBadgeFlag(ctx, ox, oy, wPx - 9, 0, tick, s);
  } else if (biz.id === 'dairy_plant') {
    // === GROSSMOLKEREI SONNENTAL (Lvl 205+) ===
    px(ctx, ox, oy, 2, hPx - 6, wPx - 4, 7, '#94a3b8', s);
    // Stainless steel milk silos on the left
    for (const sx0 of [5, 17]) {
      px(ctx, ox, oy, sx0, 4, 10, hPx - 8, '#cbd5e1', s);
      px(ctx, ox, oy, sx0 + 2, 4, 3, hPx - 8, '#f8fafc', s);
      px(ctx, ox, oy, sx0 + 1, 2, 8, 3, '#0284c7', s);
    }
    // Main hygienic cream-white hall
    const hallX = 30;
    const hallW = wPx - hallX - 2;
    px(ctx, ox, oy, hallX, 11, hallW, hPx - 14, '#f8fafc', s);
    px(ctx, ox, oy, hallX - 1, 7, hallW + 2, 5, '#0369a1', s);
    if (season === 'winter') {
      px(ctx, ox, oy, hallX - 1, 6, hallW + 2, 2, '#f1f5f9', s);
    }
    // Rooftop "MOLKEREI" sky-blue banner + milk drop emblem
    px(ctx, ox, oy, hallX + 12, 3, 44, 5, '#0284c7', s);
    px(ctx, ox, oy, hallX + 15, 4, 38, 3, '#e0f2fe', s);
    // Clerestory windows & loading bay
    for (let ax = hallX + 6; ax < wPx - 12; ax += 12) {
      px(ctx, ox, oy, ax, 15, 8, 6, winCol, s);
    }
    px(ctx, ox, oy, hallX + 14, 27, 16, 17, '#0f172a', s);
    px(ctx, ox, oy, hallX + 16, 29, 12, 14, '#bae6fd', s);
    // Refrigerated milk tanker parked out front
    px(ctx, ox, oy, hallX + 36, 36, 18, 7, '#f8fafc', s);
    px(ctx, ox, oy, hallX + 38, 38, 12, 2, '#38bdf8', s);
    px(ctx, ox, oy, hallX + 54, 38, 5, 5, '#0284c7', s);
    if (isOwned) drawOwnerBadgeFlag(ctx, ox, oy, wPx - 9, 0, tick, s);
  } else {
    // === EXPORT-KONTOR SONNENTAL (Lvl 220+) ===
    px(ctx, ox, oy, 2, hPx - 6, wPx - 4, 7, '#78716c', s);
    // Neoclassical warm limestone palace
    px(ctx, ox, oy, 3, 12, wPx - 6, hPx - 14, '#fef3c7', s);
    px(ctx, ox, oy, 1, 8, wPx - 2, 5, '#065f46', s);
    if (season === 'winter') {
      px(ctx, ox, oy, 1, 7, wPx - 2, 2, '#f1f5f9', s);
    }
    // Central Emerald Cupola / Clock Dome
    const mid = Math.floor(wPx / 2);
    px(ctx, ox, oy, mid - 12, 2, 24, 7, '#047857', s);
    px(ctx, ox, oy, mid - 8, -1, 16, 4, '#10b981', s);
    px(ctx, ox, oy, mid - 3, 3, 6, 4, '#fef08a', s);
    // Columns & Arched Grand Portal
    for (const cx of [8, 22, wPx - 26, wPx - 12]) {
      px(ctx, ox, oy, cx, 13, 4, hPx - 16, '#e7d7bf', s);
    }
    for (let ax = 30; ax < wPx - 30; ax += 11) {
      px(ctx, ox, oy, ax, 15, 7, 7, winCol, s);
    }
    px(ctx, ox, oy, mid - 7, 27, 14, 17, '#451a03', s);
    px(ctx, ox, oy, mid - 5, 29, 10, 14, '#f59e0b', s);
    // Export cargo crates beside entrance
    px(ctx, ox, oy, 10, 39, 6, 5, '#b45309', s);
    px(ctx, ox, oy, wPx - 18, 39, 6, 5, '#b45309', s);
    if (isOwned) drawOwnerBadgeFlag(ctx, ox, oy, wPx - 9, 0, tick, s);
  }

  // Breakdown / Sabotage Strobe Overlay for Lvl 200+ outages
  if (isBroken) {
    const blink = Math.floor(tick / 9) % 2 === 0;
    const midX = Math.floor(wPx / 2);
    px(ctx, ox, oy, midX - 6, 2, 12, 5, blink ? '#ef4444' : '#f59e0b', s);
    px(ctx, ox, oy, midX - 1, 3, 2, 3, '#fef08a', s);
    const puff = ((tick * 0.18) % 10) * 0.4;
    px(ctx, ox, oy, midX - 4, -2 - puff, 5, 3, 'rgba(71, 85, 105, 0.72)', s);
    px(ctx, ox, oy, midX + 2, -5 - puff, 4, 3, 'rgba(100, 116, 139, 0.55)', s);
  }

  // Subtle golden "DEIN BETRIEB" corner star/border if owned, bright yellow on hover, pulsing crimson if broken
  if (isBroken) {
    ctx.strokeStyle = Math.floor(tick / 12) % 2 === 0 ? '#ef4444' : '#fbbf24';
    ctx.lineWidth = Math.max(2, Math.round(s * 1.25));
    ctx.strokeRect(ox + 1 * s, oy + 4 * s, (wPx - 2) * s, (hPx - 4) * s);
  } else if (isHovered) {
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = Math.max(2, Math.round(s * 1.25));
    ctx.strokeRect(ox + 1 * s, oy + 4 * s, (wPx - 2) * s, (hPx - 4) * s);
  } else if (isOwned) {
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.72)';
    ctx.lineWidth = Math.max(1.5, Math.round(s * 0.9));
    ctx.strokeRect(ox + 1 * s, oy + 4 * s, (wPx - 2) * s, (hPx - 4) * s);
  }
}

export function drawNorthernVillage(
  ctx: CanvasRenderingContext2D,
  tilePx: number,
  season: Season,
  tick: number,
  nightFactor = 0,
  hoveredHouseId: string | null = null,
  isHoverVillageBoard = false,
  villageFire?: VillageFireState,
  hoveredBusinessId: VillageBusinessId | null = null,
  ownedBusinessIds: VillageBusinessId[] = [],
  brokenBusinessIds: VillageBusinessId[] = []
) {
  const s = tilePx / 16;
  const colors = getSeasonGrassColors(season);
  const flowerPalettes: Record<Season, string[]> = {
    spring: ['#facc15', '#f472b6', '#ffffff', '#fb7185'],
    summer: ['#facc15', '#ef4444', '#f97316', '#38bdf8'],
    autumn: ['#f59e0b', '#ea580c', '#fbbf24', '#dc2626'],
    winter: ['#e0f2fe', '#93c5fd', '#f8fafc', '#fda4af'],
  };
  const fColors = flowerPalettes[season];

  // 1. Extended meadow backdrop across wy = -17 .. -1, wx = -29 .. WORLD_SIZE + 1 (includes expanded Westviertel!)
  for (let wy = -17; wy <= -1; wy++) {
    for (let wx = -29; wx <= WORLD_SIZE + 1; wx++) {
      const ox = wx * tilePx;
      const oy = wy * tilePx;
      const checker = (wx + wy + 100) % 2 === 0;

      // Continue East River gently from the northern mountains into the valley
      if (wx === WORLD_SIZE - 2) {
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(ox, oy, tilePx, tilePx);
        const wave = Math.floor(tick / 18 + wx + wy + 50) % 3;
        px(ctx, ox, oy, 2 + wave * 3, 5, 5, 1, nightFactor > 0.35 ? '#e0f2fe' : '#7dd3fc', s);
        px(ctx, ox, oy, 8 - wave * 2, 11, 4, 1, nightFactor > 0.35 ? '#f8fafc' : '#bae6fd', s);
        continue;
      }

      // Grass tile (slightly warmer industrial gravel tint in NW factory courtyard)
      ctx.fillStyle = checker ? colors.locked : season === 'winter' ? '#6d7f94' : '#325925';
      if (season === 'autumn') ctx.fillStyle = checker ? '#5b5124' : '#4f461f';
      ctx.fillRect(ox, oy, tilePx, tilePx);

      // Village street grid:
      // Horizontal avenues at wy = -2, -7, -12 extending cleanly across expanded Westviertel & Core Village (wx = -27..27)
      const isHorizStreet = (wy === -2 || wy === -7 || wy === -12) && wx >= -27 && wx <= 27;
      const isGateAvenue = (wx === 7 || wx === 8) && wy >= -12 && wy <= -1;
      const isParkGateAvenue = (wx === -9 || wx === -8) && wy === -1;
      const isVertLane =
        (wx === -27 ||
          wx === -19 ||
          wx === -14 ||
          wx === -8 ||
          wx === -1 ||
          wx === 2 ||
          wx === 13 ||
          wx === 14 ||
          wx === 20 ||
          wx === 25) &&
        wy >= -12 &&
        wy <= -2;
      const isDorfplatz = wx >= 12 && wx <= 15 && wy >= -8 && wy <= -6;

      if (isHorizStreet || isGateAvenue || isParkGateAvenue || isVertLane || isDorfplatz) {
        ctx.fillStyle = '#c8b496';
        ctx.fillRect(ox, oy, tilePx, tilePx);
        px(ctx, ox, oy, 2, 2, 5, 4, '#b39e7f', s);
        px(ctx, ox, oy, 9, 9, 5, 4, '#b39e7f', s);
        if (isDorfplatz && (wx + wy) % 2 === 0) {
          px(ctx, ox, oy, 5, 6, 4, 3, '#d6c7ae', s);
        }
        continue;
      }

      // Outer mountain/forest treeline framing the expanded village cleanly (wy <= -16, wx <= -28, or east forest edge)
      const isOuterFrame = wy <= -16 || wx <= -28 || wx >= WORLD_SIZE;
      const hash = Math.abs(wx * 37 + wy * 19) % 13;
      if (isOuterFrame) {
        px(ctx, ox, oy, 6, 11, 4, 4, '#5c3a21', s);
        px(ctx, ox, oy, 3, 5, 10, 7, season === 'winter' ? '#64748b' : season === 'autumn' ? '#b45309' : '#1e4618', s);
        px(ctx, ox, oy, 4, 2, 8, 5, season === 'winter' ? '#e2e8f0' : season === 'autumn' ? '#d97706' : '#2d6623', s);
      } else if (
        wy === -1 &&
        wx !== 7 &&
        wx !== 8 &&
        wx !== -9 &&
        wx !== -8 &&
        wx !== -1 &&
        wx !== -14 &&
        wx !== -19 &&
        wx !== -27 &&
        hash <= 2
      ) {
        // Gentle ornamental trees & shrubs along the south village hedge
        px(ctx, ox, oy, 6, 11, 4, 4, '#5c3a21', s);
        px(ctx, ox, oy, 3, 6, 10, 6, season === 'winter' ? '#64748b' : season === 'autumn' ? '#b45309' : '#24521c', s);
        px(ctx, ox, oy, 5, 3, 6, 4, season === 'winter' ? '#e2e8f0' : season === 'autumn' ? '#d97706' : '#347429', s);
      } else if (hash >= 7 && wy > -16 && wx > -11) {
        // Wildflowers in residential village lawns
        const stem = season === 'winter' ? '#94a3b8' : '#22c55e';
        const fc = fColors[(Math.abs(wx + wy)) % fColors.length];
        px(ctx, ox, oy, 4, 8, 1, 2, stem, s);
        px(ctx, ox, oy, 4, 6, 2, 2, fc, s);
        px(ctx, ox, oy, 11, 12, 1, 2, stem, s);
        px(ctx, ox, oy, 11, 10, 2, 2, fColors[(Math.abs(wx * 3 + wy)) % fColors.length], s);
      }
    }
  }

  // 2. Cobblestone front footpaths from every house door & business entrance to its street
  for (const house of VILLAGE_HOUSES) {
    const pathX = (house.doorX - 0.12) * tilePx;
    const pathStartY = (house.y + house.height - 0.15) * tilePx;
    const pathEndY = (house.streetY + 0.3) * tilePx;
    const pathH = Math.max(4, pathEndY - pathStartY);
    ctx.fillStyle = '#c8b496';
    ctx.fillRect(Math.floor(pathX), Math.floor(pathStartY), Math.max(6, Math.round(tilePx * 0.48)), Math.floor(pathH));
    ctx.fillStyle = '#b39e7f';
    ctx.fillRect(Math.floor(pathX + 2 * s), Math.floor(pathStartY + 3 * s), Math.max(3, Math.round(tilePx * 0.24)), Math.max(3, Math.round(4 * s)));
  }
  for (const biz of VILLAGE_BUSINESSES) {
    const isLarge = biz.id === 'auto_supplier' || biz.id === 'dairy_plant' || biz.id === 'trade_office';
    const bw = isLarge ? 1.4 : 0.9;
    const pathX = (biz.doorX - bw * 0.35) * tilePx;
    const pathStartY = (biz.y + biz.height - 0.15) * tilePx;
    const pathEndY = (biz.streetY + 0.3) * tilePx;
    const pathH = Math.max(4, pathEndY - pathStartY);
    ctx.fillStyle = biz.id === 'auto_supplier' || biz.id === 'dairy_plant' ? '#94a3b8' : '#c8b496';
    ctx.fillRect(Math.floor(pathX), Math.floor(pathStartY), Math.max(8, Math.round(tilePx * bw)), Math.floor(pathH));
  }

  // 3. Dorfplatz stone fountain (Dorfbrunnen) at (13.3, -7.4)
  {
    const fx = Math.floor(13.2 * tilePx);
    const fy = Math.floor(-7.5 * tilePx);
    px(ctx, fx, fy, 1, 10, 22, 8, '#64748b', s);
    px(ctx, fx, fy, 3, 11, 18, 5, '#0284c7', s);
    px(ctx, fx, fy, 9, 4, 6, 9, '#94a3b8', s);
    px(ctx, fx, fy, 8, 2, 8, 3, '#cbd5e1', s);
    const splash = Math.floor(tick / 8) % 2;
    px(ctx, fx, fy, 10, 1 - splash, 4, 2, '#bae6fd', s);
    px(ctx, fx, fy, 5 + splash * 2, 12, 5, 2, '#bae6fd', s);
  }

  // 3b. Schwarzes Brett am Dorfplatz (wx = 12, wy = -8..-7)
  {
    const bx = Math.floor(12.05 * tilePx);
    const by = Math.floor(-7.85 * tilePx);
    px(ctx, bx, by, 2, 15, 14, 2, 'rgba(0,0,0,0.2)', s); // shadow
    px(ctx, bx, by, 3, 9, 2, 7, '#78350f', s); // left post
    px(ctx, bx, by, 13, 9, 2, 7, '#78350f', s); // right post
    px(ctx, bx, by, 2, 3, 14, 8, '#92400e', s); // wooden board frame
    px(ctx, bx, by, 1, 1, 16, 2, season === 'winter' ? '#e2e8f0' : '#451a03', s); // shingled roof
    // 3 colorful parchment notes pinned on the board
    px(ctx, bx, by, 4, 4, 3, 4, '#fef3c7', s);
    px(ctx, bx, by, 5, 4, 1, 1, '#dc2626', s);
    px(ctx, bx, by, 8, 5, 3, 4, '#fef9c3', s);
    px(ctx, bx, by, 9, 5, 1, 1, '#16a34a', s);
    px(ctx, bx, by, 12, 4, 2, 4, '#fde68a', s);
    px(ctx, bx, by, 8, 2, 2, 1, nightFactor > 0.25 ? '#fde047' : '#f59e0b', s); // tiny board lamp
    if (isHoverVillageBoard) {
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = Math.max(2, Math.round(s * 1.1));
      ctx.strokeRect(bx + 1 * s, by + 1 * s, 16 * s, 15 * s);
    }
  }

  // 4. All village resident houses (sorted top-to-bottom), plus active fire/soot overlays
  const housesSorted = [...VILLAGE_HOUSES].sort((a, b) => a.y - b.y);
  for (const house of housesSorted) {
    drawVillageHouse(ctx, tilePx, house, season, tick, nightFactor, hoveredHouseId === house.id);
    if (villageFire && ((villageFire.active && villageFire.houseId === house.id) || villageFire.sootHouseId === house.id)) {
      drawHouseFireAndSootOverlay(ctx, tilePx, house, villageFire, tick);
    }
  }

  // 4b. Westviertel Commercial & Industrial Buildings
  const businessesSorted = [...VILLAGE_BUSINESSES].sort((a, b) => a.y - b.y);
  for (const biz of businessesSorted) {
    drawVillageBusiness(
      ctx,
      tilePx,
      biz,
      season,
      tick,
      nightFactor,
      hoveredBusinessId === biz.id,
      ownedBusinessIds.includes(biz.id),
      brokenBusinessIds.includes(biz.id)
    );
  }

  // 5. Village wooden street lanterns
  for (const lamp of VILLAGE_LANTERN_SPOTS) {
    const lx = Math.floor(lamp.wx * tilePx);
    const ly = Math.floor(lamp.wy * tilePx);
    px(ctx, lx, ly, 6, 4, 2, 10, '#451a03', s);
    px(ctx, lx, ly, 5, 2, 4, 3, '#1e293b', s);
    px(ctx, lx, ly, 6, 3, 2, 2, nightFactor > 0.22 ? '#fde047' : '#bae6fd', s);
  }
}

export function drawFishingCast(
  ctx: CanvasRenderingContext2D,
  tilePx: number,
  playerWorldX: number,
  playerWorldY: number,
  bobberWorldX: number,
  bobberWorldY: number,
  phase: 'waiting' | 'biting',
  tick: number
) {
  const s = Math.max(2, tilePx / 16);
  const handX = (playerWorldX + 0.85) * tilePx;
  const handY = (playerWorldY + 0.35) * tilePx;
  const rodTipX = handX + tilePx * 0.48;
  const rodTipY = handY - tilePx * 0.42;

  const bobberBaseX = (bobberWorldX + 0.5) * tilePx;
  const bobFloat = phase === 'biting' ? Math.sin(tick * 0.55) * 4 : Math.sin(tick * 0.12) * 1.5;
  const bobberY = (bobberWorldY + 0.5) * tilePx + bobFloat;

  // Fishing rod
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = Math.max(2, Math.round(s * 0.9));
  ctx.beginPath();
  ctx.moveTo(handX, handY);
  ctx.lineTo(rodTipX, rodTipY);
  ctx.stroke();

  // Fishing line
  ctx.strokeStyle = 'rgba(248, 250, 252, 0.85)';
  ctx.lineWidth = Math.max(1, Math.round(s * 0.45));
  ctx.beginPath();
  ctx.moveTo(rodTipX, rodTipY);
  ctx.quadraticCurveTo((rodTipX + bobberBaseX) / 2, rodTipY + tilePx * 0.25, bobberBaseX, bobberY);
  ctx.stroke();

  // Water ripples
  const ringR = tilePx * (0.18 + ((tick % 24) / 24) * 0.22);
  ctx.strokeStyle = phase === 'biting' ? 'rgba(254, 240, 138, 0.9)' : 'rgba(224, 242, 254, 0.65)';
  ctx.lineWidth = Math.max(1.5, s * 0.5);
  ctx.beginPath();
  ctx.ellipse(bobberBaseX, bobberY + 2, ringR, ringR * 0.55, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Red & white pixel bobber
  const bs = Math.max(3, Math.round(s * 1.5));
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(Math.floor(bobberBaseX - bs / 2), Math.floor(bobberY - bs), bs, bs);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(Math.floor(bobberBaseX - bs / 2), Math.floor(bobberY), bs, Math.max(2, Math.floor(bs * 0.7)));

  // Exclamation indicator when fish is biting!
  if (phase === 'biting') {
    const bx = Math.floor(bobberBaseX - 5 * s);
    const by = Math.floor(bobberY - 12 * s);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(bx, by, 10 * s, 9 * s);
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, 10 * s, 9 * s);
    ctx.fillStyle = '#b91c1c';
    ctx.font = `800 ${Math.round(tilePx * 0.42)}px "Outfit", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('!', bobberBaseX, by + 7 * s);
  }
}

export function drawFarmhouse(
  ctx: CanvasRenderingContext2D,
  tilePx: number,
  house: HouseState,
  tick: number,
  isHovered: boolean,
  nightFactor = 0,
  highGraphics = false,
  shadowSpec?: SunShadowSpec
) {
  // Farmhouse sits on world tiles (1, 1) to (3, 3) -> 3x2.5 tiles big!
  const ox = 1 * tilePx;
  const oy = 0.6 * tilePx;
  const s = tilePx / 16;
  const windowColor = nightFactor > 0.3 ? '#fde047' : '#38bdf8';

  // Cozy warm farmhouse glow aura at dusk & full-moon night
  if (nightFactor > 0.25) {
    ctx.fillStyle = `rgba(251, 191, 36, ${(nightFactor * 0.18).toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(ox + 24 * s, oy + 24 * s, tilePx * 1.9, 0, Math.PI * 2);
    ctx.fill();
  }

  // Base footprint shadow (+ directional sun shadow on High)
  if (highGraphics && shadowSpec?.active) {
    px(
      ctx,
      ox,
      oy,
      2 + shadowSpec.dx * 1.45,
      33 + shadowSpec.dy * 1.25,
      46,
      7,
      `rgba(0,0,0,${shadowSpec.alpha.toFixed(2)})`,
      s
    );
  } else {
    px(ctx, ox, oy, 2, 34, 44, 5, 'rgba(0,0,0,0.22)', s);
  }

  // Extras: Veranda porch in front
  if (house.extras.includes('veranda')) {
    px(ctx, ox, oy, 2, 31, 44, 5, '#92400e', s);
    px(ctx, ox, oy, 4, 32, 40, 2, '#b45309', s);
  }

  // Ground floor (1. Etage)
  px(ctx, ox, oy, 4, 20, 40, 14, '#fef3c7', s);
  if (highGraphics) {
    px(ctx, ox, oy, 4, 32, 40, 2, '#e5d4a6', s); // ground splash shadow
    px(ctx, ox, oy, 4, 20, 2, 14, '#fffbeb', s); // left edge highlight
  }
  px(ctx, ox, oy, 4, 20, 40, 2, '#78350f', s); // timber beam
  // Front door
  px(ctx, ox, oy, 20, 24, 8, 10, '#78350f', s);
  if (highGraphics) px(ctx, ox, oy, 21, 25, 6, 9, '#92400e', s);
  px(ctx, ox, oy, 26, 29, 1, 1, '#facc15', s);
  // Warm windows (glow amber at dusk/night)
  px(ctx, ox, oy, 8, 24, 7, 5, windowColor, s);
  px(ctx, ox, oy, 33, 24, 7, 5, windowColor, s);
  px(ctx, ox, oy, 8, 24, 7, 1, '#92400e', s);
  px(ctx, ox, oy, 33, 24, 7, 1, '#92400e', s);
  if (highGraphics) {
    px(ctx, ox, oy, 9, 25, 2, 2, 'rgba(255,255,255,0.45)', s);
    px(ctx, ox, oy, 34, 25, 2, 2, 'rgba(255,255,255,0.45)', s);
  }

  // Extra: Greenhouse Bay Window on the right side
  if (house.extras.includes('bay_greenhouse')) {
    px(ctx, ox, oy, 44, 23, 7, 10, '#047857', s);
    px(ctx, ox, oy, 45, 24, 5, 7, nightFactor > 0.3 ? '#fef08a' : '#a7f3d0', s);
  }

  // Extra: Mushroom cellar trapdoor on the left side
  if (house.extras.includes('mushroom_cellar')) {
    px(ctx, ox, oy, -2, 28, 6, 6, '#57534e', s);
    px(ctx, ox, oy, -1, 29, 4, 4, '#2dd4bf', s);
  }

  // Extra: Rain cistern barrel
  if (house.extras.includes('rain_cistern')) {
    px(ctx, ox, oy, -1, 21, 5, 6, '#1d4ed8', s);
    px(ctx, ox, oy, 0, 20, 3, 2, '#93c5fd', s);
  }

  let roofTopY = 20;

  // 2. Etage
  if (house.floors >= 2) {
    px(ctx, ox, oy, 6, 11, 36, 10, '#fde68a', s);
    px(ctx, ox, oy, 6, 11, 36, 2, '#78350f', s);
    px(ctx, ox, oy, 11, 14, 6, 4, windowColor, s);
    px(ctx, ox, oy, 21, 14, 6, 4, windowColor, s);
    px(ctx, ox, oy, 31, 14, 6, 4, windowColor, s);
    roofTopY = 11;
  }

  // 3. Etage (Sternwarte & Balkon)
  if (house.floors >= 3) {
    px(ctx, ox, oy, 12, 3, 24, 9, '#fef9c3', s);
    px(ctx, ox, oy, 10, 9, 28, 2, '#92400e', s); // balcony rail
    px(ctx, ox, oy, 16, 5, 5, 3, windowColor, s);
    px(ctx, ox, oy, 27, 5, 5, 3, windowColor, s);
    roofTopY = 3;
  }

  // 4. Etage (Hof-Akademie & Dachterrasse)
  if (house.floors >= 4) {
    px(ctx, ox, oy, 16, -5, 16, 9, '#fde047', s);
    px(ctx, ox, oy, 14, 1, 20, 2, '#78350f', s); // terrace rail
    px(ctx, ox, oy, 20, -3, 8, 4, windowColor, s);
    px(ctx, ox, oy, 22, -7, 4, 2, '#facc15', s); // gold turret banner
    roofTopY = -5;
  }

  // Extra: Alchemy Cellar crystal vent on left
  if (house.extras.includes('alchemy_cellar')) {
    px(ctx, ox, oy, -3, 33, 6, 4, '#4c1d95', s);
    px(ctx, ox, oy, -2, 34, 4, 2, '#a855f7', s);
  }

  // Extra: Master Library winged gable
  if (house.extras.includes('master_library')) {
    px(ctx, ox, oy, 44, 15, 7, 8, '#7c2d12', s);
    px(ctx, ox, oy, 45, 17, 5, 4, windowColor, s);
  }

  // Pitched Pixel Roof
  for (let i = 0; i < 7; i++) {
    px(ctx, ox, oy, 2 + i * 2, roofTopY - i - 1, 44 - i * 4, 2, highGraphics && i === 6 ? '#ef4444' : '#b91c1c', s);
    if (highGraphics && i === 0) {
      px(ctx, ox, oy, 2, roofTopY, 44, 1, '#7f1d1d', s);
    }
  }

  // Extra: Star Observatory glass dome on roof
  if (house.extras.includes('star_observatory')) {
    px(ctx, ox, oy, 20, roofTopY - 11, 8, 6, '#38bdf8', s);
    px(ctx, ox, oy, 22, roofTopY - 12, 4, 2, '#fef08a', s);
  }

  // Extra: Chimney + animated smoke
  if (house.extras.includes('fireplace')) {
    px(ctx, ox, oy, 34, roofTopY - 9, 4, 7, '#57534e', s);
    const puff = Math.floor(tick / 14) % 4;
    px(ctx, ox, oy, 35, roofTopY - 11 - puff, 2, 2, 'rgba(241,245,249,0.75)', s);
    px(ctx, ox, oy, 36, roofTopY - 14 - puff, 2, 2, 'rgba(241,245,249,0.45)', s);
  }

  // Extra: Golden Weathervane
  if (house.extras.includes('weathervane')) {
    px(ctx, ox, oy, 23, roofTopY - 11, 2, 5, '#facc15', s);
    px(ctx, ox, oy, 21, roofTopY - 10, 6, 1, '#fef08a', s);
  }

  // Extra: Bell Tower
  if (house.extras.includes('bell_tower')) {
    px(ctx, ox, oy, 14, roofTopY - 10, 5, 6, '#92400e', s);
    px(ctx, ox, oy, 15, roofTopY - 8, 3, 3, '#facc15', s);
  }

  // Extra: Hof-Wappen crest above door
  if (house.extras.includes('crest')) {
    px(ctx, ox, oy, 22, 20, 4, 3, '#facc15', s);
    px(ctx, ox, oy, 23, 21, 2, 1, '#dc2626', s);
  }

  if (isHovered) {
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 2;
    ctx.strokeRect(ox + 2 * s, oy + (roofTopY - 7) * s, 44 * s, (42 - roofTopY) * s);
  }
}

export function drawFarmShop(
  ctx: CanvasRenderingContext2D,
  tilePx: number,
  farmShop: FarmShopState,
  tick: number,
  isHovered: boolean,
  nightFactor = 0,
  highGraphics = false,
  shadowSpec?: SunShadowSpec
) {
  // Positioned in the red-marked area south of Farmhouse: wx 1.0..2.9, wy 4.25..6.3
  const ox = 1.05 * tilePx;
  const oy = 4.25 * tilePx;
  const s = tilePx / 16;
  const totalStock = Object.values(farmShop?.stock || {}).reduce((a, b) => a + b, 0);
  const windowColor = nightFactor > 0.3 || totalStock > 0 ? '#fde68a' : '#bae6fd';

  // Soft shadow (+ directional sun shadow on High)
  if (highGraphics && shadowSpec?.active) {
    px(
      ctx,
      ox,
      oy,
      1 + shadowSpec.dx * 1.25,
      28 + shadowSpec.dy * 1.1,
      32,
      6,
      `rgba(0,0,0,${shadowSpec.alpha.toFixed(2)})`,
      s
    );
  } else {
    px(ctx, ox, oy, 1, 29, 30, 5, 'rgba(0,0,0,0.22)', s);
  }

  // Wooden base & timber walls
  px(ctx, ox, oy, 2, 13, 28, 17, '#fef3c7', s);
  if (highGraphics) {
    px(ctx, ox, oy, 4, 26, 24, 2, '#e5d4a6', s);
  }
  px(ctx, ox, oy, 2, 13, 28, 2, '#78350f', s);
  px(ctx, ox, oy, 2, 28, 28, 2, '#78350f', s);
  px(ctx, ox, oy, 2, 13, 2, 17, '#78350f', s);
  px(ctx, ox, oy, 28, 13, 2, 17, '#78350f', s);

  // Wooden front door centered around world x ~ 1.95
  px(ctx, ox, oy, 12, 21, 6, 9, '#78350f', s);
  px(ctx, ox, oy, 13, 22, 4, 7, '#92400e', s);
  px(ctx, ox, oy, 16, 25, 1, 1, '#facc15', s);

  // Market display counter & shop window on left & right
  px(ctx, ox, oy, 4, 17, 7, 6, windowColor, s);
  px(ctx, ox, oy, 4, 17, 7, 1, '#78350f', s);
  px(ctx, ox, oy, 20, 17, 7, 6, windowColor, s);
  px(ctx, ox, oy, 20, 17, 7, 1, '#78350f', s);
  px(ctx, ox, oy, 3, 23, 8, 2, '#b45309', s); // counter shelf left
  px(ctx, ox, oy, 19, 23, 9, 2, '#b45309', s); // counter shelf right

  // Display artisan wares in window/counter when stocked!
  if (totalStock > 0) {
    px(ctx, ox, oy, 5, 20, 2, 3, '#dc2626', s); // jam jar
    px(ctx, ox, oy, 8, 20, 2, 3, '#f59e0b', s); // honey / cheese
    px(ctx, ox, oy, 21, 20, 2, 3, '#d97706', s); // bread / bottle
    px(ctx, ox, oy, 24, 19, 2, 4, '#16a34a', s); // craft bottle
  } else {
    px(ctx, ox, oy, 5, 21, 5, 2, '#cbd5e1', s);
    px(ctx, ox, oy, 21, 21, 5, 2, '#cbd5e1', s);
  }

  // Striped red-cream market awning
  for (let i = 0; i < 7; i++) {
    px(ctx, ox, oy, 2 + i * 4, 13, 4, 4, i % 2 === 0 ? '#dc2626' : '#fef3c7', s);
  }
  px(ctx, ox, oy, 2, 16, 28, 1, '#991b1b', s);

  // Pitched pixel shop roof
  for (let i = 0; i < 6; i++) {
    px(ctx, ox, oy, 1 + i * 2, 11 - i, 30 - i * 4, 2, highGraphics && i === 5 ? '#dc2626' : '#991b1b', s);
  }
  // Wooden roof ridge & signboard
  px(ctx, ox, oy, 9, 8, 14, 5, '#78350f', s);
  px(ctx, ox, oy, 10, 9, 12, 3, '#fde68a', s);
  ctx.fillStyle = '#4a321f';
  ctx.font = `800 ${Math.max(8, Math.round(tilePx * 0.17))}px "Outfit", sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('HOFLADEN', ox + 16 * s, oy + 11.4 * s);

  // Hanging lantern by the shop door
  px(ctx, ox, oy, 19, 21, 2, 2, '#334155', s);
  px(ctx, ox, oy, 19, 22, 2, 2, nightFactor > 0.25 ? '#fef08a' : '#f59e0b', s);

  // Subtle floating "OFFEN" indicator when stocked & shop is active
  if (totalStock > 0) {
    const pulse = Math.round(Math.sin(tick * 0.12));
    px(ctx, ox, oy + pulse * s * 0.5, 11, 2, 10, 4, '#15803d', s);
    ctx.fillStyle = '#fef9c3';
    ctx.font = `800 ${Math.max(7, Math.round(tilePx * 0.15))}px "Outfit", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`×${totalStock}`, ox + 16 * s, oy + (4.9 + pulse * 0.5) * s);
  }

  if (isHovered) {
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(ox + s, oy + 4 * s, 30 * s, 27 * s);
  }
}

export function drawShopVisitor(
  ctx: CanvasRenderingContext2D,
  tilePx: number,
  visitor: ShopVisitor,
  tick: number,
  weather: WeatherType = 'sunny'
) {
  const s = Math.max(2, Math.floor(tilePx / 16));
  const ox = Math.floor(visitor.x * tilePx + (tilePx - 16 * s) / 2);
  const oy = Math.floor(visitor.y * tilePx + (tilePx - 16 * s) / 2 - s * 2);

  if (visitor.phase === 'browsing') {
    // Customer stands right inside the doorway counter with animated browsing dots
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(ox + 4 * s, oy + 13 * s, 8 * s, 2 * s);
    px(ctx, ox, oy, 5, 7, 6, 5, visitor.shirtColor, s);
    px(ctx, ox, oy, 5, 3, 6, 4, visitor.skinTone, s);
    px(ctx, ox, oy, 5, 2, 6, 2, visitor.hairColor, s);
    if (visitor.hatColor) {
      px(ctx, ox, oy, 5, 0, 6, 2, visitor.hatColor, s);
    }
    const dotPhase = Math.floor(tick / 12) % 3;
    px(ctx, ox, oy, 5, -3, 6, 3, '#faf6ee', s);
    for (let i = 0; i <= dotPhase; i++) {
      px(ctx, ox, oy, 6 + i * 2, -2, 1, 1, '#4a321f', s);
    }
    return;
  }

  const bob = Math.sin(tick * 0.36 + visitor.x * 2) > 0 ? -1 : 0;
  const step = Math.sin(tick * 0.42 + visitor.y * 2) * 1.1;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(ox + 4 * s, oy + 14 * s, 8 * s, 2 * s);

  const by = oy + bob * s;
  // Legs
  px(ctx, ox, oy, 5, 11 + Math.max(0, step), 2, 3, '#334155', s);
  px(ctx, ox, oy, 9, 11 + Math.max(0, -step), 2, 3, '#334155', s);
  // Shirt & trousers
  px(ctx, ox, by, 4, 7, 8, 5, visitor.shirtColor, s);
  // Arms
  px(ctx, ox, by, 3, 7, 1, 3, visitor.skinTone, s);
  px(ctx, ox, by, 12, 7, 1, 3, visitor.skinTone, s);
  // Head & hair
  px(ctx, ox, by, 5, 3, 6, 4, visitor.skinTone, s);
  px(ctx, ox, by, 4, 1, 8, 2, visitor.hairColor, s);
  // Archetype headwear
  if (visitor.archetype === 'bulk_buyer') {
    px(ctx, ox, by, 5, -1, 6, 2, '#f8fafc', s); // chef toque
    px(ctx, ox, by, 4, 1, 8, 1, '#e2e8f0', s);
  } else if (visitor.archetype === 'gourmet') {
    px(ctx, ox, by, 4, 0, 8, 2, '#5b21b6', s); // gourmet beret
  } else if (visitor.hatColor) {
    px(ctx, ox, by, 4, 0, 8, 2, visitor.hatColor, s);
  }
  px(ctx, ox, by, 6, 5, 1, 1, '#1e293b', s);
  px(ctx, ox, by, 9, 5, 1, 1, '#1e293b', s);

  const hasUmbrella = weather === 'rainy' || weather === 'stormy';
  if (hasUmbrella) {
    px(ctx, ox, by, 12, 1, 1, 7, '#451a03', s);
    px(ctx, ox, by, 3, -4, 11, 3, visitor.shirtColor, s);
    px(ctx, ox, by, 5, -5, 7, 1, visitor.shirtColor, s);
    px(ctx, ox, by, 8, -6, 1, 1, '#cbd5e1', s);
  }

  // Shopping bags, coin badge & heart if visitor bought items!
  const badgeDy = hasUmbrella ? -6 : 0;
  if (visitor.phase === 'leaving' && visitor.boughtCoins) {
    px(ctx, ox, by, 12, 9, 3, 3, '#b45309', s); // primary farm bag
    if ((visitor.boughtTotalQty ?? 1) >= 3) {
      px(ctx, ox, by, 1, 9, 3, 3, '#d97706', s); // second farm bag for multi-item/bulk haul!
    }
    px(ctx, ox, by, 6, -4 + badgeDy, 4, 4, '#facc15', s); // coin glow
    px(ctx, ox, by, 7, -3 + badgeDy, 2, 2, '#fef9c3', s);
    if (visitor.archetype === 'neighbor' || (visitor.boughtTipCoins ?? 0) > 0) {
      px(ctx, ox, by, 11, -4 + badgeDy, 2, 2, '#f43f5e', s); // happy heart / tip spark
      px(ctx, ox, by, 13, -4 + badgeDy, 2, 2, '#f43f5e', s);
      px(ctx, ox, by, 12, -3 + badgeDy, 2, 2, '#f43f5e', s);
    }
  } else if (visitor.phase === 'leaving' && visitor.leftEmptyHanded) {
    px(ctx, ox, by, 5, -5 + badgeDy, 6, 4, '#faf6ee', s);
    px(ctx, ox, by, 7, -4 + badgeDy, 2, 1, '#b45309', s);
    px(ctx, ox, by, 8, -3 + badgeDy, 1, 1, '#b45309', s);
    px(ctx, ox, by, 7, -2 + badgeDy, 1, 1, '#b45309', s);
  }
}

export function drawMailbox(
  ctx: CanvasRenderingContext2D,
  tilePx: number,
  mailbox: MailboxState | undefined,
  tick: number,
  isHovered: boolean
) {
  // Positioned right beside the Farmhouse entrance on world tile (4, 3)
  const ox = 4 * tilePx;
  const oy = 3 * tilePx;
  const s = tilePx / 16;
  const hasMail = Boolean(mailbox?.pendingMail);

  // Soft shadow on cobblestone edge
  px(ctx, ox, oy, 4, 13, 8, 2, 'rgba(0,0,0,0.22)', s);

  // Sturdy wooden post
  px(ctx, ox, oy, 7, 8, 2, 6, '#78350f', s);
  px(ctx, ox, oy, 6, 13, 4, 1, '#573720', s);

  // Steel/blue-slate mailbox body with arched top
  px(ctx, ox, oy, 4, 4, 8, 5, '#334155', s);
  px(ctx, ox, oy, 5, 3, 6, 1, '#475569', s);
  px(ctx, ox, oy, 4, 5, 2, 4, '#1e293b', s); // dark front flap
  px(ctx, ox, oy, 7, 6, 4, 1, '#facc15', s); // brass nameplate

  // White folded mail edge peeking out when full
  if (hasMail) {
    px(ctx, ox, oy, 3, 6, 2, 2, '#fef9c3', s);
  }

  // Red signal flag (UP when mail waiting, DOWN when empty)
  if (hasMail) {
    px(ctx, ox, oy, 11, 1, 1, 5, '#dc2626', s);
    px(ctx, ox, oy, 11, 1, 3, 2, '#ef4444', s);
    // Gentle bobbing envelope notification badge
    const bob = Math.round(Math.sin(tick * 0.14) * 1.4);
    px(ctx, ox, oy + bob * s, 4, -5, 8, 5, '#fef9c3', s);
    px(ctx, ox, oy + bob * s, 4, -5, 8, 1, '#b45309', s);
    px(ctx, ox, oy + bob * s, 4, -1, 8, 1, '#b45309', s);
    px(ctx, ox, oy + bob * s, 5, -4, 2, 1, '#dc2626', s);
    px(ctx, ox, oy + bob * s, 9, -4, 2, 1, '#dc2626', s);
    px(ctx, ox, oy + bob * s, 7, -3, 2, 1, '#dc2626', s);
  } else {
    px(ctx, ox, oy, 11, 6, 3, 1, '#991b1b', s);
  }

  if (isHovered) {
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 2;
    ctx.strokeRect(ox + 2 * s, oy + 1 * s, 12 * s, 14 * s);
  }
}

export function drawPostman(
  ctx: CanvasRenderingContext2D,
  tilePx: number,
  postman: PostmanState,
  tick: number
) {
  if (!postman.active) return;
  const s = Math.max(2, Math.floor(tilePx / 16));
  const ox = Math.floor(postman.x * tilePx + (tilePx - 16 * s) / 2);
  const oy = Math.floor(postman.y * tilePx + (tilePx - 16 * s) / 2 - s * 2);
  const isWalking = postman.phase !== 'delivering';
  const facingLeft = postman.phase === 'to_box' || postman.phase === 'delivering';
  const bob = isWalking && Math.sin(tick * 0.38) > 0 ? -1 : 0;
  const step = isWalking ? Math.sin(tick * 0.44) * 1.2 : 0;

  // Ground shadow
  ctx.fillStyle = 'rgba(0,0,0,0.24)';
  ctx.fillRect(ox + 4 * s, oy + 14 * s, 8 * s, 2 * s);

  const by = oy + bob * s;
  // Trousers & boots
  px(ctx, ox, oy, 5, 11 + Math.max(0, step), 2, 3, '#1e293b', s);
  px(ctx, ox, oy, 9, 11 + Math.max(0, -step), 2, 3, '#1e293b', s);

  // Royal-blue postal jacket & yellow posthorn stripe
  px(ctx, ox, by, 4, 7, 8, 5, '#1d4ed8', s);
  px(ctx, ox, by, 7, 8, 2, 3, '#facc15', s);

  // Brown leather mail satchel slung across shoulder
  if (facingLeft) {
    px(ctx, ox, by, 9, 8, 4, 4, '#92400e', s);
    px(ctx, ox, by, 10, 9, 2, 1, '#facc15', s);
  } else {
    px(ctx, ox, by, 3, 8, 4, 4, '#92400e', s);
    px(ctx, ox, by, 4, 9, 2, 1, '#facc15', s);
  }

  // Arms
  px(ctx, ox, by, 3, 7, 1, 3, '#f5d0b5', s);
  px(ctx, ox, by, 12, 7, 1, 3, '#f5d0b5', s);

  // White envelope in hand when arriving/delivering!
  if (postman.phase === 'delivering' || postman.phase === 'to_box') {
    px(ctx, ox, by, 1, 8, 3, 2, '#fef9c3', s);
    px(ctx, ox, by, 2, 8, 1, 1, '#dc2626', s);
  }

  // Head & eyes
  px(ctx, ox, by, 5, 3, 6, 4, '#f5d0b5', s);
  const eyeShift = facingLeft ? -1 : 0;
  px(ctx, ox, by, 6 + eyeShift, 5, 1, 1, '#1e293b', s);
  px(ctx, ox, by, 9 + eyeShift, 5, 1, 1, '#1e293b', s);

  // Postal service peaked cap with golden posthorn badge
  px(ctx, ox, by, 4, 1, 8, 2, '#1e3a8a', s);
  px(ctx, ox, by, facingLeft ? 2 : 4, 2, 10, 1, '#0f172a', s);
  px(ctx, ox, by, 7, 1, 2, 1, '#facc15', s);

  // Friendly speech bubble while inserting mail into mailbox
  if (postman.phase === 'delivering') {
    px(ctx, ox, by, 4, -5, 8, 4, '#fef9c3', s);
    px(ctx, ox, by, 5, -4, 6, 2, '#dc2626', s);
  }
}

export function drawPixelPet(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  petType: PetType,
  scale = 3,
  tick = 0,
  isHovered = false,
  shadowDx = 0,
  shadowDy = 0,
  shadowAlpha = 0.22
) {
  const hop = Math.sin(tick * 0.16) > 0.5 ? -1 : 0;

  // Shadow
  ctx.fillStyle = `rgba(0,0,0,${shadowAlpha.toFixed(2)})`;
  ctx.fillRect(
    Math.floor(ox + (4 + shadowDx * 0.45) * scale),
    Math.floor(oy + (13 + shadowDy * 0.45) * scale),
    8 * scale,
    2 * scale
  );

  if (petType === 'pig') {
    px(ctx, ox, oy + hop * scale, 4, 7, 8, 5, '#fda4af', scale);
    px(ctx, ox, oy + hop * scale, 10, 5, 4, 4, '#fda4af', scale);
    px(ctx, ox, oy + hop * scale, 13, 7, 2, 2, '#fb7185', scale); // snout
    px(ctx, ox, oy + hop * scale, 11, 6, 1, 1, '#1e293b', scale);
    px(ctx, ox, oy + hop * scale, 3, 8, 1, 2, '#e11d48', scale);
    px(ctx, ox, oy, 5, 12, 1, 2, '#e11d48', scale);
    px(ctx, ox, oy, 10, 12, 1, 2, '#e11d48', scale);
  } else if (petType === 'dog') {
    px(ctx, ox, oy + hop * scale, 4, 7, 8, 5, '#d97706', scale);
    px(ctx, ox, oy + hop * scale, 10, 4, 4, 4, '#b45309', scale);
    px(ctx, ox, oy + hop * scale, 9, 4, 1, 3, '#78350f', scale); // ear
    px(ctx, ox, oy + hop * scale, 12, 5, 1, 1, '#1e293b', scale); // eye
    px(ctx, ox, oy + hop * scale, 14, 6, 1, 1, '#1e293b', scale); // nose
    px(ctx, ox, oy + hop * scale, 2, 6 + (tick % 10 < 5 ? 0 : 1), 2, 2, '#f59e0b', scale); // wagging tail
    px(ctx, ox, oy, 5, 12, 1, 2, '#78350f', scale);
    px(ctx, ox, oy, 10, 12, 1, 2, '#78350f', scale);
  } else if (petType === 'cat') {
    px(ctx, ox, oy + hop * scale, 5, 8, 6, 4, '#f59e0b', scale);
    px(ctx, ox, oy + hop * scale, 9, 4, 4, 4, '#f59e0b', scale);
    px(ctx, ox, oy + hop * scale, 9, 3, 1, 1, '#d97706', scale); // ears
    px(ctx, ox, oy + hop * scale, 12, 3, 1, 1, '#d97706', scale);
    px(ctx, ox, oy + hop * scale, 11, 5, 1, 1, '#14532d', scale);
    px(ctx, ox, oy + hop * scale, 3, 6, 2, 3, '#d97706', scale); // tail
    px(ctx, ox, oy, 5, 12, 1, 2, '#fef3c7', scale);
    px(ctx, ox, oy, 9, 12, 1, 2, '#fef3c7', scale);
  } else if (petType === 'alien') {
    // Glowing star-friend alien
    const glow = Math.sin(tick * 0.2) * 0.15 + 0.3;
    ctx.fillStyle = `rgba(74, 222, 128, ${glow})`;
    ctx.beginPath();
    ctx.arc(ox + 8 * scale, oy + 7 * scale, 8 * scale, 0, Math.PI * 2);
    ctx.fill();

    px(ctx, ox, oy + hop * scale, 5, 8, 6, 4, '#22c55e', scale);
    px(ctx, ox, oy + hop * scale, 5, 3, 6, 5, '#4ade80', scale); // head
    px(ctx, ox, oy + hop * scale, 7, 1, 2, 2, '#fef08a', scale); // glowing antenna
    px(ctx, ox, oy + hop * scale, 6, 5, 1, 2, '#0f172a', scale); // big eyes
    px(ctx, ox, oy + hop * scale, 9, 5, 1, 2, '#0f172a', scale);
    px(ctx, ox, oy, 6, 12, 1, 2, '#15803d', scale);
    px(ctx, ox, oy, 9, 12, 1, 2, '#15803d', scale);
  }

  if (isHovered) {
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 2;
    ctx.strokeRect(ox + 2 * scale, oy + 1 * scale, 12 * scale, 14 * scale);
  }
}

export function drawPixelWorker(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  worker: FarmWorker,
  scale = 3,
  tick = 0,
  isMoving = false,
  isResting = false,
  isHovered = false,
  nightFactor = 0,
  shadowDx = 0,
  shadowDy = 0,
  shadowAlpha = 0.22,
  highGraphics = false
) {
  const bob = isMoving ? (Math.sin(tick * 0.38) > 0 ? -1 : 0) : isResting ? 0 : Math.sin(tick * 0.09) > 0.75 ? -1 : 0;
  const stepOffset = isMoving ? Math.sin(tick * 0.45) * 1.2 : 0;
  const armSwing = isMoving ? Math.sin(tick * 0.45) * 0.9 : 0;

  // Shadow
  ctx.fillStyle = `rgba(0,0,0,${shadowAlpha.toFixed(2)})`;
  ctx.fillRect(
    Math.floor(ox + (3 + shadowDx * 0.5) * scale),
    Math.floor(oy + (14 + shadowDy * 0.5) * scale),
    Math.round(10 * scale),
    Math.max(2, Math.round(2 * scale))
  );

  const bodyOy = oy + bob * scale;

  // Boots & legs
  px(ctx, ox, oy, 5, 12 + Math.max(0, stepOffset), 2, 3, '#3f2e21', scale);
  px(ctx, ox, oy, 9, 12 + Math.max(0, -stepOffset), 2, 3, '#3f2e21', scale);

  // Shirt & sturdy work apron/overalls
  px(ctx, ox, bodyOy, 4, 8, 8, 4, worker.outfitColor, scale);
  if (highGraphics) px(ctx, ox, bodyOy, 4, 8, 8, 1, 'rgba(255,255,255,0.16)', scale);
  px(ctx, ox, bodyOy, 5, 9, 6, 4, '#334155', scale);
  px(ctx, ox, bodyOy, 5, 8, 1, 2, '#1e293b', scale);
  px(ctx, ox, bodyOy, 10, 8, 1, 2, '#1e293b', scale);

  // Arms
  px(ctx, ox, bodyOy, 3, 8 - armSwing * 0.7, 1, 3, '#f5d0b5', scale);
  px(ctx, ox, bodyOy, 12, 8 + armSwing * 0.7, 1, 3, '#f5d0b5', scale);

  // Head
  px(ctx, ox, bodyOy, 5, 3, 6, 5, '#f5d0b5', scale);

  // Eyes (closed when resting at night)
  if (isResting) {
    px(ctx, ox, bodyOy, 6, 5, 1, 1, '#573720', scale);
    px(ctx, ox, bodyOy, 9, 5, 1, 1, '#573720', scale);
  } else {
    const faceShift = worker.facing === 'left' ? -1 : 0;
    px(ctx, ox, bodyOy, 6 + faceShift, 5, 1, 1, '#1e293b', scale);
    px(ctx, ox, bodyOy, 9 + faceShift, 5, 1, 1, '#1e293b', scale);
  }

  // Role Hat
  if (worker.role === 'gardener') {
    // Wide straw sunhat
    px(ctx, ox, bodyOy, 2, 2, 12, 1, worker.hatColor, scale);
    px(ctx, ox, bodyOy, 4, 0, 8, 2, '#fde047', scale);
    px(ctx, ox, bodyOy, 4, 1, 8, 1, '#15803d', scale);
  } else if (worker.role === 'rancher') {
    // Ranch cowboy hat
    px(ctx, ox, bodyOy, 2, 2, 12, 1, worker.hatColor, scale);
    px(ctx, ox, bodyOy, 4, 0, 8, 2, worker.hatColor, scale);
    px(ctx, ox, bodyOy, 5, 1, 6, 1, '#f59e0b', scale);
  } else {
    // Allrounder worker cap
    px(ctx, ox, bodyOy, 4, 1, 8, 2, worker.outfitColor, scale);
    px(ctx, ox, bodyOy, 4, 2, 10, 1, worker.hatColor, scale);
  }

  // Handheld warm lamp when awake/working in the evening or night!
  if (nightFactor > 0.25 && !isResting) {
    const lx = worker.facing === 'left' ? 0.5 : 13;
    const ly = 9;
    px(ctx, ox, bodyOy, lx, ly - 1, 2, 1, '#334155', scale);
    px(ctx, ox, bodyOy, lx - 0.5, ly, 3, 3, '#475569', scale);
    px(ctx, ox, bodyOy, lx, ly + 0.5, 2, 2, '#fef08a', scale);
  }

  // Strike badge (!)
  if (worker.onStrike) {
    const pulseY = Math.round(Math.sin(tick * 0.25) * 1.5 * scale);
    px(ctx, ox, bodyOy + pulseY, 6, -6, 4, 5, '#dc2626', scale);
    px(ctx, ox, bodyOy + pulseY, 7, -5, 2, 2, '#ffffff', scale);
    px(ctx, ox, bodyOy + pulseY, 7, -2, 2, 1, '#ffffff', scale);
  } else if (isResting) {
    const zShift = Math.floor(tick / 20) % 2;
    ctx.fillStyle = '#e0f2fe';
    ctx.font = `700 ${Math.max(9, Math.round(scale * 3.2))}px "Outfit", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('zZ', ox + 11 * scale, bodyOy - (1 + zShift) * scale);
  }

  if (isHovered) {
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 2;
    ctx.strokeRect(ox + 2 * scale, oy - 1 * scale, 12 * scale, 16 * scale);
  }
}

export function drawWanderingMerchant(
  ctx: CanvasRenderingContext2D,
  tilePx: number,
  tick: number,
  nightFactor: number,
  isHovered: boolean
) {
  // Positioned right beside the south cobblestone road near the wooden bridge (wx=12..13, wy=25)
  const ox = 12.2 * tilePx;
  const oy = 24.7 * tilePx;
  const s = tilePx / 16;

  // Wagon shadow
  px(ctx, ox, oy, 2, 14, 24, 4, 'rgba(0,0,0,0.24)', s);

  // Wooden wagon body & wheels
  px(ctx, ox, oy, 2, 7, 20, 8, '#78350f', s);
  px(ctx, ox, oy, 3, 8, 18, 5, '#b45309', s);
  // Striped colorful awning canvas
  px(ctx, ox, oy, 1, 2, 22, 5, '#dc2626', s);
  px(ctx, ox, oy, 5, 2, 4, 5, '#fef3c7', s);
  px(ctx, ox, oy, 13, 2, 4, 5, '#fef3c7', s);
  px(ctx, ox, oy, 2, 1, 20, 2, '#991b1b', s);
  // Wagon wheels
  px(ctx, ox, oy, 4, 13, 4, 4, '#292524', s);
  px(ctx, ox, oy, 5, 14, 2, 2, '#92400e', s);
  px(ctx, ox, oy, 16, 13, 4, 4, '#292524', s);
  px(ctx, ox, oy, 17, 14, 2, 2, '#92400e', s);

  // Hanging wagon lantern
  px(ctx, ox, oy, 21, 5, 2, 3, '#334155', s);
  px(ctx, ox, oy, 21, 6, 2, 2, nightFactor > 0.25 ? '#fef08a' : '#f59e0b', s);

  // Bruno the Wandering Merchant waving next to wagon
  const bx = ox + 22 * s;
  const by = oy + 2 * s;
  const bob = Math.sin(tick * 0.14) > 0.5 ? -1 : 0;
  px(ctx, bx, by, 3, 11, 2, 3, '#3f2e21', s);
  px(ctx, bx, by, 6, 11, 2, 3, '#3f2e21', s);
  px(ctx, bx, by + bob * s, 2, 6, 7, 5, '#0f766e', s); // green tunic
  px(ctx, bx, by + bob * s, 3, 2, 5, 4, '#f5d0b5', s); // face
  px(ctx, bx, by + bob * s, 4, 3, 1, 1, '#1e293b', s);
  px(ctx, bx, by + bob * s, 6, 3, 1, 1, '#1e293b', s);
  px(ctx, bx, by + bob * s, 3, 5, 5, 2, '#78350f', s); // beard
  px(ctx, bx, by + bob * s, 1, 1, 9, 2, '#92400e', s); // wide merchant hat

  // Floating trade sign indicator
  const floatY = Math.round(Math.sin(tick * 0.15) * 2);
  px(ctx, ox, oy + floatY, 10, -6, 6, 5, '#f59e0b', s);
  px(ctx, ox, oy + floatY, 11, -5, 4, 3, '#fef9c3', s);

  if (isHovered) {
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(ox, oy - s, 31 * s, 18 * s);
  }
}

export function drawNightMaskCutouts(
  maskCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  offsetX: number,
  offsetY: number,
  tilePx: number,
  farmOriginPx: number,
  gameState: GameState,
  playerPos: PlayerPosition,
  nightFactor: number,
  tintCss: string,
  tick: number,
  now: number
) {
  if (nightFactor <= 0.12 || tintCss === 'rgba(0,0,0,0)') return;

  maskCtx.save();
  maskCtx.clearRect(0, 0, width, height);
  maskCtx.globalCompositeOperation = 'source-over';
  maskCtx.fillStyle = tintCss;
  maskCtx.fillRect(0, 0, width, height);

  // Carve warm radial pools out of the night shadow so lit zones look truly illuminated
  maskCtx.translate(offsetX, offsetY);
  maskCtx.globalCompositeOperation = 'destination-out';

  const flicker = 0.96 + Math.sin(tick * 0.22) * 0.04;
  const punchPool = (cx: number, cy: number, radiusPx: number, strength = 0.92) => {
    const r = radiusPx * flicker;
    const grad = maskCtx.createRadialGradient(cx, cy, r * 0.12, cx, cy, r);
    grad.addColorStop(0, `rgba(0, 0, 0, ${Math.min(0.96, strength * nightFactor).toFixed(3)})`);
    grad.addColorStop(0.55, `rgba(0, 0, 0, ${(strength * 0.52 * nightFactor).toFixed(3)})`);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    maskCtx.fillStyle = grad;
    maskCtx.beginPath();
    maskCtx.arc(cx, cy, r, 0, Math.PI * 2);
    maskCtx.fill();
  };

  // Farmhouse, Hofladen, Player & active workers
  punchPool(2.5 * tilePx, 2.2 * tilePx, tilePx * 2.8, 0.92);
  punchPool(2.0 * tilePx, 5.75 * tilePx, tilePx * 2.4, 0.9);
  punchPool((playerPos.x + 0.65) * tilePx, (playerPos.y + 0.45) * tilePx, tilePx * 2.9, 0.96);

  const isWorkHours = gameState.ingameMinutes >= 360 && gameState.ingameMinutes < 1320;
  if (isWorkHours) {
    (gameState.workers || []).forEach((w) => {
      const elapsed = w.movedAt ? now - w.movedAt : 9999;
      const progress = Math.min(1, Math.max(0, elapsed / 650));
      const drawGX =
        progress < 1 && w.moveFromX !== undefined ? w.moveFromX + (w.x - w.moveFromX) * progress : w.x;
      const drawGY =
        progress < 1 && w.moveFromY !== undefined ? w.moveFromY + (w.y - w.moveFromY) * progress : w.y;
      punchPool(farmOriginPx + (drawGX + 0.55) * tilePx, farmOriginPx + (drawGY + 0.45) * tilePx, tilePx * 2.25, 0.9);
    });
  }

  for (let y = 0; y < gameState.tiles.length; y++) {
    for (let x = 0; x < gameState.tiles[y].length; x++) {
      const t = gameState.tiles[y][x];
      if (!t.unlocked || !t.entity) continue;
      const id = t.entity.itemId;
      const cx = farmOriginPx + (x + 0.5) * tilePx;
      const cy = farmOriginPx + (y + 0.5) * tilePx;
      if (
        id === 'lantern' ||
        id === 'campfire' ||
        id === 'solar_conservatory' ||
        id === 'golden_statue' ||
        id === 'winter_greenhouse' ||
        id === 'crystal_lantern' ||
        id === 'moonstone_obelisk' ||
        id === 'xmas_tree' ||
        id === 'xmas_candy_lamp' ||
        id === 'xmas_gingerbread' ||
        id === 'xmas_reindeer_arch'
      ) {
        punchPool(cx, cy, tilePx * 2.75, 0.94);
      } else if (id === 'bakery_oven' || id === 'fish_smoker' || id === 'brewery' || id === 'feast_kitchen') {
        punchPool(cx, cy, tilePx * 1.7, 0.78);
      } else if (id === 'glowmorel' || id === 'moon_truffle') {
        punchPool(cx, cy, tilePx * 1.5, 0.75);
      }
    }
  }

  (gameState.winterFestival?.droppedGifts || []).forEach((g) => {
    punchPool(farmOriginPx + (g.x + 0.5) * tilePx, farmOriginPx + (g.y + 0.5) * tilePx, tilePx * 2.0, 0.85);
  });

  if (gameState.merchant?.active) {
    punchPool(13.5 * tilePx, 25.1 * tilePx, tilePx * 2.6, 0.9);
  }

  punchPool(12.55 * tilePx, -7.45 * tilePx, tilePx * 2.3, 0.9);
  punchPool(15.45 * tilePx, -7.25 * tilePx, tilePx * 3.0, 0.95);
  punchPool(1.95 * tilePx, 11.75 * tilePx, tilePx * 2.7, 0.92);

  for (const lamp of VILLAGE_LANTERN_SPOTS) {
    punchPool((lamp.wx + 0.45) * tilePx, (lamp.wy + 0.25) * tilePx, tilePx * 2.3, 0.88);
  }
  for (const house of VILLAGE_HOUSES) {
    punchPool((house.x + house.width * 0.5) * tilePx, (house.y + house.height * 0.65) * tilePx, tilePx * 1.7, 0.7);
  }
  for (const biz of VILLAGE_BUSINESSES) {
    if (gameState.villageBusinesses?.brokenById?.[biz.id]) continue;
    const r =
      biz.id === 'auto_supplier' || biz.id === 'dairy_plant' || biz.id === 'trade_office'
        ? tilePx * 4.0
        : tilePx * 2.6;
    punchPool((biz.x + biz.width * 0.5) * tilePx, (biz.y + biz.height * 0.6) * tilePx, r, 0.88);
  }

  punchPool(-8.5 * tilePx, 1.0 * tilePx, tilePx * 2.6, gameState.themePark?.owned ? 0.9 : 0.65);
  if (gameState.themePark?.owned) {
    punchPool(-8.5 * tilePx, 4.3 * tilePx, tilePx * 3.4, 0.92);
    const attrSet = new Set(gameState.themePark.attractions || []);
    if (attrSet.has('ferris_wheel')) punchPool(-14.4 * tilePx, 3.65 * tilePx, tilePx * 4.0, 0.94);
    if (attrSet.has('roller_coaster')) punchPool(-13.0 * tilePx, 9.8 * tilePx, tilePx * 4.3, 0.9);
    if (attrSet.has('water_flume')) punchPool(-4.8 * tilePx, 9.8 * tilePx, tilePx * 3.8, 0.9);
    if (attrSet.has('sky_tower')) punchPool(-3.15 * tilePx, 3.2 * tilePx, tilePx * 3.6, 0.92);
    if (attrSet.has('ghost_train')) punchPool(-12.8 * tilePx, 16.3 * tilePx, tilePx * 4.5, 0.92);
  }

  if (gameState.villageFire?.active) {
    const fireHouse = VILLAGE_HOUSE_BY_ID[gameState.villageFire.houseId];
    if (fireHouse) {
      const fState = getFireBrigadeVisualState(gameState.villageFire, fireHouse);
      if (fState.fireIntensity > 0.05) {
        punchPool(
          (fireHouse.x + fireHouse.width * 0.5) * tilePx,
          (fireHouse.y + fireHouse.height * 0.45) * tilePx,
          tilePx * (3.0 + fState.fireIntensity * 1.8),
          0.95
        );
      }
      if (fState.phase !== 'outbreak') {
        punchPool((fState.truckX + 0.8) * tilePx, (fState.truckY + 0.35) * tilePx, tilePx * 2.4, 0.9);
      }
    }
  }

  maskCtx.restore();
}

export function drawNightLightsOverlay(
  ctx: CanvasRenderingContext2D,
  tilePx: number,
  farmOriginPx: number,
  gameState: GameState,
  playerPos: PlayerPosition,
  nightFactor: number,
  tick: number,
  now: number
) {
  if (nightFactor <= 0.22) return;

  const flicker = 0.94 + Math.sin(tick * 0.22) * 0.06;
  const drawWarmGlow = (cx: number, cy: number, radiusPx: number, innerAlpha: number, midColor = '251, 191, 36') => {
    const grad = ctx.createRadialGradient(cx, cy, radiusPx * 0.08, cx, cy, radiusPx);
    grad.addColorStop(0, `rgba(254, 249, 195, ${(innerAlpha * nightFactor * flicker).toFixed(3)})`);
    grad.addColorStop(0.42, `rgba(${midColor}, ${(innerAlpha * 0.48 * nightFactor).toFixed(3)})`);
    grad.addColorStop(1, `rgba(${midColor}, 0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, radiusPx, 0, Math.PI * 2);
    ctx.fill();
  };

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  // 1. Farmhouse & Hofladen warm window & porch glow
  drawWarmGlow(2.5 * tilePx, 2.2 * tilePx, tilePx * 2.5, 0.34);
  drawWarmGlow(2.0 * tilePx, 5.75 * tilePx, tilePx * 2.15, 0.34);

  // 2. Player handheld lamp pool
  drawWarmGlow((playerPos.x + 0.65) * tilePx, (playerPos.y + 0.45) * tilePx, tilePx * 2.35, 0.44);

  // 3. Active Farm Workers handheld lamp pools
  const isWorkHours = gameState.ingameMinutes >= 360 && gameState.ingameMinutes < 1320;
  if (isWorkHours) {
    (gameState.workers || []).forEach((w) => {
      const elapsed = w.movedAt ? now - w.movedAt : 9999;
      const progress = Math.min(1, Math.max(0, elapsed / 650));
      const drawGX =
        progress < 1 && w.moveFromX !== undefined ? w.moveFromX + (w.x - w.moveFromX) * progress : w.x;
      const drawGY =
        progress < 1 && w.moveFromY !== undefined ? w.moveFromY + (w.y - w.moveFromY) * progress : w.y;
      const lx = farmOriginPx + (drawGX + 0.55) * tilePx;
      const ly = farmOriginPx + (drawGY + 0.45) * tilePx;
      drawWarmGlow(lx, ly, tilePx * 2.0, 0.38);
    });
  }

  // 4. Placed Lanterns, Bakery Ovens, Smokers & Bioluminescent Mushrooms on the farm
  for (let y = 0; y < gameState.tiles.length; y++) {
    for (let x = 0; x < gameState.tiles[y].length; x++) {
      const t = gameState.tiles[y][x];
      if (!t.unlocked || !t.entity) continue;
      const cx = farmOriginPx + (x + 0.5) * tilePx;
      const cy = farmOriginPx + (y + 0.5) * tilePx;
      if (t.entity.itemId === 'lantern') {
        drawWarmGlow(cx, cy, tilePx * 2.3, 0.42);
      } else if (t.entity.itemId === 'campfire') {
        drawWarmGlow(cx, cy, tilePx * 2.55, 0.46, '249, 115, 22');
      } else if (t.entity.itemId === 'solar_conservatory' || t.entity.itemId === 'golden_statue') {
        drawWarmGlow(cx, cy, tilePx * 2.7, 0.44);
      } else if (t.entity.itemId === 'winter_greenhouse') {
        drawWarmGlow(cx, cy, tilePx * 2.8, 0.48, '253, 224, 71');
      } else if (t.entity.itemId === 'crystal_lantern') {
        drawWarmGlow(cx, cy, tilePx * 2.5, 0.48, '192, 132, 252');
      } else if (t.entity.itemId === 'moonstone_obelisk') {
        drawWarmGlow(cx, cy, tilePx * 2.75, 0.48, '125, 211, 252');
      } else if (
        t.entity.itemId === 'xmas_tree' ||
        t.entity.itemId === 'xmas_candy_lamp' ||
        t.entity.itemId === 'xmas_gingerbread' ||
        t.entity.itemId === 'xmas_reindeer_arch'
      ) {
        drawWarmGlow(cx, cy, tilePx * 2.55, 0.46, '250, 204, 21');
      } else if (
        t.entity.itemId === 'bakery_oven' ||
        t.entity.itemId === 'fish_smoker' ||
        t.entity.itemId === 'brewery'
      ) {
        drawWarmGlow(cx, cy, tilePx * 1.45, 0.25, '249, 115, 22');
      } else if (t.entity.itemId === 'glowmorel') {
        drawWarmGlow(cx, cy, tilePx * 1.3, 0.26, '45, 212, 191');
      } else if (t.entity.itemId === 'moon_truffle') {
        drawWarmGlow(cx, cy, tilePx * 1.45, 0.3, '167, 139, 250');
      }
    }
  }

  // 4b. Glow around wrapped Christmas gifts resting on fields
  (gameState.winterFestival?.droppedGifts || []).forEach((g) => {
    const gx = farmOriginPx + (g.x + 0.5) * tilePx;
    const gy = farmOriginPx + (g.y + 0.5) * tilePx;
    drawWarmGlow(gx, gy, tilePx * 1.9, 0.42, '248, 113, 113');
  });

  // 5. Wandering Merchant lantern at the bridge
  if (gameState.merchant?.active) {
    drawWarmGlow(13.5 * tilePx, 25.1 * tilePx, tilePx * 2.4, 0.42);
  }

  // 6. Northern village street lanterns, Schwarzes Brett, Dorfplatz fire-bowl, Waldmine & cozy house windows
  drawWarmGlow(12.55 * tilePx, -7.45 * tilePx, tilePx * 2.1, 0.42);
  drawWarmGlow(15.45 * tilePx, -7.25 * tilePx, tilePx * 2.75, 0.52, '251, 146, 60');
  drawWarmGlow(1.95 * tilePx, 11.75 * tilePx, tilePx * 2.5, 0.46, '192, 132, 252');
  for (const lamp of VILLAGE_LANTERN_SPOTS) {
    drawWarmGlow((lamp.wx + 0.45) * tilePx, (lamp.wy + 0.25) * tilePx, tilePx * 2.1, 0.36);
  }
  for (const house of VILLAGE_HOUSES) {
    drawWarmGlow((house.x + house.width * 0.5) * tilePx, (house.y + house.height * 0.65) * tilePx, tilePx * 1.45, 0.22);
  }
  // Westviertel commercial & industrial floodlights
  for (const biz of VILLAGE_BUSINESSES) {
    const isBrokenBiz = Boolean(gameState.villageBusinesses?.brokenById?.[biz.id]);
    if (isBrokenBiz) continue;
    const r =
      biz.id === 'auto_supplier' || biz.id === 'dairy_plant' || biz.id === 'trade_office'
        ? tilePx * 3.8
        : tilePx * 2.4;
    const col =
      biz.id === 'auto_supplier'
        ? '147, 197, 253'
        : biz.id === 'dairy_plant'
        ? '125, 211, 252'
        : biz.id === 'trade_office'
        ? '52, 211, 153'
        : '251, 191, 36';
    drawWarmGlow((biz.x + biz.width * 0.5) * tilePx, (biz.y + biz.height * 0.6) * tilePx, r, 0.36, col);
  }
  // Abenteuerpark Sonnental festive entrance & attraction floodlights
  drawWarmGlow(-8.5 * tilePx, 1.0 * tilePx, tilePx * 2.4, gameState.themePark?.owned ? 0.45 : 0.2, '253, 224, 71');
  if (gameState.themePark?.owned) {
    drawWarmGlow(-8.5 * tilePx, 4.3 * tilePx, tilePx * 3.2, 0.48, '251, 191, 36');
    const attrSet = new Set(gameState.themePark.attractions || []);
    if (attrSet.has('ferris_wheel')) {
      drawWarmGlow(-14.4 * tilePx, 3.65 * tilePx, tilePx * 3.8, 0.55, '244, 114, 182');
    }
    if (attrSet.has('roller_coaster')) {
      drawWarmGlow(-13.0 * tilePx, 9.8 * tilePx, tilePx * 4.2, 0.44, '249, 115, 22');
    }
    if (attrSet.has('water_flume')) {
      drawWarmGlow(-4.8 * tilePx, 9.8 * tilePx, tilePx * 3.6, 0.46, '56, 189, 248');
    }
    if (attrSet.has('sky_tower')) {
      drawWarmGlow(-3.15 * tilePx, 3.2 * tilePx, tilePx * 3.5, 0.5, '250, 204, 21');
    }
    if (attrSet.has('ghost_train')) {
      drawWarmGlow(-12.8 * tilePx, 16.3 * tilePx, tilePx * 4.4, 0.52, '192, 132, 252');
    }
  }

  // 7. Dramatic flickering firelight & blue beacon flash if a village house is burning!
  if (gameState.villageFire?.active) {
    const fireHouse = VILLAGE_HOUSE_BY_ID[gameState.villageFire.houseId];
    if (fireHouse) {
      const fState = getFireBrigadeVisualState(gameState.villageFire, fireHouse);
      if (fState.fireIntensity > 0.05) {
        drawWarmGlow(
          (fireHouse.x + fireHouse.width * 0.5) * tilePx,
          (fireHouse.y + fireHouse.height * 0.45) * tilePx,
          tilePx * (2.6 + fState.fireIntensity * 1.8),
          Math.min(0.82, 0.35 + fState.fireIntensity * 0.45),
          '249, 115, 22'
        );
      }
      if (fState.phase !== 'outbreak') {
        const flashColor = Math.floor(tick / 5) % 2 === 0 ? '56, 189, 248' : '37, 99, 235';
        drawWarmGlow(
          (fState.truckX + 0.8) * tilePx,
          (fState.truckY + 0.35) * tilePx,
          tilePx * 2.1,
          0.42,
          flashColor
        );
      }
    }
  }

  ctx.restore();
}

export function drawToolCursorIcon(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  tool: ToolType,
  scale = 2,
  tick = 0,
  isActing = false,
  seedColor = '#4ade80',
  wateringCanTier: 1 | 2 | 3 | 4 = 1
) {
  ctx.save();
  ctx.translate(ox + 8 * scale, oy + 8 * scale);
  if (isActing) {
    ctx.rotate(tool === 'water' || tool === 'hoe' ? -0.42 : -0.18);
  }
  const bx = -8 * scale;
  const by = -8 * scale;

  // Soft backing shadow for readability over grass & soil
  ctx.fillStyle = 'rgba(15, 23, 42, 0.25)';
  ctx.beginPath();
  ctx.arc(0, scale, 8 * scale, 0, Math.PI * 2);
  ctx.fill();

  if (tool === 'hand') {
    // Pixel harvest glove / hand
    px(ctx, bx, by, 5, 2, 2, 5, '#fde2c8', scale);
    px(ctx, bx, by, 7, 1, 2, 6, '#fde2c8', scale);
    px(ctx, bx, by, 9, 2, 2, 5, '#fde2c8', scale);
    px(ctx, bx, by, 11, 4, 2, 4, '#f5d0b5', scale);
    px(ctx, bx, by, 3, 7, 2, 3, '#f5d0b5', scale);
    px(ctx, bx, by, 5, 7, 7, 5, '#fde2c8', scale);
    px(ctx, bx, by, 5, 12, 7, 2, '#b45309', scale);
  } else if (tool === 'hoe') {
    // Wooden handle + iron hoe blade
    for (let i = 0; i < 9; i++) {
      px(ctx, bx, by, 3 + i, 12 - i, 2, 2, '#92400e', scale);
    }
    px(ctx, bx, by, 9, 2, 5, 2, '#cbd5e1', scale);
    px(ctx, bx, by, 12, 3, 2, 4, '#94a3b8', scale);
    px(ctx, bx, by, 10, 2, 2, 1, '#f8fafc', scale);
  } else if (tool === 'water') {
    // Tier-colored Pixel Watering Can
    const bodyCol =
      wateringCanTier === 4 ? '#06b6d4' : wateringCanTier === 3 ? '#facc15' : wateringCanTier === 2 ? '#d97706' : '#0284c7';
    const shadeCol =
      wateringCanTier === 4 ? '#0e7490' : wateringCanTier === 3 ? '#ca8a04' : wateringCanTier === 2 ? '#92400e' : '#0369a1';
    const rimCol =
      wateringCanTier === 4 ? '#a5f3fc' : wateringCanTier === 3 ? '#fef08a' : wateringCanTier === 2 ? '#fbbf24' : '#7dd3fc';

    // Handle
    px(ctx, bx, by, 8, 3, 5, 2, shadeCol, scale);
    px(ctx, bx, by, 12, 5, 2, 5, shadeCol, scale);
    // Can body
    px(ctx, bx, by, 5, 6, 7, 6, bodyCol, scale);
    px(ctx, bx, by, 6, 5, 5, 1, rimCol, scale);
    // Spout pointing left-down
    px(ctx, bx, by, 2, 6, 3, 2, bodyCol, scale);
    px(ctx, bx, by, 1, 5, 2, 2, rimCol, scale);
    // Animated droplets when clicking/pouring
    if (isActing) {
      const dropShift = Math.floor(tick / 3) % 3;
      px(ctx, bx, by, 0, 8 + dropShift, 1, 2, '#38bdf8', scale);
      px(ctx, bx, by, 2, 10 + ((dropShift + 1) % 3), 1, 2, '#bae6fd', scale);
      px(ctx, bx, by, 1, 12 + ((dropShift + 2) % 2), 1, 1, '#7dd3fc', scale);
    }
  } else if (tool === 'fertilize') {
    // Nutrient Fertilizer Bag with Golden Sparkles
    px(ctx, bx, by, 4, 5, 8, 9, '#15803d', scale);
    px(ctx, bx, by, 5, 3, 6, 2, '#166534', scale);
    px(ctx, bx, by, 5, 5, 6, 1, '#facc15', scale);
    px(ctx, bx, by, 6, 7, 4, 4, '#86efac', scale);
    px(ctx, bx, by, 2, 3, 2, 2, '#fef08a', scale);
    px(ctx, bx, by, 12, 2, 2, 2, '#fef08a', scale);
  } else if (tool === 'plant') {
    // Seed Pouch with Selected Seed Color
    px(ctx, bx, by, 4, 4, 8, 10, '#b45309', scale);
    px(ctx, bx, by, 5, 2, 6, 2, '#92400e', scale);
    px(ctx, bx, by, 5, 6, 6, 6, '#fef3c7', scale);
    px(ctx, bx, by, 6, 7, 4, 4, seedColor, scale);
    px(ctx, bx, by, 7, 5, 2, 2, '#22c55e', scale);
  } else if (tool === 'build') {
    // Carpenter's Hammer & Wooden Beam for Deko/Bau
    for (let i = 0; i < 8; i++) {
      px(ctx, bx, by, 3 + i, 12 - i, 2, 2, '#b45309', scale);
    }
    px(ctx, bx, by, 8, 2, 6, 3, '#64748b', scale);
    px(ctx, bx, by, 9, 2, 4, 1, '#e2e8f0', scale);
    px(ctx, bx, by, 1, 11, 5, 3, '#d97706', scale);
    px(ctx, bx, by, 2, 12, 3, 1, '#fde68a', scale);
  } else if (tool === 'move') {
    // 4-way pixel arrows for moving decorations
    px(ctx, bx, by, 7, 3, 2, 10, '#38bdf8', scale);
    px(ctx, bx, by, 3, 7, 10, 2, '#38bdf8', scale);
    // Arrowheads (top, bottom, left, right)
    px(ctx, bx, by, 6, 2, 4, 2, '#fef08a', scale);
    px(ctx, bx, by, 7, 1, 2, 1, '#fef08a', scale);
    px(ctx, bx, by, 6, 12, 4, 2, '#fef08a', scale);
    px(ctx, bx, by, 7, 14, 2, 1, '#fef08a', scale);
    px(ctx, bx, by, 2, 6, 2, 4, '#fef08a', scale);
    px(ctx, bx, by, 1, 7, 1, 2, '#fef08a', scale);
    px(ctx, bx, by, 12, 6, 2, 4, '#fef08a', scale);
    px(ctx, bx, by, 14, 7, 1, 2, '#fef08a', scale);
    px(ctx, bx, by, 7, 7, 2, 2, '#ffffff', scale);
  } else if (tool === 'remove') {
    // Clearing Spade + Red Marker
    for (let i = 0; i < 6; i++) {
      px(ctx, bx, by, 8 - i, 3 + i, 2, 2, '#92400e', scale);
    }
    px(ctx, bx, by, 2, 9, 4, 4, '#94a3b8', scale);
    px(ctx, bx, by, 10, 10, 4, 1, '#ef4444', scale);
    px(ctx, bx, by, 11, 9, 2, 3, '#ef4444', scale);
  } else if (tool === 'fishing') {
    // Fishing Rod + Line + Red-White Bobber
    for (let i = 0; i < 10; i++) {
      px(ctx, bx, by, 2 + i, 13 - i, 1, 2, '#78350f', scale);
    }
    px(ctx, bx, by, 12, 4, 1, 5, '#e2e8f0', scale);
    px(ctx, bx, by, 11, 9, 3, 2, '#ef4444', scale);
    px(ctx, bx, by, 11, 11, 3, 1, '#ffffff', scale);
  }

  ctx.restore();
}

export function drawWinterGiftDrop(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  tilePx: number,
  tick: number
) {
  const s = tilePx / 16;
  const bob = Math.sin(tick * 0.12) * s * 0.6;

  // Soft shadow on snow/grass
  px(ctx, ox, oy, 3, 13, 10, 2, 'rgba(0,0,0,0.24)', s);
  // Gift box body (festive crimson red)
  px(ctx, ox, oy + bob, 3, 6, 10, 7, '#dc2626', s);
  // Box lid
  px(ctx, ox, oy + bob, 2, 4, 12, 3, '#ef4444', s);
  // Golden vertical & horizontal ribbons
  px(ctx, ox, oy + bob, 7, 4, 2, 9, '#facc15', s);
  px(ctx, ox, oy + bob, 3, 8, 10, 2, '#facc15', s);
  // Golden ribbon bow on top
  px(ctx, ox, oy + bob, 5, 2, 2, 2, '#fde047', s);
  px(ctx, ox, oy + bob, 9, 2, 2, 2, '#fde047', s);
  px(ctx, ox, oy + bob, 7, 3, 2, 1, '#ca8a04', s);

  // Twinkling sparkle stars
  const sparkle = Math.floor(tick / 10) % 2;
  px(ctx, ox, oy + bob, 1 + sparkle * 12, 2, 2, 2, '#fef9c3', s);
  px(ctx, ox, oy + bob, 13 - sparkle * 11, 10, 1, 1, '#fde047', s);
}

export function drawSantaSleighFlyover(
  ctx: CanvasRenderingContext2D,
  tilePx: number,
  sleigh: SantaSleighState,
  tick: number
) {
  const s = tilePx / 16;
  const elapsedMs = Math.max(0, sleigh.durationMs - sleigh.remainingMs);
  const progress = Math.min(1, elapsedMs / Math.max(1, sleigh.durationMs));

  // Sweeping figure-8 / wide loop over the farm & village sky!
  // On first pass (first ~24s) fly right across the farm drop target so gift drop looks natural
  let wx: number;
  let wy: number;
  let headingRight = true;

  if (elapsedMs < 24000 && sleigh.dropTarget) {
    const passT = elapsedMs / 24000;
    const dropWx = WORLD_MARGIN + sleigh.dropTarget.x;
    const dropWy = WORLD_MARGIN + sleigh.dropTarget.y - 2.6;
    wx = -3 + passT * (WORLD_SIZE + 8);
    // Gentle arc dipping right above the drop target around passT ~ 0.65 (16s)
    const arch = Math.sin(passT * Math.PI) * 3.0;
    wy = dropWy - (1 - Math.sin(passT * Math.PI)) * 4.5 + arch * 0.2;
    if (passT < 0.68) {
      wx = -3 + (passT / 0.68) * (dropWx + 3);
    } else {
      wx = dropWx + ((passT - 0.68) / 0.32) * (WORLD_SIZE + 5 - dropWx);
    }
    headingRight = true;
  } else {
    // Festive circling laps over northern village & farmyard
    const loopAngle = progress * Math.PI * 6;
    const prevAngle = loopAngle - 0.05;
    wx = WORLD_SIZE * 0.5 + Math.cos(loopAngle) * 12.5;
    wy = 2.0 + Math.sin(loopAngle * 2) * 8.0;
    const prevWx = WORLD_SIZE * 0.5 + Math.cos(prevAngle) * 12.5;
    headingRight = wx >= prevWx;
  }

  const sx = wx * tilePx;
  const sy = wy * tilePx + Math.sin(tick * 0.14) * s * 2.2;

  // Parachute gift falling right around drop moment (13.5s..16.2s)
  if (sleigh.dropTarget && elapsedMs >= SANTA_DROP_DELAY_MS - 2600 && elapsedMs <= SANTA_DROP_DELAY_MS + 400) {
    const dropAlpha = Math.max(0, Math.min(1, (elapsedMs - (SANTA_DROP_DELAY_MS - 2600)) / 2600));
    const gx = (WORLD_MARGIN + sleigh.dropTarget.x) * tilePx;
    const gyTarget = (WORLD_MARGIN + sleigh.dropTarget.y) * tilePx;
    const gyStart = sy + tilePx * 0.4;
    const gy = gyStart + (gyTarget - gyStart) * dropAlpha;
    // White & red parachute canopy
    px(ctx, gx, gy - tilePx * 0.55, 3, 0, 10, 4, '#f8fafc', s);
    px(ctx, gx, gy - tilePx * 0.55, 6, 0, 4, 4, '#ef4444', s);
    px(ctx, gx, gy - tilePx * 0.3, 4, 0, 1, 5, '#cbd5e1', s);
    px(ctx, gx, gy - tilePx * 0.3, 11, 0, 1, 5, '#cbd5e1', s);
    drawWinterGiftDrop(ctx, gx, gy, tilePx, tick);
  }

  // Soft shadow projected far below on the snowy valley
  ctx.save();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.22)';
  ctx.beginPath();
  ctx.ellipse(sx + tilePx * 1.4, sy + tilePx * 2.8, tilePx * 1.9, tilePx * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();

  // Sparkling golden stardust trail behind sleigh
  for (let i = 1; i <= 7; i++) {
    const trailDir = headingRight ? -1 : 1;
    const tx = sx + trailDir * i * tilePx * 0.42 + (headingRight ? 0 : tilePx * 2.5);
    const ty = sy + tilePx * 0.55 + Math.sin(tick * 0.25 + i) * s * 2.2;
    const alpha = Math.max(0.15, 0.85 - i * 0.11);
    ctx.fillStyle = i % 2 === 0 ? `rgba(250, 204, 21, ${alpha})` : `rgba(254, 249, 195, ${alpha})`;
    const starSz = Math.max(2, (3 - i * 0.25) * s);
    ctx.fillRect(Math.floor(tx), Math.floor(ty), starSz, starSz);
  }

  ctx.translate(sx, sy);
  if (!headingRight) {
    ctx.translate(tilePx * 3.8, 0);
    ctx.scale(-1, 1);
  }

  // Golden reins connecting sleigh to 3 galloping reindeer
  ctx.fillStyle = '#fde047';
  ctx.fillRect(Math.floor(14 * s), Math.floor(8 * s), Math.floor(38 * s), Math.max(1, Math.round(0.9 * s)));

  // Sleigh (ornate red + golden runners + sack of gifts + Santa Claus!)
  px(ctx, 0, 0, 1, 13, 15, 2, '#facc15', s); // gold runner
  px(ctx, 0, 0, 15, 11, 2, 3, '#facc15', s); // curved front runner
  px(ctx, 0, 0, 4, 11, 2, 2, '#ca8a04', s);
  px(ctx, 0, 0, 11, 11, 2, 2, '#ca8a04', s);
  px(ctx, 0, 0, 1, 7, 14, 5, '#b91c1c', s); // sleigh body
  px(ctx, 0, 0, 0, 5, 4, 3, '#dc2626', s); // high back
  px(ctx, 0, 0, 1, 7, 14, 1, '#facc15', s); // gold trim
  // Green & brown sack of gifts behind Santa
  px(ctx, 0, 0, 2, 3, 5, 5, '#15803d', s);
  px(ctx, 0, 0, 3, 2, 3, 2, '#ef4444', s);
  // Santa Claus sitting up front waving
  px(ctx, 0, 0, 8, 4, 5, 4, '#dc2626', s); // red coat
  px(ctx, 0, 0, 9, 1, 4, 3, '#fde2c8', s); // face
  px(ctx, 0, 0, 9, 3, 4, 2, '#ffffff', s); // snowy beard
  px(ctx, 0, 0, 8, -1, 5, 2, '#dc2626', s); // Santa hat
  px(ctx, 0, 0, 7, 0, 2, 1, '#ffffff', s); // pom-pom
  const waveY = Math.floor(tick / 8) % 2;
  px(ctx, 0, 0, 12, 2 - waveY, 2, 3, '#dc2626', s); // waving arm

  // 3 Reindeer in front (lead reindeer at i=2 is Rudolph with glowing red nose!)
  for (let r = 0; r < 3; r++) {
    const rx = 20 * s + r * 12 * s;
    const gallop = Math.sin(tick * 0.25 + r * 1.1) * 1.4 * s;
    const ry = gallop;
    px(ctx, rx, ry, 0, 7, 7, 4, '#92400e', s); // body
    px(ctx, rx, ry, 5, 4, 3, 4, '#92400e', s); // neck & head
    px(ctx, rx, ry, 7, 5, 2, 2, '#b45309', s); // muzzle
    px(ctx, rx, ry, 4, 1, 2, 3, '#fde68a', s); // antlers
    px(ctx, rx, ry, 6, 2, 2, 1, '#fde68a', s);
    // Galloping legs
    const legSwing = Math.floor(tick / 6 + r) % 2 === 0 ? 1 : -1;
    px(ctx, rx, ry, 1 + legSwing, 11, 1, 3, '#78350f', s);
    px(ctx, rx, ry, 5 - legSwing, 11, 1, 3, '#78350f', s);
    // Rudolph's bright glowing nose on lead reindeer!
    if (r === 2) {
      px(ctx, rx, ry, 9, 5, 2, 2, '#ef4444', s);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.45)';
      ctx.beginPath();
      ctx.arc(rx + 10 * s, ry + 6 * s, 3.2 * s, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

export function drawNewYearFireworks(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  fireworks: FireworksState,
  tick: number,
  zoomScale = 1
) {
  const palettes = [
    ['#fef08a', '#facc15', '#fb923c'],
    ['#f43f5e', '#fb7185', '#fef9c3'],
    ['#38bdf8', '#7dd3fc', '#f8fafc'],
    ['#4ade80', '#2dd4bf', '#fef08a'],
    ['#c084fc', '#e879f9', '#fef9c3'],
  ];

  const elapsedMs = Math.max(0, fireworks.durationMs - fireworks.remainingMs);
  const fade = Math.min(1, fireworks.remainingMs / 3000) * Math.min(1, elapsedMs / 1500 + 0.25);

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  // 6 overlapping asynchronous firework shells bursting across the sky
  const cycleFrames = 96;
  for (let i = 0; i < 6; i++) {
    const localTick = tick + i * 16;
    const cycleIdx = Math.floor(localTick / cycleFrames);
    const phase = (localTick % cycleFrames) / cycleFrames; // 0..1

    // Deterministic spread across the upper & mid viewport
    const seed = cycleIdx * 73 + i * 19;
    const targetX = w * (0.14 + ((seed * 37) % 72) / 100);
    const targetY = h * (0.14 + ((seed * 53) % 44) / 100);
    const launchY = targetY + h * 0.34;
    const cols = palettes[(seed + i) % palettes.length];

    if (phase < 0.26) {
      // Rising rocket with glowing trail
      const riseT = phase / 0.26;
      const curY = launchY + (targetY - launchY) * riseT;
      const trailLen = 28 * zoomScale;
      ctx.fillStyle = `rgba(254, 249, 195, ${(0.85 * fade).toFixed(2)})`;
      const sz = Math.max(3, Math.round(3.2 * zoomScale));
      ctx.fillRect(Math.floor(targetX - sz / 2), Math.floor(curY), sz, sz * 2);
      ctx.fillStyle = `rgba(251, 191, 36, ${(0.45 * fade).toFixed(2)})`;
      ctx.fillRect(Math.floor(targetX - 1), Math.floor(curY + sz), Math.max(2, sz - 1), Math.floor(trailLen * (1 - riseT * 0.3)));
    } else {
      // Sparkling burst explosion!
      const burstT = (phase - 0.26) / 0.74;
      const alpha = Math.max(0, (1 - burstT) * 0.92 * fade);
      const maxRadius = (58 + (seed % 32)) * zoomScale;

      // Brief warm flash at burst moment
      if (burstT < 0.16) {
        const flashR = maxRadius * 0.65 * (1 - burstT / 0.16);
        const grad = ctx.createRadialGradient(targetX, targetY, 1, targetX, targetY, Math.max(4, flashR));
        grad.addColorStop(0, `rgba(255, 255, 255, ${(0.65 * fade).toFixed(2)})`);
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(targetX, targetY, Math.max(4, flashR), 0, Math.PI * 2);
        ctx.fill();
      }

      // Outer and inner spark rings with gentle gravity droop
      const rays = 14;
      const gravity = burstT * burstT * 26 * zoomScale;
      for (let r = 0; r < rays; r++) {
        const angle = (r / rays) * Math.PI * 2 + (seed % 7) * 0.15;
        const dist = maxRadius * Math.sin(burstT * Math.PI * 0.58);
        const pxX = targetX + Math.cos(angle) * dist;
        const pxY = targetY + Math.sin(angle) * dist + gravity;
        const sparkSz = Math.max(2.5, (4.2 - burstT * 2.2) * zoomScale);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = cols[r % cols.length];
        ctx.fillRect(Math.floor(pxX - sparkSz / 2), Math.floor(pxY - sparkSz / 2), sparkSz, sparkSz);

        // Inner secondary trail sparks
        const innerDist = dist * 0.56;
        const ix = targetX + Math.cos(angle + 0.2) * innerDist;
        const iy = targetY + Math.sin(angle + 0.2) * innerDist + gravity * 0.7;
        ctx.fillStyle = cols[(r + 1) % cols.length];
        ctx.fillRect(Math.floor(ix), Math.floor(iy), Math.max(2, sparkSz * 0.75), Math.max(2, sparkSz * 0.75));
      }
      ctx.globalAlpha = 1;
    }
  }

  ctx.restore();
}


