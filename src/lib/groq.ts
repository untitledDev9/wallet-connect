import { SITE_KNOWLEDGE } from './siteKnowledge'

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'

const SYSTEM_PROMPT =
  'You are the support assistant embedded on this WalletConnect website. Answer ONLY using ' +
  'the facts about this website given below — do not rely on your own general or trained ' +
  'knowledge about WalletConnect, crypto, or anything else, since this site may differ from ' +
  'what you already know. If the answer is not in the information below, say you are not ' +
  'sure and that a human from the team will follow up soon — do not guess or make anything ' +
  'up. Keep answers short, friendly, and concise. A human admin may join this conversation ' +
  'at any time.\n\n' +
  SITE_KNOWLEDGE

export type GroqMessage = { role: 'user' | 'assistant'; content: string }

export async function generateAutoReply(history: GroqMessage[]): Promise<string | null> {
  const apiKey = process.env.GROQ_API
  if (!apiKey) return null

  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...history],
        max_tokens: 300,
        temperature: 0.5,
      }),
    })

    if (!res.ok) {
      console.error('Groq API error', res.status, await res.text())
      return null
    }

    const data = await res.json()
    const reply = data.choices?.[0]?.message?.content
    return typeof reply === 'string' ? reply.trim() : null
  } catch (err) {
    console.error('Groq API request failed', err)
    return null
  }
}
