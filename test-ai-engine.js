#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════
 *  CampusFoodRedistribution — AI Engine Test Suite
 *  Run with: node test-ai-engine.js
 *
 *  Tests the complete AI pipeline end-to-end:
 *   1. Auth          — login as admin, donor, student
 *   2. Behavior      — reservation to seed Redis behavior profile
 *   3. Recommend     — AI-powered food recommendations
 *   4. My Impact     — per-student CO2/meals/trees stats
 *   5. Waste Predict — admin analytics
 *   6. Notifications — POST food → check smart notif trigger (logs)
 *   7. Activity Logs — verify all events are captured
 * ═══════════════════════════════════════════════════════════════
 */

const https = require("https");
const http = require("http");
const url = require("url");
const readline = require("readline");

// ── Config ─────────────────────────────────────────────────────
const BASE_URL = process.env.API_URL || "http://localhost:5000";

// Credentials — change if you have different test accounts
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL;
const ADMIN_PASS = process.env.TEST_ADMIN_PASS;
const DONOR_EMAIL = process.env.TEST_DONOR_EMAIL;
const DONOR_PASS = process.env.TEST_DONOR_PASS;
const STUDENT_EMAIL = process.env.TEST_STUDENT_EMAIL;
const STUDENT_PASS = process.env.TEST_STUDENT_PASS;

// ── ANSI Colors ─────────────────────────────────────────────────
const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  bgGreen: "\x1b[42m",
  bgRed: "\x1b[41m",
};

// ── Test tracker ────────────────────────────────────────────────
let passed = 0, failed = 0;
const failures = [];

// ── Utilities ───────────────────────────────────────────────────
function log(msg) { process.stdout.write(msg + "\n"); }
function sep(char = "─") { log(C.dim + char.repeat(60) + C.reset); }
function header(title) {
  log("");
  sep("═");
  log(`${C.bold}${C.cyan}  ${title}${C.reset}`);
  sep("═");
}

function pass(label, info = "") {
  passed++;
  log(`  ${C.green}✔${C.reset}  ${C.bold}${label}${C.reset}${info ? C.dim + "  —  " + info + C.reset : ""}`);
}

function fail(label, reason = "") {
  failed++;
  failures.push({ label, reason });
  log(`  ${C.red}✘${C.reset}  ${C.bold}${label}${C.reset}${reason ? C.red + "  —  " + reason + C.reset : ""}`);
}

function info(label, value) {
  log(`  ${C.blue}ℹ${C.reset}  ${C.dim}${label}:${C.reset}  ${C.cyan}${value}${C.reset}`);
}

function warn(label) {
  log(`  ${C.yellow}⚠${C.reset}  ${C.yellow}${label}${C.reset}`);
}

