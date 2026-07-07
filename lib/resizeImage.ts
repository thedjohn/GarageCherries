// Downscales and re-encodes an image client-side before upload. Listing photos
// are frequently full-resolution phone camera shots (3-8MB, 3000-4000px+); with
// up to 30 per listing, uploading them unresized is slow on cellular for sellers
// and forces Next.js's image optimizer to do expensive first-request resizing
// for buyers. This runs before the file ever leaves the browser.

const MAX_DIMENSION = 1920;
const JPEG_QUALITY = 0.82;

export async function resizeImageFile(file: File): Promise<File> {
  // Only handle formats canvas can reliably decode/re-encode. Anything else
  // (HEIC that slipped through, GIF, etc.) is uploaded as-is.
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;

  let bitmap: ImageBitmap;
  try {
    // 'from-image' preserves EXIF rotation — without it, portrait phone
    // photos can come out sideways since createImageBitmap ignores EXIF by default.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return file; // decode failed — fall back to the original rather than block the upload
  }

  const { width, height } = bitmap;
  if (width <= MAX_DIMENSION && height <= MAX_DIMENSION) {
    bitmap.close();
    return file; // already small enough — don't re-encode and lose quality for nothing
  }

  const scale = MAX_DIMENSION / Math.max(width, height);
  const targetW = Math.round(width * scale);
  const targetH = Math.round(height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, targetW, targetH);
  bitmap.close();

  const blob = await new Promise<Blob | null>(resolve =>
    canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
  );
  if (!blob) return file;

  const newName = file.name.replace(/\.\w+$/, '') + '.jpg';
  return new File([blob], newName, { type: 'image/jpeg' });
}

export async function resizeImageFiles(files: File[]): Promise<File[]> {
  return Promise.all(files.map(resizeImageFile));
}
