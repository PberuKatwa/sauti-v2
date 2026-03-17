import { Injectable, Inject } from '@nestjs/common';
import natural from "natural";
import { BestIntent, ReadOnlyIntentDefinition } from "../../types/intent.types";

const getLevenshteinDistance = natural.LevenshteinDistance;
const stemmer = natural.PorterStemmer.stem;

// Define a token for the intents configuration
export const INTENT_DEFINITIONS = 'INTENT_DEFINITIONS';

@Injectable()
export class IntentDetectorService {
  private readonly SCORES = {
    EXACT_PHRASE: 10,
    STRONG_TOKEN: 3,
    WEAK_TOKEN: 1,
    FUZZY_MATCH: 1.5,
    MIN_THRESHOLD: 4,
    PARTIAL_PHRASE_MULTIPLIER: 0.5,
  };

  private readonly STOP_WORDS = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'can', 'i', 'you', 'it', 'for',
    'my'
  ]);

  constructor(
    @Inject(INTENT_DEFINITIONS) private readonly intents: Array<ReadOnlyIntentDefinition>
  ) {}

  /**
   * Orchestrates the detection flow
   */
  public process(message: string): BestIntent {
    const { stemmedTokens } = this.tokenize(message);
    let bestIntent: BestIntent = this.getInitialBestIntent();

    for (const intent of this.intents) {
      let score = 0;
      const usedTokenIndices = new Set<number>();

      const matchedStrongTokens: string[] = [];
      const matchedFuzzyTokens: string[] = [];
      const matchedWeakTokens: string[] = [];
      const matchedPartialTokens: string[] = [];

      // --- 1. Phrase Matching ---
      for (const phrase of intent.phrases) {
        const phraseTokens = this.tokenize(phrase).stemmedTokens;
        let intersectionTokens = 0;

        stemmedTokens.forEach((token, index) => {
          if (phraseTokens.includes(token)) {
            intersectionTokens++;
            usedTokenIndices.add(index);
          }
        });

        const matchRatio = intersectionTokens / phraseTokens.length;

        if (matchRatio === 1 && phraseTokens.length > 1) {
          return {
            id: intent.id,
            label: intent.label,
            score: this.SCORES.EXACT_PHRASE,
            matchedPhrase: phrase,
          };
        } else if (matchRatio < 1 && matchRatio > 0 && phraseTokens.length > 2) {
          score += this.SCORES.EXACT_PHRASE * matchRatio * this.SCORES.PARTIAL_PHRASE_MULTIPLIER;
          matchedPartialTokens.push(phrase);
        }
      }

      // --- 2. Strong Token Scoring ---
      if (intent.strongTokens) {
        for (const sToken of intent.strongTokens) {
          const sTokenized = this.tokenizeSingleWord(sToken).stemmed;
          for (let i = 0; i < stemmedTokens.length; i++) {
            if (usedTokenIndices.has(i)) continue;

            const userToken = stemmedTokens[i];
            if (userToken === sTokenized) {
              score += this.SCORES.STRONG_TOKEN;
              usedTokenIndices.add(i);
              matchedStrongTokens.push(userToken);
            } else {
              const distance = getLevenshteinDistance(sTokenized, userToken);
              if (distance <= 1) {
                score += this.SCORES.FUZZY_MATCH;
                usedTokenIndices.add(i);
                matchedFuzzyTokens.push(sToken);
              }
            }
          }
        }
      }

      // --- 3. Weak Token Scoring ---
      if (intent.weakTokens) {
        for (const wToken of intent.weakTokens) {
          const wTokenized = this.tokenizeSingleWord(wToken).stemmed;
          for (let i = 0; i < stemmedTokens.length; i++) {
            if (usedTokenIndices.has(i)) continue;

            const userToken = stemmedTokens[i];
            if (userToken === wTokenized) {
              score += this.SCORES.WEAK_TOKEN;
              matchedWeakTokens.push(wToken);
              usedTokenIndices.add(i);
            }
          }
        }
      }

      // --- 4. Update Best Intent ---
      if (score > bestIntent.score) {
        bestIntent = {
          id: intent.id,
          label: intent.label,
          score: score,
          partialPhrases: matchedPartialTokens,
          weakTokens: matchedWeakTokens,
          strongTokens: matchedStrongTokens,
          fuzzyTokens: matchedFuzzyTokens,
        };
      }
    }

    return bestIntent.score < this.SCORES.MIN_THRESHOLD
      ? this.getInitialBestIntent()
      : bestIntent;
  }

  // --- Internal NLP Logic ---

  private tokenize(text: string) {
    const cleanText = text.toLocaleLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean);

    const originalTokens: string[] = cleanText;
    const stemmedTokens: string[] = originalTokens
      .filter(t => !this.STOP_WORDS.has(t))
      .map(t => stemmer(t));

    return { originalTokens, stemmedTokens };
  }

  private tokenizeSingleWord(text: string) {
    const cleanTokens = text.toLocaleLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean);

    if (cleanTokens.length === 0) {
      return { original: text, stemmed: '', isStopWord: false };
    }

    const originalWord = cleanTokens[0];
    const isStopWord = this.STOP_WORDS.has(originalWord);
    const stemmedWord = !isStopWord ? stemmer(originalWord) : '';

    return { original: originalWord, stemmed: stemmedWord, isStopWord };
  }

  private getInitialBestIntent(): BestIntent {
    return {
      id: "UNKNOWN",
      label: "UNKNOWN",
      score: 0,
      matchedPhrase: "UNKNOWN",
      partialPhrases: [],
      weakTokens: [],
      strongTokens: [],
      fuzzyTokens: [],
    };
  }
}
