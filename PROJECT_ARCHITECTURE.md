# Bailgadi Project Architecture

## Scope and current state

This document describes the repository as it exists now. It does not describe an intended design unless that design is clearly marked as an extension recommendation.

Bailgadi is a browser-only, low-poly 3D delivery game built with vanilla JavaScript, Three.js, Vite, the Web Audio API, and a TensorFlow.js speech-command model. The application has no framework-level component tree, no server-side game state, no persistence layer, and no standalone `Game`, `MissionManager`, or `CameraManager` class. `src/main.js` is the composition root and owns most game/session orchestration. The current working tree includes an untracked `src/procedural-world.js` and its integrations in modified `src/world.js`, `src/main.js`, and `index.html`; this document analyzes that current working state rather than only the last Git commit.

---

## 1. Project Structure

### Current source tree

```text
BailgadiWeb/
├── .openai/
│   └── hosting.json
├── build/
│   └── sites-vite-plugin.ts
├── public/
│   ├── assets/
│   │   └── audio/
│   │       ├── bull-breathing.mp3
│   │       ├── bull-foot-walk.mp3
│   │       ├── cart-bump.mp3
│   │       ├── chal-chal.mp3
│   │       ├── ruk-ruk.mp3
│   │       ├── village-ambience.mp3
│   │       └── wooden-cart-running.mp3
│   └── models/
│       └── bailgadi-voice/
│           ├── metadata.json
│           ├── model.json
│           └── weights.bin
├── src/
│   ├── audio-manager.js
│   ├── cargo-physics-manager.js
│   ├── cart.js
│   ├── controls.js
│   ├── dust-system.js
│   ├── dynamic-world-ai.js
│   ├── environment-life.js
│   ├── main.js
│   ├── procedural-world.js
│   ├── road-gameplay.js
│   ├── rope-rein-animation.js
│   ├── style.css
│   ├── voice-controls.js
│   └── world.js
├── worker/
│   └── index.js
├── .gitignore
├── index.html
├── package-lock.json
├── package.json
├── README.md
├── tsconfig.json
└── vite.config.ts
```

The working directory also contains generated/cache directories such as `dist/`, `.vinext/`, and `.wrangler/`, plus currently empty scaffolding directories such as `app/`, `db/`, `drizzle/`, `examples/`, `scripts/`, and `tests/`. They are not part of the tracked gameplay architecture. `node_modules/` is dependency output and is likewise excluded from the source tree.

### Folder purposes

| Folder | Purpose |
|---|---|
| `src/` | All client game logic, procedural/chunked world generation, mesh construction, animation, UI wiring, input, audio, AI, and CSS. There are no nested `components/`, `scenes/`, `managers/`, `systems/`, `models/`, `shaders/`, `ui/`, or `utils/` folders; those responsibilities are separated only by files. |
| `public/assets/audio/` | Seven decoded MP3 assets for ambience, movement loops, impacts, and driver commands. |
| `public/models/bailgadi-voice/` | TensorFlow speech-command graph, label metadata, and approximately 5.5 MB of weights. |
| `build/` | A custom Vite build plugin that packages Sites metadata, optional Drizzle migrations, and the Cloudflare worker after the client build. It is deployment tooling, not gameplay code. |
| `worker/` | A minimal Cloudflare-style asset worker that forwards every request to `env.ASSETS`. |
| `.openai/` | Sites hosting project metadata. No database or object-storage binding is configured. |
| `dist/` | Generated deployment output. It is not authoritative source and should not be edited. |

### File responsibilities

| File | Responsibility |
|---|---|
| `index.html` | Declares every overlay, HUD field, control button, voice/debug field, and the `/src/main.js` module entry. |
| `src/main.js` | Composition root; creates Three.js infrastructure and all systems; owns game state, missions, movement, collision coordination, camera follow, journey lifecycle, HUD updates, resize handling, debug/test hooks, and the animation loop. |
| `src/world.js` | Thin world composition facade: sets background/fog/lights, creates `WorldGenerator`, seeds the separate village-life system from the generated world seed, and returns the live procedural obstacle array. |
| `src/procedural-world.js` | Implements seeded runtime generation through `WorldGenerator`, `ChunkManager`, `RoadGenerator`, `EnvironmentGenerator`, `VillageGenerator`, and `LandmarkManager`; owns a nine-slot chunk pool, procedural road/ground geometry, instanced scenery, LOD counts, villages, landmarks, visual world events, obstacle slots, reseeding, and world diagnostics. |
| `src/road-gameplay.js` | Builds fixed road hazards and destination marker; performs hazard impact tests and road-surface sampling. |
| `src/cart.js` | Procedurally constructs the bulls, cart, cargo meshes, driver, harness, wheels, and contact shadows; updates gait, wheels, suspension, bull/driver motion, and road-impact response. |
| `src/rope-rein-animation.js` | Creates and animates segmented trace ropes and reins, including tension and command reactions. |
| `src/cargo-physics-manager.js` | Defines cargo types, stability/damage rules, cargo spring motion, and cargo-related driver reaction. This is visual/gameplay approximation, not a rigid-body solver. |
| `src/controls.js` | Normalizes keyboard and pointer/touch controls into steering state, speed level, reverse state, and target speed. |
| `src/voice-controls.js` | Lazily loads the TensorFlow speech model, controls microphone recognition, gates noisy predictions, updates voice diagnostics, and calls the shared `Controls` API. |
| `src/audio-manager.js` | Creates the Web Audio graph, loads MP3 buffers, synthesizes cargo/world cues, manages looping and one-shot playback, and stores mute state in session storage. |
| `src/environment-life.js` | Procedurally creates villagers, animals, chickens, bicycles, and smoke, then exposes `DynamicWorldAI` through a small facade. |
| `src/dynamic-world-ai.js` | Implements spawn visibility, NPC/animal state machines, avoidance, ambient events, smoke/wind updates, synthetic spatial-cue requests, and AI debug metrics. |
| `src/dust-system.js` | Maintains a fixed point-particle pool for cart/hoof dust. |
| `src/style.css` | Styles all overlays and HUD, establishes responsive/touch layouts, and hides the debug panel by default. |

---

## 2. Rendering Pipeline

### Entry point and scene creation

`index.html` loads `/src/main.js` as an ES module. Module evaluation immediately:

1. Imports Three.js, CSS, and all gameplay modules.
2. Queries every required DOM element.
3. Creates a `THREE.Scene`, `PerspectiveCamera`, and `WebGLRenderer`.
4. Calls `createWorld(scene)`, which preallocates nine procedural chunk slots and creates the separate fixed village-life population.
5. Calls `createRoadGameplay(scene)`.
6. Calls `createBullockCart()` and adds the returned group to the scene.
7. Creates dust, cargo physics, audio, controls, and voice systems.
8. Configures initial camera framing and event listeners.
9. Calls `animate()` immediately, even while the start screen is visible.

There is one scene for the entire application. There is no scene router, loading scene, post-processing scene, or separate UI render pass. HTML/CSS overlays sit above the WebGL canvas.

### Camera

The camera is a `THREE.PerspectiveCamera` with:

- Initial constructor FOV: `54` degrees, subsequently changed by responsive framing.
- Aspect: `window.innerWidth / window.innerHeight`.
- Near/far planes: `0.1` / `450`.
- Desktop FOV: `52`; mobile landscape: `55`; mobile portrait: `58`.
- Desktop chase distance/height: `11.8` / `6.35`.
- Mobile landscape: `12.2` / `6.65`.
- Mobile portrait: `13.1` / `7.15`.

`updateCamera(delta)` runs every frame. It computes a chase point behind the cart heading, adds speed pullback, steering offset, suspension shake, cargo-instability shake, and collision shake, then exponentially interpolates `camera.position`. `camera.lookAt()` targets a point ahead of the cart. There is no camera object hierarchy or dedicated camera manager.

### Renderer

The renderer is `THREE.WebGLRenderer` with:

