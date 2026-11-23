import {
  VILLAGE_BUSINESS_BY_ID,
  VILLAGE_HOUSE_BY_ID,
  VILLAGE_HOUSES,
  VILLAGE_RESIDENTS,
  VillageHouse,
  VillageResident,
  Waypoint,
} from '../data/village';
import { THEME_PARK_BOUNDS } from '../data/themePark';
import { PlayerPosition, Season, ThemeParkAttractionId, WeatherType } from '../types/game';

export type VillageNpcActivity =
  | 'stroll'
  | 'chat_plaza'
  | 'sit_bench'
  | 'chore_yard'
  | 'visit_shop'
  | 'work_shift'
  | 'visit_park'
  | 'go_home';

export type ChatBubbleIcon = 'talk' | 'laugh' | 'heart' | 'bread' | 'weather';

export interface VillageAmbientNpc {
  residentId: string;
  name: string;
  shirtColor: string;
  hairColor: string;
  skinTone: string;
  hatColor?: string;
  umbrellaColor: string;
  homeHouseId: string;
  x: number;
  y: number;
  facing: 'left' | 'right' | 'up' | 'down';
  activity: VillageNpcActivity;
  waypoints: Waypoint[];
  waypointIdx: number;
  speed: number;
  pauseMs: number;
  choreKind?: 'sweep' | 'water';
  benchIndex?: 0 | 1;
  chatIcon?: ChatBubbleIcon;
  greetingText?: string;
  greetingUntilMs?: number;
  lastGreetedAtMs?: number;
  wavingUntilMs?: number;
}

export interface VillageCat {
  id: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  furColor: string;
  accentColor: string;
  pauseMs: number;
  facing: 'left' | 'right';
}

export interface VillageBird {
  id: string;
  homeX: number;
  homeY: number;
  x: number;
  y: number;
  hopPhase: number;
  color: string;
  flyingUntilMs: number;
  flyDx: number;
  flyDy: number;
}

export interface VillageButterfly {
  id: string;
  anchorX: number;
  anchorY: number;
  x: number;
  y: number;
  phase: number;
  color: string;
}

export interface VillageVehicle {
  id: string;
  kind: 'bicycle' | 'cart';
  x: number;
  y: number;
  dir: 1 | -1;
  streetY: number;
  speed: number;
  pauseMs: number;
  riderColor: string;
}

export interface VillageLifeState {
  initialized: boolean;
  npcs: VillageAmbientNpc[];
  cats: VillageCat[];
  birds: VillageBird[];
  butterflies: VillageButterfly[];
  vehicles: VillageVehicle[];
  spawnCooldownMs: number;
}

export const VILLAGE_BENCH_SPOTS: ReadonlyArray<{ x: number; y: number; seatX: number; seatY: number }> = [
  { x: 12.15, y: -6.18, seatX: 12.52, seatY: -6.22 },
  { x: 14.85, y: -6.18, seatX: 15.22, seatY: -6.22 },
];

export const VILLAGE_FIREBOWL_SPOT = { wx: 14.95, wy: -7.75 };

const UMBRELLA_COLORS = ['#ef4444', '#2563eb', '#eab308', '#10b981', '#a855f7', '#ec4899'];
const STREET_YS = [-12.0, -7.0, -2.0];
const LANE_XS = [-25.0, -18.8, -13.5, -7.5, -0.5, 2.0, 7.5, 13.5, 20.0, 25.0];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function nearestLaneX(x: number): number {
  let best = LANE_XS[0];
  let bestDist = Math.abs(x - best);
  for (const lx of LANE_XS) {
    const d = Math.abs(x - lx);
    if (d < bestDist) {
      best = lx;
      bestDist = d;
    }
  }
  return best;
}

function buildVillageRoadRoute(
  fromX: number,
  fromY: number,
  fromStreetY: number,
  toX: number,
  toY: number,
  toStreetY: number
): Waypoint[] {
  const laneOff = (Math.random() - 0.5) * 0.28;
  const s1 = Number((fromStreetY + laneOff).toFixed(2));
  const s2 = Number((toStreetY + laneOff).toFixed(2));
  const pts: Waypoint[] = [];
  if (fromY > 0.2) {
    // Exiting Theme Park cleanly via North Gate promenade
    pts.push({ x: Number((THEME_PARK_BOUNDS.northGateX + laneOff * 0.4).toFixed(2)), y: 1.5 });
    pts.push({ x: Number((THEME_PARK_BOUNDS.northGateX + laneOff * 0.4).toFixed(2)), y: -2.0 });
  } else if (Math.abs(fromY - s1) > 0.15) {
    pts.push({ x: Number(fromX.toFixed(2)), y: s1 });
  }
  const effectiveStartStreet = fromY > 0.2 ? -2.0 : s1;
  if (Math.abs(effectiveStartStreet - s2) > 0.25) {
    const laneX = Number((nearestLaneX((fromX + toX) * 0.5) + laneOff * 0.6).toFixed(2));
    pts.push({ x: laneX, y: effectiveStartStreet });
    pts.push({ x: laneX, y: s2 });
  }
  pts.push({ x: Number(toX.toFixed(2)), y: s2 });
  if (Math.abs(toY - s2) > 0.15) {
    pts.push({ x: Number(toX.toFixed(2)), y: Number(toY.toFixed(2)) });
  }
  return pts;
}

