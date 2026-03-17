import { describe, expect, it } from 'vitest';
import { CompressionService } from './compression.mjs';
import {
  deserializeCompressionEnvelope,
  deserializeLegacyCompressionEnvelopeV0,
  serializeCompressionEnvelope,
} from './envelope.mjs';

describe('Compression Envelope', () => {
  it('serializes and deserializes v1 envelope correctly', () => {
    const service = new CompressionService({ algorithm: 'zstd' });
    const original = Buffer.from('hello-envelope-v1', 'utf-8');
    const compressed = service.compress(original);

    const magic = Buffer.from('TST1', 'ascii');
    const encoded = serializeCompressionEnvelope(magic, compressed);
    const decoded = deserializeCompressionEnvelope(encoded, magic);

    expect(decoded).not.toBeNull();
    expect(decoded!.algorithm).toBe(compressed.algorithm);
    expect(decoded!.originalSize).toBe(compressed.originalSize);
    expect(decoded!.compressedSize).toBe(compressed.compressedSize);

    const roundTrip = service.decompress(decoded!);
    expect(roundTrip.equals(original)).toBe(true);
  });

  it('returns null when magic does not match', () => {
    const service = new CompressionService({ algorithm: 'gzip' });
    const original = Buffer.from('magic-mismatch', 'utf-8');
    const compressed = service.compress(original);

    const encoded = serializeCompressionEnvelope(Buffer.from('ABC1', 'ascii'), compressed);
    const decoded = deserializeCompressionEnvelope(encoded, Buffer.from('XYZ1', 'ascii'));

    expect(decoded).toBeNull();
  });

  it('returns null for truncated v1 envelope payload', () => {
    const service = new CompressionService({ algorithm: 'zstd' });
    const original = Buffer.from('truncated-v1', 'utf-8');
    const compressed = service.compress(original);

    const magic = Buffer.from('TRN1', 'ascii');
    const encoded = serializeCompressionEnvelope(magic, compressed);
    const truncated = encoded.subarray(0, encoded.length - 2);

    const decoded = deserializeCompressionEnvelope(truncated, magic);
    expect(decoded).toBeNull();
  });

  it('returns null for v1 envelope with trailing bytes', () => {
    const service = new CompressionService({ algorithm: 'zstd' });
    const original = Buffer.from('trailing-v1', 'utf-8');
    const compressed = service.compress(original);

    const magic = Buffer.from('TRL1', 'ascii');
    const encoded = serializeCompressionEnvelope(magic, compressed);
    const withTrailingBytes = Buffer.concat([encoded, Buffer.from([0xaa, 0xbb])]);

    const decoded = deserializeCompressionEnvelope(withTrailingBytes, magic);
    expect(decoded).toBeNull();
  });

  it('returns null for unknown algorithm id in v1 envelope', () => {
    const service = new CompressionService({ algorithm: 'zstd' });
    const original = Buffer.from('unknown-algo-id', 'utf-8');
    const compressed = service.compress(original);

    const magic = Buffer.from('TRN1', 'ascii');
    const encoded = serializeCompressionEnvelope(magic, compressed);
    const tampered = Buffer.from(encoded);
    tampered.writeUInt8(255, 4);

    const decoded = deserializeCompressionEnvelope(tampered, magic);
    expect(decoded).toBeNull();
  });

  it('deserializes legacy v0 envelope correctly', () => {
    const service = new CompressionService({ algorithm: 'zstd' });
    const original = Buffer.from('legacy-v0-payload', 'utf-8');
    const compressed = service.compress(original);

    const magic = Buffer.from('LGC1', 'ascii');
    const legacyHeader = Buffer.alloc(13);
    magic.copy(legacyHeader, 0);
    legacyHeader.writeUInt32LE(compressed.originalSize, 4);
    legacyHeader.writeUInt32LE(compressed.compressedSize, 8);

    const legacyEncoded = Buffer.concat([legacyHeader, compressed.payload]);
    const decoded = deserializeLegacyCompressionEnvelopeV0(legacyEncoded, magic, 'zstd');

    expect(decoded).not.toBeNull();
    expect(decoded!.algorithm).toBe('zstd');

    const roundTrip = service.decompress(decoded!);
    expect(roundTrip.equals(original)).toBe(true);
  });

  it('returns null for truncated legacy v0 envelope', () => {
    const service = new CompressionService({ algorithm: 'zstd' });
    const original = Buffer.from('legacy-truncated', 'utf-8');
    const compressed = service.compress(original);

    const magic = Buffer.from('LGC1', 'ascii');
    const legacyHeader = Buffer.alloc(13);
    magic.copy(legacyHeader, 0);
    legacyHeader.writeUInt32LE(compressed.originalSize, 4);
    legacyHeader.writeUInt32LE(compressed.compressedSize, 8);

    const legacyEncoded = Buffer.concat([legacyHeader, compressed.payload]);
    const truncated = legacyEncoded.subarray(0, legacyEncoded.length - 1);

    const decoded = deserializeLegacyCompressionEnvelopeV0(truncated, magic, 'zstd');
    expect(decoded).toBeNull();
  });

  it('returns null for legacy v0 envelope with trailing bytes', () => {
    const service = new CompressionService({ algorithm: 'zstd' });
    const original = Buffer.from('legacy-trailing', 'utf-8');
    const compressed = service.compress(original);

    const magic = Buffer.from('LGC1', 'ascii');
    const legacyHeader = Buffer.alloc(13);
    magic.copy(legacyHeader, 0);
    legacyHeader.writeUInt32LE(compressed.originalSize, 4);
    legacyHeader.writeUInt32LE(compressed.compressedSize, 8);

    const legacyEncoded = Buffer.concat([legacyHeader, compressed.payload]);
    const withTrailingBytes = Buffer.concat([legacyEncoded, Buffer.from([0xcc])]);

    const decoded = deserializeLegacyCompressionEnvelopeV0(withTrailingBytes, magic, 'zstd');
    expect(decoded).toBeNull();
  });

  it('throws if magic is not 4 bytes', () => {
    const service = new CompressionService({ algorithm: 'zstd' });
    const compressed = service.compress(Buffer.from('bad-magic', 'utf-8'));

    expect(() => serializeCompressionEnvelope(Buffer.from('BAD', 'ascii'), compressed)).toThrow(
      'Envelope magic must be 4 bytes',
    );
    expect(() => deserializeCompressionEnvelope(Buffer.from([]), Buffer.from('BAD', 'ascii'))).toThrow(
      'Envelope magic must be 4 bytes',
    );
  });
});
