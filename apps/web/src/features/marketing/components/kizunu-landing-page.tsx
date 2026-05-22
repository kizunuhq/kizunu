import { ArrowUpRight } from '@phosphor-icons/react'
import { Fragment, useCallback, useEffect, useRef, useState } from 'react'

import { KMark } from './kizunu-mark'

import '../styles/landing-page.css'

const navLinks = [
  { label: 'Docs', href: '#docs' },
  { label: 'Engine', href: '#engine' },
  { label: 'Open core', href: '#open-core' },
  { label: 'Github', href: 'https://github.com/kizunuhq/kizunu' },
]

const heroStats = [
  { key: 'License', value: 'AGPLv3' },
  { key: 'Channels', value: 'WA · Email · SMS · Voice' },
  { key: 'Runtime', value: 'Bun · Postgres' },
  { key: 'State', value: 'v0.1 / Experimental' },
]

const counterPoints = [
  {
    bad: 'Channel logic lives in the provider.',
    good: 'It belongs in the engine.',
  },
  {
    bad: 'Reply-stop is a webhook.',
    good: "It's a state transition.",
  },
  {
    bad: 'Workflow is glue.',
    good: 'Cadence is an aggregate.',
  },
  {
    bad: 'AI is a copilot bolted on.',
    good: 'The model reads the run.',
  },
]

type RunChip = 'done' | 'sent' | 'parsed' | 'exit' | 'live'

interface RunField {
  key: string
  val: string
  accent?: boolean
}

interface RunEvent {
  num: string
  phase: string
  ts: string
  main: string
  chip: RunChip
  fields: RunField[]
  intervention?: RunField[]
}

const runEvents: RunEvent[] = [
  {
    num: '01',
    phase: 'Trigger',
    ts: 'T+00:00.000',
    main: 'lead.qualified',
    chip: 'done',
    fields: [
      { key: 'source', val: 'intercom' },
      { key: 'trigger.id', val: 'evt_4ax9k' },
      { key: 'cadence.id', val: 'cdn_28aaf01b6e' },
    ],
  },
  {
    num: '02',
    phase: 'Route',
    ts: 'T+00:00:30',
    main: 'whatsapp · hello_v2_pt',
    chip: 'sent',
    fields: [
      { key: 'provider', val: 'whatsapp business cloud' },
      { key: 'channel.id', val: 'ch_wa_001' },
      { key: 'template', val: 'hello_v2_pt' },
      { key: 'status', val: 'delivered · ack 12:00:31' },
    ],
  },
  {
    num: '03',
    phase: 'Route',
    ts: 'T+02d 09:00',
    main: 'email · followup_v1',
    chip: 'sent',
    fields: [
      { key: 'provider', val: 'postmark' },
      { key: 'channel.id', val: 'ch_em_002' },
      { key: 'template', val: 'followup_v1' },
      { key: 'status', val: 'opened · 09:42' },
    ],
  },
  {
    num: '04',
    phase: 'Read',
    ts: 'T+05d 11:42:18',
    main: 'sms.inbound · reply parsed',
    chip: 'parsed',
    fields: [
      { key: 'provider', val: 'twilio' },
      { key: 'channel.id', val: 'ch_sm_003' },
      { key: 'payload', val: '"no thanks, please remove me"' },
    ],
    intervention: [
      { key: 'model', val: 'anthropic/claude-haiku-4.5', accent: true },
      { key: 'intent', val: 'opt-out · confidence 0.94' },
      { key: 'proposal', val: 'cadence.pause', accent: true },
      { key: 'policy.match', val: 'reply_stop ∈ allow' },
      { key: 'engine', val: 'accept · 11:42:18.301', accent: true },
    ],
  },
  {
    num: '05',
    phase: 'Resolve',
    ts: 'T+05d 11:42:19',
    main: 'reply-stopped',
    chip: 'exit',
    fields: [
      { key: 'outcome', val: 'reply_stop' },
      { key: 'hooks.fire', val: 'crm.update + slack.notify' },
      { key: 'cadence.end', val: 'final · no retries scheduled' },
    ],
  },
]

type Chip = 'core' | 'beta' | 'roadmap' | 'community' | 'live'

interface ProviderRow {
  name: string
  channel: string
  chip: Chip
}

