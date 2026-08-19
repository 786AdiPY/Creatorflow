// Landing — the marketing front door at "/".
//
// Same editorial register as the product's design language: an ink+flame
// palette, Lexend, and scroll mechanics that carry the argument rather than
// decorate it. Five chapters: the problem → the pipeline (scroll-pinned,
// horizontal) → the workflow builder itself, embedded live → the approval
// gate → the platform surface underneath it.
//
// Chapter 03 deliberately doesn't fake a metrics dashboard the product
// hasn't earned yet — it embeds the real @xyflow/react canvas instead.
import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  CountUp,
  Reveal,
  RevealWords,
  useActiveSection,
  useLinePlayback,
  useMagnetic,
  usePageProgress,
  useReducedMotion,
  useScrolled,
  useSectionProgress,
  useTilt3D,
} from '../lib/motion';
import PipelinePreview from '../components/PipelinePreview';
import { KIND_LABEL } from '../flow/types';
import type { NodeKind } from '../flow/types';
import './Landing.css';

// The hero's WebGL scene pulls in three.js — code-split so it streams in
// after first paint instead of blocking the landing page's initial load.
const PipelineScene = lazy(() => import('../three/PipelineScene'));

const CHAPTERS = [
  { id: 'problem', label: 'The problem' },
  { id: 'pipeline', label: 'The pipeline' },
  { id: 'studio', label: 'The builder' },
  { id: 'gate', label: 'The gate' },
  { id: 'platform', label: 'Platform' },
];

export default function Landing() {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ block: 'start' });
    });
  }, []);

  return (
    <div className="lp" id="top">
      <ProgressRail />
      <Nav />
      <ChapterRail />
      <main className="lp-main">
        <Hero />
        <Ticker />
        <Glance />
        <Problem />
        <Pipeline />
        <Studio />
        <Gate />
        <Platform />
        <Cta />
      </main>
      <Footer />
    </div>
  );
}

// ── reading progress ─────────────────────────────────────────────────────────
function ProgressRail() {
  const p = usePageProgress();
  return (
    <div className="lp-rail" aria-hidden="true">
      <div className="lp-rail__fill" style={{ transform: `scaleX(${p})` }} />
    </div>
  );
}

// ── nav ──────────────────────────────────────────────────────────────────────
function Nav() {
  const scrolled = useScrolled(24);
  return (
    <header className={`lp-nav ${scrolled ? 'is-scrolled' : ''}`}>
      <a className="lp-nav__brand" href="#top">
        <Mark />
        <span>CreatorFlow</span>
      </a>
      <nav className="lp-nav__links" aria-label="Sections">
        <a href="#problem">Problem</a>
        <a href="#pipeline">Pipeline</a>
        <a href="#studio">Builder</a>
        <a href="#platform">Platform</a>
        <Link to="/orbit" className="lp-nav__orbit">
          ✦ View in 3D
        </Link>
      </nav>
      <Link to="/library" className="lp-nav__cta">
        Open the Studio
        <Arrow />
      </Link>
    </header>
  );
}

function Mark() {
  return (
    <svg viewBox="0 0 32 32" className="lp-mark" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="currentColor" opacity="0.06" />
      <path d="M11 9v14l12-7-12-7Z" fill="currentColor" className="lp-mark__play" />
    </svg>
  );
}

