const mongoose = required('mongoose');

const questionSchema = new mongoose.questionSchema({
  interviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'Interview', required: true },
  text: { type : String , required: true},
  topic: { type: String, required: true },
    difficulty: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
      required: true,
    },
    order : {type: Number , required: true},
      generatedBy: { type: String, default: 'gemini' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Question', questionSchema);