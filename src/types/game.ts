export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export type WeatherType =
  | 'sunny'
  | 'cloudy'
  | 'rainy'
  | 'foggy'
  | 'windy'
  | 'stormy'
  | 'frost';

export type ItemCategory = 'crop' | 'mushroom' | 'tree' | 'animal' | 'decoration' | 'fish' | 'artisan' | 'meat';

export type ToolType =
  | 'hand'
  | 'hoe'
  | 'water'
  | 'fertilize'
  | 'plant'
  | 'build'
  | 'move'
  | 'remove'
  | 'fishing';

export type ResolutionPreset = '720p' | '1080p' | '2160p';

export type ModalType =
  | 'none'
  | 'inventory'
  | 'market'
  | 'neighbors'
  | 'events'
  | 'avatar'
  | 'options'
  | 'house'
  | 'pet'
  | 'workers'
  | 'craft'
  | 'merchant'
  | 'quests'
  | 'almanac'
  | 'fair'
  | 'shop'
  | 'mailbox'
  | 'village_board'
  | 'mine'
  | 'village_business'
  | 'theme_park';

export type PetType = 'pig' | 'dog' | 'cat' | 'alien';

export type FishingRegionId = 'north' | 'middle' | 'south';
export type FishDensity = 'none' | 'low' | 'medium' | 'high';

export interface FishingState {
  level: number;
  xp: number;
  totalCaught: number;
  regionDensity: Record<FishingRegionId, FishDensity>;
  regionRefreshMs: number;
}

export interface FishRecord {
  maxCm: number;
  maxGrams: number;
  catches: number;
  bestWeather?: WeatherType;
}

export interface AlmanacState {
  discoveredIds: string[];
  fishRecords: Record<string, FishRecord>;
}

export type FairMedal = 'bronze' | 'silver' | 'gold';

export interface FairSubmissionResult {
  season: Season;
  day: number;
  score: number;
  charmScore: number;
  cleanlinessScore: number;
  produceScore: number;
  submittedItemId?: string;
  medal: FairMedal;
  rewardCoins: number;
  rewardXp: number;
  unlockedDecorId?: string;
}

export interface VillageFairState {
  judgedSeasonKeys: string[];
  medals: {
    bronze: number;
    silver: number;
    gold: number;
  };
  lastResult: FairSubmissionResult | null;
}

export type ShopVisitorArchetype = 'wanderer' | 'gourmet' | 'bulk_buyer' | 'neighbor';

export interface ShopVisitorBoughtItem {
  itemId: string;
  qty: number;
  coins: number;
}

export interface ShopVisitor {
  id: string;
  x: number;
  y: number;
  phase: 'entering' | 'browsing' | 'leaving';
  browsingRemainingMs: number;
  shirtColor: string;
  hairColor: string;
  skinTone: string;
  archetype?: ShopVisitorArchetype;
  visitorName?: string;
  hatColor?: string;
  neighborId?: string;
  residentId?: string;
  homeHouseId?: string;
  waypoints?: Array<{ x: number; y: number }>;
  waypointIdx?: number;
  laneOffset?: number;
  boughtItemId?: string;
  boughtItems?: ShopVisitorBoughtItem[];
  boughtTotalQty?: number;
  boughtCoins?: number;
  boughtTipCoins?: number;
  leftEmptyHanded?: boolean;
}

export interface FarmShopSaleEntry {
  itemId: string;
  qty: number;
  coins: number;
  tipCoins?: number;
  buyerName?: string;
  buyerArchetype?: ShopVisitorArchetype;
  day: number;
  ingameTime: string;
}

export interface FarmShopSpecialOrder {
  id: string;
  customerName: string;
  itemId: string;
  qty: number;
  rewardCoins: number;
  rewardXp: number;
  completed: boolean;
}

