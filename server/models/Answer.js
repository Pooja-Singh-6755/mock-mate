// server/src/models/Answer.js
import mongoose from 'mongoose';

const answerSchema = new mongoose.Schema(
  {
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
    answerText: { type: String, required: true },
    score: { type: Number, min: 0, max: 10, required: true },
    feedback: { type: String, required: true },
    timeTakenSec: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model('Answer', answerSchema);