import {
  ALMANAC_TRACKABLE_CATEGORIES,
  ARTISAN_STATION_IDS,
  CATALOG,
  CATALOG_BY_ID,
  CRAFT_RECIPES,
  createAnimalLifespanMs,
  createRandomAvatar,
  DAYS_PER_SEASON,
  FAIR_MEDAL_THRESHOLDS,
  FISHING_UNLOCK_LEVEL,
  fishingXpRequiredForLevel,
  FLY_AGARIC_BUFF_MS,
  FLY_AGARIC_SPAWN_CHANCE_PER_SEC,
  generateQuestsForLevel,
  GRID_SIZE,
  IDLE_TILLED_REVERT_MS,
  INITIAL_NEIGHBORS,
  isLivestockAnimal,
  MAX_LEVEL,
  MAX_MOISTURE_MS,
  MAX_NEIGHBOR_REQUESTS_PER_DAY,
  PET_CATALOG,
  petXpRequiredForLevel,
  QUEST_MILESTONES,
  REAL_MS_PER_INGAME_DAY,
  REAL_MS_PER_INGAME_MINUTE,
  SEASON_LABELS,
  TUTORIAL_STEPS,
  WEATHER_META,
  WITHER_CROP_DRY_MS,
  WITHER_MUSHROOM_DRY_MS,
  WORKER_ROLES,
  WORKER_WORK_END_MIN,
  WORKER_WORK_START_MIN,
  workerXpRequiredForLevel,
  xpRequiredForLevel,
} from '../data/catalog';
import {
  buildWaypointsToHouse,
  buildWaypointsToShop,
  pickFireCauseForHouse,
  VILLAGE_BUSINESS_BY_ID,
  VILLAGE_HOUSE_BY_ID,
  VILLAGE_HOUSES,
  VILLAGE_RESIDENTS,
  VillageBusinessSpec,
} from '../data/village';
import { generateMineBoard } from '../data/mineCatalog';
import {
  getThemeParkMetrics,
  THEME_PARK_ATTRACTION_BY_ID,
  THEME_PARK_BASE_COST,
  THEME_PARK_BASE_VISITOR_BONUS,
  THEME_PARK_UNLOCK_LEVEL,
  ThemeParkAttractionSpec,
} from '../data/themePark';
import {
  ROMANCE_CANDIDATES,
  ROMANCE_CANDIDATE_BY_ID,
  ROMANCE_DATES,
  ROMANCE_UNLOCK_LEVEL,
  RomanceCandidateSpec,
} from '../data/romance';
import {
  AlmanacState,
  CatalogItem,
  CraftingJob,
  DisasterReport,
  DisasterWarning,
  EconomyCrisisState,
  FairMedal,
  FairSubmissionResult,
  FarmShopSaleEntry,
  FarmShopSpecialOrder,
  FarmShopState,
  FarmWorker,
  FishDensity,
  FishingRegionId,
  GameState,
  HouseState,
  MailboxSnapshot,
  MailboxState,
  MailRewardItem,
  MarketOrder,
  MerchantOffer,
  MerchantTrade,
  MineState,
  NeighborNPC,
  NewspaperIssue,
  PayrollReport,
  PendingMail,
  PetType,
  PostmanState,
  QuestKind,
  RomanceDateId,
  RomanceState,
  RomanceWeddingReport,
  Season,
  ShopVisitor,
  ShopVisitorArchetype,
  ShopVisitorBoughtItem,
  ThemeParkAttractionId,
  ThemeParkState,
  TileData,
  VillageBoardOrder,
  VillageBoardState,
  VillageBusinessId,
  VillageBusinessState,
  VillageFairState,
  VillageFireReport,
  VillageFireState,
  WanderingMerchantState,
  WeatherType,
  WinterFestivalState,
  WinterGiftDrop,
} from '../types/game';

import { loadSettings, saveSettings, SETTINGS_KEY, STORAGE_KEY } from './storageBoot';
export { loadSettings, saveSettings };

export function isTileUnlockedForRing(x: number, y: number, ring: number): boolean {
  // 20x20 farm grid:
  // Ring 0 (8x8): [6..13]
  // Ring 1 (10x10): [5..14]
  // Ring 2 (12x12): [4..15]
  // Ring 3 (14x14): [3..16]
  // Ring 4 (16x16): [2..17]
  // Ring 5 (18x18): [1..18]
  // Ring 6 (20x20): [0..19]
  const min = Math.max(0, 6 - ring);
  const max = Math.min(GRID_SIZE - 1, 13 + ring);
  return x >= min && x <= max && y >= min && y <= max;
}

export const EXPANSION_COSTS: Record<number, { cost: number; minLevel: number; label: string }> = {
  1: { cost: 550, minLevel: 2, label: 'Erweiterung I: Hofwiese (10×10)' },
  2: { cost: 1400, minLevel: 5, label: 'Erweiterung II: Südkoppel (12×12)' },
  3: { cost: 3000, minLevel: 10, label: 'Erweiterung III: Ostweide (14×14)' },
  4: { cost: 6200, minLevel: 18, label: 'Erweiterung IV: Waldrand-Acker (16×16)' },
  5: { cost: 12000, minLevel: 30, label: 'Erweiterung V: Großes Tal-Gut (18×18)' },
  6: { cost: 24000, minLevel: 45, label: 'Erweiterung VI: Gesamtes Sonnental-Reich (20×20)' },
};

function isOrderEligibleCatalogItem(item: CatalogItem, season: Season): boolean {
  return (
    !item.isMerchantExclusive &&
    !item.isFairExclusive &&
    !item.isGiftExclusive &&
    !item.isMineExclusive &&
    (!item.isEventExclusive || item.seasons.includes(season))
  );
}

export function generateDailyVillageOrders(
  day: number,
  level: number,
  season: Season
): VillageBoardOrder[] {
  const candidates = CATALOG.filter(
    (item) =>
      (item.category === 'crop' ||
        item.category === 'mushroom' ||
        item.category === 'tree' ||
        item.category === 'animal' ||
        item.category === 'artisan' ||
        (item.category === 'meat' && level >= 3) ||
        (item.category === 'fish' && level >= FISHING_UNLOCK_LEVEL)) &&
      isOrderEligibleCatalogItem(item, season) &&
      item.unlockLevel <= Math.max(2, level) &&
      item.sellPrice > 0 &&
      (item.seasons.includes(season) ||
        item.category === 'animal' ||
        item.category === 'artisan' ||
        item.category === 'meat')
  );
  const pool = candidates.length >= 3 ? candidates : CATALOG.filter((i) => i.category === 'crop' && i.unlockLevel <= 2);

  const usedResidents = new Set<string>();
  const usedItems = new Set<string>();
  const orders: VillageBoardOrder[] = [];

  for (let i = 0; i < 3; i++) {
    let res = VILLAGE_RESIDENTS[(day * 11 + i * 17) % VILLAGE_RESIDENTS.length];
    for (let t = 0; t < VILLAGE_RESIDENTS.length; t++) {
      const candidate = VILLAGE_RESIDENTS[(day * 11 + i * 17 + t * 5) % VILLAGE_RESIDENTS.length];
      if (!usedResidents.has(candidate.id)) {
        res = candidate;
        break;
      }
    }
    usedResidents.add(res.id);
    const house = VILLAGE_HOUSE_BY_ID[res.houseId] || VILLAGE_HOUSE_BY_ID['vh_01'];

    let pickedItem = pool[(day * 7 + i * 13) % pool.length];
    for (let k = 0; k < pool.length; k++) {
      const candidateItem = pool[(day * 7 + i * 13 + k) % pool.length];
      if (!usedItems.has(candidateItem.id)) {
        pickedItem = candidateItem;
        break;
      }
    }
    usedItems.add(pickedItem.id);

    const isArtisanOrFish =
      pickedItem.category === 'artisan' ||
      pickedItem.category === 'meat' ||
      pickedItem.category === 'fish' ||
      pickedItem.category === 'tree';
    const qty = isArtisanOrFish
      ? Math.min(pickedItem.category === 'meat' ? 2 : 4, 1 + Math.floor(level / 16) + (i === 2 ? 1 : 0))
      : Math.min(8, 2 + Math.floor(level / 10) + i);
    const baseValue = pickedItem.sellPrice * qty;
    const rewardCoins = Math.round(baseValue * 1.48) + 25 + level * 3;
    const rewardXp = Math.round(pickedItem.xpReward * qty * 1.35) + 30 + i * 15;
    const rewardReputation = i === 2 ? 6 : 4;

    const bonusSeed = i === 2 ? CATALOG.find((c) => c.category === 'crop' && c.unlockLevel <= level && c.seasons.includes(season)) : undefined;

    orders.push({
      id: `vb_${day}_${i}_${res.id}`,
      residentId: res.id,
      residentName: res.name,
      houseId: house.id,
      houseName: house.name,
      neighborId: res.neighborId,
      itemId: pickedItem.id,
      qty,
      rewardCoins,
      rewardXp,
      rewardReputation,
      ...(bonusSeed ? { bonusItemId: bonusSeed.id, bonusQty: 2 } : {}),
      completed: false,
    });
  }

  return orders;
}

export function createInitialVillageBoardState(
  day = 1,
  level = 1,
  season: Season = 'spring'
): VillageBoardState {
  return {
    lastGeneratedDay: day,
    orders: generateDailyVillageOrders(day, level, season),
    completedTotal: 0,
    dailyBonusClaimedDay: 0,
  };
}

export function getMaxMineStamina(level: number, pickaxeTier: 1 | 2 | 3 | 4 = 1): number {
  return Math.min(34, 18 + Math.floor(level / 8) + (pickaxeTier === 4 ? 4 : pickaxeTier >= 2 ? 2 : 0));
}

export function createInitialMineState(day = 1, level = 1): MineState {
  const maxStamina = getMaxMineStamina(level, 1);
  return {
    unlockedFloor: 1,
    currentFloor: 1,
    stamina: maxStamina,
    maxStamina,
    pickaxeTier: 1,
    ores: {},
    relics: {},
    discoveredRelics: [],
    totalRocksMined: 0,
    board: generateMineBoard(1),
    ladderRevealed: false,
    lastRefillDay: day,
  };
}

export function getHouseBonuses(house: HouseState) {
  let xpMult = 1.0;
  let sellMult = 1.0;
  let cropSpeedMult = 1.0;
  let mushroomSpeedMult = 1.0;
  let animalSpeedMult = 1.0;
  let warningExtraMs = 0;
  let disasterReduction = 0;
  let petSpeedMult = 1.0;
  let hasCistern = false;

  if (house.floors >= 2) sellMult += 0.12;
  if (house.floors >= 3) {
    xpMult += 0.18;
    disasterReduction += 2;
  }
  if (house.floors >= 4) {
    xpMult += 0.22;
    petSpeedMult += 0.25;
  }

  if (house.extras.includes('fireplace')) animalSpeedMult += 0.1;
  if (house.extras.includes('bay_greenhouse')) cropSpeedMult += 0.1;
  if (house.extras.includes('mushroom_cellar')) mushroomSpeedMult += 0.15;
  if (house.extras.includes('veranda')) sellMult += 0.1;
  if (house.extras.includes('weathervane')) warningExtraMs += 15000;
  if (house.extras.includes('rain_cistern')) hasCistern = true;
  if (house.extras.includes('crest')) xpMult += 0.15;
  if (house.extras.includes('bell_tower')) petSpeedMult += 0.25;
  if (house.extras.includes('alchemy_cellar')) sellMult += 0.15;
  if (house.extras.includes('master_library')) xpMult += 0.2;
  if (house.extras.includes('star_observatory')) {
    cropSpeedMult += 0.15;
    mushroomSpeedMult += 0.15;
    animalSpeedMult += 0.15;
  }

  return {
    xpMult,
    sellMult,
    cropSpeedMult,
    mushroomSpeedMult,
    animalSpeedMult,
    warningExtraMs,
    disasterReduction,
    petSpeedMult,
    hasCistern,
  };
}

export const ALMANAC_TRACKABLE_ITEMS = CATALOG.filter((item) =>
  (ALMANAC_TRACKABLE_CATEGORIES as readonly string[]).includes(item.category)
);

export function getAlmanacBonuses(almanac?: AlmanacState) {
  const discoveredSet = new Set(almanac?.discoveredIds || []);
  const unlockedCount = ALMANAC_TRACKABLE_ITEMS.filter((item) => discoveredSet.has(item.id)).length;
  const totalCount = ALMANAC_TRACKABLE_ITEMS.length;

  let sellMult = 1.0;
  let xpMult = 1.0;
  let craftSpeedMult = 1.0;
  let treeSpeedMult = 1.0;
  let fishBonus = 0;

  if (unlockedCount >= 5) sellMult += 0.05;
  if (unlockedCount >= 12) {
    xpMult += 0.08;
    craftSpeedMult += 0.1;
  }
  if (unlockedCount >= 20) {
    treeSpeedMult += 0.1;
    fishBonus += 0.08;
  }
  if (unlockedCount >= 30) {
    sellMult += 0.1;
    craftSpeedMult += 0.12;
  }
  if (unlockedCount >= 40) {
    xpMult += 0.12;
    treeSpeedMult += 0.15;
  }

  return {
    unlockedCount,
    totalCount,
    sellMult,
    xpMult,
    craftSpeedMult,
    treeSpeedMult,
    fishBonus,
  };
}

export function recordAlmanacDiscovery(
  almanac: AlmanacState | undefined,
  itemId: string
): { almanac: AlmanacState; isNew: boolean } {
  const base: AlmanacState = almanac || { discoveredIds: [], fishRecords: {} };
  const item = CATALOG_BY_ID[itemId];
  if (!item || !(ALMANAC_TRACKABLE_CATEGORIES as readonly string[]).includes(item.category)) {
    return { almanac: base, isNew: false };
  }
  if (base.discoveredIds.includes(itemId)) {
    return { almanac: base, isNew: false };
  }
  return {
    almanac: {
      ...base,
      discoveredIds: [...base.discoveredIds, itemId],
    },
    isNew: true,
  };
}

export function generateFishCatchMetrics(
  fishItem: CatalogItem,
  weather: WeatherType,
  fishingLevel: number,
  usedBait: boolean
): { cm: number; grams: number } {
  const minCm = fishItem.minCm ?? 15;
  const maxCm = fishItem.maxCm ?? 45;
  let ratio = Math.random() * 0.72 + Math.random() * 0.28; // bell-leaning roll
  if (weather === 'rainy' || weather === 'stormy') ratio += 0.08;
  if (usedBait) ratio += 0.09;
  ratio += Math.min(0.12, fishingLevel * 0.005);
  ratio = Math.max(0.05, Math.min(1.06, ratio)); // slight chance for trophy 106% specimen!

  const cm = Math.round((minCm + (maxCm - minCm) * ratio) * 10) / 10;
  const norm = Math.max(0.15, cm / Math.max(1, maxCm));
  const baseGrams = Math.max(180, fishItem.sellPrice * 16);
  const grams = Math.round(baseGrams * Math.pow(norm, 2.35) * (0.9 + Math.random() * 0.2));
  return { cm, grams };
}

export function calculateFarmCharm(tiles: TileData[][]): number {
  let charm = 0;
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const tile = tiles[y]?.[x];
      if (!tile?.unlocked || !tile.entity) continue;
      const item = CATALOG_BY_ID[tile.entity.itemId];
      if (item?.charmPoints) {
        charm += item.charmPoints;
      }
    }
  }
  return charm;
}

export function getDayInSeason(day: number): number {
  return ((Math.max(1, day) - 1) % DAYS_PER_SEASON) + 1;
}

export function getSeasonFairKey(day: number, season: Season): string {
  const yearCycle = Math.floor((Math.max(1, day) - 1) / (DAYS_PER_SEASON * 4)) + 1;
  return `y${yearCycle}_${season}`;
}

export function evaluateVillageFair(
  state: GameState,
  showcaseItemId?: string
): FairSubmissionResult {
  const farmCharm = calculateFarmCharm(state.tiles);
  const charmScore = Math.min(180, Math.round(farmCharm * 1.15));

  let neglectedCount = 0;
  let healthyActiveCount = 0;
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const tile = state.tiles[y]?.[x];
      if (!tile?.unlocked || !tile.entity) continue;
      if (tile.entity.damaged || tile.entity.withered) {
        neglectedCount += 1;
      } else if (
        tile.entity.category === 'crop' ||
        tile.entity.category === 'mushroom' ||
        tile.entity.category === 'tree' ||
        tile.entity.category === 'animal'
      ) {
        healthyActiveCount += 1;
      }
    }
  }
  const activeBonus = Math.min(15, healthyActiveCount * 2);
  const cleanlinessScore = Math.max(0, 45 + activeBonus - neglectedCount * 12);

  let produceScore = 0;
  let validItemId: string | undefined;
  if (showcaseItemId && (state.inventory[showcaseItemId] || 0) > 0) {
    const item = CATALOG_BY_ID[showcaseItemId];
    if (item) {
      validItemId = item.id;
      const categoryBonus =
        item.category === 'artisan'
          ? 24
          : item.category === 'tree' || item.category === 'meat'
          ? 20
          : item.category === 'fish'
          ? 16
          : 12;
      const seasonBonus = item.seasons.includes(state.season) ? 16 : 4;
      produceScore = Math.min(130, Math.round(item.sellPrice * 0.11) + categoryBonus + seasonBonus);
    }
  }

  const score = charmScore + cleanlinessScore + produceScore;
  const medal: FairMedal =
    score >= FAIR_MEDAL_THRESHOLDS.gold
      ? 'gold'
      : score >= FAIR_MEDAL_THRESHOLDS.silver
      ? 'silver'
      : 'bronze';

  const medalMult = medal === 'gold' ? 2.4 : medal === 'silver' ? 1.55 : 1.0;
  const rewardCoins = Math.round((160 + state.level * 28) * medalMult);
  const rewardXp = Math.round((95 + state.level * 14) * medalMult);
  const unlockedDecorId =
    medal === 'gold' ? 'fair_trophy' : medal === 'silver' ? 'fair_beer_table' : 'fair_pennant';

  return {
    season: state.season,
    day: state.day,
    score,
    charmScore,
    cleanlinessScore,
    produceScore,
    submittedItemId: validItemId,
    medal,
    rewardCoins,
    rewardXp,
    unlockedDecorId,
  };
}

const VISITOR_SHIRTS = ['#2563eb', '#dc2626', '#059669', '#d97706', '#7c3aed', '#0d9488', '#be185d'];
const VISITOR_HAIRS = ['#3f2e21', '#78350f', '#facc15', '#1e293b', '#b45309', '#94a3b8'];
const VISITOR_SKINS = ['#fde2c8', '#f5d0b5', '#e2b18d', '#b87d52'];
const VISITOR_FIRST_NAMES = [
  'Anna', 'Lukas', 'Mia', 'Jonas', 'Klara', 'Tim', 'Hannah', 'Paul',
  'Lina', 'Ben', 'Sophie', 'Felix', 'Nora', 'Jan', 'Laura', 'Moritz',
];

export const SHOP_ARCHETYPE_META: Record<
  ShopVisitorArchetype,
  { label: string; shortNote: string; badgeColor: string }
> = {
  wanderer: {
    label: 'Wanderer & Familie',
    shortNote: 'Gemischte Körbe (2–3 Sorten)',
    badgeColor: '#059669',
  },
  gourmet: {
    label: 'Feinschmecker',
    shortNote: 'Edle Spezialitäten & extra Trinkgeld',
    badgeColor: '#7c3aed',
  },
  bulk_buyer: {
    label: 'Dorfkoch / Vorratskäufer',
    shortNote: 'Große Mengen auf einen Schlag (3–7 Stk.)',
    badgeColor: '#d97706',
  },
  neighbor: {
    label: 'Nachbar aus dem Tal',
    shortNote: 'Schenkt +1 Freundschaft beim Kauf',
    badgeColor: '#be185d',
  },
};

export function getShopTrendContext(
  season: Season,
  weather: WeatherType
): { label: string; description: string; favoredIds: string[] } {
  if (weather === 'rainy' || weather === 'stormy') {
    return {
      label: 'Wärmendes bei Schmuddelwetter',
      description: 'Bei Regen & Sturm greifen Gäste vermehrt zu Gebäck, Ragout, Festtagsbraten, Chili- & Räucherware (+10 % Trendbonus).',
      favoredIds: [
        'farmhouse_bread',
        'potato_bread',
        'mushroom_ragout',
        'feast_lamb_ragout',
        'feast_chili_beef',
        'pumpkin_pie',
        'honey_cake',
        'chili_sauce',
        'chili_stout',
        'smoked_trout',
        'smoked_carp',
        'smoked_deluxe',
        'moonlight_essence',
      ],
    };
  }
  if (season === 'winter') {
    return {
      label: 'Winterliche Vorrats- & Festküche',
      description: 'Im Winter sind Gelee, Käse, Festtagsbraten, Räucherfisch & wärmende Spezialitäten besonders gefragt (+10 % Trendbonus).',
      favoredIds: [
        'frost_jelly',
        'honey_cake',
        'pumpkin_pie',
        'royal_feast_cake',
        'feast_roast_chicken',
        'feast_pork_knuckle',
        'feast_truffle_beef',
        'truffle_butter',
        'saffron_cheese',
        'smoked_carp',
        'smoked_deluxe',
        'apple_pie',
        'chili_stout',
      ],
    };
  }
  if (season === 'summer') {
    return {
      label: 'Sommer-Erfrischung & Brotzeit',
      description: 'Bei Sommerwärme landen kühle Getränke, Gurken, Konfitüren, Pfannengerichte & Hofkäse häufiger mehrfach im Korb (+10 % Trendbonus).',
      favoredIds: [
        'farm_beer',
        'nonalcoholic_beer',
        'apple_cider',
        'strawberry_jam',
        'cherry_jam',
        'pickled_cucumbers',
        'cream_cheese',
        'herb_goat_cheese',
        'pepper_chili_cheese',
        'feast_chili_beef',
        'feast_roast_chicken',
        'frost_jelly',
      ],
    };
  }
  if (season === 'autumn') {
    return {
      label: 'Herbst-Ernte & Wirtshauszeit',
      description: 'Im Herbst bevorzugen Gäste Kürbis-Tarte, Schweinshaxe, Trüffelbraten, Apfelwein, Ragout & Räucherwaren (+10 % Trendbonus).',
      favoredIds: [
        'pumpkin_pie',
        'apple_pie',
        'apple_cider',
        'mushroom_ragout',
        'feast_pork_knuckle',
        'feast_truffle_beef',
        'feast_lamb_ragout',
        'potato_bread',
        'carrot_pickles',
        'smoked_trout',
        'smoked_carp',
        'truffle_butter',
        'chili_sauce',
      ],
    };
  }
  return {
    label: 'Frühlingsfrische Landküche',
    description: 'Im Frühling greifen Dorfgäste gern zu Spargel-Quiche, Ofen-Ziegenbraten, Kräuterkäse & frischem Brot (+10 % Trendbonus).',
    favoredIds: [
      'asparagus_quiche',
      'feast_herb_goat',
      'feast_roast_chicken',
      'herb_goat_cheese',
      'cream_cheese',
      'strawberry_jam',
      'honey_cake',
      'farmhouse_bread',
      'carrot_pickles',
      'royal_feast_cake',
    ],
  };
}

export function createDailyShopSpecialOrder(
  day: number,
  level: number,
  season: Season,
  weather: WeatherType
): FarmShopSpecialOrder | null {
  const trend = getShopTrendContext(season, weather);
  const candidates = CATALOG.filter(
    (item) =>
      item.category === 'artisan' &&
      item.unlockLevel <= Math.max(4, level + 2)
  );
  if (candidates.length === 0) return null;

  const favoredPool = candidates.filter((c) => trend.favoredIds.includes(c.id));
  const pool = favoredPool.length > 0 && Math.random() < 0.7 ? favoredPool : candidates;
  const picked = pool[Math.floor(Math.random() * pool.length)];
  const qty = picked.sellPrice <= 500 ? 4 + Math.floor(Math.random() * 3) : picked.sellPrice <= 1100 ? 3 + Math.floor(Math.random() * 2) : 2;
  const rewardCoins = Math.round(picked.sellPrice * qty * 1.38);
  const rewardXp = Math.max(40, Math.round((picked.xpReward || 60) * qty * 0.45));
  const orderNames = ['Bäckerin Clara', 'Wirt Anton', 'Kräuterhexe Marlene', 'Schmied Hannes', 'Bürgermeister Otto'];
  return {
    id: `shop_order_d${day}_${picked.id}`,
    customerName: orderNames[(day + picked.id.length) % orderNames.length],
    itemId: picked.id,
    qty,
    rewardCoins,
    rewardXp,
    completed: false,
  };
}

export function createDailyShopTargetVisitors(
  season: Season,
  weather: WeatherType,
  farmCharm: number,
  stockedVariety = 0,
  reputation = 10
): number {
  let target = 23 + Math.floor(Math.random() * 11); // 23..33 basis from village
  if (season === 'spring' || season === 'summer') target += 4;
  if (weather === 'sunny') target += 3;
  if (weather === 'rainy' || weather === 'stormy') target -= 2;
  if (farmCharm >= 35) target += 3;
  if (farmCharm >= 80) target += 3;
  if (stockedVariety >= 4) target += 4;
  if (stockedVariety >= 8) target += 3;
  target += Math.floor(Math.max(0, Math.min(100, reputation)) / 15); // up to +6/+7 from reputation
  return Math.max(18, Math.min(50, target));
}

export function createInitialFarmShopState(): FarmShopState {
  return {
    stock: {},
    visitorsToday: 0,
    dailyTargetVisitors: createDailyShopTargetVisitors('spring', 'sunny', 0, 0, 10),
    spawnedToday: 0,
    nextVisitorMs: 5000,
    visitors: [],
    todayRevenue: 0,
    totalRevenue: 0,
    totalSoldCount: 0,
    totalVisitorsAllTime: 0,
    reputation: 10,
    autoRestock: false,
    autoRestockTarget: 6,
    specialOrder: createDailyShopSpecialOrder(1, 1, 'spring', 'sunny'),
    recentSales: [],
  };
}

export function buildMailboxSnapshot(
  day: number,
  stats: GameState['stats'],
  fishingTotalCaught: number,
  farmShop: FarmShopState
): MailboxSnapshot {
  return {
    day,
    totalHarvested: stats.totalHarvested || 0,
    totalCaught: fishingTotalCaught || 0,
    totalCrafted: stats.totalCrafted || 0,
    totalSoldCoins: stats.totalSoldCoins || 0,
    shopRevenue: farmShop.totalRevenue || 0,
    shopSoldCount: farmShop.totalSoldCount || 0,
    shopVisitorsAllTime: farmShop.totalVisitorsAllTime ?? farmShop.visitorsToday ?? 0,
    totalNeighborsHelped: stats.totalNeighborsHelped || 0,
  };
}

