// ═══════════════════════════════════════════════════════════
// CreatorForge — paystack-manage
//
// Subscription self-service for the signed-in user:
//   { action: "cancel" } → disables auto-renewal via the Paystack API
//     (access continues until premium_until, then the DB trigger treats
//     the account as free)
//   { action: "link" }   → returns Paystack's hosted card-management
//     link so users can update their payment method
//
// Deploy:  supabase functions deploy paystack-manage
// Secrets: PAYSTACK_SECRET_KEY (shared)
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  try {
    const secret = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!secret) return json({ error: "PAYSTACK_SECRET_KEY not set" }, 500);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Not signed in" }, 401);

    const { action } = await req.json();
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // The user's most recent active subscription with Paystack codes
    const { data: sub } = await admin
      .from("subscriptions")
      .select("id, subscription_code, email_token, status")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub?.subscription_code) {
      return json({
        error: "No manageable subscription found yet. Codes arrive via webhook shortly after payment — try again in a minute.",
      }, 404);
    }

    if (action === "cancel") {
      const res = await fetch("https://api.paystack.co/subscription/disable", {
        method: "POST",
        headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
        body: JSON.stringify({ code: sub.subscription_code, token: sub.email_token }),
      });
      const body = await res.json();
      if (!res.ok || body.status === false) {
        return json({ error: body.message ?? "Paystack refused the cancellation." }, 502);
      }
      await admin.from("subscriptions").update({ status: "cancelled" }).eq("id", sub.id);
      return json({ ok: true, message: "Auto-renewal cancelled. Premium stays active until the end of the paid period." });
    }

    if (action === "link") {
      const res = await fetch(
        `https://api.paystack.co/subscription/${sub.subscription_code}/manage/link`,
        { headers: { authorization: `Bearer ${secret}` } },
      );
      const body = await res.json();
      if (!res.ok || !body?.data?.link) {
        return json({ error: body.message ?? "Could not fetch the management link." }, 502);
      }
      return json({ ok: true, link: body.data.link });
    }

    return json({ error: "Unknown action. Use \"cancel\" or \"link\"." }, 400);
  } catch (e) {
    return json({ error: (e as Error).message ?? "Unexpected error" }, 500);
  }
});
