import { Car, Dealer, MAKES } from './types';

export const CARS: Car[] = [
  {
    id: '1',
    slug: '1967-chevrolet-camaro-ss',
    title: '1967 Chevrolet Camaro SS',
    year: 1967, make: 'Chevrolet', model: 'Camaro',
    price: 89500, mileage: 42100,
    location: 'Nashville', state: 'TN',
    condition: 'Excellent', bodyStyle: 'Coupe',
    transmission: 'Manual', engine: '396 V8',
    color: 'Rally Green',
    images: ['https://images.unsplash.com/photo-1555353540-64580b51c258?w=800&q=80',
             'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&q=80'],
    description: 'Numbers-matching 1967 Camaro SS 396. Frame-off restoration completed in 2021. Correct Muncie 4-speed, original trim tags present. Show quality throughout.',
    sellerId: 'u1', sellerName: 'Classic Iron Nashville', sellerPhone: '(615) 555-0142',
    featured: true, listedAt: '2025-05-10',
  },
  {
    id: '2',
    slug: '1957-ford-thunderbird',
    title: '1957 Ford Thunderbird',
    year: 1957, make: 'Ford', model: 'Thunderbird',
    price: 64900, mileage: 58320,
    location: 'Scottsdale', state: 'AZ',
    condition: 'Excellent', bodyStyle: 'Convertible',
    transmission: 'Automatic', engine: '312 V8',
    color: 'Flame Red',
    images: ['https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&q=80'],
    description: 'Stunning 1957 T-Bird with both hard and soft tops. Arizona car, rust-free body. Recently serviced, drives beautifully.',
    sellerId: 'u2', sellerName: 'Desert Sun Classics', sellerPhone: '(480) 555-0188',
    featured: true, listedAt: '2025-05-12',
  },
  {
    id: '3',
    slug: '1969-dodge-charger-rt',
    title: '1969 Dodge Charger R/T',
    year: 1969, make: 'Dodge', model: 'Charger',
    price: 112000, mileage: 31450,
    location: 'Charlotte', state: 'NC',
    condition: 'Excellent', bodyStyle: 'Hardtop',
    transmission: 'Automatic', engine: '440 Magnum V8',
    color: 'Plum Crazy Purple',
    images: ['https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&q=80'],
    description: 'Broadcast sheet documented 1969 Charger R/T 440. TorqueFlite automatic. Correct Plum Crazy paint. Numbers match on block and heads.',
    sellerId: 'u3', sellerName: 'Mopar Mike\'s', sellerPhone: '(704) 555-0211',
    featured: true, listedAt: '2025-05-08',
  },
  {
    id: '4',
    slug: '1964-pontiac-gto',
    title: '1964 Pontiac GTO',
    year: 1964, make: 'Pontiac', model: 'GTO',
    price: 78000, mileage: 67200,
    location: 'Detroit', state: 'MI',
    condition: 'Good', bodyStyle: 'Coupe',
    transmission: 'Manual', engine: '389 Tri-Power V8',
    color: 'Grenadier Red',
    images: ['https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=80'],
    description: 'First-year GTO with rare Tri-Power setup. Solid Michigan car with documented history. Recent brake and cooling system service.',
    sellerId: 'u4', sellerName: 'Motor City Muscle', sellerPhone: '(313) 555-0177',
    featured: false, listedAt: '2025-05-15',
  },
  {
    id: '5',
    slug: '1955-chevrolet-bel-air',
    title: '1955 Chevrolet Bel Air',
    year: 1955, make: 'Chevrolet', model: 'Bel Air',
    price: 52500, mileage: 84300,
    location: 'Los Angeles', state: 'CA',
    condition: 'Good', bodyStyle: 'Hardtop',
    transmission: 'Automatic', engine: '265 V8',
    color: 'Harvest Gold / India Ivory',
    images: ['https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&q=80'],
    description: 'Classic two-tone 1955 Bel Air in iconic colors. PowerGlide automatic. Solid California body, no rust. Great daily driver or show car.',
    sellerId: 'u5', sellerName: 'SoCal Chrome', sellerPhone: '(818) 555-0131',
    featured: false, listedAt: '2025-05-18',
  },
  {
    id: '6',
    slug: '1970-plymouth-barracuda',
    title: '1970 Plymouth Barracuda',
    year: 1970, make: 'Plymouth', model: 'Barracuda',
    price: 95000, mileage: 22800,
    location: 'Tampa', state: 'FL',
    condition: 'Excellent', bodyStyle: 'Convertible',
    transmission: 'Manual', engine: '440 Six-Pack V8',
    color: 'Vitamin C Orange',
    images: ['https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80'],
    description: '1970 Barracuda convertible with the rare 440 Six-Pack. One of 9 known examples with this combination. Full restoration, show winner.',
    sellerId: 'u6', sellerName: 'Sunshine State Classics', sellerPhone: '(813) 555-0199',
    featured: true, listedAt: '2025-05-06',
  },
  {
    id: '7',
    slug: '1932-ford-highboy-roadster',
    title: '1932 Ford Highboy Roadster',
    year: 1932, make: 'Ford', model: 'Model B',
    price: 47500, mileage: 5200,
    location: 'Sacramento', state: 'CA',
    condition: 'Excellent', bodyStyle: 'Roadster',
    transmission: 'Manual', engine: '327 Small Block V8',
    color: 'Satin Black',
    images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80'],
    description: "Traditional styled '32 Ford highboy hot rod. Steel body, 327 SBC, polished Halibrand knockoffs. AMBR contender quality build.",
    sellerId: 'u7', sellerName: 'Valley Hot Rods', sellerPhone: '(916) 555-0144',
    featured: false, listedAt: '2025-05-20',
  },
  {
    id: '8',
    slug: '1966-shelby-gt350',
    title: '1966 Shelby GT350',
    year: 1966, make: 'Ford', model: 'Mustang',
    price: 185000, mileage: 19400,
    location: 'Austin', state: 'TX',
    condition: 'Excellent', bodyStyle: 'Fastback',
    transmission: 'Manual', engine: '289 Hi-Po K-Code V8',
    color: 'Wimbledon White',
    images: ['https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800&q=80'],
    description: 'Authenticated 1966 Shelby GT350 with Shelby American Automobile Club certification. All numbers match, original interior. Investment grade.',
    sellerId: 'u8', sellerName: 'Lone Star Pony Cars', sellerPhone: '(512) 555-0166',
    featured: true, listedAt: '2025-05-02',
  },
  {
    id: '9',
    slug: '1957-chevrolet-nomad',
    title: '1957 Chevrolet Nomad',
    year: 1957, make: 'Chevrolet', model: 'Nomad',
    price: 71000, mileage: 61700,
    location: 'Denver', state: 'CO',
    condition: 'Good', bodyStyle: 'Station Wagon',
    transmission: 'Automatic', engine: '283 V8',
    color: 'Laurel Green / India Ivory',
    images: ['https://images.unsplash.com/photo-1609629048082-ba5cb8c7b4da?w=800&q=80'],
    description: 'Highly sought-after 1957 Nomad wagon. One of the rarest body styles from the tri-five era. Solid car with professional paint.',
    sellerId: 'u9', sellerName: 'Mile High Classics', sellerPhone: '(720) 555-0188',
    featured: false, listedAt: '2025-05-22',
  },
  {
    id: '10',
    slug: '1969-chevrolet-corvette-stingray',
    title: '1969 Chevrolet Corvette Stingray',
    year: 1969, make: 'Chevrolet', model: 'Corvette',
    price: 88000, mileage: 44600,
    location: 'Chicago', state: 'IL',
    condition: 'Excellent', bodyStyle: 'Coupe',
    transmission: 'Manual', engine: '427 L71 V8',
    color: 'Can-Am White',
    images: ['https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=800&q=80'],
    description: 'Numbers-matching 1969 Stingray with the rare 427/435hp L71 engine. 4-speed close-ratio, side pipes. Concours-level restoration.',
    sellerId: 'u10', sellerName: 'Windy City Vettes', sellerPhone: '(312) 555-0222',
    featured: false, listedAt: '2025-05-14',
  },
  {
    id: '11',
    slug: '1940-ford-deluxe-coupe',
    title: '1940 Ford Deluxe Coupe',
    year: 1940, make: 'Ford', model: 'Deluxe',
    price: 38500, mileage: 12000,
    location: 'Portland', state: 'OR',
    condition: 'Good', bodyStyle: 'Coupe',
    transmission: 'Manual', engine: '350 Small Block V8',
    color: 'Dark Blue Metallic',
    images: ['https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=800&q=80'],
    description: 'Sweet 1940 Ford coupe with a tuck-and-roll interior and modern drivetrain. Reliable, fun, and turns heads everywhere.',
    sellerId: 'u11', sellerName: 'Pacific NW Hot Rods', sellerPhone: '(503) 555-0155',
    featured: false, listedAt: '2025-05-25',
  },
  {
    id: '13',
    slug: '1967-plymouth-gtx-hemi',
    title: '1967 Plymouth GTX Hemi',
    year: 1967, make: 'Plymouth', model: 'GTX',
    price: 0, mileage: 99606,
    location: 'St. Charles', state: 'MO',
    condition: 'Excellent', bodyStyle: 'Coupe',
    transmission: 'Manual', engine: '426 Hemi V8',
    color: 'Bright Red',
    images: [
      '/cars/1967 Plymouth GTX/1967-plymouth-gtx-hemi.jpg',
      '/cars/1967 Plymouth GTX/1967-plymouth-gtx-hemi-engine.jpg',
      '/cars/1967 Plymouth GTX/1967-plymouth-gtx-hemi-interior.jpg',
    ],
    headline: "THE GENTLEMAN'S MUSCLE CAR WITH RAW HEMI POWER",
    descriptionParagraphs: [
      "This 1967 Plymouth GTX is more than just a muscle car, it's a statement. Known as \"The Gentleman's Muscle Car,\" this Bright Red beauty packs the perfect mix of style, sophistication, and unrelenting power. Under the hood is the legendary 426 Hemi V8, mated to a 4-speed manual transmission and a Sure-Grip rear differential with 3.55 gears. If you've been searching for a 1967 GTX Hemi that delivers street presence and brute performance, this is it.",
      "The exterior is finished in a brilliant Bright Red, accented by dual hood scoops and matching red steel wheels wrapped in classic redline tires. Dog dish hubcaps complete the no-nonsense, factory-correct look that made the '67 GTX a standout from the start. Inside, the red vinyl bucket seat interior is as clean and commanding as the exterior, featuring a center console and a period-correct Mopar 8-track player to keep the vintage vibes alive.",
      "Power steering and power front disc brakes make this 1967 GTX for sale just as enjoyable to drive as it is to look at. From its unmistakable silhouette to the thunderous sound of the 426 Hemi, this '67 Plymouth GTX for sale is a dream car for collectors and enthusiasts alike.",
      "Opportunities to own a true 1967 Plymouth GTX Hemi don't come around often, especially in this condition. If you're looking to buy a '67 GTX Hemi that has pedigree, performance, and presence, this one's ready to take its place in your garage!",
    ],
    description: "1967 Plymouth GTX with 426 Hemi V8, 4-speed manual, Sure-Grip rear. Bright Red with red vinyl bucket interior. Power steering, power front disc brakes.",
    hobbySegment: 'Muscle Car',
    doors: 2,
    interiorColor: 'Bright Red',
    seatMaterial: 'Vinyl',
    seatingType: 'Bucket',
    rearWheelSpec: 'Special Factory',
    options: ['Power Steering', 'Power Front Disc Brakes', '8 Track Player'],
    sellerId: 'u13', sellerName: 'Fast Lane Classic Cars', sellerPhone: '(314) 555-0100',
    featured: true, listedAt: '2026-06-14',
  },
  {
    id: '12',
    slug: '1971-chevelle-ss-454',
    title: '1971 Chevelle SS 454',
    year: 1971, make: 'Chevrolet', model: 'Chevelle',
    price: 67500, mileage: 53200,
    location: 'Atlanta', state: 'GA',
    condition: 'Good', bodyStyle: 'Hardtop',
    transmission: 'Automatic', engine: '454 LS5 V8',
    color: 'Cranberry Red',
    images: ['https://images.unsplash.com/photo-1526726538690-5cbf956ae2fd?w=800&q=80'],
    description: 'Documented SS 454 Chevelle. Turbo-Hydramatic 400, correct Cowl-Induction hood. Recent frame-off, driver-quality paint.',
    sellerId: 'u12', sellerName: 'Peach State Muscle', sellerPhone: '(404) 555-0177',
    featured: false, listedAt: '2025-05-17',
  },
];