export function createInitialMailboxState(snapshot?: MailboxSnapshot): MailboxState {
  return {
    pendingMail: null,
    lastDeliveredDay: 0,
    postman: {
      active: false,
      x: 8.8,
      y: 3.0,
      phase: 'to_box',
      timerMs: 0,
      deliveredToday: false,
    },
    archive: [],
    lastSnapshot: snapshot || {
      day: 1,
      totalHarvested: 0,
      totalCaught: 0,
      totalCrafted: 0,
      totalSoldCoins: 0,
      shopRevenue: 0,
      shopSoldCount: 0,
      shopVisitorsAllTime: 0,
      totalNeighborsHelped: 0,
    },
  };
}

export const SANTA_FLIGHT_DURATION_MS = 3 * 60 * 1000;
export const SANTA_DROP_DELAY_MS = 16000;
export const FIREWORKS_DURATION_MS = 3 * 60 * 1000;

export function createInitialWinterFestivalState(): WinterFestivalState {
  return {
    lastSantaDay: 0,
    santaSleigh: null,
    droppedGifts: [],
    lastFireworksDay: 0,
    fireworks: null,
  };
}

export function pickRandomWinterGiftDecorId(): string {
  const pool = CATALOG.filter((item) => item.isGiftExclusive);
  if (pool.length === 0) return 'xmas_tree';
  return pool[Math.floor(Math.random() * pool.length)].id;
}

export function createNextFireCooldownMs(level = 1): number {
  if (level >= 200) {
    // Häufigere Brände ab Level 200 (~10 bis 18 Ingame-Stunden)
    return Math.round((0.42 + Math.random() * 0.36) * REAL_MS_PER_INGAME_DAY);
  }
  // 1 to 3 ingame days (1 ingame day = 2 real hours = 7,200,000 ms)
  return Math.round((1 + Math.random() * 2) * REAL_MS_PER_INGAME_DAY);
}

export function createInitialVillageFireState(): VillageFireState {
  return {
    active: false,
    houseId: '',
    houseName: '',
    causeTitle: '',
    causeDetail: '',
    startedAtTime: '08:00',
    totalMs: 0,
    remainingMs: 0,
    playerHelped: false,
    nextFireCooldownMs: createNextFireCooldownMs(1),
    sootHouseId: null,
    sootUntilDay: 0,
    pendingNewspaperReports: [],
  };
}

export function createInitialEconomyCrisisState(day = 1): EconomyCrisisState {
  return {
    lastInspectionDay: day,
    lastLevyCoins: 0,
    inspectionsTotal: 0,
  };
}

export function createInitialVillageBusinessesState(day = 1): VillageBusinessState {
  return {
    ownedIds: [],
    totalEarnedById: {},
    todayEarnedById: {},
    brokenById: {},
    outageCheckAccMs: 0,
    payoutAccMs: 0,
    lastPayoutDay: day,
  };
}

export function repairVillageBusiness(
  state: GameState,
  businessId: VillageBusinessId
): { ok: boolean; state: GameState; error?: string; cost?: number; spec?: VillageBusinessSpec } {
  const spec = VILLAGE_BUSINESS_BY_ID[businessId];
  if (!spec) return { ok: false, state, error: 'Betrieb nicht gefunden.' };
  const currentBiz = state.villageBusinesses || createInitialVillageBusinessesState(state.day);
  const brokenInfo = currentBiz.brokenById?.[businessId];
  if (!currentBiz.ownedIds.includes(businessId) || !brokenInfo) {
    return { ok: false, state, error: 'Dieser Betrieb hat aktuell keine Störung.' };
  }
  const cost = brokenInfo.repairCost || spec.repairCost;
  if (state.coins < cost) {
    return {
      ok: false,
      state,
      error: `Zu wenig Münzen (${cost.toLocaleString('de-DE')} M für die Reparatur benötigt).`,
    };
  }
  const nextBroken = { ...(currentBiz.brokenById || {}) };
  delete nextBroken[businessId];
  return {
    ok: true,
    cost,
    spec,
    state: {
      ...state,
      coins: state.coins - cost,
      villageBusinesses: {
        ...currentBiz,
        brokenById: nextBroken,
      },
      stats: {
        ...state.stats,
        totalRepairsPaid: (state.stats.totalRepairsPaid || 0) + 1,
        totalCrisesSurvived: (state.stats.totalCrisesSurvived || 0) + 1,
      },
    },
  };
}

export function purchaseVillageBusiness(
  state: GameState,
  businessId: VillageBusinessId
): { ok: boolean; state: GameState; error?: string; spec?: VillageBusinessSpec } {
  const spec = VILLAGE_BUSINESS_BY_ID[businessId];
  if (!spec) {
    return { ok: false, state, error: 'Betrieb nicht gefunden.' };
  }
  const currentBiz = state.villageBusinesses || createInitialVillageBusinessesState(state.day);
  if (currentBiz.ownedIds.includes(businessId)) {
    return { ok: false, state, error: 'Dieser Betrieb gehört dir bereits.' };
  }
  if (state.level < spec.minLevel) {
    return {
      ok: false,
      state,
      error: `Erst ab Hof-Level ${spec.minLevel} käuflich (aktuell Level ${state.level}).`,
    };
  }
  if (state.coins < spec.purchaseCost) {
    return {
      ok: false,
      state,
      error: `Zu wenig Münzen (${spec.purchaseCost.toLocaleString('de-DE')} M benötigt).`,
    };
  }

  const afterPurchase: GameState = {
    ...state,
    coins: state.coins - spec.purchaseCost,
    villageBusinesses: {
      ...currentBiz,
      ownedIds: [...currentBiz.ownedIds, businessId],
      totalEarnedById: { ...currentBiz.totalEarnedById },
      todayEarnedById: { ...currentBiz.todayEarnedById },
    },
  };
  const xpRes = addXpAndCheckLevelUp(afterPurchase, 1500);
  return { ok: true, state: xpRes.state, spec };
}

export function createInitialThemeParkState(day = 1): ThemeParkState {
  return {
    owned: false,
    attractions: [],
    todayEarned: 0,
    totalEarned: 0,
    payoutAccMs: 0,
    lastPayoutDay: day,
    breakdown: null,
  };
}

export function repairThemePark(
  state: GameState
): { ok: boolean; state: GameState; error?: string; cost?: number } {
  const park = state.themePark || createInitialThemeParkState(state.day);
  if (!park.owned || !park.breakdown) {
    return { ok: false, state, error: 'Im Abenteuerpark liegt aktuell keine Störung vor.' };
  }
  const cost = park.breakdown.repairCost;
  if (state.coins < cost) {
    return {
      ok: false,
      state,
      error: `Zu wenig Münzen (${cost.toLocaleString('de-DE')} M für die Park-Reparatur benötigt).`,
    };
  }
  return {
    ok: true,
    cost,
    state: {
      ...state,
      coins: state.coins - cost,
      themePark: {
        ...park,
        breakdown: null,
      },
      stats: {
        ...state.stats,
        totalRepairsPaid: (state.stats.totalRepairsPaid || 0) + 1,
        totalCrisesSurvived: (state.stats.totalCrisesSurvived || 0) + 1,
      },
    },
  };
}

export function purchaseThemePark(
  state: GameState
): { ok: boolean; state: GameState; error?: string } {
  const currentPark = state.themePark || createInitialThemeParkState(state.day);
  if (currentPark.owned) {
    return { ok: false, state, error: 'Der Freizeitpark gehört dir bereits.' };
  }
  if (state.level < THEME_PARK_UNLOCK_LEVEL) {
    return {
      ok: false,
      state,
      error: `Erst ab Hof-Level ${THEME_PARK_UNLOCK_LEVEL} käuflich (aktuell Level ${state.level}).`,
    };
  }
  if (state.coins < THEME_PARK_BASE_COST) {
    return {
      ok: false,
      state,
      error: `Zu wenig Münzen (${THEME_PARK_BASE_COST.toLocaleString('de-DE')} M benötigt).`,
    };
  }

  const nextPark: ThemeParkState = {
    ...currentPark,
    owned: true,
    purchasedAtDay: state.day,
    attractions: [...(currentPark.attractions || [])],
    lastPayoutDay: state.day,
  };
  const nextShop: FarmShopState = {
    ...state.farmShop,
    dailyTargetVisitors: (state.farmShop?.dailyTargetVisitors ?? 8) + THEME_PARK_BASE_VISITOR_BONUS,
  };

  const xpRes = addXpAndCheckLevelUp(
    {
      ...state,
      coins: state.coins - THEME_PARK_BASE_COST,
      themePark: nextPark,
      farmShop: nextShop,
    },
    2500
  );
  return { ok: true, state: xpRes.state };
}

export function buildThemeParkAttraction(
  state: GameState,
  attractionId: ThemeParkAttractionId
): { ok: boolean; state: GameState; error?: string; spec?: ThemeParkAttractionSpec } {
  const spec = THEME_PARK_ATTRACTION_BY_ID[attractionId];
  if (!spec) {
    return { ok: false, state, error: 'Attraktion nicht gefunden.' };
  }
  const currentPark = state.themePark || createInitialThemeParkState(state.day);
  if (!currentPark.owned) {
    return { ok: false, state, error: 'Kaufe zuerst den Grundpark ab Level 175.' };
  }
  const requiredLevel = Math.max(THEME_PARK_UNLOCK_LEVEL, spec.minLevel ?? THEME_PARK_UNLOCK_LEVEL);
  if (state.level < requiredLevel) {
    return {
      ok: false,
      state,
      error: `Erst ab Hof-Level ${requiredLevel} verfügbar.`,
    };
  }
  if ((currentPark.attractions || []).includes(attractionId)) {
    return { ok: false, state, error: 'Diese Attraktion wurde bereits errichtet.' };
  }
  if (state.coins < spec.cost) {
    return {
      ok: false,
      state,
      error: `Zu wenig Münzen (${spec.cost.toLocaleString('de-DE')} M benötigt).`,
    };
  }

  const nextPark: ThemeParkState = {
    ...currentPark,
    attractions: [...(currentPark.attractions || []), attractionId],
  };
  const nextShop: FarmShopState = {
    ...state.farmShop,
    dailyTargetVisitors: (state.farmShop?.dailyTargetVisitors ?? 8) + spec.shopVisitorBonus,
  };

  const xpRes = addXpAndCheckLevelUp(
    {
      ...state,
      coins: state.coins - spec.cost,
      themePark: nextPark,
      farmShop: nextShop,
    },
    spec.xpReward
  );
  return { ok: true, state: xpRes.state, spec };
}

export function createInitialRomanceState(): RomanceState {
  return {
    status: 'single',
    pendingSpark: null,
    partnerId: null,
    affection: 0,
    lastGiftDay: 0,
    lastDateDay: 0,
    lastHelpDay: 0,
    datesCount: 0,
    giftsCount: 0,
    cooldownUntilDay: 0,
    partnerX: 4.8,
    partnerY: 3.4,
    pendingNewspaperWedding: null,
  };
}

export function getPartnerBonuses(romance?: RomanceState): {
  partnerSpec: RomanceCandidateSpec | null;
  xpMult: number;
  sellMult: number;
  shopTipBonus: number;
} {
  if (!romance || romance.status !== 'married' || !romance.partnerId) {
    return { partnerSpec: null, xpMult: 1, sellMult: 1, shopTipBonus: 0 };
  }
  const spec = ROMANCE_CANDIDATE_BY_ID[romance.partnerId] || null;
  if (!spec) {
    return { partnerSpec: null, xpMult: 1, sellMult: 1, shopTipBonus: 0 };
  }
  return {
    partnerSpec: spec,
    xpMult: 1 + spec.xpBonusPct / 100,
    sellMult: 1 + spec.sellPriceBonusPct / 100,
    shopTipBonus: spec.shopTipBonusPct / 100,
  };
}

export function tryTriggerOrganicRomanceSpark(
  state: GameState,
  eventLabel: string,
  chance: number
): { state: GameState; sparkedCandidate?: RomanceCandidateSpec } {
  const r = state.romance || createInitialRomanceState();
  if (state.level < ROMANCE_UNLOCK_LEVEL) return { state };
  if (r.status !== 'single' || r.pendingSpark) return { state };
  if (state.day < (r.cooldownUntilDay || 0)) return { state };
  if (Math.random() > chance) return { state };

  const candidate =
    ROMANCE_CANDIDATES[Math.floor(Math.random() * ROMANCE_CANDIDATES.length)] || ROMANCE_CANDIDATES[0];
  const quote =
    candidate.eventQuotes[Math.floor(Math.random() * candidate.eventQuotes.length)] ||
    candidate.eventQuotes[0];

  return {
    state: {
      ...state,
      romance: {
        ...r,
        pendingSpark: {
          candidateId: candidate.id,
          eventLabel,
          quote,
          sparkedDay: state.day,
        },
      },
    },
    sparkedCandidate: candidate,
  };
}

export function triggerRomanceSparkForced(
  state: GameState,
  eventLabel = 'Saison-Dorffest (Vorschau-Test)'
): { state: GameState; candidate: RomanceCandidateSpec } {
  const r = state.romance || createInitialRomanceState();
  const pool = ROMANCE_CANDIDATES.filter((c) => c.id !== r.partnerId);
  const pickFrom = pool.length > 0 ? pool : ROMANCE_CANDIDATES;
  const candidate = pickFrom[Math.floor(Math.random() * pickFrom.length)] || ROMANCE_CANDIDATES[0];
  const quote =
    candidate.eventQuotes[Math.floor(Math.random() * candidate.eventQuotes.length)] ||
    candidate.eventQuotes[0];

  return {
    state: {
      ...state,
      romance: {
        ...r,
        status: r.status === 'married' ? 'single' : r.status,
        partnerId: r.status === 'married' ? null : r.partnerId,
        affection: r.status === 'married' ? 0 : r.affection,
        pendingSpark: {
          candidateId: candidate.id,
          eventLabel,
          quote,
          sparkedDay: state.day,
        },
      },
    },
    candidate,
  };
}

export function acceptRomanceSpark(state: GameState): { state: GameState; candidate?: RomanceCandidateSpec } {
  const r = state.romance || createInitialRomanceState();
  if (!r.pendingSpark) return { state };
  const candidate = ROMANCE_CANDIDATE_BY_ID[r.pendingSpark.candidateId] || ROMANCE_CANDIDATES[0];
  return {
    state: {
      ...state,
      romance: {
        ...r,
        status: 'crush',
        partnerId: candidate.id,
        affection: 25,
        pendingSpark: null,
        cooldownUntilDay: 0,
      },
    },
    candidate,
  };
}

export function declineRomanceSpark(state: GameState): GameState {
  const r = state.romance || createInitialRomanceState();
  if (!r.pendingSpark) return state;
  return {
    ...state,
    romance: {
      ...r,
      pendingSpark: null,
      cooldownUntilDay: state.day + 2,
    },
  };
}

export function giveRomanceFavoriteGift(
  state: GameState,
  itemId: string
): { ok: boolean; state: GameState; affectionGain?: number; error?: string } {
  const r = state.romance || createInitialRomanceState();
  if (r.status === 'single' || !r.partnerId) {
    return { ok: false, state, error: 'Du hast aktuell keinen Schwarm oder Partner.' };
  }
  if (r.lastGiftDay === state.day) {
    return { ok: false, state, error: 'Du hast heute bereits ein Herzensgeschenk überreicht.' };
  }
  const spec = ROMANCE_CANDIDATE_BY_ID[r.partnerId];
  if (!spec) return { ok: false, state, error: 'Partner nicht gefunden.' };
  if ((state.inventory[itemId] || 0) < 1) {
    return { ok: false, state, error: 'Dieses Geschenk hast du nicht im Inventar.' };
  }

  const isFav = spec.favoriteGiftIds.includes(itemId);
  const gain = isFav ? 18 : 10;
  const nextInventory = {
    ...state.inventory,
    [itemId]: Math.max(0, (state.inventory[itemId] || 0) - 1),
  };

  const xpRes = addXpAndCheckLevelUp(
    {
      ...state,
      inventory: nextInventory,
      romance: {
        ...r,
        affection: Math.min(100, r.affection + gain),
        lastGiftDay: state.day,
        giftsCount: (r.giftsCount || 0) + 1,
      },
    },
    isFav ? 120 : 60
  );

  return { ok: true, state: xpRes.state, affectionGain: gain };
}

export function goOnRomanceDate(
  state: GameState,
  dateId: RomanceDateId
): { ok: boolean; state: GameState; xpReward?: number; affectionGain?: number; error?: string } {
  const r = state.romance || createInitialRomanceState();
  if (r.status === 'single' || !r.partnerId) {
    return { ok: false, state, error: 'Du bist aktuell mit niemandem verabredet.' };
  }
  if (r.lastDateDay === state.day) {
    return { ok: false, state, error: 'Ihr hattet heute bereits ein wunderschönes Date!' };
  }
  const dateSpec = ROMANCE_DATES.find((d) => d.id === dateId);
  if (!dateSpec) {
    return { ok: false, state, error: 'Date-Ort nicht gefunden.' };
  }
  if (dateSpec.requiresThemePark && !state.themePark?.owned) {
    return { ok: false, state, error: 'Erfordert den eröffneten Abenteuerpark Sonnental (ab Lvl 175).' };
  }
  if (state.coins < dateSpec.costCoins) {
    return {
      ok: false,
      state,
      error: `Zu wenig Münzen (${dateSpec.costCoins.toLocaleString('de-DE')} M benötigt).`,
    };
  }

  const xpRes = addXpAndCheckLevelUp(
    {
      ...state,
      coins: state.coins - dateSpec.costCoins,
      romance: {
        ...r,
        affection: Math.min(100, r.affection + dateSpec.affectionGain),
        lastDateDay: state.day,
        datesCount: (r.datesCount || 0) + 1,
      },
    },
    dateSpec.xpReward
  );

  return {
    ok: true,
    state: xpRes.state,
    xpReward: dateSpec.xpReward,
    affectionGain: dateSpec.affectionGain,
  };
}

export function marryRomancePartner(
  state: GameState,
  bypassAffection = false
): { ok: boolean; state: GameState; candidate?: RomanceCandidateSpec; error?: string } {
  const r = state.romance || createInitialRomanceState();
  let partnerId = r.partnerId || r.pendingSpark?.candidateId || null;
  if (!partnerId && bypassAffection) {
    partnerId = ROMANCE_CANDIDATES[0].id;
  }
  if (!partnerId) {
    return { ok: false, state, error: 'Wähle zuerst jemanden zum Kennenlernen aus.' };
  }
  if (r.status === 'married') {
    return { ok: false, state, error: 'Ihr seid bereits glücklich verheiratet!' };
  }
  if (!bypassAffection && r.affection < 100) {
    return {
      ok: false,
      state,
      error: `Ihr braucht 100 % Zuneigung für den Antrag (aktuell ${r.affection} %).`,
    };
  }
  const candidate = ROMANCE_CANDIDATE_BY_ID[partnerId];
  if (!candidate) {
    return { ok: false, state, error: 'Kandidat nicht gefunden.' };
  }

  const weddingReport: RomanceWeddingReport = {
    id: `wed_${state.day}_${Date.now()}`,
    day: state.day,
    partnerName: candidate.name,
    partnerRole: candidate.role,
    farmName: state.avatar?.farmName || 'Sonnenhof',
  };

  const xpRes = addXpAndCheckLevelUp(
    {
      ...state,
      romance: {
        ...r,
        status: 'married',
        pendingSpark: null,
        partnerId: candidate.id,
        affection: 100,
        marriedDay: state.day,
        partnerX: 4.8,
        partnerY: 3.4,
        morningSurpriseText: `${candidate.name} ist frisch bei dir im Bauernhaus eingezogen!`,
        pendingNewspaperWedding: weddingReport,
      },
      eventState: {
        ...state.eventState,
        points: state.eventState.points + 250,
      },
    },
    2500
  );

  return { ok: true, state: xpRes.state, candidate };
}

export function breakupRomance(state: GameState): GameState {
  const r = state.romance || createInitialRomanceState();
  return {
    ...state,
    romance: {
      ...createInitialRomanceState(),
      cooldownUntilDay: state.day + 1,
      datesCount: r.datesCount || 0,
      giftsCount: r.giftsCount || 0,
    },
  };
}

function generateDailyMailDelivery(params: {
  day: number;
  season: Season;
  weather: WeatherType;
  level: number;
  ingameMinutes: number;
  marketHotItems: string[];
  marketCrashedItems?: string[];
  neighbors: NeighborNPC[];
  prevSnapshot: MailboxSnapshot;
  currentSnapshot: MailboxSnapshot;
  farmShop: FarmShopState;
  fireReports?: VillageFireReport[];
  weddingReports?: RomanceWeddingReport[];
}): { pendingMail: PendingMail; issue: NewspaperIssue } {
  const {
    day,
    season,
    weather,
    level,
    ingameMinutes,
    marketHotItems,
    marketCrashedItems = [],
    neighbors,
    prevSnapshot,
    currentSnapshot,
    farmShop,
    fireReports = [],
    weddingReports = [],
  } = params;

  const harvest24h = Math.max(0, currentSnapshot.totalHarvested - prevSnapshot.totalHarvested);
  const fish24h = Math.max(0, currentSnapshot.totalCaught - prevSnapshot.totalCaught);
  const crafted24h = Math.max(0, currentSnapshot.totalCrafted - prevSnapshot.totalCrafted);
  const soldCoins24h = Math.max(0, currentSnapshot.totalSoldCoins - prevSnapshot.totalSoldCoins);
  const shopRevenue24h = Math.max(0, currentSnapshot.shopRevenue - prevSnapshot.shopRevenue);
  const shopSold24h = Math.max(0, currentSnapshot.shopSoldCount - prevSnapshot.shopSoldCount);
  const shopVisitors24h = Math.max(0, currentSnapshot.shopVisitorsAllTime - prevSnapshot.shopVisitorsAllTime);
  const neighborHelps24h = Math.max(0, currentSnapshot.totalNeighborsHelped - prevSnapshot.totalNeighborsHelped);

  // Best seller in Hofladen over recent day
  const salesCounts: Record<string, number> = {};
  (farmShop.recentSales || [])
    .filter((s) => s.day >= Math.max(1, day - 1))
    .forEach((s) => {
      salesCounts[s.itemId] = (salesCounts[s.itemId] || 0) + s.qty;
    });
  let bestSellerItemId: string | undefined;
  let bestCount = 0;
  Object.entries(salesCounts).forEach(([id, count]) => {
    if (count > bestCount) {
      bestCount = count;
      bestSellerItemId = id;
    }
  });

  // Build small seasonal & level-appropriate reward bundle (2-3 items)
  const rewards: MailRewardItem[] = [];
  const seasonalSeeds = CATALOG.filter(
    (item) =>
      (item.category === 'crop' || item.category === 'mushroom') &&
      !item.isEventExclusive &&
      !item.isMerchantExclusive &&
      !item.isFairExclusive &&
      item.seedCost > 0 &&
      item.unlockLevel <= level &&
      item.seasons.includes(season)
  );
  const fallbackSeeds = CATALOG.filter(
    (item) =>
      item.category === 'crop' &&
      !item.isEventExclusive &&
      !item.isMerchantExclusive &&
      !item.isFairExclusive &&
      item.seedCost > 0 &&
      item.unlockLevel <= level
  );
  const seedPool = seasonalSeeds.length > 0 ? seasonalSeeds : fallbackSeeds;
  if (seedPool.length > 0) {
    const primarySeed = seedPool[Math.floor(Math.random() * seedPool.length)];
    const qty = primarySeed.seedCost <= 25 ? 4 : primarySeed.seedCost <= 65 ? 3 : 2;
    rewards.push({
      kind: 'seed',
      itemId: primarySeed.id,
      qty,
      label: `${qty}× ${primarySeed.name}-Saat`,
    });
    if (seedPool.length > 1 && Math.random() < 0.55) {
      const others = seedPool.filter((i) => i.id !== primarySeed.id);
      const second = others[Math.floor(Math.random() * others.length)];
      if (second) {
        const qty2 = second.seedCost <= 30 ? 3 : 2;
        rewards.push({
          kind: 'seed',
          itemId: second.id,
          qty: qty2,
          label: `${qty2}× ${second.name}-Saat`,
        });
      }
    }
  }

  // Secondary farm support gift
  const roll = Math.random();
  if (level >= FISHING_UNLOCK_LEVEL && roll < 0.35) {
    const baitQty = level >= 35 ? 2 : 1;
    rewards.push({
      kind: 'bait',
      qty: baitQty,
      label: `${baitQty}× Profi-Angelköder`,
    });
  } else if (level >= 14 && roll >= 0.35 && roll < 0.52) {
    rewards.push({
      kind: 'elixir',
      qty: 1,
      label: '1× Wachstums-Elixier',
    });
  } else if (roll >= 0.52 && roll < 0.8) {
    const fertQty = level >= 20 ? 3 : 2;
    rewards.push({
      kind: 'fertilizer',
      qty: fertQty,
      label: `${fertQty}× Hof-Dünger`,
    });
  } else {
    const coinGift = 35 + Math.min(250, level * 6);
    rewards.push({
      kind: 'coins',
      qty: coinGift,
      label: `+${coinGift} Münzen Post-Prämie`,
    });
  }

  // Friendly sender note
  const friendlyNeighbor = [...neighbors].sort((a, b) => b.friendship - a.friendship)[0];
  const senderNote =
    friendlyNeighbor && friendlyNeighbor.friendship >= 25
      ? `Herzliche Grüße von ${friendlyNeighbor.name} und dem Postamt Sonnental! Hier ist deine frische Tagesausgabe samt Hof-Päckchen.`
      : 'Das Postamt Sonnental wünscht einen ertragreichen Tag! Anbei deine Hof-Statistik der letzten 24 Stunden und eine kleine Aussaat-Überraschung.';

  // Dynamic newspaper headline & tip
  const dayInSeason = getDayInSeason(day);
  let headline = `Ruhiger Morgen im ${SEASON_LABELS[season]}: Höfe im Sonnental starten in Tag ${day}`;
  if (weddingReports.length > 0) {
    const wRep = weddingReports[0];
    headline = `Traumhochzeit im Sonnental: ${wRep.partnerName} zieht auf den Hof „${wRep.farmName}“!`;
  } else if (dayInSeason === DAYS_PER_SEASON) {
    headline = `Heute großes ${SEASON_LABELS[season]}-Dorffest! Die Jury prüft Charme & Prämien-Waren`;
  } else if (shopSold24h >= 5 || shopRevenue24h >= 400) {
    headline = `Ansturm auf den Hofladen: ${shopVisitors24h} Besucher kaufen ${shopSold24h} veredelte Waren!`;
  } else if (harvest24h >= 12) {
    headline = `Rekordernte im Tal: ${harvest24h} frische Erzeugnisse in den letzten 24 Stunden eingebracht!`;
  } else if (fish24h >= 5) {
    headline = `Petri Heil am Talbach: ${fish24h} frische Fänge beflügeln den Dorfmarkt`;
  } else if (crafted24h >= 4) {
    headline = `Duft aus Backofen & Käserei: ${crafted24h} Veredelungen erfolgreich hergestellt`;
  } else if (fireReports.length > 0) {
    const latestFire = fireReports[0];
    headline = `Feuerwehreinsatz im Dorf: Brand bei „${latestFire.houseName}“ gelöscht!`;
  }

  const hotNames = marketHotItems
    .slice(0, 3)
    .map((id) => CATALOG_BY_ID[id]?.produceName || CATALOG_BY_ID[id]?.name)
    .filter(Boolean)
    .join(', ');
  const crashNames = marketCrashedItems
    .slice(0, 3)
    .map((id) => CATALOG_BY_ID[id]?.produceName || CATALOG_BY_ID[id]?.name)
    .filter(Boolean)
    .join(', ');
  const tip =
    dayInSeason === DAYS_PER_SEASON
      ? 'Dorffest-Tipp: Stelle heute ein hochwertiges Prämien-Produkt im Dorffest-Menü vor – Medaillen bringen schicke Deko!'
      : crashNames
      ? `Marktwarnung (-30 % Preissturz): ${crashNames} heute möglichst lagern! Gefragt (+30 %): ${hotNames || 'Saisonware'}.`
      : hotNames
      ? `Markt-Tipp (+30 % heute): ${hotNames} erzielen heute beim Verkauf Spitzenpreise!`
      : `Wetter-Tipp (${WEATHER_META[weather].label}): ${WEATHER_META[weather].effectText}.`;

  const deliveredAtTime = formatIngameTime(ingameMinutes);
  const issue: NewspaperIssue = {
    id: `paper_day_${day}_${Date.now()}`,
    day,
    season,
    weather,
    deliveredAtTime,
    headline,
    tip,
    harvest24h,
    fish24h,
    crafted24h,
    soldCoins24h,
    shopRevenue24h,
    shopSold24h,
    shopVisitors24h,
    neighborHelps24h,
    bestSellerItemId,
    hotItemIds: [...marketHotItems],
    crashedItemIds: marketCrashedItems.length > 0 ? [...marketCrashedItems] : undefined,
    fireReports: fireReports.length > 0 ? [...fireReports] : undefined,
    weddingReports: weddingReports.length > 0 ? [...weddingReports] : undefined,
  };

  const pendingMail: PendingMail = {
    day,
    deliveredAtTime,
    title: `Tagespost · Tag ${day} (${SEASON_LABELS[season]})`,
    senderNote,
    rewards,
    issue,
  };

  return { pendingMail, issue };
}

