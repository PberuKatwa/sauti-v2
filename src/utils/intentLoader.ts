import fs from "fs";
import * as path from 'path';
import { IntentFileSchema } from "../validators/intent.schema";
import { IntentDefinition } from "../types/intent.types";
import { logger } from "../logger/winston.logger";

function normalizeArray(arr: string[]): string[] {
  return [...new Set(arr.map(v => v.trim().toLowerCase()))];
}

const INTENT_FILE_PATH = path.join(process.cwd(), 'src', 'files', 'intent.json');

export function loadIntentsFromFile():IntentDefinition[]{
  try {

    if (!fs.existsSync(INTENT_FILE_PATH)) {
      throw new Error(`Intent File not found at: ${INTENT_FILE_PATH}`);
    }

    const rawJson = fs.readFileSync(INTENT_FILE_PATH, "utf-8");
    const json = JSON.parse(rawJson);

    const parsed = IntentFileSchema.parse(json)
    logger.info(`Successfully parsed file`)

    const validatedOutput = parsed.map(
      function(intent){

        const fileOutput:IntentDefinition = {
          id: intent.id,
          organization_type: intent.organization_type,
          description: intent.description,
          entity: intent.entity,
          category:intent.category,
          name: intent.name,
          organisation_tokens:normalizeArray(intent.organisation_tokens),
          phrase_tokens:normalizeArray(intent.phrase_tokens)
        }

        return fileOutput
      }
    )


    return validatedOutput

  }catch(error){
    throw error;
  }
}
