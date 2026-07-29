# Bailgadi Master Development Roadmap

## Product direction

**Six-month objective:** turn Bailgadi from a beautiful technical prototype into a small, memorable delivery game with satisfying handling, meaningful cargo decisions, a warm village identity, and enough progression to sustain 20–40 hours without pretending to be an infinite simulator.

**Positioning:** “A peaceful but skillful bullock-cart journey through a living rural India.”

**Core fantasy:** care for two bulls, prepare a cart, accept work from villages, read the road and weather, protect the load, and slowly become the most trusted driver in the region.

**Three design pillars**

1. **The road has character.** Terrain, weather, cargo, and animal stamina create readable driving decisions.
2. **Every delivery helps someone.** Villagers, destinations, reputation, and visible change give missions human meaning.
3. **Progress is personal, not predatory.** Bulls, cart, driver, cosmetics, collections, and routes grow through play; spending never buys competitive power.

**Non-goals for the next six months**

- No multiplayer.
- No giant seamless open world.
- No realistic economic simulation.
- No combat, police chase, endless-runner conversion, or high-speed arcade redesign.
- No live-service obligation before retention, content cadence, analytics, and operations are proven.
- No paid power, energy timers, loot boxes, or purchases that bypass the game’s central mastery loop.

**Recommended production assumption:** a small team of 3–6 people. If the team is smaller, ship through Phase 4 and treat Phases 5–6 as post-launch. Content scope must be reduced before quality scope.

---

# PART 1 — Current Project Assessment

Scores measure readiness as a commercial game today, not the talent visible in the prototype.

| Area | Score | Assessment |
|---|---:|---|
| Gameplay | 4/10 | The player can accelerate, reverse, steer, hit hazards, protect cargo, pass checkpoints, and finish missions. That is a valid loop, but the generated road does not yet govern movement, terrain has no physical meaning, destinations are fixed, timers do not fail, and most decisions reduce to holding a pace and avoiding visible objects. |
| Fun | 5/10 | The cart has charm, tactile suspension, pleasant speed changes, and reactive cargo. The first few minutes can feel delightful. Fun plateaus quickly because mission differences are mostly cargo numbers, distance, and roughness multipliers rather than new situations or choices. |
| Replayability | 3/10 | Five missions rotate, the landscape reseeds, and cargo types differ. There is no mission selection, score grade, progression, rewards, unlocks, route ownership, collections, daily goals, or persistent reason to replay a completed delivery. |
| Graphics | 7/10 | The low-poly rural art direction is coherent and distinctive. Procedural themes, villages, landmarks, fog, warm lighting, destination scenery, and readable silhouettes provide a strong visual identity. Repetition, simplistic event figures, road/content misalignment, and limited environmental transitions keep it below production quality. |
| Animation | 8/10 | Procedural bulls, articulated gait, ears, tails, driver pose, wheels, suspension, cargo springs, dust, smoke, ambient life, ropes, and reins are the project’s strongest feature. The main weakness is that visual motion is not grounded in terrain or a clean simulation contract, which can cause sliding and disconnected reactions. |
| Audio | 7/10 | The game has ambience, bull breathing/hoof loops, wooden cart motion, impacts, driver calls, cargo cues, mute persistence, and simple spatial ambient sounds. Missing music, region-aware ambience, mission feedback, audio buses, real listener orientation, and broader recordings limit emotional range. |
| Controls | 7/10 | Keyboard and touch converge on a shared state model and feel easy to learn. Discrete pace levels suit the fantasy. Brake/decrease semantics are confusing, bindings are fixed, there is no controller support or pause/focus policy, and generated road geometry does not inform steering. |
| Voice Control | 6/10 | A custom local TensorFlow model, microphone meter, confidence gate, cooldown, and shared Controls integration are ambitious and differentiated. It supports only START/STOP, requires browser permission and model loading, lacks settings/localization, can remain active behind result screens, and needs extensive device/noise testing. |
| UI | 6/10 | The start screen, responsive HUD, cargo stability, mission panel, voice/audio controls, checkpoint toast, touch controls, and result overlay are visually coherent. There is no tutorial flow, pause/settings, mission selection, progression, map, accessibility menu, detailed results, or visible debug control. |
| Performance | 7/10 | Instancing, chunk pooling, LOD counts, particle pools, capped pixel ratio, mobile shadow scaling, and actor activation show good instincts. The project lacks measured budgets; synchronous allocation, shadow-heavy meshes, CPU rope updates, linear scans, per-frame DOM/debug work, and voice/audio memory remain risks. |
| Architecture | 5/10 | Files separate important concerns, and the procedural world has real internal structure. `main.js` still owns movement, missions, camera, UI, lifecycle, collision orchestration, and tests. Three parallel world layers—procedural scenery, fixed RoadGameplay, fixed EnvironmentLife—are not integrated. |
| Scalability | 6/10 | Nine pooled chunks, instanced content, deterministic hash generation, and AI activation create a useful foundation. Hard-coded missions, fixed actors/hazards, global mutable state, loose shared animation data, and absent save/economy/content pipelines will resist growth. |
| Maintainability | 5/10 | Naming is generally clear and the current systems are understandable. There are no automated tests, no lifecycle/disposal boundary, distributed tuning, large files, implicit object schemas, incomplete extension hooks, and several known behavioral gaps. |
| Mobile Experience | 6/10 | Touch controls, coarse-pointer particle reduction, lower pixel/shadow quality, safe-area CSS, and responsive layouts are present. Missing device profiling, haptics, battery/thermal budgets, orientation policy, accessibility sizing, store packaging, interruption handling, and broad handset testing prevent release confidence. |
| Immersion | 7/10 | Bulls, reins, cargo, cart creaks, dust, villagers, animals, smoke, landmarks, and a warm rural setting create a strong sense of place. Immersion breaks when the cart ignores curved/elevated roads, actors pass through scenery, weather/time never change, destinations have no social context, and the world does not remember the player. |

## Overall assessment

**Current product maturity: 5.8/10 prototype; 3.5/10 release readiness.**

Bailgadi already has what many prototypes never find: identity. The risk is spending six months adding disconnected content around a weak gameplay spine. The first half of development must integrate the road, vehicle, cargo, mission, and result loop. Progression, economy, and live content should be layered only after a single delivery is consistently satisfying.

---

# PART 2 — Comparison Against Successful Games

These games are references, not templates. Bailgadi’s opportunity is the intersection of relaxed travel, physical delivery, village attachment, and culturally specific atmosphere.

## Euro Truck Simulator 2

