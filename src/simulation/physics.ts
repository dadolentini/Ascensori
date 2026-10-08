export interface MotionParameters {
  floorHeight: number;
  speed: number;
  acceleration: number;
}
export interface MotionSegment {
  from: number;
  to: number;
  startedAt: number;
  endsAt: number;
}
/** Ideal symmetric acceleration law, PDF (5), metres and seconds. */
export function travelSeconds(from: number, to: number, p: MotionParameters): number {
  const distance = Math.abs(to - from) * p.floorHeight;
  return distance <= (p.speed * p.speed) / p.acceleration
    ? 2 * Math.sqrt(distance / p.acceleration)
    : distance / p.speed + p.speed / p.acceleration;
}
/** Continuous replay position; the scheduled segment is never changed by dispatch. */
export function motionPosition(segment: MotionSegment, now: number, p: MotionParameters): number {
  if (now <= segment.startedAt) return segment.from;
  if (now >= segment.endsAt) return segment.to;
  const distance = Math.abs(segment.to - segment.from) * p.floorHeight;
  const elapsed = now - segment.startedAt,
    total = segment.endsAt - segment.startedAt;
  const accelerationTime = Math.min(p.speed / p.acceleration, Math.sqrt(distance / p.acceleration));
  const peakSpeed = p.acceleration * accelerationTime;
  const moved =
    elapsed <= accelerationTime
      ? 0.5 * p.acceleration * elapsed * elapsed
      : elapsed >= total - accelerationTime
        ? distance - 0.5 * p.acceleration * (total - elapsed) ** 2
        : 0.5 * p.acceleration * accelerationTime ** 2 + peakSpeed * (elapsed - accelerationTime);
  return segment.from + (Math.sign(segment.to - segment.from) * moved) / p.floorHeight;
}
