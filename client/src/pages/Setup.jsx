import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Setup.css';

const ROLES = [
  {key: 'mern' , label: 'MERN stack developer' , icon: '🧩'},
  {key: 'frontend' , label: 'Frontend (Angular)' , icon: '⚛️'},
  {key: 'backend' , label: 'Backend (Node.js)' , icon: '🖥️'},
  {key: 'system-design' , label: 'System design' , icon: '📊'}
]

const DIFFICULTIES = ['Easy' , 'Medium' , 'Hard'];

const INTERVIEW_TYPES = [
  { key: 'text', label: 'Text Interview',  desc: 'type your answers', icon: '📝', path: '/interview/text' },
  { key: 'audio', label: 'Voice Interview',  desc: 'type your answers', icon: '📝', path: '/interview/voice' },
  { key: 'timed', label: 'Timed sprint', desc: '60s per question', icon: '⚡', path: '/interview/timed'},
  { key: 'coding', label: 'Coding Round',  desc: 'live problems, real in-browser test runner',  icon: '💻' , path: '/interview/coding' },
];

export default function Setup({ candidateId }) {
  const navigate = useNavigate();
  const [role, setRole] = useState('mern');
  const [selectedType, setSelectedType] = useState('text');
  const [difficulty , setDifficulty] = useState('Medium');
  const [numQuestions , setNumQuestions] = useState(5);

  const handleStart = () => {
    if (!role.trim()) return;

    const type = INTERVIEW_TYPES.find((t) => t.key === selectedType);
    const roleObj =  ROLES.find((r)=> r.key === role);

    navigate(type.path, {
      state: { candidateId, role: roleObj.label , difficulty  ,totalQuestions: numQuestions },
    });
  };

  return (

   <div className="setup-container">
      <p className="setup-eyebrow">NEW INTERVIEW</p>
      <h2 className="setup-title">Set up your mock interview</h2>
      <p className="setup-subtitle">
        Questions are generated fresh for this session from a large rotating
        question bank per role/topic — nothing repeats in a row.
      </p>

      <label className="setup-label">Target role</label>
      <div className="setup-role-grid">
        {ROLES.map((r) => (
          <button
          key={r.key}
            className={`setup-role-card ${role === r.key ? 'active' : ''}`}
            onClick={()=> setRole(r.key)}
          >
             <span className="setup-role-icon">{r.icon}</span>
             {r.label}
          </button>
        ))}
      </div>

      <label className="setup-label">Difficulty</label>
        <div className="setup-difficulty-row">
          {DIFFICULTIES.map((d)=> (
            <button
            key={d}
            className={`setup-difficulty-pill ${difficulty === d ? 'active' : ''}`}
             onClick={() => setDifficulty(d)} 
            >
              {d}
            </button>
          ))}
        </div>

          <label className="setup-label">Interview mode</label>
         <div className="setup-mode-list">
          {INTERVIEW_TYPES.map((t)=> (
            <button
            key={t.key}
            className={`setup-mode-row ${selectedType === t.key ? 'active' : ''}`}
            onClick={()=> setSelectedType(t.key)}
            >
            <span className="setup-mode-icon">{t.icon}</span>
              <span className="setup-mode-text">
              <span className="setup-mode-label">{t.label}</span>
              <span className="setup-mode-dash"> — </span>
              <span className="setup-mode-desc">{t.desc}</span>
            </span>
            </button>
          ))}
         </div>


       <p className="setup-hint">
        Want the full webcam experience? <strong>Video interview</strong> in
        the sidebar is a dedicated flagship mode with a talking AI
        interviewer and live expression analysis.
      </p>

      <label className="setup-label">Number of questions: {numQuestions}</label>
      <input
      type="range"
      min= "3"
      max= "12"
      value={ numQuestions}
      className="setup-slider"
      onChange={(e)=> setNumQuestions(Number(e.target.value))}
      />

       <button
        disabled={!role}
        onClick={handleStart}
        className="setup-start-btn"
      >
        Start interview →
      </button>

   </div>
  );
}