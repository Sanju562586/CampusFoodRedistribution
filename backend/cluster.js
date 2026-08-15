// ─── Force IPv4 globally ───────────────────────────────────────────────────
// IPv6 is unstable on this machine/network (connections are established but
// then aborted mid-stream by the host — WSARECV errors on Windows).
// This affects:
//   - Neon PostgreSQL (neon.tech)
//   - Google OAuth key endpoint (googleapis.com, accounts.google.com)
//   - Any other cloud service that has both A and AAAA records
//
// Strategy (layered for reliability):
//   1. dns.setDefaultResultOrder('ipv4first') — tells Node's built-in resolver
//      to prefer A records over AAAA records in all getaddrinfo() calls.
//   2. Override dns.lookup to force family=4 — covers older code paths and
//      libraries that don't respect the default result order.
//   3. Patch https/http globalAgent family=4 — forces TCP sockets to bind to
//      an IPv4 interface even if the DNS lookup somehow returns an IPv6 address.
// ────────────────────────────────────────────────────────────────────────────
const dns   = require('dns');
const https = require('https');
const http  = require('http');

// Step 1: prefer IPv4 at the resolver level (Node ≥ 17)
try { dns.setDefaultResultOrder('ipv4first'); } catch (_) {}

// Step 2: use only IPv4 DNS servers — drop the IPv6 Google DNS entry
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

// Step 3: override dns.lookup to always resolve as IPv4
const _originalLookup = dns.lookup.bind(dns);
dns.lookup = (hostname, options, callback) => {
  if (typeof options === 'function') { callback = options; options = {}; }
  // Force family 4 on every lookup — covers neon.tech, googleapis.com, etc.
  _originalLookup(hostname, { ...options, family: 4 }, callback);
};

// Step 4: patch the default HTTP/HTTPS agents so sockets bind to IPv4
// This is the final safety net: even if a lookup somehow returns an IPv6
// address, the TCP socket will refuse to connect to it.
https.globalAgent.options.family = 4;
http.globalAgent.options.family  = 4;


const cluster = require('cluster');
const os = require('os');
const process = require('process');
const { startKeepAlive } = require('./lib/keepAlive');

if (cluster.isPrimary || cluster.isMaster) {
  const numCPUs = os.cpus().length;
  console.log(`🚀 Primary cluster ${process.pid} is running`);
  console.log(`⚙️  Spinning up ${numCPUs} Express workers to handle 10k concurrent requests...`);

  let isShuttingDown = false;

  // Sync database once centrally before forking workers to avoid race conditions
  const { sequelize } = require('./models');
  // sync() is a no-op when tables already exist — much faster than alter:true.
  // Schema changes should be applied via the migrations/ folder instead.
  sequelize.sync().then(() => {
    console.log("✅ Database synced centrally");
    // Start keep-alive ping once (primary only, not per worker)
    startKeepAlive();
    // Fork workers.
    for (let i = 0; i < numCPUs; i++) {
      cluster.fork();
    }
  }).catch(err => {
    console.error("❌ Failed to sync database", err);
  });

  // Handle worker crashes gracefully mapping a highly available service
  cluster.on('exit', (worker, code, signal) => {
    if (isShuttingDown) return;
    // Only restart if the worker didn't gracefully disconnect
    if (!worker.exitedAfterDisconnect) {
      console.log(`⚠️ Worker ${worker.process.pid} died. Restarting resiliently...`);
      cluster.fork();
    }
  });

  // Ensure graceful shutdown on nodemon restart or termination
  const cleanup = () => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log("Shutting down cluster...");
    for (const id in cluster.workers) {
      cluster.workers[id].kill(); // Force kill on Windows for orphaned worker avoidance
    }
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('SIGUSR2', cleanup); // used by nodemon sometimes
  process.on('exit', () => isShuttingDown = true);

} else {
  // Workers share the TCP connection initialized in server.js
  process.env.CLUSTER_MODE = "true";
  require('./server');
  console.log(`🟢 Worker ${process.pid} started`);
}
