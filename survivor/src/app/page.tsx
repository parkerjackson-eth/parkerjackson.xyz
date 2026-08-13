import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/SiteHeader";
import { Card, buttonClass, secondaryButtonClass } from "@/components/ui";
import { CATEGORY_LABELS, CATEGORY_ORDER, EVENT_TYPES } from "@/lib/scoring";
import { getCurrentUser } from "@/lib/session";

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Draft your castaways",
    body: "Before the premiere, everyone in the league drafts a handful of castaways. No two teams can hold the same person, so the cast gets split across the room.",
  },
  {
    step: "02",
    title: "Watch the episode",
    body: "Immunity wins, idols, blindsides, jury votes. Every one of them is worth points to whoever holds that castaway.",
  },
  {
    step: "03",
    title: "The commissioner logs it",
    body: "After the episode airs, one person ticks off what happened. Points are applied automatically from the league's scoring table.",
  },
  {
    step: "04",
    title: "Standings move",
    body: "Cumulative points decide the league. Whoever has the most when someone wins Sole Survivor takes the whole thing.",
  },
];

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <AppShell>
      <section className="py-10 text-center sm:py-16">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-500">
          Fantasy sports, for Survivor
        </p>
        <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl">
          Draft the cast.
          <br />
          Outwit your friends.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-stone-400">
          Same idea as fantasy football, except you are drafting castaways instead of
          quarterbacks and scoring idols instead of touchdowns.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/signup" className={buttonClass}>
            Start a league
          </Link>
          <Link href="/login" className={secondaryButtonClass}>
            I have a join code
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {HOW_IT_WORKS.map((item) => (
          <Card key={item.step}>
            <div className="font-mono text-xs font-bold text-amber-500">{item.step}</div>
            <h2 className="mt-2 text-lg font-semibold text-white">{item.title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-stone-400">{item.body}</p>
          </Card>
        ))}
      </section>

      <section className="mt-12">
        <h2 className="text-center text-2xl font-bold tracking-tight text-white">
          How points are scored
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-center text-sm text-stone-400">
          These are the defaults. Every value is editable, so your league can score the
          game however it likes.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {CATEGORY_ORDER.map((category) => {
            const events = EVENT_TYPES.filter((e) => e.category === category);
            if (events.length === 0) return null;

            return (
              <Card key={category}>
                <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-amber-500/90">
                  {CATEGORY_LABELS[category]}
                </h3>
                <ul className="space-y-1.5 text-sm">
                  {events.map((event) => (
                    <li
                      key={event.key}
                      className="flex items-baseline justify-between gap-4 border-b border-stone-900 pb-1.5 last:border-0"
                    >
                      <span className="text-stone-300">{event.label}</span>
                      <span
                        className={`shrink-0 font-mono font-semibold tabular-nums ${
                          event.points > 0
                            ? "text-emerald-400"
                            : event.points < 0
                              ? "text-red-400"
                              : "text-stone-500"
                        }`}
                      >
                        {event.points > 0 ? "+" : ""}
                        {event.points}
                        {event.repeatable ? " ea" : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="mt-12 text-center">
        <Link href="/signup" className={buttonClass}>
          Create your account
        </Link>
      </section>
    </AppShell>
  );
}
