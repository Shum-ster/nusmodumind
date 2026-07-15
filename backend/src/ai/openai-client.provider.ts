import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

const openAiRequestTimeoutMs = 60_000;

@Injectable()
export class OpenAiClientProvider {
  private client: OpenAI | null = null;

  constructor(private readonly configService: ConfigService) {}

  getClient() {
    if (this.client) {
      return this.client;
    }

    const apiKey = this.configService.get<string>('OPENAI_API_KEY')?.trim();

    if (!apiKey) {
      throw new ServiceUnavailableException('The AI Planner is not configured');
    }

    this.client = new OpenAI({
      apiKey,
      maxRetries: 1,
      timeout: openAiRequestTimeoutMs,
    });

    return this.client;
  }
}
