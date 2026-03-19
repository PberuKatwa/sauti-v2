import { z } from "zod";

export const BestIntentSchema = z.object({
  id: z.string(),
  label: z.string(),
  score: z.number(),

  matchedPhrase: z.string().optional(),

  partialPhrases: z.array(z.string()).optional(),
  weakTokens: z.array(z.string()).optional(),
  strongTokens: z.array(z.string()).optional(),
  fuzzyTokens: z.array(z.string()).optional(),
});
