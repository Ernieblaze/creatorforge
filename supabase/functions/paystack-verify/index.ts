// ═══════════════════════════════════════════════════════════
// CreatorForge — paystack-verify
//
// Called by the frontend right after inline checkout succeeds, so the
// user is premium *instantly* instead of waiting for the webhook (which
// remains the source of truth for renewals/cancellations). Verifies the
// transaction with Paystack server-side — the client's word is never
// trusted — and requires the payer's email to match the caller.
//
// Deploy:  supabase functions deploy paystack-verify
// Secrets: PAYSTACK_SECRET_KEY (shared with the webhook)
// ═══════════════════════════════════════════════════════════
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status, headers: { ...CORS, "content-type": "application/json" },
  });

function accessUntil(interval: string): string {
  const d = new Date();
  d.setDate(d.getDate() + (interval === "yearly" ? 366 : 32));
  return d.toISOString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  try {
    const secret = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!secret) return json({ error: "PAYSTACK_SECRET_KEY not set" }, 500);

    // Caller identity from the JWT
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Not signed in" }, 401);

    const { reference } = await req.json();
    if (!reference) return json({ error: "reference required" }, 400);

    // Server-to-server verification with Paystack
    const res = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { authorization: `Bearer ${secret}` } },
    );
    const body = await res.json();
    const txn = body?.data;
    if (!res.ok || txn?.status !== "success") {
      return json({ error: "Payment not verified. If you were charged, contact support with your reference." }, 402);
    }

    // The payment must belong to the caller
    const payerEmail = (txn.customer?.email ?? "").toLowerCase();
    const metaUser = txn.metadata?.user_id;
    if (metaUser !== user.id && payerEmail !== (user.email ?? "").toLowerCase()) {
      return json({ error: "Payment does not match this account." }, 403);
    }

    const interval =
      txn.metadata?.interval ?? (txn.amount >= 3_000_000 ? "yearly" : "monthly");
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    await admin.from("subscriptions").upsert(
      {
        user_id: user.id,
        provider: "paystack",
        reference: txn.reference,
        amount_kobo: txn.amount,
        interval,
        status: "active",
        plan_code: txn.plan_object?.plan_code ?? txn.plan ?? null,
        expires_at: accessUntil(interval),
      },
      { onConflict: "reference" },
    );
    await admin.from("profiles").update({
      plan: "premium",
      premium_until: accessUntil(interval),
    }).eq("id", user.id);

    return json({ ok: true, plan: "premium", interval });
  } catch (e) {
    return json({ error: (e as Error).message ?? "Unexpected error" }, 500);
  }
});
