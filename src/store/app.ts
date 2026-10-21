import { create } from 'zustand';
import { ROUTES } from '../app/routes';
import { enumParam } from './url-state';

const ids = ROUTES.map((r) => r.id);
const fromUrl = () => enumParam('m', ids, ids[0]!);

interface AppState {
  moduleId: string;
  navigate: (id: string) => void;
}

export const useAppStore = create<AppState>()((set) => ({
  moduleId: fromUrl(),
  navigate: (id) => {
    history.pushState(null, '', `?m=${encodeURIComponent(id)}`);
    set({ moduleId: id });
  },
}));

window.addEventListener('popstate', () => useAppStore.setState({ moduleId: fromUrl() }));
