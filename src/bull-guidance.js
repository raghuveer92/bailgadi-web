export const BULL_GUIDANCE_STATES = Object.freeze({
  FOLLOW_ROAD: "FOLLOW_ROAD",
  APPROACHING_JUNCTION: "APPROACHING_JUNCTION",
  CHOOSING_BRANCH: "CHOOSING_BRANCH",
  COMMITTED_TO_BRANCH: "COMMITTED_TO_BRANCH",
  AVOIDING_OBSTACLE: "AVOIDING_OBSTACLE",
  BLOCKED: "BLOCKED",
  STOPPED: "STOPPED",
  TURNING_AROUND: "TURNING_AROUND",
});

export const DRIVER_DIRECTIONS = Object.freeze({
  LEFT: "LEFT",
  RIGHT: "RIGHT",
  STRAIGHT: "STRAIGHT",
  NONE: "NONE",
});

export function createBullGuidanceState(routeId = "None") {
  return {
    state: BULL_GUIDANCE_STATES.STOPPED,
    currentRouteId: routeId,
    candidateRouteId: "None",
    committedRouteId: "None",
    junctionId: "None",
    junctionType: "None",
    availableOutgoingRouteIds: [],
    leftRouteId: "None",
    rightRouteId: "None",
    straightRouteId: "None",
    driverDirection: DRIVER_DIRECTIONS.NONE,
    lastDriverDirection: DRIVER_DIRECTIONS.NONE,
    driverInputAge: Number.POSITIVE_INFINITY,
    playerGuidanceDirection: DRIVER_DIRECTIONS.NONE,
    playerGuidanceRemainingTime: 0,
    playerGuidanceTargetRouteId: "None",
    playerGuidanceActive: false,
    roadFollowStrength: 1,
    obstacleAhead: false,
    blockedReason: "None",
    waitingForGuidance: false,
    roadContainmentForce: 0,
    roadZone: "SAFE",
    playerSteeringInput: 0,
    latchedSteeringInput: 0,
    rawRoadHeading: 0,
    smoothedRoadHeading: 0,
    roadHeadingError: 0,
    headingDeadZone: 0,
    roadCorrectionTarget: 0,
    roadCorrectionApplied: 0,
    autoSteerAmount: 0,
    correctionDirectionChangesPerSecond: 0,
    correctionDirectionChangeCount: 0,
    correctionDirectionWindowTime: 0,
    isOnWrongRoute: false,
    branchCommitDistance: 20,
    branchCommitProgress: 0,
    naturalBranchChoice: "None",
    guidanceAmount: 0,
    guidanceHoldTime: 0,
    turnaroundProgress: 0,
    turnaroundAreaId: "None",
    insideTurnaroundArea: false,
    reverseSteeringAmount: 0,
    safeRoadHalfWidth: 0,
    vehicleHalfWidth: 0,
    blockerDistance: Number.POSITIVE_INFINITY,
    canReverseFromBlocker: true,
    spawnRouteId: routeId,
    spawnValid: false,
    spawnRoadOffset: 0,
    forwardCommandAccepted: false,
    currentTargetSpeed: 0,
    actualSpeed: 0,
  };
}

export function resetBullGuidanceState(guidance, routeId, commitDistance = 20) {
  guidance.state = BULL_GUIDANCE_STATES.STOPPED;
  guidance.currentRouteId = routeId;
  guidance.candidateRouteId = "None";
  guidance.committedRouteId = "None";
  guidance.junctionId = "None";
  guidance.junctionType = "None";
  guidance.availableOutgoingRouteIds.length = 0;
  guidance.leftRouteId = "None";
  guidance.rightRouteId = "None";
  guidance.straightRouteId = "None";
  guidance.driverDirection = DRIVER_DIRECTIONS.NONE;
  guidance.lastDriverDirection = DRIVER_DIRECTIONS.NONE;
  guidance.driverInputAge = Number.POSITIVE_INFINITY;
  guidance.playerGuidanceDirection = DRIVER_DIRECTIONS.NONE;
  guidance.playerGuidanceRemainingTime = 0;
  guidance.playerGuidanceTargetRouteId = "None";
  guidance.playerGuidanceActive = false;
  guidance.roadFollowStrength = 1;
  guidance.obstacleAhead = false;
  guidance.blockedReason = "None";
  guidance.waitingForGuidance = false;
  guidance.roadContainmentForce = 0;
  guidance.roadZone = "SAFE";
  guidance.playerSteeringInput = 0;
  guidance.latchedSteeringInput = 0;
  guidance.rawRoadHeading = 0;
  guidance.smoothedRoadHeading = 0;
  guidance.roadHeadingError = 0;
  guidance.headingDeadZone = 0;
  guidance.roadCorrectionTarget = 0;
  guidance.roadCorrectionApplied = 0;
  guidance.autoSteerAmount = 0;
  guidance.correctionDirectionChangesPerSecond = 0;
  guidance.correctionDirectionChangeCount = 0;
  guidance.correctionDirectionWindowTime = 0;
  guidance.isOnWrongRoute = false;
  guidance.branchCommitDistance = commitDistance;
  guidance.branchCommitProgress = 0;
  guidance.naturalBranchChoice = "None";
  guidance.guidanceAmount = 0;
  guidance.guidanceHoldTime = 0;
  guidance.turnaroundProgress = 0;
  guidance.turnaroundAreaId = "None";
  guidance.insideTurnaroundArea = false;
  guidance.reverseSteeringAmount = 0;
  guidance.safeRoadHalfWidth = 0;
  guidance.blockerDistance = Number.POSITIVE_INFINITY;
  guidance.canReverseFromBlocker = true;
  guidance.spawnRouteId = routeId;
  guidance.spawnValid = false;
  guidance.spawnRoadOffset = 0;
  guidance.forwardCommandAccepted = false;
  guidance.currentTargetSpeed = 0;
  guidance.actualSpeed = 0;
}

export function clearPlayerGuidance(guidance) {
  guidance.playerGuidanceDirection = DRIVER_DIRECTIONS.NONE;
  guidance.playerGuidanceRemainingTime = 0;
  guidance.playerGuidanceTargetRouteId = "None";
  guidance.playerGuidanceActive = false;
  guidance.lastDriverDirection = DRIVER_DIRECTIONS.NONE;
  guidance.driverDirection = DRIVER_DIRECTIONS.NONE;
  guidance.driverInputAge = Number.POSITIVE_INFINITY;
}

export function setBullGuidanceState(guidance, nextState) {
  guidance.state = nextState;
  guidance.waitingForGuidance = nextState === BULL_GUIDANCE_STATES.BLOCKED;
}
