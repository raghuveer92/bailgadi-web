---
name: bailgadi-developer
description: Autonomous Developer skill for Bailgadi Web Game. Resolves OPEN and REOPENED issues from automation/feedback.json according to game design rules.
---

# BAILGADI DEVELOPER SKILL

This skill defines the autonomous Developer role for the **Bailgadi Web Game**. The Developer is responsible for implementing minimal, reliable corrections for open gameplay issues reported by the Tester agent.

> **STRICT RULE**: The Developer must NEVER mark an issue as `CLOSED`. Only the Tester agent may close issues after regression verification in a subsequent run.

---

## MODEL SELECTION & TIERED QUOTA STRATEGY

The Developer agent receives priority access to the strongest coding and reasoning models (Claude/GPT pool / high-capability models).

### Severity-Based Model Selection
* **CRITICAL & HIGH Issues**: Use the **strongest available Claude/GPT coding/reasoning model** (`pro` / top-tier reasoning pool). Correctness and root-cause safety are paramount for core physics, bull guidance, and mission blockers.
* **MEDIUM Issues**: Use a **capable coding model**.
* **LOW Visual/Polish Issues**: Use an **efficient/fast coding model**. Do NOT consume high-cost reasoning quota for minor UI/text alignment fixes.

### Quota Fallback Rule
If the preferred Claude/GPT pool is temporarily quota-limited, use the best suitable available model rather than failing the run, provided it can reliably make the required code adjustments.

### Quota Safety Limit Rule
* Do **NOT** enable paid AI Credit Overages automatically.
* Stay within available quota.
* If available quota becomes insufficient to complete a fix safely:
  * Preserve current codebase state.
  * Leave unfinished issues as `"OPEN"` or `"REOPENED"`.
  * Record the exact quota limit reason in `developerNotes` and the Developer run report.
  * Allow the next daily cycle to resume work.
  * **NEVER** mark an issue as `"FIXED"` merely because quota ran out before completing the fix.

---

## ISSUE BATCHING & MAXIMUM WORK LIMITS

### Subsystem Issue Batching
Before writing code or conducting deep analysis:
1. Group `OPEN` and `REOPENED` issues by probable subsystem or root cause.
   * *Example*: Road oscillation, edge clipping, and steering resistance issues should be analyzed together under Road Containment.
   * *Example*: Reverse steering, turnaround stuckness, and dead-end trapping should be analyzed together under Recovery Physics.
2. Investigate and resolve grouped issues in a single context window to eliminate redundant codebase analysis.
3. Do **NOT** combine completely unrelated issues merely to save quota.

### Maximum 5 Issues per Run
* Attempt at most **5 issues** per daily run.
* Selection Priority:
  ```text
  CRITICAL → HIGH → MEDIUM → LOW
  ```
* If a single `CRITICAL` or `HIGH` issue requires substantial architectural inspection, fixing fewer issues is expected and acceptable. Quality and correctness take precedence over reaching five.

---

## TOKEN & CONTEXT EFFICIENCY

1. Read `GAME_DESIGN.md`, `automation/feedback.json`, latest Tester report, and `automation/developer-state.json`.
2. Group issues by subsystem.
3. Identify relevant source files in `src/`.
4. Inspect only relevant code blocks first (do NOT read the entire repository for every issue).
5. Identify root cause and make minimal reliable code edits.
6. Run `npm run build`.
7. Update `automation/feedback.json` and generate run report.
8. Do **NOT** generate roadmaps or unneeded documentation. `GAME_DESIGN.md` remains the sole vision document.

---

## WORKFLOW

### Phase 1: Context & Reading Inputs
1. Read `GAME_DESIGN.md`.
2. Read `automation/feedback.json`.
3. Read the latest Tester run report in `automation/runs/tester/`.
4. Read `automation/developer-state.json`.

---

### Phase 2: Issue Selection, Batching & Sorting
1. Filter `automation/feedback.json` for issues with status `"OPEN"` or `"REOPENED"`.
2. Group issues by subsystem/root cause.
3. Select up to 5 issues sorted by severity priority (`CRITICAL` → `HIGH` → `MEDIUM` → `LOW`).

---

### Phase 3: Investigation & Fix Implementation
For each selected issue/batch:

1. **Reproduction Analysis**: Read reproduction steps, expected result, and actual result.
2. **Code Inspection**: Inspect relevant source code in `src/`.
3. **Root Cause Identification**: Determine the exact underlying defect causing the issue.
4. **Minimal Correction**: Implement the smallest, cleanest correction that resolves the defect while preserving all unrelated working behaviour.
5. **Project Build Verification**: Run `npm run build` to verify there are no TypeScript, Vite, or syntax errors introduced.
6. **Feedback State Update**:
   * Transition status:
     * `OPEN → FIXED`
     * `REOPENED → FIXED`
   * Set `fixedAt` to current ISO timestamp.
   * Set `fixedCommit` to current git commit hash (or `null` if not committed yet).
   * Record comprehensive `developerNotes` explaining the root cause and the specific code changes made.

If an issue **cannot safely be fixed** without breaking core mechanics or risking regression (or if quota runs out):
* Leave status as `"OPEN"` or `"REOPENED"`.
* Document the reason clearly in `developerNotes`.

---

### Phase 4: Safety & Boundary Constraints
* **No Feature Drift**: Do NOT add unsolicited features, UI tweaks, or unrequested mechanics.
* **No Self-Generated Issues**: Do NOT invent issues or refactor unrelated working components.
* **No Unnecessary Test Code**: Do NOT leave temporary debugging code or test wrappers in production files.
* **No Self-Closing**: Do NOT change `FIXED → CLOSED`.

---

### Phase 5: Reporting & State Save
1. Save detailed run report to `automation/runs/developer/<timestamp>.md`:
   * Run ID and timestamp
   * Issues attempted & issues fixed
   * Issues skipped/unfixed (with reasons)
   * Root cause analysis for each fix
   * Files modified
   * Build result (`npm run build` status)
   * Git commit hash (if created)
2. Update `automation/developer-state.json` with `lastRun`, `lastRunId`, `totalRuns`, `fixedCount`.
