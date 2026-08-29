import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import InterviewLoader, { MIN_LOADER_MS } from './InterviewLoader';
import './VideoInterview.css';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export default function VideoInterview(props) {
  const socket = useSocket();
  const { state } = useLocation();

  const candidateId = state?.candidateId ?? props.candidateId;
  const role = state?.role ?? props.role ?? 'MERN stack developer';
  const totalQuestions = state?.totalQuestions ?? props.totalQuestions ?? 5;

  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
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

  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const micSupported = !!SpeechRecognition;

  const [camOn, setCamOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [eyeContact, setEyeContact] = useState('—');
  const [tone, setTone] = useState('—');

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const simIntervalRef = useRef(null);

  const startedAtRef = useRef(Date.now());
  const previousQuestionsRef = useRef([]);
  const loaderStartedAtRef = useRef(Date.now());
  const hasStartedRef = useRef(false);
  const recognitionRef = useRef(null);
  const shouldKeepListeningRef = useRef(false);

  const enableCamera = async () => {
    try {
      if (!streamRef.current) {
        streamRef.current = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      }
      if (videoRef.current) videoRef.current.srcObject = streamRef.current;
      setCamOn(true);
      setMicOn(true);
    } catch {
      setError('Camera/mic permission was denied. Allow access in the browser to continue.');
    }
  };

  const toggleMicTrack = () => {
    const audioTrack = streamRef.current?.getAudioTracks?.()[0];
    if (audioTrack) audioTrack.enabled = !audioTrack.enabled;
    setMicOn((m) => !m);
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCamOn(false);
  };

  const stopListening = () => {
    shouldKeepListeningRef.current = false;
    setListening(false);
    try {
      recognitionRef.current?.stop();
    } catch {
      // no-op
    }
  };

  const startListening = () => {
    if (!micSupported || !recognitionRef.current || listening) return;
    shouldKeepListeningRef.current = true;
    try {
      // Prevent mic from turning on if TTS is speaking
      if (window.speechSynthesis?.speaking) return;
      recognitionRef.current.start();
      setListening(true);
    } catch (err) {
      // Handles rare edge case where recognition is already running
      console.warn('SpeechRecognition start ignored:', err);
    }
  };

  const speakQuestion = (text) => {
    // Stop microphone before speaking to avoid self-transcription
    stopListening();

    if (!window.speechSynthesis) {
      startListening();
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    setSpeaking(true);

    utterance.onend = () => {
      setSpeaking(false);
      startListening();
    };
    utterance.onerror = () => {
      setSpeaking(false);
      startListening();
    };
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (!micSupported) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let finalChunk = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalChunk += event.results[i][0].transcript;
      }
      if (finalChunk.trim()) {
        setAnswerText((prev) => (prev ? `${prev.trim()} ${finalChunk.trim()}` : finalChunk.trim()));
      }
    };

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setError('Microphone permission was denied. Allow mic access and try again.');
        shouldKeepListeningRef.current = false;
        setListening(false);
      }
    };

    recognition.onend = () => {
      if (shouldKeepListeningRef.current) {
        try {
          recognition.start();
        } catch {
          // no-op
        }
      } else {
        setListening(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      shouldKeepListeningRef.current = false;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.stop();
      window.speechSynthesis?.cancel();
    };
  }, [micSupported]);

  useEffect(() => {
    if (!started) return;

    timerIntervalRef.current = setInterval(() => {
      setElapsedSec((s) => s + 1);
    }, 1000);

    simIntervalRef.current = setInterval(() => {
      setEyeContact(`${75 + Math.floor(Math.random() * 20)}%`);
      setTone(['Confident', 'Calm', 'Engaged', 'Steady'][Math.floor(Math.random() * 4)]);
    }, 3000);

    return () => {
      clearInterval(timerIntervalRef.current);
      clearInterval(simIntervalRef.current);
    };
  }, [started]);

  useEffect(() => {
    if (!socket || !micSupported || !started) return;

    const handleInterviewCreated = ({ interview: iv }) => {
      const elapsed = Date.now() - loaderStartedAtRef.current;
      const remaining = Math.max(0, MIN_LOADER_MS - elapsed);
      setTimeout(() => {
        setInterview(iv);
        setLoading(false);
      }, remaining);
    };

    const handleQuestionStart = () => {
      setStreamedText('');
      setQuestion(null);
      setAnswerText('');
      setStreaming(true);
      stopListening();
    };

    const handleQuestionChunk = ({ chunk }) => {
      setStreamedText((prev) => prev + chunk);
    };

    const handleQuestionComplete = ({ question: q }) => {
      setQuestion(q);
      setStreaming(false);
      previousQuestionsRef.current = [...previousQuestionsRef.current, q.text];
      startedAtRef.current = Date.now();
      speakQuestion(q.text);
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
        stopListening();
        stopCamera();
      } else {
        setQuestionNumber((n) => n + 1);
      }
    };

    socket.on('voice-interview:created', handleInterviewCreated);
    socket.on('voice-interview:question-start', handleQuestionStart);
    socket.on('voice-interview:question-chunk', handleQuestionChunk);
    socket.on('voice-interview:question-complete', handleQuestionComplete);
    socket.on('voice-interview:error', handleError);
    socket.on('voice-interview:answer-evaluated', handleAnswerEvaluated);

    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      socket.emit('voice-interview:start', { candidateId, role, totalQuestions });
    }

    return () => {
      socket.off('voice-interview:created', handleInterviewCreated);
      socket.off('voice-interview:question-start', handleQuestionStart);
      socket.off('voice-interview:question-chunk', handleQuestionChunk);
      socket.off('voice-interview:question-complete', handleQuestionComplete);
      socket.off('voice-interview:error', handleError);
      socket.off('voice-interview:answer-evaluated', handleAnswerEvaluated);
    };
  }, [socket, candidateId, role, totalQuestions, micSupported, started]);

  useEffect(() => {
    return () => {
      stopCamera();
      stopListening();
      window.speechSynthesis?.cancel();
    };
  }, []);

  const handleStart = async () => {
    setError('');
    if (!streamRef.current) {
      await enableCamera();
      if (!streamRef.current) return;
    }
    loaderStartedAtRef.current = Date.now();
    setLoading(true);
    setStarted(true);
  };

  const handleEnd = () => {
    stopListening();
    stopCamera();
    window.speechSynthesis?.cancel();
    setCompleted(true);
  };

  const handleSubmit = () => {
    if (!answerText.trim() || submitting) return;

    if (!interview?._id || !question?._id) {
      setError('Interview or Question context is missing. Try restarting.');
      return;
    }

    stopListening();
    setSubmitting(true);
    setError('');

    const timeTakenSec = Math.round((Date.now() - startedAtRef.current) / 1000);

    socket.emit('voice-interview:submit-answer', {
      interviewId: interview._id,
      questionId: question._id,
      answerText,
      timeTakenSec,
    });
  };

  const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  if (!micSupported) {
    return (
      <div className="vidi-error">
        Video interview needs the Web Speech API, which currently only ships in
        Chrome and Edge. Switch browsers, or try the Text interview mode instead.
      </div>
    );
  }

  if (completed) {
    return (
      <div className="vidi-complete">
        <h2>Interview Complete 🎉</h2>
        {overallScore !== null && <p className="vidi-overall-score">Overall Score: {overallScore}/10</p>}
        <p>Great job finishing the round — check your full report in the History tab.</p>
      </div>
    );
  }

  return (
    <div className="vidi-container">
      <p className="vidi-eyebrow">AI video interview</p>
      <h4 className="vidi-title">Live video mock interview</h4>
      <p className="vidi-sub">
        Uses your real webcam and mic (getUserMedia — free, browser-only). The AI
        interviewer asks each question aloud and transcribes your spoken answer live.
        Eye-contact/tone readouts below are a simulated preview.
      </p>

      <div className="vidi-status-bar">
        {started && <span className="vidi-rec-badge">● REC {fmtTime(elapsedSec)}</span>}
        {!started && <span className="vidi-idle-label">Camera is off</span>}
        <div className="vidi-status-badges">
          <span className="vidi-badge">👁 Eye contact: <b>{eyeContact}</b></span>
          <span className="vidi-badge">🙂 Tone: <b>{tone}</b></span>
        </div>
      </div>

      <div className="vidi-row2">
        <div className="vidi-panel">
          <div className="vidi-panel-header">
            <span>Interviewer</span>
            {speaking && <span className="vidi-speaking-label">Speaking…</span>}
          </div>

          <div className="interviewer-frame">
            {started && <div className="interviewer-chip interviewer-live-badge"><i /> Live</div>}
            <div className={`interviewer-tile ${speaking ? 'speaking' : ''}`}>
              <div className="interviewer-mark">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                </svg>
              </div>
              <div className="interviewer-wave">
                {Array.from({ length: 9 }).map((_, i) => <span key={i} />)}
              </div>
            </div>
            <div className="interviewer-chip interviewer-nameplate">
              <span className="interviewer-status-dot" />
              <span>AI Interviewer</span>
            </div>
          </div>

          <div className={`interviewer-bubble-wrap ${speaking ? 'speaking' : ''}`}>
            <span className="bubble-label">Question</span>
            <p className="vidi-question-text">
              {!started
                ? 'Press "Start video interview" to begin.'
                : streaming ? streamedText : question?.text}
              {streaming && <span className="vidi-cursor">▍</span>}
            </p>
          </div>
        </div>

        <div className="vidi-panel">
          <div className="vidi-panel-header">
            <span>You (live feed)</span>
            {listening && <span className="vidi-mic-badge">Mic active</span>}
          </div>
          <div className="vidi-video-box">
            <video ref={videoRef} autoPlay muted playsInline style={{ display: camOn ? 'block' : 'none' }} />
            {!camOn && <span className="vidi-cam-placeholder">Webcam preview will appear here</span>}
            <div className="interviewer-chip candidate-chip">
              <span className="interviewer-status-dot" />
              You
            </div>
          </div>
        </div>
      </div>

      {started && !loading && (
        <div className="vidi-answer-card">
          <div className="vidi-answer-header">
            <span>
              Your answer
              {listening && <span className="vidi-listening-label"> · listening…</span>}
            </span>
            <span className="vidi-q-progress">Question {questionNumber} of {totalQuestions}</span>
          </div>

          <textarea
            className="vidi-answer-box"
            rows={3}
            placeholder="Your spoken answer is transcribed here live — edit if needed, then submit"
            value={answerText}
            onChange={(e) => setAnswerText(e.target.value)}
            disabled={submitting || streaming}
          />

          <div className="vidi-submit-row">
            <button
              className="vidi-submit-btn"
              onClick={handleSubmit}
              disabled={submitting || streaming || !answerText.trim()}
            >
              {submitting ? 'Evaluating…' : 'Submit answer'}
            </button>
          </div>

          {lastFeedback && (
            <div className="vidi-feedback-box">
              <div className="vidi-feedback-head">
                <span>AI score</span>
                <span className="vidi-feedback-score">{lastFeedback.score}/10</span>
              </div>
              <p className="vidi-feedback-text">{lastFeedback.feedback}</p>
            </div>
          )}
        </div>
      )}

      {error && <div className="vidi-error-inline">{error}</div>}

      <div className="vidi-controls-bar">
        <div className="vidi-controls-left">
          <button onClick={started ? undefined : enableCamera} disabled={started}>🎥 Camera</button>
          <button onClick={toggleMicTrack} disabled={!camOn}>🎤 Mic {micOn ? 'On' : 'Off'}</button>
        </div>
        {!started ? (
          <button className="vidi-start-btn" onClick={handleStart} disabled={loading}>
            {loading ? 'Starting…' : 'Start video interview'}
          </button>
        ) : (
          <button className="vidi-end-btn" onClick={handleEnd}>End call</button>
        )}
      </div>

      {loading && (
        <div className="vidi-loading-overlay">
          <InterviewLoader />
        </div>
      )}
    </div>
  );
}