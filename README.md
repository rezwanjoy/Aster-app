# Aster

Mobile-first PWA for independent tutors and small coaching centers. See [ASTER_BRIEF.md](ASTER_BRIEF.md) for the full product brief and milestone plan.

**Status:** M0–M5, M7 (parent reports + reminder wording) and M8 (premium fake door) and M6 (teacher-only AI) done. Next: M9 (polish + deploy).

## Run locally

```bash
npm install
npm run dev:lan      # dev server, reachable from your phone on the same Wi-Fi
```

- **PC:** open <http://localhost:5173>
- **Phone (same Wi-Fi):** open the `Network:` address Vite prints, e.g. `http://192.168.x.x:5173`

If the phone cannot connect, Windows Firewall is usually blocking Node. Allow Node.js on the network type shown in Windows (Private or Public) when prompted, or set the Wi-Fi network to *Private*.

> Over plain `http://` on a LAN address the app works, but the browser will **not** register the service worker or offer *Install app* (those need HTTPS or `localhost`). Install/offline are tested on a deployed HTTPS build, or with `npm run build && npm run preview` on the PC.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `dev:lan` | Dev server (`dev:lan` is the same, host-exposed) |
| `npm run build` | Type-check + production build (+ service worker) |
| `npm run preview` | Serve the production build locally on port 4173 |
| `npm test` | Vitest unit tests |
| `npm run icons` | Regenerate PNG app icons from `scripts/make-icons.mjs` |

## Structure (M0)

- `src/app/` – router, layout, top bar, **bottom nav (phone)**, **side menu (PC ≥ 1024px)**, update prompt
- `src/components/` – UI primitives (Button, Card, Segmented, MasteryBadge, icons)
- `src/i18n/` – `en.json`, `bn.json`, typed `useI18n()` (`t`, `n`, `d`), Bangla numerals
- `src/store/settings.ts` – device preferences: language, theme, numerals, mode, active student, batch switcher (persisted, versioned)
- `src/index.css` – design tokens (CSS variables, light/dark), motion easings, reduced-motion

## Design tokens

Colours, surfaces, borders and mastery bands are CSS variables in `src/index.css` and exposed to Tailwind (`bg-surface`, `text-muted`, `bg-red-bg text-red-fg`, …). Dark mode is the `.dark` class on `<html>`, driven by Settings (light / dark / system).

## UI design system ("Royal Violet & Champagne")

- **Look:** violet-tinted dark and pearl light themes (equal priority), glass cards with a champagne hairline, violet hero cards, soft aurora background.
- **Motion** (`motion` library, all of it honours reduced-motion): page enter transitions, staggered reveals, count-up numbers, animated bar/line/ring charts, sliding nav and segmented indicators (spring), cursor-following card spotlight (mouse only), button sheen.
- **Fonts:** Sora (display), Inter (body), Hind Siliguri (Bangla).
- **Components:** `src/components/ui.tsx` (Button, Card, Segmented, MasteryBadge, Chip), `charts.tsx`, `dashboard.tsx`, `motion.tsx`, `PageHeader.tsx`.
- Colour is never the only signal: mastery/fee states always carry an icon and a label.

## Data layer (M1)

- `src/types/index.ts` – all domain types (batches, students, goals per subject, term, events, messages…).
- `src/lib/ops.ts` – pure operations with cascading deletes + `checkIntegrity`. `src/lib/dates.ts`, `src/lib/prng.ts` – helpers.
- `src/data/seed.ts` – deterministic demo school (same output for the same date; Rafi, 3 batches, 27 students).
- `src/store/data.ts` (school data, persisted `aster-data`) and `src/store/settings.ts` (device prefs, `aster-settings`), both versioned with migrations in `src/store/migrations.ts`.
- `src/lib/backup.ts` + `src/store/actions.ts` – export / import / reset. Backups never contain the AI key. Settings → **Your data** has the buttons.
- To change a stored shape: bump the version in `migrations.ts` and add a step.

## Calculations (M2): all pure, all tested, in `src/lib/`

