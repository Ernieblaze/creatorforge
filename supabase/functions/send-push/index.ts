// ═══════════════════════════════════════════════════════════
// CreatorForge — send-push
//
// Sends an Android push notification via Firebase Cloud Messaging (FCM
// HTTP v1). Admin-only (or internal service-role calls). Body:
//   { title, body, user_id?, path? }
//   - user_id omitted → broadcast to every registered device
//   - path (e.g. "/app/partner") → opens that page when the user taps it
//
// Deploy:  supabase functions deploy send-push
// Secret:  FCM_SERVICE_ACCOUNT = <the full service-account JSON, one line>
//          (Firebase Console → Project settings → Service accounts →
//           Generate new private key → paste the JSON contents)
// ═══════════════════════════════════════════════════════════
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "content-type": "application/json" } });

/** Base64url without padding. */
function b64url(data: Uint8Array | string): string {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Mint a Google OAuth access token from the service account (RS256 JWT). */
async function getAccessToken(sa: { client_email: string; private_key: string; token_uri: string }): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: sa.token_uri,
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claims))}`;

  // Import the PEM PKCS#8 private key for RS256 signing.
  const pem = sa.private_key.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8", der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned)));
  const jwt = `${unsigned}.${b64url(sig)}`;

  const res = await fetch(sa.token_uri, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`OAuth failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // ── Authorize: admin JWT, or internal service-role secret ──
    const authHeader = req.headers.get("Authorization") ?? "";
    const internalKey = req.headers.get("x-internal-key");
    let allowed = internalKey && internalKey === Deno.env.get("INTERNAL_PUSH_KEY");
    if (!allowed) {
      const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
      const { data: { user } } = await userClient.auth.getUser();
      if (user) {
        const { data: isAdmin } = await admin.rpc("is_admin");
        // is_admin() reads the caller's JWT; call it through the user client instead
        const { data: adminCheck } = await userClient.rpc("is_admin");
        allowed = Boolean(adminCheck ?? isAdmin);
      }
    }
    if (!allowed) return json({ error: "Admins only" }, 403);

    const { title, body, user_id, path } = await req.json();
    if (!title || !body) return json({ error: "title and body required" }, 400);

    const saRaw = Deno.env.get("FCM_SERVICE_ACCOUNT");
    if (!saRaw) return json({ error: "FCM_SERVICE_ACCOUNT not set" }, 500);
    const sa = JSON.parse(saRaw);
    const accessToken = await getAccessToken(sa);

    // ── Collect target device tokens ──
    let q = admin.from("device_tokens").select("token, user_id");
    if (user_id) q = q.eq("user_id", user_id);
    const { data: rows } = await q;
    const tokens = (rows ?? []).map((r: { token: string }) => r.token);
    if (tokens.length === 0) return json({ sent: 0, note: "no registered devices" });

    // ── Send one message per token (FCM v1 has no multicast on this path) ──
    const endpoint = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`;
    let sent = 0;
    const dead: string[] = [];
    for (const token of tokens) {
      const message = {
        message: {
          token,
          notification: { title, body },
          data: path ? { path: String(path) } : {},
          android: { notification: { icon: "ic_stat_bolt", color: "#6366F1" }, priority: "high" },
        },
      };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
        body: JSON.stringify(message),
      });
      if (res.ok) sent++;
      else if (res.status === 404 || res.status === 400) dead.push(token); // stale token
    }
    // Prune dead tokens so the list stays clean.
    if (dead.length) await admin.from("device_tokens").delete().in("token", dead);

    return json({ sent, total: tokens.length, pruned: dead.length });
  } catch (e) {
    return json({ error: (e as Error).message ?? "Unexpected error" }, 500);
  }
});
