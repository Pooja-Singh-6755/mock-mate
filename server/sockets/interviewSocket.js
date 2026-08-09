// server/src/sockets/interviewSocket.js
import Interview from '../models/Interview.js';
import Question from '../models/Question.js';
import Answer from '../models/Answer.js';
import * as geminiService from '../services/geminiService.js';

export function registerInterviewSocket(socket) {
  socket.on('interview:start', async (payload) => {
    try {
      const { candidateId, role, totalQuestions = 5 } = payload;

      if (!candidateId || !role) {
        return socket.emit('interview:error', { message: 'candidateId and role are required' });
      }

      const interview = await Interview.create({
        candidateId,
        role,
        type: 'text',
        difficultyLevel: 'Beginner',
        totalQuestions,
      });

      socket.emit('interview:created', { interview });

      await streamAndSaveQuestion(socket, interview, { order: 1, previousQuestions: [] });
    } catch (err) {
      console.error('[interview:start] error:', err);
      socket.emit('interview:error', { message: err.message || 'Failed to start interview' });
    }
  });

  socket.on('interview:submit-answer', async (payload) => {
    try {
      const { interviewId, questionId, answerText, timeTakenSec = 0 } = payload;

      if (!interviewId || !questionId || !answerText) {
        return socket.emit('interview:error', { message: 'interviewId, questionId and answerText are required' });
      }

      const interview = await Interview.findById(interviewId);
      if (!interview) return socket.emit('interview:error', { message: 'Interview not found' });

      const question = await Question.findById(questionId);
      if (!question) return socket.emit('interview:error', { message: 'Question not found' });

      // FIX: was "geminiServive" (typo) — ReferenceError, crashes every single submit-answer call.
      const evaluation = await geminiService.evaluateAnswer({
        questionText: question.text,
        answerText,
        role: interview.role,
      });

      const answer = await Answer.create({
        questionId,
        answerText,
        score: evaluation.score,
        feedback: evaluation.feedback,
        timeTakenSec,
      });

      const askedSoFar = await Question.countDocuments({ interviewId });

      const isLastQuestion = askedSoFar >= interview.totalQuestions;

      if (isLastQuestion) {

        const allAnswers = await Answer.find({
          questionId: { $in: await Question.find({ interviewId }).distinct('_id') },
        });

        const overallScore = allAnswers.length
          ? Math.round((allAnswers.reduce((s, a) => s + a.score, 0) / allAnswers.length) * 10) / 10
          : 0;

        interview.status = 'completed';
        interview.overallScore = overallScore;
        interview.endedAt = new Date();
        await interview.save();

        // FIX: critical logic bug — your version computed overallScore INSIDE this
        // if-block (so it didn't exist outside it — another ReferenceError), and then
        // ALWAYS ran "interview.status = 'completed'" unconditionally after the if-block,
        // for EVERY answer, not just the last one. That meant interviews were being
        // marked "completed" after the very first question every time.
        //
        // The "return" here is essential: it stops this function from falling through
        // to the next-question code below once the interview is actually done.
        return socket.emit('interview:answer-evaluated', {
          answer,
          interviewCompleted: true,
          overallScore,
        });
      }

      // FIX: was hardcoded "interviewCompleted: false" even in the completed branch above
      // (because there was no "return", both branches ran). Now this line only runs
      // when we've genuinely confirmed isLastQuestion is false.
      socket.emit('interview:answer-evaluated', { answer, interviewCompleted: false });

      const nextDifficulty = geminiService.nextDifficulty(interview.difficultyLevel, evaluation.score);
      interview.difficultyLevel = nextDifficulty;
      await interview.save();

      const previousQuestions = (await Question.find({ interviewId }).select('text')).map((q) => q.text);

      await streamAndSaveQuestion(socket, interview, { order: askedSoFar + 1, previousQuestions });
    } catch (err) {
      console.error('[interview:submit-answer] error:', err);
      socket.emit('interview:error', { message: err.message || 'Failed to submit answer' });
    }
  });
}

async function streamAndSaveQuestion(socket, interview, { order, previousQuestions }) {
  socket.emit('interview:question-start');

  const generated = await geminiService.streamGenerateQuestion({
    role: interview.role,
    difficulty: interview.difficultyLevel,
    order,
    previousQuestions,
    onChunk: (chunk) => {
      socket.emit('interview:question-chunk', { chunk });
    },
  });

  const question = await Question.create({
    interviewId: interview._id,
    text: generated.text,
    topic: generated.topic,
    difficulty: generated.difficulty,
    order,
  });

  socket.emit('interview:question-complete', { question });
}