import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import CarCard from '@/components/CarCard';
import ImageGallery from '@/components/ImageGallery';
import ValuationWidget from '@/components/ValuationWidget';
import SimilarCarsSection from '@/components/SimilarCarsSection';
import ContactSellerForm from '@/components/ContactSellerForm';
import ViewTracker from '@/components/ViewTracker';
import { formatPrice, formatMileage, toSegment, makeFromSegment } from '@/lib/data';
import { fetchCar, fetchCars, fetchDealerById, fetchModelsByMake } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import WatchButton from '@/components/WatchButton';
import AdSlot from '@/components/AdSlot';
import FinancingCalculator from '@/components/FinancingCalculator';
import PriceHistoryChart from '@/components/PriceHistoryChart';
import MakeOfferButton from '@/components/MakeOfferButton';

const BASE_URL = 'https://www.garagecherries.com';

export async function generateMetadata({ params }: { params: Promise<{ segments: string[] }> }): Promise<Metadata> {
  const { segments } = await params;

  // Detail page
  if (segments.length === 4) {
    const [, , id] = segments;
    const car = await fetchCar(id);
    if (!car) return {};
    const title = `${car.title} For Sale`;
    const desc = `${car.year} ${car.make} ${car.model} in ${car.condition} condition${car.mileage ? ` with ${Number(car.mileage).toLocaleString()} miles` : ''}${car.price ? `. Asking ${formatPrice(car.price)}` : ''}. View photos and full details on GarageCherries.`;
    const image = car.images?.[0];
    const url = `${BASE_URL}/listings/${toSegment(car.make)}/${toSegment(car.model)}/${car.id}/${car.slug}`;
    return {
      title,
      description: desc,
      alternates: { canonical: url },
      openGraph: {
        title, description: desc, url, type: 'website',
        ...(image ? { images: [{ url: image, width: 1200, height: 800, alt: car.title }] } : {}),
      },
      twitter: { card: 'summary_large_image', title, description: desc, ...(image ? { images: [image] } : {}) },
    };
  }

  // Model page
  if (segments.length === 2) {
    const make = makeFromSegment(segments[0]);
    if (!make) return {};
    const model = decodeURIComponent(segments[1]).replace(/-/g, ' ');
    const cars = await fetchCars({ make, model });
    const title = `${make} ${model} For Sale`;
    return {
      title,
      description: `Browse ${cars.length} ${make} ${model} classic cars for sale on GarageCherries. Find the best deals from trusted dealers across the US.`,
      alternates: { canonical: `${BASE_URL}/listings/${segments[0]}/${segments[1]}` },
    };
  }

  // Make page
  if (segments.length === 1) {
    const make = makeFromSegment(segments[0]);
    if (!make) return {};
    const cars = await fetchCars({ make });
    return {
      title: `${make} Classic Cars For Sale`,
      description: `Browse ${cars.length} classic ${make} cars for sale on GarageCherries. Find ${make} muscle cars, convertibles, and collector vehicles from dealers nationwide.`,
      alternates: { canonical: `${BASE_URL}/listings/${segments[0]}` },
    };
  }

  return {};
}

const CONDITION_COLORS: Record<string, string> = {
  Excellent: 'bg-green-100 text-green-800 border-green-200',
  Good:      'bg-blue-100 text-blue-800 border-blue-200',
  Fair:      'bg-yellow-100 text-yellow-800 border-yellow-200',
  Project:   'bg-red-100 text-red-800 border-red-200',
};

