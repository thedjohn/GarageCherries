import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resizeImageFile, resizeImageFiles } from '@/lib/resizeImage';

function makeBitmap(width: number, height: number) {
  return { width, height, close: vi.fn() };
}

function makeFakeCanvas(ctx: any, blobResult: Blob | null) {
  return {
    width: 0,
    height: 0,
    getContext: vi.fn(() => ctx),
    toBlob: vi.fn((cb: (b: Blob | null) => void) => cb(blobResult)),
  };
}

const originalCreateElement = document.createElement.bind(document);
let createElementSpy: any;

beforeEach(() => {
  vi.restoreAllMocks();
});
afterEach(() => {
  vi.unstubAllGlobals();
  if (createElementSpy) createElementSpy.mockRestore();
});

describe('resizeImageFile', () => {
  it('returns the original file unchanged for unsupported types', async () => {
    const file = new File(['data'], 'photo.heic', { type: 'image/heic' });
    const result = await resizeImageFile(file);
    expect(result).toBe(file);
  });

  it('falls back to the original file when decoding fails', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('decode failed')));
    const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
    const result = await resizeImageFile(file);
    expect(result).toBe(file);
  });

  it('returns the original file when already small enough', async () => {
    const bitmap = makeBitmap(800, 600);
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(bitmap));
    const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
    const result = await resizeImageFile(file);
    expect(result).toBe(file);
    expect(bitmap.close).toHaveBeenCalledOnce();
  });

  it('returns the original file when canvas 2d context is unavailable', async () => {
    const bitmap = makeBitmap(4000, 3000);
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(bitmap));
    const fakeCanvas = makeFakeCanvas(null, null);
    createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) =>
      tag === 'canvas' ? (fakeCanvas as any) : originalCreateElement(tag),
    );
    const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
    const result = await resizeImageFile(file);
    expect(result).toBe(file);
    expect(bitmap.close).toHaveBeenCalledOnce();
  });

  it('returns the original file when toBlob resolves null', async () => {
    const bitmap = makeBitmap(4000, 3000);
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(bitmap));
    const ctx = { drawImage: vi.fn() };
    const fakeCanvas = makeFakeCanvas(ctx, null);
    createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) =>
      tag === 'canvas' ? (fakeCanvas as any) : originalCreateElement(tag),
    );
    const file = new File(['data'], 'photo.png', { type: 'image/png' });
    const result = await resizeImageFile(file);
    expect(result).toBe(file);
  });

  it('resizes and re-encodes a large image as JPEG, downscaling to fit 1920px', async () => {
    const bitmap = makeBitmap(4000, 2000);
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(bitmap));
    const ctx = { drawImage: vi.fn() };
    const blob = new Blob(['resized'], { type: 'image/jpeg' });
    const fakeCanvas = makeFakeCanvas(ctx, blob);
    createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) =>
      tag === 'canvas' ? (fakeCanvas as any) : originalCreateElement(tag),
    );
    const file = new File(['data'], 'photo.webp', { type: 'image/webp' });
    const result = await resizeImageFile(file);

    expect(fakeCanvas.width).toBe(1920);
    expect(fakeCanvas.height).toBe(960); // 4000x2000 scaled to fit 1920 on the long edge
    expect(ctx.drawImage).toHaveBeenCalledWith(bitmap, 0, 0, 1920, 960);
    expect(result.name).toBe('photo.jpg');
    expect(result.type).toBe('image/jpeg');
    expect(bitmap.close).toHaveBeenCalledOnce();
  });
});

describe('resizeImageFiles', () => {
  it('resizes multiple files in parallel', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(makeBitmap(500, 500)));
    const files = [
      new File(['a'], 'a.jpg', { type: 'image/jpeg' }),
      new File(['b'], 'b.jpg', { type: 'image/jpeg' }),
    ];
    const results = await resizeImageFiles(files);
    expect(results).toHaveLength(2);
    expect(results[0]).toBe(files[0]);
    expect(results[1]).toBe(files[1]);
  });
});