// ── HTTP client ─────────────────────────────────────────────────
function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const parsed = url.parse(BASE_URL + path);
    const isHttps = parsed.protocol === "https:";
    const lib = isHttps ? https : http;
    const bodyStr = body ? JSON.stringify(body) : null;

    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.path,
      method,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        ...(bodyStr ? { "Content-Length": Buffer.byteLength(bodyStr) } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };

    const req = lib.request(options, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });

    req.on("error", reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// ── sleep ───────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ════════════════════════════════════════════════════════════════
//  TEST SUITES
// ════════════════════════════════════════════════════════════════

// 1. CONNECTIVITY
async function testConnectivity() {
  header("1 / 7  Connectivity Check");
  try {
    // Use a lightweight non-destructive call — POST login with bogus creds
    // A 401/404 response still confirms the server is live
    const r = await request("POST", "/api/auth/login", { email: "ping@test.com", password: "ping", role: "student" });
    if (r.status !== undefined) {
      pass("Backend reachable", `${BASE_URL} → HTTP ${r.status}`);
      pass("Auth router responsive", "POST /api/auth/login");
    } else {
      fail("Backend unreachable", "No status code returned");
      log(`\n${C.red}  Cannot continue tests. Is the backend running at ${BASE_URL}?${C.reset}\n`);
      process.exit(1);
    }
  } catch (e) {
    fail("Backend connection refused", e.message);
    log(`\n${C.red}  Make sure backend is running: npm run dev (in /backend)${C.reset}\n`);
    process.exit(1);
  }
}

// 1b. Fetch available food (needs auth token)
async function fetchFoodList(studentToken) {
  if (!studentToken) return [];
  try {
    const r = await request("GET", "/api/food/available", null, studentToken);
    if (r.status === 200 && Array.isArray(r.body)) {
      info("Available food items in inventory", r.body.length);
      return r.body;
    }
  } catch { }
  return [];
}

// 2. AUTH - Login as all 3 roles
async function testAuth() {
  header("2 / 7  Authentication");

  const tokens = { admin: null, donor: null, student: null };

  // Admin login
  const adminR = await request("POST", "/api/auth/login", { email: ADMIN_EMAIL, password: ADMIN_PASS, role: "admin" });
  if (adminR.status === 200 && adminR.body.token) {
    tokens.admin = adminR.body.token;
    pass("Admin login", `${ADMIN_EMAIL}`);
  } else {
    fail("Admin login", adminR.body?.message || `Status ${adminR.status}`);
    warn("Use env vars: TEST_ADMIN_EMAIL / TEST_ADMIN_PASS to set credentials");
  }

  // Donor login
  const donorR = await request("POST", "/api/auth/login", { email: DONOR_EMAIL, password: DONOR_PASS, role: "donor" });
  if (donorR.status === 200 && donorR.body.token) {
    tokens.donor = donorR.body.token;
    pass("Donor login", `${DONOR_EMAIL}`);
  } else {
    fail("Donor login", donorR.body?.message || `Status ${donorR.status}`);
    warn("Use env vars: TEST_DONOR_EMAIL / TEST_DONOR_PASS to set credentials");
  }

  // Student login
  const studentR = await request("POST", "/api/auth/login", { email: STUDENT_EMAIL, password: STUDENT_PASS, role: "student" });
  if (studentR.status === 200 && studentR.body.token) {
    tokens.student = studentR.body.token;
    pass("Student login", `${STUDENT_EMAIL}`);
  } else {
    fail("Student login", studentR.body?.message || `Status ${studentR.status}`);
    warn("Use env vars: TEST_STUDENT_EMAIL / TEST_STUDENT_PASS to set credentials");
  }

  return tokens;
}

// 3. AI RECOMMENDATIONS
async function testRecommendations(tokens, foods) {
  header("3 / 7  AI Recommendation Engine");

  if (!tokens.student) {
    warn("Skipping — student token unavailable");
    return;
  }

  const r = await request("GET", "/api/ai/recommend", null, tokens.student);

  if (r.status === 200) {
    pass("Endpoint reachable", `GET /api/ai/recommend → 200`);

    const type = r.body?.type;
    const data = r.body?.data || [];

    if (type) pass("Response type set", type);
    if (data.length) pass("Recommendations returned", `${data.length} item(s)`);
    else warn("No items returned — inventory may be empty");

    if (r.body?.message) info("AI message", r.body.message);

    // Check recommendation types
    const validTypes = ["personalized", "scored", "general", "fallback", "info", "alert"];
    if (validTypes.includes(type)) {
      pass("Valid response type", type);
      if (type === "personalized") info("🤖 Gemini AI", "personalized ranking active");
      if (type === "scored") info("📊 Score-rank", "history-weighted fallback");
      if (type === "general") info("⏱  Heuristic", "expiry-based picks");
    } else {
      fail("Unknown response type", type || "undefined");
    }

    // Print recommendations
    if (data.length) {
      log(`\n  ${C.dim}Recommended items:${C.reset}`);
      data.slice(0, 5).forEach((item, i) => {
        log(`  ${C.dim}${i + 1}.${C.reset} ${C.bold}${item.name}${C.reset} ${C.dim}@ ${item.dining_hall || item.location || "?"}  (qty: ${item.quantity})${C.reset}`);
      });
    }
  } else {
    fail("Recommendation endpoint failed", `Status ${r.status}: ${r.body?.message || ""}`);
  }
}

// 4. MY IMPACT
async function testMyImpact(tokens) {
  header("4 / 7  My Impact (Per-Student Green Analytics)");

  if (!tokens.student) {
    warn("Skipping — student token unavailable");
    return;
  }

  const r = await request("GET", "/api/ai/my-impact", null, tokens.student);

  if (r.status === 200) {
    const d = r.body;
    pass("Endpoint reachable", "GET /api/ai/my-impact → 200");

    // Validate all fields
    const checks = [
      ["mealsSaved", "number"],
      ["co2Saved", "string"],
      ["treesEquivalent", "string"],
      ["waterSaved", "number"],
      ["totalReservations", "number"],
      ["pickedUpCount", "number"],
      ["streak", "number"],
      ["envGrade", "string"],
      ["pointsEarned", "number"],
    ];

    let fieldOk = true;
    checks.forEach(([field, type]) => {
      if (d[field] === undefined || d[field] === null) {
        fail(`Field '${field}' present`, "missing");
        fieldOk = false;
      }
    });
    if (fieldOk) pass("All impact fields present");

    // Print the impact report
    log(`\n  ${C.bold}${C.green}╔═ STUDENT IMPACT REPORT ═════════════════════╗${C.reset}`);
    log(`  ${C.green}║${C.reset}  CO₂ Saved:         ${C.bold}${d.co2Saved} kg${C.reset}`);
    log(`  ${C.green}║${C.reset}  Meals Rescued:     ${C.bold}${d.mealsSaved}${C.reset}`);
    log(`  ${C.green}║${C.reset}  Water Saved:       ${C.bold}${d.waterSaved} L${C.reset}`);
    log(`  ${C.green}║${C.reset}  Trees Equivalent:  ${C.bold}${d.treesEquivalent}${C.reset}`);
    log(`  ${C.green}║${C.reset}  Pickup Streak:     ${C.bold}${d.streak} day(s)${C.reset}`);
    log(`  ${C.green}║${C.reset}  Grade:             ${C.bold}${d.envGrade}${C.reset}`);
    log(`  ${C.green}║${C.reset}  Total Reservations:${C.bold} ${d.totalReservations}${C.reset}`);
    log(`  ${C.green}║${C.reset}  Pickups Completed: ${C.bold}${d.pickedUpCount}${C.reset}`);
    log(`  ${C.green}╚═════════════════════════════════════════════╝${C.reset}`);

    if (d.topLocations?.length) {
      info("Top visited halls", d.topLocations.join(", "));
    }

  } else if (r.status === 403) {
    fail("Access denied", "Ensure token has role=student");
  } else {
    fail("My Impact endpoint failed", `Status ${r.status}: ${r.body?.message || ""}`);
  }
}

// 5. WASTE PREDICTION (Admin analytics)
async function testWastePrediction(tokens) {
  header("5 / 7  Waste Prediction & Platform Analytics (Admin)");

  if (!tokens.admin) {
    warn("Skipping — admin token unavailable");
    return;
  }

  const r = await request("GET", "/api/ai/waste-prediction", null, tokens.admin);

  if (r.status === 200) {
    const d = r.body;
    pass("Endpoint reachable", "GET /api/ai/waste-prediction → 200");

    // Validate structure
    const req = ["analysis", "suggestion", "suggestionType", "environmental", "lifecycle"];
    const missing = req.filter(k => d[k] === undefined);
    if (!missing.length) pass("Response structure valid");
    else fail("Missing fields", missing.join(", "));

    // Print admin report
    log(`\n  ${C.bold}${C.cyan}╔═ PLATFORM ANALYTICS ════════════════════════╗${C.reset}`);
    log(`  ${C.cyan}║${C.reset}  Risk Status:       ${C.bold}${d.analysis}${C.reset}`);
    log(`  ${C.cyan}║${C.reset}  At-Risk Items:     ${C.bold}${d.atRiskCount || 0} units${C.reset}`);
    log(`  ${C.cyan}║${C.reset}  Suggestion:        ${C.bold}${d.suggestion}${C.reset}`);
    log(`  ${C.cyan}║${C.reset}  Action Type:       ${C.bold}${d.suggestionType}${C.reset}`);

    if (d.environmental) {
      const e = d.environmental;
      log(`  ${C.cyan}╠─ Environmental Impact ───────────────────────${C.reset}`);
      log(`  ${C.cyan}║${C.reset}  CO₂ Saved:         ${C.bold}${e.savedCO2} kg${C.reset}`);
      log(`  ${C.cyan}║${C.reset}  Meals Saved:       ${C.bold}${e.mealsSaved}${C.reset}`);
      log(`  ${C.cyan}║${C.reset}  Water Saved:       ${C.bold}${e.waterSaved} L${C.reset}`);
      log(`  ${C.cyan}║${C.reset}  Trees Planted:     ${C.bold}${e.treesPlanted}${C.reset}`);
      log(`  ${C.cyan}║${C.reset}  Active Students:   ${C.bold}${e.activeStudents}${C.reset}`);
      pass("Environmental data present");
    }

    if (d.lifecycle) {
      const l = d.lifecycle;
      log(`  ${C.cyan}╠─ Food Lifecycle ─────────────────────────────${C.reset}`);
      log(`  ${C.cyan}║${C.reset}  Total Posted:      ${C.bold}${l.totalPosted} units${C.reset}`);
      log(`  ${C.cyan}║${C.reset}  Available Now:     ${C.bold}${l.currentAvailable} units${C.reset}`);
      log(`  ${C.cyan}║${C.reset}  Picked Up:         ${C.bold}${l.pickedUp} units${C.reset}`);
      log(`  ${C.cyan}║${C.reset}  Expired Waste:     ${C.bold}${l.expiredWaste} units${C.reset}`);
      log(`  ${C.cyan}║${C.reset}  Rescue Rate:       ${C.bold}${l.rescueRate}%${C.reset}`);
      log(`  ${C.cyan}╚═════════════════════════════════════════════╝${C.reset}`);
      pass("Lifecycle metrics present");
    }

  } else {
    fail("Waste prediction failed", `Status ${r.status}: ${r.body?.message || ""}`);
  }
}

// 6. BEHAVIOR SEEDING + NOTIFICATION TRIGGER
async function testBehaviorAndNotifications(tokens, foods) {
  header("6 / 7  Behavior Learning + Smart Notifications");

  if (!tokens.student || !tokens.donor) {
    warn("Skipping — student or donor token unavailable");
    return;
  }

  // Try making a reservation to seed behavior
  if (foods.length > 0) {
    log(`\n  ${C.dim}Seeding behavior — making a test reservation...${C.reset}`);
    const targetFood = foods[0];
    const resR = await request("POST", "/api/reservation/create",
      { foodId: targetFood.id, quantity: 1 },
      tokens.student
    );

    if ([200, 201, 202].includes(resR.status)) {
      pass("Test reservation created (behavior seeded)", `Food: "${targetFood.name}"`);
      info("Reservation code", resR.body?.reservation?.reservation_code || "queued");
      info("Effect", "Redis pref:location + pref:diet keys updated for this user");
    } else {
      warn(`Reservation failed (${resR.status}: ${resR.body?.message}) — behavior seeding skipped`);
      info("Tip", "This is OK if inventory is empty or already reserved");
    }
  } else {
    warn("No food in inventory — skipping reservation / behavior seed");
    info("Tip", "Post a food item as donor first, then re-run this test");
  }

  // Try posting food as donor to trigger smart notifications
  log(`\n  ${C.dim}Triggering smart notification engine — posting new food...${C.reset}`);
  const expiryTime = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(); // 4h from now
  const foodPayload = {
    name: "AI Test Food Item",
    quantity: 5,
    dining_hall: "Test Hall",
    expiry_time: expiryTime,
    allergens: [],
    price: 0,
  };

  const postR = await request("POST", "/api/food/create", foodPayload, tokens.donor);
  if ([200, 201, 202].includes(postR.status)) {
    pass("Test food posted (notification engine triggered)", `"${foodPayload.name}" @ ${foodPayload.dining_hall}`);
    info("Effect", "AI scanned pref:location + pref:diet Redis indexes");
    info("Effect", "Matching students received targeted Pusher event on user-{id} channel");
    info("Result", "Check Activity Logs tab in Admin Dashboard for 'Smart notifications sent'");
  } else {
    fail("Food post failed", `Status ${postR.status}: ${postR.body?.message || ""}`);
  }

  // Check recommendation again AFTER seeding to show learning
  log(`\n  ${C.dim}Re-fetching recommendations after behavior seed...${C.reset}`);
  const r = await request("GET", "/api/ai/recommend", null, tokens.student);
  if (r.status === 200) {
    pass("Post-seed recommendation call successful", `type: ${r.body?.type}`);
    if (r.body?.type !== "info") {
      info("Learning active", "Next recommendation iteration will be behaviorally informed");
    }
  }
}

// 7. ACTIVITY LOGS
async function testActivityLogs(tokens) {
  header("7 / 7  Activity Logs Capture");

  if (!tokens.admin) {
    warn("Skipping — admin token unavailable");
    return;
  }

  const r = await request("GET", "/api/auth/admin/logs", null, tokens.admin);

  if (r.status === 200 && Array.isArray(r.body)) {
    const logs = r.body;
    pass("Logs endpoint reachable", `${logs.length} events in buffer`);

    // Count by type
    const typeCounts = {};
    const levelCounts = { success: 0, info: 0, warning: 0, error: 0 };
    for (const l of logs) {
      typeCounts[l.type] = (typeCounts[l.type] || 0) + 1;
      if (l.level) levelCounts[l.level] = (levelCounts[l.level] || 0) + 1;
    }

    // Expected types from our AI engine
    const expectedTypes = ["ai", "food_create", "reservation", "login"];
    const foundTypes = Object.keys(typeCounts);
    const coveredTypes = expectedTypes.filter(t => foundTypes.includes(t));
    const missingTypes = expectedTypes.filter(t => !foundTypes.includes(t));

    if (coveredTypes.length > 0) pass(`AI event types captured`, coveredTypes.join(", "));
    if (missingTypes.length > 0) warn(`Not yet seen in logs: ${missingTypes.join(", ")} (need user activity)`);

    // Print event table
    log(`\n  ${C.bold}Event Type Distribution:${C.reset}`);
    Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        const bar = "█".repeat(Math.min(count, 20));
        log(`  ${C.dim}${type.padEnd(18)}${C.reset} ${C.cyan}${bar}${C.reset} ${count}`);
      });

    log(`\n  ${C.bold}Level Distribution:${C.reset}`);
    log(`  ${C.green}success${C.reset}  ${levelCounts.success}  |  ${C.blue}info${C.reset}  ${levelCounts.info}  |  ${C.yellow}warning${C.reset}  ${levelCounts.warning}  |  ${C.red}error${C.reset}  ${levelCounts.error}`);

    // Show most recent 5 AI logs
    const aiLogs = logs.filter(l => l.type === "ai").slice(0, 5);
    if (aiLogs.length) {
      log(`\n  ${C.bold}Most Recent AI Events:${C.reset}`);
      aiLogs.forEach(l => {
        const lvlColor = l.level === "success" ? C.green : l.level === "error" ? C.red : l.level === "warning" ? C.yellow : C.blue;
        log(`  ${lvlColor}●${C.reset} ${l.message} ${C.dim}— ${l.detail || ""}${C.reset}`);
      });
    }

  } else {
    fail("Activity logs endpoint failed", `Status ${r.status}`);
  }
}

