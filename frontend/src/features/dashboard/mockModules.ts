export type MockNusModule = {
  code: string;
  title: string;
  faculty: string;
  credits: number;
  estimatedWorkload: number;
};

// Temporary searchable module database. Delete this file when real backend module data is wired in.
export const searchableMockNusModules: MockNusModule[] = [
  { code: 'CS1010A', title: 'Programming Methodology', faculty: 'Computing', credits: 4, estimatedWorkload: 0 },
  { code: 'CS1231S', title: 'Discrete Structures', faculty: 'Computing', credits: 4, estimatedWorkload: 0 },
  { code: 'CS2030', title: 'Programming Methodology II', faculty: 'Computing', credits: 4, estimatedWorkload: 0 },
  { code: 'CS2040S', title: 'Data Structures and Algorithms', faculty: 'Computing', credits: 4, estimatedWorkload: 0 },
  { code: 'CS2100', title: 'Computer Organisation', faculty: 'Computing', credits: 4, estimatedWorkload: 0 },
  { code: 'CS2103T', title: 'Software Engineering', faculty: 'Computing', credits: 4, estimatedWorkload: 0 },
  { code: 'CS2105', title: 'Introduction to Computer Networks', faculty: 'Computing', credits: 4, estimatedWorkload: 0 },
  { code: 'CS2106', title: 'Introduction to Operating Systems', faculty: 'Computing', credits: 4, estimatedWorkload: 0 },
  { code: 'CS3230', title: 'Design and Analysis of Algorithms', faculty: 'Computing', credits: 4, estimatedWorkload: 0 },
  { code: 'CS3243', title: 'Introduction to Artificial Intelligence', faculty: 'Computing', credits: 4, estimatedWorkload: 0 },
  { code: 'MA1521', title: 'Calculus for Computing', faculty: 'Science', credits: 4, estimatedWorkload: 0 },
  { code: 'MA2001', title: 'Linear Algebra I', faculty: 'Science', credits: 4, estimatedWorkload: 0 },
  { code: 'ST2334', title: 'Probability and Statistics', faculty: 'Science', credits: 4, estimatedWorkload: 0 },
  { code: 'IS1108', title: 'Digital Ethics and Data Privacy', faculty: 'Computing', credits: 4, estimatedWorkload: 0 },
  { code: 'BT1101', title: 'Introduction to Business Analytics', faculty: 'Computing', credits: 4, estimatedWorkload: 0 },
  { code: 'GER1000', title: 'Quantitative Reasoning', faculty: 'General Education', credits: 4, estimatedWorkload: 0 },
  { code: 'GEA1000', title: 'Quantitative Reasoning With Data', faculty: 'General Education', credits: 4, estimatedWorkload: 0 },
  { code: 'CFG1002', title: 'Career Catalyst', faculty: 'Career Services', credits: 2, estimatedWorkload: 0 },
  { code: 'ES2660', title: 'Communicating in the Information Age', faculty: 'Arts and Social Sciences', credits: 4, estimatedWorkload: 0 },
  { code: 'CP2106', title: 'Independent Software Development Project', faculty: 'Computing', credits: 4, estimatedWorkload: 0 },
];

export function searchMockNusModules(query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return [];
  }

  return searchableMockNusModules
    .filter((module) => {
      const searchableText = `${module.code} ${module.title} ${module.faculty}`.toLowerCase();
      return searchableText.includes(normalizedQuery);
    })
    .slice(0, 8);
}
