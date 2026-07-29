# Bailgadi Developer Reference

## Scope

This reference documents the current working tree, including the procedural-world implementation in `src/procedural-world.js` and its integrations in `src/world.js`, `src/main.js`, and `index.html`. It describes current behavior and ownership; recommendations are confined to Sections 8–10. No API described here should be assumed stable: the project is vanilla JavaScript with no TypeScript declarations, runtime validation, formal interfaces, or semantic-versioned package boundary.

`src/main.js` is the composition root. It exports nothing, creates every top-level runtime object at module evaluation time, and starts the animation loop immediately.

---

## 1. Public API of Every Module

### `src/controls.js`

#### Exported constants

| Export | Type/value | Meaning |
|---|---|---|
| `SPEED_MODES` | `string[]` | `["STOPPED", "SLOW", "NORMAL", "FAST", "MAX"]`, indexed by forward speed level. |
| `MAX_CART_SPEED` | `number` | `30 / 3.6` metres per second. Imported by main, cart, dust, and audio. |
| `MAX_REVERSE_SPEED` | `number` | `4 / 3.6` metres per second. Imported by main. |
| `SPEED_TARGETS` | `number[]` | Target speeds for levels 0–4: 0, 10, 20, 25, and 30 km/h, stored in m/s. |

#### `class Controls`

Constructor:

```js
new Controls({
  root = document,
  onSpeedLevelChange = () => {}
})
```

- `root` must support `querySelectorAll()` and contain the `[data-control]` buttons.
- `onSpeedLevelChange(event)` receives `{direction, source, previousLevel, level, mode, targetSpeed}`.
- The constructor installs window keyboard/blur listeners and pointer listeners on matching controls.

Public methods:

| Method | Parameters | Return | Mutation/behavior |
|---|---|---|---|
| `onKey(event, active)` | `KeyboardEvent`, boolean | `undefined` | Event-listener entry; updates steering or dispatches a latched drive command. |
| `increaseSpeedLevel(source="input")` | source label | boolean | Cancels reverse or increments level; invokes callback on change. |
| `decreaseSpeedLevel(source="input")` | source label | boolean | Alias for a complete stop, not a one-level decrement. |
| `stopSpeedLevel(source="input")` | source label | boolean | Sets level 0 and clears reverse; invokes callback if state changed. |
| `activateReverse(source="input")` | source label | boolean | Sets reverse and level 0; invokes callback if state changed. |
| `notifyDriveChange(direction, source, previousLevel)` | strings, number | `undefined` | Builds and emits the drive-change object. |
| `setEnabled(enabled)` | boolean | `undefined` | Enables drive input; disabling also resets steering. |
| `resetSteering()` | none | `undefined` | Clears left/right and active button CSS. |
| `resetAll()` | none | `undefined` | Clears steering, forward level, and reverse. |
| `getTargetSpeed()` | none | number m/s | Returns reverse target or current forward target. |
| `getSpeedMode()` | none | string | Returns `REVERSE` or the indexed forward mode. |
| `getCombinedState()` | none | object | Snapshot of left/right, level, reverse, mode, and target speed. |

### `src/voice-controls.js`

#### Exported constants

| Export | Value | Meaning |
|---|---:|---|
| `TRIGGER_THRESHOLD` | `0.75` | Minimum START/STOP confidence. |
| `RESET_THRESHOLD` | `0.45` | Locked command must fall below this, or background must win, before rearming. |
| `MIN_MARGIN` | `0.10` | Required command lead over background. |
| `MIN_INPUT_LEVEL` | `2` | Minimum microphone level percentage. |
| `CONSECUTIVE_CONFIRMATIONS` | `2` | Consecutive valid predictions required. |
| `COOLDOWN_MS` | `1200` | Minimum time before the gate can rearm. |
| `VOICE_DEBUG_ENABLED` | `true` | Enables debug DOM updates; CSS still hides the panel. |

#### `class CommandTriggerGate`

| API | Parameters | Return | Effect |
|---|---|---|---|
| `constructor()` | none | instance | Calls `reset()`. |
| `reset()` | none | `undefined` | Clears candidate, confirmations, lock, timing, and input-active state. |
| `clearCandidate()` | none | `undefined` | Clears only candidate and confirmation count. |
| `getDebugState()` | none | object | `{candidate, confirmation, inputActive, recognition}`. |
| `update(confidence, inputLevel, now=performance.now())` | score object keyed by required labels, level %, timestamp ms | `"START"`, `"STOP"`, or `null` | Advances/reset gate state and locks after a valid trigger. |

#### `class VoiceControls`

Constructor accepts DOM nodes/maps, a `Controls` instance, and optional `onCommand(command, changed)`.

| Method | Parameters | Return | Effect |
|---|---|---|---|
| `loadModel()` | none | `Promise<recognizer>` | Lazy-imports TensorFlow packages, loads local model/metadata, validates labels, caches recognizer. |
| `enable()` | none | `Promise<void>` | Starts recognizer/microphone, meter, and listening UI. |
| `disable(message="")` | optional UI message | `Promise<void>` | Stops recognition/meter, resets gate and UI. |
| `handlePrediction(result)` | speech-command callback result | `undefined` | Validates score array then forwards to `handleScores()`. |
| `handleScores(rawScores)` | iterable numeric scores | `undefined` | Maps required labels, updates diagnostics/gate, applies detected command. |
| `applyDetectedLabel(detected)` | `"START"` or `"STOP"` | `undefined` | Updates notices and maps label to forward/brake. |
| `showListening()` | none | `undefined` | Restores listening UI. |
| `applyCommand(command, detectedLabel=...)` | `"forward"` or other/brake, label | `undefined` | Calls shared Controls API, callback, and temporary command UI. |
| `updateDebug(confidence)` | label-score object | `undefined` | Writes prediction percentages/top prediction to DOM. |
| `showTriggerNotice(message)` | string | `undefined` | Shows a 1200 ms notice. |
| `setLastDetected(value)` | display value | `undefined` | Writes last-detected DOM node. |
| `setDebugStatus(name, value)` | debug key/value | `undefined` | Writes a mapped debug DOM node. |
| `updateGateDebug()` | none | `undefined` | Copies gate debug state to DOM. |
| `startMicLevelMeter()` | none | `undefined` | Starts a 100 ms analyser interval. |
| `stopMicLevelMeter()` | none | `undefined` | Clears interval/data and zeroes input level. |

### `src/audio-manager.js`

#### `class AudioManager`

Constructor:

```js
new AudioManager(soundButton)
```

The button is required. Construction reads session mute state, installs its click handler, and initializes bookkeeping; no `AudioContext` is created until `start()`.

