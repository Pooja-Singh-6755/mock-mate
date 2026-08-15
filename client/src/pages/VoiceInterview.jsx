import { useState } from 'react';
import './VoiceInterview.css';
import { useSocket } from '../hooks/useSocket';
import { useLocation } from 'react-router-dom';
import { useRef } from 'react';
import { useEffect } from 'react';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

export default function VoiceInterview(props) {
  const socket = useSocket();
  const { state } = useLocation();

  const candidateId = state.candidateId ?? props.candidateId;
   
  const role = state?.role ?? props.role ?? 'MERN stack developer';
  const totalQuestions = state?.totalQuestions ?? props?.totalQuestions;

  const [questionNumber , setQuestionNumber] = useState(1);  
  const [question , setQuestion] = useState(null);
  const [answerText , setAnserText] = useState('');
  const [submitting , setSubmitting] = useState('');
  const [ interview , setInterview] = useState(null);
  const [ streaming , setStreaming] = useState(false);
  const [streamedText , setStreamedText] = useState('');
  const [listening , setListening] = useState(false);
  const [speaking , setSpeaking] = useState(false);
  const [lastFeedback , setLastFeedback] = useState(null);
  const [error , setError] = useState('');
  const [overallScore , setOverallScore] = useState(null);
  

 const micSupported = !!SpeechRecognition;
  const recognitionRef = useRef(null);
  const shouldKeepListeningRef = useRef(false);
  const startedAtRef = useRef(Date.now());
  const previousQuestionsRef = useRef([]);
  const loaderStartedAtRef = useRef(Date.now());
  const hasStartedRef = useRef(false);

  const stopListening = () => {
    shouldKeepListeningRef.current = false;
    setListening(false);
    try {
      recognitionRef.current.stop();
    }catch {
    }
  }

  const startListening = () => {
  if (!micSupported || !recognitionRef.current || listening) return;
  shouldKeepListeningRef.current = true;
  setListening(true);

   try {
     recognitionRef.current.start();
   }catch {
     // throws if already started — safe to ignore, onend/onstart guard the rest
   }
  }

  useEffect(()=>{
    if(!micSupported) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
        let finalChunk = '';

         for (let i = event.resultIndex; i < event.results.length; i++) {
           if(event.result[1].isFinal) finalChunk += event.results[i][0].transcript;
         }

         if (finalChunk.trim()) {
        setAnswerText((prev) => (prev ? `${prev.trim()} ${finalChunk.trim()}` : finalChunk.trim()));
      }
    }

        recognition.onerror = (event) => {
      console.error('[SpeechRecognition] error:', event.error);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setError('Microphone permission was denied. Allow mic access in the browser and try again.');
        shouldKeepListeningRef.current = false;
        setListening(false);
      }
    };


    recognition.onend = () => {
        if(shouldKeepListeningRef.current) {
        try{
          recognition.start();
        }catch{
         // ignore — a start() race here is harmless 
        }
        } else {
        setListening(false)
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

   useEffect(()=>{
      if (!socket || !micSupported) return;

      const handleInterviewCreated = ({ interview : iv}) => {
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
        setAnserText('');
        setStreaming(true);
        stopListening();
      };

     const handleQuestionChunk = ({ chunk }) => {
      setStreamedText((prev) => prev + chunk);
    };

    const handleQuestionComplete = ({question: q}) => {
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

    const handleAnswerEvaluated = ({anwser , interviewCompleted , overallScore}) => {
     setLastFeedback({ score: answer.score, feedback: answer.feedback });
      setSubmitting(false);

      if (interviewCompleted) {
        setCompleted(true);
        setOverallScore(overallScore);
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

   }, [socket, candidateId, role, totalQuestions, micSupported]);

  const handleSubmit = () => {
    if (!answerText.trim() || submitting) return;

    stopListening();
    setSubmitting(true);
    setError('');

    const timeTakenSec = Math.round((Date.now() - startedAtRef.current) / 1000);
    
    socket.emit('voice-interview:submit-answer' , {
      interviewId : interview._id,
      question : question._id,
      answerText,
      timeTakenSec
    })
  };

    if (!micSupported) {
    return (
      <div className="va-error">
        Voice interview needs the Web Speech API, which currently only ships in
        Chrome and Edge. Switch browsers, or try the Text interview mode instead.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="va-loading">
        <InterviewLoader />
      </div>
    );
  }

  if (error && !streamedText && !question) {
    return <div className="va-error">{error}</div>;
  }

  if (completed) {
    return (
      <div className="va-complete">
        <h2>Interview Complete 🎉</h2>
        <p className="va-overall-score">Overall Score: {overallScore}/10</p>
        <p>Great job finishing the round — check your full report in the History tab.</p>
      </div>
    );
  }
   
 return(
   <div className="va-container">

       <div className="va-progress">
        Question {questionNumber} of {totalQuestions}
        {question?.difficulty ? ` · ${question.difficulty}` : ''}
      </div>

        <div className="va-question-card">
            {question.topic && <span className="va-topic-badge">{question.topic}</span>}
            {speaking && <span className="va-speaking-badge">🔊 Speaking…</span>}
              <p className="va-question-text">
                {streaming ? streamedText : question?.text}
                {streaming && <span className="va-cursor">▍</span>}
              </p>
        </div>

          <div className="va-mic-row">
             <span className={`va-mic-indicator ${listening ? 'live' : ''}`}
             >
             {listening ? '● Listening…' : 'Mic off'}
             </span>

             <button
              onClick={listening ? stopListening : startListening}
              disabled={submitting || streaming || speaking}
              className="va-mic-btn"
              type='button'
             >
                {listening ? '⏸ Pause mic' : '🎤 Start Speaking'}
             </button>
          </div>

          <textarea 
          className="va-answer-box"
          placeholder="Your spoken answer is transcribed here live — edit if needed, then submit."
          rows={8}
          disabled={submitting || streaming}
          onChange={(e)=> setAnserText(e.target.value)}
          />

         { lastFeedback && (
         <div className="va-feedback-panel">
            <strong> Previous score : { lastFeedback.score}/10</strong>
            <p>{lastFeedback.feedback}</p>
         </div>
         )} 

        {error && <div className="va-error-inline">{error}</div>}

        <button
         onClick={handleSubmit}
         className="va-submit-btn"
         disabled={submitting || streaming || !answerText.trim()}
        >
            {submitting ? 'Evaluating...' : 'Submit Answer'}
        </button>
    </div>
 )
}