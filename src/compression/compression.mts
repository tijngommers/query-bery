// @author Tijn Gommers
// @date 2026-03-03

import {
  brotliCompressSync,
  brotliDecompressSync,
  deflateSync,
  gunzipSync,
  gzipSync,
  inflateSync,
  zstdCompressSync,
  zstdDecompressSync,
} from 'node:zlib';

export type CompressionAlgorithm = 'zstd' | 'gzip' | 'brotli' | 'deflate';

// Compression envelope layout (13 bytes total):
// - 4 bytes magic marker (e.g. FBC1/ZST1) to identify compressed payload format
// - 1 byte algorithm id (currently zstd = 1)
// - 4 bytes original (uncompressed) payload size (UInt32LE)
// - 4 bytes compressed payload size (UInt32LE)
export const COMPRESSION_ALGORITHM_ZSTD_ID: number = 1;
export const COMPRESSION_ALGORITHM_GZIP_ID: number = 2;
export const COMPRESSION_ALGORITHM_BROTLI_ID: number = 3;
export const COMPRESSION_ALGORITHM_DEFLATE_ID: number = 4;
export const COMPRESSION_ENVELOPE_HEADER_SIZE: number = 4 + 1 + 4 + 4;
// Magic markers are custom format identifiers:
// - FBC1: FreeBlock compressed payload envelope, version 1
// - ZST1: Node-storage zstd payload envelope, version 1
export const FREEBLOCK_COMPRESSED_PAYLOAD_MAGIC: Buffer = Buffer.from('FBC1', 'ascii');
export const NODE_STORAGE_COMPRESSED_PAYLOAD_MAGIC: Buffer = Buffer.from('ZST1', 'ascii');
export const DEFAULT_COMPRESSION_ALGORITHM: CompressionAlgorithm = 'zstd';
export const COMPRESSION_ALGORITHM_ENV_VAR = 'COMPRESSION_ALGO';

const COMPRESSION_ALGORITHM_ID_MAP: Record<CompressionAlgorithm, number> = {
  zstd: COMPRESSION_ALGORITHM_ZSTD_ID,
  gzip: COMPRESSION_ALGORITHM_GZIP_ID,
  brotli: COMPRESSION_ALGORITHM_BROTLI_ID,
  deflate: COMPRESSION_ALGORITHM_DEFLATE_ID,
};

const COMPRESSION_ID_ALGORITHM_MAP: Record<number, CompressionAlgorithm> = {
  [COMPRESSION_ALGORITHM_ZSTD_ID]: 'zstd',
  [COMPRESSION_ALGORITHM_GZIP_ID]: 'gzip',
  [COMPRESSION_ALGORITHM_BROTLI_ID]: 'brotli',
  [COMPRESSION_ALGORITHM_DEFLATE_ID]: 'deflate',
};

export function getCompressionAlgorithmId(algorithm: CompressionAlgorithm): number {
  return COMPRESSION_ALGORITHM_ID_MAP[algorithm];
}

export function getCompressionAlgorithmById(id: number): CompressionAlgorithm | null {
  return COMPRESSION_ID_ALGORITHM_MAP[id] ?? null;
}

export function parseCompressionAlgorithm(
  value: string | undefined,
  fallback: CompressionAlgorithm = DEFAULT_COMPRESSION_ALGORITHM,
): CompressionAlgorithm {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'zstd' || normalized === 'gzip' || normalized === 'brotli' || normalized === 'deflate') {
    return normalized;
  }

  return fallback;
}

export interface CompressionOptions {
  algorithm: CompressionAlgorithm;
  minSizeBytes?: number;
}

export interface CompressionResult {
  algorithm: CompressionAlgorithm;
  originalSize: number;
  compressedSize: number;
  payload: Buffer;
}

export class CompressionService {
  private readonly options: CompressionOptions;

  constructor(options: CompressionOptions = { algorithm: 'zstd', minSizeBytes: 0 }) {
    this.options = options;
  }

  getOptions(): CompressionOptions {
    return this.options;
  }

  compress(data: Buffer): CompressionResult {
    if (!Buffer.isBuffer(data)) {
      throw new Error('CompressionService.compress expects a Buffer');
    }

    const algorithm = this.options.algorithm;
    let compressed: Buffer;

    switch (algorithm) {
      case 'zstd':
        compressed = zstdCompressSync(data);
        break;
      case 'gzip':
        compressed = gzipSync(data);
        break;
      case 'brotli':
        compressed = brotliCompressSync(data);
        break;
      case 'deflate':
        compressed = deflateSync(data);
        break;
      default:
        throw new Error(`Compression algorithm '${String(algorithm)}' is not supported`);
    }

    return {
      algorithm,
      originalSize: data.length,
      compressedSize: compressed.length,
      payload: compressed,
    };
  }

  decompress(compressed: CompressionResult): Buffer {
    if (!Buffer.isBuffer(compressed.payload)) {
      throw new Error('CompressionService.decompress expects CompressionResult.payload to be a Buffer');
    }

    let decompressed: Buffer;
    switch (compressed.algorithm) {
      case 'zstd':
        decompressed = zstdDecompressSync(compressed.payload);
        break;
      case 'gzip':
        decompressed = gunzipSync(compressed.payload);
        break;
      case 'brotli':
        decompressed = brotliDecompressSync(compressed.payload);
        break;
      case 'deflate':
        decompressed = inflateSync(compressed.payload);
        break;
      default:
        throw new Error(`Decompression algorithm '${compressed.algorithm as string}' is not supported`);
    }

    if (decompressed.length !== compressed.originalSize) {
      throw new Error('Decompressed payload size does not match originalSize');
    }
    return decompressed;
  }
}
