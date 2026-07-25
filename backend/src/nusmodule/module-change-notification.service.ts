import { createHash } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import {
  ModuleUpdateNotificationStatus,
  PlannedModuleStatus,
  Prisma,
} from '@prisma/client';
import { z } from 'zod';
import { ResendEmailService } from '../email/resend-email.service';
import { PrismaService } from '../prisma/prisma.service';
import type {
  DetectedModuleChanges,
  ModuleUpdateNotificationPayload,
} from './module-change.types';
import { buildModuleUpdateEmail } from './module-update-email.template';

const maxDeliveryAttempts = 5;
const deliveryConcurrency = 5;

const moduleChangeSchema = z.object({
  category: z.enum([
    'attributes',
    'availability',
    'exam',
    'module',
    'requirements',
    'schedule',
    'workload',
  ]),
  summary: z.string().min(1),
});

const notificationPayloadSchema = z.object({
  moduleTitle: z.string().min(1),
  changes: z.array(moduleChangeSchema).min(1),
});

type PendingNotification = Prisma.ModuleUpdateNotificationGetPayload<{
  include: {
    user: {
      select: {
        email: true;
        username: true;
      };
    };
  };
}>;

@Injectable()
export class ModuleChangeNotificationService {
  private readonly logger = new Logger(ModuleChangeNotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: ResendEmailService,
  ) {}

  async buildDrafts(
    detectedChanges: DetectedModuleChanges[],
    acadYear: string,
    syncDate: string,
  ): Promise<Prisma.ModuleUpdateNotificationCreateManyInput[]> {
    if (detectedChanges.length === 0) {
      return [];
    }

    const changesByModule = new Map(
      detectedChanges.map((change) => [change.moduleCode, change]),
    );
    const plannedModules = await this.prisma.plannedModule.findMany({
      where: {
        status: PlannedModuleStatus.PLANNED,
        moduleCode: { in: Array.from(changesByModule.keys()) },
        semester: {
          is: {
            acadYear,
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
    const drafts = new Map<
      string,
      Prisma.ModuleUpdateNotificationCreateManyInput
    >();

    plannedModules.forEach((plannedModule) => {
      if (!plannedModule.semester) {
        return;
      }

      const detected = changesByModule.get(plannedModule.moduleCode);
      if (!detected) {
        return;
      }

      const semesterNumber = plannedModule.semester.semesterNumber;
      const changes = deduplicateChanges([
        ...detected.globalChanges,
        ...(detected.semesterChanges[semesterNumber] ?? []),
      ]);

      if (changes.length === 0) {
        return;
      }

      const payload: ModuleUpdateNotificationPayload = {
        moduleTitle: detected.moduleTitle,
        changes,
      };
      const fingerprint = createFingerprint({
        acadYear,
        moduleCode: plannedModule.moduleCode,
        payload,
        semesterNumber,
        syncDate,
      });
      const key = [
        plannedModule.userId,
        plannedModule.moduleCode,
        acadYear,
        semesterNumber,
        fingerprint,
      ].join(':');

      drafts.set(key, {
        userId: plannedModule.userId,
        moduleCode: plannedModule.moduleCode,
        acadYear,
        semesterNumber,
        changes: payload,
        fingerprint,
      });
    });

    return Array.from(drafts.values());
  }

  async dispatchPending() {
    if (!this.emailService.isConfigured()) {
      this.logger.warn(
        'Resend is not configured; queued module update emails will remain pending.',
      );
      return;
    }

    const notifications = await this.prisma.moduleUpdateNotification.findMany({
      where: {
        status: {
          in: [
            ModuleUpdateNotificationStatus.PENDING,
            ModuleUpdateNotificationStatus.FAILED,
          ],
        },
        attempts: {
          lt: maxDeliveryAttempts,
        },
      },
      include: {
        user: {
          select: {
            email: true,
            username: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    for (
      let index = 0;
      index < notifications.length;
      index += deliveryConcurrency
    ) {
      const batch = notifications.slice(index, index + deliveryConcurrency);
      await Promise.all(
        batch.map((notification) => this.deliver(notification)),
      );
    }
  }

  private async deliver(notification: PendingNotification) {
    try {
      const payload = notificationPayloadSchema.parse(notification.changes);
      const email = buildModuleUpdateEmail({
        acadYear: notification.acadYear,
        moduleCode: notification.moduleCode,
        payload,
        recipientName: notification.user.username,
        semesterNumber: notification.semesterNumber,
      });

      await this.emailService.send({
        to: notification.user.email,
        ...email,
        idempotencyKey: `module-update/${notification.id}`,
      });
      await this.prisma.moduleUpdateNotification.update({
        where: { id: notification.id },
        data: {
          status: ModuleUpdateNotificationStatus.SENT,
          attempts: { increment: 1 },
          lastError: null,
          sentAt: new Date(),
        },
      });
    } catch (error) {
      const message = getErrorMessage(error);

      this.logger.error(
        `Failed to deliver module update notification ${notification.id}: ${message}`,
      );
      await this.prisma.moduleUpdateNotification.update({
        where: { id: notification.id },
        data: {
          status: ModuleUpdateNotificationStatus.FAILED,
          attempts: { increment: 1 },
          lastError: message,
        },
      });
    }
  }
}

function deduplicateChanges(
  changes: ModuleUpdateNotificationPayload['changes'],
) {
  const changesBySummary = new Map(
    changes.map((change) => [change.summary, change]),
  );
  return Array.from(changesBySummary.values());
}

function createFingerprint(value: {
  acadYear: string;
  moduleCode: string;
  payload: ModuleUpdateNotificationPayload;
  semesterNumber: number;
  syncDate: string;
}) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function getErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  return message.slice(0, 1_000);
}
