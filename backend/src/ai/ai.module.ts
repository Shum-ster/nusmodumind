import { Module } from '@nestjs/common';
import { OpenAiClientProvider } from './openai-client.provider';
import { OpenAiGateway } from './openai.gateway';

@Module({
  providers: [OpenAiClientProvider, OpenAiGateway],
  exports: [OpenAiGateway],
})
export class AiModule {}
