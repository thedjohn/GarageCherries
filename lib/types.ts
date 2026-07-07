export interface Car {
  id: string;
  slug: string;
  title: string;
  year: number;
  make: string;
  model: string;
  price: number;
  mileage: number | null;
  location: string;
  state: string;
  condition: string;
  bodyStyle: string;
  transmission: string;
  engine: string | null;
  color: string | null;
  images: string[];
  description: string;
  sellerId: string;
  sellerName: string;
  sellerPhone: string;
  featured: boolean;
  listedAt: string;
  lotNumber?: string;
  vin?: string;
  vinVerified?: boolean;
  vinMake?: string;
  vinModel?: string;
  vinYear?: number;
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
  'All Makes',
  'AMC','Buick','Cadillac','Chevrolet','Chrysler','DeSoto','Dodge','Ford',
  'Hudson','Kaiser','Lincoln','Mercury','Nash','Oldsmobile','Packard',
  'Plymouth','Pontiac','Ram','Studebaker','Tucker','Willys',
];

export const BODY_STYLES = [
  'All Styles',
  '2-Door','4-Door','Convertible','Coupe','Fastback','Hardtop',
  'Pickup Truck','Roadster','Sedan','Station Wagon',
];

// Kept in quality order (best to worst), not alphabetical — "Excellent, Fair,
// Good, Project" would be a worse scan order than "Excellent, Good, Fair, Project".
export const CONDITIONS = ['All','Excellent','Good','Fair','Project'];

export const TRANSMISSIONS = ['Automatic', 'Manual', '1-Speed'];

export const STATES = [
  'All States','AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI',
  'MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND',
  'OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA',
  'WA','WV','WI','WY',
];