function getDesiredAmbientNpcCount(
  ingameMinutes: number,
  weather: WeatherType,
  themeParkOwned = false,
  parkAttractionCount = 0
): number {
  const isStorm = weather === 'stormy';
  let base = 18;
  if (ingameMinutes >= 360 && ingameMinutes < 720) {
    base = 21; // morning shift & bustle
  } else if (ingameMinutes >= 720 && ingameMinutes < 1080) {
    base = 22; // lively afternoon across village & west district
  } else if (ingameMinutes >= 1080 && ingameMinutes < 1320) {
    base = 14; // evening strolls & shift end
  } else if (ingameMinutes >= 1320 || ingameMinutes < 300) {
    base = 5; // quiet night owls & night-shift guard
  } else {
    base = 10; // early dawn shift
  }
  if (themeParkOwned && ingameMinutes >= 480 && ingameMinutes < 1320) {
    base += 3 + parkAttractionCount * 2;
  }
  if (isStorm) base = Math.max(3, Math.floor(base * 0.4));
  else if (weather === 'rainy') base = Math.max(6, Math.floor(base * 0.72));
  return base;
}

function pickGreetingLine(
  npc: VillageAmbientNpc,
  farmerName: string,
  season: Season,
  weather: WeatherType,
  ingameMinutes: number
): string {
  const isEvening = ingameMinutes >= 1080 || ingameMinutes < 330;
  const pool: string[] = [
    `Hallo ${farmerName}!`,
    `Schön dich zu sehen, ${farmerName}!`,
    'Dein Hofladen wird im Dorf sehr gelobt!',
    'Hast du heute schon aufs Schwarze Brett geschaut?',
    'Die frischen Sachen vom Hof schmecken super!',
  ];

  if (weather === 'rainy' || weather === 'stormy') {
    pool.push('Gut, dass ich meinen Schirm dabei habe!', 'Nass heute, aber gut für die Felder!');
  } else if (weather === 'frost' || season === 'winter') {
    pool.push('Brrr, heute wärmt ein Tee vom Gasthof!', 'Abends leuchtet die Feuerschale so schön.');
  } else if (season === 'spring') {
    pool.push('Die Blumen in Sonnental blühen herrlich!', 'Frühlingsluft tut richtig gut!');
  } else if (season === 'summer') {
    pool.push('Perfektes Erntewetter heute!', 'Die Bienen summen heute fleißig.');
  } else if (season === 'autumn') {
    pool.push('Bald beginnt der Herbstmarkt!', 'Das bunte Laub sieht toll aus.');
  }

  if (isEvening) {
    pool.push('Feierabend im Gasthof Zum Tal!', 'Guten Abend, ruhige Nacht!');
  } else if (npc.activity === 'visit_park') {
    pool.push(
      'Der neue Abenteuerpark Sonnental ist fantastisch!',
      'Zuckerwatte, Karussell und tolle Fahrgeschäfte — was für ein Ausflug!',
      'Von oben sieht man dein ganzes Tal leuchten!'
    );
  } else if (npc.activity === 'work_shift') {
    pool.push(
      'Auf zur Schicht beim Automobilzulieferer!',
      'Bei Sonnental Antriebstechnik brummt die Produktion!'
    );
  } else if (npc.activity === 'visit_shop') {
    pool.push('Ich hole schnell frische Brötchen!', 'Im Westviertel-Supermarkt gibt es heute frisches Obst.');
  } else if (npc.activity === 'chore_yard') {
    pool.push('Kurz vorm Haus fegen und gießen!', 'Ein ordentlicher Vorgarten freut alle.');
  }

  return pick(pool);
}

