import type { ModuleUpdateNotificationPayload } from './module-change.types';
import { buildModuleUpdateEmail } from './module-update-email.template';

describe('buildModuleUpdateEmail', () => {
  it('keeps large timetable updates concise', () => {
    const payload: ModuleUpdateNotificationPayload = {
      moduleTitle: 'Programming Methodology II',
      changes: Array.from({ length: 10 }, (_, index) => ({
        category: 'schedule',
        summary: `Tutorial ${index + 1} changed venue.`,
      })),
    };

    const email = buildModuleUpdateEmail({
      acadYear: '2026/2027',
      moduleCode: 'CS2030S',
      payload,
      recipientName: 'Student',
      semesterNumber: 1,
    });

    expect(email.text).toContain('Tutorial 8 changed venue.');
    expect(email.text).not.toContain('Tutorial 9 changed venue.');
    expect(email.text).toContain('And 2 more changes.');
    expect(email.html).toContain('<li>And 2 more changes.</li>');
  });
});