const providers: ProviderRow[] = [
  { name: 'WhatsApp', channel: 'Business cloud', chip: 'core' },
  { name: 'Twilio', channel: 'SMS · Voice', chip: 'core' },
  { name: 'Postmark', channel: 'Transactional email', chip: 'core' },
  { name: 'Resend', channel: 'Email', chip: 'core' },
  { name: 'Vonage', channel: 'SMS · Voice', chip: 'beta' },
  { name: 'Telnyx', channel: 'SMS · Voice', chip: 'beta' },
  { name: 'MessageBird', channel: 'Omnichannel', chip: 'beta' },
  { name: 'OpenAI', channel: 'Model · Reply read', chip: 'core' },
  { name: 'Anthropic', channel: 'Model · Reply read', chip: 'core' },
  { name: 'Plivo', channel: 'SMS · Voice', chip: 'community' },
  { name: 'ElevenLabs', channel: 'Voice synthesis', chip: 'roadmap' },
  { name: 'Sendgrid', channel: 'Email', chip: 'community' },
]

const quickstart = [
  { dollar: '$', cmd: 'bun create kizunu', arg: 'my-cadence' },
  { dollar: '$', cmd: 'cd', arg: 'my-cadence' },
  { dollar: '$', cmd: 'bun db:setup', arg: '' },
  { dollar: '$', cmd: 'bun dev', arg: '' },
]

const takehomeMeta = [
  { key: 'License', value: 'AGPLv3' },
  { key: 'Repo', value: 'kizunuhq/kizunu' },
  { key: 'Runtime', value: 'Bun · Postgres' },
]

const footerLinks = [
  { label: 'GitHub', href: 'https://github.com/kizunuhq/kizunu' },
  { label: 'Docs', href: '#docs' },
  { label: 'Discord', href: '#discord' },
  { label: 'X / Twitter', href: '#x' },
  { label: 'License', href: '#license' },
]

interface SectionMeta {
  id: string
  num: string
  name: string
  desc: string
}

const sectionMeta: SectionMeta[] = [
  { id: 'hero', num: '01', name: 'Hero', desc: 'kizunu v0.1 · experimental cadence infra' },
  { id: 'thesis', num: '02', name: 'Thesis', desc: 'closed stacks vs the engine' },
  { id: 'engine', num: '03', name: 'Engine', desc: 'cadence aggregate · live trace' },
  { id: 'open-core', num: '04', name: 'Open core', desc: 'providers · models · sdk' },
  { id: 'signal', num: '05', name: 'Signal', desc: 'the model is a participant' },
  { id: 'self-host', num: '06', name: 'Take it home', desc: 'self-host · fork · ship' },
  { id: 'use', num: '07', name: 'Run it', desc: 'engine continues at the edge' },
]

export function KizunuLandingPage() {
  return (
    <div className="kz-page">
      <Nav />
      <SectionBreadcrumb />
      <Hero />
      <Thesis />
      <Engine />
      <OpenCore />
      <Signal />
      <TakeItHome />
      <CtaSection />
      <Footer />
    </div>
  )
}

function SectionBreadcrumb() {
  const [currentId, setCurrentId] = useState<string>('hero')
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 96)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const sections = sectionMeta
      .map((s) => document.getElementById(s.id))
      .filter((n): n is HTMLElement => n !== null)
    if (!sections.length) return undefined
    const observer = new IntersectionObserver(
      (entries) => {
        const top = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (top) setCurrentId(top.target.id)
      },
      { rootMargin: '-32% 0px -50% 0px', threshold: [0, 0.2, 0.5, 0.8, 1] },
    )
    sections.forEach((s) => observer.observe(s))
    return () => observer.disconnect()
  }, [])

  const current = sectionMeta.find((s) => s.id === currentId) ?? sectionMeta[0]
  if (!current) return null
  const stepIdx = sectionMeta.findIndex((s) => s.id === currentId)

  return (
    <div className={`kz-breadcrumb${visible ? ' kz-breadcrumb--visible' : ''}`} aria-hidden="true">
      <div className="kz-breadcrumb-inner" key={current.id}>
        <span className="kz-breadcrumb-mark">
          <span className="kz-breadcrumb-dot" />
          {current.num} / {current.name}
        </span>
        <span className="kz-breadcrumb-desc">{current.desc}</span>
        <span className="kz-breadcrumb-step">
          step {String(stepIdx + 1).padStart(2, '0')} /{' '}
          {String(sectionMeta.length).padStart(2, '0')}
        </span>
      </div>
    </div>
  )
}

