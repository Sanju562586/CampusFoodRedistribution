/**
 * keepAlive.js
 * ─────────────────────────────────────────────────────────────
 * Prevents Render free-tier cold starts by pinging /api/ping
 * every 14 minutes (Render sleeps after 15 min of inactivity).
 *
 * ⚠️  Only runs in production AND only in the primary cluster process
 *     (not in each worker) to avoid thundering-herd self-pings.
 *
 * Controlled by APP_URL env var — if not set, self-ping is skipped silently.
 */

const INTERVAL_MS = 14 * 60 * 1000; // 14 minutes

function startKeepAlive() {
  if (process.env.NODE_ENV !== "production") return;

  const appUrl = (process.env.APP_URL || "").trim();
  if (!appUrl || appUrl.includes("localhost") || !appUrl.startsWith("https://")) {
    console.log("[KeepAlive] Skipped — APP_URL is not a production HTTPS URL.");
    return;
  }

  const pingUrl = `${appUrl}/api/ping`;
  console.log(`[KeepAlive] Self-ping active → ${pingUrl} every 14 min`);

  const ping = () => {
    fetch(pingUrl, { method: "GET", signal: AbortSignal.timeout(5000) })
      .then((r) => {
        if (!r.ok) console.warn(`[KeepAlive] Ping returned HTTP ${r.status}`);
      })
      .catch((err) => {
        console.warn("[KeepAlive] Ping failed:", err.message);
      });
  };

  // First ping after 5 min to let the server fully boot
  const warmup = setTimeout(ping, 5 * 60 * 1000);
  const interval = setInterval(ping, INTERVAL_MS);

  // Graceful cleanup
  process.once("SIGTERM", () => { clearTimeout(warmup); clearInterval(interval); });
  process.once("SIGINT",  () => { clearTimeout(warmup); clearInterval(interval); });
}

module.exports = { startKeepAlive };
