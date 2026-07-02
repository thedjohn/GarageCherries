import { NextRequest, NextResponse } from 'next/server';

function nhtsaField(results: any[], name: string): string | null {
  return results.find((r: any) => r.Variable === name)?.Value || null;
}

export async function POST(req: NextRequest) {
  const { vin, make, model, year } = await req.json();

  if (!vin) return NextResponse.json({ error: 'VIN is required' }, { status: 400 });

  const cleanVin = String(vin).trim().toUpperCase().replace(/\s+/g, '');

  // Pre-1981 vehicles use non-standard manufacturer VINs (< 17 chars)
  if (cleanVin.length !== 17) {
    return NextResponse.json({
      vinValid: true,
      preStandard: true,
      vin: cleanVin,
      verified: false,
      message: 'Pre-1981 vehicles use non-standard VIN formats. VIN saved for reference — NHTSA decode not available for this era.',
      makeMatch: null, modelMatch: null, yearMatch: null,
      nicbUrl: 'https://www.nicb.org/vincheck',
    });
  }

  // 17-char VINs must not contain I, O, or Q
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(cleanVin)) {
    return NextResponse.json({
      vinValid: false,
      message: 'VIN contains invalid characters. VINs cannot include the letters I, O, or Q.',
    });
  }

  // Call NHTSA VIN decoder (free public API, no key required)
  try {
    const nhtsaRes = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${cleanVin}?format=json`,
      { next: { revalidate: 86400 } },
    );

    if (!nhtsaRes.ok) throw new Error('NHTSA unavailable');

    const json = await nhtsaRes.json();
    const results: any[] = json.Results ?? [];

    const nhtsaMake  = nhtsaField(results, 'Make');
    const nhtsaModel = nhtsaField(results, 'Model');
    const nhtsaYear  = nhtsaField(results, 'Model Year');
    const errorCode  = nhtsaField(results, 'Error Code');

    // Error code 0 = clean decode; anything else = partial or invalid VIN
    if (errorCode && errorCode !== '0') {
      return NextResponse.json({
        vinValid: false,
        vin: cleanVin,
        message: 'NHTSA could not fully decode this VIN. It may be invalid or not in the federal database.',
        nhtsaMake, nhtsaModel, nhtsaYear,
        nicbUrl: 'https://www.nicb.org/vincheck',
      });
    }

    // Fuzzy match against stated make/model/year
    const makeMatch = nhtsaMake && make
      ? nhtsaMake.toLowerCase().includes(make.toLowerCase()) || make.toLowerCase().includes(nhtsaMake.toLowerCase())
      : null;

    const modelMatch = nhtsaModel && model
      ? nhtsaModel.toLowerCase().includes(model.toLowerCase()) || model.toLowerCase().includes(nhtsaModel.toLowerCase())
      : null;

    const yearMatch = nhtsaYear && year
      ? parseInt(nhtsaYear) === parseInt(year)
      : null;

    // null means "not provided" (can't check) — only fail on explicit false
    const verified = makeMatch !== false && modelMatch !== false && yearMatch !== false
      && (makeMatch === true || modelMatch === true || yearMatch === true);

    return NextResponse.json({
      vinValid: true,
      vin: cleanVin,
      verified,
      nhtsaMake, nhtsaModel, nhtsaYear,
      makeMatch, modelMatch, yearMatch,
      message: verified
        ? 'VIN verified — NHTSA records match the stated make, model, and year.'
        : 'VIN decoded but one or more fields do not match NHTSA records.',
      nicbUrl: 'https://www.nicb.org/vincheck',
    });
  } catch {
    // NHTSA down — don't block the listing; flag for manual review
    return NextResponse.json({
      vinValid: true,
      vin: cleanVin,
      verified: false,
      message: 'NHTSA API unavailable. VIN saved — please verify manually.',
      makeMatch: null, modelMatch: null, yearMatch: null,
      nicbUrl: 'https://www.nicb.org/vincheck',
    });
  }
}
