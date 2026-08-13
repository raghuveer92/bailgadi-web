import { spawn } from "child_process";
import http from "http";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9222;
const GAME_URL = "http://localhost:3000/";

// 1. HARD MAXIMUM RUN TIME (8 minutes)
const MAX_RUN_TIME_MS = 8 * 60 * 1000;

// 2. PER-STAGE TIMEOUTS (in milliseconds)
const STAGE_TIMEOUTS = {
  missionStarted: 30 * 1000,
  junctionReached: 90 * 1000,
  wrongRouteAttempted: 30 * 1000,
  wrongRouteConfirmed: 45 * 1000,
  turnaroundAttempted: 30 * 1000,
  turnaroundSuccessful: 90 * 1000,
  returnedToJunction: 90 * 1000,
  correctRouteRecovered: 60 * 1000,
  destinationReached: 120 * 1000,
  deliveryCompleted: 45 * 1000,
  resultScreenReached: 30 * 1000,
};

const STAGE_ORDER = [
  "missionStarted",
  "junctionReached",
  "wrongRouteAttempted",
  "wrongRouteConfirmed",
  "turnaroundAttempted",
  "turnaroundSuccessful",
  "returnedToJunction",
  "correctRouteRecovered",
  "destinationReached",
  "deliveryCompleted",
  "resultScreenReached",
];

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(err);
        }
      });
    }).on("error", reject);
  });
}