export function pickWeatherForSeason(season: Season): WeatherType {
  const roll = Math.random();
  switch (season) {
    case 'spring':
      if (roll < 0.36) return 'sunny';
      if (roll < 0.65) return 'rainy';
      if (roll < 0.85) return 'cloudy';
      return 'foggy';
    case 'summer':
      if (roll < 0.48) return 'sunny';
      if (roll < 0.68) return 'windy';
      if (roll < 0.85) return 'cloudy';
      if (roll < 0.94) return 'rainy';
      return 'stormy';
    case 'autumn':
      if (roll < 0.25) return 'cloudy';
      if (roll < 0.55) return 'rainy';
      if (roll < 0.82) return 'foggy';
      if (roll < 0.94) return 'windy';
      return 'sunny';
    case 'winter':
      if (roll < 0.45) return 'frost';
      if (roll < 0.75) return 'cloudy';
      if (roll < 0.9) return 'foggy';
      return 'sunny';
  }
}

export function generateRandomRegionDensities(): Record<FishingRegionId, FishDensity> {
  const pool: FishDensity[] = ['none', 'low', 'medium', 'high'];
  const pick = () => pool[Math.floor(Math.random() * pool.length)];
  const result: Record<FishingRegionId, FishDensity> = {
    north: pick(),
    middle: pick(),
    south: pick(),
  };
  // Shuffle guaranteed good spot + varied other spots so fishing hotspots shift naturally
  const regions: FishingRegionId[] = ['north', 'middle', 'south'];
  const best = regions[Math.floor(Math.random() * regions.length)];
  result[best] = Math.random() < 0.72 ? 'high' : 'medium';
  return result;
}

export function generateHotMarketItems(season: Season, level = 1): string[] {
  const basePool = CATALOG.filter(
    (i) =>
      i.category !== 'decoration' &&
      isOrderEligibleCatalogItem(i, season) &&
      i.unlockLevel <= level &&
      (i.category !== 'fish' || level >= FISHING_UNLOCK_LEVEL) &&
      (i.category !== 'artisan' || level >= 3) &&
      (i.category !== 'meat' || level >= 3)
  );
  const preferred = basePool.filter(
    (i) =>
      i.seasons.includes(season) ||
      i.category === 'animal' ||
      i.category === 'artisan' ||
      i.category === 'meat' ||
      i.category === 'fish'
  );
  const chosen: CatalogItem[] = [...preferred].sort(() => Math.random() - 0.5).slice(0, 3);
  if (chosen.length < 3) {
    const chosenIds = new Set(chosen.map((c) => c.id));
    const fallback = [...basePool]
      .filter((i) => !chosenIds.has(i.id))
      .sort(() => Math.random() - 0.5);
    chosen.push(...fallback.slice(0, 3 - chosen.length));
  }
  return chosen.map((i) => i.id);
}

export function generateCrashedMarketItems(
  season: Season,
  level = 1,
  excludeHotIds: string[] = []
): string[] {
  if (level < 150) return [];
  const hotSet = new Set(excludeHotIds);
  const pool = CATALOG.filter(
    (i) =>
      i.category !== 'decoration' &&
      isOrderEligibleCatalogItem(i, season) &&
      !hotSet.has(i.id) &&
      i.unlockLevel <= level &&
      (i.category !== 'fish' || level >= FISHING_UNLOCK_LEVEL) &&
      (i.seasons.includes(season) || i.category === 'artisan' || i.category === 'tree' || i.category === 'fish')
  );
  const count = level >= 225 ? 3 : level >= 200 ? 2 : 1;
  return [...pool]
    .sort(() => Math.random() - 0.5)
    .slice(0, count)
    .map((i) => i.id);
}

export function getMarketCrashMult(state: Pick<GameState, 'marketCrashedItems'>, itemId: string): number {
  return (state.marketCrashedItems || []).includes(itemId) ? 0.7 : 1.0;
}

export function generateMarketOrders(level: number, season: Season): MarketOrder[] {
  const names = ['Bäckerin Martha', 'Wirt Anton', 'Kräuterfrau Berta', 'Schmied Karl', 'Schneiderin Paula'];
  const eligible = CATALOG.filter(
    (item) =>
      item.category !== 'decoration' &&
      isOrderEligibleCatalogItem(item, season) &&
      (item.category !== 'fish' || level >= FISHING_UNLOCK_LEVEL) &&
      (item.category !== 'artisan' || level >= 3) &&
      (item.category !== 'meat' || level >= 3) &&
      item.unlockLevel <= level + 1 &&
      (item.seasons.includes(season) ||
        item.category === 'animal' ||
        item.category === 'fish' ||
        item.category === 'artisan' ||
        item.category === 'meat')
  );
  const chosen = [...eligible].sort(() => Math.random() - 0.5).slice(0, 3);
  return chosen.map((item, idx) => {
    const scaleQty = Math.min(6, Math.floor(level / 8));
    const baseQty =
      item.category === 'artisan' || item.category === 'meat' || item.growthMs > 10 * 60 * 1000
        ? 1 + (idx % 2)
        : Math.floor(Math.random() * 3) + 2;
    const qty =
      item.category === 'meat'
        ? Math.min(2, baseQty)
        : item.category === 'artisan'
        ? Math.min(3, baseQty)
        : baseQty + scaleQty;
    return {
      id: `order_${Date.now()}_${idx}`,
      customerName: names[(idx + level) % names.length],
      itemId: item.id,
      qty,
      rewardCoins: Math.round(item.sellPrice * qty * 1.48),
      rewardXp: Math.round(item.xpReward * qty * 1.4),
      completed: false,
    };
  });
}

export function generateMerchantVisit(level: number, season: Season): WanderingMerchantState {
  const decorPool = ['wooden_bench', 'garden_pond', 'bee_wagon'];
  const pickedDecorId = decorPool[Math.floor(Math.random() * decorPool.length)];
  const decorItem = CATALOG_BY_ID[pickedDecorId];

  const rareSeedPool = CATALOG.filter(
    (c) =>
      (c.category === 'crop' || c.category === 'mushroom') &&
      !c.isMerchantExclusive &&
      c.unlockLevel <= Math.max(4, level + 2) &&
      !c.seasons.includes(season)
  );
  const fallbackSeedPool = CATALOG.filter((c) => (c.category === 'crop' || c.category === 'mushroom') && c.unlockLevel <= Math.max(3, level));
  const seedPool = rareSeedPool.length > 0 ? rareSeedPool : fallbackSeedPool;
  const specialSeed = seedPool[Math.floor(Math.random() * seedPool.length)] || CATALOG_BY_ID.glowmorel;

  const offers: MerchantOffer[] = [
    {
      id: `mo_bait_${Date.now()}`,
      kind: 'bait',
      title: 'Profi-Angelköder (5×)',
      description: 'Verbessert deine nächsten 5 Angelwürfe: +35 % Bisschance, kürzere Wartezeit & seltenere Fische.',
      qty: 5,
      costCoins: 130,
      stock: 3,
    },
    {
      id: `mo_elixir_${Date.now()}`,
      kind: 'elixir',
      title: 'Wachstums-Elixier',
      description: 'Wandert in deinen Rucksack [I] und lässt dort per Klick alle wachsenden Kulturen & Tiere um +45 % wachsen!',
      qty: 1,
      costCoins: 190 + Math.min(220, level * 8),
      stock: 2,
    },
    {
      id: `mo_fert_${Date.now()}`,
      kind: 'fertilizer',
      title: 'Händler-Düngerpaket (4×)',
      description: '4 Säcke feinster Nährstoff-Dünger zum Vorzugspreis.',
      qty: 4,
      costCoins: 110,
      stock: 2,
    },
    {
      id: `mo_decor_${Date.now()}`,
      kind: 'item',
      title: decorItem.name,
      description: decorItem.description,
      itemId: decorItem.id,
      qty: 1,
      costCoins: decorItem.seedCost,
      stock: 2,
    },
    {
      id: `mo_seed_${Date.now()}`,
      kind: 'item',
      title: `Reise-Paket: 3× ${specialSeed.name}`,
      description: `Seltener Reise-Vorrat direkt aus fernen Tälern (${specialSeed.name}).`,
      itemId: specialSeed.id,
      qty: 3,
      costCoins: Math.max(40, Math.round(specialSeed.seedCost * 3 * 0.85)),
      stock: 2,
    },
  ];

  const tradePools: Omit<MerchantTrade, 'id' | 'completed'>[] = [
    {
      title: 'Frische Hofware gegen Dünger',
      giveItemId: 'radish',
      giveQty: 4,
      rewardKind: 'fertilizer',
      rewardQty: 3,
    },
    {
      title: 'Pilz-Tausch gegen Angelköder',
      giveItemId: 'champignon',
      giveQty: 3,
      rewardKind: 'bait',
      rewardQty: 5,
    },
    {
      title: 'Landeier gegen Holzbank-Deko',
      giveItemId: 'chicken',
      giveQty: 3,
      rewardKind: 'item',
      rewardItemId: 'wooden_bench',
      rewardQty: 1,
    },
    {
      title: 'Weizen-Lieferung gegen Münzen',
      giveItemId: 'wheat',
      giveQty: 4,
      rewardKind: 'coins',
      rewardQty: 1,
      rewardCoins: 260,
    },
  ];

  if (level >= FISHING_UNLOCK_LEVEL) {
    tradePools.push({
      title: 'Frischfisch gegen Seerosenteich',
      giveItemId: 'fish_perch',
      giveQty: 3,
      rewardKind: 'item',
      rewardItemId: 'garden_pond',
      rewardQty: 1,
    });
  }

  const pickedTrades = [...tradePools]
    .sort(() => Math.random() - 0.5)
    .slice(0, 2)
    .map((tr, i) => ({
      ...tr,
      id: `trade_${Date.now()}_${i}`,
      completed: false,
    }));

  return {
    active: true,
    remainingMs: 6 * 60 * 1000,
    cooldownMs: 0,
    offers,
    trades: pickedTrades,
  };
}

export function getNeighborRequestStepMeta(stepIndex: number): {
  stepNumber: number;
  label: string;
  coinMult: number;
  xpMult: number;
  friendshipGain: number;
  eventPoints: number;
  bonusFertilizer: number;
} {
  const clamped = Math.max(0, Math.min(MAX_NEIGHBOR_REQUESTS_PER_DAY - 1, stepIndex));
  if (clamped === 0) {
    return {
      stepNumber: 1,
      label: 'Bitte 1/3 · Einstieg',
      coinMult: 1.45,
      xpMult: 1.35,
      friendshipGain: 10,
      eventPoints: 20,
      bonusFertilizer: 0,
    };
  }
  if (clamped === 1) {
    return {
      stepNumber: 2,
      label: 'Bitte 2/3 · Größerer Wunsch',
      coinMult: 1.72,
      xpMult: 1.7,
      friendshipGain: 12,
      eventPoints: 30,
      bonusFertilizer: 0,
    };
  }
  return {
    stepNumber: 3,
    label: 'Bitte 3/3 · Tages-Finale',
    coinMult: 2.05,
    xpMult: 2.15,
    friendshipGain: 18,
    eventPoints: 45,
    bonusFertilizer: 1,
  };
}

export function buildScaledNeighborRequest(
  npc: NeighborNPC,
  level: number,
  season: Season,
  stepIndex: number
): Pick<NeighborNPC, 'requestItemId' | 'requestQty' | 'rewardCoins' | 'rewardXp'> {
  const eligible = CATALOG.filter(
    (item) =>
      item.category !== 'decoration' &&
      isOrderEligibleCatalogItem(item, season) &&
      item.unlockLevel <= level &&
      (item.category !== 'fish' || level >= FISHING_UNLOCK_LEVEL) &&
      (item.seasons.includes(season) || item.category === 'animal' || item.category === 'fish')
  );

  const themeFilter = (itemId: string, category: string) => {
    if (npc.farmTheme === 'orchard') return category === 'crop';
    if (npc.farmTheme === 'mushroom') return category === 'mushroom';
    if (npc.farmTheme === 'apiary') {
      return ['bee', 'radish', 'sunflower', 'blueberry', 'golden_hops', 'chicken', 'sheep'].includes(itemId);
    }
    return ['wheat', 'corn', 'chicken', 'cow', 'goat', 'pig'].includes(itemId) || category === 'fish';
  };

  let pool = eligible.filter((i) => themeFilter(i.id, i.category));
  if (pool.length === 0) pool = eligible;
  if (pool.length === 0) pool = [CATALOG_BY_ID.radish];

  const variedPool = pool.filter((i) => i.id !== npc.requestItemId);
  const pickPool = variedPool.length > 0 ? variedPool : pool;
  const chosen = pickPool[Math.floor(Math.random() * pickPool.length)];

  const isRareOrSlow = chosen.growthMs >= 12 * 60 * 1000 || chosen.sellPrice >= 300;
  const isMedium = !isRareOrSlow && (chosen.growthMs >= 4 * 60 * 1000 || chosen.sellPrice >= 110);

  const baseQty = isRareOrSlow ? 1 : isMedium ? 2 : 3;
  const levelBonus = isRareOrSlow
    ? Math.min(2, Math.floor((level - 1) / 20))
    : Math.min(3, Math.floor((level - 1) / 14));
  const stepBonus = stepIndex === 0 ? 0 : stepIndex === 1 ? (isRareOrSlow ? 1 : 2) : isRareOrSlow ? 2 : 3;
  const requestQty = Math.max(1, baseQty + levelBonus + stepBonus);

  const stepMeta = getNeighborRequestStepMeta(stepIndex);
  const friendshipMult = 1 + Math.floor(Math.min(100, npc.friendship) / 25) * 0.08;
  const levelXpMult = 1 + Math.min(0.6, Math.floor(level / 10) * 0.06);

  const rewardCoins = Math.round(chosen.sellPrice * requestQty * stepMeta.coinMult * friendshipMult);
  const rewardXp = Math.round(chosen.xpReward * requestQty * stepMeta.xpMult * friendshipMult * levelXpMult);

  return {
    requestItemId: chosen.id,
    requestQty,
    rewardCoins,
    rewardXp,
  };
}

export function createInitialGameState(petType: PetType = 'dog'): GameState {
  const tiles: TileData[][] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    const row: TileData[] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      row.push({
        x,
        y,
        unlocked: isTileUnlockedForRing(x, y, 0),
        ground: 'grass',
        watered: false,
        enriched: false,
        entity: null,
      });
    }
    tiles.push(row);
  }

  // Starter farm centered in [6..13]
  tiles[9][7].ground = 'path';
  tiles[9][8].ground = 'path';
  tiles[9][9].ground = 'path';

  tiles[7][7].ground = 'tilled';
  tiles[7][7].watered = true;
  tiles[7][7].wateredRemainingMs = MAX_MOISTURE_MS;
  tiles[7][7].entity = {
    itemId: 'radish',
    category: 'crop',
    progressMs: CATALOG_BY_ID.radish.growthMs,
    ready: true,
    harvestCount: 0,
    fedOrWatered: true,
  };

  tiles[7][8].ground = 'tilled';
  tiles[7][8].watered = true;
  tiles[7][8].wateredRemainingMs = MAX_MOISTURE_MS;
  tiles[7][8].entity = {
    itemId: 'wheat',
    category: 'crop',
    progressMs: CATALOG_BY_ID.wheat.growthMs * 0.55,
    ready: false,
    harvestCount: 0,
    fedOrWatered: true,
  };

  tiles[8][7].ground = 'tilled';
  tiles[8][7].entity = {
    itemId: 'champignon',
    category: 'mushroom',
    progressMs: CATALOG_BY_ID.champignon.growthMs * 0.4,
    ready: false,
    harvestCount: 0,
    fedOrWatered: false,
  };

  tiles[8][11].entity = {
    itemId: 'chicken',
    category: 'animal',
    progressMs: CATALOG_BY_ID.chicken.growthMs,
    ready: true,
    harvestCount: 0,
    fedOrWatered: true,
    ageMs: 0,
    lifespanMs: createAnimalLifespanMs(),
  };

  tiles[7][11].entity = {
    itemId: 'flowerbed',
    category: 'decoration',
    progressMs: 0,
    ready: false,
    harvestCount: 0,
    fedOrWatered: false,
  };

  tiles[8][12].entity = {
    itemId: 'fence',
    category: 'decoration',
    progressMs: 0,
    ready: false,
    harvestCount: 0,
    fedOrWatered: false,
  };

  const petMeta = PET_CATALOG[petType];

  return {
    version: 2,
    savedAt: Date.now(),
    coins: 280,
    xp: 0,
    level: 1,
    day: 1,
    ingameMinutes: 8 * 60,
    season: 'spring',
    weather: 'sunny',
    weatherRemainingMs: 10 * 60 * 1000,
    nextDisasterMs: 14 * 60 * 1000,
    disasterWarning: null,
    lastDisasterReport: null,
    unlockedRing: 0,
    tiles,
    seeds: {
      radish: 4,
      wheat: 3,
      carrot: 2,
      champignon: 2,
    },
    inventory: {},
    fertilizerCount: 3,
    selectedTool: 'hand',
    selectedSeedId: 'radish',
    wateringCanTier: 1,
    avatar: createRandomAvatar('Lukas', 'Sonnenhof'),
    pet: {
      type: petType,
      name: petMeta.defaultName,
      level: 1,
      xp: 0,
      x: 9,
      y: 10,
      helpCooldownMs: 22000,
      petCooldownMs: 0,
      lastActionText: 'Bereit zum Helfen!',
    },
    workers: [],
    craftingJobs: [],
    merchant: generateMerchantVisit(1, 'spring'),
    fishingBaitCharges: 0,
    growthElixirCount: 0,
    house: {
      floors: 1,
      extras: [],
    },
    tutorial: {
      dismissed: false,
      completedSteps: [],
      plantedCount: 0,
      wateredCount: 0,
      soldCount: 0,
      mushroomPlanted: false,
      visitedHouseOrPet: false,
      helpedNeighbor: false,
    },
    fishing: {
      level: 1,
      xp: 0,
      totalCaught: 0,
      regionDensity: generateRandomRegionDensities(),
      regionRefreshMs: 3 * 60 * 1000,
    },
    quests: {
      active: generateQuestsForLevel(1, 3, 'spring', 1),
      completedTotal: 0,
      recentKinds: [],
      recentTargetIds: [],
      claimedMilestones: [],
    },
    almanac: {
      discoveredIds: ['radish', 'wheat', 'champignon'],
      fishRecords: {},
    },
    villageFair: {
      judgedSeasonKeys: [],
      medals: { bronze: 0, silver: 0, gold: 0 },
      lastResult: null,
    },
    farmShop: createInitialFarmShopState(),
    mailbox: createInitialMailboxState(),
    winterFestival: createInitialWinterFestivalState(),
    villageBoard: createInitialVillageBoardState(1, 1, 'spring'),
    villageFire: createInitialVillageFireState(),
    villageBusinesses: createInitialVillageBusinessesState(1),
    themePark: createInitialThemeParkState(1),
    economyCrisis: createInitialEconomyCrisisState(1),
    mine: createInitialMineState(1, 1),
    flyAgaricPos: null,
    mushroomEffect: {
      psychedelicRemainingMs: 0,
      luckBuffRemainingMs: 0,
      respawnCooldownMs: 4 * 60 * 1000,
      lastEatenDay: 0,
    },
    feastBuff: {
      remainingMs: 0,
      dishId: '',
      dishName: '',
    },
    neighbors: INITIAL_NEIGHBORS.map((n) => ({ ...n })),
    romance: createInitialRomanceState(),
    marketHotItems: generateHotMarketItems('spring', 1),
    marketCrashedItems: [],
    marketOrders: generateMarketOrders(1, 'spring'),
    eventState: {
      season: 'spring',
      points: 0,
      claimedTiers: [],
    },
    unlockedTrophies: [],
    stats: {
      totalHarvested: 0,
      totalSoldCoins: 0,
      totalNeighborsHelped: 0,
      disastersSurvived: 0,
      totalCrafted: 0,
      totalMarketOrders: 0,
      totalMerchantDeals: 0,
      totalDecorPlaced: 0,
      totalPetCares: 0,
      totalMineForged: 0,
      totalFiresHelped: 0,
      totalCrisesSurvived: 0,
      totalRepairsPaid: 0,
      harvestedByItem: {},
      craftedByItem: {},
    },
  };
}

export function addXpAndCheckLevelUp(
  state: GameState,
  rawAmount: number
): { state: GameState; leveledUpTo: number | null } {
  const houseBonus = getHouseBonuses(state.house);
  const almanacBonus = getAlmanacBonuses(state.almanac);
  const partnerBonus = getPartnerBonuses(state.romance);
  const amount = Math.round(rawAmount * houseBonus.xpMult * almanacBonus.xpMult * partnerBonus.xpMult);
  if (state.level >= MAX_LEVEL) {
    return { state, leveledUpTo: null };
  }

  let xp = state.xp + amount;
  let level = state.level;
  let coins = state.coins;
  let leveledUpTo: number | null = null;

  while (level < MAX_LEVEL && xp >= xpRequiredForLevel(level)) {
    xp -= xpRequiredForLevel(level);
    level += 1;
    coins += level * 65;
    leveledUpTo = level;
  }

  if (level >= MAX_LEVEL) {
    xp = 0;
  }

  return {
    state: {
      ...state,
      xp,
      level,
      coins,
    },
    leveledUpTo,
  };
}

export function addPetXp(state: GameState, amount: number): { state: GameState; petLeveledUpTo: number | null } {
  if (state.pet.level >= MAX_LEVEL) return { state, petLeveledUpTo: null };
  let pxp = state.pet.xp + amount;
  let plevel = state.pet.level;
  let petLeveledUpTo: number | null = null;

  while (plevel < MAX_LEVEL && pxp >= petXpRequiredForLevel(plevel)) {
    pxp -= petXpRequiredForLevel(plevel);
    plevel += 1;
    petLeveledUpTo = plevel;
  }
  if (plevel >= MAX_LEVEL) pxp = 0;

  return {
    state: {
      ...state,
      pet: {
        ...state.pet,
        xp: pxp,
        level: plevel,
      },
    },
    petLeveledUpTo,
  };
}

export function addFishingXp(
  state: GameState,
  amount: number
): { state: GameState; fishingLeveledUpTo: number | null } {
  if (state.fishing.level >= MAX_LEVEL) return { state, fishingLeveledUpTo: null };
  let fxp = state.fishing.xp + amount;
  let flevel = state.fishing.level;
  let fishingLeveledUpTo: number | null = null;

  while (flevel < MAX_LEVEL && fxp >= fishingXpRequiredForLevel(flevel)) {
    fxp -= fishingXpRequiredForLevel(flevel);
    flevel += 1;
    fishingLeveledUpTo = flevel;
  }
  if (flevel >= MAX_LEVEL) fxp = 0;

  return {
    state: {
      ...state,
      fishing: {
        ...state.fishing,
        xp: fxp,
        level: flevel,
      },
    },
    fishingLeveledUpTo,
  };
}

export function isTutorialFinished(state: GameState): boolean {
  return state.tutorial.dismissed || state.tutorial.completedSteps.length >= TUTORIAL_STEPS.length;
}

