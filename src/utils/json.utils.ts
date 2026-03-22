import * as fs from 'fs';
import * as path from 'path';
import { IntentFileSchema } from '../validators/intent.schema';
import { logger } from '../logger/winston.logger';

const INTENT_FILE_PATH = path.join(process.cwd(), 'src', 'files', 'intent.json');

export function addOrganisationToken(
  targetId: number,
  newToken: string
): void {
  try {
    if (!fs.existsSync(INTENT_FILE_PATH)) {
      throw new Error(`Intent File not found at: ${INTENT_FILE_PATH}`);
    }

    const rawJson = fs.readFileSync(INTENT_FILE_PATH, "utf-8");
    const json = JSON.parse(rawJson);

    const intents = IntentFileSchema.parse(json);

    const updatedIntents = intents.map((intent) => {
      if (intent.id === targetId) {
        if (intent.organisation_tokens.includes(newToken)) {
          logger.warn(`Token "${newToken}" already exists for intent ${targetId}.`);
          return intent;
        }

        return {
          ...intent,
          organisation_tokens: [newToken, ...intent.organisation_tokens],
        };
      }
      return intent;
    });

    fs.writeFileSync(
      INTENT_FILE_PATH,
      JSON.stringify(updatedIntents, null, 2),
      "utf-8"
    );

    logger.info(`Successfully updated organisation tokens in: ${INTENT_FILE_PATH}`);

  } catch (error) {
    logger.error(`Failed to update intents: ${error instanceof Error ? error.message : error}`);
    throw error;
  }
}
