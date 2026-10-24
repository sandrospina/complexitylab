import { CLASS_LABEL, FIXED_CLASSES, growth, PHI } from './complexity';
import type { ComplexityClass, FixedClass } from './complexity';

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
  /** For `expc`: the fitted base c in y ≈ a · cⁿ. */
  base?: number;
}

/** A fitted-base exponential must beat the best fixed class by this factor in error to be chosen. */
export const EXPC_ADVANTAGE = 1.25;
const MIN_BASE = 1.05;
/** A fitted base this close to a named one (2 or φ) is that class, not a new one. */
const NAMED_BASE_TOLERANCE = 0.03;
const NAMED_BASES = [2, PHI];
/**
 * n^(log n) bends away from cⁿ only over several doublings of n: on a narrower range of sizes
 * either curve fits the other, so quasi-polynomial is only considered when n spans this ratio.
 */
export const QUASI_MIN_SPAN = 8;

/**
 * Weighted least squares of y = a·f(n) + b with weights 1/y², so that small and large n
 * count equally. Classes whose growth overflows on the data are skipped, and fits with a
 * negative slope fall back to a constant, so a wrong shape cannot win by bending.
 */
function fitClass(cls: FixedClass, pts: Point[]): Fit | undefined {
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

const relError = (pts: Point[], f: (n: number) => number) =>
  Math.sqrt(pts.reduce((s, p) => s + ((p.y - f(p.n)) / Math.max(p.y, 1)) ** 2, 0) / pts.length);

/**
 * y ≈ a · cⁿ with c fitted: least squares of ln y against n. Rejected unless c is clearly
 * above 1, so slow polynomial growth is not passed off as a gentle exponential.
 */
function fitExpc(pts: Point[]): Fit | undefined {
  const ps = pts.filter((p) => p.y > 0);
  if (ps.length < 3) return undefined;
  const mx = ps.reduce((s, p) => s + p.n, 0) / ps.length;
  const my = ps.reduce((s, p) => s + Math.log(p.y), 0) / ps.length;
  const sxx = ps.reduce((s, p) => s + (p.n - mx) ** 2, 0);
  if (sxx === 0) return undefined;
  const slope = ps.reduce((s, p) => s + (p.n - mx) * (Math.log(p.y) - my), 0) / sxx;
  const base = Math.exp(slope);
  if (!(base >= MIN_BASE) || !Number.isFinite(base)) return undefined;
  if (NAMED_BASES.some((b) => Math.abs(base / b - 1) < NAMED_BASE_TOLERANCE)) return undefined;
  const a = Math.exp(my - slope * mx);
  return { cls: 'expc', a, b: 0, base, error: relError(pts, (n) => a * base ** n) };
}

/**
 * All fittable classes, best first. The fitted-base exponential has a free parameter the
 * fixed classes lack, so it ranks by its error times EXPC_ADVANTAGE: exact 2ⁿ or φⁿ data keeps
 * its named class, and O(cⁿ) wins only when no fixed shape comes close. Errors within
 * rounding of each other tie, and the sort being stable, the slower-growing class wins.
 */
export function fitAll(pts: Point[]): Fit[] {
  const rank = (f: Fit) => (f.cls === 'expc' ? f.error * EXPC_ADVANTAGE : f.error);
  const ns = pts.map((p) => p.n);
  const span = Math.max(...ns) / Math.max(Math.min(...ns), 1);
  const classes = span >= QUASI_MIN_SPAN ? FIXED_CLASSES : FIXED_CLASSES.filter((c) => c !== 'quasi');
  return [...classes.map((c) => fitClass(c, pts)), fitExpc(pts)]
    .filter((f): f is Fit => f !== undefined)
    .sort((x, y) => {
      const d = rank(x) - rank(y);
      return Math.abs(d) < 1e-9 ? 0 : d;
    });
}

export function bestFit(pts: Point[]): Fit {
  const [best] = fitAll(pts);
  if (!best) throw new Error('no class fits the data');
  return best;
}

export function extrapolate(fit: Fit, n: number): number {
  return fit.a * growth(fit.cls, n, fit.base) + fit.b;
}

/** The fit's class as shown to students, with the fitted base for O(cⁿ), e.g. "O(1.21ⁿ)". */
export function fitLabel(fit: Fit): string {
  return fit.cls === 'expc' && fit.base !== undefined ? `O(${fit.base.toFixed(2)}ⁿ)` : CLASS_LABEL[fit.cls];
}