| Method | Parameters | Return | Effect |
|---|---|---|---|
| `start()` | none | `Promise<void>` | Creates/unlocks audio graph, synthesized cargo buffers, and begins MP3 loading. Idempotent after first start. |
| `createCargoBuffers()` | none | `undefined` | Creates five synthesized `AudioBuffer`s. |
| `resume()` | none | `Promise<void>` | Attempts to resume a suspended context. |
| `loadAssets()` | none | `undefined` | Starts loading the seven MP3 assets once. |
| `loadAsset(name, path)` | logical name, URL | `Promise<void>` | Fetches/decodes/caches buffer, starts loops, services queued driver command. |
| `ensureLoop(name)` | logical name | `undefined` | Starts a cached buffer as a loop if possible. |
| `setLoopVolume(name, volume)` | name, gain | `undefined` | Stores volume and ramps live loop gain. |
| `setLoopPlaybackRate(name, rate)` | name, rate | `undefined` | Ramps live loop playback rate. |
| `setMuted(muted)` | boolean | `undefined` | Persists session setting, ramps master gain, updates button. |
| `updateButton()` | none | `undefined` | Writes sound button text/ARIA/title. |
| `playOneShot(name, volumeScale=1, playbackRate=1)` | name, scale, rate | `AudioBufferSourceNode` or `null` | Starts a non-looping buffered sound. |
| `playDriverCommand(command)` | `"forward"` or other | `undefined` | Plays/queues `chal` or guarded `ruk`; replaces same-command source. |
| `triggerBump(intensity=1, movement=this.movementAmount)` | normalized values | boolean | Plays one bump if moving/unlocked and no bump is active. |
| `updateCargo(stability, cargoType, tension, roadRoughness, delta)` | continuous gameplay values | `undefined` | Schedules type/instability-dependent cargo one-shots. |
| `playCargoFailure()` | none | `undefined` | Stops current cargo cue and plays failure cue. |
| `playWorldCue(name, lateralOffset=0, distance=0, volume=0.3)` | supported cue, world-X offset, metres, gain | boolean | Synthesizes one attenuated/stereo-panned ambient cue. |
| `updateMovement(speed, delta, steering, gaitPlaybackRate, roadRoughness)` | continuous gameplay values | `undefined` | Updates loop gains/rates and incidental bump timer. |
| `getDebugState()` | none | object | Serializable mute/context/buffer/loop/event/concurrency snapshot. |

### `src/cargo-physics-manager.js`

#### Exported constant

`CARGO_TYPES` is a frozen object keyed by `rice`, `milk`, `clay`, `vegetables`, and `wood`. Each frozen definition contains `label`, `fragility`, `recovery`, `movement`, `stiffness`, and `damping`.

#### `class CargoStabilityManager`

| API | Parameters | Return | Effect |
|---|---|---|---|
| `constructor(type="rice", difficulty=1)` | cargo key, difficulty | instance | Initializes stability to 100. |
| `reset(type=this.type, difficulty=this.difficulty)` | cargo key, difficulty | `undefined` | Resets all stability/damage telemetry. |
| `update(delta, acceleration, speedRatio, signedTurn, roadRoughness, impactSeverity, suspensionY)` | frame/simulation values | `undefined` | Calculates damage/recovery/status and one-frame `justLost`. |

#### `class CargoAnimationManager`

Constructor requires the cart’s `cargoRoot`, cargo group map, and shared `animationParts`.

| Method | Parameters | Return | Effect |
|---|---|---|---|
| `setCargoType(type)` | cargo key | `undefined` | Selects valid cargo or rice; toggles cargo group visibility. |
| `reset(type=this.type)` | cargo key | `undefined` | Clears spring/driver state and resets cargo transform. |
| `spring(current, velocity, target, stiffness, damping, delta)` | numbers | number | Calculates next scalar spring position; does not itself write velocity. |
| `update(delta, elapsed, acceleration, signedTurn, roughness, impactSeverity, stabilityStatus)` | frame/simulation values | `undefined` | Updates cargo transform and cargo-derived driver fields in `animationParts`. |

#### `class CargoPhysicsManager`

| API | Parameters | Return | Effect |
|---|---|---|---|
| `constructor(cargoRoot, cargoGroups, animationParts)` | cart-owned objects | instance | Owns one stability and one animation manager. |
| `reset(type="rice", difficulty=1)` | cargo key, difficulty | `undefined` | Resets elapsed/stability/animation. |
| `update(delta, acceleration, speedRatio, signedTurn, roadRoughness, impactSeverity, suspensionY)` | frame values | `undefined` | Increments elapsed, then updates stability and animation. |

### `src/cart.js`

| Export | Parameters | Return | Mutation |
|---|---|---|---|
| `createBullockCart()` | none | `{group, animationParts}` | Allocates full cart/bull/driver/cargo/rope hierarchy. The caller owns the returned root; nested animation state is shared by cart, cargo, main, and debug UI. |
| `animateCart(parts, speed, travelledDistance, elapsed, delta, roadSurface={roughness:0,roll:0}, acceleration=0)` | shared parts and frame values | `undefined` | Mutates wheel rotations, gait, bulls, suspension, driver, rope/reins, and animation telemetry. |
| `reactDriver(parts, command, source="input")` | shared parts, forward/brake, source | `undefined` | Sets driver impulses and triggers rope/rein command state. |
| `triggerCartBump(parts, intensity=1, side=0)` | shared parts, normalized impact, lateral side | `undefined` | Injects suspension impact and clears cargo-derived driver reaction fields. |
| `resetCartAnimation(parts)` | shared parts | `undefined` | Resets cart/bull/driver/rope animation transforms and state. |

`animationParts` contains mesh/group references and mutable animation values: wheels, bulls, sprung group, driver/head/arms/hands, cargo root/groups, rope anchors/system, gait and blend fields, suspension values, driver reactions, road-impact fields, and cargo-to-driver fields.

### `src/rope-rein-animation.js`

| Export | Parameters | Return | Mutation |
|---|---|---|---|
| `createRopeReinAnimation(root, parts)` | cart root and partially built animation parts | rope system object | Adds `RopesAndReins` group and 44 cylinder segments to root; returns traces, reins, tensions, input state, and suspension cache. |
| `triggerRopeReinInput(system, direction, source="input")` | system, forward/brake, source | `undefined` | Sets input direction/source/target/hold and debug state. No-op for missing system. |
| `updateRopeReinAnimation(system, frameObject)` | system plus speed, maxSpeed, acceleration, elapsed, delta, suspension Y/roll/pitch | `undefined` | Updates input decay, arm rotations, tensions, curves, segment transforms, and buffer attributes. |
| `resetRopeReinAnimation(system)` | system | `undefined` | Restores tensions and input state. |

### `src/dust-system.js`

#### `class DustSystem`

| API | Parameters | Return | Effect |
|---|---|---|---|
| `constructor(scene)` | `THREE.Scene` | instance | Creates a 48/72-particle `THREE.Points` pool and adds it to scene. |
| `update({cart, speed, travelledDistance, delta})` | cart root and frame values | `undefined` | Spawns by travel distance, advances/fades particles, marks position/color attributes dirty. |
| `spawn(cart, speed, movement)` | cart root, signed speed, normalized speed | `undefined` | Reuses next circular particle at a hoof/wheel anchor. |
| `getActiveCount()` | none | integer | Counts active pool entries. |
| `reset()` | none | `undefined` | Deactivates/hides all particles and marks buffers dirty. |

### `src/road-gameplay.js`

#### `createRoadGameplay(scene)`

Returns:

```js
{
  group,       // THREE.Group, already added to scene
  obstacles,   // 14 mutable hazard descriptors
  checkImpact(position, heading),
  sampleSurface(position, target = {}),
  reset()
}
```

