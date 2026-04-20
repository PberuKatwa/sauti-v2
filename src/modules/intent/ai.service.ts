import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import OpenAI from 'openai';
import { BestIntent } from '../../types/intent.types';
import { BestIntentSchema } from '../../validators/bestIntent.schema';
import { AppLogger } from '../../logger/winston.logger';
import { AiModels } from '../../types/ai.types';

@Injectable()
export class AiService {
  private readonly client: OpenAI;

  constructor(
    private readonly logger: AppLogger,
    apiKey: string
  ) {
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
    });
  }

  async basicPrompt(
    prompt: string,
    model: AiModels
  ): Promise<string> {
    const start = Date.now();

    try {
      if (!prompt.trim()) {
        throw new Error('runPrompt: prompt cannot be empty');
      }

      this.logger.warn('LLM_REQUEST', {
        model,
        promptLength: prompt.length,
      });

      const response = await this.client.chat.completions.create({
        model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0,
      });

      const output = response.choices?.[0]?.message?.content;

      if (!output) {
        throw new Error(`No response from model: ${model}`);
      }

      const duration = Date.now() - start;

      this.logger.info('LLM_RESPONSE', {
        model,
        durationMs: duration,
        outputLength: output.length,
      });

      return output;
    } catch (err: any) {
      const duration = Date.now() - start;

      this.logger.error('LLM_ERROR', {
        model,
        durationMs: duration,
        message: err.message,
        code: err.code,
        stack: err.stack,
      });

      throw new InternalServerErrorException(
        `AiService Error (${model}): ${err.message}`
      );
    }
  }

  public async getLlmIntent(
    prompt: string,
    model: AiModels
  ): Promise<BestIntent> {
    try {
      const rawResponse = await this.basicPrompt(prompt, model);

      const cleaned = rawResponse
        .trim()
        .replace(/^```json/i, '')
        .replace(/^```/, '')
        .replace(/```$/, '')
        .trim();

      let parsed;

      try {
        parsed = JSON.parse(cleaned);
      } catch (err) {
        this.logger.warn('LLM_JSON_PARSE_FAIL', {
          model,
          rawResponse: rawResponse.slice(0, 300), // avoid huge logs
        });
        throw new Error('Invalid JSON returned from LLM');
      }

      const result = BestIntentSchema.safeParse(parsed);

      if (!result.success) {
        this.logger.warn('LLM_ZOD_VALIDATION_FAIL', {
          model,
          errors: result.error.format(),
        });

        throw new Error(
          `Zod validation failed: ${JSON.stringify(result.error.format())}`
        );
      }

      this.logger.info('LLM_INTENT_SUCCESS', {
        model,
        intent: result.data.name,
        score: result.data.score,
      });

      return result.data as BestIntent;
    } catch (error: any) {
      this.logger.error('LLM_INTENT_ERROR', {
        model,
        message: error.message,
      });

      throw error;
    }
  }
}
