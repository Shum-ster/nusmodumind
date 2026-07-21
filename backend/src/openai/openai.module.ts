import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OpenAiClientProvider } from './openai-client.provider';
import { OpenAiGateway } from './openai.gateway';

@Module({
  imports: [ConfigModule],
  providers: [OpenAiClientProvider, OpenAiGateway],
  exports: [OpenAiGateway],
})
export class OpenAiModule {}
