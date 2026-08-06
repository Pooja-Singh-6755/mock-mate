// client/src/pages/TextInterview.jsx
// v3 — FULLY socket-based now, like a chat app (WhatsApp style):
// question generation AND answer evaluation both flow over the same WebSocket connection.
// No REST calls at all for the interview loop anymore.
import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import './TextinIerview.css';

export default function TextInterview(props) {
  const socket = useSocket();
  const { state } = useLocation(); // set by Setup.jsx's navigate(path, { state: {...} })

  // Prefer whatever Setup.jsx passed via route state; fall back to direct props
  // (useful if you're rendering this page some other way, e.g. tests).
  const candidateId = state?.candidateId ?? props.candidateId;
  const role = state?.role ?? props.role ?? 'MERN stack developer';
  const totalQuestions = state?.totalQuestions ?? props.totalQuestions ?? 5;

  const [loading, setLoading] = useState(true);       // true until interview is created
  const [streaming, setStreaming] = useState(false);   // true while question text is typing in
  const [interview, setInterview] = useState(null);
  const [streamedText, setStreamedText] = useState(''); // grows chunk-by-chunk during streaming
  const [question, setQuestion] = useState(null);       // full saved question, set when stream completes
  const [answerText, setAnswerText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lastFeedback, setLastFeedback] = useState(null);
  const [completed, setCompleted] = useState(false);
  const [overallScore, setOverallScore] = useState(null);
  const [error, setError] = useState('');
  const [questionNumber, setQuestionNumber] = useState(1);

  const startedAtRef = useRef(Date.now());
  const previousQuestionsRef = useRef([]); // accumulated locally, avoids an extra DB round-trip each time

  // --- Set up all socket listeners once ---
  useEffect(() => {
    socket.on('interview:created', ({ interview: iv }) => {
      setInterview(iv);
      setLoading(false);
    });

    socket.on('interview:question-start', () => {
      setStreamedText('');
      setQuestion(null);
      setStreaming(true);
    });

    socket.on('interview:question-chunk', ({ chunk }) => {
      setStreamedText((prev) => prev + chunk); // typing effect: append as each piece arrives
    });

    socket.on('interview:question-complete', ({ question: q }) => {
      setQuestion(q);
      setStreaming(false);
      previousQuestionsRef.current = [...previousQuestionsRef.current, q.text];
      startedAtRef.current = Date.now();
    });

    socket.on('interview:error', ({ message }) => {
      setError(message);
      setLoading(false);
      setStreaming(false);
      setSubmitting(false);
    });

    // Server's "reply" after we submit an answer — like getting a WhatsApp message back.
    // If the interview isn't done, the server will ALSO auto-emit 'interview:question-start'
    // right after this, chaining straight into the next question — no extra action needed here.
    socket.on('interview:answer-evaluated', ({ answer, interviewCompleted, overallScore }) => {
      setLastFeedback({ score: answer.score, feedback: answer.feedback });
      setSubmitting(false);

      if (interviewCompleted) {
        setCompleted(true);
        setOverallScore(overallScore);
      } else {
        setQuestionNumber((n) => n + 1);
      }
    });

    // Kick off the interview once listeners are ready.
    socket.emit('interview:start', { candidateId, role, totalQuestions });

    return () => {
      socket.off('interview:created');
      socket.off('interview:question-start');
      socket.off('interview:question-chunk');
      socket.off('interview:question-complete');
      socket.off('interview:answer-evaluated');
      socket.off('interview:error');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = () => {
    if (!answerText.trim() || submitting) return;
    setSubmitting(true);
    setError('');

    const timeTakenSec = Math.round((Date.now() - startedAtRef.current) / 1000);

    // Just emit — like sending a chat message. The reply comes back through the
    // 'interview:answer-evaluated' listener above, no promise/await needed here.
    socket.emit('interview:submit-answer', {
      interviewId: interview._id,
      questionId: question._id,
      answerText,
      timeTakenSec,
    });

    setAnswerText('');
  };

  if (loading) {
    return <div className="ti-loading">Connecting…</div>;
  }

  if (error && !streamedText && !question) {
    return <div className="ti-error">{error}</div>;
  }

  if (completed) {
    return (
      <div className="ti-complete">
        <h2>Interview Complete 🎉</h2>
        <p className="ti-overall-score">Overall Score: {overallScore}/10</p>
        <p>Great job finishing the round — check your full report in the History tab.</p>
      </div>
    );
  }

  return (
    <div className="ti-container">
      <div className="ti-progress">
        Question {questionNumber} of {totalQuestions}
        {question?.difficulty ? ` · ${question.difficulty}` : ''}
      </div>

      <div className="ti-question-card">
        {question?.topic && <span className="ti-topic-badge">{question.topic}</span>}
        <p className="ti-question-text">
          {streaming ? streamedText : question?.text}
          {streaming && <span className="ti-cursor">▍</span>}
        </p>
      </div>

      <textarea
        className="ti-answer-box"
        placeholder="Type your answer here…"
        value={answerText}
        onChange={(e) => setAnswerText(e.target.value)}
        rows={8}
        disabled={submitting || streaming}
      />

      {lastFeedback && (
        <div className="ti-feedback-panel">
          <strong>Previous score: {lastFeedback.score}/10</strong>
          <p>{lastFeedback.feedback}</p>
        </div>
      )}

      {error && <div className="ti-error-inline">{error}</div>}

      <button
        className="ti-submit-btn"
        onClick={handleSubmit}
        disabled={submitting || streaming || !answerText.trim()}
      >
        {submitting ? 'Evaluating…' : 'Submit Answer'}
      </button>
    </div>
  );
}