export function toSegment(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function makeFromSegment(seg: string): string | undefined {
  return MAKES.find(m => toSegment(m) === seg);
}

export function modelFromSegment(make: string, seg: string): string | undefined {
  return CARS.find(c => c.make === make && toSegment(c.model) === seg)?.model;
}

export function searchCars(filters: Partial<{
  make: string; model: string; yearMin: number; yearMax: number;
  priceMin: number; priceMax: number; condition: string;
  bodyStyle: string; transmission: string; state: string; query: string; featured: boolean;
}>): Car[] {
  return CARS.filter(car => {
    if (filters.featured && !car.featured) return false;
    if (filters.make && filters.make !== 'All Makes' && car.make !== filters.make) return false;
    if (filters.model && car.model !== filters.model) return false;
    if (filters.yearMin && car.year < filters.yearMin) return false;
    if (filters.yearMax && car.year > filters.yearMax) return false;
    if (filters.priceMin && car.price < filters.priceMin) return false;
    if (filters.priceMax && car.price > filters.priceMax) return false;
    if (filters.condition && filters.condition !== 'All' && car.condition !== filters.condition) return false;
    if (filters.bodyStyle && filters.bodyStyle !== 'All Styles' && car.bodyStyle !== filters.bodyStyle) return false;
    if (filters.transmission && car.transmission !== filters.transmission) return false;
    if (filters.state && filters.state !== 'All States' && car.state !== filters.state) return false;
    if (filters.query) {
      const q = filters.query.toLowerCase();
      if (!car.title.toLowerCase().includes(q) && !car.description.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(price);
}

export function formatMileage(miles: number | null): string {
  if (miles == null) return 'N/A';
  return new Intl.NumberFormat('en-US').format(miles) + ' mi';
}

export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  if (digits.length < 4) return digits;
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export const DEALERS: Dealer[] = [
  {
    id: 'u1', slug: 'classic-iron-nashville',
    name: 'Classic Iron Nashville', phone: '(615) 555-0142', email: 'sales@classicironnashville.com',
    location: 'Nashville', state: 'TN',
    description: 'Middle Tennessee\'s premier source for documented muscle cars and resto-mods. Over 30 years placing collector vehicles with serious buyers.',
    specialties: ['Muscle Cars', 'Resto-Mods', 'GM A-Body'],
    since: 1993,
  },
  {
    id: 'u2', slug: 'desert-sun-classics',
    name: 'Desert Sun Classics', phone: '(480) 555-0188', email: 'info@desertsunclassics.com',
    location: 'Scottsdale', state: 'AZ',
    description: 'Specializing in rust-free Southwest classics. Arizona dry climate means exceptional bodies on every car we sell.',
    specialties: ['Rust-Free Classics', 'Convertibles', 'Ford & Mercury'],
    since: 2001,
  },
  {
    id: 'u3', slug: 'mopar-mikes',
    name: "Mopar Mike's", phone: '(704) 555-0211', email: 'mike@moparmikes.com',
    location: 'Charlotte', state: 'NC',
    description: 'The Southeast\'s dedicated Mopar specialist. Chargers, Challengers, Barracudas, and Super Bees — if Chrysler built it, we know it.',
    specialties: ['Mopar', 'Dodge', 'Plymouth', 'Chrysler'],
    since: 1998,
  },
  {
    id: 'u4', slug: 'motor-city-muscle',
    name: 'Motor City Muscle', phone: '(313) 555-0177', email: 'sales@motorcitymuscle.com',
    location: 'Detroit', state: 'MI',
    description: 'Born in the Motor City, we live and breathe GM muscle. GTOs, Chevelles, 442s, and GSX cars are our bread and butter.',
    specialties: ['GM Muscle', 'Pontiac', 'Oldsmobile', 'Buick'],
    since: 1989,
  },
  {
    id: 'u5', slug: 'socal-chrome',
    name: 'SoCal Chrome', phone: '(818) 555-0131', email: 'hello@socalchrome.com',
    location: 'Los Angeles', state: 'CA',
    description: 'Southern California classics from the golden era of American automobiles. Tri-fives, lead sleds, and custom show cars.',
    specialties: ['Tri-Five Chevys', 'Custom Cars', 'Show Cars'],
    since: 2005,
  },
  {
    id: 'u6', slug: 'sunshine-state-classics',
    name: 'Sunshine State Classics', phone: '(813) 555-0199', email: 'info@sunshineclassics.com',
    location: 'Tampa', state: 'FL',
    description: 'Florida\'s top destination for rare and high-value collector cars. We specialize in low-production, documented examples.',
    specialties: ['Rare Muscle', 'High-Value Collectibles', 'Convertibles'],
    since: 2008,
  },
  {
    id: 'u7', slug: 'valley-hot-rods',
    name: 'Valley Hot Rods', phone: '(916) 555-0144', email: 'builds@valleyhotrods.com',
    location: 'Sacramento', state: 'CA',
    description: 'Northern California\'s hot rod specialists. Traditional builds, custom fabrication, and vintage tin from the pre-war era through the 1950s.',
    specialties: ['Hot Rods', 'Pre-War', 'Custom Fabrication'],
    since: 1997,
  },
  {
    id: 'u8', slug: 'lone-star-pony-cars',
    name: 'Lone Star Pony Cars', phone: '(512) 555-0166', email: 'info@lonestarponycars.com',
    location: 'Austin', state: 'TX',
    description: 'Texas\'s Mustang and Shelby authority. From early Falcons to Boss 302s and certified Shelby vehicles, we handle only the finest Ford pony cars.',
    specialties: ['Mustang', 'Shelby', 'Ford Pony Cars'],
    since: 2003,
  },
  {
    id: 'u9', slug: 'mile-high-classics',
    name: 'Mile High Classics', phone: '(720) 555-0188', email: 'sales@milehighclassics.com',
    location: 'Denver', state: 'CO',
    description: 'Colorado\'s classic car destination. Rocky Mountain dry air keeps these cars in exceptional condition. Station wagons, trucks, and two-doors.',
    specialties: ['Station Wagons', 'Tri-Five', 'Classic Trucks'],
    since: 2010,
  },
  {
    id: 'u10', slug: 'windy-city-vettes',
    name: 'Windy City Vettes', phone: '(312) 555-0222', email: 'info@windycityvettes.com',
    location: 'Chicago', state: 'IL',
    description: 'The Midwest\'s Corvette specialists since 1991. Every year from C1 through C5, with documentation, NCRS judging, and concours restorations.',
    specialties: ['Corvette', 'C1', 'C2', 'C3'],
    since: 1991,
  },
  {
    id: 'u11', slug: 'pacific-nw-hot-rods',
    name: 'Pacific NW Hot Rods', phone: '(503) 555-0155', email: 'builds@pacificnwhotrods.com',
    location: 'Portland', state: 'OR',
    description: 'Pacific Northwest custom builders specializing in 1930s and 1940s Ford hot rods. Traditional builds using period-correct parts and techniques.',
    specialties: ['1930s Ford', '1940s Ford', 'Traditional Hot Rods'],
    since: 2000,
  },
  {
    id: 'u13', slug: 'fastlane-cars',
    name: 'Fast Lane Classic Cars',
    phone: '(314) 555-0100', email: 'sales@fastlanecars.com',
    location: 'St. Charles', state: 'MO',
    description: 'Founded in 1994, we are a family-owned classic and collector car dealership located in St. Charles, Missouri. Our campus has three huge showrooms filled with over 180 high-quality cars, trucks, and motorcycles. We are the Midwest\'s largest Backdraft dealer, specializing in custom-built Cobra replicas. We have a state-of-the-art service facility, a restoration shop, and an auto detail facility. Our buildings feature automobile art, memorabilia, and antiques curated from around the world, and our gift shop has something for every auto enthusiast. There is something for everyone at Fast Lane Classic Cars!\n\nWe work every day to earn the reputation our business was founded on. To provide the best quality cars, trucks, and motorcycles and to be as honest and clear with every customer as possible. We are committed to make sure buying a Fast Lane car is the only way to invest in a vintage vehicle!',
    specialties: ['Classic Cars', 'Muscle Cars', 'Cobra Replicas', 'Motorcycles', 'Trucks'],
    since: 1994,
    logo: '/dealers/fastlane-logo.svg',
    website: 'https://www.fastlanecars.com',
  },
  {
    id: 'u12', slug: 'peach-state-muscle',
    name: 'Peach State Muscle', phone: '(404) 555-0177', email: 'info@peachstatemuscle.com',
    location: 'Atlanta', state: 'GA',
    description: 'The Southeast\'s go-to source for documented GM muscle cars. Chevelles, El Caminos, Monte Carlos, and Nova SS models are our specialty.',
    specialties: ['Chevelle', 'El Camino', 'Nova SS', 'GM A-Body'],
    since: 2006,
  },
];

export function getDealer(slug: string): Dealer | undefined {
  return DEALERS.find(d => d.slug === slug);
}

export function getDealerById(id: string): Dealer | undefined {
  return DEALERS.find(d => d.id === id);
}

export function getCar(slug: string): Car | undefined {
  return CARS.find(c => c.slug === slug);
}
