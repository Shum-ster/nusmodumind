export type PopularChoiceDegree = {
  id: string;
  title: string;
};

export type PopularChoiceFaculty = {
  id: string;
  title: string;
  previousIds?: string[];
  previousTitles?: string[];
  degrees: PopularChoiceDegree[];
};

export type PopularChoicePlan = {
  id: string;
  facultyId: string;
  degreeId: string;
  title: string;
  likes: number;
  views: number;
  createdAt: string;
  coverImageUrl?: string;
  coverPalette: [string, string];
};

export type RankedDegreePlanGroups = {
  mostPopular: PopularChoicePlan[];
  highestRated: PopularChoicePlan[];
  upAndComing: PopularChoicePlan[];
};

const planTitlePrefixes = [
  'Balanced',
  'Honours Track',
  'Internship Ready',
  'Exchange Friendly',
  'Research Focused',
  'Portfolio Builder',
  'Double Specialisation',
  'Flexible Core',
  'Graduate Prep',
  'Industry Sprint',
  'Capstone First',
  'Minor Friendly',
  'Workload Smooth',
  'Year Two Pivot',
  'Final Year Focus',
  'Accelerated',
  'Breadth Builder',
  'Project Heavy',
  'Starter',
  'Advanced',
  'Low Clash',
  'Summer Ready',
  'Peer Tested',
  'Fresh Upload',
];

const recentPlanAgesInDays = [
  8, 21, 37, 54, 76, 103, 128, 156, 184, 221, 268, 319,
  388, 430, 492, 540, 610, 690, 760, 830, 910, 990, 1070, 1160,
];

const rankingReferenceTime = Date.parse('2026-07-12T00:00:00.000Z');

const coverPalettes: Array<[string, string]> = [
  ['#f97316', '#2563eb'],
  ['#16a34a', '#0f766e'],
  ['#dc2626', '#7c3aed'],
  ['#0891b2', '#f59e0b'],
  ['#4f46e5', '#db2777'],
  ['#65a30d', '#0284c7'],
];

export const popularChoiceFaculties: PopularChoiceFaculty[] = [
  {
    id: 'computing',
    title: 'School of Computing',
    previousTitles: ['Computing'],
    degrees: [
      { id: 'business-analytics', title: 'Business Analytics' },
      { id: 'artificial-intelligence-systems', title: 'Artificial Intelligence Systems' },
      { id: 'computer-engineering', title: 'Computer Engineering' },
      { id: 'computer-science', title: 'Computer Science' },
      { id: 'information-security', title: 'Information Security' },
    ],
  },
  {
    id: 'business',
    title: 'School of Business',
    previousTitles: ['Business'],
    degrees: [
      { id: 'business-administration', title: 'Business Administration' },
    ],
  },
  {
    id: 'design-and-engineering',
    title: 'College of Design and Engineering',
    previousTitles: ['Design and Engineering'],
    degrees: [
      { id: 'engineering', title: 'Engineering' },
      { id: 'industrial-design', title: 'Industrial Design' },
      { id: 'landscape-architecture', title: 'Landscape Architecture' },
    ],
  },
  {
    id: 'humanities-and-sciences',
    title: 'College of Humanities and Sciences',
    previousIds: ['pharmacy'],
    previousTitles: [
      'Humanities and Sciences',
      'Pharmacy',
      'Faculty of Science - Pharmacy and Pharmaceutical Sciences',
    ],
    degrees: [
      { id: 'data-science-and-economics', title: 'Data Science and Economics' },
      { id: 'environmental-studies', title: 'Environmental Studies' },
      { id: 'food-science-and-technology', title: 'Food Science and Technology' },
      { id: 'humanities-and-sciences', title: 'Humanities and Sciences' },
      { id: 'pharmaceutical-science', title: 'Pharmaceutical Science' },
      { id: 'pharmacy', title: 'Pharmacy' },
      { id: 'ppe', title: 'Philosophy, Politics and Economics' },
    ],
  },
  {
    id: 'medicine',
    title: 'Yong Loo Lin School of Medicine',
    previousIds: ['nursing'],
    previousTitles: [
      'Medicine',
      'Nursing',
      'Yong Loo Lin School of Medicine - Nursing',
    ],
    degrees: [
      { id: 'medicine', title: 'Medicine' },
      { id: 'nursing', title: 'Nursing' },
    ],
  },
  {
    id: 'music',
    title: 'Yong Siew Toh Conservatory of Music',
    previousTitles: ['Music'],
    degrees: [
      { id: 'music', title: 'Music' },
    ],
  },
  {
    id: 'law',
    title: 'Faculty of Law',
    previousTitles: ['Law'],
    degrees: [
      { id: 'law', title: 'Law' },
    ],
  },
  {
    id: 'nus-college',
    title: 'NUS College',
    degrees: [
      { id: 'nus-college', title: 'NUS College' },
    ],
  },
  {
    id: 'dentistry',
    title: 'Faculty of Dentistry',
    previousTitles: ['Dentistry'],
    degrees: [
      { id: 'dentistry', title: 'Dentistry' },
    ],
  },
];

export function getPopularChoiceFaculty(facultyId: string) {
  return popularChoiceFaculties.find(
    (faculty) =>
      faculty.id === facultyId || faculty.previousIds?.includes(facultyId),
  );
}

export function getPopularChoiceDegree(facultyId: string, degreeId: string) {
  return getPopularChoiceFaculty(facultyId)?.degrees.find((degree) => degree.id === degreeId);
}

export function getRankedDegreePlanGroups(
  faculty: PopularChoiceFaculty,
  degree: PopularChoiceDegree,
): RankedDegreePlanGroups {
  const plans = buildPlansForDegree(faculty, degree);
  const oneYearAgo = rankingReferenceTime - 365 * 24 * 60 * 60 * 1000;

  return {
    mostPopular: [...plans].sort((left, right) => right.views - left.views),
    highestRated: [...plans].sort((left, right) => right.likes - left.likes),
    upAndComing: [...plans]
      .filter((plan) => new Date(plan.createdAt).getTime() >= oneYearAgo)
      .sort((left, right) => right.views - left.views),
  };
}

function buildPlansForDegree(
  faculty: PopularChoiceFaculty,
  degree: PopularChoiceDegree,
): PopularChoicePlan[] {
  const degreeWeight = degree.id.length + faculty.id.length;

  return planTitlePrefixes.map((prefix, index) => {
    const views = 1800 + ((degreeWeight * 463 + index * 791) % 42000);
    const likes = 32 + ((degreeWeight * 97 + index * 137) % 2600);

    return {
      id: `${faculty.id}-${degree.id}-${index + 1}`,
      facultyId: faculty.id,
      degreeId: degree.id,
      title: `${prefix} ${degree.title} Plan`,
      likes,
      views,
      createdAt: toIsoDate(recentPlanAgesInDays[index] ?? 120),
      coverPalette: coverPalettes[index % coverPalettes.length],
    };
  });
}

function toIsoDate(daysAgo: number) {
  return new Date(rankingReferenceTime - daysAgo * 24 * 60 * 60 * 1000).toISOString();
}
