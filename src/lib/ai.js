/**
 * Modular AI provider layer.
 *
 * Call priority in generate():
 *   1. User's own key from Settings (BYOK) → direct browser call
 *   2. Supabase configured → `generate-content` edge function
 *      (server-side key from Supabase secrets, plan/limit checked
 *      server-side, usage logged to ai_usage)
 *   3. VITE_AI_API_KEY in .env → direct call (local dev convenience)
 *   4. No key anywhere → rich built-in demo content
 *
 * Switching provider server-side = changing the AI_PROVIDER secret.
 */
import { supabase, isSupabaseConfigured } from './supabase'
import { demoGenerate } from './demoContent'

const PROVIDERS = {
  groq: {
    label: 'Groq (free tier)',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    defaultModel: 'llama-3.3-70b-versatile',
    style: 'openai',
    // Rough public pricing (USD per 1M tokens) for the cost monitor
    costPer1M: { input: 0.59, output: 0.79 },
  },
  openai: {
    label: 'OpenAI',
    url: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4o-mini',
    style: 'openai',
    costPer1M: { input: 0.15, output: 0.6 },
  },
  anthropic: {
    label: 'Anthropic Claude',
    url: 'https://api.anthropic.com/v1/messages',
    defaultModel: 'claude-haiku-4-5-20251001',
    style: 'anthropic',
    costPer1M: { input: 1.0, output: 5.0 },
  },
}

/** Resolve provider + key: user override (Settings) beats env. */
export function getAIConfig() {
  const override = JSON.parse(localStorage.getItem('cf_ai_override') || 'null')
  const provider = override?.provider || import.meta.env.VITE_AI_PROVIDER || 'groq'
  const apiKey = override?.apiKey || import.meta.env.VITE_AI_API_KEY || ''
  const model =
    override?.model || import.meta.env.VITE_AI_MODEL || PROVIDERS[provider]?.defaultModel
  return { provider, apiKey, model, meta: PROVIDERS[provider] }
}

// With Supabase connected, generation runs through the edge function
// (server-side key) even when no key exists in the browser.
export const isAIConfigured = () => isSupabaseConfigured || Boolean(getAIConfig().apiKey)

export function setAIOverride({ provider, apiKey, model }) {
  if (!provider && !apiKey && !model) localStorage.removeItem('cf_ai_override')
  else localStorage.setItem('cf_ai_override', JSON.stringify({ provider, apiKey, model }))
}

/* ── Usage tracking (for admin API cost monitor) ─────────── */
function logUsage({ provider, model, inputTokens, outputTokens, tool }) {
  const meta = PROVIDERS[provider]
  const cost = meta
    ? (inputTokens * meta.costPer1M.input + outputTokens * meta.costPer1M.output) / 1e6
    : 0
  const log = JSON.parse(localStorage.getItem('cf_usage_log') || '[]')
  log.push({ at: Date.now(), provider, model, inputTokens, outputTokens, cost, tool })
  // keep last 500 entries
  localStorage.setItem('cf_usage_log', JSON.stringify(log.slice(-500)))
}

export const getUsageLog = () => JSON.parse(localStorage.getItem('cf_usage_log') || '[]')

/* ── Edge function path (production) ─────────────────────── */
async function generateViaEdge({ system, messages, tool, maxTokens }) {
  const { data, error } = await supabase.functions.invoke('generate-content', {
    body: { tool, system, messages, maxTokens },
  })
  if (error) {
    // FunctionsHttpError carries the response — surface the server's message
    let message = error.message
    try {
      const body = await error.context?.json()
      if (body?.error) message = body.error
    } catch { /* keep generic message */ }
    throw new Error(message || 'Generation failed — please try again.')
  }
  if (data?.error) throw new Error(data.error)
  if (data?.usage) {
    logUsage({
      provider: data.usage.provider,
      model: data.usage.model,
      inputTokens: data.usage.inputTokens,
      outputTokens: data.usage.outputTokens,
      tool,
    })
  }
  return data?.text ?? ''
}

/* ── Core generate call ──────────────────────────────────── */

/**
 * Run a chat completion.
 * @param {object} opts
 * @param {string} opts.system  System prompt (tool persona)
 * @param {Array<{role:string, content:string}>} opts.messages
 * @param {string} [opts.tool]  Tool id for usage logging
 * @returns {Promise<string>} assistant text
 */
export async function generate({ system, messages, tool = 'unknown', maxTokens = 2048 }) {
  const { provider, apiKey, model, meta } = getAIConfig()
  const hasOverride = Boolean(localStorage.getItem('cf_ai_override')) && apiKey

  // Production path: server-side key via the edge function (unless the
  // user brought their own key in Settings, which takes precedence)
  if (isSupabaseConfigured && !hasOverride) {
    return generateViaEdge({ system, messages, tool, maxTokens })
  }

  // No key → rich built-in demo content so the product is explorable
  if (!apiKey || !meta) {
    await new Promise((r) => setTimeout(r, 1400)) // simulate latency
    return demoGenerate(tool, messages)
  }

  if (meta.style === 'anthropic') {
    const res = await fetch(meta.url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({ model, max_tokens: maxTokens, system, messages }),
    })
    if (!res.ok) throw new Error(`AI error ${res.status}: ${(await res.text()).slice(0, 200)}`)
    const data = await res.json()
    logUsage({
      provider, model, tool,
      inputTokens: data.usage?.input_tokens ?? 0,
      outputTokens: data.usage?.output_tokens ?? 0,
    })
    return data.content?.[0]?.text ?? ''
  }

  // OpenAI-compatible (Groq, OpenAI)
  const res = await fetch(meta.url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [{ role: 'system', content: system }, ...messages],
    }),
  })
  if (!res.ok) throw new Error(`AI error ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const data = await res.json()
  logUsage({
    provider, model, tool,
    inputTokens: data.usage?.prompt_tokens ?? 0,
    outputTokens: data.usage?.completion_tokens ?? 0,
  })
  return data.choices?.[0]?.message?.content ?? ''
}
