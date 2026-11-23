import React, { useEffect, useRef, useState } from 'react';
import { Fish, LocateFixed } from 'lucide-react';
import {
  ANIMAL_AVG_LIFESPAN_MS,
  ARTISAN_STATION_IDS,
  CATALOG_BY_ID,
  FISH_DENSITY_META,
  FISHING_REGION_LABELS,
  FISHING_UNLOCK_LEVEL,
  fishingXpRequiredForLevel,
  GRID_SIZE,
  IDLE_TILLED_REVERT_MS,
  isLivestockAnimal,
  MAX_MOISTURE_MS,
  TILE_PX,
  WITHER_CROP_DRY_MS,
  WITHER_MUSHROOM_DRY_MS,
  WORKER_ROLES,
  WORKER_WORK_END_MIN,
  WORKER_WORK_START_MIN,
  WORLD_MARGIN,
  WORLD_SIZE,
} from '../data/catalog';
import {
  formatDurationMs,
  getTileProtections,
  getWateringPatternOffsets,
  isAnimalEnclosed,
  isFenceLike,
  isRoamingAnimal,
} from '../engine/gameLogic';
import { ROMANCE_CANDIDATE_BY_ID } from '../data/romance';
import {
  getFireBrigadeVisualState,
  getResidentsForHouse,
  VILLAGE_BUSINESSES,
  VILLAGE_HOUSE_BY_ID,
  VILLAGE_HOUSES,
  VillageBusinessSpec,
} from '../data/village';
import {
  getThemeParkMetrics,
  THEME_PARK_ATTRACTIONS,
  THEME_PARK_BASE_COST,
  THEME_PARK_BOUNDS,
  THEME_PARK_UNLOCK_LEVEL,
} from '../data/themePark';
import {
  drawFarmhouse,
  drawFarmShop,
  drawFishingCast,
  drawMailbox,
  drawNewYearFireworks,
  drawNightLightsOverlay,
  drawNightMaskCutouts,
  drawNorthernVillage,
  drawPixelAvatar,
  drawPixelPet,
  drawPixelWorker,
  drawPostman,
  drawRoamingAnimalsPass,
  drawSantaSleighFlyover,
  drawShopVisitor,
  drawTile,
  drawToolCursorIcon,
  drawUfoAbduction,
  drawValleyWorld,
  drawVillageFireBrigade,
  drawWanderingMerchant,
  drawWildFlyAgaric,
  drawWinterGiftDrop,
  getDayNightAtmosphere,
  getRiverRegionForWy,
  getSunShadowSpec,
} from '../graphics/pixelSprites';
import {
  createInitialVillageLifeState,
  triggerVillageNpcGreeting,
  updateVillageLifeState,
  VillageAmbientNpc,
  VillageLifeState,
} from '../engine/villageLife';
import {
  drawVillageAmbientNpc,
  drawVillageBird,
  drawVillageButterfly,
  drawVillageCat,
  drawVillageEnvironmentProps,
  drawVillageGreetingBubbles,
  drawVillageVehicle,
} from '../graphics/villageLifeSprites';
import { Move } from 'lucide-react';
import {
  ActionBurst,
  ActionBurstKind,
  FishingRegionId,
  FloatingText,
  GameState,
  GraphicsQuality,
  MovingDecorationState,
  PlayerPosition,
  ResolutionPreset,
  TileData,
  UfoAbductionAnimation,
  VillageBusinessId,
} from '../types/game';