function assignNewTaskToNpc(
  npc: VillageAmbientNpc,
  ingameMinutes: number,
  weather: WeatherType,
  currentNpcs: VillageAmbientNpc[],
  burningHouseId?: string | null,
  themeParkOwned = false,
  parkAttractions: ThemeParkAttractionId[] = []
) {
  const home = VILLAGE_HOUSE_BY_ID[npc.homeHouseId] || VILLAGE_HOUSES[0];
  const isHomeBurning = Boolean(burningHouseId && home.id === burningHouseId);
  const currStreet =
    npc.y < -9.5 ? -12.0 : npc.y < -4.5 ? -7.0 : -2.0;
  const isNight = ingameMinutes >= 1320 || ingameMinutes < 330;
  const isEvening = ingameMinutes >= 1080 && ingameMinutes < 1320;
  const isRainOrStorm = weather === 'rainy' || weather === 'stormy';

  if (isNight && !isHomeBurning) {
    // Late night: either return home or hang briefly by the firebowl/Gasthof
    if (Math.random() < 0.72) {
      npc.activity = 'go_home';
      npc.waypoints = buildVillageRoadRoute(npc.x, npc.y, currStreet, home.doorX, home.doorY, home.streetY);
      npc.waypointIdx = 0;
      npc.speed = 1.6;
      npc.chatIcon = undefined;
      return;
    }
    const fireSpotX = 14.3 + (Math.random() - 0.5) * 1.1;
    const fireSpotY = -7.1 + (Math.random() - 0.5) * 0.4;
    npc.activity = 'chat_plaza';
    npc.waypoints = buildVillageRoadRoute(npc.x, npc.y, currStreet, fireSpotX, fireSpotY, -7.0);
    npc.waypointIdx = 0;
    npc.speed = 1.4;
    npc.chatIcon = 'talk';
    return;
  }

  const roll = Math.random();
  const occupiedBenches = new Set(
    currentNpcs.filter((o) => o !== npc && o.activity === 'sit_bench').map((o) => o.benchIndex)
  );

  // 1. Sit on Dorfplatz bench (if dry)
  if (!isRainOrStorm && roll < 0.16 && occupiedBenches.size < 2) {
    const benchIndex: 0 | 1 = !occupiedBenches.has(0) ? 0 : 1;
    const bench = VILLAGE_BENCH_SPOTS[benchIndex];
    npc.activity = 'sit_bench';
    npc.benchIndex = benchIndex;
    npc.waypoints = buildVillageRoadRoute(npc.x, npc.y, currStreet, bench.seatX, bench.seatY, -7.0);
    npc.waypointIdx = 0;
    npc.speed = 1.5;
    npc.chatIcon = 'talk';
    return;
  }

  // 2. Chat on Dorfplatz around fountain / board / firebowl
  if (roll < 0.38) {
    const plazaTargets = [
      { x: 12.6, y: -7.15 },
      { x: 13.15, y: -6.85 },
      { x: 14.6, y: -6.95 },
      { x: 15.1, y: -7.35 },
      { x: 12.35, y: -7.45 },
    ];
    const spot = pick(plazaTargets);
    npc.activity = 'chat_plaza';
    npc.waypoints = buildVillageRoadRoute(
      npc.x,
      npc.y,
      currStreet,
      spot.x + (Math.random() - 0.5) * 0.35,
      spot.y + (Math.random() - 0.5) * 0.25,
      -7.0
    );
    npc.waypointIdx = 0;
    npc.speed = isRainOrStorm ? 1.85 : 1.45;
    npc.chatIcon = pick(['talk', 'laugh', 'heart']);
    return;
  }

  // 3. Visit iconic village buildings & Westviertel shops (Bäckerei, Supermarkt, Gasthof, Schmiede)
  if (roll < 0.56) {
    if (Math.random() < 0.48) {
      const biz = Math.random() < 0.5 ? VILLAGE_BUSINESS_BY_ID.west_bakery : VILLAGE_BUSINESS_BY_ID.west_supermarket;
      npc.activity = 'visit_shop';
      npc.waypoints = buildVillageRoadRoute(
        npc.x,
        npc.y,
        currStreet,
        biz.doorX + (Math.random() - 0.5) * 0.5,
        biz.doorY + 0.3,
        biz.streetY
      );
      npc.waypointIdx = 0;
      npc.speed = isRainOrStorm ? 1.9 : 1.5;
      npc.chatIcon = 'bread';
      return;
    }
    const rawShopHouseIds = isEvening ? ['vh_15', 'vh_05'] : ['vh_05', 'vh_15', 'vh_17', 'vh_16', 'vh_25'];
    const shopHouseIds = rawShopHouseIds.filter((id) => id !== burningHouseId);
    const targetHouse = VILLAGE_HOUSE_BY_ID[pick(shopHouseIds.length > 0 ? shopHouseIds : ['vh_05'])] || VILLAGE_HOUSES[4];
    npc.activity = 'visit_shop';
    npc.waypoints = buildVillageRoadRoute(
      npc.x,
      npc.y,
      currStreet,
      targetHouse.doorX + (Math.random() - 0.5) * 0.3,
      targetHouse.doorY + 0.35,
      targetHouse.streetY
    );
    npc.waypointIdx = 0;
    npc.speed = isRainOrStorm ? 1.9 : 1.5;
    npc.chatIcon = targetHouse.id === 'vh_05' || targetHouse.id === 'vh_15' ? 'bread' : 'talk';
    return;
  }

  // 3b-2. Visit Abenteuerpark Sonnental (carousel plaza & attractions!)
  if (themeParkOwned && !isNight && roll >= 0.56 && roll < 0.74) {
    const parkSpots: Array<{ x: number; y: number }> = [
      { x: -8.5, y: 2.3 },
      { x: -10.3, y: 4.8 },
      { x: -7.2, y: 4.9 },
      { x: -9.5, y: 6.4 },
      { x: -5.4, y: 4.4 },
    ];
    if (parkAttractions.includes('ferris_wheel')) {
      parkSpots.push({ x: -13.8, y: 6.4 }, { x: -12.4, y: 4.2 });
    }
    if (parkAttractions.includes('roller_coaster')) {
      parkSpots.push({ x: -13.0, y: 7.2 }, { x: -10.5, y: 7.3 });
    }
    if (parkAttractions.includes('water_flume')) {
      parkSpots.push({ x: -5.4, y: 7.1 }, { x: -3.2, y: 6.5 });
    }
    if (parkAttractions.includes('sky_tower')) {
      parkSpots.push({ x: -3.4, y: 5.2 }, { x: -4.6, y: 6.2 });
    }
    if (parkAttractions.includes('ghost_train')) {
      parkSpots.push({ x: -11.5, y: 14.5 }, { x: -9.5, y: 14.1 });
    }
    const target = pick(parkSpots);
    const gateX = THEME_PARK_BOUNDS.northGateX + (Math.random() - 0.5) * 0.5;
    npc.activity = 'visit_park';
    if (npc.y > 0.2) {
      npc.waypoints = [
        { x: -8.5, y: 5.8 },
        { x: Number(target.x.toFixed(2)), y: Number(target.y.toFixed(2)) },
      ];
    } else {
      const toGate = buildVillageRoadRoute(npc.x, npc.y, currStreet, gateX, -2.0, -2.0);
      toGate.push({ x: Number(gateX.toFixed(2)), y: 1.5 });
      toGate.push({ x: -8.5, y: 5.4 });
      toGate.push({ x: Number(target.x.toFixed(2)), y: Number(target.y.toFixed(2)) });
      npc.waypoints = toGate;
    }
    npc.waypointIdx = 0;
    npc.speed = isRainOrStorm ? 1.85 : 1.55;
    npc.chatIcon = pick(['laugh', 'heart', 'talk']);
    return;
  }

  // 3b. Work commute to Automotive Supplier (or Westviertel Bakery / Supermarket)
  const resident = VILLAGE_RESIDENTS.find((r) => r.id === npc.residentId);
  if (!isNight && resident && resident.workplace !== 'village_craft' && roll < 0.78) {
    const biz = VILLAGE_BUSINESS_BY_ID[resident.workplace];
    npc.activity = 'work_shift';
    npc.waypoints = buildVillageRoadRoute(
      npc.x,
      npc.y,
      currStreet,
      biz.doorX + (Math.random() - 0.5) * 0.7,
      biz.doorY + 0.25,
      biz.streetY
    );
    npc.waypointIdx = 0;
    npc.speed = isRainOrStorm ? 2.0 : 1.65;
    npc.chatIcon = 'talk';
    return;
  }

  // 4. Front yard chore at home (if dry & daytime & not burning!)
  if (!isRainOrStorm && !isEvening && !isHomeBurning && roll < 0.88) {
    npc.activity = 'chore_yard';
    npc.choreKind = Math.random() < 0.5 ? 'sweep' : 'water';
    npc.waypoints = buildVillageRoadRoute(
      npc.x,
      npc.y,
      currStreet,
      home.doorX + (Math.random() < 0.5 ? -0.45 : 0.45),
      home.doorY + 0.18,
      home.streetY
    );
    npc.waypointIdx = 0;
    npc.speed = 1.45;
    npc.chatIcon = undefined;
    return;
  }

  // 5. General stroll along any of the 3 avenues (including Westviertel & Industriegebiet)
  const destStreet = pick(STREET_YS);
  const destX = -25.5 + Math.random() * 51.5;
  npc.activity = 'stroll';
  npc.waypoints = buildVillageRoadRoute(npc.x, npc.y, currStreet, destX, destStreet, destStreet);
  npc.waypointIdx = 0;
  npc.speed = isRainOrStorm ? 1.95 : 1.35 + Math.random() * 0.25;
  npc.chatIcon = undefined;
}

