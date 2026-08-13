/**
 * The scoring catalog.
 *
 * Every point value here is only a DEFAULT. Real values are read from the
 * ScoringRule table at score time: a league's own rule wins, then the season's
 * rule, then the default below. That is why point values can be edited mid
 * season without rewriting the history of what actually happened.
 */

export type EventCategory = "challenges" | "idols" | "social" | "twists" | "exit";

export type EventTypeDef = {
  /** Stable key stored in EpisodeEvent.eventType. Never rename these. */
  key: string;
  label: string;
  category: EventCategory;
  points: number;
  /** Extra context shown next to the checkbox on the episode entry screen. */
  hint?: string;
  /** Can only be scored once per castaway per season (e.g. reaching the merge). */
  oncePerSeason?: boolean;
  /** Scored per occurrence, so the entry form shows a number input. */
  repeatable?: boolean;
  /** Twist rules start switched off and are enabled per season. */
  defaultEnabled?: boolean;
  /** Shown up front on the episode entry form instead of behind "more". */
  common?: boolean;
};

export const EVENT_TYPES: EventTypeDef[] = [
  // -- Challenges ----------------------------------------------------------
  {
    key: "INDIVIDUAL_IMMUNITY",
    label: "Wins individual immunity",
    category: "challenges",
    common: true,
    points: 8,
  },
  {
    key: "INDIVIDUAL_REWARD",
    label: "Wins individual reward",
    category: "challenges",
    common: true,
    points: 3,
  },
  {
    key: "TRIBAL_IMMUNITY",
    label: "Wins tribal immunity",
    category: "challenges",
    common: true,
    points: 4,
    hint: "Check every castaway on the winning side",
  },
  {
    key: "TRIBAL_REWARD",
    label: "Wins tribal reward",
    category: "challenges",
    common: true,
    points: 2,
    hint: "Check every castaway on the winning side",
  },

  // -- Idols and advantages ------------------------------------------------
  {
    key: "FIND_IDOL",
    label: "Finds a hidden immunity idol",
    category: "idols",
    common: true,
    points: 5,
  },
  {
    key: "FIND_ADVANTAGE",
    label: "Finds any other advantage",
    category: "idols",
    points: 3,
  },
  {
    key: "PLAY_IDOL_EFFECTIVE",
    label: "Plays an idol that changes the vote",
    category: "idols",
    points: 6,
  },
  {
    key: "PLAY_IDOL_INEFFECTIVE",
    label: "Plays an idol or advantage with no effect",
    category: "idols",
    points: 1,
  },
  {
    key: "VOTED_OUT_WITH_IDOL",
    label: "Voted out holding an unplayed idol or advantage",
    category: "idols",
    points: -3,
  },

  // -- Social and strategic ------------------------------------------------
  {
    key: "VOTE_WITH_MAJORITY",
    label: "Votes with the tribal majority",
    category: "social",
    common: true,
    points: 2,
  },
  {
    key: "BLINDSIDE_ARCHITECT",
    label: "Driving force behind a blindside",
    category: "social",
    points: 4,
  },
  {
    key: "REACH_MERGE",
    label: "Reaches the merge",
    category: "social",
    points: 5,
    oncePerSeason: true,
    hint: "Scores once per castaway",
  },
  {
    key: "REACH_FTC",
    label: "Reaches the final tribal council",
    category: "social",
    points: 10,
    oncePerSeason: true,
  },
  {
    key: "WIN_FIRE_MAKING",
    label: "Wins the final-three fire making challenge",
    category: "social",
    points: 6,
  },
  {
    key: "JURY_VOTE",
    label: "Receives a jury vote",
    category: "social",
    points: 2,
    repeatable: true,
    hint: "Enter how many votes they received",
  },
  {
    key: "SOLE_SURVIVOR",
    label: "Wins Sole Survivor",
    category: "social",
    points: 25,
    oncePerSeason: true,
  },

  // -- Twists (off by default) --------------------------------------------
  {
    key: "TWIST_DUEL_WIN",
    label: "Wins a duel on Redemption Island / Edge of Extinction",
    category: "twists",
    points: 3,
    defaultEnabled: false,
  },
  {
    key: "TWIST_RETURN_TO_GAME",
    label: "Returns to the main game",
    category: "twists",
    points: 8,
    defaultEnabled: false,
    oncePerSeason: true,
  },

  // -- Exit ----------------------------------------------------------------
  {
    key: "VOTED_OUT",
    label: "Voted out",
    category: "exit",
    common: true,
    points: 0,
    oncePerSeason: true,
    hint: "Scores nothing — it marks the roster slot dead from here on",
  },
  {
    key: "QUIT_OR_MEDEVAC",
    label: "Quits, or leaves for medical or personal reasons",
    category: "exit",
    points: -5,
    oncePerSeason: true,
  },
];