export interface FarmShopState {
  stock: Record<string, number>;
  visitorsToday: number;
  dailyTargetVisitors: number;
  spawnedToday: number;
  nextVisitorMs: number;
  visitors: ShopVisitor[];
  todayRevenue: number;
  totalRevenue: number;
  totalSoldCount: number;
  totalVisitorsAllTime?: number;
  reputation?: number; // 0..100 Hof- & Hofladen-Ruf
  autoRestock?: boolean;
  autoRestockTarget?: number;
  specialOrder?: FarmShopSpecialOrder | null;
  recentSales: FarmShopSaleEntry[];
}

export type QuestKind =
  | 'harvest_crop'
  | 'harvest_mushroom'
  | 'harvest_tree'
  | 'collect_animal'
  | 'sell_coins'
  | 'help_neighbor'
  | 'catch_fish'
  | 'water_tiles'
  | 'craft_item'
  | 'craft_specific'
  | 'harvest_specific'
  | 'catch_specific_fish'
  | 'market_order'
  | 'merchant_interact'
  | 'place_decor'
  | 'pet_care'
  | 'enter_fair'
  | 'plant_seeds'
  | 'use_fertilizer'
  | 'mine_rocks'
  | 'mine_forge'
  | 'shop_sell'
  | 'event_points'
  | 'village_board'
  | 'pet_help'
  | 'romance_act';

export interface QuestItem {
  id: string;
  title: string;
  description: string;
  kind: QuestKind;
  targetItemId?: string;
  target: number;
  progress: number;
  rewardCoins: number;
  rewardXp: number;
  rewardFertilizer?: number;
  rewardBait?: number;
  claimed: boolean;
}

export interface QuestMilestoneDef {
  id: string;
  chapter: number;
  minLevel: number;
  title: string;
  description: string;
  target: number;
  rewardCoins: number;
  rewardXp: number;
  rewardFertilizer?: number;
  rewardBait?: number;
  rewardItem?: { itemId: string; qty: number };
}

export interface QuestState {
  active: QuestItem[];
  completedTotal: number;
  recentKinds?: QuestKind[];
  recentTargetIds?: string[];
  claimedMilestones?: string[];
}

export interface MushroomEffectState {
  psychedelicRemainingMs: number;
  luckBuffRemainingMs: number;
  respawnCooldownMs?: number;
  lastEatenDay?: number;
}

export interface FeastBuffState {
  remainingMs: number;
  dishId: string;
  dishName: string;
}

export interface PetState {
  type: PetType;
  name: string;
  level: number; // 1..99
  xp: number;
  x: number; // farm grid local coords
  y: number;
  helpCooldownMs: number;
  petCooldownMs: number;
  lastActionText: string;
}

export type WorkerRole = 'allrounder' | 'gardener' | 'rancher';

export interface WorkerTasks {
  water: boolean;
  harvest: boolean;
  animals: boolean;
  replant: boolean;
}

export interface FarmWorker {
  id: string;
  name: string;
  role: WorkerRole;
  level: number;
  xp: number;
  dailyWage: number;
  unpaidWage: number;
  onStrike: boolean;
  tasks: WorkerTasks;
  x: number;
  y: number;
  moveFromX?: number;
  moveFromY?: number;
  movedAt?: number;
  facing?: 'left' | 'right';
  workCooldownMs: number;
  lastActionText: string;
  outfitColor: string;
  hatColor: string;
}

export interface PayrollReport {
  paidCount: number;
  totalPaid: number;
  strikeCount: number;
  totalUnpaid: number;
}

export interface HouseState {
  floors: 1 | 2 | 3 | 4;
  extras: string[];
}

export interface TutorialState {
  dismissed: boolean;
  completedSteps: number[]; // step indices 0..4
  plantedCount: number;
  wateredCount: number;
  soldCount: number;
  mushroomPlanted: boolean;
  visitedHouseOrPet: boolean;
  helpedNeighbor: boolean;
}