- Antialiasing enabled.
- `powerPreference: "high-performance"`.
- Pixel ratio capped at `2` on desktop and `1.5` on a viewport whose smaller dimension is below `800`.
- `SRGBColorSpace`.
- `ACESFilmicToneMapping`.
- Tone-mapping exposure `1.05`.
- `PCFSoftShadowMap`.

There is no composer, multisample render target, bloom, screen-space effect, or custom final-pass shader.

### Animation loop

`animate()` uses `THREE.Clock`. Frame delta is capped at `0.05` seconds to limit simulation jumps, then the game updates and calls:

```text
renderer.render(scene, camera)
requestAnimationFrame(animate)
```

The loop never pauses when an overlay is visible or the tab loses focus. Movement is gated by `state.started` and journey status, but AI, camera, HUD, elapsed time, and rendering continue.

### Resize handling

The `resize` listener:

1. Updates `camera.aspect`.
2. Calls responsive framing, which changes camera distance, height, and FOV.
3. Calls `camera.updateProjectionMatrix()`.
4. Resizes the renderer.
5. recalculates the capped pixel ratio.

The directional shadow-map resolution is chosen once during world creation and is not rebuilt if a resize crosses the mobile threshold.

### Lighting, fog, and shadows

`createWorld()` configures:

- Background and linear fog color `0xa4cde3`.
- Fog near/far distances `92` / `300`.
- A directional “sun” at `(-42, 65, -25)`, color `0xffdfaa`, intensity `3.05`.
- A hemisphere light with sky color `0xd8e9ef`, ground color `0x62713d`, intensity `1.82`.

The sun follows the cart in X/Z each frame and its target is copied to the cart position. Its orthographic shadow camera spans `-48..48` horizontally and vertically, near/far `1..170`, with bias `-0.00025`. Shadow map size is `1024²` on a small viewport and `2048²` otherwise.

Most constructed meshes cast and receive shadows. Some instanced ground detail disables casting. The cart’s final `group.traverse()` sets both flags on every mesh, which also overrides earlier opt-outs on rope segments and contact-shadow meshes. Transparent blob contact shadows are an additional fake-shadow layer.

---

## 3. Game Loop

### Exact top-level frame order

The exact `animate()` order is:

```text
1. delta = min(clock.getDelta(), 0.05)
2. state.elapsed += delta
3. if state.started:
     updateMovement(delta)
4. worldGenerator.update(cart.position, mission.level, delta,
                         renderer.info.render.calls)
5. villageLife.update(...)
6. updateCamera(delta)
7. updateMovementDebug(delta)
8. updateHud()
9. renderer.render(scene, camera)
10. previousPosition.copy(cart.position)
11. requestAnimationFrame(animate)
```

Input is event-driven, so there is no `updateInput()` call in the frame loop.
The draw-call value passed to the procedural-world diagnostics is from the
previous render, because the current frame has not yet reached `render()`.

### Exact `updateMovement()` order

```text
1. Read target speed from Controls, unless journey is not "playing".
2. Resolve speed/acceleration:
   a. force zero when reached;
   b. damp to zero while finishing;
   c. otherwise calculate speed error, desired acceleration, response, and next speed.
3. Clamp actual speed to reverse/forward limits.
4. Read steering buttons/keys and update heading.
5. Calculate proposed X/Z movement.
6. Test static scenery collisions:
   a. bounce speed backward;
   b. set camera/cargo impact pulses;
   or update/clamp cart position.
7. Apply cart rotation, steering lean, and fixed ground Y.
8. Calculate signed travelled distance and accumulate forward journey distance.
9. Test fixed road hazards:
   a. reduce speed;
   b. set impact pulses;
   c. trigger cart suspension impulse;
   d. play bump audio.
10. updateJourneyProgress()
11. roadGameplay.sampleSurface()
12. Scale sampled roughness by mission roughness.
13. cargoPhysics.update()
14. Clear one-frame cargo impact.
15. If cargo was just lost, failCargoMission().
16. animateCart()
17. dustSystem.update()
18. audioManager.updateMovement()
19. audioManager.updateCargo()
```

`animateCart()` internally updates wheels, bull gait, suspension, driver pose, rope/rein animation, and cargo-driven arm pull. The cargo system updates before cart animation, so cargo reaction fields are available to the driver animation in the same frame; it receives the previous frame’s `animationParts.suspensionY` when calculating stability.

### Procedural-world update order

`worldGenerator.update()` runs even before Play and behind result overlays:

```text
1. If player Z jumped backward by more than 18 m, reseed the world.
2. ChunkManager.update(playerPosition, difficulty)
   a. floor(player Z / 80) to find the current chunk
   b. if chunk or difficulty changed, configure/reconfigure the active range
   c. keep 2 chunks behind, the current chunk, and 4 ahead
   d. apply LOD instance counts to every visible chunk
3. Exponentially smooth the FPS diagnostic.
4. Copy previous-frame draw calls and current-chunk metadata into debug state.
```

Chunk configuration order is road, environment, village, then landmark.

### Dynamic-world update order

`villageLife.update()` delegates to `DynamicWorldAI.update()`:

```text
1. SpawnManager.update()
2. NPCManager.update() and measure its duration
3. AnimalManager.update()
4. AmbientEventManager.update()
   a. audio/footstep cooldowns
   b. event scheduling or event visuals
   c. custom event extension
   d. smoke
   e. nearby wind targets
5. Smooth and publish debug metrics
```

### Journey state machine

```text
ready → playing → finishing → reached
                  └──────────→ cargo-lost (from playing)
reached/cargo-lost → playing (replay with next mission)
```

There is no pause state. Controls are disabled during `ready`, `finishing`, `reached`, and `cargo-lost`.

---

## 4. Input System

### Shared control state

`Controls` is the shared input endpoint. It owns:

- `enabled`
- `speedLevel` from `0` to `4`
- `reverseActive`
- Boolean `state.left` and `state.right`

Its public drive methods are:

- `increaseSpeedLevel(source)`
- `decreaseSpeedLevel(source)`, currently just an alias of `stopSpeedLevel()`
- `stopSpeedLevel(source)`
- `activateReverse(source)`

### Keyboard

| Keys | Event behavior | Final call/state |
|---|---|---|
| `W`, `ArrowUp` | On non-repeated `keydown`, raise one discrete forward level. `keyup` does nothing. | `increaseSpeedLevel("keyboard")` |
| `S`, `ArrowDown` | On non-repeated `keydown`, stop if currently at a forward level; otherwise enter reverse. `keyup` does nothing. | `stopSpeedLevel("keyboard")` or `activateReverse("keyboard")` |
| `A`, `ArrowLeft` | Held state. | `state.left = true/false` |
| `D`, `ArrowRight` | Held state. | `state.right = true/false` |

All game key defaults are prevented while the listener recognizes them. A window blur resets steering but does not change the latched speed level or reverse state.

### Touch/pointer controls

Buttons are selected through `[data-control]`, so mouse pointers use the same path as touch:

| Button | Pointer-down behavior |
|---|---|
| Forward | `increaseSpeedLevel("touch")` |
| Brake | `stopSpeedLevel("touch")` |
| Reverse | `activateReverse("touch")` |
| Left/right | Set held steering state until pointer up/cancel/lost capture. |

The drive buttons are taps that latch a state; releasing them only removes visual `.active`. Global `touchmove` and context-menu defaults are prevented.

### Microphone

The voice button toggles `VoiceControls.enable()`/`disable()`. Enabling:

1. Dynamically imports TensorFlow.js and `@tensorflow-models/speech-commands`.
2. Loads the local model and metadata.
3. Starts a `BROWSER_FFT` recognizer with 50% overlap.
4. Reads the analyser every `100 ms` to estimate mic RMS level.
5. Maps model scores for `Background Noise`, `START`, and `STOP`.
6. Sends scores through `CommandTriggerGate`.

The gate requires:

- Input level at least `2%`.
- Command confidence at least `0.75`.
- At least `0.10` margin above background.
- Two consecutive confirmations.
- A reset below `0.45` or a background result, plus `1200 ms` cooldown, before rearming.