| File | What it does |
|---|---|
| `mastery.ts` | Recency-weighted topic mastery (0.6^k), red/yellow/green bands, trends, goal progress |
| `batch.ts` | Weak topics per batch/scope, reteach suggestions, students needing attention, dashboard summary, next class |
| `attendance.ts` | Attendance rate, 4w / 8w / term ranges, weekly buckets |
| `planner.ts` | Weekly study plan: red first, one yellow, spaced review (+1/+3/+7/+14 days); regenerating never duplicates finished work |
| `streak.ts` | Current/longest streak (rest days never break it), 7-day dots, weekly minutes (week starts Saturday) |
| `fees.ts` | Paid/partial/due/overdue (grace day 10), totals, payments, reminder text |
| `grading.ts` | Percent ↔ GPA 5.0 / letter with editable bands (**[VERIFY]** the default scale before real use) |
| `insights.ts` | Rule-based teacher and student insights as structured findings (the UI words them; AI only rephrases) |
| `calendar.ts` | Month view data: exams, class days, fee dates, holidays, custom events |
| `whatsapp.ts` | wa.me link builder (Bangladesh numbers, Bangla text) |

## Teacher screens (M3)

- **Global batch switcher + date/calendar** (`features/teacher/ContextBar.tsx`) on Today, Marks, Insights and Fees. Calendar shows exams, class days, fee dates, holidays and your own events.
- **Today**: next class, clickable Students/Attendance/Mastery tiles (detail panel), Fees tile → Fees page, attendance chart (4 weeks / 8 weeks / term), weak topics, students needing attention with in-app **Message** (+ WhatsApp).
- **Batches**: term banner (edit / new term), add batch; **Batch detail** (`/teacher/batches/:id`) with Overview, Students, Exams and Classes tabs, plus edit/delete everything.
- **Log a class** (fast sheet), **Marks** (exam list per batch; entry = spreadsheet grid on PC with Tab/Enter/arrow keys and paste, student-by-student stepper on phone), **Fees** (by batch and month, record payments, WhatsApp reminder, create a month's records).
- Forms live in `src/features/teacher/`; shared controls in `src/components/forms.tsx`, `Dialog.tsx` (bottom sheet on phone), `ConfirmDialog.tsx`.
- `node scripts/check-i18n.mjs` lists translation keys used in code but missing from `en.json`/`bn.json`.

## Insights (M4)

- **Insights** (`/teacher/insights`): headline finding (e.g. "58% of this batch is weak in Quadratic Equations. Reteach this.") with a **Log a revision class** shortcut that pre-fills the class form, further findings, topic ranking with trends and a Reteach chip, students needing attention (message / open), class average by test, topics that are moving, and the **weak-topic map** (students × topics, weakest first, per subject). Everything follows the global batch switcher.
- **Student detail** (`/teacher/students/:id`): topic-by-topic mastery, marks trend vs goal, strengths / weak spots / next steps, attendance by batch, fees by month, WhatsApp the guardian, message, edit. Reachable from Today, Insights, Batch detail and the map.
- All findings are **calculated** (rule-based). AI only adds a written summary on top of them.

## Student mode (M5)

- **"Who is using Aster?"** picker + **Inbox** badge at the top of every student page (`features/student/StudentBar.tsx`).
- **Plan**: streak, longest streak, 7-day dots, weekly ring; tick tasks off (the day is remembered), **add / edit / delete your own tasks**, **Update my plan** (keeps finished and own tasks); basic tips calculated from marks and attendance.
- **Progress** and **Topics**: subject switcher showing class and batch; marks trend vs goal, recent exams, teacher notes; topic sheet with exam history and what the plan says.
- **Goals**: one goal per subject (grade shortcuts, optional date), study days and minutes per day, then *Update my plan*.
- **Inbox** (`/student/inbox`): teacher messages stored on this device; opening it marks them read.
- **Profile** (`/profile`, replaces Settings; `/settings` redirects) shows **only the current role**: teacher (details, subjects & topics manager, backup / restore / reset) or student (own details), plus language, theme, grade display and numerals.
- **Welcome screen** (`/welcome`, first visit): choose "I'm a teacher" (Himel Bhai) or "I'm a student" (Rafi). A demo choice, not a login. Real accounts are deferred (see brief §23).
- **Plan page class switcher**: filter the one plan by class (batch + subject); the header shows subject, batch, teacher, coaching center, class days and next class.
- Pure logic: `lib/tasks.ts`, `lib/goals.ts` (tested in `tests/student.test.ts`).

## Parent reports (M7)

- **Parent report** (`features/shared/ReportSheet.tsx`, logic in `lib/report.ts`): from a student page (teacher) or **My report** on Progress (student, read-only). Choose language (English / Bangla, independent of the app language), month, include marks / fees, add a note; preview, **Copy text** or **Share on WhatsApp** (opens the guardian's number). Only that student's own data is included. Tested in `tests/report.test.ts`.
- **Reminder wording** (Profile → teacher): edit the English and Bangla fee-reminder text with {student} {amount} {month} {center}, live preview, unknown-word warning, reset; plus a default note for parent reports.

## Premium fake door (M8)

- Locked **Premium** cards in context (`features/premium/LockedCard.tsx`): Lecture recorder (Today), Early-warning alerts (Insights), Exam paper builder (Marks), Center dashboard (Batches), Cloud sync (Profile), Branded PDF (report sheet), AI practice questions (student Topics).
- Tapping opens a sheet with a mock preview and **Notify me when ready** / **I'd pay for this** + a price picker. Nothing is sold; no payment details are asked for. Events are logged in `data.interest` (`lib/interest.ts`).
- **Plans** (`/plans`): Free / Tutor Pro / Center, marked as planned pricing.
- **Demo feedback** (Profile → teacher): per-feature views / notify / would-pay with chosen prices, **Export JSON / CSV**, Clear. Ask each tutor to export from their phone.

## AI insights (M6, teacher only, optional)

- **Off by default.** The teacher pastes their own free Google Gemini key in Profile, reads a consent notice, and turns it on. Students and parents never use AI. Everything else works without it.
- **Anonymised.** `src/lib/ai/anonymize.ts` sends only topic names, percentages, trends, attendance, goals and study time. Students become letters (A, B…), topics become T1, T2…; answers are mapped back on the device. `src/lib/ai/privacy.ts` double-checks every request and blocks it if any name, phone number, batch or center name is found. Tests cover every seed student and batch.
- **Safe answers.** Gemini is asked for JSON; `schemas.ts` drops any topic or student the model invented. Bad JSON is retried once. Errors (bad key, quota, offline, blocked, timeout) have plain messages in English and বাংলা.
- **Cheap.** Answers are saved on the device (`aster-ai-cache`, last 40, keyed by data + model + language + prompt version), so the same data never spends quota twice. A local counter shows "N of 5 free insights this month"; over the limit it shows the Tutor Pro notice with "Generate anyway (demo)". It never hard-blocks.
- The key is stored only in this browser and is never included in backups. Use *Test connection* in Profile after pasting it.
- Known risk: Google's free tier says it is for adults and may use free-tier requests to improve products. Disclosed in the consent notice; a paid key avoids the second point.

## Centers with several teachers (demo)

- `Teacher` records and an optional `teacherId` on each batch. **Teachers overview** (`/teacher/center`, linked from Batches) shows each teacher's batches, students, mastery, attendance, who needs attention and their weakest topic, plus a size meter (Solo up to 60 · Center up to 300 · School 300+).
- Add, edit or remove teachers there; pick a batch's teacher in the batch form. Removing a teacher keeps their batches.
- "Aster for Schools" is a locked teaser card that records interest. Nothing school-specific is built.
- Visual only: no logins or per-teacher permissions until the backend exists. Data version 2; `lib/teachers.ts` holds the logic and the v1 → v2 migration.

## Home page and sign-in (demo)

- `/home` is what the address `/` opens in a browser tab (hero, what is Aster, how it works, why, FAQ, plans). The installed app skips it and opens the dashboard (or the role picker on a first run); returning users reach their dashboard with the "Open app" button. Profile has a "Home page" link.
- `/signin/teacher|center|student` are demo screens: fields are switched off and "Continue with the demo" opens the sample data. No accounts, no passwords are collected.
- Plans are Solo (free, ≤60 students), Plus (৳2,500, ≤300, several teachers) and Pro (৳7,500, 300+, schools, coming soon). They are demo prices. Source: `src/data/tiers.ts`.

## Center side (demo)

- Signing in as a center opens `/center/today`. Center and teacher share the same pages; the center version adds teacher names, a **Teachers** section on Batches, **Teacher stats** (with a locked AI card) on Insights, and optional **teacher salary tracking** on Fees (off by default; salaries are set per teacher in the teacher form). Both modes show a **Teacher and performance** card on each batch.
- Logic: `lib/teachers.ts` (stats, situation words), `lib/salary.ts` (salary rows, mark paid). Data version 3.
