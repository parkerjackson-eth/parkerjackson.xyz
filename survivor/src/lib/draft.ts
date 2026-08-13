export type DraftMember = {
  id: string;
  teamName: string;
  ownerName: string;
  draftPosition: number | null;
};

/** Members in draft order, with unset positions pushed to the back. */
export function orderedMembers(members: DraftMember[]): DraftMember[] {
  return [...members].sort((a, b) => {
    const ap = a.draftPosition ?? Number.MAX_SAFE_INTEGER;
    const bp = b.draftPosition ?? Number.MAX_SAFE_INTEGER;
    return ap - bp || a.teamName.localeCompare(b.teamName);
  });
}

/**
 * Snake order: round 1 runs 1..N, round 2 runs N..1, and so on. Returns null
 * once every roster is full.
 */
export function memberForPick(
  members: DraftMember[],
  rosterSize: number,
  pickNumber: number,
): DraftMember | null {
  const order = orderedMembers(members);
  if (order.length === 0) return null;
  if (pickNumber < 1 || pickNumber > order.length * rosterSize) return null;

  const zeroBased = pickNumber - 1;
  const round = Math.floor(zeroBased / order.length);
  const indexInRound = zeroBased % order.length;
  const index = round % 2 === 0 ? indexInRound : order.length - 1 - indexInRound;

  return order[index];
}

export type DraftState = {
  totalPicks: number;
  picksMade: number;
  onTheClock: DraftMember | null;
  /** The next few picks, for the "up next" strip. */
  upcoming: { pickNumber: number; member: DraftMember }[];
  complete: boolean;
  locked: boolean;
};

export function draftState(
  members: DraftMember[],
  rosterSize: number,
  picksMade: number,
  draftLockAt: Date | null,
  now: Date = new Date(),
): DraftState {
  const totalPicks = members.length * rosterSize;
  const locked = !!draftLockAt && draftLockAt.getTime() <= now.getTime();
  const complete = picksMade >= totalPicks;

  const upcoming: { pickNumber: number; member: DraftMember }[] = [];
  for (let n = picksMade + 1; n <= Math.min(picksMade + 5, totalPicks); n++) {
    const member = memberForPick(members, rosterSize, n);
    if (member) upcoming.push({ pickNumber: n, member });
  }

  return {
    totalPicks,
    picksMade,
    onTheClock: complete ? null : memberForPick(members, rosterSize, picksMade + 1),
    upcoming,
    complete,
    locked,
  };
}
