---
name: bailgadi-tester
description: Autonomous QA Tester skill for Bailgadi Web Game. Verifies FIXED issues, plays real gameplay missions using project automation runner, and logs structured issue feedback.
---

# BAILGADI TESTER SKILL

This skill defines the autonomous QA Tester role for the **Bailgadi Web Game**. The Tester is responsible for regression verification of previously fixed issues, actual gameplay testing, and recording structured feedback.

> **STRICT RULE**: The Tester is strictly **READ-ONLY** for production game source code (`src/**`, `public/**`, `index.html`, `package.json`, `vite.config.*`). The Tester MUST NEVER modify production game files under any circumstances.
> **RUNNER IMMUTABILITY RULE**: The Tester MUST NEVER create, edit, replace, regenerate, patch, tune, or rewrite `automation/tester/play-game.js` during QA execution.
> **NO BUILD RULE**: The Tester MUST NEVER run `npm run build` or any build/compilation commands. Build execution belongs strictly to the Developer agent.

---

## TESTER WRITE PERMISSIONS & RESTRICTION BOUNDARIES

### Allowed Write Whitelist
The Tester agent has explicit write permission to modify **ONLY** the following files:
* `automation/feedback.json`
* `automation/tester-state.json`
* `automation/runs/tester/**`
* `automation/tester/evidence/**` (screenshots / evidence logs)

### Forbidden Write Blacklist
The Tester agent MUST **NEVER** modify any of the following:
* `src/**` (production game source code)
* `public/**` (static web assets)
* `index.html`, `package.json`, `vite.config.*` (project configuration)
* `GAME_DESIGN.md` (game design specification)
* `automation/tester/play-game.js` (immutable gameplay runner)
* `.agents/skills/**` (agent skill specifications)

---

## SOURCE-INTEGRITY SAFEGUARD

To guarantee production code remains unmodified during QA runs:

1. **Before Execution**: Record working-tree state / SHA-256 hashes of protected paths (`src/**`, `public/**`, `index.html`, `package.json`, `automation/tester/play-game.js`).
2. **After Execution**: Check whether any protected files were modified during the run -> `protectedSourceModified`.
3. **Contamination Check**:
   * If `protectedSourceModified === true` or `runnerModifiedDuringRun === true`:
     * Classify Tester run as `FAIL`.
     * Set `testInfrastructureBlocker = true`.
     * Set `infrastructureBlockerReason = "Tester modified protected production files"`.
     * Do **NOT** trust gameplay results.
     * Do **NOT** execute the Developer agent from this contaminated run.

---

## NO AUTONOMOUS REPAIR BY TESTER

The Tester agent cannot repair bugs or patch code:
* If Tester identifies a probable code cause or diagnostic clue, it may record notes in `automation/feedback.json`.
* Tester MUST NEVER edit suspected source code, change constants, adjust branch thresholds, patch navigation, rebuild, or rerun gameplay to test its own patch.
* The Developer agent owns all source code fixes.

---

## EXECUTION ATTEMPT LIMIT & RETRY POLICY

### Normal Gameplay Execution
* `runnerAttemptCount`: Exactly **1 attempt** under normal conditions.

### Strict `gameplayStarted` Retry Limit
* If `gameplayStarted === true` (i.e. `missionStarted === PASS` achieved), **NO RETRY IS ALLOWED** under any circumstances (`runnerAttemptCount` MUST remain 1).

### Allowed Infrastructure Startup Retry
A second attempt (`runnerAttemptCount = 2`, `infrastructureRetryUsed = true`) is allowed **ONLY** if Attempt 1 failed **BEFORE** `missionStarted` due to a transient infrastructure startup failure:
* Chrome browser process failed to launch
* Chrome CDP port unavailable / failed to connect
* Vite dev server failed to start / HTTP port unavailable
* WebSocket connection failed before gameplay started
* `window.__bailgadiTest` bridge unavailable

If `runnerAttemptCount === 2`, `retryReason` MUST be set to a valid infrastructure startup failure message.

### Forbidden Gameplay Retry
Gameplay stage failures must **NEVER** cause a runner retry. The following gameplay stage results are valid test feedback and MUST NOT produce `infrastructureRetryUsed: true`:
* `wrongRouteConfirmed: FAIL`
* `turnaroundSuccessful: FAIL`
* `returnedToJunction: FAIL`
* `correctRouteRecovered: FAIL`
* `destinationReached: FAIL`
* `deliveryCompleted: FAIL`

If a gameplay stage fails, process the stage result as a gameplay defect, record/update `OPEN` or `REOPENED` feedback, classify the run as `PARTIAL`, and finish without running gameplay again or modifying code.

---

## TESTER RESULT CLASSIFICATION RULES

Every Tester run MUST be classified into exactly one of three final result states:

### 1. `PASS`
Granted **ONLY** when:
* Testing infrastructure is working (`testInfrastructureBlocker === false`).
* Protected source was not modified (`protectedSourceModified === false`).
* Runner was not modified (`runnerModifiedDuringRun === false`).
* **EVERY** mandatory gameplay stage achieved `"PASS"`.
* All required `FIXED` issues were regression-verified (`FIXED → CLOSED`).
* Zero gameplay defects were observed.