The final call chain is:

```text
recognizer callback
→ VoiceControls.handlePrediction()
→ handleScores()
→ CommandTriggerGate.update()
→ applyDetectedLabel()
→ applyCommand()
→ START: controls.increaseSpeedLevel("voice-model")
→ STOP:  controls.decreaseSpeedLevel("voice-model")
         → controls.stopSpeedLevel("voice-model")
```

### Common downstream effects

Successful drive changes invoke `Controls.onSpeedLevelChange`, configured in `main.js`. That callback:

1. Maps `forward` to a forward driver reaction and both `brake`/`reverse` to a brake reaction.
2. Plays a driver command only when the source is not `voice-model`.
3. Calls `reactDriver()`, which triggers driver pose and rope/rein input animation.

Target speed is not pushed into movement directly. `updateMovement()` polls `controls.getTargetSpeed()` every frame.

### Duplicated or misleading input logic

- Keyboard brake and touch brake call `stopSpeedLevel()` directly, while voice STOP calls `decreaseSpeedLevel()`, which is only a wrapper around the same full-stop behavior.
- The method name `decreaseSpeedLevel()` suggests decrementing one level, but it resets to stopped.
- `onKey()` includes a `"brake"` branch, but the key map never produces `"brake"`; S/Down produce `"reverse"` and decide stop-versus-reverse inline.
- Reverse, brake, and forward-from-reverse contain overlapping state-reset behavior.
- Voice START uses the same level-by-level acceleration semantics as repeated keyboard/touch taps; a single START command does not mean “drive at a fixed normal speed.”

---

## 5. Movement System

### Speed model

The target-speed levels are:

| Level | Mode | Target |
|---:|---|---:|
| 0 | `STOPPED` | `0 km/h` |
| 1 | `SLOW` | `10 km/h` |
| 2 | `NORMAL` | `20 km/h` |
| 3 | `FAST` | `25 km/h` |
| 4 | `MAX` | `30 km/h` |
| reverse | `REVERSE` | `-4 km/h` |

`state.speed` is actual signed speed in metres per second. `controls.getTargetSpeed()` is the requested signed target.

### Acceleration and braking

The speed error is multiplied by `speedResponse = 0.92`, then clamped to:

- Maximum forward acceleration: `1.45 m/s²`.
- Maximum braking/deceleration: `-1.8 m/s²`.

`state.acceleration` is exponentially damped toward desired acceleration:

- Acceleration response: `2.4`.
- Braking response: `3.1`.

When speed is within `0.012 m/s` of target and acceleration is below `0.025 m/s²`, the values snap to target/zero. Crossing the target also snaps and clears acceleration. During mission finishing, speed damps toward zero with response `2.25`; completion occurs below `0.025 m/s`.

This is a kinematic interpolation model. There is no mass, engine force, wheel traction, rigid-body integration, slope, or external physics engine.

### Steering and movement

Steering is `(left ? 1 : 0) - (right ? 1 : 0)`. Heading changes only above `0.04 m/s`, scales with tuning `0.52`, speed ratio, direction, and delta, and reverses steering sense when reversing. Position advances along:

```text
headingVector = (sin(heading), 0, cos(heading))
moveDistance = speed × delta
```

Cart X is clamped to `[-125, 125]`, Z to `[-345, 495]`, and Y is fixed at `0.05`. The cart rotates around Y to its heading and damps a small Z lean while steering.

`state.distance` accumulates only positive projected travel while the journey is playing. Mission progress is independently derived from cart Z relative to the mission start, so sideways travel and backward motion do not increase mission progress.

### Collisions and surface response

There are two collision paths:

- `sceneryObstacleHit()` scans the houses/trees/rocks returned by `createWorld()`. A collision reverses speed at 12%, generates camera/cargo feedback, and blocks the proposed movement.
- `roadGameplay.checkImpact()` scans fixed road hazards. It marks each hazard hit once per mission, reduces speed by severity, and triggers bump, suspension, cargo, camera, and audio response. It does not block movement.

Road surface roughness starts at `0.08`, gains local influence from patches/potholes, and is multiplied by current mission roughness.

### Cart, bulls, and camera follow

The cart and both bulls are one `THREE.Group`; moving the cart root moves the complete rig. Bulls do not independently navigate or pull the cart. Their legs and bodies are animated from signed distance, absolute speed, and elapsed time.

The camera follows the cart root rather than a spring arm object. Speed increases chase distance by up to `2 m`; steering shifts the camera laterally; suspension, cargo instability, and collisions add procedural shake.

---

## 6. Audio System

### `AudioManager`

`AudioManager` owns a lazily created `AudioContext`, a master gain, decoded buffers, active loops, one-shot source tracking, mute state, cargo/world cue concurrency, and debug counters. Audio starts only from `startGame()`, which follows the Play user gesture. Mute state is stored under `sessionStorage["bailgadi-muted"]`.

### Loaded MP3 sounds

| Logical name | File | Use |
|---|---|---|
| `village` | `village-ambience.mp3` | Constant ambience loop at `0.18`. |
| `breathing` | `bull-breathing.mp3` | Loop; quieter as movement increases. |
| `hoof` | `bull-foot-walk.mp3` | Movement loop; volume and rate follow gait. |
| `cart` | `wooden-cart-running.mp3` | Movement loop; volume follows speed/roughness. |
| `bump` | `cart-bump.mp3` | Road impact or timed movement one-shot. |
| `chal` | `chal-chal.mp3` | Forward driver command one-shot. |
| `ruk` | `ruk-ruk.mp3` | Brake/reverse driver command one-shot. |

Assets load asynchronously after audio unlock. The four loops begin as soon as their buffers become available. A recent driver command can be queued for up to `2200 ms` while its buffer loads.

### Synthesized one-shots

`createCargoBuffers()` generates mono buffers for:

- `cargoCreak`
- `ropeTension`
- `potRattle`
- `woodMove`
- `cargoFail`

`playWorldCue()` creates oscillator-based cues for cow, buffalo, chicken, footsteps, farmer, dog, bell, distant cart, and announcement. These are procedural tones, not loaded samples.

### Looping and one-shot behavior

- Hoof rate uses `animationParts.gaitPlaybackRate`.
- Cart rate ranges from `0.78` to `1.13`.
- Random incidental bump timing depends on speed, steering, and roughness.
- Cargo cues run only while moving and below 98% stability, with type/tension selecting the sound.
- `ruk` has a `0.72 s` retrigger guard.
- Only one cargo source and one world source can play at a time.

### Driver and voice integration

Keyboard and touch drive changes play `chal`/`ruk`. Voice-originated changes deliberately skip `playDriverCommand()` in the shared callback, so recognized START/STOP does not currently play the corresponding driver recording. Voice recognition itself uses a separate TensorFlow-controlled audio stream/context and is not routed through `AudioManager`.

### Positional audio

There is no Three.js `AudioListener`, `PositionalAudio`, HRTF graph, or 3D listener transform. Ambient cues approximate position using:

- Distance attenuation: `1 / (1 + distance / 32)`.
- Stereo pan from world-space X offset divided by `30`, clamped to `±0.92`.
- An audible range of `85 m`.

Because pan is based on world X rather than camera/listener orientation, it is spatially suggestive rather than true positional audio.

---

## 7. Animation System

All animation is procedural. There are no skeletal rigs, imported clips, `AnimationMixer`s, or GLTF assets.

### Bulls

Each bull has an upper body, head, ears, four articulated legs, tail, and rope/rein anchors. `animateCart()`:

- Advances gait from absolute travelled distance.
- Blends walking in/out based on speed.
- Uses diagonal leg phases for swing, knee bend, and foot lift.
- Adds breathing and step lift to the upper body.
- Adds head bob, ear flick, and tail motion.
- Computes gait playback rate for hoof audio.

The two bulls use phase offsets so their movement is not perfectly synchronized.

### Driver

The driver is a procedural group with head, two arm groups, and hand anchors. Motion combines:

