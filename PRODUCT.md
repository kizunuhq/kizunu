# PRODUCT.md

> Design context for kizunu. The brand and product surfaces share one
> design system. See `DESIGN.md` for tokens and rules.

---

## register

**product** — the primary surface we ship is the dashboard at
`apps/web` (Pipedrive stage → WhatsApp cadence → reply-stop → mark
lost). The eventual marketing site lives under the same system; brand
pages reuse the product tokens, with the landing kicker / display
pattern documented in `DESIGN.md`.

---

## what kizunu is

Open-source, channel-agnostic **sales engagement engine**. Multi-channel
outbound cadences with millisecond reply-stop and pluggable providers.
WhatsApp is the first channel, but the engine is not WhatsApp-specific:
Meta Cloud API, Telegram, email and SMS enter as plugins behind frozen
contracts; CRMs (Pipedrive, HubSpot) connect the same way.

A sales operator drops a Pipedrive stage onto a cadence, watches the
queue drain, and when a prospect replies the engine stops touching them
in the same heartbeat. v0.1 is the contract: one real pilot run end to
end. Anything that does not run is not done.

The aesthetic answer to that product: a **developer-grade control
panel** — high-density, monospace-leaning, dashed dividers, sharp 2px
corners, OKLCH neutrals tinted just enough to feel warm under long
hours. Not a CRM. Not a chat app. An **engine surface**.

---

## users

Two operators, one product, neither needs an introduction screen.

- **Revenue engineer / sales-ops** (primary). Reads code, runs SQL,
  writes a cadence in five minutes, expects keyboard shortcuts. Lives
  in the dashboard, sometimes in the database. Hates anything that
  feels like a CRM and especially hates anything that bounces a reply
  to a sequence after the prospect already said "yes."
- **Founder / IC seller** (secondary). Self-hosts because their pipe is
  too small to pay SalesLoft. Wants the WhatsApp cadence to look
  serious, the reply-stop to be loud, the analytics to be honest. Will
  forgive missing surface area; will not forgive a touched prospect.

Both expect the surface to **respect their time** — no nested cards,
no modals as a first thought, no spinners pretending to be progress.

---

## product purpose

Run real outbound, stop instantly when a human replies, and let the
operator audit every touch. The dashboard makes three states visible
at all times:

1. **What is queued** (next touches, when, on what channel).
2. **What just happened** (sent / delivered / read / replied / stopped).
3. **Why a prospect was dropped** (reply-stop, opt-out, hard-bounce,
   stage-out).

If any of those three answers requires a click, the design failed.

---

## voice and tone

Lowercase, bracketed mono kicker labels, no exclamations, no marketing
softeners. The product talks like an engineer commenting a config
file: **what it does, what it refuses to do, in that order.**

**Always:**
- Body copy and footer copy are **lowercase**. Example footer line:
  _"the open-source, channel-agnostic sales engagement engine. built
  for revenue engineers, refuses to touch a prospect who just replied."_
- Section kickers are **bracketed mono**, e.g.
  `[Engine that respects reply-stop in milliseconds]`,
  `[Cadence builder, not a campaign tool]`,
  `[How a touch reaches a prospect]`.
- Numbered steps in flows use bracketed mono: `[01]`, `[02]`, `[03]`,
  `[04]` — never `1.`, never circles around the number.
- Display headlines are **sentence case**, balanced, technical claim
  first. Example: `Outbound cadences that stop the instant a prospect
  replies.`

**Never:**
- Em dashes, ever. Comma, colon, semicolon, period, parenthesis.
- "Powerful," "seamless," "magical," "delight," "supercharge,"
  "next-generation," "world-class."
- Exclamation marks.
- Title-cased headings outside of the display headline.
- The word "platform." kizunu is an **engine**.

---

## brand
### name and pronunciation

**kizunu** — always lowercase in body, footer, kickers, code. Title
case (`Kizunu`) only in the logo wordmark / favicon alt text / HTML
`<title>`.

### positioning sentence

> the open-source, channel-agnostic sales engagement engine. built for
> revenue engineers, runs for sellers, refuses to touch a prospect who
> just replied.

That sentence is the footer paragraph. It is also the OG description.
It is also the meta tag. One sentence, three places.

### accent palette

Seven named accents on top of an OKLCH neutral spine: `green` (primary),
`pink`, `yellow`, `yellow-100`, `yellow-600`, `blue`, `orange`. Green
leads because sales engagement is about a pipeline that converts;
yellow/pink/orange carry warning and failure states; blue is reserved
for informational metadata. Specific values in `DESIGN.md`.

Use of color is **restrained by default, committed on hero sections.**
The default page is OKLCH neutrals only. Accent appears in three
places, never four:

- the **mono kicker** label (`text-kizunu-green text-xs font-mono`),
- the **status dots** on cadence rows (`replied` = green, `stopped` =
  yellow, `failed` = pink),
- the **ASCII aurora** background tint behind the hero / footer (the
  signature canvas component, tinted with the primary accent variable).

---

## anti-references

Match-and-refuse. If a screen starts to look like any of these, we
have failed.

- **SalesLoft, Outreach, Apollo, Lemlist.** Title-case everything,
  rainbow-pill statuses, modal-first workflows, navy + electric blue,
  sentence case fighting with title case, hero metric stacks. We are
  the opposite of every screenshot on outreach.io.
- **Generic CRM UI.** Sidebar of icons, three columns of cards, "New
  Deal" gradient button. We do not build that.
- **The chatbot-builder lane.** Flowchart drag-and-drop, "drag nodes
  to wire your bot," rounded purple gradients. Cadences are
  configuration, not a canvas.
- **"AI workflow tool" aesthetic.** SaaS-cream backgrounds, soft
  shadows, rounded-2xl pill buttons, hero gradient text. The current
  saturated lane; we sit on the other side with sharp 2px corners and
  OKLCH neutrals.
- **Dark-as-default observability.** Grafana / Datadog / Linear-clone.
  We support dark, but our default is **light** — operator running a
  cadence at 10am, not an SRE at 2am.
- **n8n / Zapier / Retool maximalism.** Visible plumbing as the
  feature. We hide plumbing; we show outcomes.

---

## strategic principles

1. **Show the queue, hide the engine.** Operators see touches and
   states. Drizzle, NestJS, Bun, Meta Cloud API — none of these names
   appear in product surface. They appear once, in the footer, like a
   build stamp.
2. **Reply-stop is a primary state, not an edge case.** "Stopped:
   replied 3m ago" is a first-class row, not a tooltip.
3. **Dashed lines, not boxes.** `border-dashed` full-width horizontal
   rules are the structural device. We use them to separate sections
   without wrapping them.
4. **Mono carries the metadata.** Every timestamp, channel name, stage
   name, count, key — `font-mono`. Sans is for prose only.
5. **Two density modes.** Default: comfortable. `cmd-shift-d`:
   compact (reduce row height, hide secondary metadata). Operators
   live in compact.
6. **No empty-state cute illustrations.** Empty states are a single
   sentence in mono, lowercase, and the single command to populate
   the view.

---

## scope this document covers

- The product surface at `apps/web` (current).
- The eventual marketing surface (landing, docs, changelog) once it
  exists; the system is built so brand pages drop into the same tokens.

Out of scope:
- The API (`apps/api`) surface — it is JSON, no design rules apply.
- Email templates — covered in a separate doc when transactional
  email lands (deferred per ROADMAP).