- `checkImpact()` returns `{type, severity, side}` on the first not-yet-hit hazard in the cart footprint, marks it hit, or returns `null`.
- `sampleSurface()` mutates and returns `target` with clamped `roughness` and `roll`.
- `reset()` clears all hazard `hit` flags.

### `src/environment-life.js`

#### `createVillageLife(scene, {random, windTargets=[]})`

`random` is required and expected to return values in `[0,1)`. Construction adds 13 villagers, 7 large animals, 6 chickens, 4 bicycles, 2 smoke systems, and ambient effect pools to the scene.

Returns:

```js
{
  update({cartPosition, cartSpeed=0, elapsed, delta}),
  setAudioManager(audioManager),
  debug,        // live DynamicWorldAI debug object
  managers: {npc, animals, ambientEvents, spawn},
  counts: {villagers, animals, chickens, bicycles, smokeParticles}
}
```

### `src/dynamic-world-ai.js`

#### Exported constants

- `ANIMAL_STATES`: frozen names for idle, grazing, walking, crossing, looking, sleeping, pecking, and scattering.
- `NPC_STATES`: frozen names for eight ambient activities plus watching, avoiding, and running.

#### Exported classes

| Class | Constructor | Public methods and returns |
|---|---|---|
| `SpawnManager` | `(actors, spawnRadius=112, despawnRadius=145)` | `update(cartPosition)` toggles active/visible and counters; `reset()` deactivates all. Both return `undefined`. |
| `NPCManager` | `(villagers, random, ambientEvents)` | Owns villager behavior and extension handlers. |
| `AnimalManager` | `(largeAnimals, chickens, random, ambientEvents)` | Owns large-animal/chicken behavior and extension handlers. |
| `AmbientEventManager` | `(scene, random, windTargets=[], smokeSources=[])` | Owns ambient visual/audio event pools and timers. |
| `DynamicWorldAI` | object containing `scene`, actor arrays, `random`, `windTargets`, `smokeSources` | `setAudioManager(audioManager)` forwards dependency; `update(cartPosition, cartSpeed, elapsed, delta)` runs all managers and updates debug. |

Detailed manager methods:

| Class/method | Parameters | Return |
|---|---|---|
| `NPCManager.registerActivity` | `(name, handler)` | `undefined`; stores handler. |
| `NPCManager.chooseNextActivity` | `(villager)` | `undefined`; chooses/mutates next state, timer, waypoint, and target. |
| `NPCManager.updateVillager` | `(villager, cartPosition, cartSpeed, elapsed, delta)` | `undefined`; updates one active villager. |
| `NPCManager.update` | `(cartPosition, cartSpeed, elapsed, delta)` | `undefined`; updates all and may request one footstep cue. |
| `AnimalManager.registerBehavior` | `(name, handler)` | `undefined`; stores handler. |
| `AnimalManager.chooseLargeAnimalState` | `(animal)` | `undefined`; mutates state/timer/waypoint/target. |
| `AnimalManager.avoidCart` | `(actor, cartPosition, cartSpeed, delta, isChicken=false)` | boolean indicating avoidance was applied. |
| `AnimalManager.updateLargeAnimal` | `(animal, cartPosition, cartSpeed, elapsed, delta)` | `undefined`. |
| `AnimalManager.chooseChickenState` | `(chicken)` | `undefined`; mutates state/timer/waypoint/target. |
| `AnimalManager.updateChicken` | `(chicken, cartPosition, cartSpeed, elapsed, delta)` | `undefined`. |
| `AnimalManager.update` | `(cartPosition, cartSpeed, elapsed, delta)` | `undefined`; updates both actor arrays. |
| `AmbientEventManager.setAudioManager` | `(audioManager)` | `undefined`. |
| `AmbientEventManager.registerEvent` | `(name, handler)` | `undefined`; stores handler. |
| `AmbientEventManager.createEventPools` | none | `undefined`; allocates/adds bird, dust, and leaf pools. Constructor already calls it. |
| `AmbientEventManager.canPlayNPCFootstep` | none | boolean; resets footstep timer when true. |
| `AmbientEventManager.requestSpatialCue` | `(name, sourcePosition, listenerPosition, volume=0.3)` | boolean from range/concurrency/playback decision. |
| `AmbientEventManager.beginEvent` | `(cartPosition)` | `undefined`; selects/starts event. |
| `AmbientEventManager.endEvent` | none | `undefined`; hides pools and schedules next event. |
| `AmbientEventManager.updateEventVisuals` | `(elapsed, delta)` | `undefined`. |
| `AmbientEventManager.updateSmoke` | `(elapsed, delta)` | `undefined`. |
| `AmbientEventManager.updateWind` | `(cartPosition, elapsed)` | `undefined`. |
| `AmbientEventManager.update` | `(cartPosition, elapsed, delta)` | `undefined`; advances complete ambient subsystem. |
| `DynamicWorldAI.setAudioManager` | `(audioManager)` | `undefined`. |
| `DynamicWorldAI.update` | `(cartPosition, cartSpeed, elapsed, delta)` | `undefined`. |

Extension handlers receive:

- NPC activity: `(villager, cartPosition, elapsed, delta)`.
- Animal behavior: called from the relevant actor update with the actor/frame context used by that manager.
- Ambient event: `(cartPosition, elapsed, delta)`.

Registration alone does not add a name to the hard-coded state/event selection arrays.

### `src/procedural-world.js`

#### Exported constants

| Export | Value |
|---|---:|
| `CHUNK_LENGTH` | `80` |
| `DEFAULT_ACTIVE_CHUNKS` | `7` |
| `DEFAULT_CHUNK_POOL_SIZE` | `9` |

#### Generator classes

| Class | Constructor | Public API |
|---|---|---|
| `RoadGenerator` | `(seed)` | `configure(chunk, chunkIndex, difficulty)` rewrites road/track geometry and metadata; `sampleRoadCenter(chunkIndex, worldZ, difficulty)` returns center X. |
| `EnvironmentGenerator` | `(seed, obstaclePool)` | `fillGround`, `configureTrees`, `configureCrops`, `configureRoadside`, `configureWater`, `configureWorldEvent`, and aggregate `configure(chunk, chunkIndex, difficulty)`; all mutate a pooled chunk and return `undefined`. |
| `VillageGenerator` | `(seed)` | `configureVillageDetails(chunk, chunkIndex, houseCount)` mutates detail pool and returns used count; `configure(chunk, chunkIndex)` mutates houses/roofs/details/name. |
| `LandmarkManager` | `(seed)` | `configure(chunk, chunkIndex)` mutates landmark mesh pool and label. |
| `ChunkManager` | object containing scene, seed, four generators, obstacles, optional active/pool counts | `findChunk(index)` returns chunk/null; `acquireChunk(min,max)` returns reusable slot; `configureChunk`, `ensureRange`, `applyLOD`, and `update` mutate pool; `getCurrentChunk()` returns chunk/null. |
| `WorldGenerator` | `(scene, {activeChunkCount=7, poolSize=9, seed}={})` | Owns generators/chunks/obstacles/debug. `registerRegion(name, definition)` stores unused extension data; `reseed()` invalidates/reseeds slots; `update(playerPosition, difficulty=1, delta=1/60, drawCalls=0)` streams world and updates diagnostics. |