function Arrow() {
  return (
    <svg viewBox="0 0 16 16" className="lp-arrow" aria-hidden="true">
      <path
        d="M3 8h10M9 4l4 4-4 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── chapter rail (desktop only, decorative nav) ──────────────────────────────
const CHAPTER_IDS = CHAPTERS.map((c) => c.id);

function ChapterRail() {
  const active = useActiveSection(CHAPTER_IDS);
  return (
    <nav className="lp-chapters" aria-label="Chapters">
      <ol>
        {CHAPTERS.map((c, i) => (
          <li key={c.id} className={active === c.id ? 'is-active' : ''}>
            <a href={`#${c.id}`}>
              <span className="lp-chapters__n">{String(i + 1).padStart(2, '0')}</span>
              <span className="lp-chapters__l">{c.label}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

// ── hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  const cta = useMagnetic<HTMLAnchorElement>(0.22);

  return (
    <section className="lp-hero">
      <span className="lp-hero__ambient" aria-hidden="true">
        <i className="lp-hero__blob lp-hero__blob--a" />
        <i className="lp-hero__blob lp-hero__blob--b" />
      </span>
      <div className="lp-hero__inner">
        <p className="lp-eyebrow">
          <span className="lp-eyebrow__dot" aria-hidden="true" />
          Content pipeline — automated, on-brand, still yours to approve
        </p>

        <h1 className="lp-display">
          <RevealWords as="span" className="lp-display__line" text="Raw footage in." />
          <RevealWords
            as="span"
            className="lp-display__line lp-display__line--em"
            text="Ready to publish out."
            start={3}
          />
        </h1>

        <Reveal className="lp-hero__lead" delay={4}>
          <p>
            CreatorFlow turns one long-form upload into clips, on-brand thumbnails, and
            platform-tuned titles and tags — schedules the release, publishes it, and pulls
            the performance data back into one dashboard. Nothing goes out until you say go.
          </p>
        </Reveal>

        <Reveal className="lp-hero__actions" delay={5}>
          <Link ref={cta} to="/library" className="lp-btn lp-btn--solid">
            Open the Studio
            <Arrow />
          </Link>
          <a href="#pipeline" className="lp-btn lp-btn--ghost">
            See how it works
          </a>
        </Reveal>

        <Reveal className="lp-spec" delay={6}>
          <SpecItem k="Platforms" v="YouTube · Instagram · TikTok · X" />
          <SpecItem k="Modules" v="Clip · Thumbnail · Metadata · Schedule" />
          <SpecItem k="Gate" v="human approval before anything ships" />
          <SpecItem k="Backend" v="Supabase, with full provenance" />
        </Reveal>
      </div>

      <Reveal className="lp-hero__figure" delay={4}>
        <HeroFigure />
      </Reveal>
    </section>
  );
}

function SpecItem({ k, v }: { k: string; v: string }) {
  return (
    <div className="lp-spec__item">
      <dt>{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}

/** The hero figure is the real product: a live, muted @xyflow/react canvas
 * inside a tilting "browser" card, not a mockup image. */
function HeroFigure() {
  const tilt = useTilt3D<HTMLDivElement>(6);

  return (
    <div className="lp-float">
      <div className="lp-fig3d" ref={tilt}>
        <figure className="lp-fig">
          <span className="lp-fig__glare" aria-hidden="true" />
          <figcaption className="lp-fig__head">
            <span className="lp-fig__dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span className="lp-mono">weekly_vlog_042 · pipeline · drag to explore at /orbit</span>
          </figcaption>
          <div className="lp-fig__flow lp-fig__flow--3d">
            <Suspense fallback={<div className="lp-fig__flow-fallback" aria-hidden="true" />}>
              <PipelineScene compact />
            </Suspense>
          </div>
        </figure>
      </div>
    </div>
  );
}

// ── platform ticker ─────────────────────────────────────────────────────────
const MARQUEE = ['YouTube', 'Instagram', 'TikTok', 'X', 'LinkedIn', 'Threads', 'Supabase'];

function Ticker() {
  return (
    <div className="lp-ticker" aria-hidden="true">
      <div className="lp-ticker__track">
        {[0, 1].map((copy) => (
          <div className="lp-ticker__group" key={copy}>
            {MARQUEE.map((m) => (
              <span key={`${copy}-${m}`} className="lp-ticker__item">
                {m}
                <i />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── glance — a few honest counts, not invented metrics ──────────────────────
function Glance() {
  const stats = [
    { to: 6, l: 'modules, one dashboard' },
    { to: 1, l: 'approval gate before publish' },
    { to: 0, l: 'extra tools to log into' },
    { to: 2, suffix: '+', l: 'platforms, connector-based' },
  ];
  return (
    <div className="lp-wrap lp-glance">
      {stats.map((s) => (
        <Reveal className="lp-glance__item" key={s.l}>
          <span className="lp-glance__v lp-mono">
            <CountUp to={s.to} suffix={s.suffix ?? ''} />
          </span>
          <span className="lp-glance__l">{s.l}</span>
        </Reveal>
      ))}
    </div>
  );
}

// ── 01 problem ───────────────────────────────────────────────────────────────
function Problem() {
  return (
    <section className="lp-section" id="problem">
      <div className="lp-wrap">
        <SectionLabel n="01" t="The problem" />
        <h2 className="lp-h2">
          <RevealWords text="Creating is the fun part." as="span" className="lp-h2__l" />
          <RevealWords
            text="Everything after isn't."
            as="span"
            className="lp-h2__l lp-h2__l--em"
            start={5}
          />
        </h2>

        <div className="lp-cols">
          <Reveal as="p" delay={1}>
            A finished cut isn't the finish line. It still needs a thumbnail that gets
            clicked, a title that gets found, tags tuned per platform, a slot on the
            calendar, and comments somebody actually reads. That's six different tools
            before anything goes live.
          </Reveal>
          <Reveal as="p" delay={2}>
            So creators do the safe thing: post less, or post inconsistently — whenever
            the busywork finally gets done, which is exactly the wrong hour for reach.
            The ideas were never the bottleneck.
          </Reveal>
        </div>

        <Reveal className="lp-quote" delay={3}>
          <blockquote>
            The blocker was never the content. It was the six tabs between finishing a
            cut and hitting publish.
          </blockquote>
        </Reveal>
      </div>
    </section>
  );
}

function SectionLabel({ n, t }: { n: string; t: string }) {
  return (
    <Reveal className="lp-label">
      <span className="lp-mono">{n}</span>
      <i aria-hidden="true" />
      <span>{t}</span>
    </Reveal>
  );
}

// ── 02 pipeline — scroll-pinned horizontal ───────────────────────────────────
const STAGES = [
  {
    k: 'Ingest',
    t: 'Bring the footage you already shot.',
    d: 'Upload straight from your camera roll, or point at a file already sitting in storage. No re-recording, no special export settings.',
    m: 'upload · storage pointer',
  },
  {
    k: 'Clip',
    t: 'Cut the moments worth posting.',
    d: 'The source gets scanned for clip-worthy moments — the beats with the pacing and energy that travel — each with an in and out point ready to review.',
    m: '≥1 suggested clip',
  },
  {
    k: 'Thumbnail',
    t: 'Generate covers that get clicked.',
    d: 'At least two on-brand variants per asset, ready to compare side by side before either one goes anywhere near a video.',
    m: '≥2 variants',
  },
  {
    k: 'Metadata',
    t: 'Titles, tags, and a description — per platform.',
    d: "Copy tuned to each platform's character limits and search behavior, not one generic blurb pasted everywhere.",
    m: 'char-limit aware',
  },
  {
    k: 'Schedule',
    t: 'Slot it into the calendar.',
    d: 'Pick the asset, the metadata, the thumbnail, and a time. It lands on a calendar you can see across every connected account.',
    m: 'calendar view',
  },
  {
    k: 'Approve',
    t: 'Nothing moves without a yes.',
    d: 'A human reviews the draft before it is eligible to publish — not a rubber stamp, an actual gate. Skip this stage and nothing goes out.',
    m: 'human sign-off',
  },
  {
    k: 'Publish',
    t: 'Goes out to every connected account.',
    d: "Auto-publishes at the scheduled time through each platform's own API — no manual posting, no missed slots.",
    m: 'auto-publish',
  },
  {
    k: 'Analyze',
    t: 'Performance and comments, back in one place.',
    d: 'Views, likes, retention and comment sentiment flow back into the same dashboard the draft started in.',
    m: 'one dashboard',
  },
];

function Pipeline() {
  const reduced = useReducedMotion();
  const [progressRef, p] = useSectionProgress<HTMLElement>('pin');
  const vpRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [overflow, setOverflow] = useState(0);

  useLayoutEffect(() => {
    if (reduced) {
      setOverflow(0);
      return;
    }
    const measure = () => {
      const vp = vpRef.current;
      const track = trackRef.current;
      if (!vp || !track) return;
      setOverflow(Math.max(0, track.scrollWidth - vp.clientWidth));
    };
    measure();
    window.addEventListener('resize', measure);
    const t = window.setTimeout(measure, 300);
    return () => {
      window.removeEventListener('resize', measure);
      window.clearTimeout(t);
    };
  }, [reduced]);

  const activeIndex = Math.min(STAGES.length - 1, Math.round(p * (STAGES.length - 1)));

  return (
    <section
      className={`lp-pin ${reduced ? 'is-static' : ''}`}
      id="pipeline"
      ref={progressRef}
      style={overflow ? { height: `calc(100vh + ${overflow}px)` } : undefined}
    >
      <div className="lp-pin__stage">
        <div className="lp-wrap lp-pin__head">
          <SectionLabel n="02" t="The pipeline" />
          <h2 className="lp-h2 lp-h2--tight">Eight stages, every one of them visible.</h2>
          <div className="lp-pin__meter" aria-hidden="true">
            <div className="lp-pin__meter-fill" style={{ transform: `scaleX(${p})` }} />
          </div>
        </div>

        <div className="lp-pin__vp" ref={vpRef}>
          <div
            className="lp-pin__track"
            ref={trackRef}
            style={reduced ? undefined : { transform: `translate3d(${-p * overflow}px,0,0)` }}
          >
            {STAGES.map((s, i) => (
              <StageCard s={s} i={i} active={i === activeIndex} key={s.k} />
            ))}
          </div>
        </div>

        <div className="lp-wrap lp-pin__dots" aria-hidden="true">
          {STAGES.map((s, i) => (
            <span key={s.k} className={i <= activeIndex ? 'is-on' : ''} />
          ))}
        </div>
      </div>
    </section>
  );
}

function StageCard({ s, i, active }: { s: (typeof STAGES)[number]; i: number; active: boolean }) {
  const tilt = useTilt3D<HTMLElement>(9);
  return (
    <article className={`lp-stage ${active ? 'is-active' : ''}`} ref={tilt}>
      <span className="lp-stage__glare" aria-hidden="true" />
      <header>
        <span className="lp-stage__n lp-mono">{String(i + 1).padStart(2, '0')}</span>
        <span className="lp-stage__k lp-mono">{s.k}</span>
      </header>
      <h3>{s.t}</h3>
      <p>{s.d}</p>
      <footer className="lp-mono">{s.m}</footer>
    </article>
  );
}

// ── 03 the builder — the live canvas embedded on the page ───────────────────
const LEGEND: NodeKind[] = ['trigger', 'generate', 'action', 'gate', 'output'];

function Studio() {
  return (
    <section className="lp-section lp-section--ink" id="studio">
      <div className="lp-wrap">
        <SectionLabel n="03" t="The builder" />
        <h2 className="lp-h2">
          <RevealWords text="Every module is a node." as="span" className="lp-h2__l" />
          <RevealWords
            text="Wire it your way."
            as="span"
            className="lp-h2__l lp-h2__l--em"
            start={4}
          />
        </h2>

        <div className="lp-cols">
          <Reveal as="p" delay={1}>
            Six AI modules, a scheduler, an approval gate, and two feedback loops — laid
            out as a workflow you can see, drag, and rewire. Add a step, split a branch,
            point publish at a different set of accounts.
          </Reveal>
          <Reveal as="p" delay={2}>
            It's the pipeline from §2, made editable. What's below isn't a screenshot —
            it's the real canvas. Drag a node.
          </Reveal>
        </div>
      </div>

      <Reveal className="lp-wrap lp-canvas" delay={2}>
        <div className="lp-canvas__frame">
          <div className="lp-canvas__bar">
            <span className="lp-fig__dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span className="lp-mono">studio · draft</span>
            <Link to="/library" className="lp-canvas__open">
              Open full Studio <Arrow />
            </Link>
          </div>
          <div className="lp-canvas__body">
            <PipelinePreview />
          </div>
        </div>
        <ul className="lp-legend" aria-label="Node kinds">
          {LEGEND.map((k) => (
            <li key={k} className={`is-${k}`}>
              <i aria-hidden="true" />
              {KIND_LABEL[k]}
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}

// ── 04 the gate ──────────────────────────────────────────────────────────────
const TERMINAL = [
  { t: 'cmd', v: 'creatorflow run --asset weekly_vlog_042.mp4' },
  { t: 'out', v: 'clip       found 3 candidates          0:42–1:10, 4:03–4:31, 9:12–9:40' },
  { t: 'out', v: 'thumbnail  generated 2 variants         bold-text · face-closeup' },
  { t: 'out', v: 'metadata   drafted for youtube           62-char title · 3 tags' },
  { t: 'out', v: 'metadata   drafted for instagram         125-char caption' },
  { t: 'out', v: 'schedule   queued                        Thu 6:00 PM' },
  { t: 'bad', v: 'gate       awaiting approval              BLOCKED until reviewed' },
  { t: 'ok', v: 'approve    reviewed by @creator            thumbnail v2 chosen, title edited' },
  { t: 'ok', v: 'publish    posted · youtube, instagram     live' },
];

function Gate() {
  const [ref, shown] = useLinePlayback(TERMINAL.length, 240);

  return (
    <section className="lp-section" id="gate">
      <div className="lp-wrap">
        <SectionLabel n="04" t="The gate" />
        <h2 className="lp-h2">
          <RevealWords text="The most important step" as="span" className="lp-h2__l" />
          <RevealWords
            text="is the one that says wait."
            as="span"
            className="lp-h2__l lp-h2__l--em"
            start={4}
          />
        </h2>

        <div className="lp-gate">
          <div className="lp-gate__copy">
            <Reveal as="p" delay={1}>
              Auto-publish sounds great until it posts the wrong thumbnail at 2am. Every
              scheduled release sits behind an approval step — the draft, the metadata,
              the thumbnail, all reviewable before anything is eligible to go out.
            </Reveal>
            <Reveal as="p" delay={2}>
              Skip the gate and nothing publishes. That's deliberate: automation should
              remove the busywork, not the judgment call.
            </Reveal>
            <Reveal className="lp-gate__checks" delay={3}>
              <div>
                <strong>Thumbnail selected</strong>
                <span>nothing ships with a placeholder cover</span>
              </div>
              <div>
                <strong>Copy within platform limits</strong>
                <span>truncated titles and captions never reach the queue</span>
              </div>
              <div>
                <strong>An approver, by name</strong>
                <span>no anonymous auto-publish, ever</span>
              </div>
            </Reveal>
          </div>

          <div className="lp-term" ref={ref}>
            <div className="lp-term__bar" aria-hidden="true">
              <i />
              <i />
              <i />
              <span className="lp-mono">run · weekly_vlog_042</span>
            </div>
            <pre className="lp-term__body" aria-label="Example pipeline run output">
              {TERMINAL.slice(0, shown).map((l, i) => (
                <div className={`lp-term__l lp-term__l--${l.t}`} key={i}>
                  {l.t === 'cmd' && <span className="lp-term__p">$</span>}
                  {l.v}
                </div>
              ))}
              {shown < TERMINAL.length && <span className="lp-term__caret" />}
            </pre>
            <p className="lp-term__fine lp-mono">example run — illustrative, not live data</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── 05 platform — sticky stacked cards ───────────────────────────────────────
const CAPS = [
  {
    k: 'One shell, six modules',
    d: 'Thumbnails, metadata, scheduling, analytics, moderation and clips live behind one dashboard and one job-status pattern — not six disconnected tools with six different logins.',
  },
  {
    k: 'Platform-agnostic core',
    d: "Every platform's quirks live in a JSONB escape hatch, not the schema. Adding a new platform is a connector, not a migration.",
  },
  {
    k: 'Async by contract',
    d: 'Every long-running action returns a job immediately and never blocks the UI. Rendering, transcoding and LLM calls all run the same way, through the same jobs table.',
  },
  {
    k: 'A connector, not a rewrite',
    d: 'Each platform implements one interface — publish, fetch analytics, fetch comments, moderate a comment. YouTube first, then Instagram, without touching the other five modules.',
  },
  {
    k: 'Runs on Supabase',
    d: "Managed Postgres, Auth, Storage and Edge Functions — the infrastructure a lean team shouldn't have to hand-roll, with a real migration path to dedicated workers later.",
  },
  {
    k: 'The workflow is the interface',
    d: 'The same six modules that power the dashboard are the nodes in Studio — configure the pipeline visually and it is the same jobs table underneath, not a parallel system.',
  },
];

function Platform() {
  return (
    <section className="lp-section" id="platform">
      <div className="lp-wrap">
        <SectionLabel n="05" t="Platform" />
        <h2 className="lp-h2 lp-h2--tight">Built to be handed to a team.</h2>
      </div>

      <div className="lp-wrap lp-stack">
        {CAPS.map((c, i) => (
          <StackCard c={c} i={i} key={c.k} />
        ))}
      </div>
    </section>
  );
}

function StackCard({ c, i }: { c: (typeof CAPS)[number]; i: number }) {
  const tilt = useTilt3D<HTMLElement>(4);
  return (
    <article className="lp-stack__card" ref={tilt} style={{ ['--i' as string]: i }}>
      <span className="lp-stack__glare" aria-hidden="true" />
      <span className="lp-stack__n lp-mono">{String(i + 1).padStart(2, '0')}</span>
      <div>
        <h3>{c.k}</h3>
        <p>{c.d}</p>
      </div>
    </article>
  );
}

// ── cta ──────────────────────────────────────────────────────────────────────
function Cta() {
  const ref = useMagnetic<HTMLAnchorElement>(0.2);
  return (
    <section className="lp-cta">
      <div className="lp-wrap">
        <h2 className="lp-display lp-display--cta">
          <RevealWords as="span" className="lp-display__line" text="Stop tab-switching." />
        </h2>
        <Reveal className="lp-cta__actions" delay={2}>
          <Link ref={ref} to="/library" className="lp-btn lp-btn--solid lp-btn--lg">
            Open the Studio
            <Arrow />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

// ── footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="lp-footer">
      <div className="lp-wrap lp-footer__in">
        <a className="lp-nav__brand" href="#top">
          <Mark />
          <span>CreatorFlow</span>
        </a>
        <nav aria-label="Footer">
          <Link to="/library">Studio</Link>
          <a href="#pipeline">Pipeline</a>
          <a
            href="https://github.com/786AdiPY/Creatorflow/blob/main/social-media-automation-mvp-docs-supabase.md"
            target="_blank"
            rel="noreferrer"
          >
            Technical spec
          </a>
        </nav>
        <p className="lp-mono">Clip · Thumbnail · Metadata · Schedule · Approve · Publish · Analyze</p>
      </div>
    </footer>
  );
}
