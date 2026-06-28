import { createClient } from '@/lib/supabase/server';
import type { Car, Dealer } from '@/lib/types';

export type DealerWithCount = Dealer & { address?: string; zip?: string; listingCount: number };
export type DealerFull = Dealer & { address?: string; zip?: string };

function adaptCar(data: any): Car {
  return {
    id:                   data.id,
    slug:                 data.slug,
    title:                data.title,
    year:                 data.year,
    make:                 data.make,
    model:                data.model,
    price:                data.price ?? 0,
    mileage:              data.mileage ?? 0,
    location:             data.location ?? '',
    state:                data.state ?? '',
    condition:            data.condition,
    bodyStyle:            data.body_style ?? '',
    transmission:         data.transmission ?? 'Automatic',
    engine:               data.engine ?? '',
    color:                data.color ?? '',
    images:               data.images ?? [],
    description:          data.description ?? '',
    sellerId:             data.seller_id ?? '',
    sellerName:           data.seller_name ?? '',
    sellerPhone:          data.seller_phone ?? '',
    featured:             data.featured ?? false,
    listedAt:             data.listed_at ?? '',
    headline:             data.headline ?? undefined,
    hobbySegment:         data.hobby_segment ?? undefined,
    doors:                data.doors ?? undefined,
    interiorColor:        data.interior_color ?? undefined,
    seatMaterial:         data.seat_material ?? undefined,
    seatingType:          data.seating_type ?? undefined,
    rearWheelSpec:        data.rear_wheel_spec ?? undefined,
    options:              data.options ?? undefined,
    descriptionParagraphs: data.description_paragraphs ?? undefined,
    lotNumber:            data.lot_number ?? undefined,
    vin:                  data.vin ?? undefined,
    vinVerified:          data.vin_verified ?? false,
    vinMake:              data.vin_make ?? undefined,
    vinModel:             data.vin_model ?? undefined,
    vinYear:              data.vin_year ?? undefined,
  };
}

function adaptDealer(data: any): DealerFull {
  return {
    id:          data.id,
    slug:        data.slug,
    name:        data.name,
    phone:       data.phone ?? '',
    email:       data.email ?? '',
    location:    data.location ?? '',
    state:       data.state ?? '',
    description: data.description ?? '',
    specialties: data.specialties ?? [],
    since:       data.since ?? 0,
    logo:        data.logo ?? undefined,
    website:     data.website ?? undefined,
    address:     data.address ?? undefined,
    zip:         data.zip ?? undefined,
  };
}

export interface FetchCarsFilters {
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
  featured?: boolean;
  sellerId?: string;
  limit?: number;
}

export async function fetchCars(filters: FetchCarsFilters = {}): Promise<Car[]> {
  const supabase = await createClient();
  let query = supabase.from('listings').select('*').order('created_at', { ascending: false });

  if (filters.make && filters.make !== 'All Makes')
    query = query.eq('make', filters.make);
  if (filters.model)
    query = query.eq('model', filters.model);
  if (filters.yearMin)
    query = query.gte('year', filters.yearMin);
  if (filters.yearMax)
    query = query.lte('year', filters.yearMax);
  if (filters.priceMin)
    query = query.gte('price', filters.priceMin);
  if (filters.priceMax)
    query = query.lte('price', filters.priceMax);
  if (filters.condition && filters.condition !== 'All')
    query = query.eq('condition', filters.condition);
  if (filters.bodyStyle && filters.bodyStyle !== 'All Styles')
    query = query.eq('body_style', filters.bodyStyle);
  if (filters.transmission)
    query = query.eq('transmission', filters.transmission);
  if (filters.state && filters.state !== 'All States')
    query = query.eq('state', filters.state);
  if (filters.featured)
    query = query.eq('featured', true);
  if (filters.sellerId)
    query = query.eq('seller_id', filters.sellerId);
  if (filters.limit)
    query = query.limit(filters.limit);

  const { data } = await query;
  return (data ?? []).map(adaptCar);
}

export async function fetchCar(id: string): Promise<Car | null> {
  const supabase = await createClient();
  const { data } = await supabase.from('listings').select('*').eq('id', id).single();
  return data ? adaptCar(data) : null;
}

export async function fetchDealer(slug: string): Promise<DealerFull | null> {
  const supabase = await createClient();
  const { data } = await supabase.from('dealers').select('*').eq('slug', slug).single();
  return data ? adaptDealer(data) : null;
}

export async function fetchDealerById(id: string): Promise<DealerFull | null> {
  const supabase = await createClient();
  const { data } = await supabase.from('dealers').select('*').eq('id', id).single();
  return data ? adaptDealer(data) : null;
}

export async function fetchDealers(): Promise<DealerWithCount[]> {
  const supabase = await createClient();
  const [{ data: dealers }, { data: cars }] = await Promise.all([
    supabase.from('dealers').select('*').order('name'),
    supabase.from('listings').select('seller_id'),
  ]);

  const countMap: Record<string, number> = {};
  for (const car of cars ?? []) {
    countMap[car.seller_id] = (countMap[car.seller_id] ?? 0) + 1;
  }

  return (dealers ?? []).map(d => ({
    ...adaptDealer(d),
    listingCount: countMap[d.id] ?? 0,
  }));
}

export async function fetchModelsByMake(make: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('listings')
    .select('model')
    .eq('make', make);
  const models = [...new Set((data ?? []).map(c => c.model))].sort();
  return models;
}

export async function fetchMakes(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from('listings').select('make');
  const makes = [...new Set((data ?? []).map(c => c.make as string))]
    .filter(Boolean)
    .sort();
  return makes;
}

export async function fetchCarCount(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase.from('listings').select('*', { count: 'exact', head: true });
  return count ?? 0;
}

// Resolves a URL segment (e.g. "bmw", "mercedes-benz") to the
// properly-cased make string as stored in the DB (e.g. "BMW", "Mercedes-Benz")
export async function resolveMake(seg: string): Promise<string | null> {
  const makes = await fetchMakes();
  const match = makes.find(m => m.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') === seg);
  return match ?? null;
}
