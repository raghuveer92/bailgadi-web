---
name: bailgadi-daily-cycle
description: Master orchestrator skill for Bailgadi Web Game. Sequentially runs bailgadi-tester followed by bailgadi-developer only when open/reopened issues exist.
---

# BAILGADI DAILY CYCLE ORCHESTRATOR SKILL

This skill orchestrates the daily continuous autonomous QA workflow for **Bailgadi Web Game**:

```text
Tester Agent (Read-Only QA) → Check Results → Check Work → Developer Agent (Code Fixes) → Verification
```

> **CRITICAL RULE**: Tester and Developer must NEVER run simultaneously. Tester always runs first to completion. Developer runs only after Tester completes successfully (`PASS` or `PARTIAL`) and only if `OPEN` or `REOPENED` issues exist.
> **STRICT BOUNDARY SAFEGUARD**: Tester is strictly READ-ONLY for production game code (`src/**`). Tester MUST NOT edit production code, run `npm run build`, or repair game defects. If Tester modifies protected source files, the daily cycle fails (`FAIL`) and stops immediately.

---

## WORKFLOW

### STEP 1 — TESTER AGENT EXECUTION
1. Invoke the `bailgadi-tester` skill.
2. The Tester agent executes `node automation/tester/play-game.js` in read-only mode:
   * Snapshots `runnerHashBefore` and protected source file states.
   * Verifies previous `FIXED` issues (`FIXED → CLOSED` or `FIXED → REOPENED`).
   * Executes stage-gated real gameplay testing (max 1 attempt if gameplay starts; at most 1 retry if infrastructure startup fails before `missionStarted`).
   * Verifies `runnerHashAfter` and confirms no protected source files were modified.
   * Logs or updates `OPEN` / `REOPENED` issues in `automation/feedback.json` for gameplay defects.
   * Updates `automation/tester-state.json` with process accounting (`runnerAttemptCount`, `gameplayStartedOnAttempt`, `infrastructureRetryUsed`, `retryReason`, `runnerHashBefore`, `runnerHashAfter`, `runnerModifiedDuringRun`, `protectedSourceModified`).
   * Saves tester report to `automation/runs/tester/<timestamp>.md`.

---

### STEP 2 — CHECK TESTER RESULT & CLASSIFICATION
Before proceeding, evaluate the Tester result classification:

* **If Tester Result is `FAIL` (Infrastructure Blocker, Runner Modified, or Protected Source Modified)**:
  * Testing infrastructure was unreliable (`testInfrastructureBlocker === true`), `runnerModifiedDuringRun === true`, or `protectedSourceModified === true`.
  * **STOP THE PIPELINE IMMEDIATELY**.
  * Do **NOT** start the Developer agent on unreliable or contaminated output.
  * Record the failure reason in `automation/runs/tester/pipeline-failure-<timestamp>.md`.

* **If Tester Result is `PASS` or `PARTIAL`**:
  * Infrastructure was reliable (`testInfrastructureBlocker === false`, `runnerModifiedDuringRun === false`, `protectedSourceModified === false`).
  * If `PARTIAL`, gameplay defects were observed and recorded as `OPEN` / `REOPENED` issues in `automation/feedback.json`.
  * Proceed to Step 3.

---

### STEP 3 — CHECK FOR DEVELOPMENT WORK
Read `automation/feedback.json` and count all issues where:
* `status === "OPEN"` **OR** `status === "REOPENED"`

* **If count === 0**:
  * There are no active issues requiring developer attention.
  * End today's cycle successfully.
  * The Developer agent does **NOT** need to run.
* **If count > 0**:
  * Proceed to Step 4.

---

### STEP 4 — DEVELOPER AGENT EXECUTION
1. Invoke the `bailgadi-developer` skill.
2. The Developer agent processes at most 5 `OPEN` / `REOPENED` issues in priority order (`CRITICAL` → `HIGH` → `MEDIUM` → `LOW`).
3. Implements minimal corrections and verifies `npm run build`.
4. Updates status (`OPEN → FIXED`, `REOPENED → FIXED`).
5. Updates `automation/developer-state.json` and saves developer report to `automation/runs/developer/<timestamp>.md`.

> **STRICT RULE**: Developer must **NEVER** mark an issue as `CLOSED`. Only the Tester agent can close issues during tomorrow's run.

---

### STEP 5 — CYCLE COMPLETION & VERIFICATION
After the Developer agent finishes:

1. Confirm `automation/developer-state.json` was updated.
2. Confirm a new Developer run report exists in `automation/runs/developer/`.
3. Confirm `automation/feedback.json` remains valid JSON.
4. Verify `npm run build` succeeded if source code was changed.

> **CRITICAL RULE**: Do **NOT** run the Tester agent again immediately.
> Newly `FIXED` issues will be verified by tomorrow's scheduled Tester run.