Pooled chunk objects are internal structural contracts, not exported types. They carry group/mesh references, per-category full counts, current chunk/layout/theme/village/landmark/event/LOD metadata, object count, road dimensions, and an obstacle-array range.

### `src/world.js`

#### `createWorld(scene)`

- Sets scene background and fog.
- Creates `WorldGenerator` with seven active/nine pooled chunks.
- Derives a deterministic village-life RNG from the world seed.
- Creates fixed village life and two lights.
- Returns `{obstacles, sun, villageLife, worldGenerator}`.
- `obstacles` is the live 90-record procedural collider array.

### `src/main.js`

No exports. Its effective development-only browser API is:

```js
window.__bailgadi.getState() // returns a gameplay snapshot
window.__bailgadi.start()    // calls startGame()
```

This is not an ES-module API and exists in production builds too. Development builds additionally publish a larger JSON snapshot in `document.body.dataset.gameState` and accept `autotest`, `audiotest`, and `voicetest` query parameters.

### `src/style.css`

No JavaScript API. It defines the WebGL canvas layout, overlays, HUD, mission/cargo display, voice controls, debug layout, result screen, touch controls, responsive breakpoints, safe-area handling, and visibility classes.

---

## 2. Internal Ownership of Exported Functions

| Exported function | Caller | When | State mutated |
|---|---|---|---|
| `createWorld()` | `main.js` | Once during module evaluation | Scene background/fog; scene children; newly created world/AI/light state. |
| `createVillageLife()` | `world.js` | Once during `createWorld()` | Scene children and newly allocated actor/AI state. |
| `createRoadGameplay()` | `main.js` | Once during module evaluation | Adds road-gameplay group; initializes hazard hit flags. |
| `createBullockCart()` | `main.js` | Once during module evaluation | Allocates cart hierarchy/animation state; does not add it to scene itself. |
| `createRopeReinAnimation()` | `createBullockCart()` | During cart construction | Adds rope/rein group to cart and returns shared rope state. |
| `animateCart()` | `main.updateMovement()` | Every started frame, after cargo update | Cart/bull/driver/rope transforms and `animationParts`. |
| `updateRopeReinAnimation()` | `animateCart()` | Every cart-animation frame | Rope system, driver arm transforms, 44 segment transforms/buffers. |
| `reactDriver()` | Controls drive-change callback in `main.js` | Successful keyboard/touch/voice drive-state change | Driver reaction fields and rope/rein input state. |
| `triggerRopeReinInput()` | `reactDriver()` | Same drive-change event | Rope/rein input target, hold, source, and debug label. |
| `triggerCartBump()` | `main.updateMovement()` | Fixed road-hazard impact | Road-impact suspension state and cargo-driver reaction fields. |
| `resetCartAnimation()` | `main.replayGame()` | Replay/next mission | All cart animation transforms/state. |
| `resetRopeReinAnimation()` | `resetCartAnimation()` | Replay/next mission | Rope/rein tension and command state. |

The exported classes are owned as follows:

| Instance | Owner/creator | Lifetime and mutation path |
|---|---|---|
| `Controls` | `main.js` | Whole page; DOM/window events mutate it, main polls it each frame. |
| `VoiceControls` | `main.js` | Whole page; voice button and recognizer callbacks mutate it and `Controls`. |
| `CommandTriggerGate` | `VoiceControls` | Whole voice-controller lifetime; reset on enable/disable. |
| `AudioManager` | `main.js` | Whole page; starts on Play and is updated from movement/cargo/AI. |
| `CargoPhysicsManager` | `main.js` | Whole page; reset per mission and updated during movement. |
| `CargoStabilityManager` | `CargoPhysicsManager` | Same lifetime; main/HUD/audio read live fields. |
| `CargoAnimationManager` | `CargoPhysicsManager` | Same lifetime; writes cart cargo transforms and shared animation fields. |
| `DustSystem` | `main.js` | Whole page; updated only while main movement runs, reset on replay. |
| `WorldGenerator` | `world.js`, returned to `main.js` | Whole page; updated every animation frame, even before Play/results. |
| Procedural sub-generators/`ChunkManager` | `WorldGenerator` | Whole page; invoked internally during streaming/reconfiguration. |
| `DynamicWorldAI` | `createVillageLife()` closure | Whole page; reached through facade and managers/debug references. |
| AI managers | `DynamicWorldAI` | Whole page; update every animation frame through facade. |

---

## 3. State Inventory

### Application and mission state

| State | Owner | Read by | Written by |
|---|---|---|---|
| `state.started` | `main.js` | `animate`, debug/test API | `startGame` |
| `state.speed` | `main.js` | movement, camera, cart, dust, audio, HUD, AI, debug | `updateMovement`, completion/failure/replay |
| `state.acceleration` | `main.js` | movement integration, cargo, cart, debug | `updateMovement`, completion/failure/replay |
| `state.heading` | `main.js` | movement vector, collision, cart rotation, camera, test API | `updateMovement`, replay |
| `state.distance` | `main.js` | HUD/debug | `updateMovement`, replay |
| `state.progress` | `main.js` | checkpoints, success, HUD/debug | `updateJourneyProgress`, finish, replay |
| `state.elapsed` | `main.js` | animation, AI, HUD timer, debug | `animate`, replay |
| `state.journeyStatus` | `main.js` | input target gating, movement, HUD | start/finish/complete/fail/replay |
| `state.missionIndex`, `nextMissionIndex`, `mission` | `main.js` | every mission/cargo/world-difficulty/HUD path | replay and completion/failure |
| `state.passedCheckpoints` | `main.js` | progress logic/debug | checkpoint crossing, replay |
| `state.collisionPulse`, `collisionStrength` | `main.js` | camera shake | collision paths, camera decay, replay |
| `state.cargoImpact`, `cargoCameraFeedback` | `main.js` | cargo update/camera | collisions, movement/camera, replay |
| `state.cameraDistance` | `main.js` | debug | camera update/replay |
| HUD buckets/debug timer | `main.js` | HUD/debug update gating | HUD/debug/replay |
| `tuning` | `main.js` | movement and camera | responsive framing mutates camera distance/height; other fields static |

### Input and voice state

| State | Owner | Read by | Written by |
|---|---|---|---|
| `enabled`, `speedLevel`, `reverseActive`, `state.left/right` | `Controls` | main movement/HUD/debug, VoiceControls | keyboard/pointer/public control methods, lifecycle resets |
| `enabled`, `starting`, `listening`, `supported` | `VoiceControls` | button handler, enable/disable flow, main debug | constructor/enable/disable |
| `recognizer`, `modelPromise`, `labels`, `labelIndexes` | `VoiceControls` | prediction pipeline | `loadModel` |
| timers, `micInputLevel`, callback/log flags | `VoiceControls` | gate/UI | meter, prediction callbacks, enable/disable |
| candidate/confirmation/lock/timing/input-active | `CommandTriggerGate` | voice diagnostics/decision | `update`, reset helpers |

### Vehicle, cargo, and surface state