- Cart suspension counter-motion.
- Acceleration lean.
- Command reaction from `reactDriver()`.
- Cargo warning/critical worry.
- Periodic cargo look-back behavior.
- Rein pull during strong braking.
- Gait bob and subtle idle head movement.

`driverReinReaction` is set and damped but is not currently applied to a transform.

### Camera

Camera animation is exponential chase interpolation plus procedural steering offset, surface vibration, cargo-instability feedback, and short collision shake. There are no cutscenes or tween timelines.

### Suspension

Cart suspension combines:

- Speed-scaled sinusoidal motion.
- Gait phase.
- Sampled road roughness and roll.
- A decaying impact impulse.
- Acceleration pitch.

The sprung group contains the cart body, cargo, and driver; wheels/bulls remain outside it.

### Dust and particles

`DustSystem` uses a circular pool of `48` particles on coarse pointers or `72` otherwise. Spawn rate depends on travelled distance and speed. Particles originate at hoof or wheel anchors, drift, fade through vertex color, and are reused.

Ambient effects provide separate pooled visuals:

- 8 bird actors.
- 18 dust-gust points.
- 12 leaf meshes.
- 16 smoke points across two sources.

### Ropes and reins

There are two trace ropes with 10 segments each and two reins with 12 segments each. Each is represented by individual cylinder meshes sampled along a five-point Catmull-Rom curve. Every frame:

- World anchors are transformed into cart-root space.
- Sag, sway, road motion, suspension, speed, acceleration, braking, and command input determine curve points.
- Buffer positions and each cylinder transform are updated.
- Rope and rein tensions are damped toward calculated targets.

Forward/brake commands temporarily animate rein input and driver arms, with the source labelled `manual` or `voice`.

### Cargo

Cargo is a spring-like procedural transform over the active cargo group. Type-specific stiffness, damping, and movement multipliers affect X/Y offsets, pitch, and roll. Impacts inject vertical/roll velocity. This is not collision-based cargo simulation; the whole cargo type moves as one root group.

---

## 8. World System

### Road generation

The current landscape is runtime-generated in `procedural-world.js`. `WorldGenerator` creates a random 32-bit session seed unless a seed is supplied explicitly. A nine-slot `ChunkManager` pool keeps seven 80 m chunks visible: two behind the cart, the current chunk, and four ahead. A chunk slot is regenerated in place when it is acquired for a new longitudinal index. Hash-based generation makes a given `(seed, chunkIndex, salt)` repeatable within that session.

`RoadGenerator` rewrites a 24-segment strip geometry for every configured chunk. It blends boundary widths to avoid seams, applies two low-frequency global centerline waves, and optionally applies a local layout. The ten reported layouts are Straight, left/right curves, S-curve, fork-ready, narrow, wide, uphill, downhill, and uneven. Only the left/right/S layouts currently bend the centerline; fork/narrow/wide change width and uphill/downhill/uneven change small vertex heights. Thirty-two instanced wheel-track slots follow the computed centerline.

The generated road is visual only from the driving model’s perspective. `main.js` does not query `RoadGenerator.sampleRoadCenter()`, road width, or road height: the cart still moves in unconstrained world X/Z with fixed Y `0.05`, progress is global Z, and the camera/destination assume the original straight route.

### Villages and environment

`EnvironmentGenerator` assigns one of ten themes per chunk: wheat, rice, grassland, mango orchard, banyan area, small forest, pond, canal, village outskirts, or village centre. Each pooled chunk contains:

- Dynamic strip ground with blended vertex colors and a dynamic road.
- Instanced pools for tracks, trunks/crowns, crops, grass, bushes, rocks, houses/roofs, roadside props, pots, wood piles, signs, and event people.
- One optional water mesh.
- Twelve reusable village-detail meshes and fourteen reusable landmark meshes.

The per-chunk maxima are 26 trees, 110 crops, 72 grass clumps, 24 bushes, 18 rocks, 14 houses, 22 general props, 8 pots, 8 wood piles, 5 signs, and 20 event people. LOD 0 shows the configured counts, LOD 1 roughly halves them, and LOD 2 roughly quarters them; event people are hidden at LOD 2. Ground, road, water, village-detail meshes, and landmark meshes are not reduced by this count-based LOD.

`VillageGenerator` creates villages for outskirts/centre themes or an additional 11% hash chance. Villages contain 5–9 or 10–14 instanced houses plus a bitmask-selected subset of well, temple-like cone, shed, haystack, water tower, barn, and stall forms. Names are selected from eight predefined names. `LandmarkManager` places one landmark every eight chunks, cycling among banyan tree, windmill, old temple, river bridge, water tower, village gate, and ancient well.

The fixed `road-gameplay.js` destination arch, temple, and banyan remain at Z `480`, independently of the procedural village/landmark system.

### NPC and animal spawning

`environment-life.js` creates all actors up front:

- 13 villagers.
- 7 cows/buffaloes.
- 6 chickens.
- 4 static bicycles.
- 2 smoke sources.

`SpawnManager` toggles actor visibility/AI activity based on the cart’s distance from each actor’s home. The spawn radius is `112 m`; despawn radius is `145 m`. No new actor is allocated or repositioned during play.

This actor layer is separate from procedural chunks. Its initial placement is seeded from `WorldGenerator.seed`, but actors do not recycle with chunks, follow the generated road, or regenerate when `WorldGenerator.reseed()` changes the terrain seed.

### Obstacles

There are two obstacle collections:

- Ninety fixed collider records owned by the nine procedural chunk slots (ten per slot). At present only the first ten generated trees are eligible to populate them, and only if their absolute X is below `29`; generated rocks, houses, landmarks, props, water, and event people are not colliders. Recycling a slot rewrites its records.
- 14 fixed road hazards from Z `14` to `462`: patches, rocks, potholes, and logs.

Road hazards are data-driven in a local constant, are not aligned to procedural curves, and are not generated per mission. Their `hit` flags reset between missions. Static collision queries remain linear over all 90 chunk collider records; zero-radius inactive records are parked at `(10000, 10000)`.

### Procedural events, pooling, and reseeding

The procedural world has a second, purely visual event mechanism distinct from `AmbientEventManager`. Every `max(9, 14 - floor(difficulty × 0.55))` chunks it chooses one of six labels—wedding, harvesting, shepherd/goats, opposing cart, school children, or market—and represents every choice with the same instanced cylinder “people” mesh. These instances have no behavior or audio integration.

Chunk pooling is genuine preallocation: all nine chunk scene graphs, instanced buffers, detail meshes, landmark meshes, and 90 obstacle records are created once. `registerRegion()` stores custom definitions in a map, but the generation path never reads the map. `reseed()` invalidates all slots. It is automatically invoked when player Z falls more than 18 m between frames, which means the backwards teleport performed when replaying the next mission normally generates a new world.

### Destination and checkpoints

All missions finish at world Z `480`; longer mission distance moves the cart start farther backward. Mission checkpoints are based on remaining distance at `400`, `300`, `200`, and `100 m`, and display for `2100 ms`. They have no rewards or save state.

---

## 9. Mission System

### Current architecture

There is no `MissionManager`. Mission definitions and lifecycle functions live in `main.js`.

Five missions rotate in a fixed loop:

| Level | Mission | Cargo | Reward | Distance | Time limit | Roughness |
|---:|---|---|---:|---:|---:|---:|
| 1 | Rice Delivery | rice | 120 | 500 m | 240 s | 1.00 |
| 2 | Morning Milk Run | milk | 155 | 530 m | 255 s | 1.08 |
| 3 | Market Vegetables | vegetables | 185 | 555 m | 270 s | 1.15 |
| 4 | Timber Haul | wood | 220 | 585 m | 285 s | 1.23 |
| 5 | Clay Pot Delivery | clay | 280 | 620 m | 300 s | 1.32 |

After success or cargo failure, the replay button advances to the next mission. After level 5 it wraps to level 1.

### Cargo and difficulty

