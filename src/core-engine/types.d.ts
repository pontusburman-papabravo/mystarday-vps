/**
 * Product Engine — TypeScript contracts (implementation is JavaScript + JSDoc).
 * @see docs/first-success/ENGINE_SPEC.md
 */

export interface FamilyFacts {
  readonly familyId: string;
  readonly signupAt: Date;
  readonly childrenIds: readonly string[];
  readonly totalCompletions: number;
  readonly firstCompletionAt: Date | null;
  readonly lastCompletionAt: Date | null;
  readonly firstDayCompletedAt?: Date | null;
  readonly currentStreakDays: number;
  readonly hasSeenChildView: boolean;
  readonly hasRoutine: boolean;
  readonly hasEveningRoutine: boolean;
  readonly rewardsClaimedCount: number;
  readonly coParentCount?: number;
  readonly openedCustomize?: boolean;
  readonly _incomplete?: boolean;
}

export interface InferenceFlags {
  readonly isNewUser: boolean;
  readonly hasFirstSuccess: boolean;
  readonly isStagnant: boolean;
  readonly hasActiveLoop: boolean;
  readonly hoursSinceSignup: number;
  readonly daysSinceSignup: number;
  readonly daysSinceLastActivity: number | null;
}

export type CoreState =
  | 'REGISTERED'
  | 'ROUTINE_READY'
  | 'CHILD_SEEN'
  | 'FIRST_ACTIVITY'
  | 'FIRST_DAY_COMPLETE'
  | 'STREAK_3'
  | 'WEEK_1'
  | 'CUSTOMIZING'
  | 'UNCERTAINTY_FALLBACK';

export type PrimaryNeed =
  | 'NEEDS_CLARITY'
  | 'NEEDS_MOMENTUM'
  | 'NEEDS_CONSISTENCY'
  | 'NEEDS_CUSTOMIZATION'
  | 'NEEDS_WINBACK';

export type PolicyName =
  | 'SHOW_CHILD'
  | 'ADD_EVENING'
  | 'INVITE_CO_PARENT'
  | 'SIMPLIFY_ROUTINE'
  | 'TRIGGER_CELEBRATION'
  | 'CUSTOMIZE_ROUTINE';

export type PolicySetId = 'v2_first_success_control' | 'v2_fast_path_experiment';

export type UiTheme = 'DEFAULT' | 'CELEBRATION' | 'ENCOURAGEMENT' | 'CALM';
export type UiIntensity = 'LOW' | 'HIGH';
export type OutcomeAction = 'ENGAGED' | 'IGNORED' | 'DISMISSED';

export interface EngineContext {
  readonly activePolicySet: PolicySetId;
  readonly currentDeviceTime: Date;
}

export interface PolicyDirective {
  readonly id: string;
  readonly name: PolicyName;
  readonly validityWindow: {
    readonly startHour: number;
    readonly endHour: number;
    readonly expiresAt: Date;
  };
  readonly uiTokens: {
    readonly theme: UiTheme;
    readonly intensity: UiIntensity;
    readonly tags: readonly string[];
  };
}

export interface DecisionTrace {
  readonly coreState: CoreState;
  readonly evaluatedNeed: PrimaryNeed;
  readonly activePolicy: string;
  readonly rulesTriggered: readonly string[];
  readonly policySet?: PolicySetId;
}

export interface EngineOutput {
  readonly timestamp: Date;
  readonly policy: PolicyDirective;
  readonly milestone: string | null;
  readonly trace: DecisionTrace;
}

export interface OutcomeFeedback {
  readonly familyId: string;
  readonly directiveId: string;
  readonly actionTaken: OutcomeAction;
  readonly latencyMs: number;
  readonly recordedAt?: Date;
}

export declare class ProductEngine {
  static evaluate(facts: FamilyFacts, context: EngineContext): EngineOutput;
  static handleFallback(facts: FamilyFacts, context: EngineContext, error: unknown): EngineOutput;
}
