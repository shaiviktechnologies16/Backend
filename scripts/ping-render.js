import http from "http";
import https from "https";

const TARGET_URL =
  process.env.RENDER_BACKEND_URL || "https://admin.shaiviktechnologies.in";
const INTERVAL_MINUTES = 12;

console.log(`🚀 Keep-Alive service started for ${TARGET_URL}`);
console.log(`⏰ Pinging every ${INTERVAL_MINUTES} minutes...`);

const pingServer = () => {
  const client = TARGET_URL.startsWith("https") ? https : http;
  const healthUrl = `${TARGET_URL.replace(/\/$/, "")}/health`;

  client
    .get(healthUrl, (res) => {
      console.log(
        `[${new Date().toISOString()}] Pinged ${healthUrl} -> Status Code: ${res.statusCode}`,
      );
    })
    .on("error", (err) => {
      console.error(`[${new Date().toISOString()}] Ping failed:`, err.message);
    });
};

// Execute initial ping immediately
pingServer();

// Schedule interval
setInterval(pingServer, INTERVAL_MINUTES * 60 * 1000);