Mission `cargoType` selects the visible mesh group and the cargo configuration. Mission `level` becomes cargo difficulty. Difficulty scales damage by:

```text
0.94 + (difficulty - 1) × 0.09
```

Mission roughness separately multiplies sampled surface roughness.

Cargo stability is reduced by hard acceleration, hard braking, sharp steering, high-speed rough surfaces, and impacts. Smooth driving while moving can recover stability. Status bands are:

- Safe: `70–100`.
- Warning: `40–<70`.
- Critical: `10–<40`.
- Lost: `<10`; actual mission failure occurs only when stability reaches exactly `0`.

### Rewards and coins

Rewards are display-only metadata. There is no coin balance, reward award transaction, inventory, shop currency, or persistence.

### Failure and success conditions

- Success: cart progress reaches the configured mission distance, then the cart decelerates to almost zero.
- Failure: cargo stability reaches zero.

The time limit is not a failure condition. The UI counts down to `00:00` and clamps there, but gameplay continues indefinitely. There is no collision-health failure, off-road failure, NPC collision failure, or manual abandon action.

---

## 10. AI System

### Animals

`AnimalManager` manages large animals and chickens with lightweight state machines.

Large-animal states include idle, grazing, walking, crossing, looking, and scattering. Cows and buffaloes use different state probabilities and walk speeds. Nearby carts cause movement toward a safe roadside target. Heads, tails, and legs animate procedurally, and periodic cow/buffalo cues are requested.

Chicken behavior includes pecking, idle, crossing, looking, and fast scattering. Chickens also request periodic calls.

Animals do not pathfind around geometry. They move directly toward local waypoints and avoidance targets.

### Villagers

`NPCManager` cycles villagers through walking, carrying, talking, sitting, sweeping, field work, standing, and fetching water. Close carts temporarily switch villagers to avoidance; children can briefly run alongside a slow cart. Villager mesh parts, props, gait, gestures, and look direction are updated per state.

NPCs do not collide with the cart or static world, navigate a mesh, converse with the player, or contribute to mission state.

### Ambient events

`AmbientEventManager` schedules one of nine events after an initial `8–16 s`, runs it for `3.5–6.5 s`, then waits `9–23 s`:

- Birds Flying Away
- Dust Gust
- Leaves Blowing
- Dog Barking
- Cow Mooing
- Temple Bell
- Farmer Shouting
- Distant Cart
- Village Announcement

Visual pools support the first three; the rest request synthetic audio cues. Smoke and nearby wind animation update independently every frame.

### Spawn manager and object pooling

`SpawnManager` is a distance-based activation manager. It is called “pooling” in diagnostics, but it does not maintain free lists, recycle actor identities, or spawn new placements. Every villager/animal is created at startup and visibility is toggled with hysteresis.

Actual fixed-size reuse exists for cart dust, birds, ambient dust, leaves, and smoke. Static world props mostly remain present for the full session.

The procedural landscape independently implements a real nine-slot chunk pool and count-based LOD, but it does not pool or own the `DynamicWorldAI` villagers and animals.

### Extension hooks

The managers expose:

- `NPCManager.registerActivity(name, handler)`
- `AnimalManager.registerBehavior(name, handler)`
- `AmbientEventManager.registerEvent(name, handler)`

These accept custom handlers, but state selection arrays are hard-coded, so registering a new name alone does not make that state/event naturally selectable.

---

## 11. UI System

There is no UI framework or component class. `index.html` defines screens, `style.css` styles them, and `main.js`/`voice-controls.js` imperatively mutate DOM nodes.

### Start/loading screen

The start overlay contains the title, short instructions, keyboard hint, and Play button. It also functions as the only startup gate. There is no dedicated loading progress screen: world construction happens synchronously before the first render, while audio and voice assets load later on demand.

### HUD

The main HUD contains:

- Brand.
- Total forward distance.
- Remaining mission distance.
- Actual absolute speed and speed mode.
- Mission name.
- Cargo stability meter and status color.
- Reward text.
- countdown display.
- Journey progress bar.
- Voice and sound controls.

The objective’s textual version is visually hidden for accessibility.

### Mission/checkpoint UI

The central objective panel is the mission UI. A temporary checkpoint toast announces 400/300/200/100 metres remaining. There is no mission-selection, briefing, pause, map, inventory, or results breakdown screen.

### Voice UI

The voice button displays off/loading/listening/START/STOP states and a status message. Unsupported browsers disable it. Microphone permission and load failures are surfaced in the message.

### Debug panel

The HTML contains extensive voice, movement, cargo, AI, and procedural-world diagnostics. Procedural fields report current chunk/layout, active chunk count, pool size, theme, village, landmark, approximate generated-object count, LOD, previous-frame draw calls, and smoothed FPS. `worldEvent` exists in the world debug object but has no HTML field. `VOICE_DEBUG_ENABLED` is `true`, but CSS sets `.voice-debug { display: none; }`; toggling the `hidden` class does not override `display: none`, so the debug panel is not visibly available through the current stylesheet.

In development, `updateHud()` also serializes a large state snapshot into `document.body.dataset.gameState` every frame. `window.__bailgadi` exposes `getState()` and `start()` for external testing. URL parameters provide development-only movement/audio/voice test paths.

### Game over / success

One finish overlay is reused for:

- Successful “Village Reached” results.
- “Cargo Damaged” failure.

It changes eyebrow, title, copy, and replay label. It always advances to the next mission. There is no score, earned-coins update, retry-current-mission option, or time-out screen.

### Responsive/touch UI

Touch controls appear for coarse pointers or widths at/below `800 px`. Additional breakpoints at `600 px`, `380 px`, and height `620 px` resize HUD and buttons. Safe-area environment variables are used for notched devices.

---

## 12. Configuration

Configuration is currently distributed across module-level constants and inline literals rather than a central configuration object.

### Movement and camera

| Value | Current setting | Location |
|---|---:|---|
| Forward maximum | `30 km/h` | `controls.js` |
| Reverse maximum | `4 km/h` | `controls.js` |
| Speed levels | `0, 10, 20, 25, 30 km/h` | `controls.js` |
| Acceleration | `1.45 m/s²` | `main.js` tuning |
| Braking | `1.8 m/s²` | `main.js` tuning |
| Speed error response | `0.92` | `main.js` tuning |
| Acceleration/braking response | `2.4 / 3.1` | `main.js` tuning |
| Steering | `0.52` | `main.js` tuning |
| World X clamp | `±125` | `main.js` |
| World Z clamp | `-345..495` | `main.js` |
| Camera speed pullback | `2` | `main.js` tuning |
| Camera desktop distance/height | `11.8 / 6.35` | `main.js` |
| Camera mobile landscape | `12.2 / 6.65` | `main.js` |
| Camera mobile portrait | `13.1 / 7.15` | `main.js` |
| Camera FOV | `52 / 55 / 58` | `main.js` |
| Camera near/far | `0.1 / 450` | `main.js` |

Animation contains additional local response constants for gait, suspension, shake, rope tension, and driver pose. They are not externally configurable.

### Mission/cargo

Mission distance, reward, time, cargo, roughness, and level are listed in Section 9. Cargo type configuration is:

| Cargo | Fragility | Recovery | Movement | Stiffness | Damping |
|---|---:|---:|---:|---:|---:|
| Rice | 0.72 | 1.12 | 0.58 | 31 | 10.5 |
| Milk | 0.96 | 1.00 | 0.88 | 27 | 9.4 |
| Clay | 1.34 | 0.82 | 1.12 | 23 | 8.2 |
| Vegetables | 0.90 | 1.05 | 1.18 | 25 | 8.8 |
| Wood | 0.82 | 0.92 | 0.70 | 19 | 10.8 |

Key stability thresholds include acceleration `0.78`, braking `0.88`, turn strength `0.42`, high-speed ratio `0.78`, safe/warning/critical bands `70/40/10`, smooth-driving acceleration/turn/roughness limits `0.48/0.22/0.3`, and recovery `0.72 × cargo recovery` per second.

