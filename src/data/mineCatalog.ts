import { MineCell, MineCellKind } from '../types/game';

export interface MineResourceDef {
  id: string;
  name: string;
  kind: 'ore' | 'relic';
  minFloor: number;
  sellPrice: number;
  xpReward: number;
  color: string;
  accentColor: string;
  description: string;
}

export const MINE_ORES: MineResourceDef[] = [
  {
    id: 'copper_ore',
    name: 'Kupfererz',
    kind: 'ore',
    minFloor: 1,
    sellPrice: 18,
    xpReward: 10,
    color: '#c2410c',
    accentColor: '#fdba74',
    description: 'Leitfähiges Kupfererz aus den oberen Stollen – ideal für Hof-Sprinkler.',
  },
  {
    id: 'iron_ore',
    name: 'Eisenerz',
    kind: 'ore',
    minFloor: 1,
    sellPrice: 26,
    xpReward: 14,
    color: '#64748b',
    accentColor: '#cbd5e1',
    description: 'Robustes Eisenerz für Werkzeuge, Spitzhacken und Bauwerke.',
  },
  {
    id: 'silver_ore',
    name: 'Silbererz',
    kind: 'ore',
    minFloor: 4,
    sellPrice: 48,
    xpReward: 22,
    color: '#94a3b8',
    accentColor: '#f8fafc',
    description: 'Schimmerndes Silbererz aus mittleren Tiefen der Kristallhöhle.',
  },
  {
    id: 'amethyst_crystal',
    name: 'Amethyst-Kristall',
    kind: 'ore',
    minFloor: 5,
    sellPrice: 68,
    xpReward: 30,
    color: '#7c3aed',
    accentColor: '#e9d5ff',
    description: 'Violetter Leuchtkristall für Kristall-Laternen und magische Veredelung.',
  },
  {
    id: 'gold_ore',
    name: 'Golderz',
    kind: 'ore',
    minFloor: 8,
    sellPrice: 95,
    xpReward: 42,
    color: '#eab308',
    accentColor: '#fef08a',
    description: 'Schweres Berggold aus tiefen Quarzadern.',
  },
  {
    id: 'moonstone',
    name: 'Mondstein',
    kind: 'ore',
    minFloor: 11,
    sellPrice: 165,
    xpReward: 65,
    color: '#0ea5e9',
    accentColor: '#e0f2fe',
    description: 'Seltener, kühlliebender Mondstein für Meister-Sprinkler und Obelisken.',
  },
];

export const MINE_RELICS: MineResourceDef[] = [
  {
    id: 'amber_beetle',
    name: 'Bernstein-Käfer',
    kind: 'relic',
    minFloor: 1,
    sellPrice: 110,
    xpReward: 45,
    color: '#d97706',
    accentColor: '#fef08a',
    description: 'Uraltes Waldinsekt, eingeschlossen in klarem Baumharz.',
  },
  {
    id: 'fern_fossil',
    name: 'Uraltes Farn-Fossil',
    kind: 'relic',
    minFloor: 3,
    sellPrice: 145,
    xpReward: 55,
    color: '#78716c',
    accentColor: '#86efac',
    description: 'Ein fein gezeichneter Farn-Abdruck aus den Anfängen des Sonnentals.',
  },
  {
    id: 'sun_geode',
    name: 'Sonnental-Geode',
    kind: 'relic',
    minFloor: 5,
    sellPrice: 210,
    xpReward: 75,
    color: '#f59e0b',
    accentColor: '#fde047',
    description: 'Aufgebrochene Quarzknolle voller goldener Kristallspitzen.',
  },
  {
    id: 'dwarf_compass',
    name: 'Alter Bergbau-Kompass',
    kind: 'relic',
    minFloor: 7,
    sellPrice: 280,
    xpReward: 95,
    color: '#b45309',
    accentColor: '#38bdf8',
    description: 'Messingkompass der früheren Tal-Bergleute – die Nadel zittert noch.',
  },
  {
    id: 'star_quartz',
    name: 'Sternen-Quarz',
    kind: 'relic',
    minFloor: 10,
    sellPrice: 360,
    xpReward: 130,
    color: '#ec4899',
    accentColor: '#fbcfe8',
    description: 'Sechsstrahlig funkelnder Bergkristall aus den Tiefstollen.',
  },
  {
    id: 'dragon_crystal',
    name: 'Herz des Tals (Kristall)',
    kind: 'relic',
    minFloor: 14,
    sellPrice: 520,
    xpReward: 185,
    color: '#06b6d4',
    accentColor: '#f8fafc',
    description: 'Legendärer tiefblauer Höhlenkristall mit kühlem Lichtschimmer.',
  },
];

