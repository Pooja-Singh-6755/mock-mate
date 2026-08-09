// server/src/config/gemini.js
// NOTE: file name kept as "gemini.js" so imports elsewhere (geminiService.js)
// don't need to change. Internally this now calls Groq's free API instead of
// Google Gemini, because Gemini API keys are currently blocked account-wide
// (Google-side bug, not fixable from our side).
import dotenv from 'dotenv';
dotenv.config();

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

if (!GROQ_API_KEY) {
  console.error('[gemini.js] CRITICAL: GROQ_API_KEY is missing in .env!');
}

async function fetchWithRetry(url, options, retries = 3, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url, options);
    if (res.status !== 429) return res;
    console.warn(`[gemini.js] 429 Rate limited. Waiting ${delay / 1000}s before retry ${i + 1}/${retries}...`);
    await new Promise((resolve) => setTimeout(resolve, delay));
    delay *= 2; // exponential backoff
  }
  return await fetch(url, options);
}

// Non-streaming call — used by evaluateAnswer() and generateQuestion().
export async function callGemini(prompt, opts = {}) {
  const { temperature = 0.7, maxOutputTokens = 800 } = opts;

  const body = {
    model: GROQ_MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature,
    max_tokens: maxOutputTokens,
  };

  const res = await fetchWithRetry(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error('Groq API returned no text.');
  return text;
}

// Streaming call — used by streamGenerateQuestion() for the live typing effect.
export async function streamGemini(prompt, opts = {}, onChunk) {
  const { temperature = 0.7, maxOutputTokens = 800 } = opts;

  const body = {
    model: GROQ_MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature,
    max_tokens: maxOutputTokens,
    stream: true,
  };

  const res = await fetchWithRetry(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq stream API error (${res.status}): ${errText}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const jsonStr = line.slice(6).trim();
      if (!jsonStr || jsonStr === '[DONE]') continue;

      try {
        const parsed = JSON.parse(jsonStr);
        const text = parsed?.choices?.[0]?.delta?.content;
        if (text) onChunk(text);
      } catch {
        // Safe to skip partial JSON chunks
      }
    }
  }
}

// Kept for compatibility with any code importing GEMINI_MODEL.
export const GEMINI_MODEL = GROQ_MODEL;