function createAmbientNpc(
  resident: VillageResident,
  house: VillageHouse,
  ingameMinutes: number,
  weather: WeatherType,
  existing: VillageAmbientNpc[]
): VillageAmbientNpc {
  const npc: VillageAmbientNpc = {
    residentId: resident.id,
    name: resident.name,
    shirtColor: resident.shirtColor,
    hairColor: resident.hairColor,
    skinTone: resident.skinTone,
    hatColor: resident.hatColor,
    umbrellaColor: UMBRELLA_COLORS[(resident.name.length + house.x * 3) % UMBRELLA_COLORS.length | 0],
    homeHouseId: house.id,
    x: house.doorX,
    y: house.doorY + 0.15,
    facing: 'down',
    activity: 'stroll',
    waypoints: [],
    waypointIdx: 0,
    speed: 1.45,
    pauseMs: 0,
  };
  assignNewTaskToNpc(npc, ingameMinutes, weather, existing);
  return npc;
}

export function createInitialVillageLifeState(
  ingameMinutes: number,
  season: Season,
  weather: WeatherType
): VillageLifeState {
  const state: VillageLifeState = {
    initialized: true,
    npcs: [],
    cats: [
      {
        id: 'vcat_1',
        x: 6.2,
        y: -6.9,
        targetX: 11.4,
        targetY: -6.95,
        furColor: '#f97316',
        accentColor: '#fed7aa',
        pauseMs: 800,
        facing: 'right',
      },
      {
        id: 'vcat_2',
        x: 18.4,
        y: -12.0,
        targetX: 14.5,
        targetY: -12.0,
        furColor: '#334155',
        accentColor: '#f8fafc',
        pauseMs: 1400,
        facing: 'left',
      },
      {
        id: 'vcat_3',
        x: 10.5,
        y: -2.0,
        targetX: 16.2,
        targetY: -2.0,
        furColor: '#cbd5e1',
        accentColor: '#64748b',
        pauseMs: 500,
        facing: 'right',
      },
      {
        id: 'vcat_4',
        x: -11.5,
        y: -7.0,
        targetX: -5.5,
        targetY: -7.0,
        furColor: '#d97706',
        accentColor: '#fef3c7',
        pauseMs: 900,
        facing: 'right',
      },
    ],
    birds: [
      { id: 'vbird_1', homeX: 13.7, homeY: -7.1, x: 13.7, y: -7.1, hopPhase: 0, color: '#60a5fa', flyingUntilMs: 0, flyDx: 0, flyDy: 0 },
      { id: 'vbird_2', homeX: 14.2, homeY: -6.8, x: 14.2, y: -6.8, hopPhase: 2, color: '#94a3b8', flyingUntilMs: 0, flyDx: 0, flyDy: 0 },
      { id: 'vbird_3', homeX: 5.7, homeY: -14.7, x: 5.7, y: -14.7, hopPhase: 1, color: '#fbbf24', flyingUntilMs: 0, flyDx: 0, flyDy: 0 },
      { id: 'vbird_4', homeX: 11.7, homeY: -9.7, x: 11.7, y: -9.7, hopPhase: 3, color: '#cbd5e1', flyingUntilMs: 0, flyDx: 0, flyDy: 0 },
      { id: 'vbird_5', homeX: 21.8, homeY: -4.7, x: 21.8, y: -4.7, hopPhase: 4, color: '#f87171', flyingUntilMs: 0, flyDx: 0, flyDy: 0 },
      { id: 'vbird_6', homeX: 18.2, homeY: -9.7, x: 18.2, y: -9.7, hopPhase: 5, color: '#a3e635', flyingUntilMs: 0, flyDx: 0, flyDy: 0 },
      { id: 'vbird_7', homeX: -9.4, homeY: -12.6, x: -9.4, y: -12.6, hopPhase: 1.5, color: '#fbbf24', flyingUntilMs: 0, flyDx: 0, flyDy: 0 },
      { id: 'vbird_8', homeX: -15.6, homeY: -7.4, x: -15.6, y: -7.4, hopPhase: 3.4, color: '#38bdf8', flyingUntilMs: 0, flyDx: 0, flyDy: 0 },
    ],
    butterflies: [
      { id: 'vbf_1', anchorX: 1.9, anchorY: -8.3, x: 1.9, y: -8.3, phase: 0.2, color: '#fde047' },
      { id: 'vbf_2', anchorX: 16.5, anchorY: -13.1, x: 16.5, y: -13.1, phase: 1.7, color: '#f472b6' },
      { id: 'vbf_3', anchorX: 10.2, anchorY: -3.1, x: 10.2, y: -3.1, phase: 2.9, color: '#38bdf8' },
      { id: 'vbf_4', anchorX: 20.1, anchorY: -8.2, x: 20.1, y: -8.2, phase: 4.1, color: '#fb923c' },
      { id: 'vbf_5', anchorX: 14.3, anchorY: -8.5, x: 14.3, y: -8.5, phase: 5.0, color: '#c084fc' },
      { id: 'vbf_6', anchorX: 6.4, anchorY: -3.3, x: 6.4, y: -3.3, phase: 0.9, color: '#fde047' },
      { id: 'vbf_7', anchorX: -5.8, anchorY: -8.3, x: -5.8, y: -8.3, phase: 2.2, color: '#f472b6' },
    ],
    vehicles: [
      {
        id: 'veh_bike',
        kind: 'bicycle',
        x: 2.5,
        y: -11.95,
        dir: 1,
        streetY: -11.95,
        speed: 3.15,
        pauseMs: 0,
        riderColor: '#0ea5e9',
      },
      {
        id: 'veh_cart',
        kind: 'cart',
        x: 24.0,
        y: -1.95,
        dir: -1,
        streetY: -1.95,
        speed: 1.95,
        pauseMs: 1200,
        riderColor: '#b45309',
      },
      {
        id: 'veh_bike_west',
        kind: 'bicycle',
        x: -14.5,
        y: -6.95,
        dir: 1,
        streetY: -6.95,
        speed: 3.0,
        pauseMs: 400,
        riderColor: '#10b981',
      },
    ],
    spawnCooldownMs: 600,
  };

  // Pre-seed lively villagers already walking along avenues/plaza so village is immediately populated on arrival
  const initialCount = Math.min(18, getDesiredAmbientNpcCount(ingameMinutes, weather));
  const usedIds = new Set<string>();
  for (let i = 0; i < initialCount; i++) {
    const res = VILLAGE_RESIDENTS[(i * 6 + (season === 'winter' ? 2 : 0)) % VILLAGE_RESIDENTS.length];
    if (usedIds.has(res.id)) continue;
    usedIds.add(res.id);
    const house = VILLAGE_HOUSE_BY_ID[res.houseId] || VILLAGE_HOUSES[0];
    const npc = createAmbientNpc(res, house, ingameMinutes, weather, state.npcs);
    // Start partway along their route for immediate organic distribution
    if (npc.waypoints.length >= 2) {
      const wp = npc.waypoints[Math.min(1, npc.waypoints.length - 1)];
      npc.x = wp.x;
      npc.y = wp.y;
      npc.waypointIdx = Math.min(1, npc.waypoints.length - 1);
    }
    state.npcs.push(npc);
  }

  return state;
}

