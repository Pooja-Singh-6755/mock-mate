const { callGemini , streamGemini} = require('../../config/gemini');

function safeParseJSON(raw) {
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`Failed to parse Gemini JSON response: ${err.message}\nRaw: ${cleaned}`);
  }
}


async function generateQuestion({role , difficulty , previousQuestion = [] , topic }) {
    const activeTopics = topics && topics.trim() !== '' ? topic : `${roles} core concepts`

    const avoidList  = previousQuestion.length ? `Do NOT repeat or closely rephrase any of these already-asked questions:\n${previousQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
    : 'this is first interview question' ;

 const prompt = `
You are an experienced technical interviewer conducting a mock interview.
Role: "${role}"
Target Focus Topic: "${activeTopic}"
Difficulty Level: "${difficulty}"

Generate ONE technical interview question strictly about "${activeTopic}".

${avoidList}

Return ONLY valid JSON, no markdown, no explanation, in this exact shape:
{"text": "the question text", "topic": "${activeTopic}", "difficulty": "${difficulty}"}
`.trim();

const raw = await callGemini(prompt , { temperature : 0.8 , maxOutputTokens: 300});
const parsed =  safeParseJSON(raw);

if (!parsed.text) {
    throw new Error('Gemini response missing required question text.');
  }

  return { text: parsed.text , activeTopics , difficulty: parsed.difficulty || difficulty};
}

async function evaluateAnswer({ questionText, answerText, role }) {
  const prompt = `
You are grading a candidate's answer in a mock interview for the role: "${role}".

Question: "${questionText}"
Candidate's answer: "${answerText}"

Score the answer from 0 to 10 (10 = excellent, technically correct and well-explained; 0 = blank or completely wrong).
Give short, constructive feedback (2-3 sentences) — what was good, what was missing or wrong, and one concrete tip to improve.

Return ONLY valid JSON, no markdown, no explanation, in this exact shape:
{"score": <number 0-10>, "feedback": "your feedback text"}
`.trim();

  const raw = await callGemini(prompt, { temperature: 0.4, maxOutputTokens: 400 });
  const parsed = safeParseJSON(raw);

  if (typeof parsed.score !== 'number' || !parsed.feedback) {
    throw new Error('Gemini response missing required evaluation fields.');
  }
  const score = Math.max(0, Math.min(10, parsed.score));
  return { score, feedback: parsed.feedback };
}

function nextDifficulty(currentDifficulty, lastScore) {
  const levels = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
  const idx = levels.indexOf(currentDifficulty);
  if (lastScore >= 8 && idx < levels.length - 1) return levels[idx + 1];
  if (lastScore <= 3 && idx > 0) return levels[idx - 1];
  return currentDifficulty;
}

async function streamGenerateQuestion({ role, difficulty, topic, previousQuestions = [], onChunk }) {
  // Use user's selected topic (e.g. "React", "Backend", "Express.js")
  const activeTopic = topic && topic.trim() !== '' ? topic : `${role} core concepts`;

  const avoidList = previousQuestions.length
    ? `Do NOT repeat or closely rephrase any of these already-asked questions:\n${previousQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
    : 'This is the first question of the interview.';

  const prompt = `
You are an experienced technical interviewer conducting a mock interview.
Role: "${role}"
Target Focus Topic: "${activeTopic}"
Difficulty Level: "${difficulty}"

Generate ONE technical interview question strictly about "${activeTopic}".

${avoidList}

Output ONLY the question text itself — no numbering, no quotes, no markdown, no preamble like "Here's a question:".
`.trim();

  let fullText = '';
  await streamGemini(prompt, { temperature: 0.8, maxOutputTokens: 300 }, (chunk) => {
    fullText += chunk;
    onChunk(chunk);
  });

  return { text: fullText.trim(), topic: activeTopic, difficulty };
}

module.exports = { generateQuestion, evaluateAnswer, nextDifficulty, streamGenerateQuestion };