import { CatalogItem } from "../modules/products/products.handler";
import nlp from "compromise";

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


function toSingular(word: string): string {
  return nlp(word).nouns().toSingular().out("text") || word;
}

export function buildFlowerMap(catalog: CatalogItem[]): FlowerMap {
  const map: FlowerMap = {};

  for (const item of catalog) {
    const tokens = item.name
      .toLowerCase()
      .split(/\s+/)
      .map(w => w.replace(/[^a-z]/g, ""))
      .map(w => toSingular(w)); // ✅ key change

    console.log("tokensss", tokens)
    console.log("tokensss", tokens)
    console.log("tokensss", tokens)

    for (const token of tokens) {
      if (FLOWER_KEYWORDS.includes(token)) {
        if (!map[token]) {
          map[token] = [];
        }

        map[token].push(item.productId);
      }
    }

    // special case
    if (tokens.includes("baby") && tokens.includes("breath")) {
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
  console.log("mapppp", map)
  return map;
}

export function getProductIdsFromMessage(
  message: string,
  flowerMap: FlowerMap,
  catalog: CatalogItem[]
): number[] {

  const tokens = message
    .toLowerCase()
    .split(/\s+/)
    .map(w => w.replace(/[^a-z]/g, ""))
    .map(w => toSingular(w)); // ✅ same fix

  const matchedIds = new Set<number>();

  for (const token of tokens) {
    if (flowerMap[token]) {
      flowerMap[token].forEach(id => matchedIds.add(id));
    }
  }

  const idArrays = Array.from(matchedIds)

  if (matchedIds.size === 0) {
    return catalog.slice(0, 3).map(item => item.productId);
  }

  return Array.from(matchedIds);
}