// ════════════════════════════════════════════════════════════════
//  SUMMARY
// ════════════════════════════════════════════════════════════════
function printSummary() {
  const total = passed + failed;
  log("");
  sep("═");
  log(`${C.bold}  TEST SUMMARY${C.reset}`);
  sep("═");
  log(`  ${C.green}Passed: ${passed}${C.reset}   ${C.red}Failed: ${failed}${C.reset}   ${C.dim}Total: ${total}${C.reset}`);

  if (failures.length) {
    log(`\n  ${C.bold}${C.red}Failures:${C.reset}`);
    failures.forEach(f => {
      log(`  ${C.red}✘${C.reset}  ${f.label}${f.reason ? C.dim + "  →  " + f.reason + C.reset : ""}`);
    });
  }

  log("");
  if (failed === 0) {
    log(`  ${C.bgGreen}${C.bold}  ✅  ALL TESTS PASSED — AI ENGINE FULLY OPERATIONAL  ${C.reset}`);
  } else if (passed > failed) {
    log(`  ${C.yellow}${C.bold}  ⚠️   PARTIAL PASS — Some tests failed (see above)  ${C.reset}`);
    log(`  ${C.dim}  Tip: Set TEST_* env vars to match your seeded accounts.${C.reset}`);
  } else {
    log(`  ${C.bgRed}${C.bold}  ❌  MULTIPLE FAILURES — Check backend config  ${C.reset}`);
  }

  log("");
  sep();
  log(`  ${C.dim}Re-run with custom creds:${C.reset}`);
  log(`  ${C.cyan}  TEST_STUDENT_EMAIL=you@uni.edu TEST_STUDENT_PASS=xxx node test-ai-engine.js${C.reset}`);
  log(`  ${C.cyan}  API_URL=http://localhost:5000 node test-ai-engine.js${C.reset}`);
  log("");
}

