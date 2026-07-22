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
      {
        id: 'business-administration',
        title: 'Business Administration',
        previousTitles: [
          'Accountancy',
          'Applied Business Analytics',
          'Business Economics',
          'Finance',
          'Innovation and Entrepreneurship',
          'Leadership and Human Capital Management',
          'Marketing',
          'Operations and Supply Chain Management',
          'Real Estate',
        ],
      },
    ],
  },
  {
    id: 'computing',
    title: 'School of Computing',
    previousTitles: ['Computing'],
    degrees: [
      { id: 'business-analytics', title: 'Business Analytics' },
      { id: 'computer-engineering', title: 'Computer Engineering' },
      {
        id: 'common-computer-science-programmes',
        title: 'Common Computer Science Programmes',
        previousTitles: ['Artificial Intelligence', 'Computer Science'],
      },
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
      {
        id: 'engineering',
        title: 'Engineering',
        previousTitles: [
          'Biomedical Engineering',
          'Chemical Engineering',
          'Civil Engineering',
          'Electrical Engineering',
          'Engineering Science',
          'Environmental and Sustainability Engineering',
          'Industrial and Systems Engineering',
          'Infrastructure and Project Management',
          'Materials Science and Engineering',
          'Mechanical Engineering',
          'Robotics and Machine Intelligence',
        ],
      },
      { id: 'industrial-design', title: 'Industrial Design' },
      { id: 'landscape-architecture', title: 'Landscape Architecture' },
      { id: 'computer-engineering', title: 'Computer Engineering' },
    ],
  },
  {
    id: 'humanities-and-sciences',
    title: 'College of Humanities and Sciences',
    previousIds: ['arts-and-social-sciences', 'science'],
    previousTitles: [
      'Humanities and Sciences',
      'Faculty of Arts and Social Sciences',
      'Faculty of Science',
    ],
    degrees: [
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
      {
        id: 'humanities-and-sciences',
        title: 'Humanities & Sciences',
        previousTitles: [
          'Anthropology',
          'Chemistry',
          'Chinese Languages and Cultures',
          'Chinese Studies (Bilingual)',
          'Communications and New Media',
          'Data Science and Analytics',
          'Data Science and Applied AI',
          'Economics',
          'English Language and Linguistics',
          'English Literature',
          'Geography',
          'Geospatial Intelligence',
          'Global Studies',
          'History',
          'Japanese Studies',
          'Life Sciences',
          'Malay Studies',
          'Mathematics',
          'Philosophy',
          'Physics',
          'Political Science',
          'Psychology',
          'Quantitative Finance',
          'Social Work',
          'Sociology',
          'South Asian Studies',
          'Southeast Asian Studies',
          'Statistics',
          'Theatre and Performance Studies',
        ],
      },
      {
        id: 'ppe',
        title: 'Philosophy, Politics and Economics (PPE)',
        previousTitles: ['Philosophy, Politics and Economics'],
      },
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
    previousTitles: ['Medicine'],
    degrees: [{ id: 'medicine', title: 'Medicine' }],
  },
  {
    id: 'music',
    title: 'Yong Siew Toh Conservatory of Music',
    previousTitles: ['Music'],
    degrees: [{ id: 'music', title: 'Music' }],
  },
  {
    id: 'nursing',
    title: 'Nursing',
    previousIds: ['medicine'],
    previousTitles: [
      'Yong Loo Lin School of Medicine',
      'Yong Loo Lin School of Medicine - Nursing',
    ],
    degrees: [{ id: 'nursing', title: 'Nursing' }],
  },
  {
    id: 'pharmacy',
    title: 'Faculty of Pharmacy and Pharmaceutical Sciences',
    previousIds: ['science'],
    previousTitles: [
      'Faculty of Science',
      'Faculty of Science - Pharmacy and Pharmaceutical Sciences',
      'Pharmacy',
    ],
    degrees: [
      { id: 'pharmacy', title: 'Pharmacy' },
      {
        id: 'pharmaceutical-science',
        title: 'Pharmaceutical Science',
      },
    ],
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
