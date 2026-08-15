import Interview from '../models/Interview.js';
import Question from '../models/Question.js';
import Answer from '../models/Answer.js';
import * as geminiService from '../services/geminiService.js';

export function registerVoiceInterviewSocket(socket) {
 socket.on('voice-interview:start' , async(payload) => {
  try {
     const { candidateId , role , voice ,difficultyLevel , totalQuestion} = payload;

     if (!candidateId || !role) {
        return socket.emit('voice-interview:error', { message: 'candidateId and role are required' });
      }

      const interview = await Interview.create({
        candidateId,
        role,
        type: 'voice',
        difficultyLevel,
        totalQuestion
      });

      socket.emit('voice-interview:created', {interview});
      await streamAndSaveQuestion(socket, interview, { order: 1, previousQuestions: [] });

    }catch (error) {
    console.log('[voice-interview:start] error ' , error);
    socket.emit('voice-interview:error', { message: error.message || 'Failed to start interview' });
  }
 })
 
 socket.on('voice-interview:submit-answer' , async(payload) => {
    try{
 
    const { interviewId , questionId , answerText , timeTakenSec = 0 } = payload
   
       if (!interviewId || !questionId || !answerText || !answerText.trim()) {
        return socket.emit('voice-interview:error', {
          message: 'interviewId, questionId and a non-empty transcribed answerText are required',
        });
      }

      const interview = await Interview.findById(interviewId);
      if (!interview) return socket.emit('voice-interview:error', { message: 'Interview not found' });

      const question = await Question.findById(questionId);
      if (!question) return socket.emit('voice-interview:error', { message: 'Question not found' });

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
      })

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

       return socket.emit('voice-interview:answer-evaluated', {
          answer,
          interviewCompleted: true,
          overallScore,
        });
      }

       socket.emit('voice-interview:answer-evaluated', { answer, interviewCompleted: false });

      const nextDifficulty = geminiService.nextDifficulty(interview.difficultyLevel, evaluation.score);
      interview.difficultyLevel = nextDifficulty;
      await interview.save();

      const previousQuestions = (await Question.find({ interviewId }).select('text')).map((q) => q.text);

      await streamAndSaveQuestion(socket, interview, { order: askedSoFar + 1, previousQuestions });

    }catch(error) {
      console.error('[voice-interview:submit-answer] error:', err);
      socket.emit('voice-interview:error', { message: err.message || 'Failed to submit answer' });
    }
 })

}

async function streamAndSaveQuestion(socket, interview, { order, previousQuestions }) {
  socket.emit('voice-interview:question-start');

  const generated = await geminiService.streamGenerateQuestion({
    role: interview.role,
    difficulty: interview.difficultyLevel,
    order,
    previousQuestions,
    onChunk: (chunk) => {
      // Client can render this live AND/OR feed it to SpeechSynthesis once complete.
      socket.emit('voice-interview:question-chunk', { chunk });
    },
  });

  const question = await Question.create({
    interviewId: interview._id,
    text: generated.text,
    topic: generated.topic,
    difficulty: generated.difficulty,
    order,
  });

  socket.emit('voice-interview:question-complete', { question });
}