interface FxParticle {
  wx: number;
  wy: number;
  vx: number;
  vy: number;
  gravity: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

const BURST_PALETTES: Record<ActionBurstKind, string[]> = {
  hoe: ['#78350f', '#92400e', '#b45309', '#65a30d'],
  water: ['#38bdf8', '#7dd3fc', '#bae6fd', '#e0f2fe'],
  fertilize: ['#4ade80', '#facc15', '#a3e635', '#fef08a'],
  plant: ['#22c55e', '#4ade80', '#84cc16', '#fde68a'],
  harvest: ['#facc15', '#fef08a', '#fbbf24', '#4ade80'],
  build: ['#d6c3a5', '#b45309', '#fef08a', '#94a3b8'],
  remove: ['#cbd5e1', '#94a3b8', '#b45309', '#78350f'],
  splash: ['#38bdf8', '#7dd3fc', '#f8fafc', '#bae6fd'],
};

export interface ActiveFishingCast {
  active: boolean;
  phase: 'waiting' | 'biting';
  targetWx: number;
  targetWy: number;
  region: FishingRegionId;
  usedBait?: boolean;
}

interface FarmCanvasProps {
  gameState: GameState;
  resolution: ResolutionPreset;
  graphicsQuality?: GraphicsQuality;
  showGrid: boolean;
  showTimers: boolean;
  floatingTexts: FloatingText[];
  playerPos: PlayerPosition;
  fishingCast: ActiveFishingCast | null;
  ufoAbduction: UfoAbductionAnimation | null;
  movingDecoration: MovingDecorationState | null;
  actionBurstQueueRef?: React.MutableRefObject<ActionBurst[]>;
  onTileInteract: (x: number, y: number, isDrag?: boolean) => void;
  onRiverInteract: (wx: number, wy: number) => void;
  onReelFishing: () => void;
  onCancelMoveDecoration: () => void;
  onExpandClick: () => void;
  onHouseClick: () => void;
  onShopClick: () => void;
  onMailboxClick: () => void;
  onPetClick: () => void;
  onWorkerClick: () => void;
  onMerchantClick: () => void;
  onVillageBoardClick: () => void;
  onVillageBusinessClick: (businessId: VillageBusinessId) => void;
  onThemeParkClick: () => void;
  onVillageFireClick: () => void;
  onMineClick: () => void;
  onFlyAgaricInteract: (x: number, y: number) => void;
}

const RES_CONFIG: Record<ResolutionPreset, { width: number; height: number; zoomScale: number }> = {
  '720p': { width: 1280, height: 720, zoomScale: 1.0 },
  '1080p': { width: 1920, height: 1080, zoomScale: 1.38 },
  '2160p': { width: 3840, height: 2160, zoomScale: 2.65 },
};

export const FarmCanvas: React.FC<FarmCanvasProps> = ({
  gameState,
  resolution,
  graphicsQuality = 'high',
  showGrid,
  showTimers,
  floatingTexts,
  playerPos,
  fishingCast,
  ufoAbduction,
  movingDecoration,
  actionBurstQueueRef,
  onTileInteract,
  onRiverInteract,
  onReelFishing,
  onCancelMoveDecoration,
  onExpandClick,
  onHouseClick,
  onShopClick,
  onMailboxClick,
  onPetClick,
  onWorkerClick,
  onMerchantClick,
  onVillageBoardClick,
  onVillageBusinessClick,
  onThemeParkClick,
  onVillageFireClick,
  onMineClick,
  onFlyAgaricInteract,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nightMaskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fxParticlesRef = useRef<FxParticle[]>([]);
  const [hoverWorld, setHoverWorld] = useState<{ wx: number; wy: number; fxExact: number; fyExact: number } | null>(null);
  const [isPainting, setIsPainting] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [camera, setCamera] = useState<{ x: number; y: number; zoom: number }>({
    x: 0,
    y: 0,
    zoom: 1.0,
  });

  const panStartRef = useRef<{ clientX: number; clientY: number; camX: number; camY: number } | null>(null);
  const rightClickOnPetRef = useRef(false);
  const rightClickOnWorkerRef = useRef(false);
  const rightClickOnMerchantRef = useRef(false);
  const rightClickOnFlyAgaricRef = useRef<{ x: number; y: number } | null>(null);
  const panMovedRef = useRef(false);
  const lastInteractedRef = useRef<string | null>(null);
  const mouseCanvasRef = useRef<{ cx: number; cy: number } | null>(null);
  const actionPulseUntilRef = useRef<number>(0);
  const tickRef = useRef(0);
  const villageLifeRef = useRef<VillageLifeState | null>(null);
  const lastVillageFrameMsRef = useRef<number>(Date.now());

  const particlesRef = useRef(
    Array.from({ length: 100 }, (_, i) => ({
      x: (i * 97) % 1800,
      y: (i * 53) % 1100,
      speed: 2.5 + (i % 4) * 1.1,
      size: 2 + (i % 2),
    }))
  );

  const res = RES_CONFIG[resolution];

  const getBoardTransform = (canvasW: number, canvasH: number) => {
    const baseTilePx = Math.round(TILE_PX * res.zoomScale * camera.zoom);
    const tilePx = Math.max(22, Math.min(130, baseTilePx));
    const worldPx = tilePx * WORLD_SIZE;
    const offsetX = Math.floor((canvasW - worldPx) / 2 + camera.x * res.zoomScale);
    const offsetY = Math.floor((canvasH - worldPx) / 2 + camera.y * res.zoomScale);
    return { tilePx, worldPx, offsetX, offsetY };
  };

  useEffect(() => {
    let rafId = 0;
    const render = () => {
      tickRef.current += 1;
      const tick = tickRef.current;
      const canvas = canvasRef.current;
      if (!canvas) {
        rafId = requestAnimationFrame(render);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        rafId = requestAnimationFrame(render);
        return;
      }

      ctx.imageSmoothingEnabled = false;
      const w = canvas.width;
      const h = canvas.height;

      const bgMap = {
        spring: '#223b1b',
        summer: '#254218',
        autumn: '#3d3518',
        winter: '#465666',
      };
      ctx.fillStyle = bgMap[gameState.season];
      ctx.fillRect(0, 0, w, h);

      const { tilePx, offsetX, offsetY } = getBoardTransform(w, h);
      const dayNight = getDayNightAtmosphere(gameState.ingameMinutes);
      const highGraphics = graphicsQuality === 'high';
      const shadowSpec = highGraphics ? getSunShadowSpec(gameState.ingameMinutes, gameState.weather) : undefined;

      ctx.save();
      ctx.translate(offsetX, offsetY);

      // 1. Surrounding Valley World + Northern Sonnental Village & Westviertel Industrial Zone
      const activeHoverBusinessId =
        hoverWorld && hoverWorld.wy < 0
          ? VILLAGE_BUSINESSES.find(
              (vb) =>
                hoverWorld.fxExact >= vb.x &&
                hoverWorld.fxExact <= vb.x + vb.width &&
                hoverWorld.fyExact >= vb.y &&
                hoverWorld.fyExact <= vb.y + vb.height
            )?.id ?? null
          : null;
      const activeHoverHouseId =
        hoverWorld && hoverWorld.wy < 0
          ? VILLAGE_HOUSES.find(
              (vh) =>
                hoverWorld.fxExact >= vh.x &&
                hoverWorld.fxExact <= vh.x + vh.width &&
                hoverWorld.fyExact >= vh.y &&
                hoverWorld.fyExact <= vh.y + vh.height
            )?.id ?? null
          : null;
      const hoverVillageBoardNow =
        hoverWorld !== null && hoverWorld.wx === 12 && (hoverWorld.wy === -8 || hoverWorld.wy === -7);
      const hoverMineNow =
        hoverWorld !== null &&
        hoverWorld.wx >= 1 &&
        hoverWorld.wx <= 2 &&
        hoverWorld.wy >= 11 &&
        hoverWorld.wy <= 12;
      const hoverThemeParkNow =
        hoverWorld !== null &&
        hoverWorld.fxExact >= THEME_PARK_BOUNDS.x &&
        hoverWorld.fxExact <= THEME_PARK_BOUNDS.x + THEME_PARK_BOUNDS.width &&
        hoverWorld.fyExact >= THEME_PARK_BOUNDS.y &&
        hoverWorld.fyExact <= THEME_PARK_BOUNDS.y + THEME_PARK_BOUNDS.height;
      drawNorthernVillage(
        ctx,
        tilePx,
        gameState.season,
        tick,
        dayNight.nightFactor,
        activeHoverHouseId,
        hoverVillageBoardNow,
        gameState.villageFire,
        activeHoverBusinessId,
        gameState.villageBusinesses?.ownedIds || [],
        Object.keys(gameState.villageBusinesses?.brokenById || {}) as VillageBusinessId[]
      );
      drawVillageEnvironmentProps(
        ctx,
        tilePx,
        gameState.season,
        gameState.weather,
        tick,
        dayNight.nightFactor
      );

      const nowVillageMs = Date.now();
      const villageDeltaMs = Math.min(80, Math.max(8, nowVillageMs - lastVillageFrameMsRef.current));
      lastVillageFrameMsRef.current = nowVillageMs;
      if (!villageLifeRef.current) {
        villageLifeRef.current = createInitialVillageLifeState(
          gameState.ingameMinutes,
          gameState.season,
          gameState.weather
        );
      }
      const activeShopResidentIds = new Set(
        (gameState.farmShop?.visitors || [])
          .map((v) => v.residentId)
          .filter((id): id is string => Boolean(id))
      );
      updateVillageLifeState(villageLifeRef.current, {
        deltaMs: villageDeltaMs,
        nowMs: nowVillageMs,
        ingameMinutes: gameState.ingameMinutes,
        season: gameState.season,
        weather: gameState.weather,
        farmerName: gameState.avatar.farmerName,
        playerPos,
        activeShopResidentIds,
        burningHouseId: gameState.villageFire?.active ? gameState.villageFire.houseId : null,
        themeParkOwned: Boolean(gameState.themePark?.owned),
        themeParkAttractions: gameState.themePark?.attractions || [],
      });
      drawValleyWorld(
        ctx,
        tilePx,
        gameState.season,
        tick,
        gameState.fishing.regionDensity,
        dayNight.nightFactor,
        hoverMineNow,
        gameState.themePark,
        hoverThemeParkNow,
        highGraphics,
        gameState.weather,
        shadowSpec
      );

      // Highlight hovered river tile when Angel tool is active
      if (hoverWorld && hoverWorld.wx === WORLD_SIZE - 2 && hoverWorld.wy >= 2 && hoverWorld.wy <= WORLD_SIZE - 2) {
        ctx.strokeStyle = gameState.selectedTool === 'fishing' ? '#fef08a' : 'rgba(255,255,255,0.45)';
        ctx.lineWidth = 2;
        ctx.strokeRect(hoverWorld.wx * tilePx + 1, hoverWorld.wy * tilePx + 1, tilePx - 2, tilePx - 2);
      }

      // 2. Farm Yard wooden boundary
      const farmOriginPx = WORLD_MARGIN * tilePx;
      const farmSizePx = GRID_SIZE * tilePx;
      ctx.strokeStyle = '#6e4a2e';
      ctx.lineWidth = Math.max(3, Math.round(tilePx * 0.1));
      ctx.strokeRect(farmOriginPx - 2, farmOriginPx - 2, farmSizePx + 4, farmSizePx + 4);

      // 3. Farm Tiles (20x20 inside valley)
      ctx.save();
      ctx.translate(farmOriginPx, farmOriginPx);

      const hoverFarmX = hoverWorld ? hoverWorld.wx - WORLD_MARGIN : -1;
      const hoverFarmY = hoverWorld ? hoverWorld.wy - WORLD_MARGIN : -1;

      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          const tile = gameState.tiles[y][x];
          const isHovered = hoverFarmX === x && hoverFarmY === y;
          const { shielded, speedBoosted } = isHovered
            ? getTileProtections(gameState.tiles, x, y)
            : { shielded: false, speedBoosted: false };

          drawTile(
            ctx,
            tile,
            tilePx,
            gameState.season,
            showGrid,
            tick,
            gameState.weather,
            isHovered,
            shielded,
            speedBoosted,
            dayNight.nightFactor,
            gameState.tiles,
            true,
            highGraphics,
            shadowSpec
          );
        }
      }

      // 3b. Rare Wild Fly Agaric on empty meadow tile
      if (gameState.flyAgaricPos) {
        const { x: fx, y: fy } = gameState.flyAgaricPos;
        if (gameState.tiles[fy]?.[fx]?.ground === 'grass' && !gameState.tiles[fy]?.[fx]?.entity) {
          drawWildFlyAgaric(ctx, fx * tilePx, fy * tilePx, tilePx, tick);
        }
      }

      // 3b-2. Wrapped Christmas Gifts dropped by Santa on Winter Day 1
      (gameState.winterFestival?.droppedGifts || []).forEach((gift) => {
        const gt = gameState.tiles[gift.y]?.[gift.x];
        if (gt && gt.unlocked && !gt.entity) {
          drawWinterGiftDrop(ctx, gift.x * tilePx, gift.y * tilePx, tilePx, tick);
        }
      });

      // 3c. Smooth Pass-2 Roaming Farm Animals (Y-sorted with facing & walk interpolation)
      drawRoamingAnimalsPass(ctx, gameState.tiles, tilePx, tick, Date.now(), highGraphics, shadowSpec);

      // 3d. Decoration Move Highlight & Ghost Target Preview
      if (movingDecoration) {
        const pulse = 0.22 + 0.14 * Math.sin(tick * 0.18);
        ctx.fillStyle = `rgba(250, 204, 21, ${pulse.toFixed(2)})`;
        ctx.fillRect(movingDecoration.fromX * tilePx + 2, movingDecoration.fromY * tilePx + 2, tilePx - 4, tilePx - 4);
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 3;
        ctx.strokeRect(movingDecoration.fromX * tilePx + 2, movingDecoration.fromY * tilePx + 2, tilePx - 4, tilePx - 4);

        if (hoverFarmX >= 0 && hoverFarmX < GRID_SIZE && hoverFarmY >= 0 && hoverFarmY < GRID_SIZE) {
          const targetTile = gameState.tiles[hoverFarmY][hoverFarmX];
          const isFlyHere =
            gameState.flyAgaricPos !== null &&
            gameState.flyAgaricPos.x === hoverFarmX &&
            gameState.flyAgaricPos.y === hoverFarmY;
          const isGiftHere = Boolean(
            gameState.winterFestival?.droppedGifts?.some((g) => g.x === hoverFarmX && g.y === hoverFarmY)
          );
          const isSame = hoverFarmX === movingDecoration.fromX && hoverFarmY === movingDecoration.fromY;
          const canDrop = targetTile.unlocked && !targetTile.entity && !isFlyHere && !isGiftHere && !isSame;

          if (!isSame && targetTile.unlocked) {
            ctx.fillStyle = canDrop ? 'rgba(74, 222, 128, 0.22)' : 'rgba(239, 68, 68, 0.25)';
            ctx.fillRect(hoverFarmX * tilePx + 2, hoverFarmY * tilePx + 2, tilePx - 4, tilePx - 4);
            ctx.strokeStyle = canDrop ? '#4ade80' : '#ef4444';
            ctx.lineWidth = 2.5;
            ctx.strokeRect(hoverFarmX * tilePx + 2, hoverFarmY * tilePx + 2, tilePx - 4, tilePx - 4);

            if (canDrop) {
              const ghostTile: TileData = {
                ...targetTile,
                ground: targetTile.ground === 'tilled' ? 'grass' : targetTile.ground,
                watered: false,
                entity: {
                  itemId: movingDecoration.itemId,
                  category: 'decoration',
                  progressMs: 0,
                  ready: false,
                  harvestCount: 0,
                  fedOrWatered: false,
                },
              };
              ctx.save();
              ctx.globalAlpha = 0.7;
              drawTile(
                ctx,
                ghostTile,
                tilePx,
                gameState.season,
                false,
                tick,
                gameState.weather,
                false,
                false,
                false,
                dayNight.nightFactor,
                gameState.tiles,
                true
              );
              ctx.restore();

              const moveItem = CATALOG_BY_ID[movingDecoration.itemId];
              const r =
                moveItem?.greenhouseRadius ||
                moveItem?.sprinklerRadius ||
                moveItem?.stormShieldRadius ||
                moveItem?.speedAuraRadius;
              if (r) {
                ctx.strokeStyle = moveItem?.greenhouseRadius
                  ? 'rgba(52, 211, 153, 0.78)'
                  : moveItem?.sprinklerRadius
                  ? 'rgba(56, 189, 248, 0.7)'
                  : 'rgba(250, 204, 21, 0.7)';
                ctx.lineWidth = 2;
                const minX = Math.max(0, hoverFarmX - r);
                const minY = Math.max(0, hoverFarmY - r);
                const maxX = Math.min(GRID_SIZE - 1, hoverFarmX + r);
                const maxY = Math.min(GRID_SIZE - 1, hoverFarmY + r);
                ctx.strokeRect(
                  minX * tilePx + 2,
                  minY * tilePx + 2,
                  (maxX - minX + 1) * tilePx - 4,
                  (maxY - minY + 1) * tilePx - 4
                );
              }
            }
          }
        }
      }

      // Highlight multi-tile area for upgraded Watering Can or Sprinklers
      if (!movingDecoration && hoverFarmX >= 0 && hoverFarmX < GRID_SIZE && hoverFarmY >= 0 && hoverFarmY < GRID_SIZE) {
        if (gameState.selectedTool === 'water') {
          const offsets = getWateringPatternOffsets(gameState.wateringCanTier || 1);
          if (offsets.length > 1) {
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
            ctx.fillStyle = 'rgba(56, 189, 248, 0.14)';
            ctx.lineWidth = 2;
            offsets.forEach(({ dx, dy }) => {
              const tx = hoverFarmX + dx;
              const ty = hoverFarmY + dy;
              if (tx >= 0 && tx < GRID_SIZE && ty >= 0 && ty < GRID_SIZE && gameState.tiles[ty][tx].unlocked) {
                ctx.fillRect(tx * tilePx + 2, ty * tilePx + 2, tilePx - 4, tilePx - 4);
                ctx.strokeRect(tx * tilePx + 2, ty * tilePx + 2, tilePx - 4, tilePx - 4);
              }
            });
          }
        } else if (gameState.selectedTool === 'plant' || gameState.selectedTool === 'build') {
          const selItem = CATALOG_BY_ID[gameState.selectedSeedId];
          const r =
            selItem?.greenhouseRadius ||
            selItem?.sprinklerRadius ||
            selItem?.stormShieldRadius ||
            selItem?.speedAuraRadius;
          if (r) {
            ctx.strokeStyle = selItem?.greenhouseRadius
              ? 'rgba(52, 211, 153, 0.78)'
              : selItem?.sprinklerRadius
              ? 'rgba(56, 189, 248, 0.65)'
              : 'rgba(250, 204, 21, 0.65)';
            ctx.lineWidth = 2;
            const minX = Math.max(0, hoverFarmX - r);
            const minY = Math.max(0, hoverFarmY - r);
            const maxX = Math.min(GRID_SIZE - 1, hoverFarmX + r);
            const maxY = Math.min(GRID_SIZE - 1, hoverFarmY + r);
            ctx.strokeRect(
              minX * tilePx + 2,
              minY * tilePx + 2,
              (maxX - minX + 1) * tilePx - 4,
              (maxY - minY + 1) * tilePx - 4
            );
          }
        }
      }

      // 4. Pixel Pet inside farm
      const pScale = Math.max(2, Math.floor(tilePx / 16));
      const petX = Math.floor(gameState.pet.x * tilePx + (tilePx - 16 * pScale) / 2);
      const petY = Math.floor(gameState.pet.y * tilePx + (tilePx - 16 * pScale) / 2);
      const isPetHovered =
        hoverFarmX === Math.round(gameState.pet.x) && hoverFarmY === Math.round(gameState.pet.y);
      drawPixelPet(
        ctx,
        petX,
        petY,
        gameState.pet.type,
        pScale,
        tick,
        isPetHovered,
        shadowSpec?.active ? shadowSpec.dx : 0,
        shadowSpec?.active ? shadowSpec.dy : 0,
        shadowSpec?.active ? shadowSpec.alpha : 0.22
      );

      // 4b. Hired Farm Workers inside farm
      const nowRender = Date.now();
      const isWorkerShift =
        gameState.ingameMinutes >= WORKER_WORK_START_MIN && gameState.ingameMinutes < WORKER_WORK_END_MIN;
      (gameState.workers || []).forEach((w) => {
        const elapsed = w.movedAt ? nowRender - w.movedAt : 9999;
        const progress = Math.min(1, Math.max(0, elapsed / 650));
        const isMoving = progress < 1;
        const drawGX =
          isMoving && w.moveFromX !== undefined ? w.moveFromX + (w.x - w.moveFromX) * progress : w.x;
        const drawGY =
          isMoving && w.moveFromY !== undefined ? w.moveFromY + (w.y - w.moveFromY) * progress : w.y;
        const wxPx = Math.floor(drawGX * tilePx + (tilePx - 16 * pScale) / 2);
        const wyPx = Math.floor(drawGY * tilePx + (tilePx - 16 * pScale) / 2 - pScale * 2);
        const isWHovered = hoverFarmX === Math.round(w.x) && hoverFarmY === Math.round(w.y);
        drawPixelWorker(
          ctx,
          wxPx,
          wyPx,
          w,
          pScale,
          tick,
          isMoving,
          !isWorkerShift,
          isWHovered,
          dayNight.nightFactor,
          shadowSpec?.active ? shadowSpec.dx : 0,
          shadowSpec?.active ? shadowSpec.dy : 0,
          shadowSpec?.active ? shadowSpec.alpha : 0.22,
          highGraphics
        );
      });

      ctx.restore(); // end farm translate

      // 5. Evolving 1-4 Story Farmhouse at world tiles (1..3, 0..3) + (4, 0..2)
      const isHouseHovered =
        hoverWorld !== null &&
        ((hoverWorld.wx >= 1 && hoverWorld.wx <= 3 && hoverWorld.wy >= 0 && hoverWorld.wy <= 3) ||
          (hoverWorld.wx === 4 && hoverWorld.wy >= 0 && hoverWorld.wy <= 2));
      drawFarmhouse(
        ctx,
        tilePx,
        gameState.house,
        tick,
        isHouseHovered,
        dayNight.nightFactor,
        highGraphics,
        shadowSpec
      );

      // 5a-0. Hof-Briefkasten at (4, 3) & Animated Dorf-Postbote
      const isMailboxHovered = hoverWorld !== null && hoverWorld.wx === 4 && hoverWorld.wy === 3;
      drawMailbox(ctx, tilePx, gameState.mailbox, tick, isMailboxHovered);

      // 5a. Hofladen (Farm Shop) directly below Farmhouse (wx 1..2, wy 4..6) + Visitors
      const isShopHovered =
        hoverWorld !== null &&
        hoverWorld.wx >= 1 &&
        hoverWorld.wx <= 2 &&
        hoverWorld.wy >= 4 &&
        hoverWorld.wy <= 6;
      drawFarmShop(
        ctx,
        tilePx,
        gameState.farmShop,
        tick,
        isShopHovered,
        dayNight.nightFactor,
        highGraphics,
        shadowSpec
      );

      const shopVisitorsSorted = [...(gameState.farmShop?.visitors || [])].sort((a, b) => a.y - b.y);
      shopVisitorsSorted.forEach((visitor) => {
        drawShopVisitor(ctx, tilePx, visitor, tick, gameState.weather);
      });

      // 5a-2. Ambient Village Life (strollers, plaza chats, benches, cats, cyclists/carts, birds, butterflies)
      const vLife = villageLifeRef.current;
      if (vLife) {
        const nowV = Date.now();
        const isDayV = gameState.ingameMinutes >= 360 && gameState.ingameMinutes <= 1180;
        const isStormV = gameState.weather === 'stormy';
        if (!isStormV) {
          for (const cat of vLife.cats) {
            drawVillageCat(ctx, tilePx, cat, tick);
          }
        }
        const vehiclesActive =
          gameState.ingameMinutes >= 390 && gameState.ingameMinutes <= 1230 && !isStormV;
        if (vehiclesActive) {
          for (const veh of vLife.vehicles) {
            drawVillageVehicle(ctx, tilePx, veh, tick, dayNight.nightFactor);
          }
        }
        const ambientSorted = [...vLife.npcs].sort((a, b) => a.y - b.y);
        for (const npc of ambientSorted) {
          drawVillageAmbientNpc(ctx, tilePx, npc, tick, gameState.weather, gameState.season, nowV);
        }
        if (isDayV && !isStormV) {
          for (const bird of vLife.birds) {
            drawVillageBird(ctx, tilePx, bird, tick, nowV);
          }
          if (
            (gameState.season === 'spring' || gameState.season === 'summer') &&
            gameState.weather !== 'rainy'
          ) {
            for (const bf of vLife.butterflies) {
              drawVillageButterfly(ctx, tilePx, bf, tick);
            }
          }
        }
      }

      if (gameState.villageFire?.active) {
        const activeFireHouse = VILLAGE_HOUSE_BY_ID[gameState.villageFire.houseId];
        const fireTruckPos = activeFireHouse
          ? getFireBrigadeVisualState(gameState.villageFire, activeFireHouse)
          : null;
        const hoverTruckNow = Boolean(
          fireTruckPos &&
            hoverWorld &&
            hoverWorld.fxExact >= fireTruckPos.truckX - 0.15 &&
            hoverWorld.fxExact <= fireTruckPos.truckX + 1.85 &&
            hoverWorld.fyExact >= fireTruckPos.truckY - 0.15 &&
            hoverWorld.fyExact <= fireTruckPos.truckY + 1.15
        );
        drawVillageFireBrigade(
          ctx,
          tilePx,
          gameState.villageFire,
          tick,
          dayNight.nightFactor,
          hoverTruckNow || (Boolean(activeFireHouse) && activeHoverHouseId === activeFireHouse.id)
        );
      }

      if (gameState.mailbox?.postman?.active) {
        drawPostman(ctx, tilePx, gameState.mailbox.postman, tick);
      }

      // 5b. Wandering Merchant Bruno beside the south bridge
      const isMerchantHoveredNow =
        Boolean(gameState.merchant?.active) &&
        hoverWorld !== null &&
        hoverWorld.wx >= 12 &&
        hoverWorld.wx <= 13 &&
        hoverWorld.wy >= 24 &&
        hoverWorld.wy <= 25;
      if (gameState.merchant?.active) {
        drawWanderingMerchant(ctx, tilePx, tick, dayNight.nightFactor, isMerchantHoveredNow);
      }

      // 5c. Married Partner strolling outside the Farmhouse & Mailbox
      const now = Date.now();
      if (gameState.romance?.status === 'married' && gameState.romance.partnerId) {
        const partnerSpec = ROMANCE_CANDIDATE_BY_ID[gameState.romance.partnerId];
        if (partnerSpec) {
          const movedAt = gameState.romance.partnerMovedAt || 0;
          const elapsedP = movedAt ? now - movedAt : 9999;
          const pProg = Math.min(1, Math.max(0, elapsedP / 950));
          const isPartnerMoving = pProg < 1;
          const pDrawX =
            isPartnerMoving && gameState.romance.partnerMoveFromX !== undefined
              ? gameState.romance.partnerMoveFromX + (gameState.romance.partnerX - gameState.romance.partnerMoveFromX) * pProg
              : gameState.romance.partnerX;
          const pDrawY =
            isPartnerMoving && gameState.romance.partnerMoveFromY !== undefined
              ? gameState.romance.partnerMoveFromY + (gameState.romance.partnerY - gameState.romance.partnerMoveFromY) * pProg
              : gameState.romance.partnerY;
          const spX = Math.floor(pDrawX * tilePx + (tilePx - 16 * pScale) / 2);
          const spY = Math.floor(pDrawY * tilePx + (tilePx - 16 * pScale) / 2 - pScale * 2);
          drawPixelAvatar(
            ctx,
            spX,
            spY,
            partnerSpec.avatar,
            pScale,
            tick,
            isPartnerMoving,
            0,
            dayNight.nightFactor,
            shadowSpec?.active ? shadowSpec.dx : 0,
            shadowSpec?.active ? shadowSpec.dy : 0,
            shadowSpec?.active ? shadowSpec.alpha : 0.22
          );

          // Tiny pixel heart floating gently above spouse head
          const heartY = Math.floor(spY - 5 * pScale + Math.sin(tick * 0.14) * pScale);
          const heartX = Math.floor(spX + 6 * pScale);
          ctx.fillStyle = '#e11d48';
          ctx.fillRect(heartX, heartY + pScale, pScale, pScale);
          ctx.fillRect(heartX + 2 * pScale, heartY + pScale, pScale, pScale);
          ctx.fillRect(heartX, heartY + 2 * pScale, 3 * pScale, pScale);
          ctx.fillRect(heartX + pScale, heartY + 3 * pScale, pScale, pScale);

          const isPartnerHovered =
            hoverWorld !== null &&
            Math.abs(hoverWorld.fxExact - pDrawX - 0.5) <= 0.7 &&
            Math.abs(hoverWorld.fyExact - pDrawY - 0.5) <= 0.7;
          if (isPartnerHovered) {
            ctx.save();
            ctx.font = `700 ${Math.max(11, Math.round(tilePx * 0.25))}px "Outfit", sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(74, 50, 31, 0.92)';
            const label = `💕 ${partnerSpec.name}`;
            const lw = ctx.measureText(label).width + 12;
            const lx = Math.floor(spX + 8 * pScale - lw / 2);
            const ly = Math.floor(heartY - 18);
            ctx.fillRect(lx, ly, lw, 16);
            ctx.fillStyle = '#faf6ee';
            ctx.fillText(label, spX + 8 * pScale, ly + 12);
            ctx.restore();
          }
        }
      }

      // 6. Player Pixel Avatar (in world space so player can walk to the river!)
      const jumpElapsed = playerPos.jumpStartMs ? now - playerPos.jumpStartMs : 9999;
      const jumpProgress = jumpElapsed >= 0 && jumpElapsed < 420 ? jumpElapsed / 420 : 0;
      const pxX = Math.floor(playerPos.x * tilePx + (tilePx - 16 * pScale) / 2);
      const pxY = Math.floor(playerPos.y * tilePx + (tilePx - 16 * pScale) / 2 - pScale * 2);
      drawPixelAvatar(
        ctx,
        pxX,
        pxY,
        gameState.avatar,
        pScale,
        tick,
        playerPos.moving,
        jumpProgress,
        dayNight.nightFactor,
        shadowSpec?.active ? shadowSpec.dx : 0,
        shadowSpec?.active ? shadowSpec.dy : 0,
        shadowSpec?.active ? shadowSpec.alpha : 0.22
      );

      if (vLife) {
        drawVillageGreetingBubbles(ctx, tilePx, vLife, now);
      }

      // 7. Active Fishing Line & Bobber
      if (fishingCast?.active) {
        drawFishingCast(
          ctx,
          tilePx,
          playerPos.x,
          playerPos.y,
          fishingCast.targetWx,
          fishingCast.targetWy,
          fishingCast.phase,
          tick
        );
      }

      // 7b. UFO Cow Abduction Tractor-Beam Animation!
      if (ufoAbduction && now - ufoAbduction.startedAt <= ufoAbduction.durationMs) {
        drawUfoAbduction(ctx, tilePx, farmOriginPx, ufoAbduction, tick, now);
      }

      // 7c. High-Graphics Action Bursts & Ambient Smoke/Steam Puffs (zero React re-renders!)
      if (highGraphics) {
        const queued = actionBurstQueueRef?.current;
        if (queued && queued.length > 0) {
          while (queued.length > 0) {
            const b = queued.shift()!;
            const palette = BURST_PALETTES[b.kind] || BURST_PALETTES.harvest;
            const count = b.kind === 'harvest' || b.kind === 'splash' ? 11 : 8;
            for (let i = 0; i < count; i++) {
              const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.45;
              const spd = (b.kind === 'water' || b.kind === 'splash' ? 0.035 : 0.028) + Math.random() * 0.032;
              fxParticlesRef.current.push({
                wx: b.wx + 0.5 + (Math.random() - 0.5) * 0.25,
                wy: b.wy + 0.55 + (Math.random() - 0.5) * 0.25,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd - (b.kind === 'harvest' ? 0.035 : 0.02),
                gravity: b.kind === 'harvest' || b.kind === 'fertilize' ? 0.0012 : 0.0024,
                life: 0,
                maxLife: 22 + Math.floor(Math.random() * 14),
                size: b.kind === 'harvest' ? 3 : 2,
                color: b.color && i % 3 === 0 ? b.color : palette[i % palette.length],
              });
            }
          }
          if (fxParticlesRef.current.length > 180) {
            fxParticlesRef.current.splice(0, fxParticlesRef.current.length - 180);
          }
        }

        // Ambient smoke puffs from Farmhouse fireplace & artisan ovens
        if (tick % 20 === 0) {
          if (gameState.house.extras.includes('fireplace')) {
            const chimneyY =
              gameState.house.floors >= 4
                ? 0.0
                : gameState.house.floors >= 3
                ? 0.35
                : gameState.house.floors >= 2
                ? 0.85
                : 1.4;
            fxParticlesRef.current.push({
              wx: 3.25 + (Math.random() - 0.5) * 0.1,
              wy: chimneyY,
              vx: 0.008 + Math.random() * 0.006,
              vy: -0.018 - Math.random() * 0.008,
              gravity: -0.0002,
              life: 0,
              maxLife: 40,
              size: 3,
              color: 'rgba(241, 245, 249, 0.72)',
            });
          }
          for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
              const id = gameState.tiles[y]?.[x]?.entity?.itemId;
              if (id === 'bakery_oven' || id === 'fish_smoker' || id === 'brewery' || id === 'feast_kitchen') {
                if ((x + y + Math.floor(tick / 20)) % 2 === 0) {
                  fxParticlesRef.current.push({
                    wx: WORLD_MARGIN + x + 0.68,
                    wy: WORLD_MARGIN + y + 0.12,
                    vx: 0.006 + Math.random() * 0.006,
                    vy: -0.016 - Math.random() * 0.008,
                    gravity: -0.0001,
                    life: 0,
                    maxLife: 34,
                    size: 2,
                    color: id === 'fish_smoker' ? 'rgba(226, 232, 240, 0.65)' : 'rgba(254, 243, 199, 0.7)',
                  });
                }
              }
            }
          }
        }

        if (fxParticlesRef.current.length > 0) {
          const alive: FxParticle[] = [];
          const pUnit = Math.max(2, Math.round(tilePx / 16));
          for (const pt of fxParticlesRef.current) {
            pt.life += 1;
            if (pt.life >= pt.maxLife) continue;
            pt.wx += pt.vx;
            pt.wy += pt.vy;
            pt.vy += pt.gravity;
            pt.vx *= 0.96;
            const alpha = Math.max(0, 1 - pt.life / pt.maxLife);
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = pt.color;
            const sz = Math.max(2, Math.round(pt.size * (pUnit * 0.55)));
            ctx.fillRect(Math.floor(pt.wx * tilePx), Math.floor(pt.wy * tilePx), sz, sz);
            ctx.restore();
            alive.push(pt);
          }
          fxParticlesRef.current = alive;
        }
      } else if (fxParticlesRef.current.length > 0) {
        fxParticlesRef.current = [];
      }

      // 8. Floating feedback popups (supports both farm-local and world coords)
      floatingTexts.forEach((ft) => {
        const age = now - ft.createdAt;
        if (age > 1500) return;
        const alpha = 1 - age / 1500;
        const rise = (age / 1500) * (tilePx * 0.7);
        const worldX = ft.isWorldCoord ? ft.x : ft.x + WORLD_MARGIN;
        const worldY = ft.isWorldCoord ? ft.y : ft.y + WORLD_MARGIN;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = `700 ${Math.max(13, Math.round(tilePx * 0.32))}px "Outfit", sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#1b1612';
        ctx.fillText(ft.text, worldX * tilePx + tilePx / 2 + 1, worldY * tilePx + tilePx * 0.3 - rise + 1);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, worldX * tilePx + tilePx / 2, worldY * tilePx + tilePx * 0.3 - rise);
        ctx.restore();
      });

      ctx.restore(); // end world translate

      // Atmospheric Day/Night Tint (High graphics uses offscreen light cutout mask!)
      if (dayNight.tintCss !== 'rgba(0,0,0,0)') {
        if (highGraphics && dayNight.nightFactor > 0.12) {
          let maskCanvas = nightMaskCanvasRef.current;
          if (!maskCanvas) {
            maskCanvas = document.createElement('canvas');
            nightMaskCanvasRef.current = maskCanvas;
          }
          if (maskCanvas.width !== w || maskCanvas.height !== h) {
            maskCanvas.width = w;
            maskCanvas.height = h;
          }
          const maskCtx = maskCanvas.getContext('2d');
          if (maskCtx) {
            drawNightMaskCutouts(
              maskCtx,
              w,
              h,
              offsetX,
              offsetY,
              tilePx,
              farmOriginPx,
              gameState,
              playerPos,
              dayNight.nightFactor,
              dayNight.tintCss,
              tick,
              now
            );
            ctx.drawImage(maskCanvas, 0, 0);
          } else {
            ctx.fillStyle = dayNight.tintCss;
            ctx.fillRect(0, 0, w, h);
          }
        } else {
          ctx.fillStyle = dayNight.tintCss;
          ctx.fillRect(0, 0, w, h);
        }
      }

      // Soft silvery-white full-moon sheen so night remains readable
      if (dayNight.moonGlowAlpha > 0.01) {
        const moonGrad = ctx.createRadialGradient(w * 0.82, h * 0.14, 10, w * 0.82, h * 0.14, Math.max(w, h) * 0.85);
        moonGrad.addColorStop(0, `rgba(224, 242, 254, ${(dayNight.moonGlowAlpha * 1.15).toFixed(3)})`);
        moonGrad.addColorStop(0.55, `rgba(191, 219, 254, ${(dayNight.moonGlowAlpha * 0.45).toFixed(3)})`);
        moonGrad.addColorStop(1, 'rgba(147, 197, 253, 0)');
        ctx.fillStyle = moonGrad;
        ctx.fillRect(0, 0, w, h);
      }

      // Warm handheld lamps & glowing farm lanterns punching softly through night darkness
      if (dayNight.nightFactor > 0.22) {
        ctx.save();
        ctx.translate(offsetX, offsetY);
        drawNightLightsOverlay(ctx, tilePx, farmOriginPx, gameState, playerPos, dayNight.nightFactor, tick, now);
        ctx.restore();
      }

      // Santa Claus & Reindeer sleigh flying high above night lighting (Winter Day 1, 20:00+)
      if (gameState.winterFestival?.santaSleigh?.active) {
        ctx.save();
        ctx.translate(offsetX, offsetY);
        drawSantaSleighFlyover(ctx, tilePx, gameState.winterFestival.santaSleigh, tick);
        ctx.restore();
      }

      // New Year's Eve Fireworks sparkling across the sky (Winter Day 2, 23:59+)
      if (gameState.winterFestival?.fireworks?.active) {
        drawNewYearFireworks(ctx, w, h, gameState.winterFestival.fireworks, tick, res.zoomScale);
      }

      // Dynamic Weather Particles
      const weather = gameState.weather;
      if (weather === 'rainy' || weather === 'stormy') {
        ctx.fillStyle = weather === 'stormy' ? 'rgba(147, 197, 253, 0.65)' : 'rgba(186, 230, 253, 0.55)';
        particlesRef.current.forEach((p) => {
          p.y = (p.y + p.speed * 3.2) % h;
          p.x = (p.x - p.speed * 0.6 + w) % w;
          ctx.fillRect(Math.floor(p.x), Math.floor(p.y), 2, Math.round(10 * res.zoomScale));
        });
      } else if (weather === 'frost') {
        ctx.fillStyle = 'rgba(248, 250, 252, 0.75)';
        particlesRef.current.forEach((p, idx) => {
          p.y = (p.y + p.speed * 0.6) % h;
          p.x = (p.x + Math.sin(tick * 0.02 + idx) * 0.8 + w) % w;
          const sz = Math.max(2, Math.round(p.size * res.zoomScale));
          ctx.fillRect(Math.floor(p.x), Math.floor(p.y), sz, sz);
        });
      } else if (weather === 'foggy') {
        ctx.fillStyle = 'rgba(226, 232, 240, 0.18)';
        ctx.fillRect(0, 0, w, h);
      } else if (weather === 'sunny' && dayNight.nightFactor < 0.35) {
        ctx.fillStyle = 'rgba(254, 240, 138, 0.28)';
        particlesRef.current.slice(0, 24).forEach((p, idx) => {
          p.y = (p.y + 0.35 + h) % h;
          p.x = (p.x + Math.cos(tick * 0.015 + idx) * 0.5 + w) % w;
          const sz = Math.max(2, Math.round(2 * res.zoomScale));
          ctx.fillRect(Math.floor(p.x), Math.floor(p.y), sz, sz);
        });
      }

      // Seasonal Ambient Nature Animations (always active per season!)
      const seasonNow = gameState.season;
      if (seasonNow === 'spring' && dayNight.nightFactor < 0.65) {
        // Drifting pink & white cherry blossoms in spring breeze
        particlesRef.current.slice(0, 28).forEach((p, idx) => {
          p.y = (p.y + p.speed * 0.35 + h) % h;
          p.x = (p.x + p.speed * 0.45 + Math.sin(tick * 0.03 + idx) * 0.6 + w) % w;
          const sz = Math.max(2, Math.round((2 + (idx % 2)) * res.zoomScale));
          ctx.fillStyle = idx % 3 === 0 ? 'rgba(253, 242, 248, 0.72)' : 'rgba(249, 168, 212, 0.68)';
          ctx.fillRect(Math.floor(p.x), Math.floor(p.y), sz + 1, sz);
        });
      } else if (seasonNow === 'summer' && weather !== 'sunny' && dayNight.nightFactor < 0.35) {
        // Warm golden pollen / summer sunbeams on clear summer days
        ctx.fillStyle = 'rgba(254, 240, 138, 0.24)';
        particlesRef.current.slice(0, 20).forEach((p, idx) => {
          p.y = (p.y + 0.25 + h) % h;
          p.x = (p.x + Math.cos(tick * 0.015 + idx) * 0.45 + w) % w;
          const sz = Math.max(2, Math.round(2 * res.zoomScale));
          ctx.fillRect(Math.floor(p.x), Math.floor(p.y), sz, sz);
        });
      } else if (seasonNow === 'autumn') {
        // Wind-blown golden, orange & crimson autumn leaves
        const leafColors = ['rgba(234, 88, 12, 0.76)', 'rgba(245, 158, 11, 0.78)', 'rgba(220, 38, 38, 0.7)', 'rgba(202, 138, 4, 0.75)'];
        particlesRef.current.slice(0, 34).forEach((p, idx) => {
          p.y = (p.y + p.speed * 0.45 + Math.sin(tick * 0.04 + idx) * 0.5 + h) % h;
          p.x = (p.x + p.speed * 0.85 + Math.cos(tick * 0.03 + idx) * 0.4 + w) % w;
          const sz = Math.max(3, Math.round((2.6 + (idx % 2)) * res.zoomScale));
          ctx.fillStyle = leafColors[idx % leafColors.length];
          ctx.fillRect(Math.floor(p.x), Math.floor(p.y), sz + 1, sz);
        });
      } else if (seasonNow === 'winter' && weather !== 'frost' && weather !== 'rainy' && weather !== 'stormy') {
        // Gentle winter snowfall throughout the winter season
        ctx.fillStyle = 'rgba(248, 250, 252, 0.65)';
        particlesRef.current.slice(0, 48).forEach((p, idx) => {
          p.y = (p.y + p.speed * 0.42) % h;
          p.x = (p.x + Math.sin(tick * 0.02 + idx) * 0.65 + w) % w;
          const sz = Math.max(2, Math.round(p.size * 0.85 * res.zoomScale));
          ctx.fillRect(Math.floor(p.x), Math.floor(p.y), sz, sz);
        });
      }

      // Gentle drifting pixel fireflies during clear full-moon evenings & nights
      if (dayNight.nightFactor > 0.35 && weather !== 'rainy' && weather !== 'stormy') {
        particlesRef.current.slice(0, 26).forEach((p, idx) => {
          p.y = (p.y - 0.28 + Math.sin(tick * 0.03 + idx) * 0.4 + h) % h;
          p.x = (p.x + Math.cos(tick * 0.022 + idx * 1.3) * 0.55 + w) % w;
          const pulse = 0.35 + 0.65 * Math.abs(Math.sin(tick * 0.06 + idx * 0.9));
          const sz = Math.max(2, Math.round(2.4 * res.zoomScale));
          ctx.fillStyle = `rgba(217, 249, 157, ${(pulse * dayNight.nightFactor * 0.8).toFixed(2)})`;
          ctx.fillRect(Math.floor(p.x), Math.floor(p.y), sz, sz);
        });
      }

      // 30s Gentle Psychedelic Screen Effect (dreamy pastel rainbow aurora + soft bokeh orbs, never overwhelming)
      const psyMs = gameState.mushroomEffect?.psychedelicRemainingMs ?? 0;
      if (psyMs > 0) {
        const fadeOut = psyMs < 2000 ? psyMs / 2000 : 1;
        const fadeIn = psyMs > 28500 ? (30000 - psyMs) / 1500 : 1;
        const strength = Math.max(0.05, Math.min(1, fadeOut * fadeIn));
        const baseHue = (tick * 1.6) % 360;

        // Soft drifting pastel gradient wash
        const grad = ctx.createRadialGradient(
          w * (0.5 + Math.sin(tick * 0.02) * 0.18),
          h * (0.5 + Math.cos(tick * 0.017) * 0.18),
          w * 0.08,
          w * 0.5,
          h * 0.5,
          Math.max(w, h) * 0.72
        );
        grad.addColorStop(0, `hsla(${baseHue}, 75%, 65%, ${(0.11 * strength).toFixed(3)})`);
        grad.addColorStop(0.5, `hsla(${(baseHue + 110) % 360}, 75%, 60%, ${(0.13 * strength).toFixed(3)})`);
        grad.addColorStop(1, `hsla(${(baseHue + 220) % 360}, 70%, 55%, ${(0.17 * strength).toFixed(3)})`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Soft floating dreamy bokeh bubbles
        for (let i = 0; i < 10; i++) {
          const bx = ((i * 211 + Math.sin(tick * 0.018 + i) * 75 + tick * 0.45) % (w + 80)) - 40;
          const by = ((i * 137 + Math.cos(tick * 0.015 + i * 1.4) * 65 + tick * 0.25) % (h + 80)) - 40;
          const br = (22 + (i % 4) * 14) * res.zoomScale;
          const hue = (baseHue + i * 36) % 360;
          ctx.fillStyle = `hsla(${hue}, 82%, 70%, ${(0.1 * strength).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(bx, by, br, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Floating Pixel Tool Icon right beside the mouse pointer!
      if (mouseCanvasRef.current && !isPanning) {
        const { cx, cy } = mouseCanvasRef.current;
        const iconScale = Math.max(2, Math.round(2.1 * res.zoomScale));
        const isActing = Date.now() < actionPulseUntilRef.current;
        const seedColor = CATALOG_BY_ID[gameState.selectedSeedId]?.pixelColor || '#4ade80';
        drawToolCursorIcon(
          ctx,
          Math.floor(cx + 10 * res.zoomScale),
          Math.floor(cy + 8 * res.zoomScale),
          movingDecoration ? 'move' : gameState.selectedTool,
          iconScale,
          tick,
          isActing,
          seedColor,
          gameState.wateringCanTier || 1
        );
      }

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [
    gameState,
    resolution,
    graphicsQuality,
    showGrid,
    floatingTexts,
    playerPos,
    hoverWorld,
    camera,
    res.zoomScale,
    fishingCast,
    ufoAbduction,
    movingDecoration,
    isPanning,
  ]);

  const pointerToWorld = (
    e: React.PointerEvent<HTMLCanvasElement>
  ): { wx: number; wy: number; fxExact: number; fyExact: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const cx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const cy = ((e.clientY - rect.top) / rect.height) * canvas.height;
    const { tilePx, offsetX, offsetY } = getBoardTransform(canvas.width, canvas.height);
    const fxExact = (cx - offsetX) / tilePx;
    const fyExact = (cy - offsetY) / tilePx;
    const wx = Math.floor(fxExact);
    const wy = Math.floor(fyExact);
    if (wx < -30 || wy < -17 || wx > WORLD_SIZE + 1 || wy >= WORLD_SIZE) return null;
    return { wx, wy, fxExact, fyExact };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const wpos = pointerToWorld(e);

    // Right-click (button 2) or Middle-click (button 1) pans the camera; short right-click on Pet/FlyAgaric interacts!
    if (e.button === 2 || e.button === 1) {
      e.preventDefault();
      let onPet = false;
      let onWorker = false;
      let onMerchant = false;
      let onFlyAgaric: { x: number; y: number } | null = null;
      if (e.button === 2 && wpos) {
        const fx = wpos.wx - WORLD_MARGIN;
        const fy = wpos.wy - WORLD_MARGIN;
        if (
          gameState.merchant?.active &&
          wpos.wx >= 12 &&
          wpos.wx <= 13 &&
          wpos.wy >= 24 &&
          wpos.wy <= 25
        ) {
          onMerchant = true;
        } else if (gameState.flyAgaricPos && fx === gameState.flyAgaricPos.x && fy === gameState.flyAgaricPos.y) {
          onFlyAgaric = { x: fx, y: fy };
        } else if ((gameState.workers || []).some((w) => Math.round(w.x) === fx && Math.round(w.y) === fy)) {
          onWorker = true;
        } else if (fx === Math.round(gameState.pet.x) && fy === Math.round(gameState.pet.y)) {
          onPet = true;
        }
      }
      rightClickOnFlyAgaricRef.current = onFlyAgaric;
      rightClickOnWorkerRef.current = onWorker;
      rightClickOnMerchantRef.current = onMerchant;
      rightClickOnPetRef.current = onPet;
      panMovedRef.current = false;
      setIsPanning(true);
      panStartRef.current = {
        clientX: e.clientX,
        clientY: e.clientY,
        camX: camera.x,
        camY: camera.y,
      };
      return;
    }

    if (e.button !== 0) return;
    if (!wpos) return;
    actionPulseUntilRef.current = Date.now() + 280;

    // If a fish is actively biting, clicking anywhere reels it in!
    if (fishingCast?.active && fishingCast.phase === 'biting') {
      onReelFishing();
      return;
    }

    // Clicking the Mailbox (4, 3) opens MailboxModal (requires walking close)!
    if (wpos.wx === 4 && wpos.wy === 3) {
      onMailboxClick();
      return;
    }

    // Clicking the Farmhouse opens HouseModal!
    if ((wpos.wx >= 1 && wpos.wx <= 3 && wpos.wy >= 0 && wpos.wy <= 3) || (wpos.wx === 4 && wpos.wy >= 0 && wpos.wy <= 2)) {
      onHouseClick();
      return;
    }

    // Clicking the Hofladen opens FarmShopModal!
    if (wpos.wx >= 1 && wpos.wx <= 2 && wpos.wy >= 4 && wpos.wy <= 6) {
      onShopClick();
      return;
    }

    // Clicking the Dorfplatz Noticeboard opens VillageBoardModal!
    if (wpos.wx === 12 && (wpos.wy === -8 || wpos.wy === -7)) {
      onVillageBoardClick();
      return;
    }

    // Clicking a Westviertel commercial or industrial building opens VillageBusinessModal!
    if (wpos.wy < 0) {
      const clickedBiz = VILLAGE_BUSINESSES.find(
        (vb) =>
          wpos.fxExact >= vb.x &&
          wpos.fxExact <= vb.x + vb.width &&
          wpos.fyExact >= vb.y &&
          wpos.fyExact <= vb.y + vb.height
      );
      if (clickedBiz) {
        onVillageBusinessClick(clickedBiz.id);
        return;
      }
    }

    // Clicking the burning village house or active fire truck opens the Fire Brigade emergency panel!
    if (gameState.villageFire?.active && wpos.wy < 0.2) {
      const fHouse = VILLAGE_HOUSE_BY_ID[gameState.villageFire.houseId];
      if (fHouse) {
        const inHouse =
          wpos.fxExact >= fHouse.x &&
          wpos.fxExact <= fHouse.x + fHouse.width &&
          wpos.fyExact >= fHouse.y &&
          wpos.fyExact <= fHouse.y + fHouse.height;
        const bSt = getFireBrigadeVisualState(gameState.villageFire, fHouse);
        const inTruck =
          bSt.phase !== 'outbreak' &&
          wpos.fxExact >= bSt.truckX - 0.25 &&
          wpos.fxExact <= bSt.truckX + 1.95 &&
          wpos.fyExact >= bSt.truckY - 0.25 &&
          wpos.fyExact <= bSt.truckY + 1.25;
        if (inHouse || inTruck) {
          onVillageFireClick();
          return;
        }
      }
    }

    // Clicking an ambient villager (village OR Abenteuerpark) triggers a friendly greeting bubble!
    if ((wpos.wy < 0.5 || wpos.fxExact < -0.5) && villageLifeRef.current) {
      const greeted = triggerVillageNpcGreeting(
        villageLifeRef.current,
        wpos.fxExact,
        wpos.fyExact,
        gameState.avatar.farmerName,
        gameState.season,
        gameState.weather,
        gameState.ingameMinutes,
        Date.now()
      );
      if (greeted) return;
    }

    // Clicking Abenteuerpark Sonnental opens ThemeParkModal!
    if (
      wpos.fxExact >= THEME_PARK_BOUNDS.x &&
      wpos.fxExact <= THEME_PARK_BOUNDS.x + THEME_PARK_BOUNDS.width &&
      wpos.fyExact >= THEME_PARK_BOUNDS.y &&
      wpos.fyExact <= THEME_PARK_BOUNDS.y + THEME_PARK_BOUNDS.height
    ) {
      onThemeParkClick();
      return;
    }

    // Clicking the Alte Waldmine entrance opens MineModal!
    if (wpos.wx >= 1 && wpos.wx <= 2 && wpos.wy >= 11 && wpos.wy <= 12) {
      onMineClick();
      return;
    }

    // Clicking Wandering Merchant Bruno at the bridge opens MerchantModal!
    if (gameState.merchant?.active && wpos.wx >= 12 && wpos.wx <= 13 && wpos.wy >= 24 && wpos.wy <= 25) {
      onMerchantClick();
      return;
    }

    // Clicking the East Riverbank water!
    if (wpos.wx === WORLD_SIZE - 2 && wpos.wy >= 2 && wpos.wy <= WORLD_SIZE - 2) {
      onRiverInteract(wpos.wx, wpos.wy);
      return;
    }

    const fx = wpos.wx - WORLD_MARGIN;
    const fy = wpos.wy - WORLD_MARGIN;
    if (fx < 0 || fy < 0 || fx >= GRID_SIZE || fy >= GRID_SIZE) return;

    // Left-click ALWAYS interacts with the tile underneath (Pet never blocks field actions!)
    setIsPainting(true);
    const tile = gameState.tiles[fy][fx];
    if (!tile.unlocked) {
      onExpandClick();
      return;
    }
    lastInteractedRef.current = `${fx},${fy}`;
    onTileInteract(fx, fy, false);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      mouseCanvasRef.current = {
        cx: ((e.clientX - rect.left) / rect.width) * canvas.width,
        cy: ((e.clientY - rect.top) / rect.height) * canvas.height,
      };
    }

    const panStart = panStartRef.current;
    if (isPanning && panStart) {
      const dx = e.clientX - panStart.clientX;
      const dy = e.clientY - panStart.clientY;
      if (Math.hypot(dx, dy) > 5) {
        panMovedRef.current = true;
      }
      const nextX = Math.max(-950, Math.min(2650, panStart.camX + dx));
      const nextY = Math.max(-750, Math.min(1350, panStart.camY + dy));
      setCamera((c) => ({
        ...c,
        x: nextX,
        y: nextY,
      }));
      return;
    }

    const wpos = pointerToWorld(e);
    setHoverWorld(wpos);

    if (isPainting && wpos && !movingDecoration) {
      const fx = wpos.wx - WORLD_MARGIN;
      const fy = wpos.wy - WORLD_MARGIN;
      if (fx >= 0 && fy >= 0 && fx < GRID_SIZE && fy < GRID_SIZE) {
        const key = `${fx},${fy}`;
        if (lastInteractedRef.current !== key && gameState.tiles[fy][fx].unlocked) {
          lastInteractedRef.current = key;
          actionPulseUntilRef.current = Date.now() + 220;
          onTileInteract(fx, fy, true);
        }
      }
    }
  };

  const handlePointerUp = (e?: React.PointerEvent<HTMLCanvasElement>) => {
    if (e && e.button === 2 && !panMovedRef.current) {
      if (movingDecoration) {
        onCancelMoveDecoration();
      } else if (rightClickOnMerchantRef.current) {
        onMerchantClick();
      } else if (rightClickOnFlyAgaricRef.current) {
        onFlyAgaricInteract(rightClickOnFlyAgaricRef.current.x, rightClickOnFlyAgaricRef.current.y);
      } else if (rightClickOnWorkerRef.current) {
        onWorkerClick();
      } else if (rightClickOnPetRef.current) {
        onPetClick();
      }
    }
    setIsPainting(false);
    setIsPanning(false);
    panStartRef.current = null;
    rightClickOnPetRef.current = false;
    rightClickOnWorkerRef.current = false;
    rightClickOnMerchantRef.current = false;
    rightClickOnFlyAgaricRef.current = null;
    panMovedRef.current = false;
    lastInteractedRef.current = null;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    setCamera((c) => ({
      ...c,
      zoom: Math.max(0.45, Math.min(1.85, Number((c.zoom + delta).toFixed(2)))),
    }));
  };

  const hoverFarmX = hoverWorld ? hoverWorld.wx - WORLD_MARGIN : -1;
  const hoverFarmY = hoverWorld ? hoverWorld.wy - WORLD_MARGIN : -1;
  const inFarm = hoverFarmX >= 0 && hoverFarmX < GRID_SIZE && hoverFarmY >= 0 && hoverFarmY < GRID_SIZE;
  const hoveredTileData = inFarm ? gameState.tiles[hoverFarmY][hoverFarmX] : null;
  const isHoverFlyAgaric =
    inFarm &&
    gameState.flyAgaricPos !== null &&
    gameState.flyAgaricPos.x === hoverFarmX &&
    gameState.flyAgaricPos.y === hoverFarmY;
  const hoverWinterGift = inFarm
    ? (gameState.winterFestival?.droppedGifts || []).find(
        (g) => g.x === hoverFarmX && g.y === hoverFarmY
      ) || null
    : null;
  const hoveredEntity = hoveredTileData?.entity || null;
  const hoveredWorker =
    inFarm
      ? (gameState.workers || []).find((w) => Math.round(w.x) === hoverFarmX && Math.round(w.y) === hoverFarmY) || null
      : null;
  const isWorkHoursNow =
    gameState.ingameMinutes >= WORKER_WORK_START_MIN && gameState.ingameMinutes < WORKER_WORK_END_MIN;
  const hoveredItem = hoveredEntity ? CATALOG_BY_ID[hoveredEntity.itemId] : null;
  const hoveredAnimalEnclosed =
    inFarm && hoveredEntity?.category === 'animal' && isRoamingAnimal(hoveredEntity.itemId)
      ? isAnimalEnclosed(gameState.tiles, hoverFarmX, hoverFarmY)
      : null;
  const protections = inFarm ? getTileProtections(gameState.tiles, hoverFarmX, hoverFarmY) : null;
  const isHoverHouse =
    hoverWorld !== null &&
    ((hoverWorld.wx >= 1 && hoverWorld.wx <= 3 && hoverWorld.wy >= 0 && hoverWorld.wy <= 3) ||
      (hoverWorld.wx === 4 && hoverWorld.wy >= 0 && hoverWorld.wy <= 2));
  const isHoverMailbox = hoverWorld !== null && hoverWorld.wx === 4 && hoverWorld.wy === 3;
  const isHoverShop =
    hoverWorld !== null && hoverWorld.wx >= 1 && hoverWorld.wx <= 2 && hoverWorld.wy >= 4 && hoverWorld.wy <= 6;
  const isHoverVillageBoard =
    hoverWorld !== null && hoverWorld.wx === 12 && (hoverWorld.wy === -8 || hoverWorld.wy === -7);
  const isHoverMine =
    hoverWorld !== null && hoverWorld.wx >= 1 && hoverWorld.wx <= 2 && hoverWorld.wy >= 11 && hoverWorld.wy <= 12;
  const totalShopStock = Object.values(gameState.farmShop?.stock || {}).reduce((a, b) => a + b, 0);
  const openBoardCount = (gameState.villageBoard?.orders || []).filter((o) => !o.completed).length;
  const isHoverMerchant =
    Boolean(gameState.merchant?.active) &&
    hoverWorld !== null &&
    hoverWorld.wx >= 12 &&
    hoverWorld.wx <= 13 &&
    hoverWorld.wy >= 24 &&
    hoverWorld.wy <= 25;
  const isHoverEastRiver =
    hoverWorld !== null &&
    hoverWorld.wx === WORLD_SIZE - 2 &&
    hoverWorld.wy >= 2 &&
    hoverWorld.wy <= WORLD_SIZE - 2;
  const hoveredRegion = isHoverEastRiver && hoverWorld ? getRiverRegionForWy(hoverWorld.wy) : null;
  const hoveredDensity = hoveredRegion ? gameState.fishing.regionDensity[hoveredRegion] : null;
  const hoveredDensityMeta = hoveredDensity ? FISH_DENSITY_META[hoveredDensity] : null;
  const activeFireHouseObj = gameState.villageFire?.active
    ? VILLAGE_HOUSE_BY_ID[gameState.villageFire.houseId] || null
    : null;
  const activeFireBrigade =
    gameState.villageFire?.active && activeFireHouseObj
      ? getFireBrigadeVisualState(gameState.villageFire, activeFireHouseObj)
      : null;
  const isHoverFireTruck = Boolean(
    activeFireBrigade &&
      activeFireBrigade.phase !== 'outbreak' &&
      hoverWorld &&
      hoverWorld.fxExact >= activeFireBrigade.truckX - 0.2 &&
      hoverWorld.fxExact <= activeFireBrigade.truckX + 1.9 &&
      hoverWorld.fyExact >= activeFireBrigade.truckY - 0.2 &&
      hoverWorld.fyExact <= activeFireBrigade.truckY + 1.2
  );
  const hoveredBusiness: VillageBusinessSpec | null =
    hoverWorld && hoverWorld.wy < 0
      ? VILLAGE_BUSINESSES.find(
          (vb) =>
            hoverWorld.fxExact >= vb.x &&
            hoverWorld.fxExact <= vb.x + vb.width &&
            hoverWorld.fyExact >= vb.y &&
            hoverWorld.fyExact <= vb.y + vb.height
        ) || null
      : null;
  const hoveredVillageHouse =
    hoverWorld && hoverWorld.wy < 0
      ? VILLAGE_HOUSES.find(
          (vh) =>
            hoverWorld.fxExact >= vh.x &&
            hoverWorld.fxExact <= vh.x + vh.width &&
            hoverWorld.fyExact >= vh.y &&
            hoverWorld.fyExact <= vh.y + vh.height
        ) || null
      : null;
  const hoveredVillageResidents = hoveredVillageHouse ? getResidentsForHouse(hoveredVillageHouse.id) : [];
  const isHoverThemePark =
    hoverWorld !== null &&
    hoverWorld.fxExact >= THEME_PARK_BOUNDS.x &&
    hoverWorld.fxExact <= THEME_PARK_BOUNDS.x + THEME_PARK_BOUNDS.width &&
    hoverWorld.fyExact >= THEME_PARK_BOUNDS.y &&
    hoverWorld.fyExact <= THEME_PARK_BOUNDS.y + THEME_PARK_BOUNDS.height;
  const hoveredVillageNpc: VillageAmbientNpc | null =
    hoverWorld && (hoverWorld.wy < 0.5 || hoverWorld.fxExact < -0.5) && villageLifeRef.current
      ? villageLifeRef.current.npcs.find(
          (n) => Math.hypot(n.x - hoverWorld.fxExact, n.y - hoverWorld.fyExact) < 0.72
        ) || null
      : null;

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-[#1b1612] overflow-hidden">
      <canvas
        ref={canvasRef}
        width={res.width}
        height={res.height}
        onContextMenu={(e) => e.preventDefault()}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => {
          mouseCanvasRef.current = null;
          setHoverWorld(null);
          handlePointerUp();
        }}
        onWheel={handleWheel}
        className={`w-full h-full object-contain pixelated touch-none ${
          isPanning ? 'cursor-grabbing' : 'cursor-crosshair'
        }`}
      />

      {/* Active Decoration Move Banner */}
      {movingDecoration && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-[#faf6ee]/95 border-2 border-[#4a321f] rounded-xl px-4 py-2.5 shadow-xl text-[#2b2118]">
          <Move className="w-5 h-5 text-sky-600 shrink-0" />
          <div className="text-xs">
            <div className="font-display font-bold text-sm">
              „{CATALOG_BY_ID[movingDecoration.itemId]?.name || 'Dekoobjekt'}“ verschieben
            </div>
            <div className="text-[#5c4632]">
              Klicke auf ein freies Hof-Feld zum Absetzen (Rechtsklick oder ESC zum Abbrechen).
            </div>
          </div>
          <button
            onClick={onCancelMoveDecoration}
            className="px-3 py-1.5 rounded-lg bg-[#efe6d5] hover:bg-[#e3d5be] border border-[#cbb799] text-[#2b2118] text-xs font-bold whitespace-nowrap"
          >
            Abbrechen
          </button>
        </div>
      )}

      {/* Active Fishing Bite / Waiting Banner */}
      {fishingCast?.active && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-[#faf6ee]/95 border-2 border-[#4a321f] rounded-xl px-4 py-2.5 shadow-xl text-[#2b2118]">
          <Fish className={`w-5 h-5 ${fishingCast.phase === 'biting' ? 'text-rose-600 animate-bounce' : 'text-sky-600'}`} />
          <div className="text-xs">
            <div className="font-display font-bold text-sm">
              {fishingCast.phase === 'biting'
                ? 'Es beißt an! Jetzt einholen!'
                : `Angel ausgeworfen (${FISHING_REGION_LABELS[fishingCast.region]})`}
            </div>
            <div className="text-[#5c4632]">
              {fishingCast.phase === 'biting'
                ? 'Drücke [Leertaste] oder klicke hier zum Einholen!'
                : 'Warte ruhig auf einen Biss am Schwimmer...'}
            </div>
          </div>
          {fishingCast.phase === 'biting' && (
            <button
              onClick={onReelFishing}
              className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold whitespace-nowrap"
            >
              Einholen!
            </button>
          )}
        </div>
      )}

      {/* Camera Recenter & Controls Hint */}
      <div className="absolute right-4 bottom-24 z-10 flex items-center gap-2">
        <span className="hidden lg:inline text-[11px] bg-[#faf6ee]/90 border border-[#6e4a2e] text-[#4a321f] px-2.5 py-1.5 rounded-lg font-medium">
          WASD: Laufen · Leertaste: Über Zäune springen · Rechtsklick + Ziehen: Kamera
        </span>
        <button
          onClick={() => setCamera({ x: 0, y: 0, zoom: 1.0 })}
          title="Kamera auf Hof zentrieren"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#faf6ee]/95 border border-[#6e4a2e] text-[#2b2118] text-xs font-semibold hover:bg-[#efe6d5] shadow"
        >
          <LocateFixed className="w-3.5 h-3.5" />
          <span>Zentrieren</span>
        </button>
      </div>

      {/* Contextual Inspector */}
      {showTimers && (isHoverHouse || isHoverMailbox || isHoverShop || isHoverVillageBoard || isHoverMine || isHoverMerchant || isHoverEastRiver || hoveredBusiness || isHoverThemePark || hoveredVillageHouse || hoveredVillageNpc || isHoverFireTruck || hoveredWorker || hoveredTileData) && (
        <div className="pointer-events-none absolute left-4 bottom-24 z-10 bg-[#faf6ee]/95 border-2 border-[#6e4a2e] rounded-lg px-3.5 py-2.5 shadow-lg text-[#2b2118] max-w-xs space-y-2">
          {hoveredWorker && (
            <div className="text-xs border-b border-[#d6c7ae] pb-1.5 space-y-0.5">
              <div className="font-display font-bold text-sm flex items-center justify-between gap-2">
                <span>
                  {hoveredWorker.name} (Lvl {hoveredWorker.level})
                </span>
                <span
                  className={`text-[11px] font-bold ${
                    hoveredWorker.onStrike
                      ? 'text-rose-700'
                      : !isWorkHoursNow
                      ? 'text-indigo-700'
                      : 'text-emerald-700'
                  }`}
                >
                  {hoveredWorker.onStrike ? 'Streik!' : !isWorkHoursNow ? 'Nachtruhe' : 'Arbeitet'}
                </span>
              </div>
              <div className="text-[#5c4632]">
                {WORKER_ROLES[hoveredWorker.role].title} · {hoveredWorker.lastActionText}
              </div>
              <div className="text-[11px] text-[#6e4a2e] font-semibold">Rechtsklick: Personal verwalten</div>
            </div>
          )}
          {isHoverVillageBoard ? (
            <div className="text-xs space-y-1">
              <div className="font-display font-bold text-sm text-[#4a321f]">
                Schwarzes Brett am Dorfplatz
              </div>
              <div className="text-[#5c4632]">
                Offene Dorf-Bestellungen heute: <strong className="font-mono-num">{openBoardCount}/3</strong>
              </div>
              <div className="text-[11px] text-emerald-800 font-semibold">
                +48 % Bonus-Erlös &amp; Hofladen-Ruf · Klicken zum Öffnen!
              </div>
            </div>
          ) : isHoverMine ? (
            <div className="text-xs space-y-1">
              <div className="font-display font-bold text-sm text-[#262b38]">
                Alte Waldmine &amp; Kristallhöhle
              </div>
              <div className="text-[#5c4632] font-mono-num">
                Ebene {gameState.mine?.currentFloor ?? 1} (Rekord {gameState.mine?.unlockedFloor ?? 1}) · Ausdauer {gameState.mine?.stamina ?? 28}/{gameState.mine?.maxStamina ?? 28}
              </div>
              <div className="text-[11px] text-sky-800 font-semibold">
                Erze abbauen, Relikte entdecken &amp; Sprinkler schmieden · Klicken!
              </div>
            </div>
          ) : hoveredVillageNpc ? (
            <div className="text-xs space-y-1">
              <div className="font-display font-bold text-sm text-[#4a321f]">
                {hoveredVillageNpc.name} (Dorfbewohner)
              </div>
              <div className="text-[#5c4632]">
                {hoveredVillageNpc.activity === 'sit_bench'
                  ? 'Ruht sich gemütlich am Dorfbrunnen aus.'
                  : hoveredVillageNpc.activity === 'chat_plaza'
                  ? 'Unterhält sich auf dem Dorfplatz.'
                  : hoveredVillageNpc.activity === 'visit_shop'
                  ? 'Erledigt Einkäufe im Dorf & Westviertel.'
                  : hoveredVillageNpc.activity === 'work_shift'
                  ? 'Auf dem Weg zur Schicht im Betrieb.'
                  : hoveredVillageNpc.activity === 'visit_park'
                  ? 'Vergnügt sich im Abenteuerpark Sonnental.'
                  : hoveredVillageNpc.activity === 'chore_yard'
                  ? 'Pflegt den eigenen Vorgarten.'
                  : 'Spaziert durch Sonnental.'}
              </div>
              <div className="text-[11px] text-emerald-800 font-semibold">
                Hin­laufen oder anklicken zum Grüßen!
              </div>
            </div>
          ) : isHoverThemePark ? (
            (() => {
              const parkMetrics = getThemeParkMetrics(gameState.themePark);
              const todayEarnPark = gameState.themePark?.todayEarned || 0;
              const parkBroken = gameState.themePark?.breakdown;
              return (
                <div className="text-xs space-y-1">
                  <div className="font-display font-bold text-sm text-[#4a321f] flex items-center justify-between gap-2">
                    <span>Abenteuerpark Sonnental</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        parkBroken
                          ? 'bg-rose-100 text-rose-800'
                          : parkMetrics.owned
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {parkBroken
                        ? 'Störung!'
                        : parkMetrics.owned
                        ? `${parkMetrics.attractionCount}/${THEME_PARK_ATTRACTIONS.length} Attraktionen`
                        : `Ab Lvl ${THEME_PARK_UNLOCK_LEVEL}`}
                    </span>
                  </div>
                  <div className="text-[#5c4632] font-mono-num text-[11px]">
                    {parkBroken
                      ? `${parkBroken.reason} · Reparatur: ${parkBroken.repairCost.toLocaleString('de-DE')} M`
                      : parkMetrics.owned
                      ? `Heute: +${todayEarnPark.toLocaleString('de-DE')} M · Hofladen +${parkMetrics.shopVisitorBonus} Besucher`
                      : `Grundpark: ${THEME_PARK_BASE_COST.toLocaleString('de-DE')} M · +${THEME_PARK_ATTRACTIONS.length} Attraktionen erweiterbar`}
                  </div>
                  <div className={`text-[11px] font-semibold ${parkBroken ? 'text-rose-700' : 'text-emerald-800'}`}>
                    {parkBroken
                      ? 'Betrieb pausiert · Klicken zum Reparieren!'
                      : `Klicken für ${parkMetrics.owned ? 'Ausbauten & Einnahmen' : 'Details & Kauf'}!`}
                  </div>
                </div>
              );
            })()
          ) : hoveredBusiness ? (
            (() => {
              const isOwnedBiz = (gameState.villageBusinesses?.ownedIds || []).includes(hoveredBusiness.id);
              const todayEarn = gameState.villageBusinesses?.todayEarnedById?.[hoveredBusiness.id] || 0;
              const brokenBiz = isOwnedBiz ? gameState.villageBusinesses?.brokenById?.[hoveredBusiness.id] : undefined;
              return (
                <div className="text-xs space-y-1">
                  <div className="font-display font-bold text-sm text-[#4a321f] flex items-center justify-between gap-2">
                    <span>{hoveredBusiness.name}</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        brokenBiz
                          ? 'bg-rose-100 text-rose-800'
                          : isOwnedBiz
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {brokenBiz ? 'Störung!' : isOwnedBiz ? 'In deinem Besitz' : `Ab Lvl ${hoveredBusiness.minLevel}`}
                    </span>
                  </div>
                  <div className="text-[#5c4632]">
                    {hoveredBusiness.categoryLabel} · {hoveredBusiness.workforceShareLabel}
                  </div>
                  <div className="text-[#4a321f] font-mono-num text-[11px]">
                    {brokenBiz
                      ? `${brokenBiz.reason} · Reparatur: ${brokenBiz.repairCost.toLocaleString('de-DE')} M`
                      : isOwnedBiz
                      ? `Gewinn heute: +${todayEarn.toLocaleString('de-DE')} M (${hoveredBusiness.dailyProfitRangeLabel})`
                      : `Kaufpreis: ${hoveredBusiness.purchaseCost.toLocaleString('de-DE')} M · Ertrag: ${hoveredBusiness.dailyProfitRangeLabel}`}
                  </div>
                  <div className={`text-[11px] font-semibold ${brokenBiz ? 'text-rose-700' : 'text-emerald-800'}`}>
                    {brokenBiz
                      ? 'Ausschüttung pausiert · Klicken zum Reparieren!'
                      : `Klicken für Details${isOwnedBiz ? ' & Gewinn-Übersicht' : ' & Kauf'}!`}
                  </div>
                </div>
              );
            })()
          ) : (isHoverFireTruck && activeFireHouseObj && gameState.villageFire?.active) ||
            (hoveredVillageHouse && gameState.villageFire?.active && hoveredVillageHouse.id === gameState.villageFire.houseId) ? (
            <div className="text-xs space-y-1">
              <div className="font-display font-bold text-sm text-rose-800">
                Feuerwehreinsatz: {gameState.villageFire.houseName}
              </div>
              <div className="text-[#5c4632]">
                Verdacht: <strong>{gameState.villageFire.causeTitle}</strong> · Restzeit{' '}
                <strong className="font-mono-num">{formatDurationMs(gameState.villageFire.remainingMs)}</strong>
              </div>
              <div className="text-[11px] text-rose-700 font-semibold">
                Bewohner können während des Brandes nicht einkaufen! · Klicken zum Helfen!
              </div>
            </div>
          ) : hoveredVillageHouse ? (
            <div className="text-xs space-y-1">
              <div className="font-display font-bold text-sm text-[#4a321f]">
                {hoveredVillageHouse.name} (Dorfhaus)
              </div>
              <div className="text-[#5c4632]">
                Bewohner ({hoveredVillageResidents.length}):{' '}
                <strong className="text-[#2b2118]">
                  {hoveredVillageResidents.map((r) => r.name).join(', ')}
                </strong>
              </div>
              {gameState.villageFire?.sootHouseId === hoveredVillageHouse.id && (
                <div className="text-[11px] text-amber-800 font-semibold">
                  Frische Rußspuren vom letzten Feuerwehreinsatz – alles rechtzeitig gelöscht!
                </div>
              )}
            </div>
          ) : isHoverMailbox ? (
            <div className="text-xs space-y-1">
              <div className="font-display font-bold text-sm text-amber-900">Hof-Briefkasten</div>
              {gameState.mailbox?.pendingMail ? (
                <div className="text-emerald-800 font-semibold">
                  Neue Tagespost &amp; Belohnungen liegen bereit! Hinlaufen &amp; klicken zum Entnehmen.
                </div>
              ) : (
                <div className="text-[#5c4632]">
                  Tägliche Post &amp; „Sonnentaler Tagesblatt“ kommen um 10:00 Uhr. Hinlaufen &amp; klicken für Zeitungs-Archiv!
                </div>
              )}
            </div>
          ) : isHoverHouse ? (
            <div className="text-xs">
              <div className="font-display font-bold text-sm">Dein Bauernhaus ({gameState.house.floors}. Etage)</div>
              <div className="text-[#5c4632] mt-0.5">
                Klicken, um Etagen und Hof-Extras auszubauen.
              </div>
            </div>
          ) : isHoverShop ? (
            <div className="text-xs space-y-1">
              <div className="font-display font-bold text-sm text-amber-900">Hofladen (Direktverkauf)</div>
              <div className="text-[#5c4632]">
                Besucher heute: <strong className="font-mono-num">{gameState.farmShop.visitorsToday} / {gameState.farmShop.dailyTargetVisitors}</strong> · Im Regal: <strong className="font-mono-num">{totalShopStock}</strong>
              </div>
              <div className="text-[11px] text-emerald-800 font-semibold">
                +15 % Direktbonus auf veredelte Produkte · Klicken zum Bestücken!
              </div>
            </div>
          ) : isHoverMerchant ? (
            <div className="text-xs space-y-1">
              <div className="font-display font-bold text-sm text-amber-800">
                Wanderhändler Bruno (Brücke)
              </div>
              <div className="text-[#5c4632]">
                Seltene Deko, Profi-Angelköder, Wachstums-Elixier &amp; Tauschhandel. Klicken zum Öffnen!
              </div>
              <div className="font-mono-num text-[11px] text-amber-900 font-semibold">
                Bleibt noch: {formatDurationMs(gameState.merchant.remainingMs)}
              </div>
            </div>
          ) : isHoverEastRiver && hoveredRegion && hoveredDensityMeta ? (
            <div className="text-xs space-y-1">
              <div className="font-display font-bold text-sm flex items-center gap-2">
                <Fish className="w-4 h-4 text-sky-600" />
                <span>{FISHING_REGION_LABELS[hoveredRegion]}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: hoveredDensityMeta.color }} />
                <span className="font-semibold">{hoveredDensityMeta.label}</span>
              </div>
              <div className="text-[#5c4632] font-mono-num">
                {gameState.level < FISHING_UNLOCK_LEVEL
                  ? `Angeln wird ab Hof-Level ${FISHING_UNLOCK_LEVEL} freigeschaltet.`
                  : `Angel-Level ${gameState.fishing.level} (${gameState.fishing.xp}/${fishingXpRequiredForLevel(gameState.fishing.level)} XP) · Lauft ans Ufer & klickt ins Wasser!`}
              </div>
            </div>
          ) : hoveredTileData && !hoveredTileData.unlocked ? (
            <div className="text-xs">
              <div className="font-display font-bold text-sm">
                Gesperrtes Land ({hoverFarmX + 1},{hoverFarmY + 1})
              </div>
              <div className="text-[#6e4a2e] mt-0.5">Klicken, um Hoferweiterung anzusehen.</div>
            </div>
          ) : hoveredItem && hoveredEntity ? (
            <div className="text-xs space-y-1">
              <div className="font-display font-bold text-sm flex items-center justify-between gap-3">
                <span>{hoveredItem.name}</span>
                <span
                  className={`font-mono-num text-xs ${
                    hoveredEntity.withered ? 'text-rose-700 font-bold' : 'text-emerald-700'
                  }`}
                >
                  {hoveredEntity.withered
                    ? 'Verdorrt!'
                    : hoveredEntity.damaged
                    ? 'Beschädigt'
                    : hoveredEntity.ready
                    ? hoveredEntity.category === 'meat'
                      ? 'Abholbereit!'
                      : hoveredEntity.category === 'tree'
                      ? 'Fruchtreif!'
                      : 'Erntebereit!'
                    : hoveredItem.growthMs > 0
                    ? formatDurationMs(hoveredItem.growthMs - hoveredEntity.progressMs)
                    : 'Deko'}
                </span>
              </div>
              <div className="text-[#5c4632] flex flex-wrap gap-x-2">
                {hoveredEntity.withered ? (
                  <span className="text-rose-800">
                    Verdorrt wegen Trockenheit. Klicken zum Entfernen — danach neu hacken!
                  </span>
                ) : (
                  hoveredTileData?.ground === 'tilled' && (
                    <span>
                      {protections?.sprinklered
                        ? 'Sprinkler-feucht'
                        : hoveredTileData?.watered
                        ? `Feucht (${formatDurationMs(hoveredTileData.wateredRemainingMs ?? MAX_MOISTURE_MS)})`
                        : (hoveredEntity.category === 'crop' || hoveredEntity.category === 'mushroom') &&
                          gameState.level >= 6
                        ? `Trocken (verdorrt in ${formatDurationMs(
                            Math.max(
                              0,
                              (hoveredEntity.category === 'mushroom' ? WITHER_MUSHROOM_DRY_MS : WITHER_CROP_DRY_MS) -
                                (hoveredTileData.dryMs ?? 0)
                            )
                          )})`
                        : 'Trocken (langsamer)'}
                    </span>
                  )
                )}
                {hoveredEntity.category === 'tree' && (
                  <span className="text-emerald-800">
                    Mehrjähriger Obstbaum (+{hoveredItem.charmPoints ?? 0} Charme · Ernten: {hoveredEntity.harvestCount})
                  </span>
                )}
                {hoveredEntity.category === 'meat' && (
                  <span className="text-rose-800 font-semibold">
                    Luxus-Fleisch ({hoveredItem.sellPrice} M) · Klicken zum Einsammeln!
                    {hoveredEntity.meatDropFromAnimalId && CATALOG_BY_ID[hoveredEntity.meatDropFromAnimalId]
                      ? ` (Von ${CATALOG_BY_ID[hoveredEntity.meatDropFromAnimalId].name})`
                      : ''}
                  </span>
                )}
                {hoveredEntity.category === 'animal' && isLivestockAnimal(hoveredEntity.itemId) && (() => {
                  const totalLife = hoveredEntity.lifespanMs ?? ANIMAL_AVG_LIFESPAN_MS;
                  const age = hoveredEntity.ageMs ?? 0;
                  const ratio = totalLife > 0 ? age / totalLife : 0;
                  const remainingLife = Math.max(0, totalLife - age);
                  const stageLabel = ratio < 0.28 ? 'Jungtier' : ratio < 0.8 ? 'Ausgewachsen' : 'Senior (bald Fleischertrag)';
                  return (
                    <span className={ratio >= 0.8 ? 'text-amber-800 font-semibold' : 'text-[#5c4632]'}>
                      {stageLabel} · noch {formatDurationMs(remainingLife)}
                    </span>
                  );
                })()}
                {hoveredAnimalEnclosed !== null && (
                  <span className={hoveredAnimalEnclosed ? 'text-emerald-700 font-semibold' : 'text-amber-700 font-semibold'}>
                    {hoveredAnimalEnclosed ? 'Eingezäunt (Gehege)' : 'Freilaufend'}
                  </span>
                )}
                {hoveredEntity.category === 'decoration' && (
                  <span>
                    {ARTISAN_STATION_IDS.has(hoveredEntity.itemId)
                      ? 'Klicken: Veredeln · [8] Verschieben · [6] Einpacken'
                      : isFenceLike(hoveredEntity.itemId)
                      ? 'Verbindet sich in 4 Richtungen · Klicken zum Verschieben · [6] Einpacken'
                      : 'Klicken (Hand/Verschieben) zum Umsetzen · [6] Einpacken'}
                  </span>
                )}
                {hoveredTileData?.enriched && <span>· Nährstoffreich (+50%)</span>}
                {protections?.greenhoused && (
                  <span className="text-emerald-800 font-semibold">· Winter-Gewächshaus (+25% &amp; Winterfest)</span>
                )}
                {protections?.shielded && !protections?.greenhoused && <span>· Geschützt</span>}
                {protections?.speedBoosted && <span>· Windmühle (+20%)</span>}
              </div>
            </div>
          ) : hoverWinterGift ? (
            <div className="text-xs space-y-1">
              <div className="font-display font-bold text-sm text-rose-700">
                Weihnachtsgeschenk vom Weihnachtsmann!
              </div>
              <div className="text-[#5c4632] leading-snug">
                Klicken, um das Paket auszupacken und eine exklusive <strong>Weihnachts-Deko</strong> fürs Bau-Menü zu erhalten!
              </div>
            </div>
          ) : isHoverFlyAgaric ? (
            <div className="text-xs space-y-1">
              <div className="font-display font-bold text-sm text-rose-700">Wilder Fliegenpilz (Selten!)</div>
              <div className="text-[#5c4632] leading-snug">
                Laufe hin und mache einen <strong>Rechtsklick</strong>, um ihn zu essen: 30s Traum-Effekt, danach <strong>15 Min. besseres Angeln &amp; +20 % mehr Ernte/Fische</strong>!
              </div>
            </div>
          ) : hoveredTileData ? (
            <div className="text-xs">
              <div className="font-display font-bold text-sm">
                {hoveredTileData.ground === 'tilled'
                  ? 'Ackerboden'
                  : hoveredTileData.ground === 'path'
                  ? 'Hofweg'
                  : 'Wiese'}
              </div>
              <div className="text-[#5c4632] mt-0.5">
                {hoveredTileData.ground === 'tilled'
                  ? protections?.sprinklered
                    ? 'Sprinkler-feucht'
                    : hoveredTileData.watered
                    ? `Feucht (${formatDurationMs(hoveredTileData.wateredRemainingMs ?? MAX_MOISTURE_MS)})`
                    : gameState.level >= 3
                    ? `Brach (wird Weideland in ${formatDurationMs(
                        Math.max(0, IDLE_TILLED_REVERT_MS - (hoveredTileData.idleTilledMs ?? 0))
                      )})`
                    : 'Trocken'
                  : 'Mit Hacke [2] ackern oder Tier/Deko setzen'}
                {hoveredTileData.enriched ? ' · Nährstoffreich (+50%)' : ''}
                {protections?.greenhoused ? ' · Winter-Gewächshaus (+25% & Winterfest)' : ''}
                {protections?.shielded && !protections?.greenhoused ? ' · Geschützt' : ''}
                {protections?.speedBoosted ? ' · Windmühle (+20%)' : ''}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