export const MINE_RESOURCE_BY_ID: Record<string, MineResourceDef> = Object.fromEntries(
  [...MINE_ORES, ...MINE_RELICS].map((r) => [r.id, r])
);

export interface MineForgeRecipe {
  id: string;
  kind: 'item' | 'pickaxe';
  title: string;
  description: string;
  outputItemId?: string;
  outputQty?: number;
  targetPickaxeTier?: 2 | 3 | 4;
  unlockLevel: number;
  coinsCost: number;
  ingredients: { resourceId: string; qty: number }[];
  xpReward: number;
}

export const MINE_FORGE_RECIPES: MineForgeRecipe[] = [
  {
    id: 'forge_copper_sprinkler',
    kind: 'item',
    title: 'Kupfer-Sprinkler schmieden',
    description: 'Bewässert automatisch alle 3×3 Felder rundherum (+12 Charme).',
    outputItemId: 'copper_sprinkler',
    outputQty: 1,
    unlockLevel: 8,
    coinsCost: 90,
    ingredients: [
      { resourceId: 'copper_ore', qty: 4 },
      { resourceId: 'iron_ore', qty: 2 },
    ],
    xpReward: 110,
  },
  {
    id: 'forge_crystal_lantern',
    kind: 'item',
    title: 'Kristall-Laterne fertigen',
    description: 'Leuchtet nachts violett-blau über deinem Hof (+22 Charme).',
    outputItemId: 'crystal_lantern',
    outputQty: 1,
    unlockLevel: 5,
    coinsCost: 80,
    ingredients: [
      { resourceId: 'iron_ore', qty: 2 },
      { resourceId: 'amethyst_crystal', qty: 2 },
    ],
    xpReward: 95,
  },
  {
    id: 'forge_winter_greenhouse',
    kind: 'item',
    title: 'Winter-Gewächshaus bauen (Erz-Rabatt)',
    description: 'Schützt 5×5 Felder & ermöglicht Winter-Anbau für alle Pflanzen (+25 % Wärme, ab Lvl 18).',
    outputItemId: 'winter_greenhouse',
    outputQty: 1,
    unlockLevel: 18,
    coinsCost: 650,
    ingredients: [
      { resourceId: 'iron_ore', qty: 5 },
      { resourceId: 'copper_ore', qty: 4 },
      { resourceId: 'amethyst_crystal', qty: 2 },
    ],
    xpReward: 340,
  },
  {
    id: 'forge_moon_sprinkler',
    kind: 'item',
    title: 'Mondstein-Sprinkler schmieden',
    description: 'Bewässert 5×5 Felder automatisch UND gibt +20 % Wachstum im 3×3-Kern (+24 Charme)!',
    outputItemId: 'moon_sprinkler',
    outputQty: 1,
    unlockLevel: 20,
    coinsCost: 340,
    ingredients: [
      { resourceId: 'silver_ore', qty: 4 },
      { resourceId: 'amethyst_crystal', qty: 2 },
      { resourceId: 'moonstone', qty: 2 },
    ],
    xpReward: 290,
  },
  {
    id: 'forge_moonstone_obelisk',
    kind: 'item',
    title: 'Mondstein-Obelisk meißeln',
    description: 'Schützt 5×5 Felder vor Stürmen und beschleunigt Wachstum im 5×5-Umkreis (+38 Charme).',
    outputItemId: 'moonstone_obelisk',
    outputQty: 1,
    unlockLevel: 22,
    coinsCost: 580,
    ingredients: [
      { resourceId: 'gold_ore', qty: 4 },
      { resourceId: 'moonstone', qty: 3 },
      { resourceId: 'amethyst_crystal', qty: 3 },
    ],
    xpReward: 420,
  },
  {
    id: 'forge_pickaxe_2',
    kind: 'pickaxe',
    title: 'Kupfer-Spitzhacke (Stufe 2)',
    description: 'Schlägt 2 Schaden pro Schlag + höhere Erz-Ausbeute.',
    targetPickaxeTier: 2,
    unlockLevel: 3,
    coinsCost: 160,
    ingredients: [
      { resourceId: 'copper_ore', qty: 6 },
      { resourceId: 'iron_ore', qty: 4 },
    ],
    xpReward: 140,
  },
  {
    id: 'forge_pickaxe_3',
    kind: 'pickaxe',
    title: 'Silber-Spitzhacke (Stufe 3)',
    description: 'Schlägt 3 Schaden pro Schlag + 25 % Chance auf Extra-Kristalle.',
    targetPickaxeTier: 3,
    unlockLevel: 10,
    coinsCost: 480,
    ingredients: [
      { resourceId: 'silver_ore', qty: 6 },
      { resourceId: 'amethyst_crystal', qty: 3 },
    ],
    xpReward: 260,
  },
  {
    id: 'forge_pickaxe_4',
    kind: 'pickaxe',
    title: 'Mondstein-Spitzhacke (Stufe 4)',
    description: 'Meisterwerk: 4 Schaden pro Schlag + +4 max. Tages-Ausdauer & doppelte Relikt-Chance.',
    targetPickaxeTier: 4,
    unlockLevel: 18,
    coinsCost: 1200,
    ingredients: [
      { resourceId: 'gold_ore', qty: 6 },
      { resourceId: 'moonstone', qty: 4 },
    ],
    xpReward: 520,
  },
];

