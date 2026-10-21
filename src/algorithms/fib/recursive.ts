import type { Instrument } from '../../engine/instrument';
import type { Algorithm } from '../../engine/runner';
import type { FibInput, FibSnapshot } from './input';

interface Call {
  k: number;
  stage: 'enter' | 'left' | 'right';
  left?: bigint;
}

/**
 * fib(k) = fib(k−1) + fib(k−2), left call first. Recursion is n deep, so it is simulated
 * with an explicit stack of calls (each marked by pushFrame/popFrame), as in quicksort.
 * With `memo`, an (n+1)-cell table caches results and a cached call returns at once.
 */
function fibRecursive(memo: boolean): Algorithm<FibInput, bigint> {
  return function* ({ n }, ins: Instrument) {
    const table: (bigint | undefined)[] = [];
    if (memo) yield ins.alloc<FibSnapshot>(n + 1, { label: 'memo table' });
    const stack: Call[] = [{ k: n, stage: 'enter' }];
    let ret = 0n;

    while (stack.length > 0) {
      const call = stack.at(-1)!;
      const { k } = call;
      if (call.stage === 'enter') {
        yield ins.pushFrame<FibSnapshot>({ label: `fib(${k})`, value: k, snapshot: { k } });
        yield ins.compare<FibSnapshot>({ label: 'k < 2?', snapshot: { k } });
        if (k < 2) {
          ret = BigInt(k);
          yield ins.popFrame();
          stack.pop();
          continue;
        }
        if (memo) {
          yield ins.read<FibSnapshot>({ indices: [k], label: 'memo lookup', snapshot: { k } });
          const hit = table[k];
          if (hit !== undefined) {
            ret = hit;
            yield ins.mark<FibSnapshot>('memo hit', { snapshot: { k } });
            yield ins.popFrame();
            stack.pop();
            continue;
          }
        }
        call.stage = 'left';
        stack.push({ k: k - 1, stage: 'enter' });
      } else if (call.stage === 'left') {
        call.left = ret;
        call.stage = 'right';
        stack.push({ k: k - 2, stage: 'enter' });
      } else {
        yield ins.read<FibSnapshot>({ label: `fib(${k - 1})`, snapshot: { k } });
        yield ins.read<FibSnapshot>({ label: `fib(${k - 2})`, snapshot: { k } });
        ret = call.left! + ret;
        if (memo) table[k] = ret;
        yield ins.write<FibSnapshot>({ indices: memo ? [k] : undefined, value: ret.toString(), snapshot: { k } });
        yield ins.popFrame();
        stack.pop();
      }
    }
    if (memo) yield ins.free<FibSnapshot>(n + 1, { label: 'memo table' });
    return ret;
  };
}

/** 2·fib(n+1) − 1 calls: Θ(φⁿ) time, n frames deep. */
export const fibNaive = fibRecursive(false);
/** 2n − 1 calls for n ≥ 1: Θ(n) time, paid for with n + 1 table cells. */
export const fibMemo = fibRecursive(true);
