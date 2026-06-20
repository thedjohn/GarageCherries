export interface Car {
  id: string;
  slug: string;
  title: string;
  year: number;
  make: string;
  model: string;
  price: number;
  mileage: number;
  location: string;
  state: string;
  condition: 'Excellent' | 'Good' | 'Fair' | 'Project';
  bodyStyle: string;
  transmission: 'Automatic' | 'Manual';
  engine: string;
  color: string;
  images: string[];
  description: string;
  sellerId: string;
  sellerName: string;
  sellerPhone: string;
  featured: boolean;
  listedAt: string;
  lotNumber?: string;
  // Rich detail fields
  headline?: string;
  hobbySegment?: string;
  doors?: number;
  interiorColor?: string;
  seatMaterial?: string;
  seatingType?: string;
  rearWheelSpec?: string;
  options?: string[];
  descriptionParagraphs?: string[];
}

export interface Dealer {
  id: string;
  slug: string;
  name: string;
  phone: string;
  email: string;
  location: string;
  state: string;
  description: string;
  specialties: string[];
  since: number;
  logo?: string;
  website?: string;
}

export interface SearchFilters {
  make?: string;
  model?: string;
  yearMin?: number;
  yearMax?: number;
  priceMin?: number;
  priceMax?: number;
  condition?: string;
  bodyStyle?: string;
  transmission?: string;
  state?: string;
  query?: string;
}

export const MAKES = [
  'All Makes','Chevrolet','Ford','Dodge','Pontiac','Buick','Oldsmobile',
  'Cadillac','Lincoln','Mercury','Chrysler','Plymouth','AMC','Studebaker',
  'Packard','Hudson','Nash','DeSoto','Willys','Kaiser','Tucker',
];

export const BODY_STYLES = [
  'All Styles','Coupe','Convertible','Sedan','Hardtop','Station Wagon',
  'Pickup Truck','Roadster','Fastback','2-Door','4-Door',
];

export const CONDITIONS = ['All','Excellent','Good','Fair','Project'];

export const STATES = [
  'All States','AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI',
  'MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND',
  'OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA',
  'WA','WV','WI','WY',
];
