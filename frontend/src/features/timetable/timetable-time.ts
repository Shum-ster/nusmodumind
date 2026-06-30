const singaporeTimeZone = 'Asia/Singapore';

type DateTimeParts = {
  day: string;
  dayPeriod: string;
  hour: string;
  minute: string;
  month: string;
  year: string;
};

const singaporeDateTimeFormatter = new Intl.DateTimeFormat('en-SG', {
  day: 'numeric',
  hour: 'numeric',
  hour12: true,
  minute: '2-digit',
  month: 'short',
  timeZone: singaporeTimeZone,
  year: 'numeric',
});

const isoDateTimeWithZonePattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})$/;

export function formatSingaporeTimetableTime(value: string) {
  const normalizedClockTime = normalizeCompactClockTime(value);

  if (normalizedClockTime) {
    return formatClockTime(normalizedClockTime);
  }

  const singaporeDateTime = formatSingaporeDateTime(value);

  return singaporeDateTime ?? value;
}

function normalizeCompactClockTime(value: string) {
  const normalizedTime = value.trim().padStart(4, '0');

  if (!/^\d{4}$/.test(normalizedTime)) {
    return null;
  }

  const hours = Number(normalizedTime.slice(0, 2));
  const minutes = Number(normalizedTime.slice(2));

  if (hours > 23 || minutes > 59) {
    return null;
  }

  return normalizedTime;
}

function formatClockTime(time: string) {
  const hours = Number(time.slice(0, 2));
  const minutes = time.slice(2);
  const suffix = hours >= 12 ? 'pm' : 'am';
  const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;

  return minutes === '00' ? `${displayHour}${suffix}` : `${displayHour}:${minutes}${suffix}`;
}

function formatSingaporeDateTime(value: string) {
  if (!isoDateTimeWithZonePattern.test(value.trim())) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const parts = getSingaporeDateTimeParts(date);

  if (!parts) {
    return null;
  }

  return `${parts.day} ${parts.month} ${parts.year}, ${parts.hour}:${parts.minute}${parts.dayPeriod}`;
}

function getSingaporeDateTimeParts(date: Date) {
  const parts = singaporeDateTimeFormatter.formatToParts(date).reduce<Partial<DateTimeParts>>(
    (currentParts, part) => {
      if (
        part.type === 'day' ||
        part.type === 'hour' ||
        part.type === 'minute' ||
        part.type === 'month' ||
        part.type === 'year'
      ) {
        currentParts[part.type] = part.value;
      }

      if (part.type === 'dayPeriod') {
        currentParts.dayPeriod = part.value.toLowerCase();
      }

      return currentParts;
    },
    {},
  );

  if (!parts.day || !parts.dayPeriod || !parts.hour || !parts.minute || !parts.month || !parts.year) {
    return null;
  }

  return parts as DateTimeParts;
}
