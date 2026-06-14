export type MarketplaceDegree = {
  id: string;
  title: string;
  imageURL: string;
};

export type MarketplaceFaculty = {
  id: string;
  title: string;
  imageURL: string;
  degrees: MarketplaceDegree[];
};

export const marketplaceFaculties: MarketplaceFaculty[] = [
  {
    id: 'computing',
    title: 'Computing',
    imageURL: '/assets/images/faculty/computing.png',
    degrees: [
      { id: 'business-analytics', title: 'Business Analytics', imageURL: '/assets/images/degrees/computing/business-analytics.png' },
      { id: 'artificial-intelligence-systems', title: 'Artificial Intelligence Systems', imageURL: '/assets/images/degrees/computing/artificial-intelligence-systems.png' },
      { id: 'computer-engineering', title: 'Computer Engineering', imageURL: '/assets/images/degrees/computing/computer-engineering.png' },
      { id: 'computer-science', title: 'Computer Science', imageURL: '/assets/images/degrees/computing/computer-science.png' },
      { id: 'information-security', title: 'Information Security', imageURL: '/assets/images/degrees/computing/information-security.png' },
    ],
  },
  {
    id: 'business',
    title: 'Business',
    imageURL: '/assets/images/faculty/business.png',
    degrees: [
      { id: 'business-administration', title: 'Business Administration', imageURL: '/assets/images/degrees/business/business-administration.png' },
    ],
  },
  {
    id: 'design-and-engineering',
    title: 'Design and Engineering',
    imageURL: '/assets/images/faculty/designandengineering.png',
    degrees: [
      { id: 'engineering', title: 'Engineering', imageURL: '/assets/images/degrees/design-and-engineering/engineering.png' },
      { id: 'industrial-design', title: 'Industrial Design', imageURL: '/assets/images/degrees/design-and-engineering/industrial-design.png' },
      { id: 'landscape-architecture', title: 'Landscape Architecture', imageURL: '/assets/images/degrees/design-and-engineering/landscape-architecture.png' },
    ],
  },
  {
    id: 'humanities-and-sciences',
    title: 'Humanities and Sciences',
    imageURL: '/assets/images/faculty/humanitiesandsciences.png',
    degrees: [
      { id: 'data-science-and-economics', title: 'Data Science and Economics', imageURL: '/assets/images/degrees/humanities-and-sciences/data-science-and-economics.png' },
      { id: 'environmental-studies', title: 'Environmental Studies', imageURL: '/assets/images/degrees/humanities-and-sciences/environmental-studies.png' },
      { id: 'food-science-and-technology', title: 'Food Science and Technology', imageURL: '/assets/images/degrees/humanities-and-sciences/food-science-and-technology.png' },
      { id: 'humanities-and-sciences', title: 'Humanities and Sciences', imageURL: '/assets/images/degrees/humanities-and-sciences/humanities-and-sciences.png' },
    ],
  },
  {
    id: 'medicine',
    title: 'Medicine',
    imageURL: '/assets/images/faculty/medicine.png',
    degrees: [
      { id: 'medicine', title: 'Medicine', imageURL: '/assets/images/degrees/medicine/medicine.png' },
    ],
  },
  {
    id: 'music',
    title: 'Music',
    imageURL: '/assets/images/faculty/music.png',
    degrees: [
      { id: 'music', title: 'Music', imageURL: '/assets/images/degrees/music/music.png' },
    ],
  },
  {
    id: 'law',
    title: 'Law',
    imageURL: '/assets/images/faculty/law.png',
    degrees: [
      { id: 'law', title: 'Law', imageURL: '/assets/images/degrees/law/law.png' },
    ],
  },
  {
    id: 'nursing',
    title: 'Nursing',
    imageURL: '/assets/images/faculty/nursing.png',
    degrees: [
      { id: 'nursing', title: 'Nursing', imageURL: '/assets/images/degrees/nursing/nursing.png' },
    ],
  },
  {
    id: 'nus-college',
    title: 'NUS College',
    imageURL: '/assets/images/faculty/nuscollege.png',
    degrees: [
      { id: 'nus-college', title: 'NUS College', imageURL: '/assets/images/degrees/nus-college/nus-college.png' },
    ],
  },
  {
    id: 'pharmacy',
    title: 'Pharmacy',
    imageURL: '/assets/images/faculty/pharmacy.png',
    degrees: [
      { id: 'pharmaceutical-science', title: 'Pharmaceutical Science', imageURL: '/assets/images/degrees/pharmacy/pharmaceutical-science.png' },
      { id: 'pharmacy', title: 'Pharmacy', imageURL: '/assets/images/degrees/pharmacy/pharmacy.png' },
      { id: 'ppe', title: 'Philosophy, Politics and Economics', imageURL: '/assets/images/degrees/pharmacy/philosophy-politics-and-economics-ppe.jpeg' },
    ],
  },
  {
    id: 'dentistry',
    title: 'Dentistry',
    imageURL: '/assets/images/faculty/dentistry.png',
    degrees: [
      { id: 'dentistry', title: 'Dentistry', imageURL: '/assets/images/degrees/dentistry/dentistry.png' },
    ],
  },
];

export function getMarketplaceFaculty(facultyId: string) {
  return marketplaceFaculties.find((faculty) => faculty.id === facultyId);
}
