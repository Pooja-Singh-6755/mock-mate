// client/src/pages/McqInterview.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import InterviewLoader, { MIN_LOADER_MS } from './InterviewLoader';
import './McqInterview.css';

export default function McqInterview(props) {
  const socket = useSocket();
  const { state } = useLocation();

  const candidateId = state?.candidateId ?? props.candidateId;
  const role = state?.role ?? props.role ?? 'MERN stack developer';
  const totalQuestions = state?.totalQuestions ?? props.totalQuestions ?? 5;

  const [loading, setLoading] = useState(true);
  const [interview, setInterview] = useState(null);
  const [question, setQuestion] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [locked, setLocked] = useState(false); // true once submitted, until next question
  const [correctIndex, setCorrectIndex] = useState(null); // revealed only after submit
  const [lastFeedback, setLastFeedback] = useState(null);
  const [completed, setCompleted] = useState(false);
  const [overallScore, setOverallScore] = useState(null);
  const [error, setError] = useState('');
  const [questionNumber, setQuestionNumber] = useState(1);

  const startedAtRef = useRef(Date.now());
  const loaderStartedAtRef = useRef(Date.now());
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (!socket) return;

    const handleInterviewCreated = ({ interview: iv }) => {
      const elapsed = Date.now() - loaderStartedAtRef.current;
      const remaining = Math.max(0, MIN_LOADER_MS - elapsed);
      setTimeout(() => {
        setInterview(iv);
        setLoading(false);
      }, remaining);
    };

    const handleQuestionReady = ({ question: q }) => {
      setQuestion(q);
      setSelectedIndex(null);
      setLocked(false);
      setCorrectIndex(null);
      startedAtRef.current = Date.now();
    };

    const handleError = ({ message }) => {
      setError(message);
      setLoading(false);
    };

    const handleAnswerEvaluated = ({ answer, correctIndex: ci, interviewCompleted, overallScore }) => {
      setCorrectIndex(ci);
      setLastFeedback({ score: answer.score, feedback: answer.feedback });

      if (interviewCompleted) {
        setCompleted(true);
        setOverallScore(overallScore);
      } else {
        setQuestionNumber((n) => n + 1);
      }
    };

    socket.on('mcq-interview:created', handleInterviewCreated);
    socket.on('mcq-interview:question-ready', handleQuestionReady);
    socket.on('mcq-interview:error', handleError);
    socket.on('mcq-interview:answer-evaluated', handleAnswerEvaluated);

    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      socket.emit('mcq-interview:start', { candidateId, role, totalQuestions });
    }

    return () => {
      socket.off('mcq-interview:created', handleInterviewCreated);
      socket.off('mcq-interview:question-ready', handleQuestionReady);
      socket.off('mcq-interview:error', handleError);
      socket.off('mcq-interview:answer-evaluated', handleAnswerEvaluated);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, candidateId, role, totalQuestions]);

  const handleSelect = (index) => {
    if (locked) return; // already answered — options are locked
    setSelectedIndex(index);
  };

  const handleSubmit = () => {
    if (selectedIndex === null || locked) return;
    setLocked(true);

    const timeTakenSec = Math.round((Date.now() - startedAtRef.current) / 1000);

    socket.emit('mcq-interview:submit-answer', {
      interviewId: interview._id,
      questionId: question._id,
      selectedIndex,
      timeTakenSec,
    });
  };

  if (loading) {
    return (
      <div className="mcqi-loading">
        <InterviewLoader />
      </div>
    );
  }

  if (error && !question) {
    return <div className="mcqi-error">{error}</div>;
  }

  if (completed) {
    return (
      <div className="mcqi-complete">
        <h2>Interview Complete 🎉</h2>
        <p className="mcqi-overall-score">Overall Score: {overallScore}/10</p>
        <p>Great job finishing the round — check your full report in the History tab.</p>
      </div>
    );
  }

  const letters = ['A', 'B', 'C', 'D'];

  return (
    <div className="mcqi-container">
      <div className="mcqi-progress">
        Question {questionNumber} of {totalQuestions}
        {question?.difficulty ? ` · ${question.difficulty}` : ''}
      </div>

      <div className="mcqi-question-card">
        {question?.topic && <span className="mcqi-topic-badge">{question.topic}</span>}
        <p className="mcqi-question-text">{question?.text}</p>
      </div>

      <div className="mcqi-options">
        {question?.options?.map((opt, i) => {
          let stateClass = '';
          if (locked) {
            if (i === correctIndex) stateClass = 'correct';
            else if (i === selectedIndex) stateClass = 'incorrect';
          } else if (i === selectedIndex) {
            stateClass = 'selected';
          }

          return (
            <div
              key={i}
              className={`mcqi-option ${stateClass}`}
              onClick={() => handleSelect(i)}
            >
              <span className="mcqi-letter">{letters[i]}</span>
              <span>{opt}</span>
            </div>
          );
        })}
      </div>

      {lastFeedback && locked && (
        <div className="mcqi-feedback-panel">
          <strong>Score: {lastFeedback.score}/10</strong>
          <p>{lastFeedback.feedback}</p>
        </div>
      )}

      {error && <div className="mcqi-error-inline">{error}</div>}

      <button
        className="mcqi-submit-btn"
        onClick={handleSubmit}
        disabled={selectedIndex === null || locked}
      >
        {locked ? 'Loading next question…' : 'Submit Answer'}
      </button>
    </div>
  );
}