export interface CatalogItem {
  id: string;
  name: string;
  category: ItemCategory;
  description: string;
  seedCost: number;
  sellPrice: number;
  produceName: string;
  growthMs: number;
  xpReward: number;
  unlockLevel: number;
  seasons: Season[];
  weatherAffinity?: WeatherType;
  stormShieldRadius?: number;
  charmPoints?: number;
  speedAuraRadius?: number;
  sprinklerRadius?: number;
  greenhouseRadius?: number;
  isEventExclusive?: boolean;
  isMerchantExclusive?: boolean;
  isFairExclusive?: boolean;
  isGiftExclusive?: boolean;
  isMineExclusive?: boolean;
  regrowMs?: number;
  minCm?: number;
  maxCm?: number;
  meatDropId?: string;
  feastBuffMinutes?: number;
  pixelColor: string;
  accentColor: string;
}

export type CraftStationId =
  | 'preserve_jar'
  | 'bakery_oven'
  | 'cheese_press'
  | 'fish_smoker'
  | 'brewery'
  | 'feast_kitchen';

export interface CraftRecipeIngredient {
  itemId: string;
  qty: number;
}

export interface CraftRecipe {
  id: string;
  stationId: CraftStationId;
  outputItemId: string;
  outputQty: number;
  durationMs: number;
  xpReward: number;
  unlockLevel: number;
  ingredients: CraftRecipeIngredient[];
}

export interface CraftingJob {
  id: string;
  recipeId: string;
  stationId: CraftStationId;
  outputItemId: string;
  totalMs: number;
  remainingMs: number;
}

export interface MerchantOffer {
  id: string;
  kind: 'bait' | 'elixir' | 'item' | 'fertilizer';
  title: string;
  description: string;
  itemId?: string;
  qty: number;
  costCoins: number;
  stock: number;
}

export interface MerchantTrade {
  id: string;
  title: string;
  giveItemId: string;
  giveQty: number;
  rewardKind: 'bait' | 'fertilizer' | 'item' | 'coins';
  rewardItemId?: string;
  rewardQty: number;
  rewardCoins?: number;
  completed: boolean;
}

export interface WanderingMerchantState {
  active: boolean;
  remainingMs: number;
  cooldownMs: number;
  offers: MerchantOffer[];
  trades: MerchantTrade[];
}

export type TileGround = 'grass' | 'tilled' | 'path' | 'water';

export interface TileEntity {
  itemId: string;
  category: ItemCategory;
  progressMs: number;
  ready: boolean;
  harvestCount: number;
  fedOrWatered: boolean;
  damaged?: boolean;
  withered?: boolean;
  facing?: 'left' | 'right';
  wanderCooldownMs?: number;
  moveFromX?: number;
  moveFromY?: number;
  movedAt?: number;
  ageMs?: number;
  lifespanMs?: number;
  meatDropFromAnimalId?: string;
}

export interface TileData {
  x: number;
  y: number;
  unlocked: boolean;
  ground: TileGround;
  watered: boolean;
  wateredRemainingMs?: number;
  dryMs?: number;
  idleTilledMs?: number;
  enriched: boolean;
  entity: TileEntity | null;
}

export type HairStyle =
  | 'short'
  | 'long'
  | 'bob'
  | 'curly'
  | 'braids'
  | 'bald';

export type HatStyle =
  | 'none'
  | 'straw'
  | 'cap'
  | 'beret'
  | 'flower'
  | 'beanie';

export interface AvatarConfig {
  farmerName: string;
  farmName: string;
  skinTone: string;
  hairStyle: HairStyle;
  hairColor: string;
  eyeColor: string;
  outfitColor: string;
  overallsColor: string;
  hat: HatStyle;
  beard: boolean;
  glasses: boolean;
}

export interface NeighborNPC {
  id: string;
  name: string;
  role: string;
  bio: string;
  friendship: number;
  helpedToday: boolean;
  giftedToday: boolean;
  requestsCompletedToday: number;
  avatar: AvatarConfig;
  farmTheme: 'orchard' | 'mushroom' | 'apiary' | 'mill';
  requestItemId: string;
  requestQty: number;
  rewardCoins: number;
  rewardXp: number;
}

