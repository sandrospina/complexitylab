import { COMPLEXITY_CLASSES, growth } from './complexity';
import type { ComplexityClass } from './complexity';

export interface Point {
  n: number;
  y: number;
}

export interface Fit {
  cls: ComplexityClass;
  /** y ≈ a · f(n) + b */
  a: number;
  b: number;
  /** Root-mean-square relative error; lower is better. */
  error: number;
}

/**
 * Weighted least squares of y = a·f(n) + b with weights 1/y², so that small and large n
 * count equally. Classes whose growth overflows on the data are skipped, and fits with a
 * negative slope fall back to a constant, so a wrong shape cannot win by bending.
 */
function fitClass(cls: ComplexityClass, pts: Point[]): Fit | undefined {
  const fs = pts.map((p) => growth(cls, p.n));
  if (fs.some((f) => !Number.isFinite(f))) return undefined;

  let sw = 0, swf = 0, swff = 0, swy = 0, swfy = 0;
  pts.forEach((p, i) => {
    const w = 1 / Math.max(p.y, 1) ** 2;
    const f = fs[i]!;
    sw += w;
    swf += w * f;
    swff += w * f * f;
    swy += w * p.y;
    swfy += w * f * p.y;
  });

  const det = sw * swff - swf * swf;
  let a = 0;
  let b = swy / sw;
  if (cls !== '1' && Math.abs(det) > 1e-12 * sw * swff) {
    const a2 = (sw * swfy - swf * swy) / det;
    if (a2 > 0) {
      a = a2;
      b = (swy - a * swf) / sw;
    }
  }

  const sq = pts.reduce((s, p, i) => {
    const r = (p.y - (a * fs[i]! + b)) / Math.max(p.y, 1);
    return s + r * r;
  }, 0);
  return { cls, a, b, error: Math.sqrt(sq / pts.length) };
}

/** All fittable classes, best first. */
export function fitAll(pts: Point[]): Fit[] {
  return COMPLEXITY_CLASSES.map((c) => fitClass(c, pts))
    .filter((f): f is Fit => f !== undefined)
    .sort((x, y) => x.error - y.error);
}

export function bestFit(pts: Point[]): Fit {
  const [best] = fitAll(pts);
  if (!best) throw new Error('no class fits the data');
  return best;
}

export function extrapolate(fit: Fit, n: number): number {
  return fit.a * growth(fit.cls, n) + fit.b;
}
