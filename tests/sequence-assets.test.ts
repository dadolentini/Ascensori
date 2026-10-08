import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import manifest from '../src/journey/sequence/manifest.json';

describe('supplied photographic frames', () => {
  it('starts at the inspected complete building instead of blindly sorting archive names', () => {
    expect(manifest.frames[0].source).toContain('17_44_44-1');
    expect(manifest.frames.findIndex((f) => f.phase === 'turn')).toBeGreaterThan(6);
    expect(manifest.frames.at(-1)!.phase).toBe('elevator');
    expect(manifest.complete).toBe(true);
    expect(manifest.frames.at(-2)!.source).toContain('17_44_51-6');
    expect(manifest.frames.at(-1)!.source).toBe('Media ascensore/Atrio moderno con ascensore aperto.png');
  });
  it('preserves every original PNG byte and resolves every manifest URL', () => {
    expect(new Set(manifest.frames.map((frame) => frame.url)).size).toBe(manifest.frames.length);
    for (const frame of manifest.frames) {
      const bytes = readFileSync(`public${decodeURI(frame.url)}`);
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(frame.sha256);
      expect(bytes.subarray(1, 4).toString()).toBe('PNG');
      expect(bytes.readUInt32BE(16)).toBe(manifest.width);
      expect(bytes.readUInt32BE(20)).toBe(manifest.height);
    }
  });
});