export interface MarketOrder {
  id: string;
  customerName: string;
  itemId: string;
  qty: number;
  rewardCoins: number;
  rewardXp: number;
  completed: boolean;
}

export interface SeasonalEventState {
  season: Season;
  points: number;
  claimedTiers: number[];
}

export interface DisasterWarning {
  id: string;
  type: 'thunderstorm' | 'crows' | 'frost' | 'moles' | 'ufo' | 'superstorm';
  title: string;
  message: string;
  countdownMs: number;
  severityLabel: string;
}

export interface UfoAbductionAnimation {
  id: string;
  x: number;
  y: number;
  startedAt: number;
  durationMs: number;
}

export interface MovingDecorationState {
  fromX: number;
  fromY: number;
  itemId: string;
}

export interface DisasterReport {
  title: string;
  severityLabel: string;
  protectedCount: number;
  affectedCount: number;
  reliefCoins: number;
  reliefXp: number;
  reliefSeeds: { itemId: string; qty: number }[];
}

export interface KeybindSettings {
  toolHand: string;
  toolHoe: string;
  toolWater: string;
  toolFertilize: string;
  toolPlant: string;
  toolBuild: string;
  toolRemove: string;
  openMarket: string;
  openNeighbors: string;
  openEvents: string;
  openAvatar: string;
  openOptions: string;
  toggleMusic: string;
}

export type GraphicsQuality = 'standard' | 'high';

export type ActionBurstKind =
  | 'hoe'
  | 'water'
  | 'fertilize'
  | 'plant'
  | 'harvest'
  | 'build'
  | 'remove'
  | 'splash';

export interface ActionBurst {
  wx: number;
  wy: number;
  kind: ActionBurstKind;
  color?: string;
}

export interface GameSettings {
  resolution: ResolutionPreset;
  graphicsQuality?: GraphicsQuality;
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
  currentTrackIndex: number;
  musicPlaying: boolean;
  showGrid: boolean;
  showTimers: boolean;
  keybinds: KeybindSettings;
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  createdAt: number;
  isWorldCoord?: boolean;
}

export interface ToastMessage {
  id: string;
  title: string;
  detail?: string;
  tone: 'info' | 'success' | 'warning';
}

export interface PlayerPosition {
  x: number; // world tile coordinates (0..WORLD_SIZE-1)
  y: number;
  facing: 'down' | 'up' | 'left' | 'right';
  moving: boolean;
  jumpStartMs?: number;
}

export interface MailRewardItem {
  kind: 'seed' | 'fertilizer' | 'bait' | 'elixir' | 'coins';
  itemId?: string;
  qty: number;
  label: string;
}

export interface VillageFireReport {
  id: string;
  day: number;
  houseId: string;
  houseName: string;
  causeTitle: string;
  causeDetail: string;
  startedAtTime: string;
  durationMinutes: number;
  playerHelped: boolean;
}

export interface VillageFireState {
  active: boolean;
  houseId: string;
  houseName: string;
  causeTitle: string;
  causeDetail: string;
  startedAtTime: string;
  totalMs: number;
  remainingMs: number;
  playerHelped: boolean;
  nextFireCooldownMs: number;
  sootHouseId: string | null;
  sootUntilDay: number;
  pendingNewspaperReports: VillageFireReport[];
}

export interface NewspaperIssue {
  id: string;
  day: number;
  season: Season;
  weather: WeatherType;
  deliveredAtTime: string;
  headline: string;
  tip: string;
  harvest24h: number;
  fish24h: number;
  crafted24h: number;
  soldCoins24h: number;
  shopRevenue24h: number;
  shopSold24h: number;
  shopVisitors24h: number;
  neighborHelps24h: number;
  bestSellerItemId?: string;
  hotItemIds: string[];
  crashedItemIds?: string[];
  fireReports?: VillageFireReport[];
  weddingReports?: RomanceWeddingReport[];
}

