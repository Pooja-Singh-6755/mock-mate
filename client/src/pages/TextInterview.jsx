// client/src/pages/TextInterview.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import './TextinIerview.css';

export default function TextInterview(props) {
  const socket = useSocket();
  const { state } = useLocation();

  const candidateId = state?.candidateId ?? props.candidateId;
  const role = state?.role ?? props.role ?? 'MERN stack developer';
  const totalQuestions = state?.totalQuestions ?? props.totalQuestions ?? 5;

  const [loading, setLoading] = useState(true);
  const [streaming, setStreaming] = useState(false);
  const [interview, setInterview] = useState(null);
  const [streamedText, setStreamedText] = useState('');
  const [question, setQuestion] = useState(null);
  const [answerText, setAnswerText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lastFeedback, setLastFeedback] = useState(null);
  const [completed, setCompleted] = useState(false);
  const [overallScore, setOverallScore] = useState(null);
  const [error, setError] = useState('');
  const [questionNumber, setQuestionNumber] = useState(1);

  const startedAtRef = useRef(Date.now());
  const previousQuestionsRef = useRef([]);
  
  // Guard ref to ensure interview:start is emitted ONLY once per mount
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (!socket) return;

    const handleInterviewCreated = ({ interview: iv }) => {
      setInterview(iv);
      setLoading(false);
    };

    const handleQuestionStart = () => {
      setStreamedText('');
      setQuestion(null);
      setStreaming(true);
    };

    const handleQuestionChunk = ({ chunk }) => {
      setStreamedText((prev) => prev + chunk);
    };

    const handleQuestionComplete = ({ question: q }) => {
      setQuestion(q);
      setStreaming(false);
      previousQuestionsRef.current = [...previousQuestionsRef.current, q.text];
      startedAtRef.current = Date.now();
    };

    const handleError = ({ message }) => {
      setError(message);
      setLoading(false);
      setStreaming(false);
      setSubmitting(false);
    };

    const handleAnswerEvaluated = ({ answer, interviewCompleted, overallScore }) => {
      setLastFeedback({ score: answer.score, feedback: answer.feedback });
      setSubmitting(false);

      if (interviewCompleted) {
        setCompleted(true);
        setOverallScore(overallScore);
      } else {
        setQuestionNumber((n) => n + 1);
      }
    };

    // Attach listeners
    socket.on('interview:created', handleInterviewCreated);
    socket.on('interview:question-start', handleQuestionStart);
    socket.on('interview:question-chunk', handleQuestionChunk);
    socket.on('interview:question-complete', handleQuestionComplete);
    socket.on('interview:error', handleError);
    socket.on('interview:answer-evaluated', handleAnswerEvaluated);

    // Emit interview:start ONLY ONCE
    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      socket.emit('interview:start', { candidateId, role, totalQuestions });
    }

    return () => {
      socket.off('interview:created', handleInterviewCreated);
      socket.off('interview:question-start', handleQuestionStart);
      socket.off('interview:question-chunk', handleQuestionChunk);
      socket.off('interview:question-complete', handleQuestionComplete);
      socket.off('interview:error', handleError);
      socket.off('interview:answer-evaluated', handleAnswerEvaluated);
    };
  }, [socket, candidateId, role, totalQuestions]);

  const handleSubmit = () => {
    if (!answerText.trim() || submitting) return;
    setSubmitting(true);
    setError('');

    const timeTakenSec = Math.round((Date.now() - startedAtRef.current) / 1000);

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