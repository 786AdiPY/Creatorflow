// Shared OpenRouter call for every text-generation AI feature (metadata/SEO now;
// reuse this for future text-based modules instead of adding another provider).
// Requires OPENROUTER_API_KEY secret. Model is overridable via OPENROUTER_MODEL.

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const DEFAULT_MODEL = 'openai/gpt-4o-mini'

interface ChatMessage {
  role: 'system' | 'user'
  content: string
}

export async function openRouterComplete(messages: ChatMessage[], options?: { json?: boolean }) {
  const apiKey = Deno.env.get('OPENROUTER_API_KEY')
  if (!apiKey) throw new Error('Missing OPENROUTER_API_KEY secret')

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      // OpenRouter asks for these to attribute usage; harmless if ignored.
      'HTTP-Referer': 'https://github.com/786AdiPY/Creatorflow',
      'X-Title': 'CreatorFlow',
    },
    body: JSON.stringify({
      model: Deno.env.get('OPENROUTER_MODEL') || DEFAULT_MODEL,
      messages,
      ...(options?.json ? { response_format: { type: 'json_object' } } : {}),
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`OpenRouter request failed: ${res.status} ${body}`)
  }

  const data = await res.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('OpenRouter returned no content')
  return content as string
}