export default async function ListingsCatchAll({ params }: { params: Promise<{ segments: string[] }> }) {
  const { segments } = await params;

  // ── Detail page: /listings/dodge/charger/abc123/1969-dodge-charger-rt ──
  if (segments.length === 4) {
    const [makeSeg, modelSeg, id] = segments;
    const car = await fetchCar(id);
    if (!car) notFound();

    const dealer = await fetchDealerById(car.sellerId);

    // Check if the logged-in user is watching this car
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    let isWatched = false;
    if (user) {
      const { data: watchEntry } = await supabase
        .from('watchlists')
        .select('id')
        .eq('user_id', user.id)
        .eq('car_id', car.id)
        .single();
      isWatched = !!watchEntry;
    }

    const similar = await fetchCars({ make: car.make, limit: 5 });
    const fallbackCars = similar.filter(c => c.id !== car.id).slice(0, 4);

    const mapAddressParts = [(dealer as any)?.address, (dealer as any)?.location ?? car.location, (dealer as any)?.state ?? car.state, (dealer as any)?.zip].filter(Boolean);
    const mapQuery = encodeURIComponent(mapAddressParts.join(', '));
    const mapSrc = `https://maps.google.com/maps?q=${mapQuery}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
    const mapsLink = `https://maps.google.com/?q=${mapQuery}`;

    const canonicalUrl = `${BASE_URL}/listings/${makeSeg}/${modelSeg}/${car.id}/${car.slug}`;
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Vehicle',
      name: car.title,
      description: car.description ?? '',
      url: canonicalUrl,
      image: car.images ?? [],
      vehicleModelDate: String(car.year),
      brand: { '@type': 'Brand', name: car.make },
      model: car.model,
      mileageFromOdometer: car.mileage ? { '@type': 'QuantitativeValue', value: car.mileage, unitCode: 'SMI' } : undefined,
      vehicleCondition: `https://schema.org/${car.condition === 'Excellent' || car.condition === 'Good' ? 'UsedCondition' : 'DamagedCondition'}`,
      color: car.color,
      offers: {
        '@type': 'Offer',
        price: car.price ?? 0,
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
        seller: { '@type': 'AutoDealer', name: car.sellerName },
      },
    };

    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        {car.sellerId && <ViewTracker listingId={car.id} dealerId={car.sellerId} userId={user?.id} />}
        <div className="max-w-7xl mx-auto px-4 py-8">
          <nav className="text-sm text-zinc-500 mb-6 flex flex-wrap gap-2">
            <Link href="/" className="hover:text-red-600">Home</Link><span>/</span>
            <Link href="/listings" className="hover:text-red-600">Listings</Link><span>/</span>
            <Link href={`/listings/${makeSeg}`} className="hover:text-red-600">{car.make}</Link><span>/</span>
            <Link href={`/listings/${makeSeg}/${modelSeg}`} className="hover:text-red-600">{car.model}</Link><span>/</span>
            <span className="text-zinc-800">{car.title}</span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="relative">
                {car.featured && (
                  <span className="absolute top-4 left-4 z-10 bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg">FEATURED</span>
                )}
                <ImageGallery images={car.images} title={car.title} />
              </div>

              <div className="lg:hidden">
                <div className="flex items-start justify-between gap-4">
                  <h1 className="text-2xl font-extrabold text-zinc-900 leading-tight">{car.title}</h1>
                  <span className={`shrink-0 text-xs font-semibold px-3 py-1 rounded-full border ${CONDITION_COLORS[car.condition]}`}>{car.condition}</span>
                </div>
                <p className="text-3xl font-bold text-red-600 mt-2">{formatPrice(car.price)}</p>
              </div>

              {/* Description */}
              <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
                {car.headline && (
                  <h2 className="text-xl font-extrabold italic text-red-600 uppercase mb-4 leading-tight">
                    {car.headline}
                  </h2>
                )}
                {car.descriptionParagraphs ? (
                  <div className="space-y-4">
                    {car.descriptionParagraphs.map((p, i) => (
                      <p key={i} className="text-zinc-600 leading-relaxed">{p}</p>
                    ))}
                  </div>
                ) : (
                  <p className="text-zinc-600 leading-relaxed">{car.description}</p>
                )}
              </div>

              {/* Specs */}
              <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                  <div>
                    <h3 className="text-xs font-extrabold italic text-red-600 uppercase tracking-wider mb-2 pb-2 border-b-2 border-red-600">Details</h3>
                    <dl className="space-y-3">
                      <div><dt className="text-xs text-zinc-400 uppercase tracking-wide">Year</dt><dd className="font-bold text-zinc-900">{car.year}</dd></div>
                      <div><dt className="text-xs text-zinc-400 uppercase tracking-wide">Make</dt><dd className="font-bold text-zinc-900">{car.make}</dd></div>
                      <div><dt className="text-xs text-zinc-400 uppercase tracking-wide">Model</dt><dd className="font-bold text-zinc-900">{car.model}</dd></div>
                      {car.hobbySegment && <div><dt className="text-xs text-zinc-400 uppercase tracking-wide">Hobby Segment</dt><dd className="font-bold text-zinc-900">{car.hobbySegment}</dd></div>}
                      <div><dt className="text-xs text-zinc-400 uppercase tracking-wide">Miles</dt><dd className="font-bold text-zinc-900">{formatMileage(car.mileage)}</dd></div>
                    </dl>
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold italic text-red-600 uppercase tracking-wider mb-2 pb-2 border-b-2 border-red-600">Exterior</h3>
                    <dl className="space-y-3">
                      <div><dt className="text-xs text-zinc-400 uppercase tracking-wide">Body Style</dt><dd className="font-bold text-zinc-900">{car.bodyStyle}</dd></div>
                      {car.doors && <div><dt className="text-xs text-zinc-400 uppercase tracking-wide">Doors</dt><dd className="font-bold text-zinc-900">{car.doors}</dd></div>}
                      <div><dt className="text-xs text-zinc-400 uppercase tracking-wide">Body Color</dt><dd className="font-bold text-zinc-900">{car.color}</dd></div>
                      {car.rearWheelSpec && <div><dt className="text-xs text-zinc-400 uppercase tracking-wide">Rear Wheel Specification</dt><dd className="font-bold text-zinc-900">{car.rearWheelSpec}</dd></div>}
                    </dl>
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold italic text-red-600 uppercase tracking-wider mb-2 pb-2 border-b-2 border-red-600">Engine &amp; Transmission</h3>
                    <dl className="space-y-3">
                      {car.engine && <div><dt className="text-xs text-zinc-400 uppercase tracking-wide">Engine</dt><dd className="font-bold text-zinc-900">{car.engine}</dd></div>}
                      {(car as any).displacement && <div><dt className="text-xs text-zinc-400 uppercase tracking-wide">Displacement</dt><dd className="font-bold text-zinc-900">{(car as any).displacement}</dd></div>}
                      {(car as any).cylinders && <div><dt className="text-xs text-zinc-400 uppercase tracking-wide">Cylinders</dt><dd className="font-bold text-zinc-900">{(car as any).cylinders}-cylinder</dd></div>}
                      {(car as any).horsepower && <div><dt className="text-xs text-zinc-400 uppercase tracking-wide">Horsepower</dt><dd className="font-bold text-zinc-900">{(car as any).horsepower} hp</dd></div>}
                      {(car as any).torque && <div><dt className="text-xs text-zinc-400 uppercase tracking-wide">Torque</dt><dd className="font-bold text-zinc-900">{(car as any).torque} lb-ft</dd></div>}
                      {(car as any).forcedInduction && <div><dt className="text-xs text-zinc-400 uppercase tracking-wide">Forced Induction</dt><dd className="font-bold text-zinc-900">{(car as any).forcedInduction}</dd></div>}
                      {(car as any).fuelType && <div><dt className="text-xs text-zinc-400 uppercase tracking-wide">Fuel Type</dt><dd className="font-bold text-zinc-900">{(car as any).fuelType}</dd></div>}
                      {car.transmission && <div><dt className="text-xs text-zinc-400 uppercase tracking-wide">Transmission</dt><dd className="font-bold text-zinc-900">{car.transmission}</dd></div>}
                      {(car as any).numSpeeds && <div><dt className="text-xs text-zinc-400 uppercase tracking-wide">Speeds</dt><dd className="font-bold text-zinc-900">{(car as any).numSpeeds}-speed</dd></div>}
                      {(car as any).driveType && <div><dt className="text-xs text-zinc-400 uppercase tracking-wide">Drive Type</dt><dd className="font-bold text-zinc-900">{(car as any).driveType}</dd></div>}
                    </dl>
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold italic text-red-600 uppercase tracking-wider mb-2 pb-2 border-b-2 border-red-600">Interior</h3>
                    <dl className="space-y-3">
                      {car.interiorColor && <div><dt className="text-xs text-zinc-400 uppercase tracking-wide">Interior Color</dt><dd className="font-bold text-zinc-900">{car.interiorColor}</dd></div>}
                      {car.seatMaterial && <div><dt className="text-xs text-zinc-400 uppercase tracking-wide">Seat Material</dt><dd className="font-bold text-zinc-900">{car.seatMaterial}</dd></div>}
                      {car.seatingType && <div><dt className="text-xs text-zinc-400 uppercase tracking-wide">Seating Type</dt><dd className="font-bold text-zinc-900">{car.seatingType}</dd></div>}
                    </dl>
                  </div>
                </div>

                {car.options && car.options.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-zinc-100">
                    <h3 className="text-xs font-extrabold italic text-red-600 uppercase tracking-wider mb-3 pb-2 border-b-2 border-red-600">Options</h3>
                    <ul className="flex flex-wrap gap-x-8 gap-y-2">
                      {car.options.map(opt => (
                        <li key={opt} className="flex items-center gap-2 text-sm font-bold text-zinc-800 uppercase tracking-wide">
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 shrink-0" />
                          {opt}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-5">
              <div className="hidden lg:block bg-white rounded-2xl border border-zinc-100 shadow-sm p-6 sticky top-24">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h1 className="text-xl font-extrabold text-zinc-900 leading-tight">{car.title}</h1>
                  <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border ${CONDITION_COLORS[car.condition]}`}>{car.condition}</span>
                </div>
                <p className="text-3xl font-bold text-red-600 mt-2 mb-5">{formatPrice(car.price)}</p>

                <div className="border-t border-zinc-100 pt-4 mb-4">
                  <p className="text-xs text-zinc-400 uppercase tracking-wide font-semibold mb-2">Dealer</p>
                  {dealer ? (
                    <Link href={`/dealers/${dealer.slug}`} className="font-bold text-red-600 hover:underline block">{car.sellerName}</Link>
                  ) : (
                    <p className="font-bold text-zinc-800">{car.sellerName}</p>
                  )}
                  <a href={mapsLink} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-red-600 transition-colors mt-1 w-fit">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    {mapAddressParts.join(', ')}
                  </a>
                  {dealer?.since && <p className="text-xs text-zinc-400 mt-0.5">Est. {dealer.since}</p>}
                  <p className="text-sm text-zinc-500 mt-1">{car.sellerPhone}</p>
                </div>

                <a href={`tel:${car.sellerPhone.replace(/\D/g, '')}`}
                  className="block w-full bg-red-600 hover:bg-red-700 text-white font-bold text-center py-3 rounded-xl transition-colors mb-3">
                  Call Dealer
                </a>
                {dealer && (
                  <Link href={`/dealers/${dealer.slug}`}
                    className="block w-full border-2 border-red-600 text-red-600 hover:bg-red-50 font-bold py-3 rounded-xl transition-colors text-sm text-center">
                    View All Dealer Listings
                  </Link>
                )}
                <ContactSellerForm
                  carId={car.id}
                  carTitle={car.title}
                  sellerName={car.sellerName}
                />
                <WatchButton
                  carId={car.id}
                  currentPrice={car.price}
                  initialWatched={isWatched}
                  isLoggedIn={!!user}
                />
                <MakeOfferButton
                  carId={car.id}
                  carTitle={car.title}
                  askingPrice={car.price}
                  dealerId={car.sellerId}
                  isLoggedIn={!!user}
                />
                {car.lotNumber && <p className="text-xs text-zinc-400 text-center mt-4">Lot # {car.lotNumber}</p>}

                <ValuationWidget
                  year={car.year}
                  make={car.make}
                  model={car.model}
                  mileage={car.mileage}
                  condition={car.condition}
                  price={car.price}
                  bodyStyle={car.bodyStyle}
                  engine={car.engine}
                />

                <AdSlot carState={car.state} pagePath={canonicalUrl} />

                {mapAddressParts.length > 0 && (
                  <div className="mt-4 rounded-xl overflow-hidden border border-zinc-100">
                    <iframe
                      src={mapSrc}
                      className="w-full h-48"
                      style={{ border: 0 }}
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      title="Dealer location"
                    />
                  </div>
                )}
              </div>

              <div className="lg:hidden bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
                <p className="text-xs text-zinc-400 uppercase tracking-wide font-semibold mb-2">Dealer</p>
                {dealer ? (
                  <Link href={`/dealers/${dealer.slug}`} className="font-bold text-red-600 hover:underline block">{car.sellerName}</Link>
                ) : (
                  <p className="font-bold text-zinc-800">{car.sellerName}</p>
                )}
                <p className="text-sm text-zinc-500 mb-4">{car.sellerPhone}</p>
                <a href={`tel:${car.sellerPhone.replace(/\D/g, '')}`}
                  className="block w-full bg-red-600 text-white font-bold text-center py-3 rounded-xl mb-3">
                  Call Dealer
                </a>
                {dealer && (
                  <Link href={`/dealers/${dealer.slug}`}
                    className="block w-full border-2 border-red-600 text-red-600 font-bold text-center py-2.5 rounded-xl text-sm">
                    View All Listings
                  </Link>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 space-y-6">
            <PriceHistoryChart carId={car.id} currentPrice={car.price} />
            {car.price > 0 && <FinancingCalculator price={car.price} />}
          </div>

          <SimilarCarsSection
            currentCarId={car.id}
            year={car.year}
            make={car.make}
            model={car.model}
            bodyStyle={car.bodyStyle}
            engine={car.engine}
            price={car.price}
            condition={car.condition}
            fallbackCars={fallbackCars}
          />
        </div>
      </>
    );
  }

  // ── Make page: /listings/dodge ──
  if (segments.length === 1) {
    const make = makeFromSegment(segments[0]);
    if (!make) notFound();

    const [cars, models] = await Promise.all([
      fetchCars({ make }),
      fetchModelsByMake(make),
    ]);

    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <nav className="text-sm text-zinc-500 mb-6 flex gap-2">
          <Link href="/" className="hover:text-red-600">Home</Link><span>/</span>
          <Link href="/listings" className="hover:text-red-600">Listings</Link><span>/</span>
          <span className="text-zinc-800">{make}</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-zinc-900">{make} Classic Cars For Sale</h1>
          <p className="text-zinc-500 mt-1">{cars.length} listing{cars.length !== 1 ? 's' : ''}</p>
        </div>

        {models.length > 1 && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">Browse by Model</h2>
            <div className="flex flex-wrap gap-2">
              {models.map(model => {
                const count = cars.filter(c => c.model === model).length;
                return (
                  <Link key={model} href={`/listings/${segments[0]}/${toSegment(model)}`}
                    className="px-4 py-2 bg-white border border-zinc-200 rounded-full text-sm font-medium text-zinc-700 hover:border-red-400 hover:text-red-600 transition-colors shadow-sm">
                    {model} <span className="text-zinc-400">({count})</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {cars.map(car => <CarCard key={car.id} car={car} />)}
        </div>
      </div>
    );
  }

  // ── Make + Model page: /listings/dodge/charger ──
  if (segments.length === 2) {
    const make = makeFromSegment(segments[0]);
    if (!make) notFound();

    // Reconstruct model name from URL segment (best-effort; DB query validates it exists)
    const modelSlug = segments[1];
    const cars = await fetchCars({ make });
    const model = cars.find(c => toSegment(c.model) === modelSlug)?.model;
    if (!model) notFound();

    const modelCars = cars.filter(c => c.model === model);

    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <nav className="text-sm text-zinc-500 mb-6 flex gap-2">
          <Link href="/" className="hover:text-red-600">Home</Link><span>/</span>
          <Link href="/listings" className="hover:text-red-600">Listings</Link><span>/</span>
          <Link href={`/listings/${segments[0]}`} className="hover:text-red-600">{make}</Link><span>/</span>
          <span className="text-zinc-800">{model}</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-zinc-900">{make} {model} For Sale</h1>
          <p className="text-zinc-500 mt-1">{modelCars.length} listing{modelCars.length !== 1 ? 's' : ''}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {modelCars.map(car => <CarCard key={car.id} car={car} />)}
        </div>
      </div>
    );
  }

  notFound();
}
