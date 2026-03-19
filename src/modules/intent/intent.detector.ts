import { Injectable, Inject } from '@nestjs/common';
import natural from "natural";
import { BestIntent, ReadOnlyIntentDefinition } from "../../types/intent.types";
import { IntentGeminiService } from './intent.gemini';

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
    MIN_THRESHOLD: 8,
    PARTIAL_PHRASE_MULTIPLIER: 0.5,
  };

  private readonly STOP_WORDS = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'can', 'i', 'you', 'it', 'for',
    'my'
  ]);

  constructor(
    @Inject(INTENT_DEFINITIONS) private readonly intents: Array<ReadOnlyIntentDefinition>,
    private readonly geminiService:IntentGeminiService
  ) {}

  public async getFinalIntent(message: string): Promise<BestIntent>{
    try {

      const intent = this.processIntent(message);

      if (intent.id === "UNKNOWN") {

      }

      return intent
    } catch(error) {
      throw error;
    }
  }

  /**
   * Orchestrates the detection flow
   */
   public processIntent(message: string): BestIntent {
     console.log("\n=== PROCESSING MESSAGE ===");
     console.log("Raw message:", message);

     const { stemmedTokens, originalTokens } = this.tokenize(message);
     console.log("Tokenized message:", originalTokens);
     console.log("Stemmed tokens (without stop words):", stemmedTokens);

     let bestIntent: BestIntent = this.getInitialBestIntent();

     for (const intent of this.intents) {
       let score = 0;
       const usedTokenIndices = new Set<number>();

       const matchedStrongTokens: string[] = [];
       const matchedFuzzyTokens: string[] = [];
       const matchedWeakTokens: string[] = [];
       const matchedPartialTokens: string[] = [];

       console.log("\n--- Evaluating Intent:", intent.label, `(ID: ${intent.id}) ---`);

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

         console.log(`Phrase check: "${phrase}"`);
         console.log("  Phrase tokens:", phraseTokens);
         console.log(`  Intersection tokens: ${intersectionTokens}, Match ratio: ${matchRatio}`);

         if (matchRatio === 1 && phraseTokens.length > 1) {
           console.log("  -> Exact phrase match! Returning intent immediately.");
           return {
             id: intent.id,
             label: intent.label,
             score: this.SCORES.EXACT_PHRASE,
             matchedPhrase: phrase,
           };
         } else if (matchRatio < 1 && matchRatio > 0 && phraseTokens.length > 2) {
           const partialScore = this.SCORES.EXACT_PHRASE * matchRatio * this.SCORES.PARTIAL_PHRASE_MULTIPLIER;
           score += partialScore;
           matchedPartialTokens.push(phrase);
           console.log(`  -> Partial match. Added partial score: ${partialScore.toFixed(2)}`);
         }
       }

       // --- 2. Strong Token Scoring ---
       if (intent.strongTokens) {
         console.log("Strong tokens for intent:", intent.strongTokens);

         for (const sToken of intent.strongTokens) {
           const sTokenized = this.tokenizeSingleWord(sToken).stemmed;

           for (let i = 0; i < stemmedTokens.length; i++) {
             if (usedTokenIndices.has(i)) continue;

             const userToken = stemmedTokens[i];

             if (userToken === sTokenized) {
               score += this.SCORES.STRONG_TOKEN;
               usedTokenIndices.add(i);
               matchedStrongTokens.push(userToken);
               console.log(`  -> Strong token matched: "${userToken}" (+${this.SCORES.STRONG_TOKEN})`);
             } else {
               const distance = getLevenshteinDistance(sTokenized, userToken);
               if (distance <= 1) {
                 score += this.SCORES.FUZZY_MATCH;
                 usedTokenIndices.add(i);
                 matchedFuzzyTokens.push(sToken);
                 console.log(`  -> Fuzzy token matched: "${userToken}" ~ "${sToken}" (+${this.SCORES.FUZZY_MATCH})`);
               }
             }
           }
         }
       }

       // --- 3. Weak Token Scoring ---
       if (intent.weakTokens) {
         console.log("Weak tokens for intent:", intent.weakTokens);

         for (const wToken of intent.weakTokens) {
           const wTokenized = this.tokenizeSingleWord(wToken).stemmed;

           for (let i = 0; i < stemmedTokens.length; i++) {
             if (usedTokenIndices.has(i)) continue;

             const userToken = stemmedTokens[i];

             if (userToken === wTokenized) {
               score += this.SCORES.WEAK_TOKEN;
               matchedWeakTokens.push(wToken);
               usedTokenIndices.add(i);
               console.log(`  -> Weak token matched: "${userToken}" (+${this.SCORES.WEAK_TOKEN})`);
             }
           }
         }
       }

       console.log(`Total score for intent "${intent.label}": ${score.toFixed(2)}`);
       console.log("Matched strong tokens:", matchedStrongTokens);
       console.log("Matched fuzzy tokens:", matchedFuzzyTokens);
       console.log("Matched weak tokens:", matchedWeakTokens);
       console.log("Matched partial phrases:", matchedPartialTokens);

       // --- 4. Update Best Intent ---
       if (score > bestIntent.score) {
         console.log(`-> "${intent.label}" is the new best intent!`);
         bestIntent = {
           id: intent.id,
           label: intent.label,
           score: score,
           partialPhrases: matchedPartialTokens,
           weakTokens: matchedWeakTokens,
           strongTokens: matchedStrongTokens,
           fuzzyTokens: matchedFuzzyTokens,
         };
       } else {
         console.log(`-> "${intent.label}" did not surpass the current best intent.`);
       }
     }

     console.log("\n=== FINAL BEST INTENT ===");
     console.log(bestIntent);

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

    // Remove duplicates while keeping order
    const originalTokens: string[] = Array.from(new Set(cleanText));

    const stemmedTokens: string[] = Array.from(
      new Set(
        originalTokens
          .filter(t => !this.STOP_WORDS.has(t))
          .map(t => stemmer(t))
      )
    );

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