export interface PendingMail {
  day: number;
  deliveredAtTime: string;
  title: string;
  senderNote: string;
  rewards: MailRewardItem[];
  issue: NewspaperIssue;
}

export interface PostmanState {
  active: boolean;
  x: number;
  y: number;
  phase: 'to_box' | 'delivering' | 'leaving';
  timerMs: number;
  deliveredToday: boolean;
}

export interface MailboxSnapshot {
  day: number;
  totalHarvested: number;
  totalCaught: number;
  totalCrafted: number;
  totalSoldCoins: number;
  shopRevenue: number;
  shopSoldCount: number;
  shopVisitorsAllTime: number;
  totalNeighborsHelped: number;
}

export interface MailboxState {
  pendingMail: PendingMail | null;
  lastDeliveredDay: number;
  postman: PostmanState;
  archive: NewspaperIssue[];
  lastSnapshot: MailboxSnapshot;
}

export interface SantaSleighState {
  active: boolean;
  startedDay: number;
  remainingMs: number;
  durationMs: number;
  dropTarget: { x: number; y: number } | null;
  giftDropped: boolean;
}

export interface WinterGiftDrop {
  x: number;
  y: number;
  itemId: string;
  droppedDay: number;
}

export interface FireworksState {
  active: boolean;
  remainingMs: number;
  durationMs: number;
  lastTriggeredDay: number;
}

export interface WinterFestivalState {
  lastSantaDay: number;
  santaSleigh: SantaSleighState | null;
  droppedGifts: WinterGiftDrop[];
  lastFireworksDay: number;
  fireworks: FireworksState | null;
}

export interface VillageBoardOrder {
  id: string;
  residentId: string;
  residentName: string;
  houseId: string;
  houseName: string;
  neighborId?: string;
  itemId: string;
  qty: number;
  rewardCoins: number;
  rewardXp: number;
  rewardReputation: number;
  bonusItemId?: string;
  bonusQty?: number;
  completed: boolean;
}

export interface VillageBoardState {
  lastGeneratedDay: number;
  orders: VillageBoardOrder[];
  completedTotal: number;
  dailyBonusClaimedDay: number;
}

export type MineCellKind =
  | 'empty'
  | 'rock'
  | 'copper_vein'
  | 'iron_vein'
  | 'silver_vein'
  | 'amethyst_vein'
  | 'gold_vein'
  | 'moonstone_vein'
  | 'crystal_cache'
  | 'ladder';

export interface MineCell {
  idx: number;
  kind: MineCellKind;
  hp: number;
  maxHp: number;
  hasLadder?: boolean;
}

export interface MineState {
  unlockedFloor: number;
  currentFloor: number;
  stamina: number;
  maxStamina: number;
  pickaxeTier: 1 | 2 | 3 | 4;
  ores: Record<string, number>;
  relics: Record<string, number>;
  discoveredRelics: string[];
  totalRocksMined: number;
  board: MineCell[];
  ladderRevealed: boolean;
  lastRefillDay: number;
}

export type VillageBusinessId =
  | 'west_bakery'
  | 'west_supermarket'
  | 'auto_supplier'
  | 'dairy_plant'
  | 'trade_office';

export interface BusinessBreakdownInfo {
  reason: string;
  repairCost: number;
  brokenAtDay: number;
}

export interface VillageBusinessState {
  ownedIds: VillageBusinessId[];
  totalEarnedById: Record<string, number>;
  todayEarnedById: Record<string, number>;
  payoutAccMs: number;
  lastPayoutDay: number;
  brokenById?: Partial<Record<VillageBusinessId, BusinessBreakdownInfo>>;
  outageCheckAccMs?: number;
}

export type ThemeParkAttractionId =
  | 'ferris_wheel'
  | 'roller_coaster'
  | 'water_flume'
  | 'sky_tower'
  | 'ghost_train';

