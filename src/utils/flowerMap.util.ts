import { CatalogItem } from "../modules/products/products.handler";

type FlowerMap = Record<string, number[]>;

const FLOWER_KEYWORDS = [
  "rose", "roses",
  "lily", "lilies",
  "tulip",
  "sunflower",
  "orchid",
  "carnation",
  "daisy"
];



export function buildFlowerMap(catalog: CatalogItem[]): FlowerMap {
  const map: FlowerMap = {};

  for (const item of catalog) {
    const name = item.name.toLowerCase();

    for (const flower of FLOWER_KEYWORDS) {
      if (name.includes(flower)) {
        if (!map[flower]) {
          map[flower] = [];
        }

        map[flower].push(item.productId);
      }
    }

    // Handle special case: "baby's breath"
    if (name.includes("baby") && name.includes("breath")) {
      if (!map["baby's breath"]) {
        map["baby's breath"] = [];
      }

      map["baby's breath"].push(item.productId);
    }
  }

  return map;
}

export const getMap = (catalog:CatalogItem[]):FlowerMap => {
  const map = buildFlowerMap(catalog);
  return map;
}

export function getProductIdsFromMessage(
  message: string,
  flowerMap: FlowerMap,
  catalog: CatalogItem[]
): number[] {

  const normalizedMsg = message.toLowerCase();
  const matchedIds = new Set<number>();

  for (const flower in flowerMap) {
    const regex = new RegExp(`\\b${flower}s?\\b`, "i");

    if (regex.test(normalizedMsg)) {
      flowerMap[flower].forEach(id => matchedIds.add(id));
    }
  }

  // ✅ fallback
  if (matchedIds.size === 0) {
    return catalog.slice(0, 3).map(item => item.productId);
  }

  return Array.from(matchedIds);
}
