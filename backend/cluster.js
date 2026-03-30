const cluster = require('cluster');
const os = require('os');
const process = require('process');

if (cluster.isPrimary || cluster.isMaster) {
  const numCPUs = os.cpus().length;
  console.log(`🚀 Primary cluster ${process.pid} is running`);
  console.log(`⚙️  Spinning up ${numCPUs} Express workers to handle 10k concurrent requests...`);

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
    console.log(`⚠️ Worker ${worker.process.pid} died. Restarting resiliently...`);
    cluster.fork();
  });
} else {
  // Workers share the TCP connection initialized in server.js
  process.env.CLUSTER_MODE = "true";
  require('./server');
  console.log(`🟢 Worker ${process.pid} started`);
}
