import type { ModuleUpdateNotificationPayload } from './module-change.types';

type ModuleUpdateEmailInput = {
  acadYear: string;
  moduleCode: string;
  payload: ModuleUpdateNotificationPayload;
  recipientName: string | null;
  semesterNumber: number;
};

const maxVisibleChanges = 8;

export function buildModuleUpdateEmail(input: ModuleUpdateEmailInput) {
  const greeting = input.recipientName?.trim()
    ? `Hi ${input.recipientName.trim()},`
    : 'Hi,';
  const heading = `${input.moduleCode} update for AY${input.acadYear} Semester ${input.semesterNumber}`;
  const visibleChanges = input.payload.changes.slice(0, maxVisibleChanges);
  const remainingCount = input.payload.changes.length - visibleChanges.length;
  const changeLines = visibleChanges.map((change) => `- ${change.summary}`);
  if (remainingCount > 0) {
    changeLines.push(`- And ${remainingCount} more changes.`);
  }
  const text = [
    greeting,
    '',
    `NUSMods information changed for ${input.moduleCode} ${input.payload.moduleTitle}.`,
    '',
    ...changeLines,
    '',
    'Please review the module in NUSModuMind before finalising your timetable.',
  ].join('\n');
  const htmlChanges = visibleChanges
    .map((change) => `<li>${escapeHtml(change.summary)}</li>`)
    .concat(
      remainingCount > 0
        ? [`<li>And ${remainingCount} more changes.</li>`]
        : [],
    )
    .join('');
  const html = [
    `<p>${escapeHtml(greeting)}</p>`,
    `<p>NUSMods information changed for <strong>${escapeHtml(input.moduleCode)} ${escapeHtml(input.payload.moduleTitle)}</strong>.</p>`,
    `<ul>${htmlChanges}</ul>`,
    '<p>Please review the module in NUSModuMind before finalising your timetable.</p>',
  ].join('');

  return {
    subject: heading,
    text,
    html,
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