export const MINE_SNACKS: { itemId: string; staminaGain: number }[] = [
  { itemId: 'farmhouse_bread', staminaGain: 6 },
  { itemId: 'potato_bread', staminaGain: 8 },
  { itemId: 'apple_pie', staminaGain: 10 },
  { itemId: 'apple_cider', staminaGain: 9 },
  { itemId: 'nonalcoholic_beer', staminaGain: 8 },
  { itemId: 'farm_beer', staminaGain: 8 },
  { itemId: 'mushroom_ragout', staminaGain: 11 },
  { itemId: 'honey_cake', staminaGain: 12 },
  { itemId: 'pumpkin_pie', staminaGain: 14 },
  { itemId: 'royal_feast_cake', staminaGain: 22 },
];

export const MINE_GRID_SIZE = 20; // 5 cols x 4 rows

export function generateMineBoard(floor: number): MineCell[] {
  const cells: MineCell[] = Array.from({ length: MINE_GRID_SIZE }, (_, idx) => ({
    idx,
    kind: 'empty' as MineCellKind,
    hp: 0,
    maxHp: 0,
  }));

  // Leave 2..3 open floor tiles near entrance (indices 0, 1, 5)
  const candidates = Array.from({ length: MINE_GRID_SIZE }, (_, i) => i).filter(
    (i) => i !== 0 && i !== 1 && i !== 5
  );

  // Shuffle candidates
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  const nodeCount = Math.min(candidates.length, 12 + (floor % 4));
  const pickedIndices = candidates.slice(0, nodeCount);
  const ladderHolderIdx = pickedIndices[Math.floor(Math.random() * pickedIndices.length)];

  for (const idx of pickedIndices) {
    const roll = Math.random();
    let kind: MineCellKind = 'rock';
    let hp = floor >= 10 ? 3 : floor >= 4 ? 2 : 1;

    if (floor >= 11 && roll < 0.14) {
      kind = 'moonstone_vein';
      hp = 4;
    } else if (floor >= 8 && roll < 0.28) {
      kind = 'gold_vein';
      hp = 3;
    } else if (floor >= 5 && roll < 0.42) {
      kind = 'amethyst_vein';
      hp = 3;
    } else if (floor >= 4 && roll < 0.56) {
      kind = 'silver_vein';
      hp = 2;
    } else if (roll < 0.72) {
      kind = 'iron_vein';
      hp = 2;
    } else if (roll < 0.87) {
      kind = 'copper_vein';
      hp = 1;
    } else if (roll < 0.93 && floor >= 2) {
      kind = 'crystal_cache';
      hp = 2;
    }

    cells[idx] = {
      idx,
      kind,
      hp,
      maxHp: hp,
      hasLadder: idx === ladderHolderIdx,
    };
  }

  return cells;
}
