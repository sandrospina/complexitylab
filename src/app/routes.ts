import { lazy } from 'react';
import type { ComponentType, LazyExoticComponent } from 'react';

export interface Route {
  id: string;
  title: string;
  component: LazyExoticComponent<ComponentType>;
}

// Each module is its own chunk so the first paint only loads the module in the URL.
export const ROUTES: Route[] = [
  { id: 'search', title: 'Search', component: lazy(() => import('../modules/search/SearchModule')) },
  { id: 'sorting', title: 'Sorting', component: lazy(() => import('../modules/sorting/SortingModule')) },
  { id: 'time-space', title: 'Time–space', component: lazy(() => import('../modules/time-space/TimeSpaceModule')) },
  { id: 'graphs', title: 'Graphs', component: lazy(() => import('../modules/graphs/GraphsModule')) },
  {
    id: 'growth-wall',
    title: 'Growth-rate wall',
    component: lazy(() => import('../modules/growth-wall/GrowthWallModule')),
  },
];
