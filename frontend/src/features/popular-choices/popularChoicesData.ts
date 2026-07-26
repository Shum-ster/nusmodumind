export type PopularChoiceDegree = {
  id: string;
  title: string;
  previousTitles?: string[];
};

export type PopularChoiceFaculty = {
  id: string;
  title: string;
  previousIds?: string[];
  previousTitles?: string[];
  degrees: PopularChoiceDegree[];
};

export const popularChoiceFaculties: PopularChoiceFaculty[] = [
  {
    id: 'business',
    title: 'NUS Business School',
    previousTitles: ['Business', 'School of Business'],
    degrees: [
      { id: 'accountancy', title: 'Accountancy' },
      { id: 'applied-business-analytics', title: 'Applied Business Analytics' },
      { id: 'business-administration', title: 'Business Administration' },
      { id: 'business-economics', title: 'Business Economics' },
      { id: 'finance', title: 'Finance' },
      {
        id: 'innovation-and-entrepreneurship',
        title: 'Innovation and Entrepreneurship',
      },
      {
        id: 'leadership-and-human-capital-management',
        title: 'Leadership and Human Capital Management',
      },
      { id: 'marketing', title: 'Marketing' },
      {
        id: 'operations-and-supply-chain-management',
        title: 'Operations and Supply Chain Management',
      },
      { id: 'real-estate', title: 'Real Estate' },
    ],
  },
  {
    id: 'computing',
    title: 'School of Computing',
    previousTitles: ['Computing'],
    degrees: [
      { id: 'business-analytics', title: 'Business Analytics' },
      { id: 'artificial-intelligence', title: 'Artificial Intelligence' },
      { id: 'computer-engineering', title: 'Computer Engineering' },
      { id: 'computer-science', title: 'Computer Science' },
      { id: 'information-security', title: 'Information Security' },
      {
        id: 'business-artificial-intelligence-systems',
        title: 'Business Artificial Intelligence Systems',
        previousTitles: [
          'Artificial Intelligence Systems',
          "Business Artificial Intelligence Systems (formerly known as 'Information Systems')",
          'Information Systems',
        ],
      },
    ],
  },
  {
    id: 'dentistry',
    title: 'Faculty of Dentistry',
    previousTitles: ['Dentistry'],
    degrees: [{ id: 'dentistry', title: 'Dentistry' }],
  },
  {
    id: 'design-and-engineering',
    title: 'College of Design and Engineering',
    previousTitles: ['Design and Engineering'],
    degrees: [
      { id: 'architecture', title: 'Architecture' },
      { id: 'biomedical-engineering', title: 'Biomedical Engineering' },
      { id: 'chemical-engineering', title: 'Chemical Engineering' },
      { id: 'civil-engineering', title: 'Civil Engineering' },
      { id: 'computer-engineering', title: 'Computer Engineering' },
      { id: 'electrical-engineering', title: 'Electrical Engineering' },
      { id: 'engineering', title: 'Engineering' },
      { id: 'engineering-science', title: 'Engineering Science' },
      {
        id: 'environmental-and-sustainability-engineering',
        title: 'Environmental and Sustainability Engineering',
      },
      { id: 'industrial-design', title: 'Industrial Design' },
      {
        id: 'industrial-and-systems-engineering',
        title: 'Industrial and Systems Engineering',
      },
      {
        id: 'infrastructure-and-project-management',
        title: 'Infrastructure and Project Management',
      },
      { id: 'landscape-architecture', title: 'Landscape Architecture' },
      {
        id: 'materials-science-and-engineering',
        title: 'Materials Science and Engineering',
      },
      { id: 'mechanical-engineering', title: 'Mechanical Engineering' },
      {
        id: 'robotics-and-machine-intelligence',
        title: 'Robotics and Machine Intelligence',
      },
    ],
  },
  {
    id: 'arts-and-social-sciences',
    title: 'Faculty of Arts and Social Sciences',
    previousIds: ['humanities-and-sciences'],
    previousTitles: [
      'Humanities and Sciences',
      'College of Humanities and Sciences',
    ],
    degrees: [
      { id: 'anthropology', title: 'Anthropology' },
      {
        id: 'chinese-languages-and-cultures',
        title: 'Chinese Languages and Cultures',
      },
      {
        id: 'chinese-studies-bilingual',
        title: 'Chinese Studies (Bilingual)',
      },
      {
        id: 'communications-and-new-media',
        title: 'Communications and New Media',
      },
      { id: 'economics', title: 'Economics' },
      {
        id: 'english-language-and-linguistics',
        title: 'English Language and Linguistics',
      },
      { id: 'english-literature', title: 'English Literature' },
      { id: 'geography', title: 'Geography' },
      { id: 'geospatial-intelligence', title: 'Geospatial Intelligence' },
      { id: 'global-studies', title: 'Global Studies' },
      { id: 'history', title: 'History' },
      { id: 'japanese-studies', title: 'Japanese Studies' },
      { id: 'malay-studies', title: 'Malay Studies' },
      { id: 'philosophy', title: 'Philosophy' },
      { id: 'political-science', title: 'Political Science' },
      {
        id: 'ppe',
        title: 'Philosophy, Politics and Economics (PPE)',
        previousTitles: ['Philosophy, Politics and Economics'],
      },
      { id: 'psychology', title: 'Psychology' },
      { id: 'social-work', title: 'Social Work' },
      { id: 'sociology', title: 'Sociology' },
      { id: 'south-asian-studies', title: 'South Asian Studies' },
      {
        id: 'southeast-asian-studies',
        title: 'Southeast Asian Studies',
      },
      {
        id: 'theatre-and-performance-studies',
        title: 'Theatre and Performance Studies',
      },
    ],
  },
  {
    id: 'science',
    title: 'Faculty of Science',
    previousIds: ['humanities-and-sciences', 'pharmacy'],
    previousTitles: [
      'Humanities and Sciences',
      'College of Humanities and Sciences',
      'Pharmacy',
      'Faculty of Pharmacy and Pharmaceutical Sciences',
      'Faculty of Science - Pharmacy and Pharmaceutical Sciences',
    ],
    degrees: [
      { id: 'chemistry', title: 'Chemistry' },
      {
        id: 'data-science-and-analytics',
        title: 'Data Science and Analytics',
      },
      {
        id: 'data-science-and-applied-ai',
        title: 'Data Science and Applied AI',
      },
      {
        id: 'data-science-and-economics',
        title: 'Data Science & Economics',
        previousTitles: ['Data Science and Economics'],
      },
      { id: 'environmental-studies', title: 'Environmental Studies' },
      {
        id: 'food-science-and-technology',
        title: 'Food Science & Technology',
        previousTitles: ['Food Science and Technology'],
      },
      { id: 'life-sciences', title: 'Life Sciences' },
      { id: 'mathematics', title: 'Mathematics' },
      { id: 'pharmaceutical-science', title: 'Pharmaceutical Science' },
      { id: 'pharmacy', title: 'Pharmacy' },
      { id: 'physics', title: 'Physics' },
      { id: 'quantitative-finance', title: 'Quantitative Finance' },
      { id: 'statistics', title: 'Statistics' },
    ],
  },
  {
    id: 'law',
    title: 'Faculty of Law',
    previousTitles: ['Law'],
    degrees: [{ id: 'law', title: 'Law' }],
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
    degrees: [{ id: 'music', title: 'Music' }],
  },
  {
    id: 'nus-college',
    title: 'NUS College',
    degrees: [{ id: 'nus-college', title: 'NUS College' }],
  },
];

