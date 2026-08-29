import Interview from '../models/Interview.js';
import Question from '../models/Question.js';
import Answer from '../models/Answer.js';
import * as geminiService from '../services/geminiService.js';

const LETTERS = ['A' ,'B' , 'c' , 'D'];

export function registerMcqInterviewSocket(socket) {
socket.on('mcq-interview:start' ,  async(payload)=> {
    try {
        const { candidateId , role , totalQuestions  = 5} = payload;

     if (!candidateId || !role) {
        return socket.emit('mcq-interview:error', { message: 'candidateId and role are required' });
      };

      const interview = await Interview.create({
        candidateId,
        role,
        type: 'mcq',
        difficultyLevel: 'Beginner',
        totalQuestions,
      });

      socket.emit('mcq-interview:created', {interview})
    await generateAndSaveQuestion(socket, interview, { order: 1, previousQuestions: [] });

    } catch(err) {
       console.error('[mcq-interview:start] error:', err);
       socket.emit('mcq-interview:error', { message: err.message || 'Failed to start interview' });
    }
})

socket.on('mcq-interview:submit-answer' , async(payload) => {
    try {
     const { interviewId , questionId , selectedIndex , timetakenSec = 0} = payload

     if (!interviewId || !questionId || selectedIndex === undefined || selectedIndex === null) {
        return socket.emit('mcq-interview:error', {
          message: 'interviewId, questionId and selectedIndex are required',
        });
      }

      const interview = await Interview.findById(interviewId);
       if (!interview) return socket.emit('mcq-interview:error', { message: 'Interview not found' });

      const question = await Question.findById(questionId);
        if (!question) return socket.emit('mcq-interview:error', { message: 'Question not found' });

        const isCorrect = selectedIndex === question.correctIndex;
        const score = isCorrect ? 10 : 0;
        const feedback = isCorrect  ? 'Correct!'
        : `Not quite — the correct answer was ${LETTERS[question.correctIndex]}: "${question.options[question.correctIndex]}"`;

        

    } catch(err) {
      console.error('[mcq-interview:submit-answer] error:', err);
      socket.emit('mcq-interview:error', { message: err.message || 'Failed to submit answer' });
    }
} )
}