| State | Owner | Read by | Written by |
|---|---|---|---|
| `cart.position/rotation` | cart root, orchestrated by `main.js` | camera, world, AI, dust, progress, collision | movement/replay |
| `animationParts` gait/suspension/driver/impact fields | `cart.js` shared object | main camera/debug/audio, cargo manager, rope system | cart animation, cargo animation, bump/reaction/reset |
| `roadSurface.{roughness,roll}` | `main.js` reusable object | cargo/cart/audio/camera | road-gameplay sampler, replay |
| stability/damage/rate/status/telemetry/`justLost` | `CargoStabilityManager` | main failure/HUD/debug/audio/camera | reset/update |
| cargo spring offsets/velocities/pose/driver fields | `CargoAnimationManager` | debug and cart through shared parts | reset/update |
| road hazard descriptors and `hit` | `road-gameplay.js` closure | collision/surface queries | construction, `checkImpact`, reset |
| rope/rein tensions and input state | rope system from `rope-rein-animation.js` | cart, audio, debug | trigger/update/reset |
| dust particle pool/cursor/buffers | `DustSystem` | renderer/debug | update/spawn/reset |

### Audio state

| State | Owner | Read by | Written by |
|---|---|---|---|
| context/master gain/unlocked/started/loading | `AudioManager` | all playback/update methods/debug | start/resume/load |
| mute state | `AudioManager` | playback and UI | constructor/session storage, sound button |
| buffers/failed/loops/loop volumes | `AudioManager` | playback/update/debug | loaders/loop setters |
| bump/cargo/world/driver source concurrency | `AudioManager` | trigger guards/debug | playback methods and `onended` callbacks |
| movement amount and cue timers | `AudioManager` | bump/cargo scheduling | per-frame audio updates |
| event counters | `AudioManager` | debug snapshot | successful bump/driver playback |

### Procedural world state

| State | Owner | Read by | Written by |
|---|---|---|---|
| seed and sub-generator seeds | `WorldGenerator` | every hash generator; village-life only at initial construction | constructor/reseed |
| `obstacles[90]` | `WorldGenerator`/environment generator | main scenery collision | chunk construction/configure/reseed |
| nine chunk slot objects | `ChunkManager` | renderer, generators, debug | construction, range acquisition/configure/LOD |
| current chunk/difficulty, loaded count, object count | `ChunkManager` | WorldGenerator debug | update/range |
| per-chunk layout/theme/village/landmark/event/counts/LOD | pooled chunk | WorldGenerator debug, LOD | sub-generators/configure/LOD |
| `regions` | `WorldGenerator` | currently unread | `registerRegion` |
| previous player Z, FPS, draw calls, `debug` | `WorldGenerator` | main debug/HUD dev snapshot | frame update/reseed detection |

### Fixed world-life state

| State | Owner | Read by | Written by |
|---|---|---|---|
| actor arrays and actor `active/visible` | environment-life/SpawnManager | NPC/animal updates/debug | construction, SpawnManager |
| actor state/timers/targets/waypoints/pose | actor objects, managed by NPC/Animal managers | same managers and extensions | constructors and per-frame updates |
| extension maps | NPC/Animal/Ambient managers | corresponding update paths | registration methods |
| ambient current event/timers/cooldowns | `AmbientEventManager` | debug and event update | begin/end/update/cue requests |
| bird/dust/leaf/smoke/wind visual state | `AmbientEventManager` | renderer | construction and per-frame event update |
| aggregate AI debug and average update time | `DynamicWorldAI` | main debug/dev snapshot | every AI update |

### DOM and renderer state

DOM nodes are queried and retained at module scope by `main.js`; `Controls`, `VoiceControls`, and `AudioManager` retain subsets. The DOM is written from event handlers, mission lifecycle functions, `updateMovementDebug()` every 100 ms, and `updateHud()` every frame. `scene`, `camera`, and `renderer` are module-scope state owned exclusively by `main.js`; subsystem modules receive `scene` during construction but do not retain ownership of the top-level renderer or camera.

---

## 4. File Responsibilities

### `src/main.js`

Composition root and game/session controller. It creates Three.js infrastructure and every system, owns mission definitions and journey state, integrates input with driver/audio feedback, performs vehicle kinematics and collision coordination, advances cargo/cart/dust/audio, follows the camera and sun, updates all UI/debug fields, handles start/replay/resize/test hooks, and owns the `requestAnimationFrame` loop.

### `src/world.js`

Thin world bootstrap facade. It configures scene fog/background, creates the pooled procedural world, seeds the separate fixed village-life system, creates directional and hemisphere lighting, and returns live references needed by main.

### `src/procedural-world.js`

Complete runtime landscape generator. It owns reusable materials/geometries, hash-based theme/layout/content selection, dynamic road and ground geometry, instanced environment pools, villages, landmarks, visual world events, collider slots, nine pooled chunk scene graphs, count-based LOD, streaming/reseed logic, and procedural diagnostics.

### `src/road-gameplay.js`

Owns a separate fixed gameplay-content layer: fourteen authored hazards, surface roughness/roll sampling, impact hit flags, and the fixed destination arch/temple/banyan at Z 480.

### `src/cart.js`

Builds the procedural bullock-cart visual hierarchy and owns its main animation contract. It constructs bulls, gait parts, driver, cart body, wheels, cargo variants, harness, shadows, and anchors; it updates gait, suspension, driver pose, and delegates rope/rein animation.

### `src/rope-rein-animation.js`

Builds and animates two trace ropes and two reins as segmented cylinder chains sampled from Catmull-Rom curves. It owns tension/input state and transforms cart/bull/hand anchors into cart-root space every animation update.

### `src/cargo-physics-manager.js`

Implements cargo gameplay stability and visual spring motion. It contains per-type tuning, calculates damage/recovery/status from driving inputs, moves the selected cargo group, and writes driver worry/look/lean/rein fields into the cart’s shared animation state.

### `src/controls.js`

Normalizes keyboard and pointer/touch actions into held steering plus latched speed-level/reverse state. It owns the shared drive API and emits a callback for successful drive-state changes.

### `src/voice-controls.js`

Owns lazy TensorFlow speech-model loading, microphone recognition and level measurement, score validation, command gating/cooldown, START/STOP-to-Controls mapping, and voice diagnostics/UI.

### `src/audio-manager.js`

Owns the Web Audio graph, MP3 loading/decoding, four movement/ambience loops, driver/bump/cargo one-shots, synthesized cargo buffers, synthesized ambient cues, mute persistence, concurrency guards, and audio debug state.

### `src/environment-life.js`

Procedurally constructs the fixed cast of villagers, cows/buffaloes, chickens, bicycles, and smoke systems, adds them to the scene, creates `DynamicWorldAI`, and exposes a small update/manager/debug/count facade.

### `src/dynamic-world-ai.js`

Owns distance-based actor activation, NPC and animal state machines/avoidance/animation, ambient visual/audio events, smoke/wind updates, extension handler maps, and aggregate AI diagnostics.

### `src/dust-system.js`

Owns a fixed `THREE.Points` pool for hoof/wheel dust, including typed position/color buffers, circular reuse, travel-based spawning, particle integration/fade, and replay reset.

### `src/style.css`