export function advanceQuestProgress(
  state: GameState,
  kind: QuestKind,
  amount = 1,
  targetItemId?: string
): GameState {
  if (!isTutorialFinished(state) || amount <= 0) return state;
  let changed = false;
  const nextActive = state.quests.active.map((q) => {
    if (q.kind !== kind || q.claimed || q.progress >= q.target) return q;
    if (q.targetItemId && q.targetItemId !== targetItemId) return q;
    changed = true;
    return {
      ...q,
      progress: Math.min(q.target, q.progress + amount),
    };
  });
  if (!changed) return state;
  return {
    ...state,
    quests: {
      ...state.quests,
      active: nextActive,
    },
  };
}

export function getMilestoneProgress(milestoneId: string, state: GameState): number {
  const countPlaced = (predicate: (itemId: string, category: string) => boolean) => {
    let total = 0;
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const ent = state.tiles[y]?.[x]?.entity;
        if (ent && predicate(ent.itemId, ent.category)) {
          total += 1;
        }
      }
    }
    return total;
  };

  switch (milestoneId) {
    case 'ms_ch1_station':
      return countPlaced((id) => ARTISAN_STATION_IDS.has(id));
    case 'ms_ch2_decor':
      return countPlaced((_, category) => category === 'decoration');
    case 'ms_ch3_craft':
      return state.stats.totalCrafted ?? 0;
    case 'ms_ch4_expand':
      return state.unlockedRing;
    case 'ms_ch5_house2':
      return state.house.floors;
    case 'ms_ch6_fishing':
      return state.fishing.totalCaught;
    case 'ms_ch7_worker':
      return (state.workers || []).length;
    case 'ms_ch8_merchant':
      return state.stats.totalMerchantDeals ?? 0;
    case 'ms_ch9_house3':
      return state.house.floors;
    case 'ms_ch10_staff':
      return (state.workers || []).length;
    case 'ms_ch11_craft20':
      return state.stats.totalCrafted ?? 0;
    case 'ms_ch12_house4':
      return state.house.floors;
    case 'ms_ch13_wealth':
      return state.stats.totalSoldCoins;
    case 'ms_ch14_team3':
      return (state.workers || []).length;
    case 'ms_ch15_orchard':
      return countPlaced((_, category) => category === 'tree');
    case 'ms_ch16_brewery':
      return countPlaced((id) => id === 'brewery');
    case 'ms_ch17_almanac15':
      return getAlmanacBonuses(state.almanac).unlockedCount;
    case 'ms_ch18_fair_gold':
      return state.villageFair?.medals?.gold ?? 0;
    case 'ms_ch19_fish40':
      return state.fishing.totalCaught;
    case 'ms_ch20_crafts50':
      return state.stats.totalCrafted ?? 0;
    case 'ms_ch21_wealth500k':
      return state.stats.totalSoldCoins;
    case 'ms_ch22_legend180':
      return state.level;
    case 'ms_ch23_shop_debut':
    case 'ms_ch38_shop120':
    case 'ms_ch59_shop500':
      return state.farmShop?.totalSoldCount ?? 0;
    case 'ms_ch24_mine_first':
    case 'ms_ch40_mine_rocks150':
      return state.mine?.totalRocksMined ?? 0;
    case 'ms_ch25_mine_forge1':
    case 'ms_ch37_mine_forge4':
    case 'ms_ch60_mine_forge8':
      return Math.max(state.stats.totalMineForged ?? 0, Math.max(0, (state.mine?.pickaxeTier ?? 1) - 1));
    case 'ms_ch26_village_board5':
    case 'ms_ch39_village_board25':
      return state.villageBoard?.completedTotal ?? 0;
    case 'ms_ch27_house_extras3':
    case 'ms_ch42_house_extras6':
    case 'ms_ch57_house_extras9':
      return (state.house?.extras || []).length;
    case 'ms_ch28_expand3':
    case 'ms_ch35_expand4':
    case 'ms_ch43_expand5':
    case 'ms_ch54_expand6':
      return state.unlockedRing;
    case 'ms_ch29_pet10':
      return state.pet?.level ?? 1;
    case 'ms_ch30_can2':
    case 'ms_ch41_can3':
      return state.wateringCanTier;
    case 'ms_ch31_mine_floor5':
    case 'ms_ch44_mine_floor10':
    case 'ms_ch58_mine_floor15':
    case 'ms_ch63_mine_floor20':
      return state.mine?.unlockedFloor ?? 1;
    case 'ms_ch32_shop_rep40':
    case 'ms_ch53_shop_rep85':
      return state.farmShop?.reputation ?? 0;
    case 'ms_ch33_relics3':
    case 'ms_ch56_relics6':
      return (state.mine?.discoveredRelics || []).length;
    case 'ms_ch34_neighbors25':
      return state.stats.totalNeighborsHelped ?? 0;
    case 'ms_ch36_almanac32':
    case 'ms_ch46_almanac50':
      return getAlmanacBonuses(state.almanac).unlockedCount;
    case 'ms_ch45_harvest800':
      return state.stats.totalHarvested ?? 0;
    case 'ms_ch47_fair_gold3':
      return state.villageFair?.medals?.gold ?? 0;
    case 'ms_ch48_fish100':
      return state.fishing?.totalCaught ?? 0;
    case 'ms_ch49_romance_crush':
      return state.romance?.status === 'crush' || state.romance?.status === 'married' ? 1 : 0;
    case 'ms_ch50_romance_dates2':
      return state.romance?.datesCount ?? 0;
    case 'ms_ch51_romance_married':
      return state.romance?.status === 'married' ? 1 : 0;
    case 'ms_ch52_fire_help':
      return state.stats.totalFiresHelped ?? 0;
    case 'ms_ch55_level100':
    case 'ms_ch67_legend199':
    case 'ms_ch68_level200':
    case 'ms_ch82_emperor249':
      return state.level;
    case 'ms_ch61_biz1':
    case 'ms_ch62_biz3':
    case 'ms_ch74_trade_office':
      return (state.villageBusinesses?.ownedIds || []).length;
    case 'ms_ch70_dairy_plant':
      return (state.villageBusinesses?.ownedIds || []).includes('dairy_plant') ? 1 : 0;
    case 'ms_ch64_park_owned':
      return state.themePark?.owned ? 1 : 0;
    case 'ms_ch65_park_attr3':
    case 'ms_ch77_ghost_train':
      return (state.themePark?.attractions || []).length;
    case 'ms_ch73_sky_tower':
      return (state.themePark?.attractions || []).includes('sky_tower') ? 1 : 0;
    case 'ms_ch66_wealth3m':
    case 'ms_ch80_wealth15m':
      return state.stats.totalSoldCoins ?? 0;
    case 'ms_ch69_melon_harvest':
      return Math.max(
        state.stats.harvestedByItem?.imperial_truffle_melon ?? 0,
        state.inventory.imperial_truffle_melon ?? 0
      );
    case 'ms_ch71_melon_elixir':
      return Math.max(
        state.stats.craftedByItem?.imperial_melon_elixir ?? 0,
        state.inventory.imperial_melon_elixir ?? 0
      );
    case 'ms_ch72_repairs3':
      return state.stats.totalRepairsPaid ?? 0;
    case 'ms_ch75_diamond_plum_tree':
      return countPlaced((id) => id === 'fruit_diamond_plum');
    case 'ms_ch76_plum_tart':
      return Math.max(
        state.stats.craftedByItem?.diamond_plum_tart ?? 0,
        state.inventory.diamond_plum_tart ?? 0
      );
    case 'ms_ch78_shop_rep98':
      return state.farmShop?.reputation ?? 0;
    case 'ms_ch79_crises5':
      return state.stats.totalCrisesSurvived ?? 0;
    case 'ms_ch81_almanac_crown':
      return getAlmanacBonuses(state.almanac).unlockedCount;
    default:
      return 0;
  }
}

export function getReadyMilestonesCount(state: GameState): number {
  const claimed = new Set(state.quests.claimedMilestones || []);
  return QUEST_MILESTONES.filter(
    (ms) => !claimed.has(ms.id) && state.level >= ms.minLevel && getMilestoneProgress(ms.id, state) >= ms.target
  ).length;
}

export function getWateringPatternOffsets(tier: 1 | 2 | 3 | 4): { dx: number; dy: number }[] {
  if (tier === 2) {
    return [
      { dx: -1, dy: 0 },
      { dx: 0, dy: 0 },
      { dx: 1, dy: 0 },
    ];
  }
  if (tier === 3) {
    const offsets: { dx: number; dy: number }[] = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        offsets.push({ dx, dy });
      }
    }
    return offsets;
  }
  if (tier === 4) {
    const offsets: { dx: number; dy: number }[] = [];
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        offsets.push({ dx, dy });
      }
    }
    return offsets;
  }
  return [{ dx: 0, dy: 0 }];
}

export function isFenceLike(itemId?: string | null): boolean {
  return itemId === 'fence' || itemId === 'fence_gate';
}

export function isRoamingAnimal(itemId?: string | null): boolean {
  return isLivestockAnimal(itemId);
}

export function isAnimalEnclosed(tiles: TileData[][], startX: number, startY: number): boolean {
  const startTile = tiles[startY]?.[startX];
  if (!startTile || !startTile.unlocked) return false;

  let totalUnlockedNonFence = 0;
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const t = tiles[y][x];
      if (t.unlocked && !isFenceLike(t.entity?.itemId)) {
        totalUnlockedNonFence += 1;
      }
    }
  }

  const visited = new Set<string>();
  const queue: { x: number; y: number }[] = [{ x: startX, y: startY }];
  visited.add(`${startX},${startY}`);

  let hitFence = false;
  let escapedToEdgeWithoutFence = false;

  const dirs = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 },
  ];

  let head = 0;
  while (head < queue.length) {
    const { x, y } = queue[head++];
    for (const { dx, dy } of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= GRID_SIZE || ny >= GRID_SIZE) {
        escapedToEdgeWithoutFence = true;
        continue;
      }
      const nt = tiles[ny][nx];
      if (!nt.unlocked) {
        escapedToEdgeWithoutFence = true;
        continue;
      }
      if (isFenceLike(nt.entity?.itemId)) {
        hitFence = true;
        continue;
      }
      const key = `${nx},${ny}`;
      if (!visited.has(key)) {
        visited.add(key);
        queue.push({ x: nx, y: ny });
      }
    }
  }

  return hitFence && (!escapedToEdgeWithoutFence || visited.size < totalUnlockedNonFence);
}

export function getTileProtections(
  tiles: TileData[][],
  x: number,
  y: number
): { shielded: boolean; speedBoosted: boolean; sprinklered: boolean; greenhoused: boolean } {
  let shielded = false;
  let speedBoosted = false;
  let sprinklered = false;
  let greenhoused = false;

  for (let ty = 0; ty < GRID_SIZE; ty++) {
    for (let tx = 0; tx < GRID_SIZE; tx++) {
      const entity = tiles[ty]?.[tx]?.entity;
      if (!entity) continue;
      const item = CATALOG_BY_ID[entity.itemId];
      if (!item) continue;
      const dist = Math.max(Math.abs(tx - x), Math.abs(ty - y));
      if (item.stormShieldRadius && dist <= item.stormShieldRadius) {
        shielded = true;
      }
      if (item.speedAuraRadius && dist <= item.speedAuraRadius) {
        speedBoosted = true;
      }
      if (item.sprinklerRadius && dist <= item.sprinklerRadius) {
        sprinklered = true;
      }
      if (item.greenhouseRadius && dist <= item.greenhouseRadius) {
        greenhoused = true;
        shielded = true;
      }
    }
  }
  return { shielded, speedBoosted, sprinklered, greenhoused };
}

const STRONG_STORM_SHIELD_IDS = new Set<string>([
  'solar_conservatory',
  'greenhouse_dome',
  'winter_greenhouse',
  'moonstone_obelisk',
]);

export function hasStrongStormShield(tiles: TileData[][], x: number, y: number): boolean {
  for (let ty = 0; ty < GRID_SIZE; ty++) {
    for (let tx = 0; tx < GRID_SIZE; tx++) {
      const entity = tiles[ty]?.[tx]?.entity;
      if (!entity || !STRONG_STORM_SHIELD_IDS.has(entity.itemId)) continue;
      const item = CATALOG_BY_ID[entity.itemId];
      if (!item) continue;
      const radius = item.stormShieldRadius || item.greenhouseRadius || 0;
      if (radius > 0 && Math.max(Math.abs(tx - x), Math.abs(ty - y)) <= radius) {
        return true;
      }
    }
  }
  return false;
}

export function getDisasterTierForLevel(level: number) {
  if (level <= 3) return { label: 'Leichte Böe', maxAffected: 2, ratio: 0.2, minIntervalMin: 18 };
  if (level <= 10) return { label: 'Mäßiges Unwetter', maxAffected: 4, ratio: 0.35, minIntervalMin: 15 };
  if (level <= 25) return { label: 'Kräftige Front', maxAffected: 6, ratio: 0.4, minIntervalMin: 13 };
  if (level <= 55) return { label: 'Starker Talsturm', maxAffected: 9, ratio: 0.45, minIntervalMin: 11 };
  if (level >= 200) return { label: 'Jahrhundert-Superzelle', maxAffected: 18, ratio: 0.65, minIntervalMin: 6.5 };
  return { label: 'Großer Jahreszeiten-Sturm', maxAffected: 12, ratio: 0.5, minIntervalMin: 10 };
}

