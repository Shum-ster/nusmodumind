import { ConfigService } from '@nestjs/config';
import { ResendEmailService } from './resend-email.service';

const mockSend = jest.fn();

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: mockSend,
    },
  })),
}));

describe('ResendEmailService', () => {
  beforeEach(() => {
    mockSend.mockReset();
  });

  it('reports missing configuration without constructing a usable sender', () => {
    const service = new ResendEmailService(buildConfigService({}));

    expect(service.isConfigured()).toBe(false);
  });

  it('sends with the configured sender and idempotency key', async () => {
    mockSend.mockResolvedValue({
      data: { id: 'email-id' },
      error: null,
    });
    const service = new ResendEmailService(
      buildConfigService({
        RESEND_API_KEY: 're_test',
        RESEND_FROM_EMAIL: 'NUSModuMind <notifications@example.com>',
      }),
    );

    await expect(
      service.send({
        to: 'student@example.com',
        subject: 'Module update',
        html: '<p>Changed</p>',
        text: 'Changed',
        idempotencyKey: 'module-update/notification-id',
      }),
    ).resolves.toBe('email-id');
    expect(mockSend).toHaveBeenCalledWith(
      {
        from: 'NUSModuMind <notifications@example.com>',
        to: 'student@example.com',
        subject: 'Module update',
        html: '<p>Changed</p>',
        text: 'Changed',
      },
      {
        idempotencyKey: 'module-update/notification-id',
      },
    );
  });

  it('turns Resend API errors into rejected sends', async () => {
    mockSend.mockResolvedValue({
      data: null,
      error: { message: 'Invalid sender' },
    });
    const service = new ResendEmailService(
      buildConfigService({
        RESEND_API_KEY: 're_test',
        RESEND_FROM_EMAIL: 'NUSModuMind <notifications@example.com>',
      }),
    );

    await expect(
      service.send({
        to: 'student@example.com',
        subject: 'Module update',
        html: '<p>Changed</p>',
        text: 'Changed',
        idempotencyKey: 'module-update/notification-id',
      }),
    ).rejects.toThrow('Resend rejected the email: Invalid sender');
  });
});

function buildConfigService(values: Record<string, string>) {
  return {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}