function Nav() {
  return (
    <header className="kz-nav">
      <a href="/" className="kz-nav-mark" aria-label="Kizunu home">
        <span className="kz-nav-mark-text">
          <span className="kz-nav-mark-k">K</span>izunu
        </span>
      </a>

      <nav className="kz-nav-links" aria-label="Primary">
        {navLinks.map((link) => (
          <a key={link.label} className="kz-nav-link" href={link.href}>
            {link.label}
          </a>
        ))}
      </nav>

      <div className="kz-nav-tail">
        <NavUptime />
        <a className="kz-nav-cta" href="#use">
          Use Kizunu
          <ArrowUpRight size={14} weight="bold" />
        </a>
      </div>
    </header>
  )
}

function NavUptime() {
  const [, setTick] = useState(0)
  const startRef = useRef<number | null>(null)

  if (startRef.current === null) {
    const stored = typeof window !== 'undefined' ? sessionStorage.getItem('kz-uptime-start') : null
    if (stored) {
      startRef.current = Number(stored)
    } else {
      const offsetMs = (5 + Math.random() * 10) * 24 * 60 * 60 * 1000
      const start = Date.now() - offsetMs
      startRef.current = start
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('kz-uptime-start', String(start))
      }
    }
  }

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000)
    return () => window.clearInterval(id)
  }, [])

  const elapsed = Math.max(0, Date.now() - (startRef.current ?? Date.now()))
  const days = Math.floor(elapsed / 86_400_000)
  const hours = Math.floor((elapsed % 86_400_000) / 3_600_000)
  const mins = Math.floor((elapsed % 3_600_000) / 60_000)
  const secs = Math.floor((elapsed % 60_000) / 1000)
  const pad = (n: number) => String(n).padStart(2, '0')

  return (
    <span className="kz-nav-uptime" aria-label="System uptime">
      <span className="kz-nav-uptime-dot" />
      <span className="kz-nav-uptime-label">uptime</span>
      <span className="kz-nav-uptime-value">
        {pad(days)}d {pad(hours)}h {pad(mins)}m{' '}
        <span className="kz-nav-uptime-secs">{pad(secs)}s</span>
      </span>
    </span>
  )
}

const headlineWords: Array<{ text: string; em?: boolean }> = [
  { text: 'Your' },
  { text: 'CRM' },
  { text: "shouldn't" },
  { text: 'own', em: true },
  { text: 'the' },
  { text: 'conversation.' },
]