Owns presentation only: full-screen canvas, start/result overlays, HUD and mission meter, voice/audio controls, hidden diagnostics, checkpoint/hint UI, touch controls, accessibility helper styles, and responsive/safe-area behavior.

---

## 5. Event Flow

### Play

```text
Play button click
→ main.startGame()
→ state.started/status = playing
→ cargoPhysics.reset(current cargo/difficulty)
→ controls.resetAll() + setEnabled(true)
→ hide start / show HUD, hint, touch controls
→ audioManager.start()
→ next animation frame begins updateMovement()
```

### Keyboard W / Arrow Up

```text
window keydown (non-repeat)
→ Controls.onKey()
→ Controls.increaseSpeedLevel("keyboard")
→ onSpeedLevelChange callback in main
→ AudioManager.playDriverCommand("forward")
→ reactDriver(animationParts, "forward", "keyboard")
→ triggerRopeReinInput()
→ later each frame: updateMovement polls getTargetSpeed()
→ speed/position → cargoPhysics → animateCart → dust/audio/camera/HUD
```

Key release does not lower the latched speed.

### Keyboard S / Arrow Down

```text
window keydown (non-repeat)
→ Controls.onKey()
→ if forward level > 0: stopSpeedLevel("keyboard")
  else: activateReverse("keyboard")
→ main drive-change callback
→ AudioManager.playDriverCommand("brake")
→ reactDriver(..., "brake")
→ frame loop accelerates actual speed toward 0 or -4 km/h
```

### Keyboard A/D or Arrow Left/Right

```text
keydown/keyup
→ Controls.state.left/right
→ updateMovement computes steerInput
→ heading + cart lean
→ cargo turn stress
→ animateCart / updateCamera / AudioManager.updateMovement
```

Window blur clears steering only.

### Touch/pointer

```text
Forward pointerdown
→ increaseSpeedLevel("touch")

Brake pointerdown
→ stopSpeedLevel("touch")

Reverse pointerdown
→ activateReverse("touch")

Left/right pointerdown
→ held Controls.state flag
→ pointerup/cancel/lost capture clears flag
```

Successful drive taps then use the same main callback, driver audio, cart reaction, and per-frame movement path as keyboard input. Releasing a drive button removes its CSS active state but does not undo the latched drive setting.

### Voice toggle and command

```text
Voice button click
→ VoiceControls.enable()
→ loadModel() (first time)
→ recognizer.listen()
→ microphone analyser interval
→ prediction callback
→ handlePrediction() → handleScores()
→ CommandTriggerGate.update()
→ applyDetectedLabel()
→ applyCommand("forward"|"brake")
→ Controls.increaseSpeedLevel("voice-model")
   or Controls.decreaseSpeedLevel("voice-model")
→ main Controls callback
→ reactDriver() / rope-rein animation
→ normal frame movement path
```

The main callback intentionally skips driver command audio when the source is `voice-model`. Clicking again calls `disable()`, stops listening/meter, and resets only voice gate/UI—not the current cart speed level.

### Sound toggle

```text
Sound button click
→ AudioManager.setMuted(!muted)
→ sessionStorage["bailgadi-muted"]
→ master gain ramp
→ sound button text/ARIA update
```

### Procedural scenery collision

```text
updateMovement proposes next X/Z
→ sceneryObstacleHit() scans WorldGenerator.obstacles
→ hit
→ reverse actual speed at 12%
→ collision/cargo impact pulses
→ proposed position rejected
→ cargo stability update receives impact
→ camera shakes
```

This path has no cart-bump animation/audio call.

### Fixed road-hazard collision

```text
cart position updated
→ roadGameplay.checkImpact(position, heading)
→ first unhit hazard marks hit and returns severity/side
→ speed reduced
→ camera/cargo impact pulses
→ triggerCartBump()
→ AudioManager.triggerBump()
→ cargoPhysics.update() applies one-frame damage
→ animateCart() runs suspension impulse
```

### Cargo damage and failure

```text
each started frame
→ roadGameplay.sampleSurface()
→ CargoPhysicsManager.update()
→ CargoStabilityManager.update()
→ stability/damage/status/justLost
→ CargoAnimationManager.update()
→ HUD/audio/camera consume live stability

if justLost (stability reaches 0)
→ main.failCargoMission()
→ stop vehicle and disable controls
→ AudioManager.playCargoFailure()
→ show shared result overlay as "Cargo Damaged"
```

### Checkpoint

```text
updateMovement()
→ updateJourneyProgress()
→ derive progress from cart Z - mission start Z
→ remaining crosses 400/300/200/100
→ add checkpoint to passedCheckpoints
→ showCheckpoint()
→ message visible
→ 2100 ms timer hides it
```

### Mission complete

```text
remaining reaches 0
→ beginJourneyFinish()
→ status = finishing
→ disable/reset Controls
→ subsequent movement frames target speed 0
→ actual speed damps below 0.025 m/s
→ completeJourney()
→ status = reached
→ choose next mission index
→ hide touch/checkpoint
→ show success result overlay
```

The displayed time reaching zero does not trigger failure.

### Replay / next mission

```text
Replay button click
→ main.replayGame()
→ select state.nextMissionIndex
→ reset controls, hazards, dust, cart animation
→ reset movement/mission/collision/HUD state
→ teleport cart/camera to new mission start
→ reset cargo for new type/difficulty
→ hide result and resume playing
→ next WorldGenerator.update sees large backward Z jump
→ usually WorldGenerator.reseed()
→ chunk pool invalidated/regenerated
```

### Resize

```text
window resize
→ camera aspect
→ updateResponsiveFraming() changes chase tuning and FOV
→ projection matrix update
→ renderer size and capped pixel ratio update
```

The sun shadow-map resolution is not recalculated.

---

## 6. Three.js Ownership

### Top-level rendering

| Object | Owner | Created/used |
|---|---|---|
| `THREE.Scene` | `main.js` | Single scene created at startup; passed to world, road, dust, and life constructors. |
| `PerspectiveCamera` | `main.js` | Created/configured/followed/resized in main. |
| `WebGLRenderer` | `main.js` | Created/configured/rendered/resized in main; canvas appended to `#canvas-root`. |
| Directional sun and target | `world.js`, animated by `main.js` | World creates/adds; main follows cart and positions target. |
| Hemisphere light | `world.js` | Created and added once; reference not retained. |

### Major groups

| Group | Owner |
|---|---|
| `BullockCart`, `Bulls`, `RunningGear`, `CartBody`, `YokeAndPoles`, `ContactShadows` | `cart.js`; root position/heading owned by main |
| `RopesAndReins` and 4 segment groups | `rope-rein-animation.js` |
| `RoadGameplay` and `VillageDestination` | `road-gameplay.js` |
| Nine `ProceduralChunkPool#` groups | `ChunkManager` in `procedural-world.js` |
| Villager/animal/bicycle/smoke roots | built by `environment-life.js`, animated/activated by dynamic AI managers |
| Ambient bird and leaf groups | `AmbientEventManager` |

### Procedural chunk meshes

Each chunk slot owns one dynamic ground strip, one dynamic road strip, one track `InstancedMesh`, instanced tree trunks/crowns, crops, grass, bushes, rocks, houses, roofs, roadside props, pots, wood piles, signs, and event people; one water mesh; 12 village-detail meshes; and 14 landmark meshes. `procedural-world.js` owns all shared materials/geometries and all instance-matrix/count/bounds updates.

