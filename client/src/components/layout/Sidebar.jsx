import { NavLink } from "react-router";
import "./Sidebar.css";

// Weekly goal progress — replace with real data from your API/context.
const WEEKLY_GOAL = { completed: 0, target: 5 };

// Exact icon paths pulled from the mockup — plain inline SVG, no icon library needed.
const ICONS = {
  home: (
    <>
      <path d="M3 11l9-7 9 7" />
      <path d="M5 10v10h14V10" />
      <path d="M9 20v-6h6v6" />
    </>
  ),
  setup: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </>
  ),
  videointerview: (
    <>
      <rect x="2" y="6" width="14" height="12" rx="2.5" />
      <path d="M16 10.5l6-3.5v10l-6-3.5" />
    </>
  ),
  codingsandbox: <path d="M8.5 7L3.5 12l5 5M15.5 7l5 5-5 5" />,
  history: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5.5l3.5 2" />
    </>
  ),
  analytics: <path d="M4 20V11M12 20V4M20 20v-8" />,
  tips: (
    <path d="M9.5 18h5M10 21.5h4M12 2.5a6.2 6.2 0 0 0-3.8 11.1c.9.9 1.3 1.8 1.3 2.9h5c0-1.1.4-2 1.3-2.9A6.2 6.2 0 0 0 12 2.5z" />
  ),
  profile: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 21c0-4.1 3.8-6.5 7.5-6.5s7.5 2.4 7.5 6.5" />
    </>
  ),
};

function NavIcon({ name }) {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24">
      {ICONS[name]}
    </svg>
  );
}

const NAV_SECTIONS = [
  {
    label: null, // Home sits above the first section label, same as the mockup
    items: [{ to: "/", icon: "home", label: "Home", end: true }],
  },
  {
    label: "Practice",
    items: [
      { to: "/setup", icon: "setup", label: "New interview" },
      { to: "/videointerview", icon: "videointerview", label: "Video interview" },
      { to: "/codingsandbox", icon: "codingsandbox", label: "Coding sandbox" },
    ],
  },
  {
    label: "Progress",
    items: [
      { to: "/history", icon: "history", label: "History" },
      { to: "/analytics", icon: "analytics", label: "Analytics" },
    ],
  },
  {
    label: "More",
    items: [
      { to: "/tips", icon: "tips", label: "Practice tips" },
      { to: "/profile", icon: "profile", label: "Profile" },
    ],
  },
];

export default function Sidebar() {
  const pct = Math.min(
    100,
    Math.round((WEEKLY_GOAL.completed / WEEKLY_GOAL.target) * 100)
  );

  return (
    <div id="sidebar">
      <div>
        <div className="logo">
          <div className="logo-icon">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fff" strokeWidth="2">
              <path d="M8 9l-4 3 4 3" />
              <path d="M16 9l4 3-4 3" />
              <circle cx="12" cy="12" r="1.6" fill="#fff" stroke="none" />
            </svg>
          </div>
          <div>
            <div className="logo-text">MockMate</div>
            <div className="logo-sub">AI Interview Coach</div>
          </div>
        </div>

        {NAV_SECTIONS.map((section, i) => (
          <div key={section.label ?? `section-${i}`}>
            {section.label && <div className="nav-section-label">{section.label}</div>}
            {section.items.map(({ to, icon, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}
              >
                <NavIcon name={icon} />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        <div className="goal-box">
          <div className="goal-box-head">
            <span className="goal-box-title">
              <svg className="goal-icon" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" />
                <circle cx="12" cy="12" r="5.2" />
                <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
              </svg>
              Weekly goal
            </span>
            <span className="goal-box-pct">{pct}%</span>
          </div>
          <div className="goal-bar-bg">
            <div className="goal-bar-fill" style={{ width: `${pct}%` }} />
          </div>
          <p style={{ fontSize: "10px", color: "var(--text-dim)", margin: "6px 0 0" }}>
            {WEEKLY_GOAL.completed} of {WEEKLY_GOAL.target} interviews
          </p>
        </div>

        <div className="sidebar-credit">
          <span>v1.0 · Built by You</span>
          <a href="https://github.com" target="_blank" rel="noopener" aria-label="View on GitHub">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}