export const EVENT_TYPE_MAP: Record<string, EventTypeDef> = Object.fromEntries(
  EVENT_TYPES.map((e) => [e.key, e]),
);

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  challenges: "Challenges",
  idols: "Idols and advantages",
  social: "Social and strategic",
  twists: "Season twists",
  exit: "Exit",
};

export const CATEGORY_ORDER: EventCategory[] = [
  "challenges",
  "idols",
  "social",
  "twists",
  "exit",
];

/** Event types that end a castaway's run and kill the roster slot. */
export const ELIMINATION_EVENTS = new Set(["VOTED_OUT", "QUIT_OR_MEDEVAC"]);

export function eventLabel(key: string): string {
  return EVENT_TYPE_MAP[key]?.label ?? key;
}

// ---------------------------------------------------------------------------
// Rule resolution
// ---------------------------------------------------------------------------

export type StoredRule = {
  eventType: string;
  points: number;
  enabled: boolean;
  seasonId: string | null;
  leagueId: string | null;
};

export type ResolvedRule = {
  eventType: string;
  points: number;
  enabled: boolean;
  /** Where the value in play came from. Shown in the settings screen. */
  source: "league" | "season" | "default";
};

/**
 * Fold stored rules over the defaults. League rules beat season rules, and
 * season rules beat the built-in defaults. Any event type with no stored rule
 * anywhere falls back to the catalog above.
 */
export function resolveRules(stored: StoredRule[]): Map<string, ResolvedRule> {
  const resolved = new Map<string, ResolvedRule>();

  for (const def of EVENT_TYPES) {
    resolved.set(def.key, {
      eventType: def.key,
      points: def.points,
      enabled: def.defaultEnabled ?? true,
      source: "default",
    });
  }

  // Season rules first so league rules can overwrite them.
  for (const rule of stored.filter((r) => r.seasonId !== null)) {
    resolved.set(rule.eventType, {
      eventType: rule.eventType,
      points: rule.points,
      enabled: rule.enabled,
      source: "season",
    });
  }

  for (const rule of stored.filter((r) => r.leagueId !== null)) {
    resolved.set(rule.eventType, {
      eventType: rule.eventType,
      points: rule.points,
      enabled: rule.enabled,
      source: "league",
    });
  }

  return resolved;
}

export type ScorableEvent = {
  eventType: string;
  count: number;
  pointOverride: number | null;
};

/**
 * Points for a single logged event.
 *
 * A point override always wins, even for a disabled rule — it is the
 * commissioner explicitly saying "this instance is worth this much". Otherwise
 * a disabled rule scores nothing, and everything else is value x count.
 */
export function scoreEvent(
  event: ScorableEvent,
  rules: Map<string, ResolvedRule>,
): number {
  const count = Math.max(1, event.count || 1);

  if (event.pointOverride !== null && event.pointOverride !== undefined) {
    return event.pointOverride * count;
  }

  const rule = rules.get(event.eventType);
  if (!rule || !rule.enabled) return 0;

  return rule.points * count;
}
