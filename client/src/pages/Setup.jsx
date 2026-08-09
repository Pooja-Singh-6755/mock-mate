import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Setup.css';

const INTERVIEW_TYPES = [
  { key: 'text', label: 'Text Interview', path: '/interview/text' },
  { key: 'audio', label: 'Voice Interview', path: '/interview/voice' },
  { key: 'coding', label: 'Coding Round', path: '/interview/coding' },
];

export default function Setup({ candidateId }) {
  const navigate = useNavigate();
  const [role, setRole] = useState('MERN stack developer');
  const [selectedType, setSelectedType] = useState('text');

  const handleStart = () => {
    if (!role.trim()) return;

    const type = INTERVIEW_TYPES.find((t) => t.key === selectedType);

    navigate(type.path, {
      state: { candidateId, role: role.trim(), totalQuestions: 5 },
    });
  };

  return (
    <div className="setup-container">
      <h2>Start a New Interview</h2>

      <label className="setup-label">Which role are you preparing for?</label>
      <input
        value={role}
        onChange={(e) => setRole(e.target.value)}
        className="setup-input"
      />

      <label className="setup-label">Interview type</label>
      <div className="setup-type-tabs">
      
        {INTERVIEW_TYPES.map((t) => (
          <button
            key={t.key}
            className={`setup-type-tab ${selectedType === t.key ? 'active' : ''}`}
            onClick={() => setSelectedType(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <button disabled={!role.trim()} onClick={handleStart} className="setup-start-btn">
        Start Interview
      </button>
    </div>
  );
}