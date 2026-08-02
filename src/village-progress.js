const SAVE_KEY = "bailgadi:village-progress";
const SAVE_VERSION = 1;

function availableStorage() {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function unlockedFeaturesFor(reputation) {
  const features = ["small-contracts"];
  if (reputation >= 30) {
    features.push("larger-cargo", "better-rewards", "decorated-market");
  }
  if (reputation >= 70) {
    features.push(
      "premium-deliveries",
      "village-festivals",
      "rare-roadside-events",
    );
  }
  return features;
}

export function reputationTier(reputation) {
  if (reputation >= 70) return "High";
  if (reputation >= 30) return "Medium";
  return "Low";
}

export function createVillageProgressStore() {
  return {
    version: SAVE_VERSION,
    villages: {},
  };
}

function normalizeVillageRecord(record, villageId) {
  const reputation = Math.max(
    0,
    Math.min(100, Number(record?.reputation) || 0),
  );
  return {
    villageId,
    name: typeof record?.name === "string" ? record.name : "Unknown Village",
    populationSize: typeof record?.populationSize === "string"
      ? record.populationSize
      : "Small",
    knownFor: typeof record?.knownFor === "string"
      ? record.knownFor
      : "Village Trade",
    landmark: typeof record?.landmark === "string"
      ? record.landmark
      : "Village Centre",
    reputation,
    deliveriesCompleted: Math.max(
      0,
      Math.floor(Number(record?.deliveriesCompleted) || 0),
    ),
    bestDeliveryTime: Number.isFinite(record?.bestDeliveryTime)
      ? Math.max(0, record.bestDeliveryTime)
      : null,
    bestCargoCondition: Math.max(
      0,
      Math.min(100, Number(record?.bestCargoCondition) || 0),
    ),
    bestReward: Math.max(0, Number(record?.bestReward) || 0),
    unlocked: record?.unlocked === true,
    discoveredAt: Number.isFinite(record?.discoveredAt)
      ? record.discoveredAt
      : null,
    unlockedFeatures: unlockedFeaturesFor(reputation),
  };
}

export function loadVillageProgress(storage = availableStorage()) {
  if (!storage) return createVillageProgressStore();
  try {
    const parsed = JSON.parse(storage.getItem(SAVE_KEY) || "null");
    if (!parsed || typeof parsed.villages !== "object") {
      return createVillageProgressStore();
    }
    const store = createVillageProgressStore();
    for (const [villageId, record] of Object.entries(parsed.villages)) {
      store.villages[villageId] = normalizeVillageRecord(record, villageId);
    }
    return store;
  } catch {
    return createVillageProgressStore();
  }
}

export function saveVillageProgress(
  store,
  storage = availableStorage(),
) {
  if (!storage) return false;
  try {
    storage.setItem(SAVE_KEY, JSON.stringify({
      version: SAVE_VERSION,
      villages: store.villages,
    }));
    return true;
  } catch {
    return false;
  }
}

export function ensureVillageProgress(store, descriptor) {
  const existing = store.villages[descriptor.id];
  if (existing) {
    existing.name = descriptor.name;
    existing.populationSize = descriptor.populationSize;
    existing.knownFor = descriptor.knownFor;
    existing.landmark = descriptor.landmark;
    existing.unlockedFeatures = unlockedFeaturesFor(existing.reputation);
    return existing;
  }
  const record = normalizeVillageRecord({
    name: descriptor.name,
    populationSize: descriptor.populationSize,
    knownFor: descriptor.knownFor,
    landmark: descriptor.landmark,
  }, descriptor.id);
  store.villages[descriptor.id] = record;
  return record;
}

export function applyVillageProgress(descriptor, record) {
  descriptor.reputation = record.reputation;
  descriptor.completedDeliveries = record.deliveriesCompleted;
  descriptor.unlocked = record.unlocked;
  descriptor.unlockedFeatures = [...record.unlockedFeatures];
  descriptor.reputationTier = reputationTier(record.reputation);
  descriptor.appearanceProgression = {
    extraVillagers: record.reputation >= 70
      ? 4
      : record.reputation >= 30 ? 2 : 0,
    extraAnimals: record.reputation >= 70
      ? 2
      : record.reputation >= 30 ? 1 : 0,
    villagePropCount: record.reputation >= 70
      ? 24
      : record.reputation >= 30 ? 20 : 14,
    decoratedMarket: record.reputation >= 30,
    festivalDecorations: record.reputation >= 70,
    parkedCartBonus: record.reputation >= 30 ? 1 : 0,
  };
  descriptor.contractProgression = {
    tier: descriptor.reputationTier,
    smallContracts: true,
    largerCargo: record.reputation >= 30,
    betterRewards: record.reputation >= 30,
    premiumDeliveries: record.reputation >= 70,
    villageFestivals: record.reputation >= 70,
    rareRoadsideEvents: record.reputation >= 70,
  };
  return descriptor;
}

export function discoverVillage(store, descriptor, now = Date.now()) {
  const record = ensureVillageProgress(store, descriptor);
  const isNewDiscovery = !record.unlocked;
  if (isNewDiscovery) {
    record.unlocked = true;
    record.discoveredAt = now;
  }
  applyVillageProgress(descriptor, record);
  return { record, isNewDiscovery };
}

export function calculateReputationGain({
  success,
  elapsed,
  timeLimit,
  cargoCondition,
}) {
  if (!success) {
    return { total: 0, base: 0, fastBonus: 0, cargoBonus: 0, late: false };
  }
  const late = elapsed > timeLimit;
  if (late) {
    return { total: 1, base: 1, fastBonus: 0, cargoBonus: 0, late: true };
  }
  const fastBonus = elapsed <= timeLimit * 0.75 ? 2 : 0;
  const cargoBonus = cargoCondition >= 90 ? 3 : 0;
  return {
    total: 5 + fastBonus + cargoBonus,
    base: 5,
    fastBonus,
    cargoBonus,
    late: false,
  };
}

export function recordVillageDelivery(
  store,
  descriptor,
  {
    success,
    elapsed,
    timeLimit,
    cargoCondition,
    reward,
  },
) {
  const record = ensureVillageProgress(store, descriptor);
  const gain = calculateReputationGain({
    success,
    elapsed,
    timeLimit,
    cargoCondition,
  });
  if (!success) return { record, gain };

  record.unlocked = true;
  record.deliveriesCompleted += 1;
  record.reputation = Math.min(100, record.reputation + gain.total);
  record.bestDeliveryTime = record.bestDeliveryTime === null
    ? elapsed
    : Math.min(record.bestDeliveryTime, elapsed);
  record.bestCargoCondition = Math.max(
    record.bestCargoCondition,
    cargoCondition,
  );
  record.bestReward = Math.max(record.bestReward, reward);
  record.unlockedFeatures = unlockedFeaturesFor(record.reputation);
  applyVillageProgress(descriptor, record);
  return { record, gain };
}

export function villageProgressSummary(store, totalVillageCount) {
  const villages = Object.values(store.villages)
    .filter((record) => record.unlocked)
    .sort((a, b) => (
      b.reputation - a.reputation || a.name.localeCompare(b.name)
    ));
  const deliveriesCompleted = villages.reduce(
    (total, village) => total + village.deliveriesCompleted,
    0,
  );
  const bestReward = villages.reduce(
    (best, village) => Math.max(best, village.bestReward),
    0,
  );
  return {
    villages,
    discovered: villages.length,
    deliveriesCompleted,
    bestReward,
    completionPercentage: totalVillageCount > 0
      ? Math.round((villages.length / totalVillageCount) * 100)
      : 0,
  };
}

export const VILLAGE_PROGRESS_SAVE_KEY = SAVE_KEY;
