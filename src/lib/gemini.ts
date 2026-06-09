import { extractJson } from './gemini-utils';

export const GEMINI_MODEL = 'gemini-3-flash-preview';
export const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export class GeminiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'GeminiError';
  }
}

function getGeminiApiKey() {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    ""
  );
}

/**
 * Calls the Gemini API and returns the parsed JSON response.
 * Throws GeminiError on any failure (API key missing, network error, bad response).
 */
export async function callGemini<T>(
  systemPrompt: string,
  userPrompt: string,
  config?: { temperature?: number; maxOutputTokens?: number; responseMimeType?: string },
): Promise<T> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new GeminiError('Gemini API key is not configured on the server.', 500);
  }

  const requestBody = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature: config?.temperature ?? 0.3,
      maxOutputTokens: config?.maxOutputTokens ?? 3072,
      ...(config?.responseMimeType ? { responseMimeType: config.responseMimeType } : {}),
    },
  };

  const fetchOptions = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(55_000),
  };

  async function doFetch(): Promise<Response> {
    try {
      return await fetch(`${GEMINI_URL}?key=${apiKey}`, fetchOptions);
    } catch (err) {
      const message = err instanceof Error && err.name === 'TimeoutError'
        ? 'Gemini API timed out. Please try again.'
        : 'Unable to reach Gemini API.';
      throw new GeminiError(message, 503);
    }
  }

  let res = await doFetch();
  for (let attempt = 1; res.status === 429 && attempt <= 3; attempt++) {
    await new Promise(r => setTimeout(r, 2000 * attempt));
    res = await doFetch();
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new GeminiError(`Gemini error (${res.status}): ${text.slice(0, 200)}`, res.status);
  }

  const json = await res.json();
  const rawText: string = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  if (!rawText) {
    throw new GeminiError('Gemini returned no content.', 502);
  }

  try {
    return JSON.parse(extractJson(rawText)) as T;
  } catch {
    throw new GeminiError('Failed to parse AI response.', 502);
  }
}
