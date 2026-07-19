// ═══════════════════════════════════════════════════════════
// CreatorForge — generate-content Edge Function
//
// All AI generation goes through here so the provider API key never
// ships to the browser. Flow:
//   1. Verify the caller's JWT (user id comes from the token, never the body)
//   2. Check plan + today's usage → 429 when a free user is over the cap
//   3. Call the provider chosen by the AI_PROVIDER secret (groq default);
//      if it fails (rate limit/outage) and AI_FALLBACK_PROVIDER +
//      AI_FALLBACK_KEY are set, automatically retry on the fallback
//   4. Log tokens + estimated cost to ai_usage for the admin monitor
//
// Deploy:   supabase functions deploy generate-content
// Secrets:  AI_PROVIDER=groq AI_API_KEY=gsk_...
//           (optional) AI_MODEL=llama-3.3-70b-versatile
//           (optional) AI_FALLBACK_PROVIDER=gemini AI_FALLBACK_KEY=...
//           (optional) AI_FALLBACK_MODEL=gemini-2.0-flash
// ═══════════════════════════════════════════════════════════
import { createClient } from "npm:@supabase/supabase-js@2";

const FREE_DAILY_CREDITS = 5;
const PREMIUM_DAILY_CREDITS = 50;

// Server-side credit price per call. Mirrors src/lib/tools.js — heavy
// tools cost more. Unknown tools fall back to the standard price so a
// spoofed tool id can never make a call free.
const TOOL_CREDITS: Record<string, { basic: number; advanced: number }> = {
  "yt-script": { basic: 2, advanced: 3 },
  "repurposer": { basic: 2, advanced: 3 },
};
const creditCostFor = (tool: string, mode: string): number =>
  TOOL_CREDITS[tool]?.[mode === "advanced" ? "advanced" : "basic"] ??
  (mode === "advanced" ? 2 : 1);

// Rough public pricing (USD per 1M tokens) for the cost monitor
const PROVIDERS: Record<string, {
  url: string;
  defaultModel: string;
  style: "openai" | "anthropic" | "gemini";
  costPer1M: { input: number; output: number };
}> = {
  groq: {
    url: "https://api.groq.com/openai/v1/chat/completions",
    defaultModel: "llama-3.3-70b-versatile",
    style: "openai",
    costPer1M: { input: 0.59, output: 0.79 },
  },
  openai: {
    url: "https://api.openai.com/v1/chat/completions",
    defaultModel: "gpt-4o-mini",
    style: "openai",
    costPer1M: { input: 0.15, output: 0.6 },
  },
  anthropic: {
    url: "https://api.anthropic.com/v1/messages",
    defaultModel: "claude-haiku-4-5-20251001",
    style: "anthropic",
    costPer1M: { input: 1.0, output: 5.0 },
  },
  gemini: {
    url: "https://generativelanguage.googleapis.com/v1beta/models",
    defaultModel: "gemini-2.0-flash",
    style: "gemini",
    costPer1M: { input: 0.1, output: 0.4 },
  },
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "content-type": "application/json" },
  });

type Msg = { role: string; content: string };
type CallResult = { text: string; inputTokens: number; outputTokens: number };

