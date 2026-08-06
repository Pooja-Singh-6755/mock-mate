const mongoose = require ('mongoose');

const answerScehma = new mongoose.Schema({
  questionID : {type : mongoose.Schema.ObjectId , ref : Question , required : true},
  anwserText : {type: String , requried : true},
  scrore: {type:Number , min: 0 , max: 10 , required: true},
  feebback : {type: String , required : true},
  timeTakenSec: {type : Number , default: 0},
},
{timestamps: true}
)

module.exports = mongoose.model ('Answer' , answerScehma);