### Rendering, lighting, and fog

| Value | Current setting |
|---|---|
| Clear/background color | `0xa4cde3` |
| Fog | same color, near `92`, far `300` |
| Pixel ratio caps | desktop `2`, mobile `1.5` |
| Tone mapping/exposure | ACES Filmic / `1.05` |
| Sun color/intensity | `0xffdfaa` / `3.05` |
| Hemisphere sky/ground/intensity | `0xd8e9ef` / `0x62713d` / `1.82` |
| Shadow maps | `1024²` mobile, `2048²` desktop |
| Shadow camera | `±48`, near `1`, far `170` |
| Shadow bias | `-0.00025` |

### World, AI, and timers

| Value | Current setting |
|---|---|
| World random seed | Random 32-bit session seed; constructor can accept an explicit seed |
| Chunk length | `80 m` |
| Active chunks / pool slots | `7 / 9` |
| Active range | `2` behind, current, `4` ahead |
| Ground half-width | `135 m` |
| Road/ground segments per chunk | `24 / 8` |
| Base boundary road width | `15.5 m ± 0.9 m`, narrowed `0.28 m` per difficulty above 1 |
| Procedural obstacle records | `10` per pool slot, `90` total |
| Chunk LOD distance | LOD 0 within `1`, LOD 1 within `3`, otherwise LOD 2 |
| Landmark cadence | Every `8` chunks |
| Procedural event cadence | `max(9, 14 - floor(difficulty × 0.55))` chunks |
| Backward-jump reseed threshold | `18 m` |
| Procedural per-chunk maxima | trees `26`, crops `110`, grass `72`, bushes `24`, rocks `18`, houses `14`, props `22`, pots/wood `8`, signs `5`, event people `20` |
| Mission destination Z | `480` |
| Checkpoints | `400, 300, 200, 100 m` |
| Checkpoint display | `2100 ms` |
| Spawn/despawn radius | `112 / 145 m` |
| Road/safe edge | `10.5 / 13.5 m` |
| Fast-cart AI threshold | `2.15 m/s` |
| Ambient initial wait | `8–16 s` |
| Ambient duration | `3.5–6.5 s` |
| Ambient repeat wait | `9–23 s` |
| World-audio range | `85 m` |
| World-audio cooldown | `1.8 s` footsteps, otherwise `3.4 s` |
| Hint duration | `5600 ms` |
| Frame delta cap | `0.05 s` |
| Movement debug refresh | `0.1 s` |

### Voice thresholds

| Value | Setting |
|---|---:|
| Trigger threshold | `0.75` |
| Reset threshold | `0.45` |
| Minimum background margin | `0.10` |
| Minimum mic input | `2%` |
| Confirmations | `2` |
| Cooldown | `1200 ms` |
| Recognizer overlap | `0.5` |
| Mic meter interval | `100 ms` |
| Voice status duration | `1100 ms` |
| Trigger notice | `1200 ms` |

### Audio volumes

Master is `1.0`. Named base gains are: village `0.18`, hoof `0.45`, cart `0.28`, breathing `0.12`, bump `0.30`, chal `0.55`, ruk `0.90`, cargo creak `0.20`, rope tension `0.18`, pot rattle `0.22`, wood move `0.22`, and cargo failure `0.70`.

### Particle pools

- Cart dust: `48` coarse-pointer / `72` normal.
- Birds: `8`.
- Ambient dust: `18`.
- Leaves: `12`.
- Smoke: `8` per source × `2`.
- Rope/rein segments: `2×10` and `2×12`.

There are many additional mesh dimensions, colors, animation frequencies, placement arrays, and state probabilities embedded directly in construction/update functions. They are visual tuning literals rather than a coherent public configuration surface.

---

## 13. Performance Analysis

No profiler capture is included in the repository, so these are code-level findings rather than measured frame timings.

### Existing strengths

- Procedural trees, crops, tracks, grass, bushes, rocks, houses, roofs, props, pots, wood, signs, and event figures use shared geometry/materials and `InstancedMesh`.
- Nine world chunks are preallocated and recycled; seven are visible, and instance-count LOD reduces distant chunk content.
- Geometry/material constants are reused for many environment-life actors.
- Dust and ambient effects use fixed pools and typed buffers.
- Frame delta is capped.
- Pixel ratio and shadow resolution are reduced for small viewports.
- AI actors outside the activation radius are skipped.
- Wind targets outside their individual ranges are skipped.
- HUD progress/stability transforms are bucketed to reduce two style writes.

### Large startup cost and memory

- All nine chunk graphs and their maximum-capacity instance buffers, 234 detail/landmark mesh objects, all fixed village-life actors, destination scenery, and the cart are constructed synchronously before the first frame. Pooling bounds later allocations but front-loads them.
- The separate environment-life actors, destination scenery, cart parts, and rope segments still add many individual drawables.
- The voice weights are approximately 5.5 MB and TensorFlow dependencies are substantial, although they are correctly lazy-loaded only when voice is enabled.
- All seven MP3s decode into in-memory audio buffers after Play; decoded PCM is larger than the compressed files.
- There is no resource disposal path for geometries, materials, audio buffers, intervals, or listeners.

### Expensive per-frame work

- `sceneryObstacleHit()` linearly scans all 90 procedural collider records while moving, including parked inactive records.
- `roadGameplay.checkImpact()` and `sampleSurface()` linearly scan the road-hazard list.
- SpawnManager scans all actors, then NPC and animal managers scan their arrays again.
- `WorldGenerator.update()` runs every frame. LOD loops all nine slots every frame; regeneration rewrites geometry positions/colors, recomputes normals and bounding spheres, fills instance matrices, and recomputes several instance bounds when crossing a chunk boundary or changing mission difficulty.
- Every active rope/rein segment receives a position, scale, and quaternion update each frame: 44 individual cylinder meshes plus four curve samples.
- Smoke attributes, dust attributes, and active ambient particle transforms are updated on the CPU.
- `camera.lookAt()` and repeated scene-graph world/local anchor conversions occur each frame.
- `scene.add(sun.target)` is called every camera update even though the target is already in the scene.
- Several HUD text nodes are assigned every frame even when their text has not changed.
- In development, a large object is created, rounded, JSON-serialized, and assigned to a dataset every frame.

### Allocations

- `DustSystem.spawn()` allocates two new `Vector3`s for every spawned particle.
- Audio one-shots and world cues create Web Audio source/gain/oscillator/panner nodes per event, which is normal but can create GC pressure.
- Development state serialization creates arrays and objects every frame.
- Most hot movement/camera paths correctly reuse module-level vectors.

### Draw calls and shadows

- Each visible procedural chunk can contribute roughly 17 batched drawables plus visible pooled village/landmark detail meshes. Instancing substantially reduces landscape calls, but the cart, destination, fixed NPC/animal hierarchies, rope cylinders, and detail meshes still add many calls.
- The cart traversal enables shadow casting/receiving on every mesh, including small decorative parts, rope cylinders, and transparent contact-shadow meshes.
- Many procedural instance sets and all village/landmark detail pool meshes cast shadows. Count LOD reduces instances but does not independently disable far-chunk shadow casting.
- `renderer.info.render.calls` is surfaced as a useful diagnostic, but it is sampled before the current render and therefore reports the previous frame.

### Potential future optimization opportunities

Do not optimize without profiling first. Likely candidates are:

1. Measure CPU update, renderer draw calls, triangles, shadow render cost, and GC on mobile hardware.
2. Query only active/current-neighbor chunk colliders and spatially partition fixed road hazards.
3. Replace rope cylinder chains with a lower-draw-call mesh or shader representation.
4. Extend the existing LOD to pooled detail/landmark meshes and shadow policy, and validate whether seven visible chunks are necessary for the camera/fog range.
5. Batch/instance repeated destination, villager, and animal parts where animation constraints allow.
6. Reuse dust spawn vectors and cache unchanged HUD strings.
7. Gate debug serialization and diagnostic DOM entirely behind an explicit debug flag.
8. Consider pausing nonessential updates when hidden, before Play, or after results.

