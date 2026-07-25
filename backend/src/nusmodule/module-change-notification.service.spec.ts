import {
  ModuleUpdateNotificationStatus,
  PlannedModuleStatus,
} from '@prisma/client';
import { ResendEmailService } from '../email/resend-email.service';
import { PrismaService } from '../prisma/prisma.service';
import { ModuleChangeNotificationService } from './module-change-notification.service';
import type { DetectedModuleChanges } from './module-change.types';
import { buildModuleUpdateEmail } from './module-update-email.template';

describe('ModuleChangeNotificationService', () => {
  let service: ModuleChangeNotificationService;
  let prisma: {
    plannedModule: { findMany: jest.Mock };
    moduleUpdateNotification: {
      findMany: jest.Mock;
      update: jest.Mock;
    };
  };
  let emailService: {
    isConfigured: jest.Mock;
    send: jest.Mock;
  };

  const detectedChanges: DetectedModuleChanges[] = [
    {
      moduleCode: 'CS2030S',
      moduleTitle: 'Programming Methodology II',
      globalChanges: [
        {
          category: 'requirements',
          summary: 'Prerequisites changed.',
        },
      ],
      semesterChanges: {
        1: [
          {
            category: 'schedule',
            summary: 'Lecture 1 moved to Tuesday.',
          },
        ],
      },
    },
  ];

  beforeEach(() => {
    prisma = {
      plannedModule: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      moduleUpdateNotification: {
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    emailService = {
      isConfigured: jest.fn().mockReturnValue(true),
      send: jest.fn().mockResolvedValue('email-id'),
    };
    service = new ModuleChangeNotificationService(
      prisma as unknown as PrismaService,
      emailService as unknown as ResendEmailService,
    );
  });

  it('builds deduplicated drafts only for matching planned semesters', async () => {
    prisma.plannedModule.findMany.mockResolvedValue([
      {
        userId: 'user-1',
        moduleCode: 'CS2030S',
        semester: { semesterNumber: 1 },
      },
      {
        userId: 'user-1',
        moduleCode: 'CS2030S',
        semester: { semesterNumber: 1 },
      },
      {
        userId: 'user-2',
        moduleCode: 'CS2030S',
        semester: { semesterNumber: 2 },
      },
    ]);

    const drafts = await service.buildDrafts(
      detectedChanges,
      '2026/2027',
      '2026-07-25',
    );

    expect(prisma.plannedModule.findMany).toHaveBeenCalledWith({
      where: {
        status: PlannedModuleStatus.PLANNED,
        moduleCode: { in: ['CS2030S'] },
        semester: {
          is: {
            acadYear: '2026/2027',
          },
        },
      },
      select: {
        userId: true,
        moduleCode: true,
        semester: {
          select: {
            semesterNumber: true,
          },
        },
      },
    });
    expect(drafts).toHaveLength(2);
    expect(drafts[0]).toMatchObject({
      userId: 'user-1',
      moduleCode: 'CS2030S',
      acadYear: '2026/2027',
      semesterNumber: 1,
      changes: {
        moduleTitle: 'Programming Methodology II',
        changes: [
          {
            category: 'requirements',
            summary: 'Prerequisites changed.',
          },
          {
            category: 'schedule',
            summary: 'Lecture 1 moved to Tuesday.',
          },
        ],
      },
    });
    expect(drafts[0]?.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(drafts[1]).toMatchObject({
      userId: 'user-2',
      semesterNumber: 2,
      changes: {
        moduleTitle: 'Programming Methodology II',
        changes: [
          {
            category: 'requirements',
            summary: 'Prerequisites changed.',
          },
        ],
      },
    });
  });

  it('does not query plans when a batch has no changes', async () => {
    await expect(
      service.buildDrafts([], '2026/2027', '2026-07-25'),
    ).resolves.toEqual([]);
    expect(prisma.plannedModule.findMany).not.toHaveBeenCalled();
  });

  it('leaves queued notifications untouched when Resend is not configured', async () => {
    emailService.isConfigured.mockReturnValue(false);

    await service.dispatchPending();

    expect(prisma.moduleUpdateNotification.findMany).not.toHaveBeenCalled();
    expect(emailService.send).not.toHaveBeenCalled();
  });

  it('sends a short idempotent email and marks the notification sent', async () => {
    const sentAt = new Date('2026-07-25T12:00:00.000Z');
    jest.useFakeTimers().setSystemTime(sentAt);
    const notification = buildPendingNotification();
    prisma.moduleUpdateNotification.findMany.mockResolvedValue([notification]);
    const email = buildModuleUpdateEmail({
      acadYear: notification.acadYear,
      moduleCode: notification.moduleCode,
      payload: notification.changes,
      recipientName: notification.user.username,
      semesterNumber: notification.semesterNumber,
    });

    try {
      await service.dispatchPending();

      expect(emailService.send).toHaveBeenCalledWith({
        to: 'student@example.com',
        ...email,
        idempotencyKey: `module-update/${notification.id}`,
      });
      expect(prisma.moduleUpdateNotification.update).toHaveBeenCalledWith({
        where: { id: notification.id },
        data: {
          status: ModuleUpdateNotificationStatus.SENT,
          attempts: { increment: 1 },
          lastError: null,
          sentAt,
        },
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it('records delivery failures for a later retry without throwing', async () => {
    const notification = buildPendingNotification();
    prisma.moduleUpdateNotification.findMany.mockResolvedValue([notification]);
    emailService.send.mockRejectedValue(new Error('Resend unavailable'));

    await expect(service.dispatchPending()).resolves.toBeUndefined();

    expect(prisma.moduleUpdateNotification.update).toHaveBeenCalledWith({
      where: { id: notification.id },
      data: {
        status: ModuleUpdateNotificationStatus.FAILED,
        attempts: { increment: 1 },
        lastError: 'Resend unavailable',
      },
    });
  });
});

function buildPendingNotification() {
  return {
    id: 'notification-id',
    userId: 'user-id',
    moduleCode: 'CS2030S',
    acadYear: '2026/2027',
    semesterNumber: 1,
    changes: {
      moduleTitle: 'Programming Methodology II',
      changes: [
        {
          category: 'schedule',
          summary: 'Lecture 1 moved to Tuesday.',
        },
      ],
    },
    fingerprint: 'fingerprint',
    status: ModuleUpdateNotificationStatus.PENDING,
    attempts: 0,
    lastError: null,
    sentAt: null,
    createdAt: new Date('2026-07-25T00:00:00.000Z'),
    updatedAt: new Date('2026-07-25T00:00:00.000Z'),
    user: {
      email: 'student@example.com',
      username: 'Student',
    },
  };
}
