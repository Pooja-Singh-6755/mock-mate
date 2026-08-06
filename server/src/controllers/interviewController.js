const Interview = require('../models/Interview');
const Question = require('../models/Question');
const Answer = require('../models/Answer');
const asyncHandler = require('../utils/asyncHandler');
const { failure , success } = require('../utils/apiResponse');

const getInterview = asyncHandler(async(req , res) => {
    const { interviewId } = req.params;

    const interview = await Interview.findById(interviewId);
    if(!interview) {
        return failure(res , 'Interview Are Not Found' , 404);
    }

    const questions = await Question.find({interviewId}).sort({order:1});
    const answer = await Answer.find({questionId: {$in: questions.map((q)=>q._id)}});

    return success(res, { interview, questions, answers });
})

module.exports = {getInterview};
