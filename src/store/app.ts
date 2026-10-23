import { create } from 'zustand';
import { ROUTES } from '../app/routes';
import { enumParam } from './url-state';

/** 'home' is the landing page; every other id is a module route. */
export const HOME = 'home';
const ids = [HOME, ...ROUTES.map((r) => r.id)];
const fromUrl = () => enumParam('m', ids, HOME);

interface AppState {
  moduleId: string;
  navigate: (id: string) => void;
}

export const useAppStore = create<AppState>()((set) => ({
  moduleId: fromUrl(),
  navigate: (id) => {
    history.pushState(null, '', id === HOME ? location.pathname : `?m=${encodeURIComponent(id)}`);
    set({ moduleId: id });
  },
}));

window.addEventListener('popstate', () => useAppStore.setState({ moduleId: fromUrl() }));