function Hero() {
  const [cinema] = useState<'on' | 'off'>(() => {
    if (typeof window === 'undefined') return 'off'
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return 'off'
    if (sessionStorage.getItem('kz-hero-seen')) return 'off'
    return 'on'
  })

  useEffect(() => {
    if (cinema === 'on') {
      sessionStorage.setItem('kz-hero-seen', '1')
    }
  }, [cinema])

  return (
    <section className="kz-hero" id="hero" data-cinema={cinema}>
      <div
        className="kz-section-coord kz-reveal kz-reveal-0"
        style={{ marginBottom: 'clamp(24px, 2.6vw, 40px)' }}
      >
        <div className="kz-section-coord-side">
          <span className="kz-mono-loud">01 / HERO</span>
          <span className="kz-mono">Kizunu v0.1 · experimental cadence infra</span>
        </div>
        <div className="kz-section-coord-side">
          <span className="kz-mono">build · v0.1.0-alpha</span>
        </div>
      </div>

      <div className="kz-hero-grid">
        <div>
          <h1 className="kz-hero-headline">
            {headlineWords.map((word, i) => (
              <Fragment key={i}>
                <span className="kz-hero-word" style={{ animationDelay: `${140 + i * 75}ms` }}>
                  {word.em ? <em>{word.text}</em> : word.text}
                </span>
                {i < headlineWords.length - 1 ? ' ' : ''}
              </Fragment>
            ))}
          </h1>
          <p className="kz-hero-sub kz-reveal kz-reveal-3">
            Kizunu is an open-source cadence engine for multi-channel outbound. WhatsApp, email,
            SMS, voice. Pluggable providers, reply-stop in the engine, no CRM tax on your operating
            model.
          </p>
          <div className="kz-hero-actions kz-reveal kz-reveal-4">
            <a className="kz-cta kz-cta-primary" href="#use">
              Use Kizunu
              <CtaArrow />
            </a>
            <a
              className="kz-cta kz-cta-secondary"
              href="https://github.com/kizunuhq/kizunu"
              target="_blank"
              rel="noreferrer"
            >
              Read the source
              <ArrowUpRight size={14} weight="bold" />
            </a>
          </div>
        </div>

        <div className="kz-hero-mark" aria-hidden="true">
          <KMark label="Kizunu mark" />
          <div className="kz-hero-mark-meta kz-reveal kz-reveal-3">
            <span>Node · 00</span>
            <span>Routing live</span>
          </div>
        </div>
      </div>

      <dl className="kz-hero-stats kz-reveal kz-reveal-4">
        {heroStats.map((stat) => (
          <div key={stat.key} className="kz-hero-stat">
            <dt className="kz-hero-stat-key">{stat.key}</dt>
            <dd className="kz-hero-stat-val">{stat.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function Thesis() {
  const listRef = useRef<HTMLOListElement>(null)
  const [booted, setBooted] = useState(false)

  useEffect(() => {
    const node = listRef.current
    if (!node) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setBooted(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <section className="kz-section kz-flip-char" id="thesis">
      <div className="kz-section-coord">
        <div className="kz-section-coord-side">
          <span className="kz-mono-loud">02 / THESIS</span>
          <span className="kz-mono">Closed stacks vs the engine</span>
        </div>
        <div className="kz-section-coord-side">
          <span className="kz-mono">4 fractures · 4 corrections</span>
        </div>
      </div>

      <div className="kz-thesis-grid">
        <div className="kz-thesis-mark" aria-hidden="true">
          <KMark />
        </div>

        <div className="kz-thesis-text">
          <h2>
            Closed stacks break between the tools that <em>pretend</em> to cooperate.
          </h2>

          <ol
            ref={listRef}
            className={`kz-counter-list${booted ? ' kz-counter-list--booted' : ''}`}
          >
            {counterPoints.map((point, idx) => (
              <li key={point.bad} className="kz-counter-item">
                <span className="kz-counter-num">{String(idx + 1).padStart(2, '0')}</span>
                <div>
                  <div className="kz-counter-bad">{point.bad}</div>
                  <div className="kz-counter-arrow">→</div>
                  <div className="kz-counter-good">{point.good}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

function Engine() {
  return (
    <section className="kz-section kz-engine" id="engine">
      <div className="kz-section-coord">
        <div className="kz-section-coord-side">
          <span className="kz-mono-loud">03 / ENGINE</span>
          <span className="kz-mono">cadence aggregate · live trace</span>
        </div>
        <div className="kz-section-coord-side">
          <span className="kz-mono">5 events · model-mediated</span>
        </div>
      </div>

      <div className="kz-engine-head">
        <h2>
          The engine is a <em>state machine.</em> The model is a participant.
        </h2>
        <p className="kz-body-lg">
          Below is a real cadence run, traced end to end. Trigger enters, routes fire across
          channels, an inbound reply lands at T+5d, the model reads it, proposes a state transition,
          and the engine accepts it. Reply-stop is one event, not a webhook someone forgot to wire.
        </p>
      </div>

      <CadenceRun />
    </section>
  )
}

function CadenceRun() {
  const ref = useRef<HTMLElement>(null)
  const [phase, setPhase] = useState<'static' | 'prep' | 'live'>('static')

  useEffect(() => {
    const node = ref.current
    if (!node) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    setPhase('prep')
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setPhase('live')
          observer.disconnect()
        }
      },
      { threshold: 0.2, rootMargin: '0px 0px -8% 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <article ref={ref} data-phase={phase} className="kz-run" aria-label="Live cadence run trace">
      <header className="kz-run-head">
        <span className="kz-run-head-id">trace · cdn_28aaf01b6e</span>
        <span>5 events</span>
        <span>4 channels touched</span>
        <span>final: reply_stop</span>
        <span className="kz-run-live">
          <span className="kz-run-live-dot" />
          {phase === 'live' ? 'streaming · captured T+5d' : 'replay · paused at T+5d'}
        </span>
      </header>
      <ol className="kz-run-rows">
        {runEvents.map((event) => (
          <RunRow key={event.num} event={event} />
        ))}
      </ol>
    </article>
  )
}

function RunRow({ event }: { event: RunEvent }) {
  return (
    <li className={`kz-run-row kz-run-row--${event.chip}`}>
      <div className="kz-run-phase">
        <span className="kz-run-phase-num">{event.num} / phase</span>
        <span className="kz-run-phase-name">{event.phase}</span>
      </div>
      <div className="kz-run-ts">{event.ts}</div>
      <div className="kz-run-body">
        <div className="kz-run-main">{event.main}</div>
        <dl className="kz-run-fields">
          {event.fields.map((f) => (
            <Fragment key={f.key}>
              <dt>{f.key}</dt>
              <dd>{f.val}</dd>
            </Fragment>
          ))}
        </dl>
        {event.intervention && (
          <div className="kz-run-intervention">
            <div className="kz-run-intervention-inner">
              <div className="kz-run-intervention-head">
                <span className="kz-run-intervention-glyph">◢</span>
                Model intervention · accepted
              </div>
              <dl className="kz-run-fields kz-run-fields--intervention">
                {event.intervention.map((f) => (
                  <Fragment key={f.key}>
                    <dt>{f.key}</dt>
                    <dd className={f.accent ? 'kz-run-fields-accent' : undefined}>{f.val}</dd>
                  </Fragment>
                ))}
              </dl>
            </div>
          </div>
        )}
      </div>
      <span className={`kz-chip kz-chip-${event.chip}`}>{event.chip}</span>
    </li>
  )
}

function OpenCore() {
  const manifestRef = useRef<HTMLOListElement>(null)
  const [booted, setBooted] = useState(false)

  useEffect(() => {
    const node = manifestRef.current
    if (!node) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setBooted(true)
          observer.disconnect()
        }
      },
      { threshold: 0.18, rootMargin: '0px 0px -8% 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <section className="kz-section kz-open" id="open-core">
      <div className="kz-section-coord">
        <div className="kz-section-coord-side">
          <span className="kz-mono-loud">04 / OPEN CORE</span>
          <span className="kz-mono">Providers · Models · SDK</span>
        </div>
        <div className="kz-section-coord-side">
          <span className="kz-mono">{providers.length} active · 1 open contract</span>
        </div>
      </div>

      <div className="kz-open-head">
        <h2 className="kz-open-headline">
          Providers plug in. <em>The engine stays yours.</em>
        </h2>
        <p className="kz-body-lg">
          Pluggable adapters for sending, receiving, model reads, and voice synthesis. One stable
          contract per channel. Bring your own provider, or fork ours.
        </p>
      </div>

      <ol
        ref={manifestRef}
        className={`kz-manifest${booted ? ' kz-manifest--booted' : ''}`}
        aria-label="Provider catalog"
      >
        <li className="kz-manifest-head" aria-hidden="true">
          <span>Port</span>
          <span>Provider</span>
          <span>Channel</span>
          <span>State</span>
        </li>
        {providers.map((row, idx) => (
          <li key={row.name} className="kz-manifest-row">
            <span className="kz-manifest-port">{String(idx + 1).padStart(2, '0')}</span>
            <span className="kz-manifest-name">{row.name}</span>
            <span className="kz-manifest-channel">{row.channel}</span>
            <span className={`kz-chip kz-chip-${row.chip}`}>{row.chip}</span>
          </li>
        ))}
      </ol>

      <a className="kz-byo" href="#sdk">
        <div className="kz-byo-meta">
          <span className="kz-mono">port · {String(providers.length + 1).padStart(2, '0')}</span>
          <span className="kz-chip kz-chip-live">open contract</span>
        </div>
        <div className="kz-byo-body">
          <div className="kz-byo-title">Build your own provider</div>
          <p className="kz-byo-sub">
            One TypeScript interface. Implement send, receive, and reply-read. Drop it into the
            engine alongside the rest. Fork ours if you'd rather start from a known shape.
          </p>
        </div>
        <span className="kz-byo-arrow">
          open the SDK
          <ByoArrow />
        </span>
      </a>
    </section>
  )
}

function Signal() {
  const colsRef = useRef<HTMLDivElement>(null)
  const [booted, setBooted] = useState(false)

  useEffect(() => {
    const node = colsRef.current
    if (!node) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setBooted(true)
          observer.disconnect()
        }
      },
      { threshold: 0.2, rootMargin: '0px 0px -8% 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <section className="kz-section" id="signal">
      <div className="kz-section-coord">
        <div className="kz-section-coord-side">
          <span className="kz-mono-loud">05 / SIGNAL</span>
          <span className="kz-mono">The model is a participant</span>
        </div>
        <div className="kz-section-coord-side">
          <span className="kz-mono">model contract · v0</span>
        </div>
      </div>

      <div className="kz-signal-grid">
        <div className="kz-signal-mark" aria-hidden="true">
          <KMark variant="scanned" />
        </div>

        <div className="kz-signal-text">
          <h2>
            The model should read the <em>state</em>, not the screenshot.
          </h2>
          <p className="kz-body-lg">
            Replies, intent, sentiment, and entity reads land inside the run as first-class events.
            No screenshot harness, no agent loop pretending to drive a CRM. The cadence aggregate is
            the substrate; the model is one more participant on it.
          </p>

          <div ref={colsRef} className={`kz-signal-cols${booted ? ' kz-signal-cols--booted' : ''}`}>
            <div>
              <h3>What the model sees</h3>
              <p>
                The active cadence run, the channel transcript, prior outcomes, and the explicit
                policy on what it&apos;s allowed to change.
              </p>
            </div>
            <div>
              <h3>What it can do</h3>
              <p>
                Classify replies, propose state transitions, draft next steps. Every action is a
                proposed event the engine accepts or rejects.
              </p>
            </div>
            <div>
              <h3>What it cannot do</h3>
              <p>
                Mutate cadence state directly. Drive a UI. Make side effects the engine did not
                authorize. The model is bound by the same contract as a provider.
              </p>
            </div>
            <div>
              <h3>Bring your own</h3>
              <p>
                OpenAI, Anthropic, local models, your fine-tune. One contract. The engine treats
                them all as participants, not features.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function TakeItHome() {
  return (
    <section className="kz-section kz-takehome" id="self-host">
      <div className="kz-section-coord">
        <div className="kz-section-coord-side">
          <span className="kz-mono-loud">06 / TAKE IT HOME</span>
          <span className="kz-mono">Self-host · Fork · Ship</span>
        </div>
        <div className="kz-section-coord-side">
          <span className="kz-mono">Repo: kizunuhq/kizunu</span>
        </div>
      </div>

      <div className="kz-takehome-grid">
        <div>
          <h2>Self-host. Fork. Ship in a weekend.</h2>
          <p className="kz-body-lg">
            One repo. Bun + Postgres. AGPLv3. No managed-tier-only features, no closed scheduler, no
            SaaS gate on what your operating model is allowed to be.
          </p>

          <dl className="kz-takehome-meta">
            {takehomeMeta.map((cell) => (
              <div key={cell.key} className="kz-takehome-meta-cell">
                <dt className="kz-takehome-meta-key">{cell.key}</dt>
                <dd className="kz-takehome-meta-val">{cell.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <CodeBlock />
      </div>
    </section>
  )
}

const CHAR_INTERVAL_MS = 24
const LINE_HOLD_MS = 480

function CodeBlock() {
  const ref = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<'static' | 'prep' | 'armed'>(() => {
    if (typeof window === 'undefined') return 'static'
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return 'static'
    return 'prep'
  })
  const [copied, setCopied] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (phase !== 'prep') return undefined
    const node = ref.current
    if (!node) return undefined
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setPhase('armed')
          observer.disconnect()
        }
      },
      { threshold: 0.35 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [phase])

  useEffect(() => {
    if (phase !== 'armed') return undefined
    const total =
      quickstart.reduce(
        (sum, line) => sum + `${line.dollar} ${line.cmd}${line.arg ? ` ${line.arg}` : ''}`.length,
        0,
      ) *
        CHAR_INTERVAL_MS +
      (quickstart.length - 1) * LINE_HOLD_MS +
      280
    const t = window.setTimeout(() => {
      setReady(true)
      window.setTimeout(() => setReady(false), 900)
    }, total)
    return () => window.clearTimeout(t)
  }, [phase])

  const onCopy = useCallback(() => {
    const text = quickstart
      .map((line) => `${line.dollar} ${line.cmd}${line.arg ? ` ${line.arg}` : ''}`)
      .join('\n')
    navigator.clipboard?.writeText(text).catch(() => null)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }, [])

  let cumulativeDelay = 0
  const lines = quickstart.map((line) => {
    const dollarPart = `${line.dollar} `
    const cmdPart = line.cmd
    const argPart = line.arg ? ` ${line.arg}` : ''
    const fullText = `${dollarPart}${cmdPart}${argPart}`
    const startDelay = cumulativeDelay
    cumulativeDelay += fullText.length * CHAR_INTERVAL_MS + LINE_HOLD_MS
    return { line, dollarPart, cmdPart, argPart, startDelay }
  })

  const copyLabel = copied ? '[ copied ]' : ready ? '[ ready ]' : '[ copy ]'

  return (
    <div
      ref={ref}
      data-phase={phase}
      className="kz-codeblock"
      role="figure"
      aria-label="Quickstart commands"
    >
      <div className="kz-codeblock-head">
        <span>quickstart · bash</span>
        <button type="button" className="kz-codeblock-copy" onClick={onCopy}>
          {copyLabel}
        </button>
      </div>
      {lines.map(({ line, dollarPart, cmdPart, argPart, startDelay }) => (
        <span key={line.cmd + line.arg} className="kz-codeblock-line">
          <TypedSegment text={dollarPart} startDelay={startDelay} className="kz-codeblock-dollar" />
          <TypedSegment
            text={cmdPart}
            startDelay={startDelay + dollarPart.length * CHAR_INTERVAL_MS}
          />
          {argPart && (
            <TypedSegment
              text={argPart}
              startDelay={startDelay + (dollarPart.length + cmdPart.length) * CHAR_INTERVAL_MS}
              className="kz-codeblock-arg"
            />
          )}
        </span>
      ))}
    </div>
  )
}

function TypedSegment({
  text,
  startDelay,
  className,
}: {
  text: string
  startDelay: number
  className?: string
}) {
  return (
    <span className={className}>
      {text.split('').map((char, i) => (
        <span
          key={i}
          className="kz-codeblock-char"
          style={{ animationDelay: `${startDelay + i * CHAR_INTERVAL_MS}ms` }}
        >
          {char === ' ' ? ' ' : char}
        </span>
      ))}
    </span>
  )
}

function CtaSection() {
  const ref = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <section
      ref={ref}
      className={`kz-cta-section${visible ? ' kz-cta-section--visible' : ''}`}
      id="use"
    >
      <div className="kz-section-coord">
        <div className="kz-section-coord-side">
          <span className="kz-mono-loud">07 / RUN IT</span>
          <span className="kz-mono">Engine continues at the edge</span>
        </div>
        <div className="kz-section-coord-side">
          <span className="kz-mono">AGPLv3 · self-host first</span>
        </div>
      </div>

      <div className="kz-cta-grid">
        <div>
          <h2>
            Run the <em>engine.</em>
          </h2>
          <p className="kz-cta-sub">
            Or read the source first. Either move is correct. The point is the operating model stays
            yours.
          </p>

          <div className="kz-cta-actions">
            <a className="kz-cta kz-cta-primary" href="#use">
              Use Kizunu
              <CtaArrow />
            </a>
            <a
              className="kz-cta kz-cta-secondary"
              href="https://github.com/kizunuhq/kizunu"
              target="_blank"
              rel="noreferrer"
            >
              github.com/kizunu
              <ArrowUpRight size={14} weight="bold" />
            </a>
          </div>
        </div>

        <div />
      </div>

      <div className="kz-cta-edge-mark" aria-hidden="true">
        <KMark />
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="kz-footer">
      <p className="kz-footer-tagline">Cadence infrastructure for opinionated outbound teams.</p>
      <div className="kz-footer-meta">
        <span>Kizunu v0.1</span>
        {footerLinks.map((link) => (
          <a key={link.label} href={link.href}>
            {link.label}
          </a>
        ))}
      </div>
    </footer>
  )
}

function CtaArrow() {
  return (
    <svg
      className="kz-cta-arrow"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      aria-hidden="true"
    >
      <path d="M 1 7 L 13 7" />
      <path d="M 8 2 L 13 7 L 8 12" />
    </svg>
  )
}

function ByoArrow() {
  return (
    <svg viewBox="0 0 32 14" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M 0 7 L 30 7" />
      <path d="M 22 1 L 30 7 L 22 13" />
    </svg>
  )
}
