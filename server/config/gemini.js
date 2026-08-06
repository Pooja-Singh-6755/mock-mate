
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash'; // fast + free tier
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

if (!GEMINI_API_KEY) {
  console.warn('[gemini.js] GEMINI_API_KEY missing in .env — Gemini calls will fail.');
}

/**
 * Low-level call to Gemini generateContent endpoint.
 * @param {string} prompt - full prompt text
 * @param {object} [opts]
 * @param {number} [opts.temperature=0.7]
 * @param {number} [opts.maxOutputTokens=800]
 * @returns {Promise<string>} raw text response from Gemini
 */
async function callGemini(prompt, opts = {}) {
  const { temperature = 0.7, maxOutputTokens = 800 } = opts;

  const url = `${GEMINI_BASE_URL}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature, maxOutputTokens },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('Gemini API returned no text — check prompt/safety blocks.');
  }

  return text;
}

/**
 * Streams a Gemini response chunk-by-chunk using the streamGenerateContent SSE endpoint.
 * Calls onChunk(text) for every incremental piece of text as it arrives.
 * @param {string} prompt
 * @param {object} opts - same as callGemini's opts
 * @param {(chunk: string) => void} onChunk
 */
async function streamGemini(prompt, opts = {}, onChunk) {
  const { temperature = 0.7, maxOutputTokens = 800 } = opts;

  // alt=sse makes Gemini return Server-Sent-Event formatted lines ("data: {...}\n\n")
  const url = `${GEMINI_BASE_URL}/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature, maxOutputTokens },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini stream API error (${res.status}): ${errText}`);
  }

  // res.body is a Web ReadableStream (Node 18+ undici fetch) — read it manually.
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop(); // last line might be incomplete — keep it for next round

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const jsonStr = line.slice(6).trim();
      if (!jsonStr) continue;

      try {
        const parsed = JSON.parse(jsonStr);
        const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) onChunk(text);
      } catch {
        // Incomplete JSON chunk split across reads — safe to skip, next chunk completes it.
      }
    }
  }
}

module.exports = { callGemini, streamGemini, GEMINI_MODEL };