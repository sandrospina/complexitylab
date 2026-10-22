import { encodeCnf } from '../../algorithms/sat/cnf';
import { TABS, useSatStore } from '../../store/sat';
import type { Tab } from '../../store/sat';
import { useUrlParams } from '../../store/url-state';
import { ExperimentsTab } from './ExperimentsTab';
import { LectureBar, LectureTab } from './LectureTab';
import { WorkspaceTab } from './WorkspaceTab';

const TAB_LABEL: Record<Tab, string> = { lecture: 'Lecture', workspace: 'Formula & solvers', experiments: 'Experiments' };

export default function SatModule() {
  const { tab, cnf, preset, seed, heuristic, propagate, pure, step, lecture } = useSatStore();
  const { setTab } = useSatStore.getState();
  useUrlParams('sat', {
    tab,
    ...(preset === 'custom' ? { f: encodeCnf(cnf) } : { preset, seed }),
    h: heuristic,
    up: propagate ? 1 : 0,
    pl: pure ? 1 : 0,
    step,
    ls: lecture,
  });
  return (
    <div className="stack">
      <div className="tabs" role="tablist" aria-label="SAT views">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>
            {TAB_LABEL[t]}
          </button>
        ))}
      </div>
      {tab !== 'lecture' && <LectureBar />}
      <div role="tabpanel" aria-label={TAB_LABEL[tab]}>
        {tab === 'lecture' && <LectureTab />}
        {tab === 'workspace' && <WorkspaceTab />}
        {tab === 'experiments' && <ExperimentsTab />}
      </div>
    </div>
  );
}