export interface ThemeParkState {
  owned: boolean;
  purchasedAtDay?: number;
  attractions: ThemeParkAttractionId[];
  todayEarned: number;
  totalEarned: number;
  payoutAccMs: number;
  lastPayoutDay: number;
  breakdown?: BusinessBreakdownInfo | null;
}

export interface EconomyCrisisState {
  lastInspectionDay: number;
  lastLevyCoins: number;
  lastLevyReason?: string;
  inspectionsTotal: number;
}

export type RomanceStatus = 'single' | 'crush' | 'married';

export type RomanceDateId = 'village_stroll' | 'river_picnic' | 'park_ferris';

export interface RomanceWeddingReport {
  id: string;
  day: number;
  partnerName: string;
  partnerRole: string;
  farmName: string;
}

export interface RomanceState {
  status: RomanceStatus;
  pendingSpark: {
    candidateId: string;
    eventLabel: string;
    quote: string;
    sparkedDay: number;
  } | null;
  partnerId: string | null;
  affection: number; // 0..100
  marriedDay?: number;
  lastGiftDay: number;
  lastDateDay: number;
  lastHelpDay: number;
  datesCount: number;
  giftsCount: number;
  cooldownUntilDay: number;
  partnerX: number;
  partnerY: number;
  partnerMoveFromX?: number;
  partnerMoveFromY?: number;
  partnerMovedAt?: number;
  morningSurpriseText?: string;
  pendingNewspaperWedding?: RomanceWeddingReport | null;
}

export interface GameState {
  version: number;
  savedAt: number;
  coins: number;
  xp: number;
  level: number; // 1..249
  day: number;
  ingameMinutes: number;
  season: Season;
  weather: WeatherType;
  weatherRemainingMs: number;
  nextDisasterMs: number;
  disasterWarning: DisasterWarning | null;
  lastDisasterReport: DisasterReport | null;
  unlockedRing: number; // 0 = 8x8 up to 6 = 20x20
  tiles: TileData[][];
  seeds: Record<string, number>;
  inventory: Record<string, number>;
  fertilizerCount: number;
  selectedTool: ToolType;
  selectedSeedId: string;
  wateringCanTier: 1 | 2 | 3 | 4;
  avatar: AvatarConfig;
  pet: PetState;
  workers: FarmWorker[];
  craftingJobs: CraftingJob[];
  merchant: WanderingMerchantState;
  fishingBaitCharges: number;
  growthElixirCount: number;
  house: HouseState;
  tutorial: TutorialState;
  fishing: FishingState;
  quests: QuestState;
  almanac: AlmanacState;
  villageFair: VillageFairState;
  farmShop: FarmShopState;
  mailbox: MailboxState;
  winterFestival?: WinterFestivalState;
  villageBoard?: VillageBoardState;
  villageFire?: VillageFireState;
  villageBusinesses?: VillageBusinessState;
  themePark?: ThemeParkState;
  economyCrisis?: EconomyCrisisState;
  mine?: MineState;
  flyAgaricPos: { x: number; y: number } | null;
  mushroomEffect: MushroomEffectState;
  feastBuff?: FeastBuffState;
  neighbors: NeighborNPC[];
  romance?: RomanceState;
  marketHotItems: string[];
  marketCrashedItems?: string[];
  marketOrders: MarketOrder[];
  eventState: SeasonalEventState;
  unlockedTrophies: string[];
  stats: {
    totalHarvested: number;
    totalSoldCoins: number;
    totalNeighborsHelped: number;
    disastersSurvived: number;
    totalCrafted?: number;
    totalMarketOrders?: number;
    totalMerchantDeals?: number;
    totalDecorPlaced?: number;
    totalPetCares?: number;
    totalMineForged?: number;
    totalFiresHelped?: number;
    totalCrisesSurvived?: number;
    totalRepairsPaid?: number;
    harvestedByItem?: Record<string, number>;
    craftedByItem?: Record<string, number>;
  };
}
