// @author Tijn Gommers
// @date 2026-03-03

import { zstdCompressSync, zstdDecompressSync } from 'node:zlib';

export type CompressionAlgorithm = 'zstd';

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

    const compressed = zstdCompressSync(data);
    return {
      algorithm: 'zstd',
      originalSize: data.length,
      compressedSize: compressed.length,
      payload: compressed,
    };
  }

  decompress(compressed: CompressionResult): Buffer {
    if (!Buffer.isBuffer(compressed.payload)) {
      throw new Error('CompressionService.decompress expects CompressionResult.payload to be a Buffer');
    }

    if (compressed.algorithm !== 'zstd') {
      throw new Error(`Decompression algorithm '${compressed.algorithm as string}' is not supported`);
    }

    const decompressed = zstdDecompressSync(compressed.payload);
    if (decompressed.length !== compressed.originalSize) {
      throw new Error('Decompressed payload size does not match originalSize');
    }
    return decompressed;
  }
}
