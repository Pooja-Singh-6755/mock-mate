const mongoose = require('mongoose');

const interviewSchema = new mongoose.Schema ({
    candidateID : {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true,
    },

    type: { type: String, enum: ['text', 'audio', 'video', 'coding', 'mcq'], default: 'text' },
    role: { type: String , required: true},
    difficultyLevel : {type: String , enum: ['Beginner' , 'Intermediate' , 'Advanced' , 'Expert'], default: 'Beginner'},
    status: {type: String , enum: ['in-progess' , 'complated'], default: 'in-progess'},
    overallScore: {type: Number , default: 0 },
    totalQuestion: {type: Number, default: 5},
    startTime: {type: Date , default: Date.now},
    endTime: {type: Date},
} ,

  {timestamps : true} //creation time store inmongoose it is used for histroy

);

module.exports = mongoose.model('Interview' , interviewSchema)