---

## 14. Extension Points

### Rendering and weather

Add a `WorldEnvironment`/`WeatherSystem` that owns fog, sky/background, light intensity/color, wind multiplier, precipitation, and surface modifiers. It should expose a small frame input and should not directly read mission DOM. Weather can feed `roadSurface`, cargo risk, audio ambience, and AI through explicit state.

### Day/night

Create a time-of-day controller over sun transform, hemisphere colors, fog, exposure, emissive props, and ambient audio. Avoid embedding time rules in `updateCamera()`, where sun following currently lives.

### Economy and shops

Introduce a persistent player/profile model with balance, owned upgrades, and transaction methods. Mission completion should emit a result event consumed by the economy; the mission definition’s `reward` should not itself mutate UI or storage. Shops should operate against that model rather than `main.js` globals.

### Mission expansion

Extract mission definitions and lifecycle into a `MissionManager` with explicit start, progress, checkpoint, success, failure, reward, and retry events. Conditions should be composable so time limits, fragile cargo, destination zones, and optional objectives do not become more branches in `main.js`.

### Bull/cart upgrades

Define data-driven cart/bull stats—acceleration, braking, max speed, stability, suspension, stamina—and pass a resolved vehicle specification to movement, cargo, animation, and audio. Visual equipment should attach through named anchors created by `createBullockCart()`.

### Saving

Persist only serializable domain state: mission unlocks, balance, settings, upgrades, and perhaps active-run snapshot. Do not serialize Three.js objects. Add a versioned save adapter with migration and explicit local/cloud implementations.

### Procedural/streamed world

Build on the existing `WorldGenerator`/`ChunkManager` boundary rather than adding a second streamer. First make chunk descriptors explicit and make the seed a serializable run property. Then connect generated road center/width/height to driving, fixed hazards, destination placement, collision registration, AI spawn points, and mission progress. Give `registerRegion()` a real selection path and let `SpawnManager` acquire/release actors from chunk spawn descriptors rather than managing a fixed cast.

### Multiplayer

First separate deterministic simulation/domain state from rendering. Network snapshots should represent vehicle pose, inputs, mission state, and actor authority; DOM, Three.js objects, audio nodes, and procedural animation should remain client-side consumers. The current global mutable state and frame-coupled mission logic are not suitable network boundaries.

### AI

The existing `registerActivity`, `registerBehavior`, and `registerEvent` methods are useful handler hooks. Add corresponding registries/weighted selectors so registered states can be selected without editing hard-coded arrays. A navigation layer or lane/road graph should mediate movement before adding more complex NPC behavior.

### Audio

Retain `AudioManager` as the central mixer but add buses (music, ambience, vehicle, voice, UI), listener-oriented spatialization, concurrency policies per cue, and lifecycle cleanup. New systems should request semantic cues rather than construct Web Audio nodes themselves.

### UI

Introduce a small state-to-view boundary: UI should consume immutable view models or events instead of reaching into all manager fields every frame. New screens—pause, mission select, shop, settings—should be routed through a screen/state controller.

---

## 15. Technical Debt

### Large and tightly coupled files

- `main.js` owns rendering setup, session state, missions, movement, collisions, camera, HUD, lifecycle, tests, and global debug hooks.
- `procedural-world.js` is over 1,200 lines and combines hashing/configuration, geometry/material ownership, chunk allocation, road generation, environment content, villages, landmarks, LOD, reseeding, collision records, and diagnostics.
- `cart.js` combines model construction, material definitions, cargo meshes, animation, suspension, and driver reactions.
- `dynamic-world-ai.js` contains spawning, NPCs, animals, ambient effects, audio requests, and diagnostics.
- UI relies on many module-level DOM references and assumes every selector exists.

### Duplicated/distributed logic

- Damping formulas recur in several files.
- Brake/stop/reverse decisions are split across keyboard, touch, voice, and `Controls`.
- Cargo/road impact state is passed through several mutable fields.
- Configuration is spread among constants and inline numbers.
- CSS contains repeated declarations such as duplicate `box-shadow`, `gap`, and width entries.

### Unused or incomplete state/code

- `previousPosition` is copied each frame but never read.
- `driverReinReaction` is written, damped, and exposed to debug but never affects animation.
- `stepContact` is calculated but has no gameplay/audio consumer.
- Cargo animation’s `impactImpulse` is stored and decayed but not directly read after injection.
- `environment-life.js` contains unused `squaredDistanceXZ()` and `turnToward()` helpers.
- Villager `walkAxis`/`walkRange` and some original behavior fields are not used by `DynamicWorldAI`.
- The extension registries cannot by themselves place new state names into selection.
- `RoadGenerator.sampleRoadCenter()` and `WorldGenerator.registerRegion()` are exposed but have no current consumer.
- `ChunkManager.scene`, `ChunkManager.seed`, `ChunkManager.obstacles`, and `WorldGenerator.regions` are retained without participating in normal updates after construction.
- Procedural `debug.worldEvent` is updated but is not rendered in the HTML debug panel.
- Empty project scaffolding directories imply architecture that the tracked source does not use.

### Missing abstractions

- No `Game`/application lifecycle object or teardown path.
- No `MissionManager`, `CameraManager`, `Renderer`, collision/spatial index, event bus, persistence service, settings model, or UI state store.
- “Cargo physics” is coupled to animation parts and mission failure.
- `World` creation returns a loose object rather than an owned lifecycle boundary.
- The procedural world has internal ownership, but no shared world-query interface connects its road, terrain, hazards, destination, mission, and AI layers.
- AI audio depends directly on an `AudioManager` reference.

### Potential bugs and behavioral gaps

- `state.elapsed` advances before Play, and `startGame()` does not reset it. The first mission’s displayed countdown therefore includes time spent on the start screen.
- The countdown reaching zero does not fail a mission.
- Rewards/coins are never awarded or stored.
- Voice START/STOP does not play driver command audio because voice-model sources are excluded.
- The debug flag is true, but CSS permanently hides the debug panel with `display: none`.
- “Decrease speed” stops completely instead of decrementing one level.
- A forward input while reversing first cancels reverse and leaves the cart stopped; another forward input is required to move.
- Road hazards begin at Z `14`, while longer missions start as far back as Z `-140`, leaving a long initial segment without authored road hazards.
- The road can visibly curve, narrow, rise, or fall, but vehicle movement, cart height, mission progress, camera targeting, fixed hazards, and destination placement remain based on a flat straight global-Z route. Hazards can therefore appear off the generated road and the cart can ignore elevation/road boundaries.
- Only a subset of generated trees receives collision records. Generated rocks, houses, props, villages, landmarks, water, and visual event crowds are non-colliding despite their appearance.
- Procedural world events are labels plus static cylinder instances; the six names do not produce distinct actors or behavior.
- Replaying a mission teleports the cart backward by more than the `18 m` reseed threshold, so the next animation frame changes the entire procedural seed. The fixed village-life population does not reseed with it.
- The world seed is random and not included in `window.__bailgadi.getState()` or persistent state, so a run cannot currently be reproduced from diagnostics.
- `WorldGenerator` receives `renderer.info.render.calls` before rendering, so the displayed draw-call count is one frame old.
- Dynamic actors can move through scenery and the cart because no collision system connects them.
- Stereo world-cue pan ignores camera orientation.
- `startGame()` has no guard against repeated programmatic calls.
- Shadow resolution does not adapt after a desktop/mobile resize threshold change.
- Animation/update work continues behind start and finish overlays.
- No system unregisters window/document listeners, clears all timers, stops audio, or disposes GPU resources.

---

## 16. Improvement Suggestions

These are architectural recommendations only.

