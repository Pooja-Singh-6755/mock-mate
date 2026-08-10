import { useEffect, useState } from "react";
import './InterviewLoader.css';

export const MIN_LOADER_MS = 3200; 

const LOADING_STEPS = [
  'Waking up your interviewer… ☕',
  'Sizing up your role questions…',
  'Tuning the difficulty…',
  'Shuffling the question deck…',
  'Almost ready — polishing the first question…',
];

export default function InterviewLoader() {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (stepIndex >= LOADING_STEPS.length - 1) return;
    const stepDuration = MIN_LOADER_MS / LOADING_STEPS.length;
    const timer = setTimeout(() => setStepIndex((i) => i + 1), stepDuration);
    return () => clearTimeout(timer);
  }, [stepIndex]);

  const progressPct = Math.round(((stepIndex + 1) / LOADING_STEPS.length) * 100);

  return (
    <div className="ti-loader-card">
      <div className="ti-loader-glow" />
      <div className="ti-loader-ring-wrap">
        <div className="ti-loader-ring" />
        <div className="ti-loader-core">🧠</div>
      </div>

      <p className="ti-loader-title">Building your mock interview</p>

      <div className="ti-loader-text-wrap">
        <p key={stepIndex} className="ti-loader-text">
          {LOADING_STEPS[stepIndex]}
        </p>
      </div>

      <div className="ti-loader-progress-bg">
        <div
          className="ti-loader-progress-fill"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="ti-loader-dots">
        <span className="ti-loader-dot" />
        <span className="ti-loader-dot" />
        <span className="ti-loader-dot" />
      </div>
    </div>
  );
}