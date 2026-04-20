import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import OpenAI from 'openai';
import { BestIntent } from '../../types/intent.types';
import { BestIntentSchema } from '../../validators/bestIntent.schema';
import { AppLogger } from '../../logger/winston.logger';

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
    model: string = 'deepseek/deepseek-chat'
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

  public async getLlmIntent(prompt: string): Promise<BestIntent> {
    try {
      const rawResponse = await this.basicPrompt(prompt);

      // 🧼 Clean response (DeepSeek sometimes wraps JSON)
      const cleaned = rawResponse
        .trim()
        .replace(/^```json/i, '')
        .replace(/^```/, '')
        .replace(/```$/, '')
        .trim();

      let parsed;

      try {
        parsed = JSON.parse(cleaned);
      } catch {
        // 🔁 Retry once if JSON fails (cheap models need this)
        this.logger.warn('JSON parse failed, retrying once...');
        const retry = await this.basicPrompt(prompt);
        parsed = JSON.parse(
          retry
            .trim()
            .replace(/^```json/i, '')
            .replace(/^```/, '')
            .replace(/```$/, '')
            .trim()
        );
      }

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
