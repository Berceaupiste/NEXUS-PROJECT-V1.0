import { useState } from 'react';
import { SimulationProvider, useSimulation } from './state/SimulationContext.jsx';
import Sidebar from './components/Sidebar.jsx';
import TopBar from './components/TopBar.jsx';
import SaveScenarioDialog from './components/SaveScenarioDialog.jsx';
import OverviewView from './views/OverviewView.jsx';
import NetworkView from './views/NetworkView.jsx';
import SimulationLabView from './views/SimulationLabView.jsx';
import ComparisonView from './views/ComparisonView.jsx';
import EventsView from './views/EventsView.jsx';
import DocsView from './views/DocsView.jsx';
import SettingsView from './views/SettingsView.jsx';
import Icon from './components/Icons.jsx';

function Toast() {
  const { toast } = useSimulation();
  if (!toast) return null;
  const icon = toast.tone === 'error' ? 'alert' : toast.tone === 'success' ? 'check' : 'info';
  return (
    <div className={`toast toast-${toast.tone}`} role="status" aria-live="polite">
      <Icon name={icon} size={14} />
      <span>{toast.message}</span>
    </div>
  );
}

function Workspace() {
  const [view, setView] = useState('overview');
  const [navOpen, setNavOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);

  const navigate = (next) => {
    setView(next);
    setNavOpen(false);
    document.getElementById('workspace')?.scrollTo({ top: 0, behavior: 'instant' });
  };

  return (
    <div className="app-shell">
      <Sidebar current={view} onNavigate={navigate} open={navOpen} onClose={() => setNavOpen(false)} />
      {navOpen && (
        <button
          type="button"
          className="nav-scrim"
          aria-label="Close navigation"
          onClick={() => setNavOpen(false)}
        />
      )}

      <div className="app-main">
        <TopBar view={view} onMenu={() => setNavOpen(true)} onSave={() => setSaveOpen(true)} onNavigate={navigate} />
        <main className="workspace" id="workspace">
          {view === 'overview' && <OverviewView onNavigate={navigate} />}
          {view === 'network' && <NetworkView />}
          {view === 'lab' && <SimulationLabView onNavigate={navigate} />}
          {view === 'comparison' && <ComparisonView onNavigate={navigate} />}
          {view === 'events' && <EventsView />}
          {view === 'docs' && <DocsView />}
          {view === 'settings' && <SettingsView />}
        </main>
      </div>

      <SaveScenarioDialog open={saveOpen} onClose={() => setSaveOpen(false)} />
      <Toast />
    </div>
  );
}

export default function App() {
  return (
    <SimulationProvider>
      <Workspace />
    </SimulationProvider>
  );
}
