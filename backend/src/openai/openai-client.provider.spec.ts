import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAiClientProvider } from './openai-client.provider';

describe('OpenAiClientProvider', () => {
  it('fails with a service unavailable error when the API key is missing', () => {
    const configService = {
      get: jest.fn().mockReturnValue(undefined),
    };
    const provider = new OpenAiClientProvider(
      configService as unknown as ConfigService,
    );

    expect(() => provider.getClient()).toThrow(ServiceUnavailableException);
  });

  it('creates and reuses one OpenAI client', () => {
    const configService = {
      get: jest.fn().mockReturnValue('test-api-key'),
    };
    const provider = new OpenAiClientProvider(
      configService as unknown as ConfigService,
    );

    const firstClient = provider.getClient();
    const secondClient = provider.getClient();

    expect(firstClient).toBe(secondClient);
    expect(configService.get).toHaveBeenCalledTimes(1);
  });
});
