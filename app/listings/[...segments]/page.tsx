import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import CarCard from '@/components/CarCard';
import ImageGallery from '@/components/ImageGallery';
import ContactSellerForm from '@/components/ContactSellerForm';
import WatchlistButton from '@/components/WatchlistButton';
import ViewTracker from '@/components/ViewTracker';
import AdSlot from '@/components/AdSlot';
import MakeOfferButton from '@/components/MakeOfferButton';
import FinancingCalculator from '@/components/FinancingCalculator';
import {
  getCar, getDealerById, formatPrice, formatMileage, formatPhone,
  toSegment, makeFromSegment, CARS,
} from '@/lib/data';

const BASE_URL = 'https://www.garagecherries.com';

export async function generateMetadata({ params }: { params: Promise<{ segments: string[] }> }): Promise<Metadata> {
  const { segments } = await params;

  // Detail page
  if (segments.length === 4) {
    const [, , id, slug] = segments;
    let car = getCar(slug);
    if (!car || car.id !== id) {
      const { createClient } = await import('@/lib/supabase/server');
      const supabase = await createClient();
      const { data } = await supabase.from('listings').select('*').eq('id', id).neq('status', 'rejected').single();
      if (data) car = { ...data, bodyStyle: data.body_style, listedAt: data.listed_at, sellerId: data.seller_id, sellerName: data.seller_name, sellerPhone: data.seller_phone } as any;
    }
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
        title,
        description: desc,
        url,
        type: 'website',
        ...(image ? { images: [{ url: image, width: 1200, height: 800, alt: car.title }] } : {}),
      },
      twitter: { card: 'summary_large_image', title, description: desc, ...(image ? { images: [image] } : {}) },
    };
  }

  // Model page
  if (segments.length === 2) {
    const make = makeFromSegment(segments[0]);
    if (!make) return {};

    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    const { data: modelNames } = await supabase.from('listings').select('model').eq('status', 'approved').eq('make', make);
    const model = (modelNames ?? []).find(r => toSegment(r.model) === segments[1])?.model;
    if (!model) return {};

    const { count } = await supabase.from('listings').select('id', { count: 'exact', head: true })
      .eq('status', 'approved').eq('make', make).eq('model', model);
    const title = `${make} ${model} For Sale`;
    return {
      title,
      description: `Browse ${count ?? 0} ${make} ${model} classic cars for sale on GarageCherries. Find the best deals from trusted dealers across the USA.`,
      alternates: { canonical: `${BASE_URL}/listings/${segments[0]}/${segments[1]}` },
    };
  }

  // Make page
  if (segments.length === 1) {
    const make = makeFromSegment(segments[0]);
    if (!make) return {};
    const count = CARS.filter(c => c.make === make).length;
    return {
      title: `${make} Cars For Sale`,
      description: `Browse ${count} ${make} cars for sale on GarageCherries. Find ${make} muscle cars, sports cars, supercars, and collector vehicles from dealers worldwide.`,
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

  // ── Detail page: /listings/dodge/charger/3/1969-dodge-charger-rt ──
  if (segments.length === 4) {
    const [makeSeg, modelSeg, id, slug] = segments;
    let car = getCar(slug);

    // Fall back to Supabase for cars not in mock data
    if (!car || car.id !== id) {
      const { createClient } = await import('@/lib/supabase/server');
      const supabase = await createClient();
      const { data } = await supabase.from('listings').select('*').eq('id', id).neq('status', 'rejected').single();
      if (!data) notFound();
      // Adapt snake_case DB row to Car shape
      car = {
        id: data.id, slug: data.slug, title: data.title,
        year: data.year, make: data.make, model: data.model,
        price: data.price, mileage: data.mileage,
        location: data.location ?? '', state: data.state ?? '',
        condition: data.condition, bodyStyle: data.body_style,
        transmission: data.transmission, engine: data.engine,
        horsepower: data.horsepower, torque: data.torque,
        cylinders: data.cylinders, displacement: data.displacement,
        forcedInduction: data.forced_induction, fuelType: data.fuel_type,
        numSpeeds: data.num_speeds, driveType: data.drive_type,
        color: data.color, images: data.images ?? [],
        description: data.description,
        sellerId: data.seller_id, sellerName: data.seller_name,
        sellerPhone: data.seller_phone ?? '',
        featured: data.featured ?? false, listedAt: data.listed_at,
        interiorColor: data.interior_color,
        seatMaterial: data.seat_material,
        seatingType: data.seating_type,
        rearWheelSpec: data.rear_wheel_spec,
        doors: data.doors,
        options: data.options,
        headline: data.headline,
        hobbySegment: data.hobby_segment,
        lotNumber: data.lot_number,
        descriptionParagraphs: data.description_paragraphs,
        isSold: data.is_sold ?? false,
      } as any;
    }
    if (!car) notFound();

    const mockDealer = getDealerById(car.sellerId);

    // Always fetch dealer live from Supabase so phone/details are current
    let dealer = mockDealer;
    if (car.sellerId) {
      const { createClient: createServerClient } = await import('@/lib/supabase/server');
      const supabaseForDealer = await createServerClient();
      const { data: dbDealer } = await supabaseForDealer
        .from('dealers')
        .select('id, slug, name, phone, email, address, location, state, zip, since, logo, website')
        .eq('id', car.sellerId)
        .single();
      if (dbDealer) {
        dealer = { ...mockDealer, ...dbDealer } as any;
        (car as any).sellerPhone = dbDealer.phone ?? car.sellerPhone;
        (car as any).sellerName  = dbDealer.name  ?? car.sellerName;
      }
    }

    const { createClient: createAuthClient } = await import('@/lib/supabase/server');
    const supabaseAuth = await createAuthClient();
    const { data: { user: authUser } } = await supabaseAuth.auth.getUser();
    const isLoggedIn = !!authUser;

    const { createClient: createForSimilar } = await import('@/lib/supabase/server');
    const supabaseForSimilar = await createForSimilar();
    const { data: similarRows } = await supabaseForSimilar
      .from('listings')
      .select('id,slug,title,year,make,model,price,mileage,location,state,condition,body_style,images,featured,listed_at')
      .eq('status', 'approved')
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .eq('make', car.make)
      .neq('id', car.id)
      .limit(4);
    const similar = (similarRows ?? []).map((r: any) => ({
      id: r.id, slug: r.slug, title: r.title,
      year: r.year, make: r.make, model: r.model,
      price: r.price, mileage: r.mileage,
      location: r.location ?? '', state: r.state ?? '',
      condition: r.condition, bodyStyle: r.body_style,
      images: r.images ?? [], featured: r.featured ?? false,
      listedAt: r.listed_at ?? '',
      sellerId: '', sellerName: '', sellerPhone: '',
      transmission: '', engine: null, color: null, description: '',
    }));

    const mapAddressParts = [(dealer as any)?.address, (dealer as any)?.location ?? car.location, (dealer as any)?.state ?? car.state, (dealer as any)?.zip].filter(Boolean);
    const mapQuery = encodeURIComponent(mapAddressParts.join(', '));
    const mapSrc = `https://maps.google.com/maps?q=${mapQuery}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
    const mapsLink = `https://maps.google.com/?q=${mapQuery}`;

    const canonicalUrl = `${BASE_URL}/listings/${makeSeg}/${modelSeg}/${car.id}/${car.slug}`;

    const conditionMap: Record<string, string> = {
      'New':       'https://schema.org/NewCondition',
      'Excellent': 'https://schema.org/UsedCondition',
      'Good':      'https://schema.org/UsedCondition',
      'Fair':      'https://schema.org/UsedCondition',
      'Project':   'https://schema.org/DamagedCondition',
    };

    const jsonLd = [
      {
        '@context': 'https://schema.org',
        '@type': 'Vehicle',
        name: car.title,
        description: car.description ?? '',
        url: canonicalUrl,
        image: car.images ?? [],
        vehicleModelDate: String(car.year),
        brand: { '@type': 'Brand', name: car.make },
        model: car.model,
        bodyType: car.bodyStyle,
        color: car.color ?? undefined,
        driveWheelConfiguration: (car as any).driveType ?? undefined,
        fuelType: (car as any).fuelType ?? undefined,
        numberOfForwardGears: (car as any).numSpeeds ?? undefined,
        vehicleEngine: (car as any).engine ? { '@type': 'EngineSpecification', name: (car as any).engine } : undefined,
        mileageFromOdometer: car.mileage ? { '@type': 'QuantitativeValue', value: car.mileage, unitCode: 'SMI' } : undefined,
        vehicleCondition: conditionMap[car.condition] ?? 'https://schema.org/UsedCondition',
        offers: {
          '@type': 'Offer',
          price: car.price > 0 ? car.price : undefined,
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock',
          url: canonicalUrl,
          seller: dealer
            ? { '@type': 'AutoDealer', name: car.sellerName, url: `${BASE_URL}/dealers/${(dealer as any).slug}` }
            : { '@type': 'Person', name: car.sellerName },
        },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
          { '@type': 'ListItem', position: 2, name: 'Listings', item: `${BASE_URL}/listings` },
          { '@type': 'ListItem', position: 3, name: car.make, item: `${BASE_URL}/listings/${makeSeg}` },
          { '@type': 'ListItem', position: 4, name: car.model, item: `${BASE_URL}/listings/${makeSeg}/${modelSeg}` },
          { '@type': 'ListItem', position: 5, name: car.title, item: canonicalUrl },
        ],
      },
    ];

    return (
      <>
        {jsonLd.map((schema, i) => (
          <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
        ))}
        {car.sellerId && <ViewTracker listingId={car.id} dealerId={car.sellerId} />}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <nav className="text-sm text-zinc-500 mb-6 flex flex-wrap gap-2">
          <Link href="/" className="hover:text-red-600">Home</Link><span>/</span>
          <Link href="/listings" className="hover:text-red-600">Listings</Link><span>/</span>
          <Link href={`/listings/${makeSeg}`} className="hover:text-red-600">{car.make}</Link><span>/</span>
          <Link href={`/listings/${makeSeg}/${modelSeg}`} className="hover:text-red-600">{car.model}</Link><span>/</span>
          <span className="text-zinc-800">{car.title}</span>
        </nav>

        {(car as any).isSold && (
          <div className="mb-6 bg-zinc-900 text-white rounded-2xl px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏁</span>
              <div>
                <p className="font-bold text-lg leading-tight">This vehicle has sold</p>
                <p className="text-zinc-400 text-sm">This listing is kept online for reference. Browse similar vehicles below.</p>
              </div>
            </div>
            <Link href={`/listings?make=${encodeURIComponent(car.make)}`}
              className="shrink-0 bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors">
              View Similar Listings →
            </Link>
          </div>
        )}

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

            {/* Specs — 4-column layout */}
            <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                {/* Details */}
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
                {/* Exterior */}
                <div>
                  <h3 className="text-xs font-extrabold italic text-red-600 uppercase tracking-wider mb-2 pb-2 border-b-2 border-red-600">Exterior</h3>
                  <dl className="space-y-3">
                    <div><dt className="text-xs text-zinc-400 uppercase tracking-wide">Body Style</dt><dd className="font-bold text-zinc-900">{car.bodyStyle}</dd></div>
                    {car.doors && <div><dt className="text-xs text-zinc-400 uppercase tracking-wide">Doors</dt><dd className="font-bold text-zinc-900">{car.doors}</dd></div>}
                    <div><dt className="text-xs text-zinc-400 uppercase tracking-wide">Body Color</dt><dd className="font-bold text-zinc-900">{car.color}</dd></div>
                    {car.rearWheelSpec && <div><dt className="text-xs text-zinc-400 uppercase tracking-wide">Rear Wheel Specification</dt><dd className="font-bold text-zinc-900">{car.rearWheelSpec}</dd></div>}
                  </dl>
                </div>
                {/* Engine */}
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
                {/* Interior */}
                <div>
                  <h3 className="text-xs font-extrabold italic text-red-600 uppercase tracking-wider mb-2 pb-2 border-b-2 border-red-600">Interior</h3>
                  <dl className="space-y-3">
                    {car.interiorColor && <div><dt className="text-xs text-zinc-400 uppercase tracking-wide">Interior Color</dt><dd className="font-bold text-zinc-900">{car.interiorColor}</dd></div>}
                    {car.seatMaterial && <div><dt className="text-xs text-zinc-400 uppercase tracking-wide">Seat Material</dt><dd className="font-bold text-zinc-900">{car.seatMaterial}</dd></div>}
                    {car.seatingType && <div><dt className="text-xs text-zinc-400 uppercase tracking-wide">Seating Type</dt><dd className="font-bold text-zinc-900">{car.seatingType}</dd></div>}
                  </dl>
                </div>
              </div>

              {/* Options */}
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

            {car.price > 0 && <FinancingCalculator price={car.price} />}
          </div>

          <div className="space-y-5 lg:sticky lg:top-24">
            <div className="hidden lg:block bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-xl font-extrabold text-zinc-900 leading-tight">{car.title}</p>
                <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border ${CONDITION_COLORS[car.condition]}`}>{car.condition}</span>
              </div>
              <p className="text-3xl font-bold text-red-600 mt-2 mb-5">{formatPrice(car.price)}</p>

              <div className="border-t border-zinc-100 pt-4 mb-4">
                <p className="text-xs text-zinc-400 uppercase tracking-wide font-semibold mb-2">{dealer ? 'Dealer' : 'Private Seller'}</p>
                {dealer ? (
                  <>
                    <Link href={`/dealers/${dealer.slug}`} className="font-bold text-red-600 hover:underline block">{car.sellerName}</Link>
                    <a href={mapsLink} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-red-600 transition-colors mt-1 w-fit">
                      <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                      {mapAddressParts.join(', ')}
                    </a>
                    {dealer.since && <p className="text-xs text-zinc-400 mt-0.5">Est. {dealer.since}</p>}
                    <p className="text-sm text-zinc-500 mt-1">{formatPhone(car.sellerPhone)}</p>
                  </>
                ) : (
                  <p className="text-sm text-zinc-500">{car.location}{car.state ? `, ${car.state}` : ''}</p>
                )}
              </div>

              {dealer ? (
                <a href={`tel:${car.sellerPhone.replace(/\D/g, '')}`}
                  className="block w-full bg-red-600 hover:bg-red-700 text-white font-bold text-center py-3 rounded-xl transition-colors mb-3">
                  Call Dealer
                </a>
              ) : (
                <p className="text-xs text-zinc-400 text-center mb-3">Contact this seller using the form below</p>
              )}
              {dealer && (
                <Link href={`/dealers/${dealer.slug}`}
                  className="block w-full border-2 border-red-600 text-red-600 hover:bg-red-50 font-bold py-3 rounded-xl transition-colors text-sm text-center mb-3">
                  View All Dealer Listings
                </Link>
              )}
              <WatchlistButton carId={car.id} price={car.price} />
              {dealer && (
                <div className="mb-3">
                  <MakeOfferButton
                    carId={car.id}
                    carTitle={car.title}
                    askingPrice={car.price}
                    dealerId={car.sellerId}
                    isLoggedIn={isLoggedIn}
                  />
                </div>
              )}
              <ContactSellerForm
                carId={car.id}
                carTitle={car.title}
                sellerName={car.sellerName}
                sellerEmail={(car as any).sellerEmail}
              />
              {car.lotNumber && <p className="text-xs text-zinc-400 text-center mt-4">Lot # {car.lotNumber}</p>}

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
              <p className="text-xs text-zinc-400 uppercase tracking-wide font-semibold mb-2">{dealer ? 'Dealer' : 'Private Seller'}</p>
              {dealer ? (
                <>
                  <Link href={`/dealers/${dealer.slug}`} className="font-bold text-red-600 hover:underline block">{car.sellerName}</Link>
                  <p className="text-sm text-zinc-500 mb-4">{formatPhone(car.sellerPhone)}</p>
                  <a href={`tel:${car.sellerPhone.replace(/\D/g, '')}`}
                    className="block w-full bg-red-600 text-white font-bold text-center py-3 rounded-xl mb-3">
                    Call Dealer
                  </a>
                </>
              ) : (
                <p className="text-sm text-zinc-500 mb-4">{car.location}{car.state ? `, ${car.state}` : ''}</p>
              )}
              {dealer && (
                <Link href={`/dealers/${dealer.slug}`}
                  className="block w-full border-2 border-red-600 text-red-600 font-bold text-center py-2.5 rounded-xl text-sm">
                  View All Listings
                </Link>
              )}
            </div>

            <AdSlot carState={car.state} pagePath={`/listings/${makeSeg}/${modelSeg}/${car.id}/${car.slug}`} />
          </div>
        </div>

      </div>
      </>
    );
  }

  // ── Make page: /listings/dodge ──
  if (segments.length === 1) {
    const make = makeFromSegment(segments[0]);
    if (!make) notFound();

    const { createClient: createForMake } = await import('@/lib/supabase/server');
    const supabaseForMake = await createForMake();
    const { data: makeRows } = await supabaseForMake
      .from('listings')
      .select('id,slug,title,year,make,model,price,mileage,location,state,condition,body_style,images,featured,listed_at,transmission,engine,color,description,seller_name,seller_phone')
      .eq('status', 'approved')
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .eq('make', make)
      .order('listed_at', { ascending: false });
    const cars = (makeRows ?? []).map((r: any) => ({
      id: r.id, slug: r.slug, title: r.title,
      year: r.year, make: r.make, model: r.model,
      price: r.price, mileage: r.mileage,
      location: r.location ?? '', state: r.state ?? '',
      condition: r.condition, bodyStyle: r.body_style,
      transmission: r.transmission, engine: r.engine, color: r.color,
      images: r.images ?? [], featured: r.featured ?? false,
      listedAt: r.listed_at ?? '', sellerId: '',
      sellerName: r.seller_name ?? '', sellerPhone: r.seller_phone ?? '',
      description: r.description,
    }));
    const models = [...new Set(cars.map((c: any) => c.model))].sort();

    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <nav className="text-sm text-zinc-500 mb-6 flex gap-2">
          <Link href="/" className="hover:text-red-600">Home</Link><span>/</span>
          <Link href="/listings" className="hover:text-red-600">Listings</Link><span>/</span>
          <span className="text-zinc-800">{make}</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-zinc-900">{make} Cars For Sale</h1>
          <p className="text-zinc-500 mt-1">{cars.length} listing{cars.length !== 1 ? 's' : ''}</p>
        </div>

        {models.length > 1 && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">Browse by Model</h2>
            <div className="flex flex-wrap gap-2">
              {models.map((model: string) => {
                const count = cars.filter((c: any) => c.model === model).length;
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
          {cars.map((car: any) => <CarCard key={car.id} car={car} />)}
        </div>
      </div>
    );
  }

  // ── Make + Model page: /listings/dodge/charger ──
  if (segments.length === 2) {
    const make = makeFromSegment(segments[0]);
    if (!make) notFound();

    const { createClient: createForModel } = await import('@/lib/supabase/server');
    const supabaseForModel = await createForModel();

    // Resolve the real, canonically-cased model name for this URL segment against
    // live listings — real inventory models don't come from the mock CARS array.
    const { data: modelNames } = await supabaseForModel.from('listings').select('model').eq('status', 'approved').eq('make', make);
    const model = (modelNames ?? []).find(r => toSegment(r.model) === segments[1])?.model;
    if (!model) notFound();

    const { data: modelRows } = await supabaseForModel
      .from('listings')
      .select('id,slug,title,year,make,model,price,mileage,location,state,condition,body_style,images,featured,listed_at,transmission,engine,color,description,seller_name,seller_phone')
      .eq('status', 'approved')
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .eq('make', make)
      .eq('model', model)
      .order('listed_at', { ascending: false });
    const cars = (modelRows ?? []).map((r: any) => ({
      id: r.id, slug: r.slug, title: r.title,
      year: r.year, make: r.make, model: r.model,
      price: r.price, mileage: r.mileage,
      location: r.location ?? '', state: r.state ?? '',
      condition: r.condition, bodyStyle: r.body_style,
      transmission: r.transmission, engine: r.engine, color: r.color,
      images: r.images ?? [], featured: r.featured ?? false,
      listedAt: r.listed_at ?? '', sellerId: '',
      sellerName: r.seller_name ?? '', sellerPhone: r.seller_phone ?? '',
      description: r.description,
    }));

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
          <p className="text-zinc-500 mt-1">{cars.length} listing{cars.length !== 1 ? 's' : ''}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {cars.map((car: any) => <CarCard key={car.id} car={car} />)}
        </div>
      </div>
    );
  }

  notFound();
}
