const Interview = require('../models/Interview');
const Question = require('../models/Question');
const Answer = require('../models/Answer');
const geminiService = require('../services/geminiService');

function registerInterviewSocket(socket) {
    socket.on('interview:start' , async(payload)=>{
        try {
        const {candidateId , role , totalQuestions = 5} = payload;
       
        if (!candidateId || !role) {
        return socket.emit('interview:error', { message: 'candidateId and role are required' });
      }

      const interview = await Interview.create({
        candidateId ,
        role,
        type: 'text',
        difficultyLevel: 'Beginner',
        totalQuestions
      })

      socket.emit('interview:created' , {interview});
      await streamAndSaveQuestion(socket , interview , {order:1 , previousQuestion: []});

      } catch(err) {
          console.error('[interview:start] error:', err);
          socket.emit('interview:error', { message: err.message || 'Failed to start interview' }); 
        }
    });

    socket.on('interview:submit-answer' , async(payload) => {
        try {
          const { interviewId ,  questionId , answerText , timeTakenSec = 0} = payload;

           if (!interviewId || !questionId || !answerText) {
           return socket.emit('interview:error', { message: 'interviewId, questionId and answerText are required' });
         }

         const interview = await Interview.findById(interviewId);
          if (!interview) return socket.emit('interview:error', { message: 'Interview not found' });

         const question = await Question.findById(questionId);
          if (!question) return socket.emit('interview:error', { message: 'Question not found' });

          // 1. Evaluate the answer via Gemini (score + feedback) — same as before, just triggered by socket now.
          const evaluation = await geminiServive.evaluateAnswer({
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

          const askedSofar = await Question.countDocument({interviewId});
          const isLastQuestion = askedSofar >= interview.askedSofar;


          if(isLastQuestion) {
            const allAnswer = await Answer.find({
               questionId: { $in: await Question.find({ interviewId }).distinct('_id') },
            });

        const overallScore = allAnswers.length
          ? Math.round((allAnswers.reduce((s, a) => s + a.score, 0) / allAnswers.length) * 10) / 10
          : 0;
          }


        interview.status = 'completed';
        interview.overallScore = overallScore;
        interview.endedAt = new Date();
        await interview.save();


          // "Reply" to the candidate's last answer, and tell them the interview is done — all one event.
            socket.emit('interview:answer-evaluated', { answer, interviewCompleted: false });
 
      // 4. ...then automatically stream in the NEXT question, no extra click or REST call needed.
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
  socket.emit('interview:question-start'); // tells frontend: clear box, show typing cursor
 
  const generated = await geminiService.streamGenerateQuestion({
    role: interview.role,
    difficulty: interview.difficultyLevel,
    order,
    previousQuestions,
    onChunk: (chunk) => {
      socket.emit('interview:question-chunk', { chunk }); // typing effect, piece by piece
    },
  });
 
  const question = await Question.create({
    interviewId: interview._id,
    text: generated.text,
    topic: generated.topic,
    difficulty: generated.difficulty,
    order,
  });
 
  socket.emit('interview:question-complete', { question }); // stream done, full question saved
}
 
module.exports = { registerInterviewSocket };

