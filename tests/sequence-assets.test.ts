import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import manifest from '../src/journey/sequence/manifest.json';
import originals from '../src/journey/sequence/originals.json';

describe('supplied photographic frames', () => {
  it('starts at the inspected complete building instead of blindly sorting archive names', () => {
    expect(manifest.frames[0].source).toContain('17_44_44-1');
    expect(manifest.frames.findIndex((f) => f.phase === 'turn')).toBeGreaterThan(6);
    expect(manifest.frames.at(-1)!.phase).toBe('elevator');
    expect(manifest.complete).toBe(true);
    expect(manifest.frames.some((frame) => frame.id === 'original-10')).toBe(true);
    expect(manifest.frames[0].at).toBe(0);
    expect(manifest.frames.at(-1)!.at).toBe(1);
    expect(new Set(manifest.frames.map((frame) => frame.id)).size).toBe(manifest.frames.length);
    for (let i = 1; i < manifest.frames.length; i++) {
      expect(manifest.frames[i].at).toBeGreaterThan(manifest.frames[i - 1].at);
    }
  });
  it('preserves all twelve official reference photographs even when active frames are corrected', () => {
    expect(originals).toHaveLength(12);
    for (const frame of originals) {
      const bytes = readFileSync(`public${decodeURI(frame.url)}`);
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(frame.sha256);
      expect(bytes.readUInt32BE(16)).toBe(1122);
      expect(bytes.readUInt32BE(20)).toBe(1402);
    }
  });
  it('opens both leaves progressively and preserves the same stage timing independently of frame density', () => {
    const doors = manifest.frames.filter((frame) => frame.aperture !== undefined);
    expect(doors[0].aperture).toBe(0);
    expect(doors.at(-1)!.aperture).toBe(1);
    for (let i = 1; i < doors.length; i++) expect(doors[i].aperture!).toBeGreaterThan(doors[i - 1].aperture!);
    expect(manifest.frames.find((frame) => frame.id === 'original-10')!.at).toBe(.87);
  });
  it('resolves and verifies each active frame, including lossless encoded intermediates', () => {
    expect(new Set(manifest.frames.map((frame) => frame.url)).size).toBe(manifest.frames.length);
    for (const frame of manifest.frames) {
      const bytes = readFileSync(`public${decodeURI(frame.url)}`);
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(frame.sha256);
      if (bytes.subarray(1, 4).toString() === 'PNG') {
        expect(bytes.readUInt32BE(16)).toBe(manifest.width);
        expect(bytes.readUInt32BE(20)).toBe(manifest.height);
      } else {
        expect(bytes.subarray(0, 4).toString()).toBe('RIFF');
        expect(bytes.subarray(8, 12).toString()).toBe('WEBP');
        let offset = 12;
        while (offset + 8 < bytes.length && bytes.subarray(offset, offset + 4).toString() !== 'VP8L') {
          const length = bytes.readUInt32LE(offset + 4);
          offset += 8 + length + (length % 2);
        }
        expect(bytes[offset + 8]).toBe(0x2f);
        const dimensions = bytes.readUInt32LE(offset + 9);
        expect((dimensions & 0x3fff) + 1).toBe(manifest.width);
        expect(((dimensions >>> 14) & 0x3fff) + 1).toBe(manifest.height);
      }
      for (const id of frame.references) expect(originals.some((source) => source.id === id)).toBe(true);
    }
  });
});
