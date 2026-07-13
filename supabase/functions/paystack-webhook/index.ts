// ═══════════════════════════════════════════════════════════
// CreatorForge — Paystack webhook handler
//
// Paystack POSTs events here (charge.success, subscription.create,
// subscription.disable, invoice.payment_failed, ...). Every request is
// authenticated by verifying the x-paystack-signature header — an HMAC
// SHA-512 of the raw body using your secret key — so only Paystack can
// flip anyone to premium.
//
// Deploy (IMPORTANT — Paystack sends no JWT, so disable JWT checks):
//   supabase functions deploy paystack-webhook --no-verify-jwt
// Secrets:
//   supabase secrets set PAYSTACK_SECRET_KEY=sk_live_...
// Then set the webhook URL in Paystack Dashboard → Settings → Webhooks:
//   https://<project-ref>.supabase.co/functions/v1/paystack-webhook
// ═══════════════════════════════════════════════════════════
import { createClient } from "npm:@supabase/supabase-js@2";

async function hmacSha512Hex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-512" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Months of access granted per interval (one extra day of grace). */
function accessUntil(interval: string): string {
  const d = new Date();
  d.setDate(d.getDate() + (interval === "yearly" ? 366 : 32));
  return d.toISOString();
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("ok", { status: 200 });

  const secret = Deno.env.get("PAYSTACK_SECRET_KEY");
  if (!secret) return new Response("PAYSTACK_SECRET_KEY not set", { status: 500 });

  // ── Verify the signature against the RAW body ────────────
  const raw = await req.text();
  const expected = await hmacSha512Hex(secret, raw);
  const given = req.headers.get("x-paystack-signature") ?? "";
  if (expected !== given) return new Response("invalid signature", { status: 401 });

  const event = JSON.parse(raw);
  const data = event.data ?? {};
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Resolve the CreatorForge user: metadata.user_id (set by our checkout)
  // with a fallback to the customer email.
  async function resolveUserId(): Promise<string | null> {
    const metaId = data.metadata?.user_id;
    if (metaId) return metaId;
    const email = data.customer?.email;
    if (!email) return null;
    const { data: prof } = await admin
      .from("profiles").select("id").ilike("email", email).limit(1).maybeSingle();
    return prof?.id ?? null;
  }

  switch (event.event) {
    case "charge.success": {
      const userId = await resolveUserId();
      if (!userId) break;
      const interval =
        data.metadata?.interval ??
        (data.amount >= 3_000_000 ? "yearly" : "monthly"); // kobo
      await admin.from("subscriptions").upsert(
        {
          user_id: userId,
          provider: "paystack",
          reference: data.reference,
          amount_kobo: data.amount,
          interval,
          status: "active",
          plan_code: data.plan?.plan_code ?? data.plan_object?.plan_code ?? null,
          expires_at: accessUntil(interval),
        },
        { onConflict: "reference" },
      );
      await admin.from("profiles").update({
        plan: "premium",
        premium_until: accessUntil(interval),
      }).eq("id", userId);
      break;
    }

    case "subscription.create": {
      // Carries the codes needed to cancel later — attach to the
      // user's most recent subscription row.
      const userId = await resolveUserId();
      if (!userId) break;
      const { data: sub } = await admin
        .from("subscriptions").select("id")
        .eq("user_id", userId)
        .order("started_at", { ascending: false })
        .limit(1).maybeSingle();
      if (sub) {
        await admin.from("subscriptions").update({
          subscription_code: data.subscription_code,
          email_token: data.email_token,
          plan_code: data.plan?.plan_code ?? null,
        }).eq("id", sub.id);
      }
      break;
    }

    case "subscription.disable":
    case "subscription.not_renew": {
      // No future charges; access continues until premium_until lapses
      // (the daily-limit trigger treats lapsed premium as free).
      const userId = await resolveUserId();
      if (!userId) break;
      await admin.from("subscriptions")
        .update({ status: "cancelled" })
        .eq("user_id", userId).eq("status", "active");
      break;
    }

    case "invoice.payment_failed": {
      const userId = await resolveUserId();
      if (!userId) break;
      await admin.from("subscriptions")
        .update({ status: "expired" })
        .eq("user_id", userId).eq("status", "active");
      await admin.from("profiles")
        .update({ premium_until: new Date().toISOString() })
        .eq("id", userId);
      break;
    }
  }

  // Always 200 so Paystack doesn't retry events we deliberately skip
  return new Response(JSON.stringify({ received: true }), {
    headers: { "content-type": "application/json" },
  });
});