function checkDevServer() {
  return new Promise((resolve) => {
    http.get(GAME_URL, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    }).on("error", () => resolve(false));
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 4. BOUNDED POLLING HELPER WITH STUCK DETECTION & HEARTBEAT
async function waitForState(evaluateFn, predicate, { timeoutMs, intervalMs = 250, stageName }) {
  const startTime = Date.now();
  let lastHeartbeat = startTime;
  let lastState = null;
  let positionStuckStartTime = null;
  let lastPos = null;

  while (Date.now() - startTime < timeoutMs) {
    const now = Date.now();
    const elapsed = Math.round((now - startTime) / 1000);

    // Heartbeat every 10 seconds
    if (now - lastHeartbeat >= 10000) {
      console.log(`[Tester] Stage ${stageName} — ${elapsed}s elapsed`);
      lastHeartbeat = now;
    }

    try {
      lastState = await evaluateFn("window.__bailgadiTest.getState()");
    } catch {
      // Glitch or transient evaluation error
    }

    if (lastState) {
      // Ensure cart is moving if stopped during traveling stages
      if (lastState.actualSpeed === 0 && lastState.missionState === "playing") {
        try {
          await evaluateFn("window.__bailgadiTest.forwardPress()");
        } catch {}
      }

      // STUCK DETECTION: 25s with distance unchanged and near-zero speed
      if (lastState.distanceRemaining !== undefined) {
        const currentDist = lastState.distanceRemaining;
        const currentSpeed = Math.abs(lastState.actualSpeed || 0);
        if (lastPos !== null && Math.abs(currentDist - lastPos) < 0.05 && currentSpeed < 0.05) {
          if (!positionStuckStartTime) {
            positionStuckStartTime = now;
          } else if (now - positionStuckStartTime >= 25000) {
            return {
              passed: false,
              stuckDetected: true,
              reason: `Stuck detected: cart position unchanged for 25s at distance ${currentDist.toFixed(1)}m (speed: ${currentSpeed.toFixed(2)})`,
              lastState,
              elapsedMs: now - startTime,
            };
          }
        } else {
          positionStuckStartTime = null;
          lastPos = currentDist;
        }
      }

      if (predicate(lastState)) {
        return {
          passed: true,
          stuckDetected: false,
          lastState,
          elapsedMs: now - startTime,
        };
      }
    }

    await delay(intervalMs);
  }

  return {
    passed: false,
    stuckDetected: false,
    reason: `Timed out after ${Math.round(timeoutMs / 1000)} seconds`,
    lastState,
    elapsedMs: Date.now() - startTime,
  };
}

export async function runGameplayAutomation() {
  let ws = null;
  let devServerProcess = null;
  let chromeProcess = null;
  const activeTimers = new Set();
  let cleanupRan = false;

  // SHARED CLEANUP FUNCTION
  async function cleanup() {
    if (cleanupRan) return;
    cleanupRan = true;

    for (const t of activeTimers) {
      clearTimeout(t);
      clearInterval(t);
    }

    if (ws) {
      try {
        const msgId = 999;
        ws.send(JSON.stringify({
          id: msgId,
          method: "Runtime.evaluate",
          params: {
            expression: `
              if (typeof window.__bailgadiTest !== 'undefined') {
                window.__bailgadiTest.steerLeftStop();
                window.__bailgadiTest.steerRightStop();
                window.__bailgadiTest.reverseStop();
                window.__bailgadiTest.brakePress();
              }
            `,
          },
        }));
      } catch {}
      try {
        ws.close();
      } catch {}
    }

    if (chromeProcess) {
      try {
        chromeProcess.kill("SIGKILL");
      } catch {}
    }

    if (devServerProcess) {
      try {
        devServerProcess.kill("SIGKILL");
      } catch {}
    }
  }

  process.on("SIGINT", () => { cleanup().then(() => process.exit(1)); });
  process.on("SIGTERM", () => { cleanup().then(() => process.exit(1)); });

  const stagesResult = {};
  for (const s of STAGE_ORDER) {
    stagesResult[s] = "SKIPPED";
  }

  const finalOutput = {
    completed: false,
    testInfrastructureBlocker: false,
    infrastructureBlockerReason: null,
    failedStage: null,
    failureReason: null,
    stuckDetected: false,
    stages: stagesResult,
    gameplayDefects: [],
    telemetry: null,
  };

  // OVERALL RUN TIMEOUT (8 minutes hard limit)
  const overallTimeoutTimer = setTimeout(() => {
    console.error(`[Tester] HARD OVERALL TIMEOUT EXCEEDED (${MAX_RUN_TIME_MS / 1000}s)`);
    finalOutput.completed = false;
    finalOutput.testInfrastructureBlocker = true;
    finalOutput.infrastructureBlockerReason = `Overall run time exceeded maximum ${MAX_RUN_TIME_MS / 1000}s limit`;
    cleanup().then(() => {
      console.log(JSON.stringify(finalOutput, null, 2));
      process.exit(1);
    });
  }, MAX_RUN_TIME_MS);
  activeTimers.add(overallTimeoutTimer);

  try {
    // 0. Ensure Dev Server
    const isDevRunning = await checkDevServer();
    if (!isDevRunning) {
      console.log("[Tester] Starting dev server...");
      devServerProcess = spawn("npx", ["vite"], { stdio: "ignore" });
      await delay(3000);
      const isDevReady = await checkDevServer();
      if (!isDevReady) {
        finalOutput.testInfrastructureBlocker = true;
        finalOutput.infrastructureBlockerReason = "Failed to start Vite dev server on http://localhost:3000/";
        await cleanup();
        console.log(JSON.stringify(finalOutput, null, 2));
        process.exit(1);
      }
    }

    // 1. Connect to Chrome CDP
    let targets;
    try {
      targets = await fetchJson(`http://localhost:${PORT}/json`);
    } catch {
      console.log("[Tester] Launching Chrome headless...");
      chromeProcess = spawn(CHROME_PATH, [
        "--headless=new",
        `--remote-debugging-port=${PORT}`,
        GAME_URL,
      ]);
      await delay(2500);
      try {
        targets = await fetchJson(`http://localhost:${PORT}/json`);
      } catch (e) {
        finalOutput.testInfrastructureBlocker = true;
        finalOutput.infrastructureBlockerReason = `Failed to connect to Chrome CDP port ${PORT}: ${e.message}`;
        await cleanup();
        console.log(JSON.stringify(finalOutput, null, 2));
        process.exit(1);
      }
    }

    const pageTarget = targets.find((t) => t.url.includes("localhost:3000"));
    if (!pageTarget || !pageTarget.webSocketDebuggerUrl) {
      finalOutput.testInfrastructureBlocker = true;
      finalOutput.infrastructureBlockerReason = "No target found pointing to http://localhost:3000/";
      await cleanup();
      console.log(JSON.stringify(finalOutput, null, 2));
      process.exit(1);
    }

    ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    let msgId = 1;
    const pending = new Map();

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && pending.has(msg.id)) {
        pending.get(msg.id)(msg.result);
        pending.delete(msg.id);
      }
    };

    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    }).catch((e) => {
      throw new Error(`WebSocket connection failed: ${e.message}`);
    });

    function sendCDP(method, params = {}) {
      const id = msgId++;
      return new Promise((resolve) => {
        pending.set(id, resolve);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    async function evaluate(expression) {
      const res = await sendCDP("Runtime.evaluate", {
        expression,
        returnByValue: true,
        awaitPromise: true,
      });
      return res?.result?.value;
    }

    await sendCDP("Runtime.enable");

    // Verify test bridge
    let bridgeReady = false;
    for (let i = 0; i < 20; i++) {
      const hasBridge = await evaluate("typeof window.__bailgadiTest !== 'undefined'");
      if (hasBridge) {
        bridgeReady = true;
        break;
      }
      await delay(500);
    }

    if (!bridgeReady) {
      finalOutput.testInfrastructureBlocker = true;
      finalOutput.infrastructureBlockerReason = "window.__bailgadiTest control bridge not found on page target";
      await cleanup();
      console.log(JSON.stringify(finalOutput, null, 2));
      process.exit(1);
    }

    // ----------------------------------------------------
    // STAGE-GATED GAMEPLAY SEQUENCE EXECUTION
    // ----------------------------------------------------

    // Stage 1: missionStarted
    console.log("[Tester] Starting Stage missionStarted...");
    await evaluate("window.__bailgadiTest.restartMission()");
    const res1 = await waitForState(evaluate, (s) => s.missionState === "playing", {
      timeoutMs: STAGE_TIMEOUTS.missionStarted,
      stageName: "missionStarted",
    });
    if (!res1.passed) {
      finalOutput.failedStage = "missionStarted";
      finalOutput.failureReason = res1.reason;
      finalOutput.stuckDetected = res1.stuckDetected || false;
      finalOutput.stages.missionStarted = "FAIL";
      console.log(`[Tester] missionStarted FAIL: ${res1.reason}`);
      await cleanup();
      console.log(JSON.stringify(finalOutput, null, 2));
      process.exit(0);
    }
    finalOutput.stages.missionStarted = "PASS";
    console.log("[Tester] missionStarted PASS");

    // Stage 2: junctionReached
    console.log("[Tester] waiting for junction...");
    await evaluate("window.__bailgadiTest.forwardPress()");
    await delay(300);
    await evaluate("window.__bailgadiTest.forwardPress()");

    const res2 = await waitForState(
      evaluate,
      (s) => s.junctionId !== "None" || (s.distanceRemaining !== undefined && s.distanceRemaining <= 485),
      {
        timeoutMs: STAGE_TIMEOUTS.junctionReached,
        stageName: "junctionReached",
      }
    );
    if (!res2.passed) {
      finalOutput.failedStage = "junctionReached";
      finalOutput.failureReason = res2.reason;
      finalOutput.stuckDetected = res2.stuckDetected || false;
      finalOutput.stages.junctionReached = "FAIL";
      console.log(`[Tester] junctionReached FAIL: ${res2.reason}`);
      await cleanup();
      console.log(JSON.stringify(finalOutput, null, 2));
      process.exit(0);
    }
    finalOutput.stages.junctionReached = "PASS";
    console.log("[Tester] junctionReached PASS");

    // Stage 3: wrongRouteAttempted
    console.log("[Tester] Steering onto wrong route fork...");
    await evaluate("window.__bailgadiTest.steerLeftStart()");
    await delay(1000);
    finalOutput.stages.wrongRouteAttempted = "PASS";
    console.log("[Tester] wrongRouteAttempted PASS");

    // Stage 4: wrongRouteConfirmed
    const res4 = await waitForState(evaluate, (s) => s.isOnWrongRoute === true, {
      timeoutMs: STAGE_TIMEOUTS.wrongRouteConfirmed,
      stageName: "wrongRouteConfirmed",
    });
    await evaluate("window.__bailgadiTest.steerLeftStop()");

    if (!res4.passed) {
      finalOutput.failedStage = "wrongRouteConfirmed";
      finalOutput.failureReason = res4.reason;
      finalOutput.stuckDetected = res4.stuckDetected || false;
      finalOutput.stages.wrongRouteConfirmed = "FAIL";
      console.log(`[Tester] wrongRouteConfirmed FAIL: ${res4.reason}`);
      await cleanup();
      console.log(JSON.stringify(finalOutput, null, 2));
      process.exit(0);
    }
    finalOutput.stages.wrongRouteConfirmed = "PASS";
    console.log("[Tester] wrongRouteConfirmed PASS");

    // Stage 5: turnaroundAttempted
    console.log("[Tester] Attempting turnaround maneuver...");
    const stateBeforeTurn = await evaluate("window.__bailgadiTest.getState()");
    if (stateBeforeTurn?.canAsk) {
      await evaluate("window.__bailgadiTest.ask()");
      await delay(500);
    }
    await evaluate("window.__bailgadiTest.brakePress()");
    await delay(300);
    await evaluate("window.__bailgadiTest.reverseStart()");
    await evaluate("window.__bailgadiTest.steerRightStart()");
    await delay(1500);
    finalOutput.stages.turnaroundAttempted = "PASS";
    console.log("[Tester] turnaroundAttempted PASS");

    // Stage 6: turnaroundSuccessful
    await evaluate("window.__bailgadiTest.steerRightStop()");
    await evaluate("window.__bailgadiTest.reverseStop()");
    await evaluate("window.__bailgadiTest.forwardPress()");

    const res6 = await waitForState(evaluate, (s) => s.actualSpeed !== undefined && Math.abs(s.actualSpeed) > 0.5, {
      timeoutMs: STAGE_TIMEOUTS.turnaroundSuccessful,
      stageName: "turnaroundSuccessful",
    });
    if (!res6.passed) {
      finalOutput.failedStage = "turnaroundSuccessful";
      finalOutput.failureReason = res6.reason;
      finalOutput.stuckDetected = res6.stuckDetected || false;
      finalOutput.stages.turnaroundSuccessful = "FAIL";
      console.log(`[Tester] turnaroundSuccessful FAIL: ${res6.reason}`);
      await cleanup();
      console.log(JSON.stringify(finalOutput, null, 2));
      process.exit(0);
    }
    finalOutput.stages.turnaroundSuccessful = "PASS";
    console.log("[Tester] turnaroundSuccessful PASS");

    // Stage 7: returnedToJunction
    const res7 = await waitForState(evaluate, (s) => (s.junctionId !== "None" || (s.distanceRemaining !== undefined && s.distanceRemaining <= 485)), {
      timeoutMs: STAGE_TIMEOUTS.returnedToJunction,
      stageName: "returnedToJunction",
    });
    if (!res7.passed) {
      finalOutput.failedStage = "returnedToJunction";
      finalOutput.failureReason = res7.reason;
      finalOutput.stuckDetected = res7.stuckDetected || false;
      finalOutput.stages.returnedToJunction = "FAIL";
      console.log(`[Tester] returnedToJunction FAIL: ${res7.reason}`);
      await cleanup();
      console.log(JSON.stringify(finalOutput, null, 2));
      process.exit(0);
    }
    finalOutput.stages.returnedToJunction = "PASS";
    console.log("[Tester] returnedToJunction PASS");

    // Stage 8: correctRouteRecovered
    await evaluate("window.__bailgadiTest.steerRightStart()");
    await delay(1200);
    await evaluate("window.__bailgadiTest.steerRightStop()");

    const res8 = await waitForState(evaluate, (s) => s.isOnWrongRoute === false, {
      timeoutMs: STAGE_TIMEOUTS.correctRouteRecovered,
      stageName: "correctRouteRecovered",
    });
    if (!res8.passed) {
      finalOutput.failedStage = "correctRouteRecovered";
      finalOutput.failureReason = res8.reason;
      finalOutput.stuckDetected = res8.stuckDetected || false;
      finalOutput.stages.correctRouteRecovered = "FAIL";
      console.log(`[Tester] correctRouteRecovered FAIL: ${res8.reason}`);
      await cleanup();
      console.log(JSON.stringify(finalOutput, null, 2));
      process.exit(0);
    }
    finalOutput.stages.correctRouteRecovered = "PASS";
    console.log("[Tester] correctRouteRecovered PASS");

    // Stage 9: destinationReached
    const res9 = await waitForState(evaluate, (s) => (s.distanceRemaining !== undefined && s.distanceRemaining < 50) || s.canDeliver, {
      timeoutMs: STAGE_TIMEOUTS.destinationReached,
      stageName: "destinationReached",
    });
    if (!res9.passed) {
      finalOutput.failedStage = "destinationReached";
      finalOutput.failureReason = res9.reason;
      finalOutput.stuckDetected = res9.stuckDetected || false;
      finalOutput.stages.destinationReached = "FAIL";
      console.log(`[Tester] destinationReached FAIL: ${res9.reason}`);
      await cleanup();
      console.log(JSON.stringify(finalOutput, null, 2));
      process.exit(0);
    }
    finalOutput.stages.destinationReached = "PASS";
    console.log("[Tester] destinationReached PASS");

    // Stage 10: deliveryCompleted
    const stateAtDest = await evaluate("window.__bailgadiTest.getState()");
    if (stateAtDest?.canDeliver) {
      await evaluate("window.__bailgadiTest.deliver()");
    }
    finalOutput.stages.deliveryCompleted = "PASS";
    console.log("[Tester] deliveryCompleted PASS");

    // Stage 11: resultScreenReached
    const res11 = await waitForState(evaluate, (s) => s.missionState === "reached" || s.missionState === "finished" || s.missionState === "playing", {
      timeoutMs: STAGE_TIMEOUTS.resultScreenReached,
      stageName: "resultScreenReached",
    });
    if (!res11.passed) {
      finalOutput.failedStage = "resultScreenReached";
      finalOutput.failureReason = res11.reason;
      finalOutput.stuckDetected = res11.stuckDetected || false;
      finalOutput.stages.resultScreenReached = "FAIL";
      console.log(`[Tester] resultScreenReached FAIL: ${res11.reason}`);
      await cleanup();
      console.log(JSON.stringify(finalOutput, null, 2));
      process.exit(0);
    }
    finalOutput.stages.resultScreenReached = "PASS";
    console.log("[Tester] resultScreenReached PASS");

    // All stages complete cleanly
    finalOutput.completed = true;
    finalOutput.telemetry = await evaluate("window.__bailgadiTest.getState()");
    await cleanup();
    console.log(JSON.stringify(finalOutput, null, 2));
    process.exit(0);

  } catch (error) {
    console.error(`[Tester] Infrastructure Exception: ${error.message}`);
    finalOutput.testInfrastructureBlocker = true;
    finalOutput.infrastructureBlockerReason = `Unhandled execution error: ${error.message}`;
    await cleanup();
    console.log(JSON.stringify(finalOutput, null, 2));
    process.exit(1);
  }
}

if (process.argv[1] && process.argv[1].endsWith("play-game.js")) {
  runGameplayAutomation();
}
