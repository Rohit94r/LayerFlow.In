/**
 * Typed Agent State Machine
 *
 * Manages the PLAN -> ACT -> OBSERVE -> DECIDE -> ACT -> VERIFY -> DONE lifecycle
 * for agent runs. Each state transition emits structured LayerFlow events
 * that can be consumed by WebSocket clients, the TUI, or persisted to the audit log.
 */

import { createId } from "../../db/schema/_helpers";
import { logger } from "../../config/logger";

// -- Types ------------------------------------------------------------------

export type AgentState =
  | "idle"
  | "planning"
  | "acting"
  | "observing"
  | "deciding"
  | "verifying"
  | "done"
  | "failed"
  | "waiting_approval";

export type AgentRunMeta = {
  agentId: string;
  runId: string;
  workspaceId: string;
  goal: string;
};

export type StateTransition = {
  from: AgentState;
  to: AgentState;
  reason: string;
  timestamp: Date;
};

export interface StateMachineSnapshot {
  agentId: string;
  runId: string;
  currentState: AgentState;
  transitions: StateTransition[];
  iterationCount: number;
  maxIterations: number;
  startedAt: Date | null;
  completedAt: Date | null;
  error: string | null;
}

// -- State Machine -----------------------------------------------------------

export class AgentStateMachine {
  private _currentState: AgentState = "idle";
  private readonly _transitions: StateTransition[] = [];
  private _iterationCount = 0;
  private readonly _maxIterations: number;
  private _startedAt: Date | null = null;
  private _completedAt: Date | null = null;
  private _error: string | null = null;

  constructor(
    public readonly agentId: string,
    public readonly runId: string,
    public readonly workspaceId: string,
    maxIterations = 25,
  ) {
    this._maxIterations = maxIterations;
  }

  get state(): AgentState {
    return this._currentState;
  }

  get iterationCount(): number {
    return this._iterationCount;
  }

  get snapshot(): StateMachineSnapshot {
    return {
      agentId: this.agentId,
      runId: this.runId,
      currentState: this._currentState,
      transitions: [...this._transitions],
      iterationCount: this._iterationCount,
      maxIterations: this._maxIterations,
      startedAt: this._startedAt,
      completedAt: this._completedAt,
      error: this._error,
    };
  }

  /**
   * Transition to a new state if the move is valid. Emits a structured event.
   */
  transition(to: AgentState, reason: string): boolean {
    if (!this.canTransition(to)) {
      logger.warn(
        { from: this._currentState, to, agentId: this.agentId },
        "invalid state transition",
      );
      return false;
    }

    const from = this._currentState;
    this._currentState = to;
    this._transitions.push({ from, to, reason, timestamp: new Date() });

    if (from === "acting" && (to === "observing" || to === "verifying")) {
      this._iterationCount++;
    }

    if (to === "done" || to === "failed") {
      this._completedAt = new Date();
    }

    logger.info(
      { from, to, reason, agentId: this.agentId, runId: this.runId },
      "agent state transition",
    );

    return true;
  }

  start(): void {
    this._startedAt = new Date();
    this.transition("planning", "agent run started");
  }

  fail(error: string): void {
    this._error = error;
    this.transition("failed", error);
  }

  /**
   * Validates state transitions follow the PLAN->ACT->OBSERVE->DECIDE->ACT->VERIFY->DONE flow.
   */
  private canTransition(to: AgentState): boolean {
    const from = this._currentState;

    // Terminal states are final.
    if (from === "done" || from === "failed") return false;

    // Valid state transitions.
    const valid: Record<AgentState, AgentState[]> = {
      idle: ["planning"],
      planning: ["acting", "waiting_approval", "failed"],
      acting: ["observing", "verifying", "waiting_approval", "failed"],
      observing: ["deciding", "failed"],
      deciding: ["acting", "verifying", "done", "failed"],
      verifying: ["done", "acting", "failed"],
      done: [],
      failed: [],
      waiting_approval: ["acting", "planning", "failed"],
    };

    const allowed = valid[from];
    if (!allowed) return false;

    // Check iteration limit.
    if (this._iterationCount >= this._maxIterations && to !== "done" && to !== "failed") {
      return false;
    }

    return allowed.includes(to);
  }

  /**
   * Create events emitted by the state machine for WebSocket broadcast.
   */
  toEvent(): { type: string; agentId: string; runId: string; step: string; status: string; ts: string } {
    return {
      type: "agent.progress",
      agentId: this.agentId,
      runId: this.runId,
      step: this._currentState,
      status: this._currentState === "waiting_approval"
        ? "waiting_approval"
        : this._currentState === "done" || this._currentState === "failed"
          ? "paused"
          : "running",
      ts: new Date().toISOString(),
    };
  }
}

/**
 * Create an event payload for agent.started.
 */
export function agentStartedEvent(
  agentId: string,
  runId: string,
  workspaceId: string,
  goal: string,
) {
  return {
    type: "agent.started" as const,
    agentId,
    runId,
    workspaceId,
    goal,
    ts: new Date().toISOString(),
  };
}

/**
 * Create an event payload for agent.completed.
 */
export function agentCompletedEvent(
  agentId: string,
  runId: string,
  success: boolean,
  summary: string | null,
) {
  return {
    type: "agent.completed" as const,
    agentId,
    runId,
    success,
    summary,
    ts: new Date().toISOString(),
  };
}

/**
 * Create an event payload for agent.failed.
 */
export function agentFailedEvent(
  agentId: string,
  runId: string,
  error: string,
) {
  return {
    type: "agent.failed" as const,
    agentId,
    runId,
    error,
    ts: new Date().toISOString(),
  };
}
