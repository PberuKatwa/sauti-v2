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
      apiKey: apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
    });
  }

  async basicPrompt(
    prompt: string,
    model: AiModels
  ): Promise<string> {
    try {
      if (!prompt.trim()) {
        throw new Error('runPrompt: prompt cannot be empty');
      }

      this.logger.warn(`Using DeepSeek to detect intent`);

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
        throw new Error('No response from DeepSeek');
      }

      return output;
    } catch (err: any) {
      throw new InternalServerErrorException(
        `DeepSeekService Error: ${err.message}`
      );
    }
  }

  public async getLlmIntent(prompt: string, model: AiModels): Promise<BestIntent>{
    try {
      const rawResponse = await this.basicPrompt(prompt, model);

      // 🧼 Clean response (DeepSeek sometimes wraps JSON)
      const cleaned = rawResponse
        .trim()
        .replace(/^```json/i, '')
        .replace(/^```/, '')
        .replace(/```$/, '')
        .trim();

      const parsed = JSON.parse(cleaned);

      const result = BestIntentSchema.safeParse(parsed);

      if (!result.success) {
        throw new Error(
          `Zod validation failed: ${JSON.stringify(result.error.format())}`
        );
      }

      return result.data as BestIntent;
    } catch (error: any) {
      throw error;
    }
  }
}