### Other meshes and particle systems

| Object | Owner |
|---|---|
| Fixed hazard/destination meshes | `road-gameplay.js` |
| Cart meshes, cargo variants, contact shadows | `cart.js` |
| Rope/rein cylinder meshes and curve line buffers | `rope-rein-animation.js` |
| Cart dust `THREE.Points`, typed buffers, material/geometry | `DustSystem` |
| Ambient dust `THREE.Points` | `AmbientEventManager` |
| Smoke `THREE.Points` with custom shader/alpha attribute | constructed in `environment-life.js`, updated by `AmbientEventManager` |
| Bird/leaf pooled meshes | `AmbientEventManager` |

No module provides a disposal API. Scene children, materials, geometries, audio nodes, and most listeners live for the page lifetime.

---

## 7. Update Ownership

### Frame-level order

`main.animate()` runs once per `requestAnimationFrame`; delta is capped at 0.05 s:

```text
elapsed
→ updateMovement() if started
→ WorldGenerator.update()
→ villageLife/DynamicWorldAI.update()
→ updateCamera()
→ updateMovementDebug() (internally throttled)
→ updateHud()
→ renderer.render()
```

### Update functions and methods

| Update | Frequency/caller | Inputs | Outputs/side effects |
|---|---|---|---|
| `main.updateMovement(delta)` | Every animation frame while `state.started` is true, including finishing/results | delta plus shared state/controls | Speed integration, steering, cart pose, collisions, progress, surface, cargo, cart, dust, audio. |
| `main.updateJourneyProgress()` | Once inside each movement update | cart Z/mission | Progress/checkpoints/finish transition and timers/DOM. |
| `CargoPhysicsManager.update(...)` | Once per movement update | delta, acceleration, speed ratio, turn, roughness, impact, previous suspension | Updates stability then cargo animation. |
| `CargoStabilityManager.update(...)` | Once per cargo manager update | same stability inputs | Live damage/status telemetry and `justLost`. |
| `CargoAnimationManager.update(...)` | Once per cargo manager update | frame/driver/surface/status values | Cargo root transform, spring state, shared driver fields. |
| `animateCart(...)` | Once per movement update | speed/travel/time/delta/surface/acceleration | All cart visual animation and animation telemetry. |
| `updateRopeReinAnimation(...)` | Once inside `animateCart` | cart frame and suspension | Rope/rein/arm state and geometry transforms. |
| `DustSystem.update(...)` | Once per movement update | cart/speed/travel/delta | Particle spawn/integration and GPU attribute dirtiness. |
| `AudioManager.updateMovement(...)` | Once per movement update | speed/delta/steering/gait/roughness | Loop mix/rates, movement amount, bump scheduling. |
| `AudioManager.updateCargo(...)` | Once per movement update | stability/type/tension/roughness/delta | Cargo cue timer/source. May return early without decrementing timer while stable/stopped. |
| `WorldGenerator.update(...)` | Every animation frame, regardless of game state | cart position, mission level, delta, previous-frame draw calls | Reseed detection, chunk update, FPS/draw-call/current-chunk debug. |
| `ChunkManager.update(position,difficulty)` | Once per world update | player position/difficulty | Streams/reconfigures range on changes and applies LOD every frame. |
| `SpawnManager.update(cartPosition)` | Once per AI update | cart position | Actor active/visibility and counters. |
| `NPCManager.update(...)` | Once per AI update | cart pose/speed/time/delta | Every active villager state/pose/position and possible footstep cue. |
| `NPCManager.updateVillager(...)` | Once per villager per NPC update | actor and frame state | Actor AI/animation/extension callback. |
| `AnimalManager.update(...)` | Once per AI update | cart pose/speed/time/delta | Iterates all large animals and chickens. |
| `updateLargeAnimal` / `updateChicken` | Once per corresponding actor per AI update | actor and frame state | State, avoidance, movement, animation, cue requests/extensions. |
| `AmbientEventManager.update(...)` | Once per AI update | cart position/time/delta | Event timers/visuals/extensions, smoke, wind, audio cooldown. |
| `updateEventVisuals(...)` | Active event frames only | elapsed/delta | Birds, ambient dust, or leaves. |
| `updateSmoke(...)` | Every ambient update | elapsed/delta | Smoke positions/alpha attributes. |
| `updateWind(...)` | Every ambient update | cart position/elapsed | Nearby registered wind-target rotations. Current world passes an empty list. |
| `DynamicWorldAI.update(...)` | Once through village-life per frame | cart position/speed/time/delta | Runs spawn→NPC→animals→ambient and updates diagnostics. |
| village-life facade `update({...})` | Once from main per frame | object form of AI inputs | Delegates only. |
| `main.updateCamera(delta)` | Every animation frame | shared cart/cargo/surface state | Camera pose/look target, shake decay, sun/target position. |
| `main.updateMovementDebug(delta)` | Called every frame; DOM writes every 0.1 s | all subsystem live state | Diagnostic DOM. |
| `main.updateHud()` | Every animation frame | mission/vehicle/cargo state | HUD DOM and development snapshot. |
| `CommandTriggerGate.update(...)` | Every valid voice prediction callback | confidence/input/time | Gate state and optional command label; not frame-based. |
| `VoiceControls.updateDebug(...)` | Prediction callbacks and disable | confidence object | Voice diagnostic DOM. |
| `AudioManager.updateButton()` | Construction and mute changes | mute state | Sound button DOM. |

Procedural `configure*()` methods are not frame updates. They run when a chunk slot is first needed, crosses the active range, difficulty changes, or reseeding invalidates the pool. They rewrite geometry, instance matrices/counts, mesh visibility/materials, metadata, and collider records.

---

## 8. Safe Extension Points

These are attachment recommendations, not implementations.

| New system | Attach here | Contract to use |
|---|---|---|
| Weather | Create beside `worldGenerator` in `main.js`; update immediately after `worldGenerator.update()` and before AI/camera. | Consume time/cart/current chunk; output fog/light/wind/surface/audio modifiers. Do not mutate chunk internals directly. |
| Day/Night | Own sun, hemisphere-light reference, fog, background, and renderer exposure through a new environment controller returned by `createWorld()`. | Update before camera/render; keep sun-follow position separate from solar angle/color/intensity. |
| Economy | Subscribe to explicit mission-result events extracted from `completeJourney()`/`failCargoMission()`. | Own balance/transactions; HUD reads a view model. Do not infer rewards from finish-screen DOM. |
| Save System | Attach to serializable mission/player/settings/economy models after they are extracted from main. | Persist versioned plain data, including world seed; never serialize Three.js/Web Audio/DOM objects. |
| Achievements | Consume semantic events: mission started/completed/failed, checkpoint, collision, cargo threshold, input command. | Read-only event consumer with its own persisted progress. |
| Bull Stamina | Add to a vehicle simulation object between `Controls.getTargetSpeed()` and speed integration in `updateMovement()`. | Output effective acceleration/max speed; expose normalized stamina to animation/audio/UI. |
| Terrain | Extend `RoadGenerator` with a unified `sampleRoad(worldZ,difficulty)` returning center, width, height, tangent, roughness, and chunk identity. | Main movement, hazards, destination, AI, and camera should consume the same query. |
| Procedural regions | Make `WorldGenerator.registerRegion()` feed chunk descriptor selection before `configureChunk()`. | Region definitions should be deterministic from seed/index and provide theme/spawn/mission hooks. |
| New missions | Move `MISSIONS` and lifecycle into a manager first; keep cargo/reward/time/failure policies data-driven. | Manager outputs active mission/progress/result events; main remains orchestrator. |
| New cargo | Add definition to `CARGO_TYPES` and matching visual group from cart construction. | Keep key shared among mission data, visibility groups, physics, audio selection, and labels. |
| New input device | Call only public `Controls` methods or set a future explicit steering API. | Reuse source labels and the existing drive-change callback. |
| New AI activity | Use manager registration methods only after selection is made registry-driven. | Handler must receive actor/frame context and avoid owning renderer/UI. |
| New ambient audio | Route semantic cue requests through `AudioManager`; add a bus/concurrency policy before large expansion. | AI supplies source/listener information; audio owns nodes. |
| New UI screen | Add a screen/state controller above DOM mutation. | Consume mission/player view models and semantic actions, not subsystem internals. |

