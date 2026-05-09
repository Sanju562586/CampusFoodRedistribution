// Override system DNS with Google Public DNS to ensure cloud hostnames resolve correctly
const dns = require('dns');
const originalLookup = dns.lookup;
dns.setServers(['8.8.8.8', '8.8.4.4', '2001:4860:4860::8888']);

dns.lookup = (hostname, options, callback) => {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  
  const cb = (err, address, family) => {
    callback(err, address, family);
  };

  if (hostname.includes('neon.tech')) {
    dns.resolve4(hostname, (err, addresses) => {
      if (!err && addresses && addresses.length > 0) {
        if (options.all) {
          return cb(null, addresses.map(a => ({ address: a, family: 4 })));
        }
        return cb(null, addresses[0], 4);
      }
      originalLookup(hostname, options, cb);
    });
  } else {
    originalLookup(hostname, options, cb);
  }
};

const cluster = require('cluster');
const os = require('os');
const process = require('process');

if (cluster.isPrimary || cluster.isMaster) {
  const numCPUs = os.cpus().length;
  console.log(`🚀 Primary cluster ${process.pid} is running`);
  console.log(`⚙️  Spinning up ${numCPUs} Express workers to handle 10k concurrent requests...`);

  let isShuttingDown = false;

  // Sync database once centrally before forking workers to avoid race conditions
  const { sequelize } = require('./models');
  sequelize.sync({ alter: true }).then(() => {
    console.log("✅ Database synced centrally");
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