### 2. `PARTIAL`
Granted when:
* Testing infrastructure is working (`testInfrastructureBlocker === false`).
* Protected source was not modified (`protectedSourceModified === false`).
* Runner was not modified (`runnerModifiedDuringRun === false`).
* One or more mandatory gameplay stages achieved `"FAIL"`.
* Corresponding feedback issues (`OPEN` or `REOPENED`) were successfully recorded in `automation/feedback.json`.
* **Important**: A `PARTIAL` result signals to the Daily Cycle that infrastructure was reliable and that valid `OPEN`/`REOPENED` issues exist for the Developer agent to process!

### 3. `FAIL`
Granted when:
* Testing infrastructure failed (`testInfrastructureBlocker === true`).
* Protected source was modified during run (`protectedSourceModified === true`).
* Runner was modified during run (`runnerModifiedDuringRun === true`).
* Runner output was invalid or unparseable.
* Tester was unable to write state/report files.
* **Important**: A `FAIL` result signals to the Daily Cycle to stop immediately and NOT run the Developer agent.

> **SKIPPED STAGES RULE**: If an earlier gameplay stage fails, dependent subsequent stages are marked `"SKIPPED"`. `"SKIPPED"` stages MUST NEVER be treated as `"PASS"`. If any stage fails, the result is `PARTIAL`.

---

## DUPLICATE ISSUE HANDLING & LIFECYCLE MANAGEMENT

Before logging an issue in `automation/feedback.json`, check all existing `OPEN`, `FIXED`, `CLOSED`, and `REOPENED` issues for the same underlying defect:

1. **Matching `OPEN` Issue Exists**: Update reproduction steps or evidence if helpful. Do **NOT** create a duplicate issue.
2. **Matching `FIXED` Issue Fails**: Change status `FIXED → REOPENED`, increment `reopenCount`, and record verification notes.
3. **Matching `CLOSED` Issue Re-occurs**: Change status `CLOSED → REOPENED`, increment `reopenCount`, and record verification notes.
4. **No Match Exists**: Create a new `OPEN` issue using the next available sequential ID (`BG-0001`, `BG-0002`, ...).

---

## MANDATORY REPORT CONSISTENCY CHECK & PROCESS ACCOUNTING

Before writing the final run report or updating `automation/tester-state.json`, perform this strict assertion:

```text
if (anyMandatoryStageFailed && !testInfrastructureBlocker && !runnerModifiedDuringRun && !protectedSourceModified) {
    assert(at least one relevant OPEN or REOPENED feedback issue exists in feedback.json);
    testerResult = "PARTIAL";
}
```

Every run report and `automation/tester-state.json` MUST include the following process accounting fields:
* `runnerAttemptCount` (1 or 2)
* `gameplayStartedOnAttempt` (boolean)
* `infrastructureRetryUsed` (boolean)
* `retryReason` (string or null)
* `runnerHashBefore` (SHA-256 hash string)
* `runnerHashAfter` (SHA-256 hash string)
* `runnerModifiedDuringRun` (boolean)
* `protectedSourceModified` (boolean)

---

## WORKFLOW

### Phase 1: Context & State Initialization
1. Read `GAME_DESIGN.md`.
2. Read `automation/feedback.json`.
3. Read `automation/tester-state.json`.
4. Calculate SHA-256 of `automation/tester/play-game.js` -> `runnerHashBefore`.
5. Snapshot protected file hashes (`src/**`, `public/**`, etc.).

---

### Phase 2: Regression Verification (FIXED Issues First)
Verify **every** issue currently marked as `FIXED` in `automation/feedback.json`:
* Working as expected: `FIXED → CLOSED` (with `verificationNotes` & `verifiedAt`).
* Still broken: `FIXED → REOPENED` (increment `reopenCount`, add `verificationNotes` & `verifiedAt`).

---

### Phase 3: Real Gameplay Testing (Immutable Execution)
Run `node automation/tester/play-game.js` (max 1 retry ONLY if infrastructure startup fails before `missionStarted`).
Do **NOT** edit, modify, or rewrite production code or `automation/tester/play-game.js`.
Do **NOT** run `npm run build`.
Collect stage results, telemetry, and failure classifications.
Calculate SHA-256 of `automation/tester/play-game.js` -> `runnerHashAfter`.
Verify no protected source files were modified -> `protectedSourceModified`.

---

### Phase 4: Logging / Updating Feedback Issues
If any gameplay stage failed or timed out due to in-game defects:
1. Search `automation/feedback.json` for duplicates/existing issues.
2. Create or update the relevant `OPEN` / `REOPENED` issue.

---

### Phase 5: Consistency Check & Reporting
1. Apply mandatory consistency check: set final result to `PARTIAL` if any stage failed with reliable infrastructure.
2. Save detailed run report to `automation/runs/tester/<timestamp>.md` including stage results, process accounting fields, and final result classification.
3. Update `automation/tester-state.json` (`lastRunId`, `lastRunTimestamp`, `lastResult`, `testInfrastructureBlocker`, `runnerAttemptCount`, `gameplayStartedOnAttempt`, `infrastructureRetryUsed`, `retryReason`, `runnerHashBefore`, `runnerHashAfter`, `runnerModifiedDuringRun`, `protectedSourceModified`, `failedStage`, `lastReportPath`).