export function getPopularChoiceFaculty(facultyId: string) {
  return popularChoiceFaculties.find(
    (faculty) =>
      faculty.id === facultyId || faculty.previousIds?.includes(facultyId),
  );
}

export function getPopularChoiceDegree(facultyId: string, degreeId: string) {
  return getPopularChoiceSelection(facultyId, degreeId)?.degree;
}

export function getPopularChoiceSelection(
  facultyValue: string,
  degreeValue: string,
) {
  const matchingFaculties = popularChoiceFaculties.filter((faculty) =>
    matchesFaculty(faculty, facultyValue),
  );

  for (const faculty of matchingFaculties) {
    const degree = faculty.degrees.find((candidate) =>
      matchesDegree(candidate, degreeValue),
    );

    if (degree) {
      return { degree, faculty };
    }
  }

  return undefined;
}

export function getPopularChoiceFacultyForProfile(
  facultyValue: string | null,
  degreeValue: string | null,
) {
  if (!facultyValue) {
    return undefined;
  }

  if (degreeValue) {
    const selection = getPopularChoiceSelection(facultyValue, degreeValue);

    if (selection) {
      return selection.faculty;
    }
  }

  return popularChoiceFaculties.find((faculty) =>
    matchesFaculty(faculty, facultyValue),
  );
}

export function getPopularChoiceFacultyFilterValues(
  faculty: PopularChoiceFaculty,
) {
  return uniqueFilterValues([faculty.title, ...(faculty.previousTitles ?? [])]);
}

export function getPopularChoiceDegreeFilterValues(
  degree: PopularChoiceDegree,
) {
  return uniqueFilterValues([degree.title, ...(degree.previousTitles ?? [])]);
}

function matchesFaculty(faculty: PopularChoiceFaculty, value: string) {
  return (
    faculty.id === value ||
    faculty.title === value ||
    faculty.previousIds?.includes(value) ||
    faculty.previousTitles?.includes(value)
  );
}

function matchesDegree(degree: PopularChoiceDegree, value: string) {
  return (
    degree.id === value ||
    degree.title === value ||
    degree.previousTitles?.includes(value)
  );
}

function uniqueFilterValues(values: string[]) {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    ),
  );
}
