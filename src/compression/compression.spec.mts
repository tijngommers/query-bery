// @author Tijn Gommers
// @date 2026-03-03

import { describe, it, expect } from 'vitest';
import { CompressionService } from './compression.mjs';

describe('CompressionService', () => {
  it('exposes constructor options', () => {
    const service = new CompressionService({ algorithm: 'zstd' });
    expect(service.getOptions()).toEqual({ algorithm: 'zstd' });
  });

  it('compresses and decompresses with zstd', () => {
    const service = new CompressionService({ algorithm: 'zstd' });
    const original = Buffer.from('hello world hello world hello world hello world', 'utf-8');

    const compressed = service.compress(original);
    const decompressed = service.decompress(compressed);

    expect(compressed.algorithm).toBe('zstd');
    expect(decompressed.equals(original)).toBe(true);
  });

  it('throws when trying to decompress invalid zstd payload', () => {
    const service = new CompressionService({ algorithm: 'zstd' });

    expect(() =>
      service.decompress({
        algorithm: 'zstd',
        originalSize: 1,
        compressedSize: 1,
        payload: Buffer.from([0]),
      }),
    ).toThrowError();
  });
});