export function advanceGameTick(
  prev: GameState,
  deltaMs: number
): {
  next: GameState;
  events: {
    newDay?: number;
    newSeason?: Season;
    weatherChanged?: WeatherType;
    disasterWarningStarted?: DisasterWarning;
    disasterTriggered?: DisasterReport;
    ufoAbduction?: { x: number; y: number };
    mushroomLuckStarted?: boolean;
    petHelped?: { x: number; y: number; text: string };
    petLeveledUpTo?: number;
    payrollReport?: PayrollReport;
    workerActed?: { x: number; y: number; text: string }[];
    craftedItems?: { itemId: string; stationId: string; xp: number }[];
    merchantArrived?: boolean;
    shopSales?: {
      itemId: string;
      qty: number;
      coins: number;
      tipCoins?: number;
      summaryText?: string;
      buyerName?: string;
      archetype?: ShopVisitorArchetype;
      friendshipGain?: number;
    }[];
    mailDelivered?: boolean;
    santaArrived?: boolean;
    santaGiftDropped?: { x: number; y: number; itemId: string };
    fireworksStarted?: boolean;
    animalLifespanEnded?: { x: number; y: number; animalName: string; meatName: string }[];
    villageFireStarted?: { houseId: string; houseName: string; causeTitle: string };
    villageFireExtinguished?: { houseId: string; houseName: string; playerHelped: boolean };
    businessPayouts?: { businessId: VillageBusinessId; name: string; amount: number }[];
    businessOutage?: { businessId: VillageBusinessId; name: string; reason: string; repairCost: number };
    themeParkPayout?: number;
    parkOutage?: { reason: string; repairCost: number };
    economyLevy?: { amount: number; reason: string };
    shopSpoilage?: { totalLostQty: number; items: { itemId: string; lostQty: number }[] };
    partnerMorningHelp?: { partnerName: string; wateredCount: number; giftLabel: string };
  };
} {
  let state = prev;
  const events: {
    newDay?: number;
    newSeason?: Season;
    weatherChanged?: WeatherType;
    disasterWarningStarted?: DisasterWarning;
    disasterTriggered?: DisasterReport;
    ufoAbduction?: { x: number; y: number };
    mushroomLuckStarted?: boolean;
    petHelped?: { x: number; y: number; text: string };
    petLeveledUpTo?: number;
    payrollReport?: PayrollReport;
    workerActed?: { x: number; y: number; text: string }[];
    craftedItems?: { itemId: string; stationId: string; xp: number }[];
    merchantArrived?: boolean;
    shopSales?: {
      itemId: string;
      qty: number;
      coins: number;
      tipCoins?: number;
      summaryText?: string;
      buyerName?: string;
      archetype?: ShopVisitorArchetype;
      friendshipGain?: number;
    }[];
    mailDelivered?: boolean;
    santaArrived?: boolean;
    santaGiftDropped?: { x: number; y: number; itemId: string };
    fireworksStarted?: boolean;
    animalLifespanEnded?: { x: number; y: number; animalName: string; meatName: string }[];
    villageFireStarted?: { houseId: string; houseName: string; causeTitle: string };
    villageFireExtinguished?: { houseId: string; houseName: string; playerHelped: boolean };
    businessPayouts?: { businessId: VillageBusinessId; name: string; amount: number }[];
    businessOutage?: { businessId: VillageBusinessId; name: string; reason: string; repairCost: number };
    themeParkPayout?: number;
    parkOutage?: { reason: string; repairCost: number };
    economyLevy?: { amount: number; reason: string };
    shopSpoilage?: { totalLostQty: number; items: { itemId: string; lostQty: number }[] };
    partnerMorningHelp?: { partnerName: string; wateredCount: number; giftLabel: string };
  } = {};

  const houseBonuses = getHouseBonuses(state.house);
  const almanacBonuses = getAlmanacBonuses(state.almanac);
  const partnerBonuses = getPartnerBonuses(state.romance);
  let almanac = state.almanac || { discoveredIds: [], fishRecords: {} };

  let feastBuff = state.feastBuff
    ? { ...state.feastBuff }
    : { remainingMs: 0, dishId: '', dishName: '' };
  if (feastBuff.remainingMs > 0) {
    const nextFeastRem = Math.max(0, feastBuff.remainingMs - deltaMs);
    feastBuff =
      nextFeastRem > 0
        ? { ...feastBuff, remainingMs: nextFeastRem }
        : { remainingMs: 0, dishId: '', dishName: '' };
  }
  const feastSpeedMult = feastBuff.remainingMs > 0 ? 1.2 : 1.0;

  // 1. Ingame clock: 1 ingame day = 2 real hours
  const prevDay = state.day;
  const prevSeason = state.season;
  const prevMinutes = state.ingameMinutes;
  const deltaMinutes = deltaMs / REAL_MS_PER_INGAME_MINUTE;
  let ingameMinutes = state.ingameMinutes + deltaMinutes;
  let day = state.day;
  let season = state.season;
  let neighbors = state.neighbors;
  let marketHotItems = state.marketHotItems;
  let marketCrashedItems = state.marketCrashedItems || [];
  let marketOrders = state.marketOrders;
  let eventState = state.eventState;
  let coins = state.coins;
  let workers: FarmWorker[] = (state.workers || []).map((w) => ({
    ...w,
    tasks: { ...w.tasks },
  }));

  const crossedMidnight = ingameMinutes >= 1440;
  if (crossedMidnight) {
    ingameMinutes -= 1440;
    day += 1;
    events.newDay = day;

    // 0:00 Uhr Payroll for hired farm workers!
    if (workers.length > 0) {
      let paidCount = 0;
      let totalPaid = 0;
      let strikeCount = 0;
      let totalUnpaid = 0;

      workers = workers.map((w) => {
        const owed = w.dailyWage + (w.unpaidWage || 0);
        if (coins >= owed) {
          coins -= owed;
          paidCount += 1;
          totalPaid += owed;
          return {
            ...w,
            unpaidWage: 0,
            onStrike: false,
            lastActionText: `Gehalt bezahlt (-${owed} M)`,
          };
        }
        const nextUnpaid = owed;
        strikeCount += 1;
        totalUnpaid += nextUnpaid;
        return {
          ...w,
          unpaidWage: nextUnpaid,
          onStrike: true,
          lastActionText: `Streik! ${nextUnpaid} M Lohn offen`,
        };
      });

      events.payrollReport = {
        paidCount,
        totalPaid,
        strikeCount,
        totalUnpaid,
      };
    }

    neighbors = state.neighbors.map((n) => {
      const resetNpc: NeighborNPC = {
        ...n,
        helpedToday: false,
        giftedToday: false,
        requestsCompletedToday: 0,
      };
      return {
        ...resetNpc,
        ...buildScaledNeighborRequest(resetNpc, state.level, season, 0),
      };
    });

    const seasonOrder: Season[] = ['spring', 'summer', 'autumn', 'winter'];
    const seasonIndex = Math.floor((day - 1) / DAYS_PER_SEASON) % 4;
    const targetSeason = seasonOrder[seasonIndex];
    if (targetSeason !== season) {
      season = targetSeason;
      events.newSeason = season;
      eventState = {
        season,
        points: 0,
        claimedTiers: [],
      };
    }

    marketHotItems = generateHotMarketItems(season, state.level);
    marketCrashedItems = generateCrashedMarketItems(season, state.level, marketHotItems);
    marketOrders = generateMarketOrders(state.level, season);
  }

  // 2. Dynamic Weather progression
  let weather = state.weather;
  let weatherRemainingMs = state.weatherRemainingMs - deltaMs;
  if (weatherRemainingMs <= 0) {
    weather = pickWeatherForSeason(season);
    weatherRemainingMs = (8 + Math.random() * 7) * 60 * 1000;
    events.weatherChanged = weather;
  }

  // 2b. Dynamic River Fish Density rotation (every 2.5 - 4 minutes)
  let fishing = state.fishing;
  if (fishing) {
    const nextRefresh = fishing.regionRefreshMs - deltaMs;
    if (nextRefresh <= 0) {
      fishing = {
        ...fishing,
        regionDensity: generateRandomRegionDensities(),
        regionRefreshMs: (2.5 + Math.random() * 1.5) * 60 * 1000,
      };
    } else {
      fishing = { ...fishing, regionRefreshMs: nextRefresh };
    }
  }

  const weatherMeta = WEATHER_META[weather];

  // 3. Level-Scaled Disaster Countdown (fair & non-frustrating!)
  let nextDisasterMs = state.nextDisasterMs - deltaMs;
  let disasterWarning = state.disasterWarning;
  let lastDisasterReport = state.lastDisasterReport;
  let seeds = { ...state.seeds };
  let inventory = { ...state.inventory };
  let xp = state.xp;
  let level = state.level;
  let stats = { ...state.stats };
  const tier = getDisasterTierForLevel(state.level);

  if (!disasterWarning && nextDisasterMs <= 0) {
    const warnMs = 30000 + houseBonuses.warningExtraMs;
    let hasUnprotectedCow = false;
    if (state.level >= 4) {
      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          const t = state.tiles[y][x];
          if (t.entity?.itemId === 'cow' && !getTileProtections(state.tiles, x, y).shielded) {
            hasUnprotectedCow = true;
            break;
          }
        }
        if (hasUnprotectedCow) break;
      }
    }

    const types: DisasterWarning[] = [
      {
        id: `warn_${Date.now()}`,
        type: 'thunderstorm',
        title: 'Unwetter-Warnung',
        severityLabel: tier.label,
        message: 'Dunkle Wolken ziehen auf! Vogelscheuchen & Schutz-Pavillons schützen deine Felder.',
        countdownMs: warnMs,
      },
      {
        id: `warn_${Date.now()}`,
        type: 'crows',
        title: 'Krähenschwarm gesichtet',
        severityLabel: tier.label,
        message: 'Ein Schwarm Krähen nähert sich! Vogelscheuchen & Hofhunde halten sie fern.',
        countdownMs: warnMs,
      },
      {
        id: `warn_${Date.now()}`,
        type: season === 'winter' ? 'frost' : 'moles',
        title: season === 'winter' ? 'Frostwelle naht' : 'Wühlmaus-Alarm',
        severityLabel: tier.label,
        message:
          season === 'winter'
            ? 'Klirrende Kälte im Anmarsch! Geschützte Beete bleiben sicher.'
            : 'Wühlmäuse buddeln im Tal! Nachbarn stehen mit Ersatzsaat bereit.',
        countdownMs: warnMs,
      },
    ];

    if (state.level >= 200) {
      types.push({
        id: `warn_${Date.now()}`,
        type: 'superstorm',
        title: 'Jahrhundert-Superzelle im Anmarsch!',
        severityLabel: 'Extrem-Unwetter (Lvl 200+)',
        message: 'Schwere Orkanfront! Einfache Vogelscheuchen können teils durchbrochen werden — nur Gewächshäuser & Obelisken halten stand.',
        countdownMs: warnMs,
      });
    }

    if (hasUnprotectedCow) {
      types.push({
        id: `warn_${Date.now()}`,
        type: 'ufo',
        title: 'Seltsame Lichter am Himmel!',
        severityLabel: 'UFO-Sichtung',
        message: 'Ein schwebendes UFO hat es auf eine ungeschützte Kuh abgesehen! Pavillons & Scheuchen schirmen sie ab.',
        countdownMs: warnMs,
      });
    }

    disasterWarning = types[Math.floor(Math.random() * types.length)];
    events.disasterWarningStarted = disasterWarning;
  } else if (disasterWarning) {
    const remaining = disasterWarning.countdownMs - deltaMs;
    if (remaining > 0) {
      disasterWarning = { ...disasterWarning, countdownMs: remaining };
    } else if (disasterWarning.type === 'ufo') {
      const unprotectedCows: { x: number; y: number }[] = [];
      let protectedCount = 0;

      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          const t = state.tiles[y][x];
          if (t.entity?.itemId === 'cow') {
            if (getTileProtections(state.tiles, x, y).shielded) {
              protectedCount += 1;
            } else {
              unprotectedCows.push({ x, y });
            }
          }
        }
      }

      // Always abduct at most 1 cow!
      const abducted =
        unprotectedCows.length > 0
          ? unprotectedCows[Math.floor(Math.random() * unprotectedCows.length)]
          : null;

      if (abducted) {
        const updatedTiles = state.tiles.map((row, ty) =>
          row.map((tile, tx) => {
            if (tx === abducted.x && ty === abducted.y) {
              return {
                ...tile,
                ground: 'grass' as const,
                watered: false,
                entity: null,
              };
            }
            return tile;
          })
        );
        state = { ...state, tiles: updatedTiles };
        events.ufoAbduction = abducted;
      }

      const reliefSeeds = [{ itemId: 'corn', qty: 2 }];
      seeds.corn = (seeds.corn || 0) + 2;
      const reliefCoins = (abducted ? 160 : 110) + state.level * 5;
      const reliefXp = 50 + protectedCount * 8 + state.level * 3;
      coins += reliefCoins;
      const xpRes = addXpAndCheckLevelUp({ ...state, coins, xp, level }, reliefXp);
      coins = xpRes.state.coins;
      xp = xpRes.state.xp;
      level = xpRes.state.level;
      stats.disastersSurvived += 1;

      const report: DisasterReport = {
        title: abducted ? 'UFO-Entführung über der Weide!' : 'UFO abgewehrt!',
        severityLabel: abducted ? '1 Kuh wurde hochgebeamt' : 'Alle Kühe sicher abgeschirmt',
        protectedCount,
        affectedCount: abducted ? 1 : 0,
        reliefCoins,
        reliefXp,
        reliefSeeds,
      };

      lastDisasterReport = report;
      disasterWarning = null;
      nextDisasterMs = (tier.minIntervalMin + Math.random() * 8) * 60 * 1000;
      events.disasterTriggered = report;
    } else {
      const vulnerableCoords: { x: number; y: number }[] = [];
      const weakShieldCoords: { x: number; y: number }[] = [];
      let protectedCount = 0;

      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          const t = state.tiles[y][x];
          if (
            t.entity &&
            (t.entity.category === 'crop' || t.entity.category === 'mushroom') &&
            !t.entity.damaged &&
            !t.entity.withered
          ) {
            const { shielded } = getTileProtections(state.tiles, x, y);
            if (shielded) {
              if (disasterWarning.type === 'superstorm' && !hasStrongStormShield(state.tiles, x, y)) {
                weakShieldCoords.push({ x, y });
              } else {
                protectedCount += 1;
              }
            } else {
              vulnerableCoords.push({ x, y });
            }
          }
        }
      }

      if (disasterWarning.type === 'superstorm' && weakShieldCoords.length > 0) {
        const pierced = [...weakShieldCoords].sort(() => Math.random() - 0.5).slice(0, 2);
        const piercedSet = new Set(pierced.map((p) => `${p.x},${p.y}`));
        protectedCount += weakShieldCoords.length - pierced.length;
        for (const p of pierced) {
          if (piercedSet.has(`${p.x},${p.y}`)) vulnerableCoords.push(p);
        }
      }

      const dogReduction = state.pet.type === 'dog' ? 1 + Math.floor(state.pet.level / 10) : 0;
      const rawMax = Math.min(tier.maxAffected, Math.ceil(vulnerableCoords.length * tier.ratio));
      const finalAffectedCount = Math.max(
        vulnerableCoords.length > 0 ? 1 : 0,
        rawMax - houseBonuses.disasterReduction - dogReduction
      );
      const picked = [...vulnerableCoords].sort(() => Math.random() - 0.5).slice(0, finalAffectedCount);
      const pickedSet = new Set(picked.map((p) => `${p.x},${p.y}`));

      const reliefSeeds: { itemId: string; qty: number }[] = [];
      if (picked.length > 0) {
        const firstAffected = state.tiles[picked[0].y][picked[0].x].entity;
        const itemId = firstAffected?.itemId || 'radish';
        reliefSeeds.push({ itemId, qty: picked.length + 1 });
        seeds[itemId] = (seeds[itemId] || 0) + picked.length + 1;
      } else {
        reliefSeeds.push({ itemId: 'carrot', qty: 2 });
        seeds.carrot = (seeds.carrot || 0) + 2;
      }

      // Ab Level 200 entfällt das kostenlose Katastrophen-Hilfsgeld!
      const reliefCoins =
        state.level >= 200 ? 0 : (picked.length > 0 ? 50 + picked.length * 30 : 90) + state.level * 6;
      const reliefXp = 35 + protectedCount * 6 + state.level * 3;
      coins += reliefCoins;
      const xpRes = addXpAndCheckLevelUp({ ...state, coins, xp, level }, reliefXp);
      coins = xpRes.state.coins;
      xp = xpRes.state.xp;
      level = xpRes.state.level;
      stats.disastersSurvived += 1;
      if (state.level >= 200) {
        stats.totalCrisesSurvived = (stats.totalCrisesSurvived || 0) + 1;
      }

      const report: DisasterReport = {
        title: disasterWarning.title,
        severityLabel: disasterWarning.severityLabel,
        protectedCount,
        affectedCount: picked.length,
        reliefCoins,
        reliefXp,
        reliefSeeds,
      };

      const updatedTiles = state.tiles.map((row, ty) =>
        row.map((tile, tx) => {
          if (pickedSet.has(`${tx},${ty}`) && tile.entity) {
            return {
              ...tile,
              enriched: true,
              entity: {
                ...tile.entity,
                damaged: true,
              },
            };
          }
          return tile;
        })
      );

      state = { ...state, tiles: updatedTiles };
      lastDisasterReport = report;
      disasterWarning = null;
      nextDisasterMs = (tier.minIntervalMin + Math.random() * 8) * 60 * 1000;
      events.disasterTriggered = report;
    }
  }

  // 4. Advance crop, mushroom & animal growth + Moisture Drying, Withering & Idle Reversion!
  const dryRate =
    weather === 'sunny' ? 1.25 : weather === 'windy' ? 1.15 : weather === 'cloudy' || weather === 'foggy' ? 0.85 : 1.0;

  let workingTiles = state.tiles.map((row, y) =>
    row.map((tile, x) => {
      const { speedBoosted, sprinklered, greenhoused } = getTileProtections(state.tiles, x, y);
      let ground = tile.ground;
      let watered = tile.watered;
      let wateredRemainingMs = tile.wateredRemainingMs ?? (tile.watered ? MAX_MOISTURE_MS : 0);
      let dryMs = tile.dryMs ?? 0;
      let idleTilledMs = tile.idleTilledMs ?? 0;
      let enriched = tile.enriched;
      let ent = tile.entity;

      if (ground === 'tilled') {
        if (weatherMeta.autoWater || sprinklered) {
          watered = true;
          wateredRemainingMs = MAX_MOISTURE_MS;
        } else if (watered) {
          wateredRemainingMs = Math.max(0, wateredRemainingMs - deltaMs * dryRate);
          watered = wateredRemainingMs > 0;
        }

        // Crop / Mushroom withering when left dry too long (after Tutorial Lvl 1-5)
        if (ent && (ent.category === 'crop' || ent.category === 'mushroom') && !ent.damaged && !ent.withered) {
          idleTilledMs = 0;
          if (watered || (greenhoused && weather === 'frost')) {
            dryMs = 0;
          } else if (state.level >= 6) {
            const maxDry = ent.category === 'mushroom' ? WITHER_MUSHROOM_DRY_MS : WITHER_CROP_DRY_MS;
            const drySpeed = greenhoused ? 0.5 : weather === 'sunny' ? 1.15 : 1.0;
            dryMs += deltaMs * drySpeed;
            if (dryMs >= maxDry) {
              // Plant/mushroom withers and field turns back into unworked meadow!
              ground = 'grass';
              watered = false;
              wateredRemainingMs = 0;
              enriched = false;
              dryMs = 0;
              idleTilledMs = 0;
              ent = {
                ...ent,
                ready: false,
                withered: true,
              };
            }
          }
        } else if (!ent) {
          // Empty tilled field reverts back to grass/meadow if left unused for too long
          dryMs = 0;
          if (!watered && state.level >= 3) {
            idleTilledMs += deltaMs;
            if (idleTilledMs >= IDLE_TILLED_REVERT_MS) {
              ground = 'grass';
              watered = false;
              wateredRemainingMs = 0;
              enriched = false;
              idleTilledMs = 0;
            }
          } else {
            idleTilledMs = 0;
          }
        }
      } else {
        watered = false;
        wateredRemainingMs = 0;
        dryMs = 0;
        idleTilledMs = 0;
      }

      // Advance natural ~3-day livestock lifespan before growth short-circuits
      if (
        ent &&
        ent.category === 'animal' &&
        isLivestockAnimal(ent.itemId) &&
        !ent.damaged &&
        !ent.withered
      ) {
        const animalItem = CATALOG_BY_ID[ent.itemId];
        const lifespanMs = ent.lifespanMs ?? createAnimalLifespanMs();
        const nextAgeMs = (ent.ageMs ?? 0) + deltaMs;
        if (nextAgeMs >= lifespanMs && animalItem?.meatDropId && CATALOG_BY_ID[animalItem.meatDropId]) {
          const meatItem = CATALOG_BY_ID[animalItem.meatDropId];
          ent = {
            itemId: meatItem.id,
            category: 'meat',
            progressMs: 0,
            ready: true,
            harvestCount: 0,
            fedOrWatered: true,
            meatDropFromAnimalId: ent.itemId,
          };
          events.animalLifespanEnded = [
            ...(events.animalLifespanEnded || []),
            {
              x,
              y,
              animalName: animalItem.name,
              meatName: meatItem.produceName,
            },
          ];
          return {
            ...tile,
            ground,
            watered,
            wateredRemainingMs,
            dryMs,
            idleTilledMs,
            enriched,
            entity: ent,
          };
        }
        ent = {
          ...ent,
          ageMs: nextAgeMs,
          lifespanMs,
        };
      }

      const stateChanged =
        ground !== tile.ground ||
        watered !== tile.watered ||
        enriched !== tile.enriched ||
        ent !== tile.entity ||
        Math.abs(wateredRemainingMs - (tile.wateredRemainingMs ?? 0)) > 1 ||
        Math.abs(dryMs - (tile.dryMs ?? 0)) > 1 ||
        Math.abs(idleTilledMs - (tile.idleTilledMs ?? 0)) > 1;

      if (!ent || ent.ready || ent.damaged || ent.withered) {
        return stateChanged
          ? { ...tile, ground, watered, wateredRemainingMs, dryMs, idleTilledMs, enriched, entity: ent }
          : tile;
      }

      const item = CATALOG_BY_ID[ent.itemId];
      if (!item || item.growthMs <= 0) {
        return stateChanged
          ? { ...tile, ground, watered, wateredRemainingMs, dryMs, idleTilledMs, enriched, entity: ent }
          : tile;
      }

      let speedMult = 1.0;
      if (ent.category === 'crop') {
        const effCropWeather = greenhoused ? Math.max(1.1, weatherMeta.cropMult) : weatherMeta.cropMult;
        speedMult *= effCropWeather * houseBonuses.cropSpeedMult;
        // Noticeable drying effect without frustrating standstill: watered is 3x faster than dry!
        speedMult *= watered ? 1.35 : 0.45;
      } else if (ent.category === 'mushroom') {
        const effMushWeather = greenhoused ? Math.max(1.1, weatherMeta.mushroomMult) : weatherMeta.mushroomMult;
        speedMult *= effMushWeather * houseBonuses.mushroomSpeedMult;
        speedMult *= watered ? 1.35 : 0.6;
      } else if (ent.category === 'animal') {
        speedMult *= weatherMeta.animalMult * houseBonuses.animalSpeedMult;
      } else if (ent.category === 'tree') {
        speedMult *= almanacBonuses.treeSpeedMult;
        if (
          season === 'winter' &&
          item.id !== 'fruit_golden_tree' &&
          item.id !== 'fruit_diamond_plum' &&
          !greenhoused
        ) {
          speedMult *= 0.35;
        } else if (weather === 'sunny' || greenhoused) {
          speedMult *= 1.15;
        } else if (weather === 'rainy') {
          speedMult *= 1.1;
        }
      }

      if (enriched) speedMult *= 1.5;
      if (item.seasons.includes(season) || greenhoused) speedMult *= 1.15;
      if (item.weatherAffinity === weather) speedMult *= 1.25;
      if (speedBoosted) speedMult *= 1.2;
      if (greenhoused) speedMult *= 1.25;
      if (feastSpeedMult > 1) speedMult *= feastSpeedMult;

      const nextProgress = Math.min(item.growthMs, ent.progressMs + deltaMs * speedMult);
      const ready = nextProgress >= item.growthMs;

      return {
        ...tile,
        ground,
        watered,
        wateredRemainingMs,
        dryMs,
        idleTilledMs,
        enriched,
        entity: {
          ...ent,
          progressMs: nextProgress,
          ready,
        },
      };
    })
  );

  // 4b. Farm Animal Wandering (free across open meadow/paths unless enclosed by fences!)
  const activeFlyAgaric = state.flyAgaricPos ?? null;
  const movedAnimalsThisTick = new Set<string>();
  const wanderNow = Date.now();
  const cardinalDirs = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 },
  ];

  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (movedAnimalsThisTick.has(`${x},${y}`)) continue;
      const tile = workingTiles[y][x];
      const ent = tile.entity;
      if (!tile.unlocked || !ent || ent.category !== 'animal' || !isRoamingAnimal(ent.itemId)) continue;

      const currentCd =
        ent.wanderCooldownMs !== undefined ? ent.wanderCooldownMs : 1200 + Math.random() * 3400;
      const nextCd = currentCd - deltaMs;

      if (nextCd > 0) {
        workingTiles[y][x] = {
          ...tile,
          entity: {
            ...ent,
            wanderCooldownMs: nextCd,
          },
        };
        continue;
      }

      const freshCd = 2800 + Math.random() * 4200;
      const openNeighbors: { nx: number; ny: number }[] = [];
      for (const { dx, dy } of cardinalDirs) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= GRID_SIZE || ny >= GRID_SIZE) continue;
        const dest = workingTiles[ny][nx];
        if (!dest.unlocked) continue;
        if (dest.ground !== 'grass' && dest.ground !== 'path') continue;
        if (dest.entity) continue;
        if (activeFlyAgaric && activeFlyAgaric.x === nx && activeFlyAgaric.y === ny) continue;
        openNeighbors.push({ nx, ny });
      }

      if (openNeighbors.length === 0 || Math.random() < 0.16) {
        workingTiles[y][x] = {
          ...tile,
          entity: {
            ...ent,
            wanderCooldownMs: freshCd,
          },
        };
        continue;
      }

      // Prefer continuing forward rather than immediately stepping back onto previous tile
      const nonBacktrack = openNeighbors.filter(
        (n) => n.nx !== ent.moveFromX || n.ny !== ent.moveFromY
      );
      const pool = nonBacktrack.length > 0 && Math.random() < 0.8 ? nonBacktrack : openNeighbors;
      const chosen = pool[Math.floor(Math.random() * pool.length)];
      const nextFacing = chosen.nx < x ? 'left' : chosen.nx > x ? 'right' : ent.facing ?? 'right';

      workingTiles[chosen.ny][chosen.nx] = {
        ...workingTiles[chosen.ny][chosen.nx],
        entity: {
          ...ent,
          facing: nextFacing,
          wanderCooldownMs: freshCd,
          moveFromX: x,
          moveFromY: y,
          movedAt: wanderNow,
        },
      };
      workingTiles[y][x] = {
        ...tile,
        entity: null,
      };
      movedAnimalsThisTick.add(`${chosen.nx},${chosen.ny}`);
    }
  }

  // 5. Autonomous Pet Helper AI + Rain Cistern
  let pet = {
    ...state.pet,
    petCooldownMs: Math.max(0, state.pet.petCooldownMs - deltaMs),
    helpCooldownMs: state.pet.helpCooldownMs - deltaMs * houseBonuses.petSpeedMult,
  };

  let petHarvested: { itemId: string; kind: QuestKind } | null = null;

  if (pet.helpCooldownMs <= 0) {
    // Cooldown scales from 24s at Lvl 1 down to 7s at high Pet Levels!
    const baseInterval = Math.max(7000, 24000 - pet.level * 280);
    pet.helpCooldownMs = baseInterval;

    const unlockedTiles: TileData[] = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (workingTiles[y][x].unlocked) unlockedTiles.push(workingTiles[y][x]);
      }
    }

    let actedTile: { x: number; y: number; text: string } | null = null;

    // Rain Cistern bonus auto-water
    if (houseBonuses.hasCistern) {
      const dry = unlockedTiles.filter((t) => t.ground === 'tilled' && !t.watered);
      dry.slice(0, 2).forEach((d) => {
        workingTiles[d.y][d.x] = {
          ...workingTiles[d.y][d.x],
          watered: true,
          wateredRemainingMs: MAX_MOISTURE_MS,
        };
      });
    }

    // Pet actions based on type & Pet Level
    const readyHarvests = unlockedTiles.filter((t) => t.entity?.ready);
    const dryCrops = unlockedTiles.filter((t) => t.ground === 'tilled' && !t.watered);
    const growingPlots = unlockedTiles.filter(
      (t) => t.entity && !t.entity.ready && !t.entity.damaged && (t.entity.category === 'crop' || t.entity.category === 'mushroom')
    );

    if ((pet.type === 'pig' || pet.type === 'cat') && readyHarvests.length > 0 && pet.level >= 2) {
      // Pig prioritizes crops/mushrooms, Cat prioritizes animals & meat drops, fallback to any ready
      const preferred = readyHarvests.filter((t) =>
        pet.type === 'cat'
          ? t.entity?.category === 'animal' || t.entity?.category === 'meat'
          : t.entity?.category !== 'animal' && t.entity?.category !== 'meat'
      );
      const target = preferred[0] || readyHarvests[0];
      const ent = target.entity!;
      const item = CATALOG_BY_ID[ent.itemId];
      if (item) {
        inventory[item.id] = (inventory[item.id] || 0) + 1;
        stats.totalHarvested += 1;
        stats.harvestedByItem = {
          ...(stats.harvestedByItem || {}),
          [item.id]: ((stats.harvestedByItem || {})[item.id] || 0) + 1,
        };
        almanac = recordAlmanacDiscovery(almanac, item.id).almanac;
        petHarvested = {
          itemId: item.id,
          kind:
            ent.category === 'mushroom'
              ? 'harvest_mushroom'
              : ent.category === 'animal' || ent.category === 'meat'
              ? 'collect_animal'
              : ent.category === 'tree'
              ? 'harvest_tree'
              : 'harvest_crop',
        };
        if (ent.category === 'animal') {
          workingTiles[target.y][target.x] = {
            ...target,
            entity: { ...ent, progressMs: 0, ready: false, harvestCount: ent.harvestCount + 1 },
          };
        } else if (ent.category === 'meat') {
          workingTiles[target.y][target.x] = {
            ...target,
            entity: null,
          };
        } else if (ent.category === 'tree') {
          const regrowMs = item.regrowMs ?? Math.round(item.growthMs * 0.45);
          const resetProgress = Math.max(0, item.growthMs - regrowMs);
          workingTiles[target.y][target.x] = {
            ...target,
            entity: { ...ent, progressMs: resetProgress, ready: false, harvestCount: ent.harvestCount + 1 },
          };
        } else {
          const nextM = Math.max(0, (target.wateredRemainingMs ?? 0) - MAX_MOISTURE_MS * 0.35);
          workingTiles[target.y][target.x] = {
            ...target,
            entity: null,
            enriched: false,
            watered: nextM > 0,
            wateredRemainingMs: nextM,
          };
        }
        const bonusCoins = pet.type === 'pig' ? Math.min(40, pet.level * 2) : 0;
        const bonusXp = item.xpReward + (pet.type === 'cat' ? Math.min(35, pet.level * 2) : 0);
        coins += bonusCoins;
        const xr = addXpAndCheckLevelUp({ ...state, coins, xp, level, almanac }, bonusXp);
        coins = xr.state.coins;
        xp = xr.state.xp;
        level = xr.state.level;

        actedTile = {
          x: target.x,
          y: target.y,
          text: `${pet.name}: +1 ${item.produceName}`,
        };
      }
    } else if ((pet.type === 'dog' || pet.type === 'alien') && dryCrops.length > 0) {
      const target = dryCrops[Math.floor(Math.random() * dryCrops.length)];
      workingTiles[target.y][target.x] = {
        ...target,
        watered: true,
        wateredRemainingMs: MAX_MOISTURE_MS,
      };
      actedTile = { x: target.x, y: target.y, text: `${pet.name}: Gegossen!` };
    } else if (pet.type === 'alien' && growingPlots.length > 0) {
      const target = growingPlots[Math.floor(Math.random() * growingPlots.length)];
      const ent = target.entity!;
      const item = CATALOG_BY_ID[ent.itemId];
      if (item && item.growthMs > 0) {
        const boost = item.growthMs * Math.min(0.38, 0.14 + pet.level * 0.01);
        const np = Math.min(item.growthMs, ent.progressMs + boost);
        workingTiles[target.y][target.x] = {
          ...target,
          entity: { ...ent, progressMs: np, ready: np >= item.growthMs },
        };
        actedTile = { x: target.x, y: target.y, text: `${pet.name}: Sternenstrahl!` };
      }
    } else if (dryCrops.length > 0) {
      const target = dryCrops[0];
      workingTiles[target.y][target.x] = {
        ...target,
        watered: true,
        wateredRemainingMs: MAX_MOISTURE_MS,
      };
      actedTile = { x: target.x, y: target.y, text: `${pet.name}: Gegossen!` };
    }

    if (actedTile) {
      pet.x = actedTile.x;
      pet.y = actedTile.y;
      pet.lastActionText = actedTile.text;
      events.petHelped = actedTile;
    }
  }

  // 5b. Hired Farm Workers AI (06:00 - 22:00 Uhr work shift; rests at night; pauses on strike)
  const workerQuestProgress: Partial<Record<QuestKind, number>> = {};
  const workerSpecificHarvests: Record<string, number> = {};
  const addWorkerQuest = (kind: QuestKind, qty: number, itemId?: string) => {
    workerQuestProgress[kind] = (workerQuestProgress[kind] || 0) + qty;
    if (itemId) {
      workerSpecificHarvests[itemId] = (workerSpecificHarvests[itemId] || 0) + qty;
    }
  };
  const isWorkHours = ingameMinutes >= WORKER_WORK_START_MIN && ingameMinutes < WORKER_WORK_END_MIN;
  const workerNow = Date.now();

  if (workers.length > 0) {
    workers = workers.map((worker, idx) => {
      const w = { ...worker };
      if (!isWorkHours) {
        const restX = 6 + (idx % 3);
        const restY = 6;
        if (w.x !== restX || w.y !== restY) {
          w.moveFromX = w.x;
          w.moveFromY = w.y;
          w.movedAt = workerNow;
          w.facing = restX < w.x ? 'left' : 'right';
          w.x = restX;
          w.y = restY;
        }
        w.lastActionText = 'Feierabend (Nachtruhe 22–06 Uhr)';
        return w;
      }

      if (w.onStrike) {
        return w;
      }

      w.workCooldownMs -= deltaMs;
      if (w.workCooldownMs > 0) {
        return w;
      }

      const roleMeta = WORKER_ROLES[w.role];
      const levelSpeedBonus = Math.min(3500, (w.level - 1) * 180);
      w.workCooldownMs = Math.max(4500, roleMeta.baseCooldownMs - levelSpeedBonus);

      const unlockedList: TileData[] = [];
      for (let ty = 0; ty < GRID_SIZE; ty++) {
        for (let tx = 0; tx < GRID_SIZE; tx++) {
          if (workingTiles[ty][tx].unlocked) unlockedList.push(workingTiles[ty][tx]);
        }
      }

      const readyCrops = unlockedList.filter(
        (t) =>
          t.entity &&
          t.entity.ready &&
          !t.entity.damaged &&
          !t.entity.withered &&
          (t.entity.category === 'crop' || t.entity.category === 'mushroom' || t.entity.category === 'tree')
      );
      const readyAnimals = unlockedList.filter(
        (t) => t.entity && t.entity.ready && (t.entity.category === 'animal' || t.entity.category === 'meat')
      );
      const dryTilled = unlockedList
        .filter((t) => t.ground === 'tilled' && !t.watered)
        .sort((a, b) => (b.entity ? 1 : 0) - (a.entity ? 1 : 0));
      const badPlots = unlockedList.filter((t) => t.entity && (t.entity.damaged || t.entity.withered));
      const emptyTilled = unlockedList.filter((t) => t.ground === 'tilled' && !t.entity);

      let actionResult: { x: number; y: number; text: string } | null = null;

      const doHarvestCrop = () => {
        if (!w.tasks.harvest || readyCrops.length === 0) return false;
        const target = readyCrops[0];
        const ent = target.entity!;
        const item = CATALOG_BY_ID[ent.itemId];
        if (!item) return false;

        inventory[item.id] = (inventory[item.id] || 0) + 1;
        stats.totalHarvested += 1;
        stats.harvestedByItem = {
          ...(stats.harvestedByItem || {}),
          [item.id]: ((stats.harvestedByItem || {})[item.id] || 0) + 1,
        };
        almanac = recordAlmanacDiscovery(almanac, item.id).almanac;
        eventState = {
          ...eventState,
          points: eventState.points + Math.max(4, Math.round(item.xpReward * 0.35)),
        };

        if (ent.category === 'tree') {
          const regrowMs = item.regrowMs ?? Math.round(item.growthMs * 0.45);
          const resetProgress = Math.max(0, item.growthMs - regrowMs);
          workingTiles[target.y][target.x] = {
            ...target,
            entity: {
              ...ent,
              progressMs: resetProgress,
              ready: false,
              harvestCount: ent.harvestCount + 1,
            },
          };
        } else {
          const nextM = Math.max(0, (target.wateredRemainingMs ?? 0) - MAX_MOISTURE_MS * 0.4);
          workingTiles[target.y][target.x] = {
            ...target,
            entity: null,
            enriched: false,
            watered: nextM > 0,
            wateredRemainingMs: nextM,
            dryMs: 0,
            idleTilledMs: 0,
          };
        }

        const xr = addXpAndCheckLevelUp({ ...state, coins, xp, level, almanac }, item.xpReward);
        coins = xr.state.coins;
        xp = xr.state.xp;
        level = xr.state.level;
        const questKind: QuestKind =
          ent.category === 'mushroom'
            ? 'harvest_mushroom'
            : ent.category === 'tree'
            ? 'harvest_tree'
            : 'harvest_crop';
        addWorkerQuest(questKind, 1, item.id);
        actionResult = { x: target.x, y: target.y, text: `${w.name}: +1 ${item.produceName}` };
        return true;
      };

      const doCollectAnimal = () => {
        if (!w.tasks.animals || readyAnimals.length === 0) return false;
        const target = readyAnimals[0];
        const ent = target.entity!;
        const item = CATALOG_BY_ID[ent.itemId];
        if (!item) return false;

        inventory[item.id] = (inventory[item.id] || 0) + 1;
        stats.totalHarvested += 1;
        stats.harvestedByItem = {
          ...(stats.harvestedByItem || {}),
          [item.id]: ((stats.harvestedByItem || {})[item.id] || 0) + 1,
        };
        almanac = recordAlmanacDiscovery(almanac, item.id).almanac;
        const bonusXp = w.role === 'rancher' ? Math.round(item.xpReward * 1.25) : item.xpReward;
        eventState = {
          ...eventState,
          points: eventState.points + Math.max(4, Math.round(item.xpReward * 0.35)),
        };

        if (ent.category === 'meat') {
          workingTiles[target.y][target.x] = {
            ...target,
            entity: null,
          };
        } else {
          workingTiles[target.y][target.x] = {
            ...target,
            entity: {
              ...ent,
              progressMs: 0,
              ready: false,
              harvestCount: ent.harvestCount + 1,
            },
          };
        }

        const xr = addXpAndCheckLevelUp({ ...state, coins, xp, level, almanac }, bonusXp);
        coins = xr.state.coins;
        xp = xr.state.xp;
        level = xr.state.level;
        addWorkerQuest('collect_animal', 1, item.id);
        actionResult = { x: target.x, y: target.y, text: `${w.name}: +1 ${item.produceName}` };
        return true;
      };

      const doWater = () => {
        if (!w.tasks.water || dryTilled.length === 0) return false;
        const target = dryTilled[0];
        workingTiles[target.y][target.x] = {
          ...target,
          watered: true,
          wateredRemainingMs: MAX_MOISTURE_MS,
          dryMs: 0,
          idleTilledMs: 0,
        };
        addWorkerQuest('water_tiles', 1);
        actionResult = { x: target.x, y: target.y, text: `${w.name}: Gegossen!` };
        return true;
      };

      const doClearBad = () => {
        if (!w.tasks.harvest || badPlots.length === 0) return false;
        const target = badPlots[0];
        const ent = target.entity!;
        if (ent.withered) {
          workingTiles[target.y][target.x] = {
            ...target,
            entity: null,
            ground: 'grass',
            watered: false,
            wateredRemainingMs: 0,
            dryMs: 0,
            idleTilledMs: 0,
            enriched: false,
          };
          actionResult = { x: target.x, y: target.y, text: `${w.name}: Verdorrt geräumt` };
        } else {
          workingTiles[target.y][target.x] = {
            ...target,
            entity: null,
            enriched: true,
          };
          actionResult = { x: target.x, y: target.y, text: `${w.name}: Feld gepflegt` };
        }
        return true;
      };

      const doReplant = () => {
        if (!w.tasks.replant || emptyTilled.length === 0) return false;
        const selected = CATALOG_BY_ID[state.selectedSeedId];
        let seedItem =
          selected &&
          (selected.category === 'crop' || selected.category === 'mushroom') &&
          (seeds[selected.id] || 0) > 0
            ? selected
            : null;
        if (!seedItem) {
          seedItem =
            CATALOG.find(
              (c) =>
                (c.category === 'crop' || c.category === 'mushroom') &&
                (seeds[c.id] || 0) > 0 &&
                c.seasons.includes(season)
            ) ||
            CATALOG.find(
              (c) => (c.category === 'crop' || c.category === 'mushroom') && (seeds[c.id] || 0) > 0
            ) ||
            null;
        }
        if (!seedItem) return false;

        const target = emptyTilled[0];
        seeds[seedItem.id] = (seeds[seedItem.id] || 1) - 1;
        workingTiles[target.y][target.x] = {
          ...target,
          dryMs: 0,
          idleTilledMs: 0,
          entity: {
            itemId: seedItem.id,
            category: seedItem.category,
            progressMs: 0,
            ready: false,
            harvestCount: 0,
            fedOrWatered: true,
          },
        };
        actionResult = { x: target.x, y: target.y, text: `${w.name}: ${seedItem.name} gesät` };
        return true;
      };

      if (w.role === 'rancher') {
        doCollectAnimal() || doWater() || doHarvestCrop() || doClearBad();
      } else if (w.role === 'gardener') {
        doHarvestCrop() || doWater() || doClearBad() || doReplant() || doCollectAnimal();
      } else {
        doHarvestCrop() || doCollectAnimal() || doWater() || doClearBad() || doReplant();
      }

      if (actionResult !== null) {
        const act = actionResult as { x: number; y: number; text: string };
        w.moveFromX = w.x;
        w.moveFromY = w.y;
        w.movedAt = workerNow;
        w.facing = act.x < w.x ? 'left' : act.x > w.x ? 'right' : w.facing ?? 'right';
        w.x = act.x;
        w.y = act.y;
        w.lastActionText = act.text;

        if (w.level < 20) {
          let wxp = w.xp + 12;
          let wl = w.level;
          while (wl < 20 && wxp >= workerXpRequiredForLevel(wl)) {
            wxp -= workerXpRequiredForLevel(wl);
            wl += 1;
          }
          w.xp = wl >= 20 ? 0 : wxp;
          w.level = wl;
        }

        events.workerActed = [...(events.workerActed || []), act];
      }

      return w;
    });
  }

  // 5c. Artisan Crafting Jobs progression
  const remainingCraftingJobs: CraftingJob[] = [];
  const craftedOutcomes: { itemId: string; qty: number }[] = [];
  const craftStepMs = deltaMs * almanacBonuses.craftSpeedMult * feastSpeedMult;
  (state.craftingJobs || []).forEach((job) => {
    const nextRemaining = job.remainingMs - craftStepMs;
    if (nextRemaining <= 0) {
      const recipe = CRAFT_RECIPES.find((r) => r.id === job.recipeId);
      const outQty = recipe?.outputQty ?? 1;
      const xpGain = recipe?.xpReward ?? 50;
      inventory[job.outputItemId] = (inventory[job.outputItemId] || 0) + outQty;
      stats.totalCrafted = (stats.totalCrafted || 0) + outQty;
      stats.craftedByItem = {
        ...(stats.craftedByItem || {}),
        [job.outputItemId]: ((stats.craftedByItem || {})[job.outputItemId] || 0) + outQty,
      };
      almanac = recordAlmanacDiscovery(almanac, job.outputItemId).almanac;
      craftedOutcomes.push({ itemId: job.outputItemId, qty: outQty });
      eventState = {
        ...eventState,
        points: eventState.points + Math.max(8, Math.round(xpGain * 0.25)),
      };
      const xr = addXpAndCheckLevelUp({ ...state, coins, xp, level, almanac }, xpGain);
      coins = xr.state.coins;
      xp = xr.state.xp;
      level = xr.state.level;
      events.craftedItems = [
        ...(events.craftedItems || []),
        { itemId: job.outputItemId, stationId: job.stationId, xp: xpGain },
      ];
    } else {
      remainingCraftingJobs.push({ ...job, remainingMs: nextRemaining });
    }
  });

  // 5d. Wandering Merchant schedule
  let merchant: WanderingMerchantState = state.merchant || generateMerchantVisit(level, season);
  if (merchant.active) {
    const nextRem = merchant.remainingMs - deltaMs;
    if (nextRem <= 0) {
      merchant = {
        ...merchant,
        active: false,
        remainingMs: 0,
        cooldownMs: 7 * 60 * 1000,
      };
    } else {
      merchant = { ...merchant, remainingMs: nextRem };
    }
  } else {
    const nextCd = merchant.cooldownMs - deltaMs;
    if (nextCd <= 0) {
      merchant = generateMerchantVisit(level, season);
      events.merchantArrived = true;
    } else {
      merchant = { ...merchant, cooldownMs: nextCd };
    }
  }

  // 5e. Hofladen (Farm Shop) visitors & variable artisan baskets (up to 40 visitors/day)
  const baseShop: FarmShopState = state.farmShop
    ? {
        ...createInitialFarmShopState(),
        ...state.farmShop,
        stock: { ...(state.farmShop.stock || {}) },
        visitors: (state.farmShop.visitors || []).map((v) => ({ ...v })),
        recentSales: [...(state.farmShop.recentSales || [])],
      }
    : createInitialFarmShopState();

  const stockedVarietyCount = Object.entries(baseShop.stock).filter(
    ([id, qty]) => qty > 0 && CATALOG_BY_ID[id]?.category === 'artisan'
  ).length;

  if (events.newDay) {
    baseShop.visitorsToday = 0;
    baseShop.spawnedToday = 0;
    baseShop.todayRevenue = 0;

    // Ab Level 200 droht über Nacht Warenverderb im Hofladen (> 3 Stück pro Sorte), sofern keine Kühlung aktiv ist
    if (level >= 200) {
      const activeWorkersCount = workers.filter((w) => !w.onStrike).length;
      const hasCoolingProtection =
        activeWorkersCount >= 2 && (state.house?.floors ?? 1) >= 4 && (state.house?.extras || []).length >= 6;
      if (!hasCoolingProtection) {
        const spoiledItems: { itemId: string; lostQty: number }[] = [];
        let totalLostQty = 0;
        for (const [id, qty] of Object.entries(baseShop.stock)) {
          if (qty > 3 && CATALOG_BY_ID[id]?.category === 'artisan') {
            const lost = Math.max(1, Math.floor(qty * (0.15 + Math.random() * 0.05)));
            if (lost > 0) {
              baseShop.stock[id] = Math.max(0, qty - lost);
              spoiledItems.push({ itemId: id, lostQty: lost });
              totalLostQty += lost;
            }
          }
        }
        if (totalLostQty > 0) {
          events.shopSpoilage = { totalLostQty, items: spoiledItems };
        }
      }
    }

    baseShop.dailyTargetVisitors =
      createDailyShopTargetVisitors(
        season,
        weather,
        calculateFarmCharm(workingTiles),
        stockedVarietyCount,
        baseShop.reputation ?? 10
      ) + getThemeParkMetrics(state.themePark).shopVisitorBonus;
    baseShop.specialOrder = createDailyShopSpecialOrder(day, level, season, weather);
    baseShop.nextVisitorMs = 4500;
  }

  // Optional worker auto-restock of Hofladen shelves
  const hasActiveWorker = workers.some((w) => !w.onStrike);
  if (baseShop.autoRestock && hasActiveWorker) {
    const restockCap = Math.max(3, baseShop.autoRestockTarget ?? 6);
    // 1. Keep existing varieties topped up up to restockCap
    for (const [id, curStock] of Object.entries(baseShop.stock)) {
      if (CATALOG_BY_ID[id]?.category !== 'artisan') continue;
      if (curStock > 0 && curStock < 2) {
        const owned = inventory[id] || 0;
        const needed = Math.min(owned, restockCap - curStock);
        if (needed > 0) {
          inventory[id] = owned - needed;
          baseShop.stock[id] = curStock + needed;
        }
      }
    }
    // 2. If shelves are running low on variety (< 4), top up with available artisan items from backpack
    let activeVarieties = Object.entries(baseShop.stock).filter(
      ([id, q]) => q > 0 && CATALOG_BY_ID[id]?.category === 'artisan'
    ).length;
    if (activeVarieties < 4) {
      for (const item of CATALOG) {
        if (item.category !== 'artisan') continue;
        if (activeVarieties >= 6) break;
        const owned = inventory[item.id] || 0;
        const curStock = baseShop.stock[item.id] || 0;
        if (owned > 0 && curStock === 0) {
          const move = Math.min(owned, restockCap);
          inventory[item.id] = owned - move;
          baseShop.stock[item.id] = move;
          activeVarieties += 1;
        }
      }
    }
  }

  // 5d-2. Village House Fire & Fire Brigade Lifecycle (every 1-3 ingame days, burns & extinguishes 2-3 ingame hours)
  const rawFire = state.villageFire || createInitialVillageFireState();
  const villageFire: VillageFireState = {
    ...rawFire,
    pendingNewspaperReports: [...(rawFire.pendingNewspaperReports || [])],
  };
  if (villageFire.sootHouseId && day >= villageFire.sootUntilDay) {
    villageFire.sootHouseId = null;
    villageFire.sootUntilDay = 0;
  }

  if (villageFire.active) {
    villageFire.remainingMs = Math.max(0, villageFire.remainingMs - deltaMs);
    if (villageFire.remainingMs <= 0) {
      const durationMinutes = Math.max(120, Math.round(villageFire.totalMs / REAL_MS_PER_INGAME_MINUTE));
      const report: VillageFireReport = {
        id: `fire_${day}_${Date.now()}`,
        day,
        houseId: villageFire.houseId,
        houseName: villageFire.houseName,
        causeTitle: villageFire.causeTitle,
        causeDetail: villageFire.causeDetail,
        startedAtTime: villageFire.startedAtTime,
        durationMinutes,
        playerHelped: villageFire.playerHelped,
      };
      villageFire.pendingNewspaperReports.push(report);
      villageFire.active = false;
      villageFire.sootHouseId = villageFire.houseId;
      villageFire.sootUntilDay = day + 1;
      villageFire.nextFireCooldownMs = createNextFireCooldownMs(level);
      if (villageFire.playerHelped) {
        stats.totalCrisesSurvived = (stats.totalCrisesSurvived || 0) + 1;
      } else if (level >= 200) {
        baseShop.reputation = Math.max(0, (baseShop.reputation ?? 10) - 6);
      }
      events.villageFireExtinguished = {
        houseId: villageFire.houseId,
        houseName: villageFire.houseName,
        playerHelped: villageFire.playerHelped,
      };
    }
  } else {
    villageFire.nextFireCooldownMs -= deltaMs;
    if (villageFire.nextFireCooldownMs <= 0) {
      const targetHouse = VILLAGE_HOUSES[Math.floor(Math.random() * VILLAGE_HOUSES.length)] || VILLAGE_HOUSES[0];
      const cause = pickFireCauseForHouse(targetHouse, weather);
      // Extinguish duration: 2 to 3 ingame hours (120..180 ingame minutes)
      const fireDurationMs = Math.round((2 + Math.random()) * 60 * REAL_MS_PER_INGAME_MINUTE);
      villageFire.active = true;
      villageFire.houseId = targetHouse.id;
      villageFire.houseName = targetHouse.name;
      villageFire.causeTitle = cause.title;
      villageFire.causeDetail = cause.detail;
      villageFire.startedAtTime = formatIngameTime(ingameMinutes);
      villageFire.totalMs = fireDurationMs;
      villageFire.remainingMs = fireDurationMs;
      villageFire.playerHelped = false;
      villageFire.sootHouseId = null;
      events.villageFireStarted = {
        houseId: targetHouse.id,
        houseName: targetHouse.name,
        causeTitle: cause.title,
      };
    }
  }

  // 5d-3. Owned Westviertel Commercial & Industrial Businesses Profit Payouts (every ingame hour) & Outage Check
  const rawBiz = state.villageBusinesses || createInitialVillageBusinessesState(day);
  const villageBusinesses: VillageBusinessState = {
    ownedIds: [...(rawBiz.ownedIds || [])],
    totalEarnedById: { ...(rawBiz.totalEarnedById || {}) },
    todayEarnedById: day !== rawBiz.lastPayoutDay ? {} : { ...(rawBiz.todayEarnedById || {}) },
    brokenById: { ...(rawBiz.brokenById || {}) },
    outageCheckAccMs: rawBiz.outageCheckAccMs || 0,
    payoutAccMs: rawBiz.payoutAccMs || 0,
    lastPayoutDay: day,
  };
  if (villageBusinesses.ownedIds.length > 0) {
    const HOUR_MS = 60 * REAL_MS_PER_INGAME_MINUTE;
    const OUTAGE_INTERVAL_MS = 30 * REAL_MS_PER_INGAME_MINUTE;
    if (level >= 200) {
      villageBusinesses.outageCheckAccMs = (villageBusinesses.outageCheckAccMs || 0) + deltaMs;
      if (villageBusinesses.outageCheckAccMs >= OUTAGE_INTERVAL_MS) {
        villageBusinesses.outageCheckAccMs -= OUTAGE_INTERVAL_MS;
        const brokenCount = Object.keys(villageBusinesses.brokenById || {}).length;
        const workingIds = villageBusinesses.ownedIds.filter((id) => !villageBusinesses.brokenById?.[id]);
        if (workingIds.length > 0 && brokenCount < 2 && Math.random() < 0.09) {
          const pickedId = workingIds[Math.floor(Math.random() * workingIds.length)];
          const spec = VILLAGE_BUSINESS_BY_ID[pickedId];
          if (spec) {
            const reasons = [
              'Kühlaggregat ausgefallen',
              'Förderband-Störung im Werk',
              'Kurzschluss im Hauptschalter',
              'Lieferwagen-Achsschaden',
            ];
            const reason = reasons[Math.floor(Math.random() * reasons.length)];
            villageBusinesses.brokenById = {
              ...(villageBusinesses.brokenById || {}),
              [pickedId]: {
                reason,
                brokenAtDay: day,
                repairCost: spec.repairCost,
              },
            };
            events.businessOutage = {
              businessId: pickedId,
              name: spec.name,
              reason,
              repairCost: spec.repairCost,
            };
          }
        }
      }
    }

    villageBusinesses.payoutAccMs += deltaMs;
    const aggregatedPayouts: Partial<Record<VillageBusinessId, number>> = {};
    while (villageBusinesses.payoutAccMs >= HOUR_MS) {
      villageBusinesses.payoutAccMs -= HOUR_MS;
      for (const bizId of villageBusinesses.ownedIds) {
        if (villageBusinesses.brokenById?.[bizId]) continue; // Störung stoppt Erträge!
        const spec = VILLAGE_BUSINESS_BY_ID[bizId];
        if (!spec) continue;
        const payout = Math.round(spec.hourlyProfitBase * (0.92 + Math.random() * 0.16));
        coins += payout;
        villageBusinesses.totalEarnedById[bizId] = (villageBusinesses.totalEarnedById[bizId] || 0) + payout;
        villageBusinesses.todayEarnedById[bizId] = (villageBusinesses.todayEarnedById[bizId] || 0) + payout;
        aggregatedPayouts[bizId] = (aggregatedPayouts[bizId] || 0) + payout;
      }
    }
    const entries = Object.entries(aggregatedPayouts) as [VillageBusinessId, number][];
    if (entries.length > 0) {
      events.businessPayouts = entries.map(([businessId, amount]) => ({
        businessId,
        name: VILLAGE_BUSINESS_BY_ID[businessId]?.shortLabel || businessId,
        amount,
      }));
    }
  } else {
    villageBusinesses.payoutAccMs = 0;
  }

  // 5d-4. Owned Abenteuerpark Sonnental Profit Payouts (every ingame hour) & Breakdown Check
  const rawPark = state.themePark || createInitialThemeParkState(day);
  const themePark: ThemeParkState = {
    owned: Boolean(rawPark.owned),
    purchasedAtDay: rawPark.purchasedAtDay,
    attractions: Array.isArray(rawPark.attractions) ? [...rawPark.attractions] : [],
    todayEarned: day !== rawPark.lastPayoutDay ? 0 : rawPark.todayEarned || 0,
    totalEarned: rawPark.totalEarned || 0,
    payoutAccMs: rawPark.payoutAccMs || 0,
    lastPayoutDay: day,
    breakdown: rawPark.breakdown ? { ...rawPark.breakdown } : null,
  };
  if (themePark.owned) {
    const HOUR_MS = 60 * REAL_MS_PER_INGAME_MINUTE;
    const parkMetrics = getThemeParkMetrics(themePark);
    themePark.payoutAccMs += deltaMs;
    let parkPayoutSum = 0;
    while (themePark.payoutAccMs >= HOUR_MS) {
      themePark.payoutAccMs -= HOUR_MS;
      if (themePark.breakdown) continue; // Park steht still bis zur Reparatur
      if (level >= 200 && Math.random() < 0.08) {
        const parkReasons = [
          'TÜV-Antriebsstörung am Hauptverteiler',
          'Kassen- & Drehkreuzsystem blockiert',
          'Notbremse der Schienenbahn ausgelöst',
        ];
        const reason = parkReasons[Math.floor(Math.random() * parkReasons.length)];
        const repairCost = Math.round(115_000 + themePark.attractions.length * 45_000);
        themePark.breakdown = { reason, brokenAtDay: day, repairCost };
        events.parkOutage = { reason, repairCost };
        continue;
      }
      const hourlyGain = Math.round(parkMetrics.hourlyProfitBase * (0.92 + Math.random() * 0.16));
      coins += hourlyGain;
      themePark.todayEarned += hourlyGain;
      themePark.totalEarned += hourlyGain;
      parkPayoutSum += hourlyGain;
    }
    if (parkPayoutSum > 0) {
      events.themeParkPayout = parkPayoutSum;
    }
  } else {
    themePark.payoutAccMs = 0;
  }

  // 5d-5. Wirtschafts-Inspektion & Sonderabgabe (alle 2 Ingame-Tage ab Level 200 bei >= 150.000 M Barbestand)
  const rawEconomy = state.economyCrisis || createInitialEconomyCrisisState(day);
  let economyCrisis: EconomyCrisisState = { ...rawEconomy };
  if (level >= 200 && day - economyCrisis.lastInspectionDay >= 2 && ingameMinutes >= 12 * 60) {
    economyCrisis.lastInspectionDay = day;
    if (coins >= 150_000) {
      const levy = Math.min(350_000, Math.max(25_000, Math.round(coins * 0.025)));
      coins = Math.max(0, coins - levy);
      const reason = 'Betriebs- & Hofprüfung Sonnental (2,5 % Sonderabgabe)';
      economyCrisis = {
        ...economyCrisis,
        lastLevyCoins: levy,
        lastLevyReason: reason,
        inspectionsTotal: (economyCrisis.inspectionsTotal || 0) + 1,
      };
      stats.totalCrisesSurvived = (stats.totalCrisesSurvived || 0) + 1;
      events.economyLevy = { amount: levy, reason };
    }
  }

  const shopTrend = getShopTrendContext(season, weather);
  let shopSellCoinsEarned = 0;
  const moveTowards = (v: ShopVisitor, tx: number, ty: number, step: number): boolean => {
    const dx = tx - v.x;
    const dy = ty - v.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= step) {
      v.x = tx;
      v.y = ty;
      return true;
    }
    v.x += (dx / dist) * step;
    v.y += (dy / dist) * step;
    return false;
  };

  const visitorStep = (deltaMs / 1000) * 2.05;
  const nextVisitors: ShopVisitor[] = [];
  for (const vis of baseShop.visitors) {
    // Residents of a currently burning house cannot shop and immediately return/avoid the Hofladen
    if (
      villageFire.active &&
      vis.homeHouseId === villageFire.houseId &&
      vis.phase !== 'leaving'
    ) {
      vis.phase = 'leaving';
      vis.leftEmptyHanded = true;
      const homeHouse = vis.homeHouseId ? VILLAGE_HOUSE_BY_ID[vis.homeHouseId] : undefined;
      if (homeHouse) {
        vis.waypoints = buildWaypointsToHouse(homeHouse, vis.laneOffset ?? 0);
        vis.waypointIdx = 0;
      }
    }

    if (vis.phase === 'entering') {
      if (vis.waypoints && vis.waypoints.length > 0) {
        const idx = vis.waypointIdx ?? 0;
        const target = vis.waypoints[Math.min(idx, vis.waypoints.length - 1)];
        const reached = moveTowards(vis, target.x, target.y, visitorStep);
        if (reached) {
          if (idx + 1 < vis.waypoints.length) {
            vis.waypointIdx = idx + 1;
          } else {
            vis.phase = 'browsing';
            vis.browsingRemainingMs = 2300 + Math.random() * 1400;
          }
        }
      } else {
        if (vis.y < 3.5 && vis.x > 3.05) {
          moveTowards(vis, 3.0, 3.0, visitorStep);
        } else if (vis.y < 6.2) {
          moveTowards(vis, 3.0, 6.25, visitorStep);
        } else {
          const arrivedDoor = moveTowards(vis, 1.95, 6.25, visitorStep);
          if (arrivedDoor) {
            vis.phase = 'browsing';
            vis.browsingRemainingMs = 2300 + Math.random() * 1400;
          }
        }
      }
      nextVisitors.push(vis);
    } else if (vis.phase === 'browsing') {
      vis.browsingRemainingMs -= deltaMs;
      if (vis.browsingRemainingMs <= 0) {
        baseShop.visitorsToday += 1;
        baseShop.totalVisitorsAllTime = (baseShop.totalVisitorsAllTime || 0) + 1;

        const archetype: ShopVisitorArchetype = vis.archetype || 'wanderer';
        const buyerName = vis.visitorName || 'Dorfgast';

        const availableIds = Object.entries(baseShop.stock)
          .filter(([id, qty]) => qty > 0 && CATALOG_BY_ID[id]?.category === 'artisan')
          .map(([id]) => id);

        if (availableIds.length > 0) {
          const shelfVariety = availableIds.length;
          const desiredDistinctCount =
            archetype === 'wanderer'
              ? Math.min(shelfVariety, 1 + (Math.random() < 0.75 ? 1 : 0) + (Math.random() < 0.45 ? 1 : 0))
              : archetype === 'gourmet'
                ? Math.min(shelfVariety, Math.random() < 0.5 ? 2 : 1)
                : archetype === 'bulk_buyer'
                  ? Math.min(shelfVariety, Math.random() < 0.35 ? 2 : 1)
                  : Math.min(shelfVariety, Math.random() < 0.6 ? 2 : 1);

          // Weighted pick helper favoring trend & customer archetype
          const pool = [...availableIds];
          const pickedIds: string[] = [];
          for (let k = 0; k < desiredDistinctCount && pool.length > 0; k++) {
            const weights = pool.map((id) => {
              const item = CATALOG_BY_ID[id];
              if (!item) return 1;
              let w = 10;
              if (shopTrend.favoredIds.includes(id)) w += 12;
              if (archetype === 'gourmet' && item.sellPrice >= 900) w += 16;
              if (archetype === 'wanderer' && item.sellPrice <= 900) w += 8;
              if (archetype === 'bulk_buyer' && item.sellPrice <= 850) w += 12;
              return w;
            });
            const totalW = weights.reduce((a, b) => a + b, 0);
            let roll = Math.random() * totalW;
            let chosenIdx = 0;
            for (let wi = 0; wi < weights.length; wi++) {
              roll -= weights[wi];
              if (roll <= 0) {
                chosenIdx = wi;
                break;
              }
            }
            pickedIds.push(pool[chosenIdx]);
            pool.splice(chosenIdx, 1);
          }

          const boughtItems: ShopVisitorBoughtItem[] = [];
          let totalQtyBought = 0;
          let baseCoinsTotal = 0;

          for (const pickedId of pickedIds) {
            const item = CATALOG_BY_ID[pickedId];
            const availableQty = baseShop.stock[pickedId] || 0;
            if (!item || availableQty <= 0) continue;

            // Varied desired quantity based on customer archetype, item price tier, and weather trend
            let minQ = 1;
            let maxQ = 3;
            if (archetype === 'bulk_buyer') {
              minQ = 3;
              maxQ = item.sellPrice <= 600 ? 7 : item.sellPrice <= 1100 ? 5 : 3;
            } else if (archetype === 'wanderer') {
              minQ = 1;
              maxQ = item.sellPrice <= 500 ? 5 : item.sellPrice <= 1000 ? 3 : 2;
            } else if (archetype === 'gourmet') {
              minQ = 1;
              maxQ = item.sellPrice >= 1500 ? 2 : 3;
            } else {
              // neighbor
              minQ = 1;
              maxQ = item.sellPrice <= 700 ? 4 : 2;
            }

            if (shopTrend.favoredIds.includes(pickedId)) {
              maxQ += 1;
            }
            if ((baseShop.reputation ?? 10) >= 50 && Math.random() < 0.35) {
              maxQ += 1;
            }

            const desiredQty = minQ + Math.floor(Math.random() * (maxQ - minQ + 1));
            const actualQty = Math.max(1, Math.min(availableQty, desiredQty));

            baseShop.stock[pickedId] = Math.max(0, availableQty - actualQty);
            const trendMult = shopTrend.favoredIds.includes(pickedId) ? 1.1 : 1.0;
            const unitPrice = Math.round(
              item.sellPrice *
                1.15 *
                trendMult *
                houseBonuses.sellMult *
                almanacBonuses.sellMult *
                partnerBonuses.sellMult
            );
            const lineCoins = unitPrice * actualQty;

            boughtItems.push({ itemId: pickedId, qty: actualQty, coins: lineCoins });
            totalQtyBought += actualQty;
            baseCoinsTotal += lineCoins;
          }

          if (boughtItems.length > 0) {
            // Variety, combo & gourmet tip + married partner shop bonus
            let tipRate = partnerBonuses.shopTipBonus;
            if (shelfVariety >= 4) tipRate += 0.06;
            if (boughtItems.length >= 2 || totalQtyBought >= 3) tipRate += 0.06;
            if (archetype === 'gourmet') tipRate += 0.08;
            const tipCoins = tipRate > 0 ? Math.max(5, Math.round(baseCoinsTotal * tipRate)) : 0;
            const totalEarned = baseCoinsTotal + tipCoins;

            coins += totalEarned;
            baseShop.todayRevenue += totalEarned;
            baseShop.totalRevenue += totalEarned;
            baseShop.totalSoldCount += totalQtyBought;
            baseShop.reputation = Math.min(
              100,
              (baseShop.reputation ?? 10) + (boughtItems.length >= 2 || totalQtyBought >= 3 ? 2 : 1)
            );
            stats.totalSoldCoins += totalEarned;
            shopSellCoinsEarned += totalEarned;

            let friendshipGain = 0;
            if (vis.neighborId) {
              const nIdx = neighbors.findIndex((n) => n.id === vis.neighborId);
              if (nIdx !== -1) {
                friendshipGain = 1;
                neighbors = neighbors.map((n, idx) =>
                  idx === nIdx ? { ...n, friendship: Math.min(100, n.friendship + 1) } : n
                );
              }
            }

            const timeLabel = formatIngameTime(ingameMinutes);
            const newLogEntries: FarmShopSaleEntry[] = boughtItems.map((bi, idx) => ({
              itemId: bi.itemId,
              qty: bi.qty,
              coins: idx === 0 ? bi.coins + tipCoins : bi.coins,
              tipCoins: idx === 0 && tipCoins > 0 ? tipCoins : undefined,
              buyerName,
              buyerArchetype: archetype,
              day,
              ingameTime: timeLabel,
            }));
            baseShop.recentSales = [...newLogEntries, ...baseShop.recentSales].slice(0, 24);

            vis.boughtItemId = boughtItems[0].itemId;
            vis.boughtItems = boughtItems;
            vis.boughtTotalQty = totalQtyBought;
            vis.boughtCoins = totalEarned;
            vis.boughtTipCoins = tipCoins;

            const summaryParts = boughtItems.map((bi) => {
              const nm = CATALOG_BY_ID[bi.itemId]?.produceName || bi.itemId;
              return `${bi.qty}× ${nm}`;
            });
            const summaryText =
              summaryParts.length <= 2
                ? `${summaryParts.join(' + ')} (+${totalEarned} M${tipCoins > 0 ? ` inkl. ${tipCoins} Trinkgeld` : ''})`
                : `${totalQtyBought}× Warenkorb (${boughtItems.length} Sorten · +${totalEarned} M)`;

            events.shopSales = [
              ...(events.shopSales || []),
              {
                itemId: boughtItems[0].itemId,
                qty: totalQtyBought,
                coins: totalEarned,
                tipCoins,
                summaryText,
                buyerName,
                archetype,
                friendshipGain,
              },
            ];
          } else {
            vis.leftEmptyHanded = true;
          }
        } else {
          vis.leftEmptyHanded = true;
        }
        vis.phase = 'leaving';
        const homeHouse = vis.homeHouseId ? VILLAGE_HOUSE_BY_ID[vis.homeHouseId] : undefined;
        if (homeHouse) {
          vis.waypoints = buildWaypointsToHouse(homeHouse, vis.laneOffset ?? 0);
          vis.waypointIdx = 0;
        }
      }
      nextVisitors.push(vis);
    } else {
      if (vis.waypoints && vis.waypoints.length > 0) {
        const idx = vis.waypointIdx ?? 0;
        const target = vis.waypoints[Math.min(idx, vis.waypoints.length - 1)];
        const reached = moveTowards(vis, target.x, target.y, visitorStep);
        if (reached) {
          if (idx + 1 < vis.waypoints.length) {
            vis.waypointIdx = idx + 1;
          } else {
            // Arrived back home and entered house door!
            continue;
          }
        }
      } else {
        if (vis.y > 5.8 && vis.x < 2.95) {
          moveTowards(vis, 3.0, 6.25, visitorStep);
        } else if (vis.y > 3.05) {
          moveTowards(vis, 3.0, 3.0, visitorStep);
        } else {
          const exited = moveTowards(vis, 8.8, 3.0, visitorStep);
          if (exited) continue;
        }
      }
      nextVisitors.push(vis);
    }
  }
  baseShop.visitors = nextVisitors;

  const shopHours = ingameMinutes >= 360 && ingameMinutes <= 1410;
  if (shopHours && baseShop.spawnedToday < baseShop.dailyTargetVisitors) {
    baseShop.nextVisitorMs -= deltaMs;
    if (baseShop.nextVisitorMs <= 0 && baseShop.visitors.length < 10) {
      // Pick an available village resident from one of the ~30 houses (excluding any currently burning house!)
      const outResidentIds = new Set(
        baseShop.visitors.map((v) => v.residentId).filter((id): id is string => Boolean(id))
      );
      const fireBlockedHouseId = villageFire.active ? villageFire.houseId : null;
      const eligibleResidents = VILLAGE_RESIDENTS.filter((r) => r.houseId !== fireBlockedHouseId);
      const idleResidents = eligibleResidents.filter((r) => !outResidentIds.has(r.id));
      const pool = idleResidents.length > 0 ? idleResidents : eligibleResidents;
      const resident = pool[Math.floor(Math.random() * pool.length)];
      const house = VILLAGE_HOUSE_BY_ID[resident.houseId] || VILLAGE_HOUSE_BY_ID['vh_01'];
      const laneOffset = Number(((Math.random() - 0.5) * 0.28).toFixed(2));
      const matchedNeighbor = resident.neighborId
        ? neighbors.find((n) => n.id === resident.neighborId)
        : undefined;

      baseShop.visitors.push({
        id: `vis_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        x: house.doorX,
        y: house.doorY,
        phase: 'entering',
        browsingRemainingMs: 0,
        shirtColor: matchedNeighbor ? matchedNeighbor.avatar.outfitColor : resident.shirtColor,
        hairColor: matchedNeighbor ? matchedNeighbor.avatar.hairColor : resident.hairColor,
        skinTone: matchedNeighbor ? matchedNeighbor.avatar.skinTone : resident.skinTone,
        archetype: resident.archetype,
        visitorName: matchedNeighbor ? matchedNeighbor.name : resident.name,
        hatColor: resident.hatColor,
        neighborId: resident.neighborId,
        residentId: resident.id,
        homeHouseId: house.id,
        laneOffset,
        waypoints: buildWaypointsToShop(house, laneOffset),
        waypointIdx: 0,
      });
      baseShop.spawnedToday += 1;

      const remainingToSpawn = Math.max(1, baseShop.dailyTargetVisitors - baseShop.spawnedToday);
      const remainingMinutes = Math.max(15, 1410 - ingameMinutes);
      const avgRealMsPerVisitor = Math.max(
        4500,
        Math.min(18_000, Math.round((remainingMinutes * REAL_MS_PER_INGAME_MINUTE) / remainingToSpawn))
      );
      baseShop.nextVisitorMs = Math.round(avgRealMsPerVisitor * (0.65 + Math.random() * 0.6));
    } else if (baseShop.nextVisitorMs <= 0) {
      baseShop.nextVisitorMs = 3500;
    }
  }

  // 5f. Daily 10:00 AM Animated Postman & Mailbox (Option 1: uncollected mail stays until next 10:00 delivery)
  const initialSnapNow = buildMailboxSnapshot(day, stats, fishing?.totalCaught || 0, baseShop);
  const mailbox: MailboxState = state.mailbox
    ? {
        ...state.mailbox,
        postman: { ...state.mailbox.postman },
        archive: [...(state.mailbox.archive || [])],
        lastSnapshot: state.mailbox.lastSnapshot || initialSnapNow,
      }
    : createInitialMailboxState(initialSnapNow);

  if (events.newDay) {
    mailbox.postman.deliveredToday = false;
  }

  let romance: RomanceState = state.romance
    ? {
        ...createInitialRomanceState(),
        ...state.romance,
      }
    : createInitialRomanceState();

  const triggerMailDelivery = () => {
    const curSnap = buildMailboxSnapshot(day, stats, fishing?.totalCaught || 0, baseShop);
    const weddingReports = romance.pendingNewspaperWedding ? [romance.pendingNewspaperWedding] : [];
    const { pendingMail, issue } = generateDailyMailDelivery({
      day,
      season,
      weather,
      level,
      ingameMinutes,
      marketHotItems,
      marketCrashedItems,
      neighbors,
      prevSnapshot: mailbox.lastSnapshot,
      currentSnapshot: curSnap,
      farmShop: baseShop,
      fireReports: villageFire.pendingNewspaperReports,
      weddingReports,
    });
    villageFire.pendingNewspaperReports = [];
    romance = { ...romance, pendingNewspaperWedding: null };
    mailbox.pendingMail = pendingMail; // Option 1: replaces any uncollected mail at 10:00
    mailbox.lastDeliveredDay = day;
    mailbox.lastSnapshot = curSnap;
    mailbox.archive = [issue, ...mailbox.archive].slice(0, 10);
    mailbox.postman.deliveredToday = true;
    events.mailDelivered = true;
  };

  if (!mailbox.postman.deliveredToday && ingameMinutes >= 598) {
    if (!mailbox.postman.active) {
      if (ingameMinutes >= 625) {
        // Offline / time-jump catch-up past 10:25 AM
        triggerMailDelivery();
      } else {
        mailbox.postman = {
          active: true,
          x: 8.8,
          y: 3.0,
          phase: 'to_box',
          timerMs: 0,
          deliveredToday: false,
        };
      }
    }
  }

  if (mailbox.postman.active) {
    const pmStep = (deltaMs / 1000) * 1.45;
    if (mailbox.postman.phase === 'to_box') {
      if (mailbox.postman.x > 4.45) {
        mailbox.postman.x = Math.max(4.45, mailbox.postman.x - pmStep);
      } else if (ingameMinutes >= 600) {
        triggerMailDelivery();
        mailbox.postman.phase = 'delivering';
        mailbox.postman.timerMs = 1850;
      }
    } else if (mailbox.postman.phase === 'delivering') {
      mailbox.postman.timerMs -= deltaMs;
      if (mailbox.postman.timerMs <= 0) {
        mailbox.postman.phase = 'leaving';
        mailbox.postman.timerMs = 0;
      }
    } else if (mailbox.postman.phase === 'leaving') {
      mailbox.postman.x += pmStep;
      if (mailbox.postman.x >= 8.9) {
        mailbox.postman.active = false;
      }
    }
  }

  // 6. Rare Wild Fly Agaric Spawn (max 1 on empty meadow tile, max 1x/day + cooldown + mushroom weather) & Buff Timer
  let mushroomEffect = state.mushroomEffect || {
    psychedelicRemainingMs: 0,
    luckBuffRemainingMs: 0,
    respawnCooldownMs: 0,
    lastEatenDay: 0,
  };
  const nextCooldownMs = Math.max(0, (mushroomEffect.respawnCooldownMs ?? 0) - deltaMs);

  if (mushroomEffect.psychedelicRemainingMs > 0) {
    const nextPsy = mushroomEffect.psychedelicRemainingMs - deltaMs;
    if (nextPsy <= 0) {
      mushroomEffect = {
        ...mushroomEffect,
        psychedelicRemainingMs: 0,
        luckBuffRemainingMs: FLY_AGARIC_BUFF_MS,
        respawnCooldownMs: nextCooldownMs,
      };
      events.mushroomLuckStarted = true;
    } else {
      mushroomEffect = {
        ...mushroomEffect,
        psychedelicRemainingMs: nextPsy,
        respawnCooldownMs: nextCooldownMs,
      };
    }
  } else if (mushroomEffect.luckBuffRemainingMs > 0) {
    mushroomEffect = {
      ...mushroomEffect,
      luckBuffRemainingMs: Math.max(0, mushroomEffect.luckBuffRemainingMs - deltaMs),
      respawnCooldownMs: nextCooldownMs,
    };
  } else if (nextCooldownMs !== (mushroomEffect.respawnCooldownMs ?? 0)) {
    mushroomEffect = {
      ...mushroomEffect,
      respawnCooldownMs: nextCooldownMs,
    };
  }

  let flyAgaricPos = state.flyAgaricPos ?? null;
  if (flyAgaricPos) {
    const spot = workingTiles[flyAgaricPos.y]?.[flyAgaricPos.x];
    if (!spot || !spot.unlocked || spot.ground !== 'grass' || spot.entity) {
      flyAgaricPos = null;
    }
  }

  const effectBusy =
    mushroomEffect.psychedelicRemainingMs > 0 ||
    mushroomEffect.luckBuffRemainingMs > 0 ||
    (mushroomEffect.respawnCooldownMs ?? 0) > 0;
  const alreadyEatenToday = mushroomEffect.lastEatenDay === day;
  const weatherMushroomMult =
    weather === 'rainy' || weather === 'foggy'
      ? 1.8
      : weather === 'cloudy'
      ? 1.15
      : weather === 'sunny'
      ? 0.75
      : weather === 'frost'
      ? 0.5
      : 0.85;

  if (
    !flyAgaricPos &&
    !effectBusy &&
    !alreadyEatenToday &&
    Math.random() < (deltaMs / 1000) * FLY_AGARIC_SPAWN_CHANCE_PER_SEC * weatherMushroomMult
  ) {
    const emptyMeadowTiles: { x: number; y: number }[] = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const t = workingTiles[y][x];
        if (t.unlocked && t.ground === 'grass' && !t.entity) {
          emptyMeadowTiles.push({ x, y });
        }
      }
    }
    if (emptyMeadowTiles.length > 0) {
      flyAgaricPos = emptyMeadowTiles[Math.floor(Math.random() * emptyMeadowTiles.length)];
    }
  }

  // 6b. Winter Festival Events:
  //     - Winter Day 1 at 20:00 (1200 min): Santa & Reindeer fly over and drop a Christmas decor gift on a free tile
  //     - Winter Day 2 at 23:59 (1439 min): New Year's Eve Fireworks show for 3 real minutes
  const rawFest = state.winterFestival || createInitialWinterFestivalState();
  let winterFestival: WinterFestivalState = {
    lastSantaDay: rawFest.lastSantaDay ?? 0,
    santaSleigh: rawFest.santaSleigh ? { ...rawFest.santaSleigh } : null,
    droppedGifts: [...(rawFest.droppedGifts || [])].filter((g) => {
      const gt = workingTiles[g.y]?.[g.x];
      return Boolean(gt && gt.unlocked && !gt.entity);
    }),
    lastFireworksDay: rawFest.lastFireworksDay ?? 0,
    fireworks: rawFest.fireworks ? { ...rawFest.fireworks } : null,
  };

  // Trigger Santa on Winter Day 1 from 20:00 onwards
  if (
    season === 'winter' &&
    getDayInSeason(day) === 1 &&
    ingameMinutes >= 20 * 60 &&
    winterFestival.lastSantaDay !== day
  ) {
    const grassCandidates: { x: number; y: number }[] = [];
    const fallbackCandidates: { x: number; y: number }[] = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const t = workingTiles[y][x];
        if (!t.unlocked || t.entity) continue;
        if (flyAgaricPos && flyAgaricPos.x === x && flyAgaricPos.y === y) continue;
        if (winterFestival.droppedGifts.some((g) => g.x === x && g.y === y)) continue;
        if (t.ground === 'grass' || t.ground === 'path') {
          grassCandidates.push({ x, y });
        } else {
          fallbackCandidates.push({ x, y });
        }
      }
    }
    const targetPool = grassCandidates.length > 0 ? grassCandidates : fallbackCandidates;
    const dropTarget =
      targetPool.length > 0 ? targetPool[Math.floor(Math.random() * targetPool.length)] : null;

    winterFestival.lastSantaDay = day;
    winterFestival.santaSleigh = {
      active: true,
      startedDay: day,
      remainingMs: SANTA_FLIGHT_DURATION_MS,
      durationMs: SANTA_FLIGHT_DURATION_MS,
      dropTarget,
      giftDropped: false,
    };
    events.santaArrived = true;
  }

  // Progress active Santa flight & drop Christmas gift
  if (winterFestival.santaSleigh?.active) {
    const nextRem = winterFestival.santaSleigh.remainingMs - deltaMs;
    const elapsedFlight = winterFestival.santaSleigh.durationMs - nextRem;
    if (!winterFestival.santaSleigh.giftDropped && elapsedFlight >= SANTA_DROP_DELAY_MS) {
      let dropPos = winterFestival.santaSleigh.dropTarget;
      if (
        !dropPos ||
        !workingTiles[dropPos.y]?.[dropPos.x]?.unlocked ||
        workingTiles[dropPos.y]?.[dropPos.x]?.entity
      ) {
        // Re-pick an open tile if the target got occupied meanwhile
        const alt: { x: number; y: number }[] = [];
        for (let y = 0; y < GRID_SIZE; y++) {
          for (let x = 0; x < GRID_SIZE; x++) {
            const t = workingTiles[y][x];
            if (t.unlocked && !t.entity && !(flyAgaricPos && flyAgaricPos.x === x && flyAgaricPos.y === y)) {
              alt.push({ x, y });
            }
          }
        }
        dropPos = alt.length > 0 ? alt[Math.floor(Math.random() * alt.length)] : null;
      }

      winterFestival.santaSleigh.giftDropped = true;
      if (dropPos) {
        const giftItemId = pickRandomWinterGiftDecorId();
        const giftDrop: WinterGiftDrop = {
          x: dropPos.x,
          y: dropPos.y,
          itemId: giftItemId,
          droppedDay: day,
        };
        winterFestival.droppedGifts.push(giftDrop);
        events.santaGiftDropped = { x: dropPos.x, y: dropPos.y, itemId: giftItemId };
      }
    }

    if (nextRem <= 0) {
      winterFestival.santaSleigh = null;
    } else {
      winterFestival.santaSleigh = {
        ...winterFestival.santaSleigh,
        remainingMs: nextRem,
      };
    }
  }

  // Trigger New Year's Eve Fireworks at 23:59 on Winter Day 2 (also catches midnight rollover across 23:59->00:00)
  const isWinterDay2BeforeMidnight =
    season === 'winter' && getDayInSeason(day) === 2 && ingameMinutes >= 23 * 60 + 59;
  const crossedWinterDay2Midnight =
    crossedMidnight && prevSeason === 'winter' && getDayInSeason(prevDay) === 2 && prevMinutes < 1440;
  if (
    (isWinterDay2BeforeMidnight || crossedWinterDay2Midnight) &&
    winterFestival.lastFireworksDay !== prevDay
  ) {
    winterFestival.lastFireworksDay = prevDay;
    winterFestival.fireworks = {
      active: true,
      remainingMs: FIREWORKS_DURATION_MS,
      durationMs: FIREWORKS_DURATION_MS,
      lastTriggeredDay: prevDay,
    };
    events.fireworksStarted = true;
  }

  // Progress active New Year's Eve Fireworks independently of midnight season rollover
  if (winterFestival.fireworks?.active) {
    const nextFwRem = winterFestival.fireworks.remainingMs - deltaMs;
    if (nextFwRem <= 0) {
      winterFestival.fireworks = null;
    } else {
      winterFestival.fireworks = {
        ...winterFestival.fireworks,
        remainingMs: nextFwRem,
      };
    }
  }

  // 6c. Refresh Village Noticeboard orders & Mine stamina on new day
  const rawBoard = state.villageBoard || createInitialVillageBoardState(day, level, season);
  const villageBoard: VillageBoardState =
    rawBoard.lastGeneratedDay !== day
      ? {
          ...rawBoard,
          lastGeneratedDay: day,
          orders: generateDailyVillageOrders(day, level, season),
        }
      : rawBoard;

  const rawMine = state.mine || createInitialMineState(day, level);
  const nextMaxMineStamina = getMaxMineStamina(level, rawMine.pickaxeTier || 1);
  const mine: MineState =
    rawMine.lastRefillDay !== day
      ? {
          ...rawMine,
          maxStamina: nextMaxMineStamina,
          stamina: nextMaxMineStamina,
          lastRefillDay: day,
        }
      : {
          ...rawMine,
          maxStamina: nextMaxMineStamina,
        };

  // 6d. Married Partner Farm Stroll & Daily Morning Help
  let fertilizerCount = state.fertilizerCount;
  let growthElixirCount = state.growthElixirCount || 0;
  if (romance.status === 'married' && romance.partnerId) {
    const pSpec = ROMANCE_CANDIDATE_BY_ID[romance.partnerId];
    if (pSpec) {
      const nowMs = Date.now();
      const lastMoved = romance.partnerMovedAt || 0;
      if (nowMs - lastMoved >= 4800) {
        const nextPX = Number((3.4 + Math.random() * 4.2).toFixed(2));
        const nextPY = Number((2.8 + Math.random() * 3.0).toFixed(2));
        romance = {
          ...romance,
          partnerMoveFromX: romance.partnerX,
          partnerMoveFromY: romance.partnerY,
          partnerX: nextPX,
          partnerY: nextPY,
          partnerMovedAt: nowMs,
        };
      }

      // Daily morning help once per day from 07:00 onwards
      if (ingameMinutes >= 420 && romance.lastHelpDay !== day) {
        let wateredCount = 0;
        for (let ty = 0; ty < GRID_SIZE && wateredCount < 8; ty++) {
          for (let tx = 0; tx < GRID_SIZE && wateredCount < 8; tx++) {
            const tile = workingTiles[ty][tx];
            if (tile.unlocked && tile.ground === 'tilled' && !tile.watered) {
              workingTiles[ty][tx] = {
                ...tile,
                watered: true,
                wateredRemainingMs: MAX_MOISTURE_MS,
                dryMs: 0,
              };
              wateredCount += 1;
            }
          }
        }

        const giftSpec =
          pSpec.morningGiftPool[Math.floor(Math.random() * pSpec.morningGiftPool.length)] ||
          pSpec.morningGiftPool[0];
        if (giftSpec.kind === 'fertilizer') {
          fertilizerCount += giftSpec.qty;
        } else if (giftSpec.kind === 'elixir') {
          growthElixirCount += giftSpec.qty;
        } else if (giftSpec.kind === 'item' && giftSpec.itemId) {
          inventory[giftSpec.itemId] = (inventory[giftSpec.itemId] || 0) + giftSpec.qty;
        }

        romance = {
          ...romance,
          lastHelpDay: day,
          morningSurpriseText: `${pSpec.name} hat heute ${wateredCount > 0 ? `${wateredCount} Felder gegossen und ` : ''}${giftSpec.label} auf den Küchentisch gelegt!`,
        };
        events.partnerMorningHelp = {
          partnerName: pSpec.name,
          wateredCount,
          giftLabel: giftSpec.label,
        };
      }
    }
  }

  let nextState: GameState = {
    ...state,
    savedAt: Date.now(),
    coins,
    xp,
    level,
    day,
    ingameMinutes,
    season,
    weather,
    weatherRemainingMs,
    nextDisasterMs,
    disasterWarning,
    lastDisasterReport,
    tiles: workingTiles,
    seeds,
    inventory,
    fertilizerCount,
    growthElixirCount,
    pet,
    workers,
    craftingJobs: remainingCraftingJobs,
    merchant,
    fishing,
    almanac,
    farmShop: baseShop,
    mailbox,
    winterFestival,
    villageBoard,
    villageFire,
    villageBusinesses,
    themePark,
    economyCrisis,
    mine,
    flyAgaricPos,
    mushroomEffect,
    feastBuff,
    neighbors,
    romance,
    marketHotItems,
    marketCrashedItems,
    marketOrders,
    eventState,
    stats,
  };

  if (shopSellCoinsEarned > 0) {
    nextState = advanceQuestProgress(nextState, 'sell_coins', shopSellCoinsEarned);
  }
  const shopSoldQtyTotal = (events.shopSales || []).reduce((sum, s) => sum + (s.qty || 0), 0);
  if (shopSoldQtyTotal > 0) {
    nextState = advanceQuestProgress(nextState, 'shop_sell', shopSoldQtyTotal);
  }

  if (events.petHelped) {
    const petRes = addPetXp(nextState, 12);
    nextState = petRes.state;
    if (petRes.petLeveledUpTo) {
      events.petLeveledUpTo = petRes.petLeveledUpTo;
    }
    nextState = advanceQuestProgress(nextState, 'pet_help', 1);
  }

  if (!events.newSeason && eventState.points > state.eventState.points) {
    nextState = advanceQuestProgress(nextState, 'event_points', eventState.points - state.eventState.points);
  }

  if (petHarvested) {
    nextState = advanceQuestProgress(nextState, petHarvested.kind, 1);
    nextState = advanceQuestProgress(nextState, 'harvest_specific', 1, petHarvested.itemId);
  }

  (Object.entries(workerQuestProgress) as [QuestKind, number][]).forEach(([kind, qty]) => {
    if (qty > 0) {
      nextState = advanceQuestProgress(nextState, kind, qty);
    }
  });

  Object.entries(workerSpecificHarvests).forEach(([itemId, qty]) => {
    if (qty > 0) {
      nextState = advanceQuestProgress(nextState, 'harvest_specific', qty, itemId);
    }
  });

  craftedOutcomes.forEach(({ itemId, qty }) => {
    if (qty > 0) {
      nextState = advanceQuestProgress(nextState, 'craft_item', qty);
      nextState = advanceQuestProgress(nextState, 'craft_specific', qty, itemId);
    }
  });

  return {
    next: nextState,
    events,
  };
}

export function migrateGameState(raw: Partial<GameState>): GameState | null {
  if (!raw || !Array.isArray(raw.tiles)) return null;
  const fresh = createInitialGameState(raw.pet?.type || 'dog');

  // If old 14x14 save -> center its tiles inside new 20x20 grid
  let tiles = fresh.tiles;
  if (raw.tiles.length === GRID_SIZE) {
    tiles = raw.tiles;
  } else {
    const oldSize = raw.tiles.length;
    const shift = Math.floor((GRID_SIZE - oldSize) / 2);
    const ring = raw.unlockedRing ?? 0;
    tiles = fresh.tiles.map((row, y) =>
      row.map((tile, x) => {
        const ox = x - shift;
        const oy = y - shift;
        const oldTile = raw.tiles?.[oy]?.[ox];
        if (oldTile) {
          return { ...oldTile, x, y, unlocked: isTileUnlockedForRing(x, y, ring) || oldTile.unlocked };
        }
        return { ...tile, unlocked: isTileUnlockedForRing(x, y, ring) };
      })
    );
  }

  tiles = tiles.map((row) =>
    row.map((t) => {
      const ent = t.entity;
      const normalizedEnt =
        ent && ent.category === 'animal' && isLivestockAnimal(ent.itemId)
          ? {
              ...ent,
              ageMs: ent.ageMs ?? 0,
              lifespanMs: ent.lifespanMs ?? createAnimalLifespanMs(),
            }
          : ent;
      return {
        ...t,
        entity: normalizedEnt,
        wateredRemainingMs: t.watered ? t.wateredRemainingMs ?? MAX_MOISTURE_MS : 0,
      };
    })
  );

  const normalizedNeighbors = (raw.neighbors && raw.neighbors.length > 0 ? raw.neighbors : fresh.neighbors).map((n) => ({
    ...n,
    requestsCompletedToday:
      typeof n.requestsCompletedToday === 'number'
        ? Math.max(0, Math.min(MAX_NEIGHBOR_REQUESTS_PER_DAY, n.requestsCompletedToday))
        : 0,
  }));

  let migratedAlmanac: AlmanacState = raw.almanac
    ? {
        discoveredIds: Array.isArray(raw.almanac.discoveredIds) ? [...raw.almanac.discoveredIds] : [],
        fishRecords: raw.almanac.fishRecords || {},
      }
    : { ...fresh.almanac, discoveredIds: [...fresh.almanac.discoveredIds] };

  // Retroactively register any already-owned or planted items in Almanac
  const registerIfTrackable = (id: string) => {
    migratedAlmanac = recordAlmanacDiscovery(migratedAlmanac, id).almanac;
  };
  Object.entries(raw.inventory || {}).forEach(([id, qty]) => {
    if ((qty || 0) > 0) registerIfTrackable(id);
  });
  Object.entries(raw.seeds || {}).forEach(([id, qty]) => {
    if ((qty || 0) > 0) registerIfTrackable(id);
  });
  tiles.forEach((row) =>
    row.forEach((tile) => {
      if (tile.entity?.itemId) registerIfTrackable(tile.entity.itemId);
    })
  );

  const migratedFair: VillageFairState = raw.villageFair
    ? {
        judgedSeasonKeys: Array.isArray(raw.villageFair.judgedSeasonKeys)
          ? raw.villageFair.judgedSeasonKeys
          : [],
        medals: raw.villageFair.medals || { bronze: 0, silver: 0, gold: 0 },
        lastResult: raw.villageFair.lastResult || null,
      }
    : fresh.villageFair;

  return {
    ...fresh,
    ...raw,
    version: 5,
    level: Math.min(MAX_LEVEL, raw.level || 1),
    tiles,
    wateringCanTier: raw.wateringCanTier || 1,
    pet: raw.pet || fresh.pet,
    workers: Array.isArray(raw.workers) ? raw.workers : [],
    craftingJobs: Array.isArray(raw.craftingJobs) ? raw.craftingJobs : [],
    merchant: raw.merchant || fresh.merchant,
    fishingBaitCharges: typeof raw.fishingBaitCharges === 'number' ? raw.fishingBaitCharges : 0,
    growthElixirCount: typeof raw.growthElixirCount === 'number' ? raw.growthElixirCount : 0,
    house: raw.house || fresh.house,
    tutorial: raw.tutorial || fresh.tutorial,
    fishing: raw.fishing || fresh.fishing,
    quests: raw.quests
      ? {
          active: Array.isArray(raw.quests.active)
            ? raw.quests.active
            : generateQuestsForLevel(raw.level || 1, 3, raw.season || fresh.season, raw.fishing?.level || 1),
          completedTotal: raw.quests.completedTotal ?? 0,
          recentKinds: Array.isArray(raw.quests.recentKinds) ? raw.quests.recentKinds : [],
          recentTargetIds: Array.isArray(raw.quests.recentTargetIds) ? raw.quests.recentTargetIds : [],
          claimedMilestones: Array.isArray(raw.quests.claimedMilestones) ? raw.quests.claimedMilestones : [],
        }
      : generateQuestsForStateFallback(raw.level || 1, raw.season || fresh.season, raw.fishing?.level || 1, fresh.quests),
    almanac: migratedAlmanac,
    villageFair: migratedFair,
    farmShop: (() => {
      const defaults = createInitialFarmShopState();
      const migratedShop = raw.farmShop
        ? {
            ...defaults,
            ...raw.farmShop,
            stock: raw.farmShop.stock || {},
            visitors: Array.isArray(raw.farmShop.visitors) ? raw.farmShop.visitors : [],
            recentSales: Array.isArray(raw.farmShop.recentSales) ? raw.farmShop.recentSales : [],
            totalVisitorsAllTime:
              raw.farmShop.totalVisitorsAllTime ?? raw.farmShop.visitorsToday ?? 0,
            reputation: raw.farmShop.reputation ?? defaults.reputation,
            autoRestock: Boolean(raw.farmShop.autoRestock),
            autoRestockTarget: raw.farmShop.autoRestockTarget ?? 6,
            specialOrder:
              raw.farmShop.specialOrder !== undefined
                ? raw.farmShop.specialOrder
                : createDailyShopSpecialOrder(
                    raw.day || 1,
                    raw.level || 1,
                    raw.season || fresh.season,
                    raw.weather || fresh.weather
                  ),
          }
        : defaults;
      return migratedShop;
    })(),
    mailbox: (() => {
      const migratedShop = raw.farmShop
        ? {
            ...createInitialFarmShopState(),
            ...raw.farmShop,
            totalVisitorsAllTime:
              raw.farmShop.totalVisitorsAllTime ?? raw.farmShop.visitorsToday ?? 0,
          }
        : createInitialFarmShopState();
      const baseSnap = buildMailboxSnapshot(
        raw.day || 1,
        { ...fresh.stats, ...(raw.stats || {}) },
        raw.fishing?.totalCaught || 0,
        migratedShop
      );
      if (!raw.mailbox) {
        return createInitialMailboxState(baseSnap);
      }
      return {
        ...createInitialMailboxState(baseSnap),
        ...raw.mailbox,
        postman: {
          ...createInitialMailboxState(baseSnap).postman,
          ...(raw.mailbox.postman || {}),
        },
        archive: Array.isArray(raw.mailbox.archive) ? raw.mailbox.archive : [],
        lastSnapshot: raw.mailbox.lastSnapshot || baseSnap,
      };
    })(),
    flyAgaricPos: raw.flyAgaricPos ?? null,
    mushroomEffect: raw.mushroomEffect
      ? {
          psychedelicRemainingMs: raw.mushroomEffect.psychedelicRemainingMs ?? 0,
          luckBuffRemainingMs: raw.mushroomEffect.luckBuffRemainingMs ?? 0,
          respawnCooldownMs: raw.mushroomEffect.respawnCooldownMs ?? 0,
          lastEatenDay: raw.mushroomEffect.lastEatenDay ?? 0,
        }
      : { psychedelicRemainingMs: 0, luckBuffRemainingMs: 0, respawnCooldownMs: 0, lastEatenDay: 0 },
    feastBuff: raw.feastBuff
      ? {
          remainingMs: raw.feastBuff.remainingMs ?? 0,
          dishId: raw.feastBuff.dishId ?? '',
          dishName: raw.feastBuff.dishName ?? '',
        }
      : { remainingMs: 0, dishId: '', dishName: '' },
    winterFestival: raw.winterFestival
      ? {
          lastSantaDay: raw.winterFestival.lastSantaDay ?? 0,
          santaSleigh: raw.winterFestival.santaSleigh ?? null,
          droppedGifts: Array.isArray(raw.winterFestival.droppedGifts) ? raw.winterFestival.droppedGifts : [],
          lastFireworksDay: raw.winterFestival.lastFireworksDay ?? 0,
          fireworks: raw.winterFestival.fireworks ?? null,
        }
      : createInitialWinterFestivalState(),
    villageBoard: raw.villageBoard
      ? {
          lastGeneratedDay: raw.villageBoard.lastGeneratedDay ?? (raw.day || 1),
          orders:
            Array.isArray(raw.villageBoard.orders) && raw.villageBoard.orders.length > 0
              ? raw.villageBoard.orders
              : generateDailyVillageOrders(raw.day || 1, raw.level || 1, raw.season || fresh.season),
          completedTotal: raw.villageBoard.completedTotal ?? 0,
          dailyBonusClaimedDay: raw.villageBoard.dailyBonusClaimedDay ?? 0,
        }
      : createInitialVillageBoardState(raw.day || 1, raw.level || 1, raw.season || fresh.season),
    villageFire: raw.villageFire
      ? {
          ...createInitialVillageFireState(),
          ...raw.villageFire,
          pendingNewspaperReports: Array.isArray(raw.villageFire.pendingNewspaperReports)
            ? raw.villageFire.pendingNewspaperReports
            : [],
        }
      : createInitialVillageFireState(),
    villageBusinesses: raw.villageBusinesses
      ? {
          ownedIds: Array.isArray(raw.villageBusinesses.ownedIds) ? raw.villageBusinesses.ownedIds : [],
          totalEarnedById: raw.villageBusinesses.totalEarnedById || {},
          todayEarnedById: raw.villageBusinesses.todayEarnedById || {},
          brokenById: raw.villageBusinesses.brokenById || {},
          outageCheckAccMs: raw.villageBusinesses.outageCheckAccMs || 0,
          payoutAccMs: raw.villageBusinesses.payoutAccMs || 0,
          lastPayoutDay: raw.villageBusinesses.lastPayoutDay ?? (raw.day || 1),
        }
      : createInitialVillageBusinessesState(raw.day || 1),
    themePark: raw.themePark
      ? {
          owned: Boolean(raw.themePark.owned),
          purchasedAtDay: raw.themePark.purchasedAtDay,
          attractions: Array.isArray(raw.themePark.attractions) ? raw.themePark.attractions : [],
          todayEarned: raw.themePark.todayEarned || 0,
          totalEarned: raw.themePark.totalEarned || 0,
          payoutAccMs: raw.themePark.payoutAccMs || 0,
          lastPayoutDay: raw.themePark.lastPayoutDay ?? (raw.day || 1),
          breakdown: raw.themePark.breakdown || null,
        }
      : createInitialThemeParkState(raw.day || 1),
    economyCrisis: raw.economyCrisis
      ? {
          ...createInitialEconomyCrisisState(raw.day || 1),
          ...raw.economyCrisis,
        }
      : createInitialEconomyCrisisState(raw.day || 1),
    marketCrashedItems: Array.isArray(raw.marketCrashedItems) ? raw.marketCrashedItems : [],
    mine: raw.mine
      ? {
          unlockedFloor: raw.mine.unlockedFloor ?? 1,
          currentFloor: raw.mine.currentFloor ?? 1,
          maxStamina: getMaxMineStamina(raw.level || 1, raw.mine.pickaxeTier || 1),
          stamina:
            typeof raw.mine.stamina === 'number'
              ? raw.mine.stamina
              : getMaxMineStamina(raw.level || 1, raw.mine.pickaxeTier || 1),
          pickaxeTier: raw.mine.pickaxeTier || 1,
          ores: raw.mine.ores || {},
          relics: raw.mine.relics || {},
          discoveredRelics: Array.isArray(raw.mine.discoveredRelics) ? raw.mine.discoveredRelics : [],
          totalRocksMined: raw.mine.totalRocksMined ?? 0,
          board:
            Array.isArray(raw.mine.board) && raw.mine.board.length > 0
              ? raw.mine.board
              : generateMineBoard(raw.mine.currentFloor ?? 1),
          ladderRevealed: Boolean(raw.mine.ladderRevealed),
          lastRefillDay: raw.mine.lastRefillDay ?? (raw.day || 1),
        }
      : createInitialMineState(raw.day || 1, raw.level || 1),
    neighbors: normalizedNeighbors,
    romance: raw.romance
      ? {
          ...createInitialRomanceState(),
          ...raw.romance,
        }
      : createInitialRomanceState(),
    stats: {
      ...fresh.stats,
      ...(raw.stats || {}),
      harvestedByItem: raw.stats?.harvestedByItem || {},
      craftedByItem: raw.stats?.craftedByItem || {},
    },
  };
}

function generateQuestsForStateFallback(
  level: number,
  season: Season,
  fishingLevel: number,
  fallback: GameState['quests']
): GameState['quests'] {
  return {
    active: generateQuestsForLevel(level, 3, season, fishingLevel),
    completedTotal: fallback.completedTotal,
    recentKinds: [],
    recentTargetIds: [],
    claimedMilestones: [],
  };
}

export function saveGameState(state: GameState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, savedAt: Date.now() }));
  } catch {
    // Ignore quota errors
  }
}

export function loadGameState(): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GameState>;
    const migrated = migrateGameState(parsed);
    if (!migrated) return null;

    const elapsedMs = Math.max(0, Math.min(45 * 60 * 1000, Date.now() - (migrated.savedAt || Date.now())));
    if (elapsedMs > 2000) {
      return advanceGameTick(migrated, elapsedMs).next;
    }
    return migrated;
  } catch {
    return null;
  }
}

export function clearSavedGame() {
  localStorage.removeItem(STORAGE_KEY);
}

// saveSettings & loadSettings imported/re-exported from ./storageBoot

export function formatDurationMs(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return `${h}h ${rm}m`;
  }
  if (m > 0) {
    return `${m}:${String(s).padStart(2, '0')}`;
  }
  return `${s}s`;
}

export function formatIngameTime(minutes: number): string {
  const m = Math.floor(minutes) % 1440;
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export function triggerVillageFireEvent(
  state: GameState,
  preferredHouseId?: string
): { nextState: GameState; houseName: string; houseId: string; causeTitle: string } {
  const targetHouse =
    (preferredHouseId ? VILLAGE_HOUSE_BY_ID[preferredHouseId] : undefined) ||
    VILLAGE_HOUSES[Math.floor(Math.random() * VILLAGE_HOUSES.length)] ||
    VILLAGE_HOUSES[0];
  const cause = pickFireCauseForHouse(targetHouse, state.weather);
  const fireDurationMs = Math.round((2 + Math.random()) * 60 * REAL_MS_PER_INGAME_MINUTE);
  const rawFire = state.villageFire || createInitialVillageFireState();

  const nextState: GameState = {
    ...state,
    villageFire: {
      ...rawFire,
      pendingNewspaperReports: [...(rawFire.pendingNewspaperReports || [])],
      active: true,
      houseId: targetHouse.id,
      houseName: targetHouse.name,
      causeTitle: cause.title,
      causeDetail: cause.detail,
      startedAtTime: formatIngameTime(state.ingameMinutes),
      totalMs: fireDurationMs,
      remainingMs: fireDurationMs,
      playerHelped: false,
      sootHouseId: null,
    },
  };

  return {
    nextState,
    houseId: targetHouse.id,
    houseName: targetHouse.name,
    causeTitle: cause.title,
  };
}

export function triggerSantaSleighEvent(state: GameState): {
  nextState: GameState;
  dropTarget: { x: number; y: number } | null;
} {
  const rawFest = state.winterFestival || createInitialWinterFestivalState();
  const droppedGifts = [...(rawFest.droppedGifts || [])];
  const grassCandidates: { x: number; y: number }[] = [];
  const fallbackCandidates: { x: number; y: number }[] = [];

  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const t = state.tiles[y]?.[x];
      if (!t || !t.unlocked || t.entity) continue;
      if (droppedGifts.some((g) => g.x === x && g.y === y)) continue;
      if (t.ground === 'grass' || t.ground === 'path') {
        grassCandidates.push({ x, y });
      } else {
        fallbackCandidates.push({ x, y });
      }
    }
  }

  const targetPool = grassCandidates.length > 0 ? grassCandidates : fallbackCandidates;
  const dropTarget =
    targetPool.length > 0 ? targetPool[Math.floor(Math.random() * targetPool.length)] : null;

  const nextState: GameState = {
    ...state,
    winterFestival: {
      ...rawFest,
      droppedGifts,
      lastSantaDay: state.day,
      santaSleigh: {
        active: true,
        startedDay: state.day,
        remainingMs: SANTA_FLIGHT_DURATION_MS,
        durationMs: SANTA_FLIGHT_DURATION_MS,
        dropTarget,
        giftDropped: false,
      },
    },
  };

  return { nextState, dropTarget };
}

export function triggerFireworksEvent(state: GameState): GameState {
  const rawFest = state.winterFestival || createInitialWinterFestivalState();
  return {
    ...state,
    winterFestival: {
      ...rawFest,
      lastFireworksDay: state.day,
      fireworks: {
        active: true,
        remainingMs: FIREWORKS_DURATION_MS,
        durationMs: FIREWORKS_DURATION_MS,
        lastTriggeredDay: state.day,
      },
    },
  };
}

export function triggerMarketCrashEvent(state: GameState): { nextState: GameState; itemNames: string[] } {
  const crashed = generateCrashedMarketItems(state.season, Math.max(200, state.level), state.marketHotItems);
  const itemNames = crashed.map((id) => CATALOG_BY_ID[id]?.produceName || CATALOG_BY_ID[id]?.name || id);
  return {
    nextState: {
      ...state,
      marketCrashedItems: crashed,
    },
    itemNames,
  };
}

export function triggerBusinessOutageEvent(state: GameState): {
  nextState: GameState;
  label: string;
  reason: string;
  repairCost: number;
} | null {
  const biz = state.villageBusinesses || createInitialVillageBusinessesState(state.day);
  const park = state.themePark || createInitialThemeParkState(state.day);
  const workingBiz = biz.ownedIds.filter((id) => !biz.brokenById?.[id]);
  if (workingBiz.length > 0) {
    const pickedId = workingBiz[Math.floor(Math.random() * workingBiz.length)];
    const spec = VILLAGE_BUSINESS_BY_ID[pickedId];
    if (spec) {
      const reason = 'Kühlaggregat & Schaltwerk ausgefallen';
      return {
        label: spec.name,
        reason,
        repairCost: spec.repairCost,
        nextState: {
          ...state,
          villageBusinesses: {
            ...biz,
            brokenById: {
              ...(biz.brokenById || {}),
              [pickedId]: { reason, brokenAtDay: state.day, repairCost: spec.repairCost },
            },
          },
        },
      };
    }
  }
  if (park.owned && !park.breakdown) {
    const reason = 'Hauptantrieb der Park-Attraktionen gestört';
    const repairCost = Math.round(115_000 + park.attractions.length * 45_000);
    return {
      label: 'Abenteuerpark Sonnental',
      reason,
      repairCost,
      nextState: {
        ...state,
        themePark: {
          ...park,
          breakdown: { reason, brokenAtDay: state.day, repairCost },
        },
      },
    };
  }
  return null;
}

export function triggerEconomyInspectionEvent(state: GameState): {
  nextState: GameState;
  levyCoins: number;
} {
  const levyCoins = Math.min(350_000, Math.max(25_000, Math.round(state.coins * 0.025)));
  const paid = Math.min(state.coins, levyCoins);
  const rawEcon = state.economyCrisis || createInitialEconomyCrisisState(state.day);
  return {
    levyCoins: paid,
    nextState: {
      ...state,
      coins: Math.max(0, state.coins - paid),
      economyCrisis: {
        ...rawEcon,
        lastInspectionDay: state.day,
        lastLevyCoins: paid,
        lastLevyReason: 'Betriebs- & Hofprüfung Sonnental (2,5 % Sonderabgabe)',
        inspectionsTotal: (rawEcon.inspectionsTotal || 0) + 1,
      },
      stats: {
        ...state.stats,
        totalCrisesSurvived: (state.stats.totalCrisesSurvived || 0) + 1,
      },
    },
  };
}

export function triggerShopSpoilageEvent(state: GameState): {
  nextState: GameState;
  totalLostQty: number;
} {
  const shop = { ...createInitialFarmShopState(), ...state.farmShop, stock: { ...(state.farmShop?.stock || {}) } };
  let totalLostQty = 0;
  for (const [id, qty] of Object.entries(shop.stock)) {
    if (qty > 3 && CATALOG_BY_ID[id]?.category === 'artisan') {
      const lost = Math.max(1, Math.floor(qty * 0.2));
      shop.stock[id] = Math.max(0, qty - lost);
      totalLostQty += lost;
    }
  }
  return {
    totalLostQty,
    nextState: {
      ...state,
      farmShop: shop,
    },
  };
}

export function triggerSuperstormWarningEvent(state: GameState): GameState {
  const tier = getDisasterTierForLevel(Math.max(200, state.level));
  return {
    ...state,
    disasterWarning: {
      id: `warn_super_${Date.now()}`,
      type: 'superstorm',
      title: 'Jahrhundert-Superzelle im Anmarsch!',
      severityLabel: tier.label,
      message: 'Schwere Orkanfront! Einfache Vogelscheuchen können teils durchbrochen werden — nur Gewächshäuser & Obelisken halten stand.',
      countdownMs: 8000,
    },
  };
}

export function applyNewDayStateReset(
  prev: GameState,
  targetDay: number,
  targetMinutes: number,
  explicitSeason?: Season
): GameState {
  const seasons: Season[] = ['spring', 'summer', 'autumn', 'winter'];
  const nextSeason =
    explicitSeason ?? seasons[Math.floor((Math.max(1, targetDay) - 1) / DAYS_PER_SEASON) % seasons.length];
  const dayChanged = targetDay !== prev.day;
  const seasonChanged = nextSeason !== prev.season;
  const resetMailForTarget = targetMinutes <= 598 && (dayChanged || prev.ingameMinutes < 598);

  const nextNeighbors =
    dayChanged || seasonChanged
      ? prev.neighbors.map((n) => {
          const resetNpc: NeighborNPC = {
            ...n,
            helpedToday: false,
            giftedToday: false,
            requestsCompletedToday: 0,
          };
          return {
            ...resetNpc,
            ...buildScaledNeighborRequest(resetNpc, prev.level, nextSeason, 0),
          };
        })
      : prev.neighbors;

  const nextEventState = seasonChanged
    ? {
        season: nextSeason,
        points: 0,
        claimedTiers: [],
      }
    : prev.eventState;

  const marketHotItems =
    dayChanged || seasonChanged ? generateHotMarketItems(nextSeason, prev.level) : prev.marketHotItems;
  const marketCrashedItems =
    dayChanged || seasonChanged
      ? generateCrashedMarketItems(nextSeason, prev.level, marketHotItems)
      : prev.marketCrashedItems || [];
  const marketOrders =
    dayChanged || seasonChanged ? generateMarketOrders(prev.level, nextSeason) : prev.marketOrders;

  const baseShop: FarmShopState = prev.farmShop
    ? { ...createInitialFarmShopState(), ...prev.farmShop, stock: { ...(prev.farmShop.stock || {}) } }
    : createInitialFarmShopState();
  const stockedVarietyCount = Object.entries(baseShop.stock).filter(
    ([id, qty]) => qty > 0 && CATALOG_BY_ID[id]?.category === 'artisan'
  ).length;
  const nextFarmShop: FarmShopState =
    dayChanged || seasonChanged
      ? {
          ...baseShop,
          ...(dayChanged
            ? {
                visitorsToday: 0,
                spawnedToday: 0,
                todayRevenue: 0,
              }
            : {}),
          dailyTargetVisitors:
            createDailyShopTargetVisitors(
              nextSeason,
              prev.weather,
              calculateFarmCharm(prev.tiles),
              stockedVarietyCount,
              baseShop.reputation ?? 10
            ) + getThemeParkMetrics(prev.themePark).shopVisitorBonus,
          specialOrder: createDailyShopSpecialOrder(targetDay, prev.level, nextSeason, prev.weather),
          nextVisitorMs: 4500,
        }
      : baseShop;

  const rawBoard = prev.villageBoard || createInitialVillageBoardState(targetDay, prev.level, nextSeason);
  const nextVillageBoard: VillageBoardState =
    dayChanged || seasonChanged
      ? {
          ...rawBoard,
          lastGeneratedDay: targetDay,
          orders: generateDailyVillageOrders(targetDay, prev.level, nextSeason),
        }
      : rawBoard;

  const rawMine = prev.mine || createInitialMineState(targetDay, prev.level);
  const maxStamina = getMaxMineStamina(prev.level, rawMine.pickaxeTier || 1);
  const nextMine: MineState = dayChanged
    ? {
        ...rawMine,
        maxStamina,
        stamina: maxStamina,
        lastRefillDay: targetDay,
      }
    : rawMine;

  const nextBusinesses: VillageBusinessState | undefined = prev.villageBusinesses
    ? {
        ...prev.villageBusinesses,
        todayEarnedById: dayChanged ? {} : prev.villageBusinesses.todayEarnedById,
        lastPayoutDay: targetDay,
      }
    : prev.villageBusinesses;

  const nextThemePark: ThemeParkState | undefined = prev.themePark
    ? {
        ...prev.themePark,
        todayEarned: dayChanged ? 0 : prev.themePark.todayEarned,
        lastPayoutDay: targetDay,
      }
    : prev.themePark;

  return {
    ...prev,
    day: targetDay,
    season: nextSeason,
    ingameMinutes: targetMinutes,
    neighbors: nextNeighbors,
    eventState: nextEventState,
    marketHotItems,
    marketCrashedItems,
    marketOrders,
    farmShop: nextFarmShop,
    villageBoard: nextVillageBoard,
    mine: nextMine,
    villageBusinesses: nextBusinesses,
    themePark: nextThemePark,
    mailbox: prev.mailbox
      ? {
          ...prev.mailbox,
          postman: {
            ...prev.mailbox.postman,
            active: false,
            deliveredToday: resetMailForTarget ? false : prev.mailbox.postman.deliveredToday,
          },
        }
      : prev.mailbox,
  };
}

