import Brand from './Brand.jsx';
import Icon from './Icons.jsx';
import { NAV_ITEMS } from '../data/navigation.js';

export default function Sidebar({ current, onNavigate, open, onClose }) {
  return (
    <aside className={`sidebar ${open ? 'is-open' : ''}`} aria-label="Primary navigation">
      <div className="sidebar-head">
        <Brand />
        <button className="icon-btn sidebar-close" onClick={onClose} aria-label="Close navigation" type="button">
          <Icon name="close" />
        </button>
      </div>

      <nav className="nav">
        <div className="nav-label">Workspace</div>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`nav-item ${current === item.id ? 'is-active' : ''}`}
            onClick={() => onNavigate(item.id)}
            aria-current={current === item.id ? 'page' : undefined}
          >
            <Icon name={item.icon} size={15} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-foot">
        <div className="model-badge">
          <span className="model-badge-dot" aria-hidden="true" />
          Deterministic model
        </div>
        <p className="sidebar-note">
          Educational cascade simulator. Values are modelled, not measured. Not a predictive tool.
        </p>
        <div className="sidebar-meta mono">NEXUS v1.0</div>
      </div>
    </aside>
  );
}
