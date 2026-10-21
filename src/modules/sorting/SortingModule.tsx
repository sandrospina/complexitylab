import { SORT_INPUT_KINDS } from '../../algorithms/sort/input';
import type { SortInputKind } from '../../algorithms/sort/input';
import { MAX_SORT_N, TABS, useSortingStore } from '../../store/sorting';
import type { Tab } from '../../store/sorting';
import { useUrlParams } from '../../store/url-state';
import { AdversaryTab } from './AdversaryTab';
import { ExploreTab } from './ExploreTab';
import { TreeTab } from './TreeTab';

const TAB_LABEL: Record<Tab, string> = { explore: 'Explore & race', adversary: 'Adversary', tree: 'Recursion tree' };

export default function SortingModule() {
  const { tab, algo, vs, n, preset, seed, step, treeAlgo, advAlgo, advArr } = useSortingStore();
  const { setTab, configure } = useSortingStore.getState();
  useUrlParams('sorting', {
    tab,
    algo,
    vs,
    n,
    preset,
    seed,
    step,
    talgo: treeAlgo,
    aalgo: advAlgo,
    adv: advArr.join(','),
  });

  return (
    <div className="stack">
      <div className="tabs" role="tablist" aria-label="Sorting views">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>
            {TAB_LABEL[t]}
          </button>
        ))}
      </div>

      {tab !== 'adversary' && (
        <section className="panel controls" aria-label="Input">
          <label>
            n = <span className="mono">{n}</span>
            <input
              type="range"
              min={2}
              max={MAX_SORT_N}
              value={n}
              onChange={(e) => configure({ n: Number(e.target.value) })}
              aria-label="Input size n"
            />
          </label>
          <label>
            Input
            <select value={preset} onChange={(e) => configure({ preset: e.target.value as SortInputKind })}>
              {SORT_INPUT_KINDS.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Seed
            <input
              type="number"
              value={seed}
              min={0}
              onChange={(e) => configure({ seed: Number(e.target.value) || 0 })}
              style={{ width: 80 }}
            />
          </label>
        </section>
      )}

      <div role="tabpanel" aria-label={TAB_LABEL[tab]}>
        {tab === 'explore' && <ExploreTab />}
        {tab === 'adversary' && <AdversaryTab />}
        {tab === 'tree' && <TreeTab />}
      </div>
    </div>
  );
}
