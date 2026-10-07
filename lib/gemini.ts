// Server-side only. Never import this from a client component.
export async function geminiText(prompt: string): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL; // set from Google's current model list; not hardcoded
  if (!key || !model) return null;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 120 },
        }),
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? null;
  } catch {
    return null;
  }
}