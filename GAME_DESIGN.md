# BAILGADI GAME DESIGN & QA CYCLE ARCHITECTURE

This document is the single source of truth for the core game mechanics, bullock-cart simulation rules, and the autonomous QA lifecycle for the **Bailgadi Web Game**.

---

## 1. CORE GAME VISION

**Bailgadi is a bullock-cart simulation, NOT a car-driving game.**

* The driver tells the bulls **WHERE** to go (giving directional guidance at junctions or requesting speed changes).
* The bulls know **HOW** to travel naturally along a rural road corridor.

---

## 2. BULL & ROAD MECHANICS

### What Bulls Know
* How to stay within the usable road corridor.
* How to follow ordinary road bends smoothly.
* How to avoid houses, trees, water, and impassable terrain.
* How to bring the cart to a safe stop before genuine blockers (hazards, dead ends).

### What Bulls DO NOT Know
* The destination village or mission objective.
* The planned mission route or shortest path.
* The correct junction choice to reach a destination.
* Any GPS or navigation vector.

> **CRITICAL RULE**: The game must **NEVER** secretly steer or nudge the bulls toward the mission destination.

### Normal Road Behaviour
Without player Left/Right steering input, the bulls must:
* Travel naturally along the current road.
* Remain on the road and follow bends smoothly.
* Keep the entire cart within the dravable road corridor.
* **Avoid bad steer feel**: Bulls must NOT constantly chase the exact centerline, oscillate rapidly left/right, look "drunk", or behave like a self-driving autonomous vehicle.

---

## 3. JUNCTION BEHAVIOUR

* **Three-way Junction**: Without player input, bulls prefer continuing straight.
* **Two-way Fork**: Without player input, bulls may naturally take either valid branch. This choice must **NEVER** depend on which road leads to the destination.
* **Player Guidance**: Active Left/Right player steering input overrides natural junction selection.
* **Wrong Road Selection**: If the cart enters a wrong road, bulls continue traveling normally along that wrong road. They must **NOT**:
  * Automatically turn around.
  * Automatically select the correct route.
  * Steer toward the destination.
  * Teleport or auto-correct.

---

## 4. WRONG-ROUTE RECOVERY

Wrong routes are an intentional, core gameplay mechanic.

When on a wrong route, the player MUST be able to perform a complete multi-step turnaround:
```text
slow down
  ↓
turn
  ↓
reverse
  ↓
turn again
  ↓
complete multi-step turnaround
  ↓
travel back along the same road toward the previous junction
```

* Road containment mechanics must **NOT** trap or prevent the cart from turning around.
* Dead-end roads must provide sufficient drivable space for the Bailgadi to turn around safely.

---

## 5. VILLAGER DIRECTIONS

Villagers are authentic rural NPCs who **ALWAYS** provide accurate, honest directions.

* **On correct route**: Villager gives direct guidance (`"Seedha jao"`, `"Baaye jao"`, `"Daaye jao"`).
* **On wrong route**: Villager informs driver:
  `"Bhai, ye [Village] ka rasta nahi hai. Wapas chaurahe tak jao, phir [baaye mudna / daaye mudna / seedha jaana]."`
* Villagers **NEVER** intentionally mislead or confuse the player.

---

## 6. AUTONOMOUS QA CYCLE ARCHITECTURE

The QA cycle consists of two independent Antigravity agent roles operating sequentially:

```text
Tester Agent → Developer Agent → Tester Agent → Developer Agent
```

### Shared Storage Schema (`automation/feedback.json`)

All issues are recorded in `automation/feedback.json` using this schema:

```json
{
  "id": "BG-0001",
  "title": "Short issue title",
  "description": "Detailed description",
  "category": "gameplay",
  "severity": "high",
  "status": "OPEN",
  "foundAt": "2026-08-12T09:00:00.000Z",
  "foundByRun": "tester-20260812-090000.md",
  "reproduction": [
    "Start game",
    "Accept Rice Delivery mission",
    "Turn left at first fork"
  ],
  "expected": "Bulls continue down left fork smoothly",
  "actual": "Cart clips through boundary fence into water",
  "evidence": ["automation/runs/tester/BG-0001-screenshot.png"],
  "developerNotes": "",
  "fixedAt": null,
  "fixedCommit": null,
  "verificationNotes": "",
  "verifiedAt": null,
  "reopenCount": 0
}
```

#### Allowed Values
* **Category**: `gameplay`, `movement`, `bull-behaviour`, `navigation`, `junction`, `mission`, `visual`, `audio`, `mobile`, `performance`, `bug`
* **Severity**: `critical`, `high`, `medium`, `low`
* **Status**: `OPEN`, `FIXED`, `CLOSED`, `REOPENED`

#### Status Lifecycle & Role Permissions

```text
Tester discovers problem
        ↓
      OPEN
        ↓
Developer implements fix
        ↓
      FIXED
        ↓
Tester verifies next run
      ↙     `
  CLOSED   REOPENED
              ↓
          Developer
              ↓
            FIXED
```

* **Tester Permissions Only**:
  * `FIXED → CLOSED` (issue verified working)
  * `FIXED → REOPENED` (issue still broken, increment `reopenCount`)
  * `CLOSED → REOPENED` (regression detected)
* **Developer Permissions Only**:
  * `OPEN → FIXED` (fix implemented & build passed)
  * `REOPENED → FIXED` (re-fix implemented & build passed)

> **CRITICAL RULE**: Developer must **NEVER** mark an issue as `CLOSED`. Only the Tester agent can close issues after verification in a subsequent run.

---

## 7. SAFETY AGAINST AGENT DRIFT

### Tester Agent Rules
1. Does **NOT** modify production source code under any circumstances.
2. Does **NOT** invent issues from reading source code — feedback must come from observed gameplay during real execution.
3. Does **NOT** close fixes without performing regression verification first.
4. Generates sequential IDs (`BG-0001`, `BG-0002`, ...) and checks all previous issues to prevent duplicates.

### Developer Agent Rules
1. Does **NOT** invent feedback or self-generate issues.
2. Does **NOT** mark its own fixes as `CLOSED`.
3. Does **NOT** create unsolicited features or refactor unrelated working systems.
4. Does **NOT** create unnecessary test frameworks or temporary test code in production files.
5. Implements the smallest reliable correction that fixes the issue while preserving unrelated working behaviour.