SCS presents a flexible personal career in which distance earns experience, skills unlock better jobs, trucks are deeply customized, and ownership expands into company management across a large changing landscape. [Official ETS2 overview](https://eurotrucksimulator2.com/about.php)

**Why it stays engaging**

- A calm, repeatable delivery ritual with clear start, journey, and arrival.
- Continuous competence growth: driving skill, route knowledge, parking, and planning.
- Strong ownership fantasy: first truck, customization, garages, staff, and company.
- Long roads create “podcast game” relaxation while jobs still provide purpose.
- New regions and cargo create variety without replacing the core controls.

**What Bailgadi should borrow**

- A mission board with route, distance, cargo fragility, time pressure, weather, and reward.
- XP specializations such as fragile cargo, monsoon driving, night delivery, animal care, and long haul.
- Deep cart cosmetics and limited functional choices with visible trade-offs.
- A trusted-driver career: small errands → inter-village deliveries → festival and emergency contracts.
- Journey history, route discovery, and statistics.

**What Bailgadi should not copy**

- Corporate-scale logistics, hiring spreadsheets, or dozens of near-identical vehicle specifications.
- Long stretches with no meaningful interaction; Bailgadi’s world is smaller and more intimate.
- Licensed-vehicle complexity or realism that turns bulls into engine stat blocks.
- Debt systems that punish experimentation.

## SnowRunner

SnowRunner’s official description emphasizes terrain mastery, heavy payloads, open-world discovery, contracts, rewards/unlocks, and vehicle upgrades such as tires, suspension, and snorkels. [Official SnowRunner overview](https://www.focus-entmt.com/en/games/snowrunner)

**Why it stays engaging**

- Terrain itself is the puzzle.
- The player prepares a suitable vehicle and route rather than merely following a marker.
- Failure creates stories: stuck loads, rescues, detours, and recovery plans.
- New vehicles/upgrades change capability and reopen old areas.
- Co-op turns difficult work into social problem-solving.

**What Bailgadi should borrow**

- Readable terrain states: dry dirt, mud, stone, sand, shallow water, steep slope.
- Preparation choices: wheel type, axle/suspension, rope, cover, cargo placement, bull pairing.
- Optional harder paths with better rewards and safer longer alternatives.
- Recoverable failure: cargo can shift, a wheel can bog down, bulls can tire—but the player can respond.
- Contracts that visibly improve a village road, bridge, market, or water source.

**What Bailgadi should not copy**

- Punishing recovery times, opaque mud simulation, or multi-hour rescues.
- A fleet of mechanically redundant carts.
- Constant extreme terrain. Ordinary peaceful roads are necessary contrast.
- Co-op in this six-month plan; networking would consume the roadmap.

## Animal Crossing: New Horizons

Nintendo emphasizes self-paced island life, relationships, gathering, crafting, decorating, seasonal creatures/events, collections, and a museum that makes discovery persistent. [Official Animal Crossing overview](https://www.nintendo.com/us/store/products/animal-crossing-new-horizons-switch/)

**Why it stays engaging**

- The world feels like a place to inhabit, not a level to clear.
- Small daily rituals create anticipation without demanding mastery.
- Collections, gifts, residents, and decoration make progress personal.
- Seasonal change refreshes familiar spaces.
- Players create stories and goals rather than only completing assigned tasks.

**What Bailgadi should borrow**

- Village reputation and relationships that change dialogue, requests, and decorations.
- A delivery journal and collection book for routes, cargo, birds, animals, festivals, landmarks, and folk art.
- Player-owned courtyard/cart shed as a cosmetic home base.
- Gentle daily requests with generous catch-up and no punishment for absence.
- Seasonal/festival presentation rooted in the game’s setting and researched respectfully.

**What Bailgadi should not copy**

- Real-time waiting gates or “come back tomorrow” blockers in the main campaign.
- Large crafting inventories or resource chores unrelated to driving.
- A direct imitation of cute-animal social tone.
- Calendar fear-of-missing-out that makes players feel guilty.

## Farming Simulator

Farming Simulator 25 highlights multiple maps, crops/animals, weather, ground deformation, production chains, construction projects, co-op, equipment, and community mods. [Official Farming Simulator overview](https://www.farming-simulator.com/newsArticle.php?news_id=544)

**Why it stays engaging**

- Interlocking systems turn simple tasks into player-directed plans.
- Machinery and production chains provide visible scale and efficiency growth.
- Players choose their pace, map, business, and specialization.
- The landscape changes through work.
- Modding and co-op extend the content life.

**What Bailgadi should borrow**

- Lightweight production chains as mission context: farm → mill → market, dairy → collection point, pottery → festival.
- Visible village projects funded by deliveries and reputation.
- Weather/season effects on routes and cargo.
- Regional specialties that change cargo and scenery.
- Eventually, data-driven community routes/cosmetics—not code mods in the first six months.

**What Bailgadi should not copy**

- Hundreds of vehicles, industrial farming simulation, or licensed machinery.
- Dense menus and accounting.
- Repetitive labor without handcrafted story/payoff.
- Production chains so complex that the cart journey becomes a loading-screen task.

## Temple Run

The current App Store description centers on immediate swipe controls, rapid obstacle reading, coin collection, unlockable characters, power-up improvement, high scores, and leaderboards. Imangi also documents objectives increasing the score multiplier. [Temple Run App Store listing](https://apps.apple.com/us/app/temple-run/id420009108), [Imangi FAQ](https://imangistudios.com/faq/)

**Why it stays engaging**

- The first meaningful action happens in seconds.
- Inputs are readable and outcomes immediate.
- Runs create fast retry loops and “one more attempt.”
- Coins, objectives, multipliers, and high scores turn repetition into progress.
- Speed escalates pressure automatically.

**What Bailgadi should borrow**

- An excellent first 60 seconds: move, steer, hit a small bump, recover cargo, reach a nearby destination.
- Optional short delivery challenges for mobile sessions.
- Three clear per-run objectives, such as smooth braking, no cargo loss, or spot an animal.
- Immediate, legible feedback for good driving.
- Quick retry for challenges.

**What Bailgadi should not copy**

- Endless forced-forward design.
- Constant speed escalation or twitch obstacles.
- Revives, score-chasing pressure, or coin trails on every road.
- Disposable runs that erase the meaning of place and delivery.

## Subway Surfers

The official listing emphasizes fast swipe acrobatics, vivid presentation, hoverboards, jetpacks, characters, and social challenges; SYBO documents boards that are cosmetic/protective and can alter movement. [Subway Surfers App Store listing](https://apps.apple.com/gb/app/subway-surfers/id512939461), [official hoverboard guide](https://sybo.helpshift.com/hc/en/5-subway-surfers/faq/208-hoverboards-their-powers/)

**Why it stays engaging**

- Highly readable color, animation, and rewards.
- Familiar core play supports frequent themed refreshes.
- Characters/boards offer collection and self-expression.
- Short missions and events give returning players a purpose.
- The game respects short mobile sessions.

**What Bailgadi should borrow**

- Strong silhouettes and cosmetic collections.
- Rotating delivery challenges that reuse the core journey with new constraints.
- Festival visual packages that transform familiar routes.
- A generous, visible reward track for play—not a pressure-based season pass at launch.
- Short-session modes alongside the main relaxed campaign.

**What Bailgadi should not copy**

- Multiple currencies, aggressive event shops, expiring paid power, or ad-driven interruption.
- Constant content churn before the base game is healthy.
- Lane-runner controls or hyper-saturated visual noise.
- FOMO-exclusive culturally meaningful items.

## Synthesis: Bailgadi’s unique loop

```text
Meet a villager / choose a delivery
→ inspect cargo, route, weather, and bulls
→ prepare cart and equipment
→ travel with readable road decisions
→ react to terrain, animals, cargo, and ambient events
→ arrive and receive a quality grade
→ earn coins, XP, reputation, and collection progress
→ improve cart/bulls/home village
→ unlock a new route, story, or specialty
```

The addictive quality should come from **mastery + attachment + anticipation**, not compulsion:

- Mastery: “I can carry fragile pots through monsoon roads cleanly now.”
- Attachment: “These are my bulls, my painted cart, and villages I helped.”
- Anticipation: “One more delivery unlocks the river route and tonight’s festival.”

---

# PART 3 — Player Journey

## First 30 minutes: trust and delight

### Minute 0–3: immediate control

- A 30-second interactive onboarding starts in motion, not in a menu.
- The player learns pace up, brake, steer, and camera.
- The first route is short, wide, sunny, and nearly impossible to fail.
- A small bump demonstrates suspension and cargo stability.
- The driver speaks; bulls and reins visibly respond.

### Minute 3–10: first meaningful delivery

- A villager requests rice sacks for a nearby household.
- The mission card explains distance, cargo condition, expected time, and reward in one screen.
- The player sees one safe path and one rough shortcut.
- Arrival shows time, cargo condition, smooth-driving bonus, coins, XP, and reputation.
- The village visibly acknowledges the delivery.

### Minute 10–20: ownership

- The player names the bull pair or chooses from respectful preset names.
- They spend the first guaranteed coins on one cosmetic choice: cart cloth, wheel paint, bell, or driver scarf.
- A second mission introduces milk cans and braking sensitivity.
- The tutorial adds one optional objective, never three simultaneous popups.

### Minute 20–30: promise of depth

- Weather begins to cloud or the route reaches a pond/orchard theme.
- The player unlocks the mission board and sees three contracts with different cargo/route trade-offs.
- A first collection entry—animal, landmark, or village craft—is recorded.
- A village-reputation meter reveals the next local unlock.
- The session ends with a clear promise: one more delivery unlocks the market route.

**First-session success criteria**

- 90% of players move within 30 seconds.
- 80% complete the first delivery.
- 70% understand cargo condition and pace levels.
- 60% make one personalization choice.
- No mandatory account, store, daily reward, or permission request before the first delivery. Voice is introduced as optional after baseline controls work.

## Hour 1: competence and choice

- Complete 4–6 deliveries across rice, milk, and vegetables.
- Learn dry dirt, rough patches, basic mud, and safe braking.
- Unlock level 2, first skill point, one cart upgrade choice, and the second village.
- Meet 3–5 recurring villagers whose requests have short context.
- See a weather transition and one ambient event.
- Earn the first achievement and complete a small collection page.
- Choose between safer/longer and harder/faster routes.

**Reason to continue:** the player is one reputation level from a new village service, one route from a new biome, and has formed an attachment to the bull pair.

## Hour 5: a personal build

- Reach approximately player level 8–10.
- Own a distinct cart setup: suspension, wheels, cargo cover, and cosmetics.
- Develop two driver specialties, such as fragile cargo and monsoon handling.
- Bulls have visible trust/stamina traits and one care upgrade each.
- Three villages offer different cargo, culture, scenery, and reputation rewards.
- Complete the first multi-stage village project, such as repairing a small bridge or supplying a market.
- Encounter night driving, monsoon rain, and one festival mission.
- Unlock challenge deliveries with quality medals.

**Reason to continue:** new routes are materially different; the player’s choices create a recognizable play style; village projects visibly change the world.

## Hour 20: regional mastery

- Finish the core story arc and unlock all launch regions.
- Reach level 25–30 without maxing every specialization.
- Own several cart visual sets but only a few meaningful functional configurations.
- Complete reputation stories in 3–4 villages.
- Pursue gold delivery grades, rare cargo contracts, achievements, and collection gaps.
- Weather/season combinations reshape familiar routes.
- Unlock “legacy contracts”: long, difficult, multi-stop deliveries with prestige cosmetics.

**Reason to continue:** mastery goals, completion, favorite routes, village attachment, personal expression, and occasional authored events—not an endless stat treadmill.

## Hour 100: voluntary long-tail play

A player should reach 100 hours because they love the world, not because the game withholds completion.

- Master all cargo disciplines and route medals.
- Complete collections and hidden discoveries.
- Build maximum reputation with every village.
- Create and save cart/bull cosmetic presets.
- Play weekly route challenges with fair normalized equipment.
- Revisit seasonal/festival events through an archive after their first appearance.
- Attempt self-directed goals: no-damage long haul, photo journey, no-HUD route, or minimum-time community challenge.
- Engage with post-launch maps and story deliveries if they choose to buy them.

**Reason to continue:** the game becomes a comforting place with deep mastery and completion targets. There should be no infinite XP level that pretends progress continues forever.

---

# PART 4 — Long-Term Progression Design

## Progression principles

1. Every system answers a different player motivation.
2. Functional power has trade-offs and caps; cosmetics provide the long tail.
3. Early progression is fast, mid-game progression is choice-driven, late progression is mastery/collection.
4. No permanent failure destroys a cherished bull, cart, or paid cosmetic.
5. All launch gameplay power is earnable through ordinary play.
6. Daily systems supplement the campaign and never gate it.

## Coins

**Purpose:** primary soft currency for care, cart service, functional equipment, and common cosmetics.

**Earned from**

- Base delivery pay.
- Cargo-condition, punctuality, smooth-driving, and optional-objective bonuses.
- Village project contributions.
- Achievements and collection milestones.
- Modest daily/weekly contracts.

**Spent on**

- Cart parts and service.
- Bull care/equipment.
- Driver equipment.
- Common cosmetics and home-base decoration.
- Mission-entry supplies only when they create a choice, never a grind tax.

**Rules**

- No paid coin packs at launch.
- No repair bill that can bankrupt or block the player.
- Failure pays a small learning stipend; retry never costs premium currency.
- Coin sources/sinks are tuned so ordinary campaign play funds a focused build.

## XP and player levels

**Purpose:** communicate career growth and award specialization points.

- XP comes from completed deliveries, route discovery, first-time cargo, quality grades, and story milestones.
- Cap the launch career at level 30.
- Early levels: 1–5 within the first 90 minutes.
- Mid-game: one level every 45–75 minutes.
- Level 30 is achievable around 25–35 hours, not 100.
- After cap, mastery progress goes to reputation, medals, collections, and achievements.

## Unlocks

Unlocks should open choices rather than add flat power:

- Mission categories and cargo licenses.
- Routes, villages, weather conditions, and time-of-day contracts.
- Cart frames and equipment slots.
- Bull care/training options.
- Driver specializations.
- Cosmetic vendors and collection displays.
- Challenge modes and legacy contracts.

Every major unlock has a preview and a clear source.

## Cart upgrades

Use four functional categories with three tiers and trade-offs:

| Category | Benefit | Trade-off |
|---|---|---|
| Wheels | Mud grip, stone stability, or road speed | No universal best wheel; surface specialization matters. |
| Suspension | Cargo stability and impact absorption | Softer suspension can reduce steering precision or pace. |
| Frame/load bed | Capacity or cargo security | Heavier frames accelerate more slowly. |
| Cover/storage | Rain protection or fragile-cargo support | Weight/cost; specialized cargo slots. |

Cosmetic categories: paint, carving, cloth canopy, lanterns, bells, wheel patterns, regional motifs, flower garlands, reflective trim, driver seat textile.

## Bull upgrades

Call these **care and training**, not mechanical upgrades.

- Stamina: longer sustained pace before fatigue.
- Sure-footedness: safer on rough/muddy terrain.
- Calmness: less reaction to storms, crowds, or animals.
- Teamwork: smoother acceleration and turns.
- Recovery: faster rest between demanding contracts.

Care includes food, water, brushing, rest, hoof care, and comfortable harnesses. Avoid breeding rarity, injury gambling, death, or expendable animals. Stats should be shallow and readable; affection/care animations matter as much as numbers.

## Driver upgrades

Three branches, each with five meaningful choices:

- **Roadcraft:** steering recovery, route reading, downhill control.
- **Cargo craft:** fragile loading, securing ropes, rain protection.
- **Community:** reputation gain, better contract information, village project bonuses.

Do not create a 50-node percentage tree. Each point should change a rule, unlock an option, or visibly improve information.

## Village reputation

Each village has five levels:

1. Visitor
2. Known Driver
3. Trusted Carrier
4. Village Friend
5. Local Legend

Reputation unlocks recurring villagers, story requests, local cosmetics, better mission variety, shortcuts after infrastructure projects, and festival invitations. It should never merely multiply coins.

## New maps

Launch target: three compact regions, each built from several procedural themes plus authored anchors.

1. **River Plains:** rice fields, ponds, canals, gentle roads, first villages.
2. **Dry Plateau:** stone roads, dust, pottery, steep sections, water deliveries.
3. **Forest and Hills:** orchards, shaded paths, rain, timber, switchbacks.

Post-launch maps should introduce new route decisions, cargo, culture, music, and weather—not just recolored scenery.

## Weather and time

Launch weather ladder:

- Clear morning.
- Hot/dusty afternoon.
- Light rain.
- Monsoon rain.
- Mist/fog.
- Windy storm front.

Time ladder:

- Dawn, day, sunset, night.

Weather affects visibility, surface, bull stamina, cargo protection, ambient audio, NPC behavior, and mission availability. Effects must be forecast on the mission card. Avoid random unavoidable punishment.

## Missions

Mission families:

- Standard delivery.
- Fragile cargo.
- Timed market run.
- Multi-stop milk collection.
- Heavy timber haul.
- Weather emergency.
- Festival preparation.
- Village construction supply.
- Animal-care delivery.
- Scenic/no-damage contract.
- Night lantern route.
- Legacy long haul.

Each mission is defined by giver, need, route, cargo, conditions, optional objectives, grade rules, and visible outcome.

## Cosmetics

Cosmetics are the safest long-term reward and monetization surface:

- Cart paint, carvings, fabrics, bells, lanterns, flags, wheel art.
- Bull blankets, harness colors, bells, non-invasive decorative accessories.
- Driver clothing, turbans/headwear where culturally appropriate, scarves, footwear.
- Home-base signs, trophies, photo frames, route maps.

Art direction must use cultural consultation. Sacred, regional, and festival symbols should not be randomized as generic decoration.

## Achievements

Launch target: 30–40 in-game achievements; map a curated subset to platform achievements.

Categories:

- Firsts: first delivery, village, night run, monsoon run.
- Mastery: perfect fragile delivery, smooth braking streak, no-collision long haul.
- Exploration: landmarks, routes, animals, hidden shrines/wells.
- Community: reputation levels and projects.
- Care: bull trust and rest discipline.
- Playful: ring the bell near a familiar animal, arrive at dawn, photograph a landmark.
- Long-term: total distance and delivery milestones.

Achievements should encourage different play styles rather than reward raw grind alone. Valve describes achievements as milestones that can also help players discover different ways of playing. [Steamworks achievement guidance](https://partner.steamgames.com/doc/features/achievements/ach_guide)

## Daily rewards and contracts

Use a humane model:

- One daily contract, three-day grace window.
- Seven stamps unlock a cosmetic; stamps need not be consecutive.
- Missed days do not reset progress.
- Weekly route challenge uses normalized equipment.
- No daily premium currency, randomized chest, or escalating login calendar.
- Offline players can access the last downloaded challenge.

Do not launch daily systems until there is enough mission variety to avoid repetition.

## Collections

- Village crafts and textiles.
- Landmark postcards.
- Birds and animals observed.
- Cargo and produce.
- Festival mementos.
- Route stamps.
- Folk songs/ambient sound postcards where recording rights allow.
- Cart art patterns.

Collections are discovered through journeys, villagers, perfect grades, and exploration. A visible home-base display makes them emotionally valuable.

---

# PART 5 — Complete Six-Month Feature Roadmap

## Production rules

- Every phase ends with a playable, testable build.
- A feature is not complete without UX, audio/visual feedback, save behavior, accessibility, telemetry, and device performance.
- “Must” features displace “Could” features when schedule slips.
- Content cannot begin at scale until its data path is proven with one vertical slice.
- Release candidate scope freezes after Phase 5; Phase 6 is optional for launch.

Complexity: **S / M / L / XL**. Risk: **Low / Medium / High**. Player Impact: **Low / Medium / High / Transformative**. Priority: **P0 must / P1 should / P2 could**.

## Phase 1 — Core Gameplay Polish

**Timing:** Weeks 1–5  
**Exit goal:** one 5–8 minute delivery is consistently satisfying on desktop and representative phones.

| Feature | Complexity | Risk | Player Impact | Priority | Dependencies |
|---|---|---|---|---|---|
| Automated tests for controls, cargo, mission, chunk/replay, collision math | M | Low | Indirect High | P0 | Current behavior baseline |
| Frame-time, draw-call, memory, and mobile performance capture | M | Low | Indirect High | P0 | Debug instrumentation |
| Application lifecycle: start, play, pause, result, replay, dispose | L | High | High | P0 | Tests |
| Vehicle simulation separated from cart animation | L | High | Transformative | P0 | Lifecycle, tests |
| Unified procedural road query: center, width, height, tangent, surface | L | High | Transformative | P0 | ProceduralWorld |
| Cart follows road height/slope; camera follows terrain safely | L | High | Transformative | P0 | Vehicle simulation, road query |
| Hazards align to generated road and recycle deterministically | L | High | High | P0 | Road query, stable seed |
| Mission progress measured along route; destination aligned to village/region | L | High | Transformative | P0 | Road query, mission extraction |
| Mission timer policy and finish/timeout race handling | S | Medium | High | P0 | Mission lifecycle |
| Cargo collision severity and road-surface integration | M | Medium | High | P0 | Collision result, road query |
| Delivery grading: time, condition, smoothness, collisions | M | Medium | High | P0 | Mission result snapshot |
| First-delivery interactive tutorial | M | Medium | High | P0 | Stable controls/missions/UI |
| Input semantics cleanup; brake/decrease/reverse clarity | M | Medium | Medium | P1 | Tests |
| Pause, settings shell, focus/interruption handling | M | Medium | High | P0 | Lifecycle |
| Controller baseline and remappable actions | M | Medium | High on Steam | P1 | Semantic input actions |
| Debug toggle and road/collider overlays | M | Low | Indirect High | P1 | Road/collision query |

**Phase 1 kill criteria**

- If road-following cannot maintain 30 FPS on target mobile devices, simplify terrain deformation and shadow detail before adding content.
- If cargo grading feels arbitrary in blind tests, reduce inputs until players can predict outcomes.
- If voice control creates more false triggers than delight, keep it opt-in experimental for launch.

## Phase 2 — Immersion

**Timing:** Weeks 6–9  
**Exit goal:** the same route feels meaningfully different by time, weather, village activity, and audio.

| Feature | Complexity | Risk | Player Impact | Priority | Dependencies |
|---|---|---|---|---|---|
| Environment state controlling sun, fog, sky, wind, ambience | L | Medium | High | P0 | World/road queries |
| Dawn/day/sunset/night cycle with mission-selected start time | M | Medium | High | P0 | Environment state |
| Clear, dust, light rain, monsoon, mist weather | L | High | Transformative | P0 | Environment state, surfaces |
| Weather forecast and cargo-protection choice on mission card | M | Medium | High | P0 | Weather, mission UI |
| Surface-aware dust, wetness, wheel/hoof feedback | M | Medium | High | P1 | Road surface, weather |
| Region-aware ambience and audio buses | L | Medium | High | P0 | Environment state, audio settings |
| Mission/checkpoint/success/failure music stingers | M | Low | Medium | P1 | Mission events, audio buses |
| Camera-oriented spatial audio | M | Medium | Medium | P1 | Camera/listener state |
| Procedural chunk-driven actor spawn descriptors | XL | High | High | P1 | Stable chunks, actor pools |
| AI road-edge/collider awareness | L | High | High | P1 | Actor descriptors, collision query |
| Unified ambient event presentation | L | High | Medium | P2 | ProceduralWorld, DynamicWorldAI |
| Recurring mission-giver villagers and arrival reactions | M | Medium | High | P0 | Actor placement, mission context |
| Photo mode and landmark postcards | M | Medium | Medium | P2 | Camera modes, collections shell |
| Haptics for mobile/controller impacts and pace changes | S | Low | Medium | P1 | Input/platform wrapper |
| Voice lifecycle, echo-safe feedback, sensitivity option | M | Medium | Medium | P1 | Audio buses, settings |

## Phase 3 — Progression

**Timing:** Weeks 10–14  
**Exit goal:** players understand what they are building toward for the next 10–20 hours.

| Feature | Complexity | Risk | Player Impact | Priority | Dependencies |
|---|---|---|---|---|---|
| Versioned local save with migration and backup | L | High | Transformative | P0 | Stable domain models |
| Player XP and 30-level progression | M | Medium | High | P0 | Save, mission results |
| Driver specialization choices | M | Medium | High | P0 | Vehicle/cargo rules |
| Village reputation, five levels per village | L | Medium | Transformative | P0 | Save, mission-giver model |
| Mission board with 3–5 route/cargo choices | L | Medium | Transformative | P0 | Mission data, route descriptors |
| Cart functional equipment with trade-offs | L | High | High | P0 | Vehicle specification |
| Bull care, stamina, calmness, teamwork | L | High | Transformative | P0 | Vehicle simulation, UI |
| Bull naming/preset identity and care animations | M | Medium | High | P1 | Save, bull model |
| Cosmetic inventory and loadout presets | L | Medium | High | P0 | Save, cart/driver visual slots |
| Route discovery and journey history | M | Low | Medium | P1 | Save, world descriptors |
| Collections: landmarks, animals, cargo, crafts | L | Medium | High | P1 | Save, photo/discovery events |
| 30–40 in-game achievements | M | Low | Medium | P1 | Semantic events, save |
| Detailed result screen with grade, XP, reputation, unlocks | M | Low | High | P0 | Progression systems |
| First village project with visible world change | L | High | High | P1 | Reputation, persistent region state |

## Phase 4 — Economy

**Timing:** Weeks 15–18  
**Exit goal:** rewards and spending reinforce play without grind, debt, or dominant builds.

| Feature | Complexity | Risk | Player Impact | Priority | Dependencies |
|---|---|---|---|---|---|
| Coin transaction ledger with idempotent mission rewards | L | High | Transformative | P0 | Save, result snapshot |
| Delivery pay and transparent quality bonuses | M | Medium | High | P0 | Grading, economy |
| Balanced cart/bull/driver shops | L | High | High | P0 | Equipment/care definitions |
| Common cosmetic vendors by village reputation | M | Medium | High | P0 | Cosmetic inventory, reputation |
| Repair/service as light maintenance, never a blocker | M | High | Medium | P1 | Economy, vehicle condition |
| Multi-stage village construction donations | L | Medium | High | P1 | Economy, persistent world state |
| Economy telemetry and simulation tests | M | Low | Indirect High | P0 | Analytics, transaction ledger |
| Anti-grind tuning pass: time-to-upgrade, failure stipend, catch-up | M | Medium | High | P0 | Full economy |
| Supporter Pack entitlement shell with cosmetics only | M | Medium | Low at launch | P2 | Platform commerce, cosmetics |

**Economy target**

- First cosmetic: guaranteed within 15 minutes.
- First functional choice: within 60–90 minutes.
- Focused cart build: 6–10 hours.
- No required farming of the same mission.
- A failed run never removes more resources than it awarded beforehand.

## Phase 5 — Content Expansion

**Timing:** Weeks 19–23  
**Exit goal:** a coherent 20–30 hour launch campaign with three regions and reusable content tools.

| Feature | Complexity | Risk | Player Impact | Priority | Dependencies |
|---|---|---|---|---|---|
| Region 1 polish: River Plains | L | Medium | High | P0 | All core systems |
| Region 2: Dry Plateau | XL | High | Transformative | P0 | Content pipeline, terrain |
| Region 3: Forest and Hills | XL | High | Transformative | P1 | Content pipeline, weather |
| 25–35 authored mission templates across 8–10 families | XL | High | Transformative | Mission tools, economy |
| 12–18 recurring villagers with short reputation arcs | XL | High | High | Dialogue/content pipeline |
| Three village projects per launch region | L | High | High | Reputation/world state |
| Festival mission vertical slice with consultation | L | High | High | Weather/events/cosmetics |
| Night lantern and monsoon emergency mission families | L | Medium | High | Time/weather |
| 80–120 cosmetics, primarily recolors/pattern sets from reusable slots | L | Medium | High | Cosmetic pipeline |
| Collection content and hidden discoveries | L | Medium | Medium | Collections |
| Audio recording/localization pass for driver and village calls | L | Medium | High | Final scripts, audio pipeline |
| Difficulty/accessibility presets and full balance pass | L | Medium | High | Complete content |
| Ending sequence and post-campaign legacy contracts | L | Medium | High | Core story/reputation |

**Scope fallback:** if production slips, ship two regions with higher density and hold Region 3 for a free post-launch update. Never ship three empty regions.

## Phase 6 — Live Service Features and Release Candidate

**Timing:** Weeks 24–26 and post-launch runway  
**Exit goal:** a stable release candidate and a sustainable, optional post-launch plan.

| Feature | Complexity | Risk | Player Impact | Priority | Dependencies |
|---|---|---|---|---|---|
| Crash reporting with privacy/consent policy | M | Medium | Indirect High | P0 | Platform builds, privacy review |
| Privacy-respecting product analytics and consent | L | High | Indirect High | P0 | Event taxonomy, legal review |
| Steam achievements, Cloud, Input, store/build review | L | Medium | High on Steam | P0 | Platform wrapper, save |
| Mobile platform achievements and cloud save | L | High | High on mobile | P1 | Platform sign-in/save |
| Internal → closed → open testing program | M | Low | Indirect High | P0 | Release builds |
| Daily contract with three-day grace | M | Medium | Medium | P2 | Sufficient mission variety |
| Weekly normalized route challenge | L | High | Medium | P2 | Analytics, anti-cheat policy |
| Seven-stamp non-consecutive cosmetic reward | M | Medium | Medium | P2 | Daily contract, cosmetics |
| Festival archive and event replay | M | Medium | High | P1 | Festival content |
| Optional supporter pack and store compliance | M | Medium | Low-Medium | P2 | Entitlements, cosmetics |
| Remote content configuration with safe defaults | L | High | Indirect Medium | P2 | Operations and rollback |
| Launch telemetry dashboards and alert thresholds | M | Medium | Indirect High | P0 | Analytics/crash reporting |
| 30-day post-launch content/support calendar | M | Medium | Medium | P1 | Team capacity confirmed |

**Live-service gate:** do not enable dailies, weekly challenges, remote configuration, or a season pass unless the team has:

- At least eight weeks of varied missions.
- A tested rollback process.
- Privacy/compliance ownership.
- Community/support capacity.
- Healthy baseline retention without daily rewards.

---

# PART 6 — Monetization Without Pay-to-Win

## Recommended business model

### Steam

**Premium base game** with complete campaign and progression. Optional cosmetic Supporter Pack and substantial map/story expansions later.

### Mobile

Preferred options, in order:

1. Premium purchase.
2. Free demo/first region with a one-time full-game unlock.
3. If audience testing rejects premium: free base with cosmetic-only purchases and no forced ads.

Avoid consumable currency sales. If a native mobile build sells digital functionality/content, platform commerce rules apply; Apple’s current guidelines require in-app purchase for unlocking digital game features/content. [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

## Fit assessment

| Idea | Fit | Recommendation |
|---|---|---|
| Cosmetics | Excellent | Primary optional monetization. Sell coherent art sets; keep a larger earnable catalog in-game. |
| Premium carts | Conditional | Sell visual cart frames or side-grade themes only. Functional stats must be earnable and no paid frame can dominate. |
| Premium bull skins | Good with care | Use natural coat variations and respectful decorative blankets/harnesses. Avoid fantasy rarity, gambling, or treating animals as disposable collectibles. |
| Festivals | Good as content | First festival should be free to establish trust. Later large festival story packs can be paid, but culturally meaningful core celebration items should not be locked entirely behind payment. |
| Season Pass | Poor at launch | Reconsider only after a year of proven content cadence. If used, make it cosmetic, transparent, and permanently completable after purchase. |
| Supporter Pack | Excellent | Soundtrack, digital art book, founder cart cloth, paint set, badge, and credits acknowledgment. No coins, XP, stamina, or better equipment. |
| Map expansions | Excellent post-launch | Best premium DLC: substantial new region, missions, music, cargo, villagers, and cosmetics. |
| Ads | Poor | Forced/interstitial ads break immersion. Optional rewarded ads still create economic pressure and are not recommended for the intended tone. |
| Loot boxes/gacha | Unacceptable | No randomized paid rewards. |
| Energy/lives | Unacceptable | No waiting or payment to continue deliveries. |

## Fair monetization rules

- Show exact contents before purchase.
- No limited-time paid power.
- No paid item affects leaderboards or normalized weekly challenges.
- Paid cosmetics remain usable offline.
- No duplicate cosmetics.
- No premium currency obfuscation; use local prices.
- Provide restore-purchase and entitlement recovery.
- Keep culturally or spiritually significant content out of randomized monetization.
- Publish a plain-language purchase and refund explanation.
- Children/privacy review is mandatory before mobile monetization.

---

# PART 7 — Steam and Mobile Readiness

The current app is a browser project. Steam/mobile release requires a supported packaging/runtime strategy, platform services layer, entitlement handling, offline behavior, and certification testing. Choose that technology in Phase 1; do not wait until content lock.

## Performance

- Define minimum/recommended desktop specifications.
- Define representative low/mid/high Android and iOS device matrix.
- Lock targets: 60 FPS preferred, stable 30 FPS minimum on supported mobile.
- Budget CPU, GPU, draw calls, triangles, shadow casters, texture memory, JS heap, audio memory, and initial load.
- Profile chunk regeneration, ropes, shadows, AI, particles, DOM, TensorFlow model, and audio decode.
- Add quality presets: shadows, pixel ratio, environment density, particles, view/fog distance.
- Detect thermal throttling and battery drain on 20–30 minute mobile sessions.
- Test background/foreground, screen lock, phone call, audio interruption, low-memory restore, orientation, safe areas, and browser/runtime context loss.
- Cache/download assets predictably; show real loading progress.
- Eliminate dev serialization/logging in production.
- Add resource disposal and clean shutdown.

## Accessibility

- Full keyboard and controller remapping.
- Rebindable touch layout or left-handed preset.
- Adjustable text/UI scale and large-touch-target mode.
- Color-blind-safe cargo/status cues using icon, shape, and text—not color alone.
- Subtitles/captions for all spoken/important sounds with speaker labels.
- Separate master, ambience, vehicle, voice, music, and UI volumes.
- Reduce camera shake, motion, dust, flashes, and weather intensity.
- FOV/camera distance options.
- High-contrast navigation and readable mission cards.
- Pause-anywhere for single-player gameplay.
- Tutorial replay and contextual help.
- Difficulty assists: wider road guidance, cargo-damage reduction, generous timers, auto-center steering.
- Screen-reader/semantic UI plan for menus where platform/runtime permits.
- Voice input is optional; every command has a non-voice equivalent.
- Document accessibility honestly in store listings. Apple now supports accessibility information on App Store product pages. [Apple submission guidance](https://developer.apple.com/app-store/submitting/)

## Localization

- Externalize every player-facing string; remove concatenated grammar assumptions.
- Launch recommendation: English, Hindi, Marathi, Gujarati, Bengali, Tamil, Telugu, Kannada, and Malayalam only if native review capacity exists; otherwise begin with English + Hindi and expand deliberately.
- Support Devanagari and target-script font rendering, fallback, line wrapping, numerals, and UI expansion.
- Localize subtitles, mission names, tutorials, store text, achievements, privacy/support pages, and voice-control explanations.
- Do not machine-translate culturally specific dialogue without review.
- Create pronunciation/recording guides.
- Decide whether custom voice recognition supports localized commands; never claim support that the model lacks.
- Pseudolocalize early and test compact phones.

## Settings

- Graphics quality and frame cap.
- Resolution/pixel ratio/window/fullscreen on desktop.
- Audio buses.
- Keyboard/controller/touch remapping.
- Camera/FOV/shake.
- Accessibility assists.
- Language and subtitles.
- Voice-control enable/sensitivity/device diagnostics.
- Analytics/crash-consent choices where legally required.
- Save/cloud conflict choices.
- Reset settings, reset tutorial, and clear local data.

## Save system

- Versioned schema with migration tests.
- Atomic writes and backup slot.
- Separate profile, settings, progression, economy ledger, mission state, world seed, achievements, collections, and entitlements.
- Never save renderer/DOM/audio objects.
- Save after transactions and mission results; autosave indicator.
- Manual recovery/export for support if feasible.
- Corruption fallback without silently deleting progress.
- Multiple profiles only if product research justifies the UI cost.
- Test upgrades from every shipped schema version.

## Cloud save

- Local save remains authoritative and playable offline.
- Conflict screen shows timestamp, playtime, level, and device.
- Never merge coin ledgers naively.
- Steam Cloud can synchronize configured save files across computers; plan paths and conflict testing. [Steam Cloud documentation](https://partner.steamgames.com/doc/features/cloud)
- Google Play Games Services currently offers achievements, leaderboards, and Saved Games across supported mobile integrations. [Play Games Services overview](https://developer.android.com/games/distribute/pgs)
- Evaluate Apple Game Center/iCloud equivalent for iOS packaging.
- Test offline progress, reinstall, two-device conflict, clock changes, partial upload, and account switch.

## Controller support

- Xbox, PlayStation, Switch Pro, generic DirectInput, Steam Deck controls.
- Analog steering/dead-zone/sensitivity/inversion.
- Digital pace-level and brake/reverse semantics.
- Controller-first menu navigation and focus.
- Correct glyph switching and no mouse-required screen.
- Vibration strength/off.
- Steam Input action sets for gameplay, menus, photo mode, and voice diagnostics. Steam Input supports major controller families and configurable action concepts. [Steam Input documentation](https://partner.steamgames.com/doc/features/steam_controller)
- Suspend input correctly during overlays, focus loss, and reconnect.

## Achievements

- 30–40 in-game achievements; 20–30 platform achievements at launch.
- Progress/incremental achievements must be save-backed.
- No achievement depends on paid content unless clearly expansion-specific.
- Avoid grind-only achievements and inaccessible voice-only requirements.
- Support offline unlock queue and later platform sync.
- Test reset, duplicate calls, cloud conflict, and platform callbacks.

## Tutorial/onboarding

- First input within 30 seconds.
- Teach one concept at a time in a forgiving route.
- No store, account, daily reward, or microphone permission before first success.
- Voice introduced as an optional enhancement after manual controls.
- Provide skip and replay.
- Detect keyboard/touch/controller and show matching prompts.
- Teach cargo feedback by a safe recoverable event.
- Finish with a real reward/personalization moment.

## Analytics

Use the minimum data necessary and document it.

Core funnel:

- Boot → start screen → first movement → tutorial steps → first delivery → first customization → second session.
- Mission offered/accepted/completed/failed/abandoned.
- Failure reason, cargo grade, route, weather, equipment.
- Performance tier, device category, crashes, load duration.
- Progression sources/sinks and purchase funnel if monetized.
- Voice opt-in/support/load/listen success and false-trigger feedback only with appropriate privacy handling; never record raw microphone audio.

Governance:

- Event schema/version.
- Consent and opt-out where required.
- Data retention/deletion policy.
- No advertising identifier unless the product truly needs it.
- Dashboards with questions and action owners, not vanity metrics.
- A/B testing only after the experience is stable and never for exploitative pricing.

## Crash reporting and support

- Capture fatal errors, unhandled rejections, GPU/context loss, save migration failures, and platform entitlement failures.
- Include build version, platform, quality tier, last safe state—not personal content.
- Breadcrumbs for mission, chunk, screen, and save operation.
- Symbol/source-map handling and release tagging.
- In-game support link, privacy policy, known-issues page, and contact address.
- User-visible recovery message and safe restart.
- Monitor crash-free sessions and ANR/freeze indicators.
- Google Play Console provides testing tracks and release-health metrics including user-perceived crash/ANR rates. [Google Play release testing overview](https://support.google.com/googleplay/android-developer/answer/16387982)
- Apple advises submitting complete builds, testing current devices/software, fixing crashes, and providing working support/privacy links. [Apple review guidance](https://developer.apple.com/app-store/review/)

## Steam release checklist

- Select desktop packaging/runtime and test clean machines.
- Steamworks account, app, tax/banking, content survey, age rating.
- Store page copy, capsule art, screenshots, trailer, supported languages, accessibility, system requirements.
- Coming Soon page and wishlist campaign early enough for testing/visibility.
- Build depots/branches, launch options, redistributables, offline behavior.
- Steam Input/controller and Steam Deck testing.
- Achievements/stats and Cloud save.
- Overlay, screenshots, notifications, and callback pumping.
- Fullscreen/window behavior, multiple monitors, alt-tab, audio-device change.
- Privacy policy, EULA if needed, support contacts.
- Store/build checklist and Valve review well ahead of release; Valve’s documented flow requires marking the completed product for review before release. [Steam release options](https://partner.steamgames.com/doc/store/types)
- Demo/Next Fest decision and separate demo save policy.
- Press/creator build branch and review keys.
- Release-day rollback and hotfix branch.

## Mobile release checklist

- Choose native wrapper/runtime and validate WebGL/audio/microphone behavior.
- App identifiers, signing, certificates, provisioning, Android App Bundle.
- Store icons, feature graphics, screenshots/video, descriptions, localization.
- Privacy policy, support URL, age/content rating, ads declaration, data safety/privacy labels.
- Permission rationale for microphone; request only when voice is enabled.
- In-app purchase products, restore flow, receipt/entitlement verification.
- Account deletion flow if accounts exist.
- Background/foreground, notification policy, offline launch, deep links if used.
- Internal and closed tests before production.
- For certain newer personal Google Play developer accounts, current policy requires a closed test with at least 12 opted-in testers for 14 continuous days before production access. [Google Play testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465)
- Google requires a Data safety form and privacy policy even when an app declares no collected data. [Google Play Data safety guidance](https://support.google.com/googleplay/android-developer/answer/10787469)
- Apple requires accurate privacy disclosures for app and third-party partner practices. [Apple privacy details](https://developer.apple.com/app-store/app-privacy-details/)
- Test low storage, weak network, airplane mode, clock changes, reinstall, update, and device migration.
- Staged rollout, crash/ANR gates, remote kill switch for broken optional content, support staffing.

## Release gates

### Alpha

- Complete campaign slice: tutorial + 5 missions + one village project.
- Save migration and 30-minute stability.
- Controller/touch/keyboard parity.
- Target-device performance within 20% of budget.

### Beta

- Content complete.
- No progression blocker.
- Cloud conflict tested.
- Localization integrated.
- Accessibility checklist substantially complete.
- Crash-free sessions ≥99% in controlled testing.
- Economy cannot dead-end.

### Release candidate

- No P0/P1 defects.
- 60-minute soak on every supported device tier.
- Store compliance complete.
- Save upgrade/reinstall/cloud verified.
- Offline play verified.
- Purchase/restore verified where applicable.
- Rollback/hotfix/support plan rehearsed.

---

# PART 8 — Future Vision: Bailgadi 2.0

## The dream version

Bailgadi 2.0 is a premium, deeply atmospheric journey game set across a connected fictional region inspired by multiple rural landscapes of India, built with extensive cultural consultation and field recording.

The player owns a small home courtyard and cart shed. Their bulls have names, habits, trust, and care routines without becoming fragile virtual pets. Villages remember deliveries. A repaired bridge opens a route; a supplied school becomes busier; a festival prepared over several missions transforms the square. Seasons change crops, rivers, roads, clothing, animals, work, sound, and mission needs.

The road is fully physical but humane. Mud forms ruts; rain fills depressions; slopes shift cargo; shallow water cools hooves; shade helps stamina. The player reads the environment, chooses a route, packs the cart, and cares for the team. Failure creates a recovery decision, not a punishment screen.

## World

- Five to seven large connected regions with authored villages inside deterministic landscapes.
- Dynamic seasons, water levels, road condition, weather fronts, and day/night.
- Persistent infrastructure: bridges, road repairs, wells, markets, schools, clinics, and festival grounds.
- Living traffic: other carts, bicycles, tractors where appropriate, pedestrians, herds, buses at major roads.
- Rich audio ecology recorded by region and time.
- A travel journal with photography, maps, oral histories, crafts, animals, plants, and music.

## Career and stories

- A 40–60 hour authored campaign about trust, family livelihood, community connections, and changing transport networks.
- Dozens of recurring villagers with evolving needs and relationships.
- Player choices prioritize village projects but do not create simplistic “good/evil” branches.
- Regional cargo economies that create context rather than spreadsheets.
- Endgame cooperative contracts between villages.

## Vehicle and animal depth

- Several historically and regionally grounded cart styles.
- Detailed but readable harness, wheel, suspension, frame, cover, and load-placement choices.
- Bull personalities, pair compatibility, care, trust, and training.
- Grounded animations using terrain-aware feet, wheels, ropes, and cargo constraints.
- Optional realistic handling assists, accessible to a broad audience.

## Social future

Only after a strong single-player foundation:

- Two-player cooperative convoy deliveries.
- Asynchronous community village projects.
- Weekly normalized route challenges.
- Shared photo postcards and cart showcases.
- Curated user-created route contracts and cosmetic patterns with moderation.

No competitive stat advantage from purchases. Co-op should emphasize planning and helping, not racing.

## Technology vision

- Deterministic world and mission descriptors.
- Clear simulation/rendering separation.
- Data-driven content tools for designers and cultural reviewers.
- Robust save/cloud/profile services.
- Scalable actor streaming and navigation.
- Terrain-aware vehicle, cargo, and animation.
- Cross-platform input, accessibility, localization, analytics, and crash support.
- Mod/content validation and safe rollback.

## What success looks like

Bailgadi should not be remembered as “an Indian cart version of another game.” It should be remembered for:

- The feeling of early morning light over a rice field.
- The sound and motion of bulls settling into a shared pace.
- The tension of protecting clay pots as monsoon rain reaches the road.
- Recognizing villagers who now trust the player.
- Seeing a bridge, market, or festival that exists because of many completed journeys.
- A game that respects rural life, animals, the player’s time, and the culture that gives it meaning.

That is the 2.0 promise: not endless content, but a world worth returning to.

---

## Six-month executive summary

| Month | Primary outcome | Do not compromise |
|---:|---|---|
| 1 | Road, vehicle, cargo, mission, camera, and results become one coherent loop | Handling, tests, performance |
| 2 | Weather/time/audio/AI make the world feel alive | Readability and mobile budgets |
| 3 | Save, XP, reputation, equipment, bulls, cosmetics create purpose | Clear choices, no grind |
| 4 | Coins, shops, rewards, projects form a fair economy | Transaction safety, no dead ends |
| 5 | Regions, missions, villagers, festivals, collections create breadth | Density and cultural review |
| 6 | Platform services, compliance, testing, polish, launch operations | Stability, accessibility, privacy |

If only one principle survives production pressure, it should be this:

> Make every delivery feel like a journey that mattered.

