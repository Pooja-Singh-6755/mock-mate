// server/src/models/Interview.js
import mongoose from 'mongoose';

const interviewSchema = new mongoose.Schema(
  {
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['text', 'audio', 'video', 'coding', 'mcq'], default: 'text' },
    role: { type: String, required: true },
    difficultyLevel: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
      default: 'Beginner',
    },
    status: { type: String, enum: ['in-progress', 'completed'], default: 'in-progress' },
    overallScore: { type: Number, default: 0 },
    totalQuestions: { type: Number, default: 5 },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model('Interview', interviewSchema);