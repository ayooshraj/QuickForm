# QuickForm — Project Brief & Working Notes

Status: pre-build, planning stage. Written for the Accenture interview deadline — carry this into Claude Code as the working reference.

---

## 1. Where this sits

Two backend portfolio projects were planned beyond Streamly (already built, already on the CV): **QuickForm**, then **FlowDesk** (multi-tenant support/ticketing backend — Docker, GitHub Actions, AWS EC2). QuickForm is first.

Reality check: the CVs on file in this Claude project (uploaded May 2026) list Streamly, OpsDesk, and Translatify — not QuickForm. More recent planning notes say OpsDesk and Translatify were dropped and QuickForm/FlowDesk took their place, so a newer CV version (not in this project's files) is presumably what's with Accenture. Which CV Accenture actually has is unconfirmed — Accenture couldn't say either. QuickForm now has to exist, deployed and understood, before the interview, able to be defended regardless of which CV wording they're holding.

---

## 2. Original scope (as first drafted)

Multi-tenant form builder, Typeform/Google Forms shaped: orgs sign up, build forms with dynamic fields, share a public link, responses land in a live dashboard.

Stack: MongoDB, Express, React, Node (MERN) + Socket.IO for live response updates + JWT auth + Vercel deploy.

Architecture snag flagged at the time: Socket.IO needs a persistent connection; Vercel's serverless functions don't hold one open. Three options were on the table — split deploy (Vercel for frontend, an always-on Express+Socket.IO server on Render/Railway, same shape Streamly likely already uses), a managed realtime service (Pusher/Ably), or drop true push for polling. Not resolved yet — revisit once the pivot below is locked in, since it changes how much Socket.IO even matters.

---

## 3. The problem with that scope

Strip the multi-tenancy out and it's the same shape as Google Forms: build a form, collect responses, view a dashboard — a thing that already exists, for free, with a better builder UI than a solo few-week build will produce. Multi-tenancy makes it a harder *engineering exercise*; it doesn't make it a different *product*. "It demonstrates tenant-scoped backend architecture" answers why it was worth building for the CV, not why a user would ever choose it over Google Forms — and that gap is exactly what an interviewer probes.

The brief was "industry level that helps devs" — but Google Forms' user is a non-technical person building a survey. If the real target user is a developer, the product has to change shape, not just get a backend bolted underneath the same builder UI.

---

## 4. The pivot — dev-facing form-backend API

Stop building the form itself. Developers already know HTML/React; what they don't want to hand-roll is the backend behind a contact form on their own static site or side project. That's the actual gap Formspree / Getform fill: a dev writes their own `<form>`, points its `action` or a `fetch` call at an API endpoint with an API key, and the service handles storage, spam filtering, a notification on new submission, webhook delivery to their own systems, and a dashboard to browse what came in.

What this changes, each one a real backend topic:

- **Auth**: API-key auth per project, not login-based tenant auth — a different, arguably more relevant, security model for a backend-as-a-service.
- **Core loop**: unauthenticated public submit endpoint → validate → store → notify. Same shape as before, different audience.
- **Socket.IO**: demoted from load-bearing feature to optional polish (or dropped — see open architecture question below).
- **New surface area**: webhook delivery (with retries/signing), rate limiting per API key, basic spam detection on the public endpoint.
- **One-line pitch**: "the backend Google Forms doesn't give you when your form lives on your own site."

Why this is *less* build time, not more, under deadline pressure: the hard part of a visual form builder is the builder UI itself — field types, conditional logic, a live preview. The API-backend version drops that entirely. Less frontend, more backend depth — the right trade when time is short and the CV target is a backend/full-stack role.

Alternative considered and set aside: keep the builder UI, differentiate on something Google Forms deliberately doesn't offer (open API, embeddable widget SDK). Weaker pitch — still competing on an axis Google Forms already wins.

---

## 5. Why this is no longer just an exercise

QuickForm is now a resume claim that has to survive an Accenture interview, not a hypothetical portfolio piece. Two live risks:

1. **Resume consistency.** If the submitted CV already describes QuickForm in specific terms ("multi-tenant SaaS form builder with live dashboard"), showing up with a differently-shaped product needs to read as a deliberate evolution, not a contradiction. Need the actual bullet text (whichever CV version is likely in play) to check this before committing further, or default to framing the pitch generically enough to cover both.
2. **Timeline.** Interview round is next after a completed Communication assessment (Nov 2026) — exact date not yet known. This is what should set scope. Under ~2 weeks, the build is: API-key tenant auth, submit endpoint, one notification channel (email only — skip Slack/webhook-to-third-party for now), one dashboard view. Everything past that is "designed for, not yet built" — a legitimate, honest answer in an interview, and far better than claiming a feature that can't be demoed live.

---

## 6. Open questions (blocking next step)

- [ ] What does the actual submitted CV say about QuickForm, if anything specific — paste the bullet if available.
- [ ] Accenture interview date / rough window — sets how aggressively scope gets cut.
- [ ] Final call on Socket.IO: drop for MVP, keep as a stretch item once the core loop works, or resolve the Vercel-hosting snag now and build it in from the start.

---

## 7. Working agreement

- **Where**: actual code, repo, and deploy happen in Claude Code (or whatever local dev setup) — not in this chat. This thread is for the thinking layer: locking the angle, dry-running a concept before it gets written, prepping how to explain it live.
- **How**: solo-written, just-in-time learning — a concept gets explained and dry-run right before the feature that needs it, not front-loaded. Code gets written and committed by hand, not generated.
- **MERN revision angle still holds** even after the pivot: MongoDB (submission schema, per-API-key indexing), Express (API-key middleware, validation, rate limiting), Node (async handling, webhook delivery), auth (API-key issuance/scoping instead of JWT-login), and — if kept — Socket.IO/webhooks as the realtime layer. Each feature maps to something to explain in the interview, not just something to have built.

---

## 8. Immediate next step

A 10-minute schema dry run on paper — `tenant` / `apiKey` / `submission` — before anything gets typed into Claude Code. Do this once the two open questions above are answered, since the interview-date answer determines whether the schema needs to plan for webhooks/rate-limiting fields now or later.