export function updateVillageLifeState(
  state: VillageLifeState,
  params: {
    deltaMs: number;
    nowMs: number;
    ingameMinutes: number;
    season: Season;
    weather: WeatherType;
    farmerName: string;
    playerPos: PlayerPosition;
    activeShopResidentIds: Set<string>;
    burningHouseId?: string | null;
    themeParkOwned?: boolean;
    themeParkAttractions?: ThemeParkAttractionId[];
  }
) {
  const {
    deltaMs,
    nowMs,
    ingameMinutes,
    season,
    weather,
    farmerName,
    playerPos,
    activeShopResidentIds,
    burningHouseId = null,
    themeParkOwned = false,
    themeParkAttractions = [],
  } = params;
  const dtSec = Math.min(0.08, Math.max(0.001, deltaMs / 1000));
  const desiredCount = getDesiredAmbientNpcCount(
    ingameMinutes,
    weather,
    themeParkOwned,
    themeParkAttractions.length
  );

  // 1. Spawn / cull ambient NPCs cleanly
  state.spawnCooldownMs -= deltaMs;
  if (state.spawnCooldownMs <= 0 && state.npcs.length < desiredCount) {
    const busy = new Set([
      ...activeShopResidentIds,
      ...state.npcs.map((n) => n.residentId),
    ]);
    const candidates = VILLAGE_RESIDENTS.filter((r) => !busy.has(r.id) && r.houseId !== burningHouseId);
    if (candidates.length > 0) {
      const chosen = pick(candidates);
      const house = VILLAGE_HOUSE_BY_ID[chosen.houseId] || VILLAGE_HOUSES[0];
      const spawned = createAmbientNpc(chosen, house, ingameMinutes, weather, state.npcs);
      if (themeParkOwned && Math.random() < 0.35) {
        assignNewTaskToNpc(
          spawned,
          ingameMinutes,
          weather,
          state.npcs,
          burningHouseId,
          themeParkOwned,
          themeParkAttractions
        );
      }
      state.npcs.push(spawned);
    }
    state.spawnCooldownMs = 1500 + Math.random() * 1200;
  }

  // 2. Update NPCs
  const nextNpcs: VillageAmbientNpc[] = [];
  for (const npc of state.npcs) {
    // If this resident just got picked for a Hofladen shopping trip, gracefully retire them from ambient pool
    if (activeShopResidentIds.has(npc.residentId)) {
      continue;
    }

    // Clear expired greeting
    if (npc.greetingUntilMs && nowMs > npc.greetingUntilMs) {
      npc.greetingUntilMs = undefined;
      npc.greetingText = undefined;
    }

    // Player proximity greeting when player walks in/near village or park!
    const distToPlayer = Math.hypot(npc.x - playerPos.x, npc.y - playerPos.y);
    if (
      (playerPos.y < 1.2 || playerPos.x < -0.5) &&
      distToPlayer < 2.15 &&
      (!npc.lastGreetedAtMs || nowMs - npc.lastGreetedAtMs > 15_000)
    ) {
      npc.lastGreetedAtMs = nowMs;
      npc.greetingUntilMs = nowMs + 3800;
      npc.wavingUntilMs = nowMs + 2200;
      npc.greetingText = pickGreetingLine(npc, farmerName, season, weather, ingameMinutes);
      npc.pauseMs = Math.max(npc.pauseMs, 1500);
      if (Math.abs(playerPos.x - npc.x) > Math.abs(playerPos.y - npc.y)) {
        npc.facing = playerPos.x < npc.x ? 'left' : 'right';
      } else {
        npc.facing = playerPos.y < npc.y ? 'up' : 'down';
      }
    }

    // Keep villagers from walking indoors or sweeping in a burning house
    if (burningHouseId && npc.homeHouseId === burningHouseId && (npc.activity === 'go_home' || npc.activity === 'chore_yard')) {
      assignNewTaskToNpc(
        npc,
        ingameMinutes,
        weather,
        state.npcs,
        burningHouseId,
        themeParkOwned,
        themeParkAttractions
      );
    }

    if (npc.pauseMs > 0) {
      npc.pauseMs -= deltaMs;
      if (npc.pauseMs <= 0) {
        if (npc.activity === 'go_home' || state.npcs.length > desiredCount + 1) {
          continue; // stepped back indoors
        }
        assignNewTaskToNpc(
          npc,
          ingameMinutes,
          weather,
          state.npcs,
          burningHouseId,
          themeParkOwned,
          themeParkAttractions
        );
      }
      nextNpcs.push(npc);
      continue;
    }

    const target = npc.waypoints[npc.waypointIdx];
    if (!target) {
      assignNewTaskToNpc(
        npc,
        ingameMinutes,
        weather,
        state.npcs,
        burningHouseId,
        themeParkOwned,
        themeParkAttractions
      );
      nextNpcs.push(npc);
      continue;
    }

    const dx = target.x - npc.x;
    const dy = target.y - npc.y;
    const dist = Math.hypot(dx, dy);
    const step = npc.speed * dtSec;

    if (dist <= step) {
      npc.x = target.x;
      npc.y = target.y;
      if (npc.waypointIdx + 1 < npc.waypoints.length) {
        npc.waypointIdx += 1;
      } else {
        // Reached destination!
        if (npc.activity === 'go_home') {
          continue; // entered front door
        }
        if (npc.activity === 'sit_bench') {
          npc.facing = 'down';
          npc.pauseMs = 7500 + Math.random() * 5000;
        } else if (npc.activity === 'chat_plaza') {
          npc.facing = npc.x < 13.8 ? 'right' : 'left';
          npc.pauseMs = 5500 + Math.random() * 4500;
        } else if (npc.activity === 'chore_yard') {
          npc.facing = 'down';
          npc.pauseMs = 5000 + Math.random() * 3500;
        } else if (npc.activity === 'visit_park') {
          npc.facing = Math.random() < 0.5 ? 'up' : 'down';
          npc.pauseMs = 5500 + Math.random() * 4500;
        } else if (npc.activity === 'visit_shop' || npc.activity === 'work_shift') {
          npc.facing = 'up';
          npc.pauseMs = npc.activity === 'work_shift' ? 5000 + Math.random() * 4000 : 3200 + Math.random() * 2500;
        } else {
          npc.pauseMs = 900 + Math.random() * 1400;
        }
      }
    } else {
      npc.x += (dx / dist) * step;
      npc.y += (dy / dist) * step;
      if (Math.abs(dx) > Math.abs(dy)) {
        npc.facing = dx < 0 ? 'left' : 'right';
      } else {
        npc.facing = dy < 0 ? 'up' : 'down';
      }
    }

    nextNpcs.push(npc);
  }
  state.npcs = nextNpcs;

  // 3. Update stray village cats (hide if stormy)
  const isStorm = weather === 'stormy';
  for (const cat of state.cats) {
    if (isStorm) continue;
    if (cat.pauseMs > 0) {
      cat.pauseMs -= deltaMs;
      if (cat.pauseMs <= 0) {
        const streetY = pick(STREET_YS) + (Math.random() - 0.5) * 0.35;
        cat.targetX = Math.max(-25.0, Math.min(25.5, cat.x + (Math.random() - 0.5) * 9));
        cat.targetY = Math.random() < 0.65 ? cat.y : streetY;
      }
      continue;
    }
    const dx = cat.targetX - cat.x;
    const dy = cat.targetY - cat.y;
    const dist = Math.hypot(dx, dy);
    const step = 1.05 * dtSec;
    if (dist <= step) {
      cat.x = cat.targetX;
      cat.y = cat.targetY;
      cat.pauseMs = 2600 + Math.random() * 3200;
    } else {
      cat.x += (dx / dist) * step;
      cat.y += (dy / dist) * step;
      if (Math.abs(dx) > 0.05) cat.facing = dx < 0 ? 'left' : 'right';
    }
  }

  // 4. Update roof & plaza birds (daytime & dry/snowy)
  const isDaylight = ingameMinutes >= 360 && ingameMinutes <= 1180;
  for (const bird of state.birds) {
    if (!isDaylight || isStorm) continue;
    const playerDist = Math.hypot(bird.x - playerPos.x, bird.y - playerPos.y);
    if (playerDist < 1.6 && nowMs > bird.flyingUntilMs) {
      bird.flyingUntilMs = nowMs + 1400;
      bird.flyDx = (bird.x - playerPos.x >= 0 ? 1 : -1) * 1.4;
      bird.flyDy = -1.2;
    }
    if (nowMs < bird.flyingUntilMs) {
      bird.x += bird.flyDx * dtSec;
      bird.y += bird.flyDy * dtSec;
    } else {
      bird.x += (bird.homeX - bird.x) * dtSec * 1.5;
      bird.y += (bird.homeY - bird.y) * dtSec * 1.5;
      bird.hopPhase += dtSec * 4.2;
    }
  }

  // 5. Update spring/summer butterflies
  const showButterflies = (season === 'spring' || season === 'summer') && isDaylight && weather !== 'rainy' && !isStorm;
  if (showButterflies) {
    for (const bf of state.butterflies) {
      bf.phase += dtSec * 2.1;
      bf.x = bf.anchorX + Math.sin(bf.phase) * 0.75 + Math.cos(bf.phase * 0.5) * 0.3;
      bf.y = bf.anchorY + Math.cos(bf.phase * 1.3) * 0.45;
    }
  }

  // 6. Update cyclist & farm cart along avenues during active hours (06:30–20:30)
  const vehiclesActive = ingameMinutes >= 390 && ingameMinutes <= 1230 && !isStorm;
  for (const veh of state.vehicles) {
    if (!vehiclesActive) continue;
    if (veh.pauseMs > 0) {
      veh.pauseMs -= deltaMs;
      continue;
    }
    veh.x += veh.dir * veh.speed * dtSec;
    if (veh.dir === 1 && veh.x > 26.8) {
      veh.dir = -1;
      veh.streetY = veh.kind === 'bicycle' ? pick([-11.95, -6.95]) : -1.95;
      veh.y = veh.streetY;
      veh.pauseMs = 2200 + Math.random() * 2500;
    } else if (veh.dir === -1 && veh.x < -18.5) {
      veh.dir = 1;
      veh.streetY = veh.kind === 'bicycle' ? pick([-11.95, -6.95]) : -1.95;
      veh.y = veh.streetY;
      veh.pauseMs = 2200 + Math.random() * 2500;
    }
  }
}

export function triggerVillageNpcGreeting(
  state: VillageLifeState,
  clickWorldX: number,
  clickWorldY: number,
  farmerName: string,
  season: Season,
  weather: WeatherType,
  ingameMinutes: number,
  nowMs: number
): VillageAmbientNpc | null {
  let closest: VillageAmbientNpc | null = null;
  let bestDist = 0.88;
  for (const npc of state.npcs) {
    const d = Math.hypot(npc.x - clickWorldX, npc.y - clickWorldY);
    if (d < bestDist) {
      bestDist = d;
      closest = npc;
    }
  }
  if (!closest) return null;
  closest.greetingText = pickGreetingLine(closest, farmerName, season, weather, ingameMinutes);
  closest.greetingUntilMs = nowMs + 4000;
  closest.wavingUntilMs = nowMs + 2200;
  closest.lastGreetedAtMs = nowMs;
  closest.pauseMs = Math.max(closest.pauseMs, 2400);
  closest.facing = 'down';
  return closest;
}