/** Call one provider; throws on any failure so the caller can fall back. */
async function callProvider(
  name: string,
  apiKey: string,
  model: string,
  { system, messages, maxTokens }: { system: string; messages: Msg[]; maxTokens: number },
): Promise<CallResult> {
  const provider = PROVIDERS[name];
  if (!provider) throw new Error(`Unknown provider: ${name}`);

  if (provider.style === "anthropic") {
    const res = await fetch(provider.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model, max_tokens: maxTokens, system, messages }),
    });
    if (!res.ok) throw new Error(`${name} error ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = await res.json();
    return {
      text: data.content?.[0]?.text ?? "",
      inputTokens: data.usage?.input_tokens ?? 0,
      outputTokens: data.usage?.output_tokens ?? 0,
    };
  }

  if (provider.style === "gemini") {
    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
    const res = await fetch(
      `${provider.url}/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: system }] },
          contents,
          generationConfig: { maxOutputTokens: maxTokens },
        }),
      },
    );
    if (!res.ok) throw new Error(`${name} error ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = await res.json();
    return {
      text: data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "",
      inputTokens: data.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
    };
  }

  // OpenAI-compatible (Groq, OpenAI)
  const res = await fetch(provider.url, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [{ role: "system", content: system }, ...messages],
    }),
  });
  if (!res.ok) throw new Error(`${name} error ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  return {
    text: data.choices?.[0]?.message?.content ?? "",
    inputTokens: data.usage?.prompt_tokens ?? 0,
    outputTokens: data.usage?.completion_tokens ?? 0,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // ── 1. Who is calling? (from the JWT, never the request body) ──
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Not signed in" }, 401);

    const { tool = "unknown", system = "", messages = [], maxTokens = 2048, mode = "basic" } =
      await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return json({ error: "messages required" }, 400);
    }

    // ── 2. Plan + daily credit check (service role: bypasses RLS) ──
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: profile } = await admin
      .from("profiles").select("plan, premium_until, bonus_credits").eq("id", user.id).single();
    let plan = profile?.plan ?? "free";
    if (plan === "premium" && profile?.premium_until && new Date(profile.premium_until) < new Date()) {
      plan = "free"; // lapsed premium
    }

    // Referral bonus credits extend the daily budget (consumed by the DB trigger)
    const bonusCredits = profile?.bonus_credits ?? 0;
    const cap = (plan === "premium" ? PREMIUM_DAILY_CREDITS : FREE_DAILY_CREDITS) + bonusCredits;
    const creditCost = creditCostFor(tool, mode);
    // Usage is counted from ai_usage — rows THIS function writes — so
    // every AI call is billed even if the caller never saves the result.
    // (Counting client-written `generations` rows let scripts drain the
    // AI budget for free.)
    const today = new Date().toISOString().slice(0, 10);
    const { data: todaysRows } = await admin
      .from("ai_usage")
      .select("credits")
      .eq("user_id", user.id)
      .gte("created_at", `${today}T00:00:00Z`);
    const usedCredits = (todaysRows ?? []).reduce(
      (s: number, r: { credits?: number }) => s + (r.credits ?? 1), 0,
    );
    if (usedCredits + creditCost > cap) {
      return json({
        error: "Daily credit limit reached. Upgrade to Premium for unlimited generations.",
        code: "LIMIT_REACHED",
      }, 429);
    }

    // ── 3. Call the provider (with automatic fallback) ─────────────
    let providerName = Deno.env.get("AI_PROVIDER") ?? "groq";
    const apiKey = Deno.env.get("AI_API_KEY");
    if (!PROVIDERS[providerName] || !apiKey) {
      return json({ error: "AI provider not configured. Set AI_PROVIDER and AI_API_KEY secrets." }, 500);
    }
    let model = Deno.env.get("AI_MODEL") || PROVIDERS[providerName].defaultModel;

    let result: CallResult;
    try {
      result = await callProvider(providerName, apiKey, model, { system, messages, maxTokens });
    } catch (primaryErr) {
      const fbName = Deno.env.get("AI_FALLBACK_PROVIDER");
      const fbKey = Deno.env.get("AI_FALLBACK_KEY");
      if (fbName && fbKey && PROVIDERS[fbName]) {
        model = Deno.env.get("AI_FALLBACK_MODEL") || PROVIDERS[fbName].defaultModel;
        result = await callProvider(fbName, fbKey, model, { system, messages, maxTokens });
        providerName = fbName;
      } else {
        return json({ error: `AI provider error: ${(primaryErr as Error).message.slice(0, 300)}` }, 502);
      }
    }

    // ── 4. Log usage for the admin cost monitor ───────────────────
    const meta = PROVIDERS[providerName];
    const cost =
      (result.inputTokens * meta.costPer1M.input + result.outputTokens * meta.costPer1M.output) / 1e6;
    // The ai_usage row is also the credit ledger (see limit check above).
    // Insert with credits; if the column isn't migrated yet, retry without
    // it — and never let a logging failure lose a paid-for generation.
    try {
      const row = {
        user_id: user.id,
        tool,
        provider: providerName,
        model,
        input_tokens: result.inputTokens,
        output_tokens: result.outputTokens,
        cost,
      };
      const { error: logErr } = await admin.from("ai_usage")
        .insert({ ...row, credits: creditCost });
      if (logErr) await admin.from("ai_usage").insert(row);
    } catch { /* non-fatal */ }

    return json({
      text: result.text,
      usage: {
        provider: providerName, model,
        inputTokens: result.inputTokens, outputTokens: result.outputTokens, cost,
      },
    });
  } catch (e) {
    return json({ error: (e as Error).message ?? "Unexpected error" }, 500);
  }
});
