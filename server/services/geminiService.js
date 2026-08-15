// server/src/services/geminiService.js
import { callGemini, streamGemini } from '../config/gemini.js';


const ROLE_TOPIC_POOLS = {
  frontend: [
    'JavaScript Fundamentals',
    'Angular',
    'CSS & Responsive Design',
    'State Management',
    'Browser APIs & DOM',
    'Performance & Accessibility',
    'Frontend Testing',
    'Frontend Architecture',
  ],
  backend: [
    'Node.js',
    'Express.js',
    'MongoDB',
    'REST API Design',
    'Authentication & Security',
    'Database Design & Indexing',
    'Caching & Performance',
    'Error Handling & Middleware',
  ],
  'system-design': [
    'Scalability Fundamentals',
    'Database Design',
    'Caching Strategies',
    'Load Balancing',
    'Microservices vs Monolith',
    'API Design',
    'Message Queues',
    'CAP Theorem & Trade-offs',
  ],
  mern: [
    'JavaScript Fundamentals',
    'React',
    'Node.js',
    'Express.js',
    'MongoDB',
    'REST APIs',
    'Authentication & Security',
    'System Design',
  ],
};


function normalizeRoleKey(role = '') {
  const r = role.toLowerCase();
  if (r.includes('frontend')) return 'frontend';
  if (r.includes('backend')) return 'backend';
  if (r.includes('system design') || r.includes('system-design')) return 'system-design';
  return 'mern';
}

function pickTopic(role, order) {
  const pool = ROLE_TOPIC_POOLS[normalizeRoleKey(role)] || ROLE_TOPIC_POOLS.mern;
  return pool[(order - 1) % pool.length];
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
  const activeTopic = topic && topic.trim() !== '' ? topic : `${role} core concepts`;

  const avoidList = previousQuestions.length
    ? `Do NOT repeat or closely rephrase any of these already-asked questions:\n${previousQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
    : 'This is the first question of the interview.';

  const prompt = `
You are an experienced technical interviewer conducting a mock interview.
Role: "${role}"
Target Focus Topic: "${activeTopic}"
Difficulty Level: "${difficulty}"

Generate ONE technical interview question strictly about "${activeTopic}", relevant to the "${role}" role.

${avoidList}

Return ONLY valid JSON, no markdown, no explanation, in this exact shape:
{"text": "the question text", "topic": "${activeTopic}", "difficulty": "${difficulty}"}
`.trim();

  const raw = await callGemini(prompt, { temperature: 0.8, maxOutputTokens: 300 });
  const parsed = safeParseJSON(raw);

  if (!parsed.text) {
    throw new Error('Gemini response missing required question text.');
  }

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
 * FIX: now passes `role` into pickTopic() so the topic pool actually matches
 * the selected role (Frontend / Backend / System design / MERN), instead of
 * always rotating through the same fixed MERN-flavoured list.
 */
export async function streamGenerateQuestion({ role, difficulty, order, previousQuestions = [], onChunk }) {
  const activeTopic = pickTopic(role, order);

  const avoidList = previousQuestions.length
    ? `Do NOT repeat or closely rephrase any of these already-asked questions:\n${previousQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
    : 'This is the first question of the interview.';

  const prompt = `
You are an experienced technical interviewer conducting a mock interview.
Role: "${role}"
Target Focus Topic: "${activeTopic}"
Difficulty Level: "${difficulty}"

Generate ONE technical interview question strictly about "${activeTopic}", relevant to the "${role}" role.

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