The safest immediate seam is composition in `main.js`; the safest long-term seam is a new application root with explicit update/event contracts. Avoid attaching more gameplay directly to DOM, `animationParts`, or pooled chunk object shapes.

---

## 9. Dangerous Files

| Risk | File | Why changes are high-risk |
|---:|---|---|
| Critical | `src/main.js` | Central mutable state and exact update order bind movement, missions, collision, cargo, animation, camera, audio, UI, world, AI, and tests. A local change can alter multiple frame consumers. |
| Critical | `src/procedural-world.js` | Large shared pooling contract. Generators mutate the same chunk objects, typed buffers, instance counts, bounds, metadata, and obstacle slices; recycling/LOD bugs can corrupt unrelated chunks. |
| High | `src/cart.js` | Construction and animation share a large untyped `animationParts` object also mutated/read by cargo, ropes, camera, audio, debug, and reset logic. |
| High | `src/dynamic-world-ai.js` | Multiple actor schemas and state machines share mutable actor objects and ambient audio/events; extension names are only partially data-driven. |
| High | `src/cargo-physics-manager.js` | Cargo status drives mission failure, camera feedback, UI, audio, cargo transforms, and driver animation. Update ordering depends on previous-frame suspension. |
| High | `src/rope-rein-animation.js` | Depends on exact cart anchor hierarchy and parent transforms; updates many objects/buffers per frame and also overwrites driver arm transforms. |
| High | `src/controls.js` | All keyboard, touch, and voice drive behavior converges here; latched semantics and stop/reverse transitions are easy to change unintentionally. |
| High | `src/road-gameplay.js` | Fixed hazards, collision footprint, surface sampling, and destination are coupled to straight global coordinates and mission progress. |
| Medium-high | `src/voice-controls.js` | Async model/microphone lifecycle, timers, browser internals, and Controls mutation interact; race/error paths matter. |
| Medium-high | `src/audio-manager.js` | User-gesture restrictions, async loading, node concurrency, session state, and frame-driven mix changes interact. |
| Medium | `src/environment-life.js` | Defines implicit actor object schemas consumed deeply by `dynamic-world-ai.js`; changing a returned part can fail later in frame updates. |
| Medium | `src/world.js` | Small but composition-sensitive: seed, collider, AI, fog, and light ownership flow through its return object. |
| Medium | `index.html` | Main and voice code assume many selectors exist; missing/renamed nodes generally fail at startup or update time. |
| Lower | `src/dust-system.js` | Self-contained, but tied to cart local anchors and per-frame GPU buffer updates. |
| Lower | `src/style.css` | Gameplay-independent, but visibility classes and responsive controls directly affect usability; the debug panel is already hidden by a conflicting display rule. |

---

## 10. Refactoring Priority: Top 20

Ranked by architectural impact and risk reduction, not implementation ease.

1. **Add characterization tests for current behavior.** Cover Controls transitions, command gate, cargo thresholds, mission states, road impacts, chunk determinism/recycling, and startup/replay before structural work.
2. **Create an application lifecycle root.** Own initialization, start/pause/result/replay, resize, update, render, and disposal instead of module-scope side effects.
3. **Extract vehicle simulation from `main.js`.** Give speed, acceleration, heading, position, steering, and bounds an explicit state/input/output contract independent of Three.js.
4. **Extract `MissionManager`.** Own mission definitions, timer policy, progress, checkpoints, success/failure, next/retry choice, and result events.
5. **Define a complete world-query API.** Unify procedural road center/width/height/tangent, surface, colliders, destination, and region lookup.
6. **Integrate procedural road with gameplay.** Make vehicle, fixed hazards, mission progress, destination, camera, and AI use the same generated route instead of parallel coordinate assumptions.
7. **Introduce a typed event layer.** Publish drive changes, impacts, cargo status transitions, checkpoints, and mission results for audio/UI/economy/achievements.
8. **Replace the loose `animationParts` contract.** Split stable named anchors, visual state, and animation telemetry into documented typed interfaces.
9. **Split `procedural-world.js`.** Separate immutable content definitions, geometry pools, road/environment/village/landmark generators, chunk streaming, collision registration, and diagnostics.
10. **Make seed/run state reproducible.** Store/expose the seed, define intentional reseed rules, and keep fixed AI spawns synchronized with streamed terrain.
11. **Unify world actor ownership with chunks.** Generate deterministic spawn descriptors and acquire/release actual actor pools as chunks stream.
12. **Create a collision/spatial-query service.** Replace full-array scans and register every intended collidable category with active chunk ownership.
13. **Centralize configuration.** Group rendering, camera, vehicle, cargo, mission, world, AI, audio, voice, and UI timings in validated configuration.
14. **Create a UI state/controller boundary.** Replace per-frame broad DOM writes with changed-value view models and explicit screen routing.
15. **Add disposal and cancellation contracts.** Remove listeners, clear timers/intervals, stop recognizers/audio nodes, and dispose Three.js resources.
16. **Split `dynamic-world-ai.js`.** Separate spawn activation, NPC behavior, animal behavior, ambient effects, and spatial audio requests with explicit actor schemas.
17. **Make behavior/event registries selectable.** Registration should include weights/conditions so extensions do not require editing hard-coded arrays.
18. **Refactor audio into buses and cue policies.** Separate ambience, vehicle, cargo, driver, voice, and UI; add listener-oriented spatialization and per-cue concurrency.
19. **Profile and enforce performance budgets.** Measure mobile CPU/GPU time, draw calls, triangles, shadow casters, allocations, voice memory, and chunk regeneration spikes before optimizing.
20. **Add a versioned persistence/profile layer.** After mission/economy models exist, persist settings, progression, coins, upgrades, achievements, and reproducible run state without coupling storage to rendering.

The recommended dependency order is tests → lifecycle → simulation/mission → world query/integration → events/UI → persistence/content. Performance work should be measurement-led and can proceed alongside extraction once representative traces are available.
