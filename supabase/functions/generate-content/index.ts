// ═══════════════════════════════════════════════════════════
// CreatorForge — generate-content Edge Function
//
// All AI generation goes through here so the provider API key never
// ships to the browser. Flow:
//   1. Verify the caller's JWT (user id comes from the token, never the body)
//   2. Check plan + today's usage → 429 when a free user is over the cap
//   3. Call the provider chosen by the AI_PROVIDER secret (groq default)
//   4. Log tokens + estimated cost to ai_usage for the admin monitor
//
// Deploy:   supabase functions deploy generate-content
// Secrets:  supabase secrets set AI_PROVIDER=groq AI_API_KEY=gsk_...
//           (optional) AI_MODEL=llama-3.3-70b-versatile
// Switch provider later: change AI_PROVIDER (+key) — nothing else.
// ═══════════════════════════════════════════════════════════
import { createClient } from "npm:@supabase/supabase-js@2";

const FREE_DAILY_LIMIT = 10;

// Rough public pricing (USD per 1M tokens) for the cost monitor
const PROVIDERS: Record<string, {
  url: string;
  defaultModel: string;
  style: "openai" | "anthropic";
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

    const { tool = "unknown", system = "", messages = [], maxTokens = 2048 } =
      await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return json({ error: "messages required" }, 400);
    }

    // ── 2. Plan + daily usage check (service role: bypasses RLS) ──
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: profile } = await admin
      .from("profiles").select("plan").eq("id", user.id).single();
    const plan = profile?.plan ?? "free";

    if (plan === "free") {
      const today = new Date().toISOString().slice(0, 10);
      const { count } = await admin
        .from("generations")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", `${today}T00:00:00Z`);
      if ((count ?? 0) >= FREE_DAILY_LIMIT) {
        return json({
          error: "Daily free limit reached. Upgrade to Premium for unlimited generations.",
          code: "LIMIT_REACHED",
        }, 429);
      }
    }

    // ── 3. Call the provider ──────────────────────────────────────
    const providerName = Deno.env.get("AI_PROVIDER") ?? "groq";
    const provider = PROVIDERS[providerName];
    const apiKey = Deno.env.get("AI_API_KEY");
    if (!provider || !apiKey) {
      return json({ error: "AI provider not configured. Set AI_PROVIDER and AI_API_KEY secrets." }, 500);
    }
    const model = Deno.env.get("AI_MODEL") || provider.defaultModel;

    let text = "";
    let inputTokens = 0;
    let outputTokens = 0;

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
      if (!res.ok) {
        return json({ error: `AI provider error ${res.status}: ${(await res.text()).slice(0, 300)}` }, 502);
      }
      const data = await res.json();
      text = data.content?.[0]?.text ?? "";
      inputTokens = data.usage?.input_tokens ?? 0;
      outputTokens = data.usage?.output_tokens ?? 0;
    } else {
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
      if (!res.ok) {
        return json({ error: `AI provider error ${res.status}: ${(await res.text()).slice(0, 300)}` }, 502);
      }
      const data = await res.json();
      text = data.choices?.[0]?.message?.content ?? "";
      inputTokens = data.usage?.prompt_tokens ?? 0;
      outputTokens = data.usage?.completion_tokens ?? 0;
    }

    // ── 4. Log usage for the admin cost monitor ───────────────────
    const cost =
      (inputTokens * provider.costPer1M.input + outputTokens * provider.costPer1M.output) / 1e6;
    // Non-fatal: a logging failure must not lose the generation
    await admin.from("ai_usage").insert({
      user_id: user.id,
      tool,
      provider: providerName,
      model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cost,
    });

    return json({
      text,
      usage: { provider: providerName, model, inputTokens, outputTokens, cost },
    });
  } catch (e) {
    return json({ error: (e as Error).message ?? "Unexpected error" }, 500);
  }
});
