import type { Request, Scenario } from './types';
import { hashSeed, normal, seededRandom, truncatedNormal } from './random';
import { validateScenario } from './scenario';

/** Synthetic independent OD requests; there are no persistent individual agents. */
export function generateDemand(s: Scenario, seed: number): Request[] {
  const errors = validateScenario(s);
  if (errors.length) throw new RangeError(errors.join(' '));
  const requests: Request[] = [],
    physics = s.physics;
  const rng = seededRandom(hashSeed(`demand:${seed}`));
  const weights = seededRandom(hashSeed(`weights:${seed}`));
  const add = (
    born: number,
    source: number,
    dest: number,
    groupId: string,
    tripType: Request['tripType'],
    breakId?: string,
  ) => {
    requests.push({
      id: requests.length,
      born,
      source,
      dest,
      groupId,
      tripType,
      ...(breakId === undefined ? {} : { breakId }),
      weight: truncatedNormal(
        weights,
        physics.weightMean,
        physics.weightSigma,
        physics.weightMin,
        physics.weightMax,
      ),
    });
  };
  for (const g of s.groups) {
    const start = g.officeStart ?? s.officeStart,
      end = g.officeEnd ?? s.officeEnd;
    for (let i = 0; i < g.employees; i++) {
      add(normal(rng, start + s.arrivalOffset, s.arrivalSigma), 0, g.floor, g.id, 'arrival');
      add(normal(rng, end + s.departureOffset, s.departureSigma), g.floor, 0, g.id, 'departure');
      if (s.totalFloors > 2 && rng() < s.internalProbability) {
        // Pick uniformly among all OTHER upper floors, so no synthetic same-floor trip.
        let dest = 1 + Math.floor(rng() * (s.totalFloors - 2));
        if (dest >= g.floor) dest++;
        add(start + rng() * (end - start), g.floor, dest, g.id, 'internal');
      }
    }
    for (const b of g.breaks) {
      // Stable latent habit is private to generation, independent of experiment/training seeds.
      const latent = normal(
        seededRandom(hashSeed(`habit:917:${g.id}:${b.id}`)),
        0,
        s.forecast.habitSigma,
      );
      const componentRng = seededRandom(hashSeed(`break:${seed}:${g.id}:${b.id}`));
      const jitter = normal(componentRng, 0, s.forecast.dailyJitter);
      for (let i = 0; i < g.employees; i++)
        if (componentRng() < b.participation) {
          const exit = normal(componentRng, b.start + latent + jitter, b.sigma);
          add(exit, g.floor, 0, g.id, 'break_exit', b.id);
          add(exit + b.duration, 0, g.floor, g.id, 'break_return', b.id);
        }
    }
  }
  // Keep real tails outside [horizonStart,horizonEnd]; engine counts them separately.
  requests.sort((a, b) => a.born - b.born || a.id - b.id);
  return requests.map((r, id) => ({ ...r, id }));
}
