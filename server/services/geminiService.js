// server/src/services/geminiService.js
import { callGemini, streamGemini } from '../config/gemini.js';

// FIX: your version had "require('../../config/gemini')" — one level too deep.
// Since this file lives at server/src/services/geminiService.js and gemini.js lives
// at server/src/config/gemini.js, only ONE "../" is needed to reach src/, then into config/.

// Rotating topic pool — decided by US (not by Gemini), based on question order.
// Keeps things varied across the interview instead of asking the same topic every time.
const TOPIC_POOL = [
  'JavaScript Fundamentals', 'React', 'Node.js', 'Express.js',
  'MongoDB', 'REST APIs', 'Authentication & Security', 'System Design',
];

function pickTopic(order) {
  return TOPIC_POOL[(order - 1) % TOPIC_POOL.length];
}

function safeParseJSON(raw) {
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`Failed to parse Gemini JSON response: ${err.message}\nRaw: ${cleaned}`);
  }
}

/**
 * Non-streaming question generator (kept for any REST/manual use — the live
 * socket flow uses streamGenerateQuestion below instead).
 */
export async function generateQuestion({ role, difficulty, previousQuestions = [], topic }) {
  // FIX: was "topics && topics.trim()" (undefined var "topics") and "${roles}" typo.
  const activeTopic = topic && topic.trim() !== '' ? topic : `${role} core concepts`;

  // FIX: was using "previousQuestion" (param name) to check .length but then
  // referencing "previousQuestions" (different name) inside the template — ReferenceError.
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

Return ONLY valid JSON, no markdown, no explanation, in this exact shape:
{"text": "the question text", "topic": "${activeTopic}", "difficulty": "${difficulty}"}
`.trim();

  const raw = await callGemini(prompt, { temperature: 0.8, maxOutputTokens: 300 });
  const parsed = safeParseJSON(raw);

  if (!parsed.text) {
    throw new Error('Gemini response missing required question text.');
  }

  // FIX: was returning "activeTopics" (shorthand of a var that didn't exist) instead
  // of "topic: activeTopic" — the Question model needs a key literally named "topic".
  return { text: parsed.text, topic: activeTopic, difficulty: parsed.difficulty || difficulty };
}

/**
 * Evaluates a candidate's answer — score (0-10) + written feedback.
 */
export async function evaluateAnswer({ questionText, answerText, role }) {
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

export function nextDifficulty(currentDifficulty, lastScore) {
  const levels = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
  const idx = levels.indexOf(currentDifficulty);
  if (lastScore >= 8 && idx < levels.length - 1) return levels[idx + 1];
  if (lastScore <= 3 && idx > 0) return levels[idx - 1];
  return currentDifficulty;
}

/**
 * Streaming question generator — powers the live typing effect.
 * FIX: your version took "topic" as a param but the caller (interviewSocket.js)
 * only ever passes "order" — topic was always falling back to the generic
 * "${role} core concepts" every single question. Restored order-based rotation
 * (same pattern as generateQuestion) so topics actually vary across questions.
 */
export async function streamGenerateQuestion({ role, difficulty, order, previousQuestions = [], onChunk }) {
  const activeTopic = pickTopic(order);

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