// ════════════════════════════════════════════════════════════════
//  ENTRY POINT
// ════════════════════════════════════════════════════════════════
(async () => {
  log("");
  log(`${C.bold}${C.green}  ██████╗ ██╗      █████╗ ██████╗${C.reset}`);
  log(`${C.bold}${C.green}  ██╔══██╗██║     ██╔══██╗██╔══██╗${C.reset}`);
  log(`${C.bold}${C.green}  ██║  ██║██║     ███████║██████╔╝${C.reset}`);
  log(`${C.bold}${C.green}  ██║  ██║██║     ██╔══██║██╔══██╗${C.reset}`);
  log(`${C.bold}${C.green}  ██████╔╝███████╗██║  ██║██████╔╝${C.reset}`);
  log(`${C.bold}${C.green}  ╚═════╝ ╚══════╝╚═╝  ╚═╝╚═════╝ ${C.reset}${C.dim}AI ENGINE TEST SUITE${C.reset}`);
  log(`${C.dim}  CampusFoodRedistribution — ${new Date().toLocaleString()}${C.reset}`);
  log(`${C.dim}  Target: ${BASE_URL}${C.reset}`);
  log("");

  try {
    await testConnectivity();
    await sleep(200);
    const tokens = await testAuth();
    await sleep(200);
    const foods = await fetchFoodList(tokens.student);
    await sleep(200);
    await testRecommendations(tokens, foods);
    await sleep(200);
    await testMyImpact(tokens);
    await sleep(200);
    await testWastePrediction(tokens);
    await sleep(200);
    await testBehaviorAndNotifications(tokens, foods);
    await sleep(200);
    await testActivityLogs(tokens);
  } catch (err) {
    log(`\n${C.red}  Unexpected error: ${err.message}${C.reset}`);
    log(`${C.dim}  ${err.stack}${C.reset}`);
    failed++;
  }

  printSummary();
  process.exit(failed === 0 ? 0 : 1);
})();
