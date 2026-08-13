---
name: bailgadi-tester
description: Autonomous QA Tester skill for Bailgadi Web Game. Verifies FIXED issues, plays real gameplay missions using project automation runner, and logs structured issue feedback.
---

# BAILGADI TESTER SKILL

This skill defines the autonomous QA Tester role for the **Bailgadi Web Game**. The Tester is responsible for regression verification of previously fixed issues, actual gameplay testing, and recording structured feedback.

> **STRICT RULE**: The Tester MUST NEVER modify production game source code under any circumstances.

---

## TESTER RESULT CLASSIFICATION RULES

Every Tester run MUST be classified into exactly one of three final result states:

### 1. `PASS`
Granted **ONLY** when:
* Testing infrastructure is working (`testInfrastructureBlocker === false`).
* **EVERY** mandatory gameplay stage achieved `"PASS"`.
* All required `FIXED` issues were regression-verified (`FIXED → CLOSED`).
* Zero gameplay defects were observed.

### 2. `PARTIAL`
Granted when:
* Testing infrastructure is working (`testInfrastructureBlocker === false`).
* One or more mandatory gameplay stages achieved `"FAIL"`.
* Corresponding feedback issues (`OPEN` or `REOPENED`) were successfully recorded in `automation/feedback.json`.
* **Important**: A `PARTIAL` result signals to the Daily Cycle that infrastructure was reliable and that valid `OPEN`/`REOPENED` issues exist for the Developer agent to process!

### 3. `FAIL`
Granted when:
* Testing infrastructure failed (`testInfrastructureBlocker === true`).
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

## MANDATORY REPORT CONSISTENCY CHECK

Before writing the final run report or updating `automation/tester-state.json`, perform this strict assertion:

```text
if (anyMandatoryStageFailed && !testInfrastructureBlocker) {
    assert(at least one relevant OPEN or REOPENED feedback issue exists in feedback.json);
    testerResult = "PARTIAL";
}
```

It must **NEVER** be possible to report `Tester result: PASS` while any mandatory gameplay stage is `FAIL` or `SKIPPED`.

---

## WORKFLOW

### Phase 1: Context & State Initialization
1. Read `GAME_DESIGN.md`.
2. Read `automation/feedback.json`.
3. Read `automation/tester-state.json`.

---

### Phase 2: Regression Verification (FIXED Issues First)
Verify **every** issue currently marked as `FIXED` in `automation/feedback.json`:
* Working as expected: `FIXED → CLOSED` (with `verificationNotes` & `verifiedAt`).
* Still broken: `FIXED → REOPENED` (increment `reopenCount`, add `verificationNotes` & `verifiedAt`).

---

### Phase 3: Real Gameplay Testing
Run `node automation/tester/play-game.js`. Collect stage results, telemetry, and failure classifications.

---

### Phase 4: Logging / Updating Feedback Issues
If any gameplay stage failed or timed out due to in-game defects:
1. Search `automation/feedback.json` for duplicates/existing issues.
2. Create or update the relevant `OPEN` / `REOPENED` issue.

---

### Phase 5: Consistency Check & Reporting
1. Apply the mandatory consistency check: set final result to `PARTIAL` if any stage failed with reliable infrastructure.
2. Save detailed run report to `automation/runs/tester/<timestamp>.md` including stage results and final result classification.
3. Update `automation/tester-state.json` (`lastRun`, `lastRunId`, `lastResult`, `totalRuns`, `verifiedCount`, `reopenedCount`).
