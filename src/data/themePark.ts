import { ThemeParkAttractionId, ThemeParkState } from '../types/game';

export const THEME_PARK_UNLOCK_LEVEL = 175;
export const THEME_PARK_BASE_COST = 7_500_000;
export const THEME_PARK_BASE_HOURLY_PROFIT = 14_500;
export const THEME_PARK_BASE_VISITOR_BONUS = 2;

export const THEME_PARK_BOUNDS = {
  x: -18.5,
  y: 0.5,
  width: 17.5,
  height: 19.5,
  northGateX: -8.5,
  northGateY: 0.5,
  eastGateX: -1.0,
  eastGateY: 7.5,
};

export interface ThemeParkAttractionSpec {
  id: ThemeParkAttractionId;
  name: string;
  subtitle: string;
  description: string;
  minLevel?: number;
  cost: number;
  hourlyProfitBonus: number;
  dailyProfitRangeLabel: string;
  shopVisitorBonus: number;
  xpReward: number;
  plotX: number;
  plotY: number;
  plotW: number;
  plotH: number;
  accentColor: string;
}

export const THEME_PARK_ATTRACTIONS: ThemeParkAttractionSpec[] = [
  {
    id: 'ferris_wheel',
    name: 'Riesenrad „Sonnenblick“',
    subtitle: 'Ausbau 1 · Panorama & Nachtlicht',
    description:
      'Ein majestätisches Riesenrad mit 8 bunten Gondeln, das über das gesamte Sonnental blickt und abends in warmem Lichtermeer erstrahlt.',
    minLevel: THEME_PARK_UNLOCK_LEVEL,
    cost: 2_500_000,
    hourlyProfitBonus: 4_500,
    dailyProfitRangeLabel: '+ ca. 100.000 – 116.000 M / Tag',
    shopVisitorBonus: 2,
    xpReward: 1_800,
    plotX: -17.3,
    plotY: 1.5,
    plotW: 5.8,
    plotH: 5.0,
    accentColor: '#e11d48',
  },
  {
    id: 'roller_coaster',
    name: 'Holz-Achterbahn „Tal-Blitz“',
    subtitle: 'Ausbau 2 · Adrenalin & Fahrgeschäft',
    description:
      'Rasante Holzachterbahn mit drei steilen Tälern und einem schnellen 3-Wagen-Zug, die Abenteuerlustige aus dem ganzen Umland anzieht.',
    minLevel: THEME_PARK_UNLOCK_LEVEL,
    cost: 3_500_000,
    hourlyProfitBonus: 6_800,
    dailyProfitRangeLabel: '+ ca. 150.000 – 176.000 M / Tag',
    shopVisitorBonus: 3,
    xpReward: 2_400,
    plotX: -17.6,
    plotY: 7.5,
    plotW: 9.2,
    plotH: 5.4,
    accentColor: '#d97706',
  },
  {
    id: 'water_flume',
    name: 'Wildwasserbahn „Tal-Splash“',
    subtitle: 'Ausbau 3 · Felsenbach & Großfinale',
    description:
      'Spektakuläre Wildwasser-Schussfahrt durch einen künstlichen Felsenberg mit erfrischenden Spritzfontänen und Stammbooten.',
    minLevel: THEME_PARK_UNLOCK_LEVEL,
    cost: 4_000_000,
    hourlyProfitBonus: 8_200,
    dailyProfitRangeLabel: '+ ca. 180.000 – 212.000 M / Tag',
    shopVisitorBonus: 3,
    xpReward: 3_000,
    plotX: -7.5,
    plotY: 7.4,
    plotW: 5.6,
    plotH: 5.5,
    accentColor: '#0284c7',
  },
  {
    id: 'sky_tower',
    name: 'Sonnental Sky-Tower',
    subtitle: 'Ausbau 4 · 60-m-Freifall- & Aussichtsturm (Lvl 215)',
    description:
      'Vergoldete Panorama-Gondel, die in luftige Höhen schwebt und abends mit rotem Warnfeuer über das gesamte Tal leuchtet.',
    minLevel: 215,
    cost: 8_500_000,
    hourlyProfitBonus: 18_500,
    dailyProfitRangeLabel: '+ ca. 405.000 – 480.000 M / Tag',
    shopVisitorBonus: 3,
    xpReward: 4_800,
    plotX: -4.8,
    plotY: 1.4,
    plotW: 3.3,
    plotH: 4.5,
    accentColor: '#eab308',
  },
  {
    id: 'ghost_train',
    name: 'Spukschloss-Geisterbahn',
    subtitle: 'Ausbau 5 · Gruselkabinett & Kürbisgarten (Lvl 235)',
    description:
      'Geheimnisvolles Schloss im Süd-Park mit spukenden Türmen, Nebelschwaden, leuchtenden Kürbissen und einer rasanten Geister-Lore.',
    minLevel: 235,
    cost: 12_500_000,
    hourlyProfitBonus: 28_000,
    dailyProfitRangeLabel: '+ ca. 618.000 – 725.000 M / Tag',
    shopVisitorBonus: 4,
    xpReward: 6_500,
    plotX: -17.3,
    plotY: 13.7,
    plotW: 9.0,
    plotH: 5.2,
    accentColor: '#7c3aed',
  },
];

export const THEME_PARK_ATTRACTION_BY_ID: Record<ThemeParkAttractionId, ThemeParkAttractionSpec> = {
  ferris_wheel: THEME_PARK_ATTRACTIONS[0],
  roller_coaster: THEME_PARK_ATTRACTIONS[1],
  water_flume: THEME_PARK_ATTRACTIONS[2],
  sky_tower: THEME_PARK_ATTRACTIONS[3],
  ghost_train: THEME_PARK_ATTRACTIONS[4],
};

export function getThemeParkMetrics(park?: ThemeParkState): {
  owned: boolean;
  attractionCount: number;
  hourlyProfitBase: number;
  estimatedDailyMin: number;
  estimatedDailyMax: number;
  shopVisitorBonus: number;
} {
  if (!park?.owned) {
    return {
      owned: false,
      attractionCount: 0,
      hourlyProfitBase: 0,
      estimatedDailyMin: 0,
      estimatedDailyMax: 0,
      shopVisitorBonus: 0,
    };
  }

  let hourlyProfitBase = THEME_PARK_BASE_HOURLY_PROFIT;
  let shopVisitorBonus = THEME_PARK_BASE_VISITOR_BONUS;

  for (const attrId of park.attractions || []) {
    const spec = THEME_PARK_ATTRACTION_BY_ID[attrId];
    if (spec) {
      hourlyProfitBase += spec.hourlyProfitBonus;
      shopVisitorBonus += spec.shopVisitorBonus;
    }
  }

  const dailyNominal = hourlyProfitBase * 24;
  return {
    owned: true,
    attractionCount: (park.attractions || []).length,
    hourlyProfitBase,
    estimatedDailyMin: Math.round((dailyNominal * 0.92) / 1000) * 1000,
    estimatedDailyMax: Math.round((dailyNominal * 1.08) / 1000) * 1000,
    shopVisitorBonus,
  };
}