1. Establish an application root that owns `init`, `startMission`, `pause`, `finish`, `reset`, `resize`, `update`, `render`, and `dispose`.
2. Extract domain state from `main.js`: vehicle simulation, mission progression, collision queries, camera, and UI presentation should have explicit inputs/outputs.
3. Centralize tuning in typed/frozen configuration grouped by rendering, vehicle, cargo, mission, AI, audio, and UI.
4. Introduce an event layer for control changes, impacts, checkpoints, cargo status, mission results, and audio requests. Keep high-frequency continuous state as direct update inputs.
5. Make missions data-driven and move rewards, timers, failure policies, and progression into a dedicated manager.
6. Split procedural asset construction from per-frame animation so visual variants can be introduced without changing simulation logic.
7. Promote the existing chunk system into a complete world-query interface: road sampling, terrain height, collider registration, destination/region lookup, and deterministic spawn descriptors.
8. Keep the existing visual chunk pool, clarify the separate AI “pooling” terminology, and provide acquire/release actor pools driven by chunk spawn descriptors.
9. Add a UI controller or small reactive store; update DOM only on changed values/events.
10. Add unit tests for Controls, command gating, cargo stability, mission state, and collision math, plus a browser smoke test for startup and resize.
11. Add profiling targets and performance budgets for mobile draw calls, shadow casters, frame time, memory, and initial load.
12. Add explicit cleanup paths for timers, microphone recognition, Web Audio sources, event listeners, geometries, and materials.

Recommended extraction order is deliberately incremental: preserve current behavior, add characterization tests, then move one responsibility at a time behind stable interfaces.

---

## 17. File Dependency Map

### Static import graph

```text
index.html
└── src/main.js
    ├── three
    ├── src/style.css
    ├── src/audio-manager.js
    │   └── src/controls.js (MAX_CART_SPEED)
    ├── src/cargo-physics-manager.js
    │   └── three
    ├── src/controls.js
    ├── src/cart.js
    │   ├── three
    │   ├── src/controls.js (MAX_CART_SPEED)
    │   └── src/rope-rein-animation.js
    │       └── three
    ├── src/dust-system.js
    │   ├── three
    │   └── src/controls.js (MAX_CART_SPEED)
    ├── src/road-gameplay.js
    │   └── three
    ├── src/voice-controls.js
    │   ├── @tensorflow/tfjs (dynamic)
    │   └── @tensorflow-models/speech-commands (dynamic)
    └── src/world.js
        ├── three
        ├── src/procedural-world.js
        │   └── three
        └── src/environment-life.js
            ├── three
            └── src/dynamic-world-ai.js
                └── three
```

### Runtime ownership/dependency graph

```text
main.js
├── Scene / Camera / Renderer
├── World result
│   ├── directional sun
│   ├── WorldGenerator
│   │   ├── 90 pooled scenery collision descriptors ──→ main movement query
│   │   ├── RoadGenerator
│   │   ├── EnvironmentGenerator
│   │   ├── VillageGenerator
│   │   ├── LandmarkManager
│   │   └── ChunkManager
│   │       └── 9 chunk slots / 7 visible / count-based LOD
│   └── villageLife facade
│       └── DynamicWorldAI
│           ├── SpawnManager
│           ├── NPCManager
│           ├── AnimalManager
│           └── AmbientEventManager ──→ AudioManager
├── RoadGameplay
│   ├── hazard meshes
│   ├── impact query
│   └── surface sampler
├── BullockCart
│   ├── animationParts
│   └── RopeReinAnimation state
├── CargoPhysicsManager
│   ├── CargoStabilityManager
│   └── CargoAnimationManager ──→ animationParts
├── Controls
│   └── drive-change callback
│       ├── AudioManager
│       └── cart.reactDriver()
├── VoiceControls ──→ Controls
├── DustSystem
├── AudioManager
└── DOM UI
```

### Deployment graph

```text
vite.config.ts
└── build/sites-vite-plugin.ts
    ├── .openai/hosting.json → dist/.openai/hosting.json
    ├── drizzle/ (if present) → dist/.openai/drizzle/
    └── worker/index.js → dist/server/index.js

worker/index.js
└── env.ASSETS.fetch(request)
```

### Coupling observations

- `main.js` is the only file that knows nearly every subsystem.
- `controls.js` is also imported as a constants module by cart, dust, and audio.
- Cargo animation mutates fields later consumed by cart animation.
- AI reaches audio through a setter on the village-life facade.
- `world.js` composes two parallel environment layers: the pooled procedural landscape and the fixed `DynamicWorldAI` cast.
- `road-gameplay.js` remains a third world-content layer and does not depend on procedural road geometry.
- UI is not imported as a module; the DOM is a global dependency of main, controls, and voice controls.

---

## 18. Final Summary

### Subsystem ratings

Ratings reflect the current prototype architecture, not visual charm or future potential.

| Subsystem | Rating | Rationale |
|---|---:|---|
| Rendering | 7/10 | Sensible Three.js setup, mobile pixel/shadow scaling, extensive instancing, chunk LOD, fog, and strong procedural presentation; no lifecycle/post-processing boundary or measured budget. |
| Architecture | 5/10 | Files provide meaningful separation, but `main.js`, cart, and AI remain large and state is coupled through mutable objects. |
| Performance | 7/10 | Genuine chunk pooling, broad instancing, count LOD, actor activation, and capped quality are solid; synchronous maximum-capacity setup, shadows, CPU rope work, linear scans, and absent profiling keep risk material. |
| Input | 7/10 | Keyboard, pointer/touch, and learned voice input converge on one Controls object; naming/stop semantics and duplicated brake/reverse logic need clarification. |
| Audio | 7/10 | Robust unlock/loading, loops, one-shots, mute persistence, synthetic cues, and movement integration; spatialization and bus/concurrency architecture are limited. |
| Animation | 8/10 | Rich procedural bull, cart, suspension, cargo, driver, rope, dust, and ambient animation with no external assets; tightly coupled and relatively CPU-heavy. |
| World | 7/10 | Rich seeded chunk streaming, themes, villages, landmarks, events, LOD, and active life; the road/world generator is not yet integrated with vehicle physics, hazards, missions, destination, or AI placement. |
| UI | 6/10 | Complete responsive core screens and accessibility touches; imperative updates, hidden debug UI, and absent pause/settings/selection flows limit extensibility. |
| Scalability | 6/10 | The fixed chunk pool and instanced content create a useful world scale boundary, but hard-coded missions/states, parallel world layers, linear collision scans, and central orchestration still limit growth. |
| Maintainability | 5/10 | Names are generally clear and systems are readable, but there are no tests, several oversized files, distributed tuning, unused state, and no teardown contracts. |

### Recommended roadmap order

1. **Characterize existing behavior with tests and profiling.** Lock down controls, cargo rules, mission progression, voice gating, startup, and representative frame metrics before structural changes.
2. **Extract lifecycle and configuration.** Create a game/application root and central typed configuration without changing behavior.
3. **Extract mission and vehicle simulation.** Resolve timer/reward/failure semantics and separate movement/domain state from Three.js transforms.
4. **Introduce events and UI state boundaries.** Decouple audio, HUD, results, and input feedback from direct cross-system mutation.
5. **Complete the procedural-world boundary.** Connect the existing chunks and LOD to road/height queries, hazards, destination/regions, colliders, mission progress, and AI spawn ownership; make seeds reproducible.
6. **Add persistence and economy.** Versioned saves, coins, rewards, upgrades, and shops should follow stable mission/player models.
7. **Add environment progression.** Day/night and weather can then feed rendering, surfaces, AI, audio, and missions through explicit interfaces.
8. **Expand content and AI.** Add missions, villages, obstacles, actors, and ambient behaviors through registries/data rather than new main-loop branches.
9. **Optimize from measurements.** Batch meshes, reduce shadow work, revise ropes, and tune update cadence according to actual target-device traces.
10. **Consider multiplayer last.** Only after simulation state, ownership, serialization, world streaming, and deterministic boundaries are established.

The current project is a capable, visually detailed prototype with especially strong procedural animation, atmosphere, and a promising chunk-pooling foundation. Its best next step is to preserve current behavior while connecting that foundation to gameplay and creating clear lifecycle, mission, simulation, world-query, and UI boundaries that future features can safely use.
