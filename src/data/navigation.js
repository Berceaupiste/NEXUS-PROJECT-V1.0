export const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: 'overview', title: 'Operations overview' },
  { id: 'network', label: 'System Network', icon: 'network', title: 'System network' },
  { id: 'lab', label: 'Simulation Lab', icon: 'lab', title: 'Simulation lab' },
  { id: 'comparison', label: 'Scenario Comparison', icon: 'compare', title: 'Scenario comparison' },
  { id: 'events', label: 'Event History', icon: 'history', title: 'Event history' },
  { id: 'docs', label: 'Documentation', icon: 'docs', title: 'Model documentation' },
  { id: 'settings', label: 'Settings', icon: 'settings', title: 'Settings' },
];

export const VIEW_BY_ID = Object.fromEntries(NAV_ITEMS.map((item) => [item.id, item]));
