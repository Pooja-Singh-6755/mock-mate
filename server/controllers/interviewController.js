// server/src/controllers/interviewController.js
import Interview from '../models/Interview.js';
import Question from '../models/Question.js';
import Answer from '../models/Answer.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { failure, success } from '../utils/apiResponse.js';

export const getInterview = asyncHandler(async (req, res) => {
  const { interviewId } = req.params;

  const interview = await Interview.findById(interviewId);
  if (!interview) {
    return failure(res, 'Interview not found', 404);
  }

  const questions = await Question.find({ interviewId }).sort({ order: 1 });

  const answers = await Answer.find({ questionId: { $in: questions.map((q) => q._id) } });

  return success(res, { interview, questions, answers });
});