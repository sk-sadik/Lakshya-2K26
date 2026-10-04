# Lakshya 2026 — Website API: confirmed behaviour (for integration review)

This document answers the integration questionnaire field-by-field against the
actual codebase (`https://github.com/sk-sadik/Lakshya-2K26`, branch `main`).
Each item is marked **EXISTS** (works today, code-referenced), **MISSING**
(does not exist), or **CAN ADD** (small, well-scoped work). Please mark anything
you read differently.

> Security note: no passwords, API keys, or `.env` contents are in this file or
> the repo (`.env` is gitignored). Staging credentials, if created, will be
> shared separately and directly.

Base URL (production): `https://lakshya2k26.onrender.com` (API and frontend are
served same-origin from one Render web service).
Local dev: frontend `http://localhost:3000`, backend `http://localhost:5000`
(Vite proxies `/api` → `:5000`).

---

## 1. Stack and environments — EXISTS (details verified)

- Backend: **Node.js + Express 4 + TypeScript** (run via `tsx`), JWT auth
  (`jsonwebtoken` + `bcryptjs`), MongoDB via Mongoose.
- Database: **MongoDB Atlas** (`lakshya2026` database), pool `maxPoolSize: 100`,
  `minPoolSize: 10` (`server/config/db.ts`).
- Hosting: **single Render web service** — Express serves both `/api/*` and the
  Vite production build (`server/server.ts` static + SPA fallback).
- Staging: **MISSING — there is no staging site.** Razorpay keys in use are
  **test-mode** (`rzp_test_…`) on the live deployment. A staging deployment +
  live Razorpay keys are both still to be set up.

## 2. API routes — EXISTS (list verified, examples below)

Conventions: JSON everywhere. Success: `{ success: true, ... }`. Errors:
`{ success: false, message: "<human-readable>" }`. Authenticated routes need
`Authorization: Bearer <JWT>`.

| Method & path | Auth | What it does |
|---|---|---|
| `POST /api/auth/register` | no | Create account (name, email, password, college, department, phone, rollNo) → email OTP → returns JWT + user |
| `POST /api/auth/verify-email` | no | Verify email OTP → returns JWT + user |
| `POST /api/auth/login` | no | Email + password (+ optional role) → JWT + user |
| `POST /api/auth/send-otp`, `verify-otp`, `resend-otp` | no | Generic OTP issue/verify |
| `POST /api/auth/forgot-password`, `verify-reset-otp`, `reset-password` | no | Password-reset OTP flow |
| `GET /api/auth/me` | JWT | Current user |
| `GET /api/events?department=&category=&status=&search=` | no | **List events** (public) |
| `GET /api/events/:id` | no | **Event details** — accepts Mongo id or `customId` |
| `POST /api/events` / `PUT /api/events/:id` / `DELETE /api/events/:id` | coordinator+ | Manage events |
| `POST /api/events/:id/register` | JWT | **Create registration** (free → instant confirm; paid → PENDING + Razorpay order) |
| `GET /api/registrations/my` | JWT | **Student's own registrations** |
| `GET /api/registrations/:id`, `GET /api/registrations/:id/qr` | JWT | Registration / QR badge (note: no ownership check on `:id` — see §12) |
| `PUT /api/registrations/:id/cancel` | JWT | Cancel (paid+confirmed locked for students; admin can) |
| `POST /api/payment/create-order` | JWT | (Re)create Razorpay order for a PENDING registration |
| `POST /api/payment/verify` | JWT | Verify Razorpay signature → CONFIRMED + QR. Idempotent |
| `POST /api/payment/webhook` | Razorpay signature (optional secret) | `payment.captured` → same confirm path |
| `GET /api/coupons/my` | JWT | Student's own food passes (one per event) |
| `POST /api/coordinator/announcements` | coordinator+ | Announce to own event's registrants only |
| `GET /api/admin/notifications?role=&userId=` | JWT | Targeted inbox (see §4) |
| `GET /api/health` | no | `{ status: "online", timestamp, service }` |

### Example — list events

`GET /api/events?department=cse&status=upcoming` → `200`
```json
{
  "success": true,
  "count": 3,
  "events": [
    {
      "id": "6939c1a2f4b5c6d7e8f9012",
      "customId": "cse-1",
      "eventName": "Hackathon",
      "title": "Hackathon",
      "description": "…",
      "department": "cse",
      "category": "coding",
      "venue": "CSE Lab 3",
      "date": "2026-03-20",
      "time": "10:00 AM - 01:00 PM",
      "entryFee": "₹150 / Team",
      "registrationFee": "₹150 / Team",
      "feeAmount": 150,
      "isPaid": true,
      "maxParticipants": 80,
      "registeredCount": 12,
      "registrationDeadline": "2026-03-18 11:59 PM",
      "teamSize": "2 - 4 Members",
      "prizes": { "first": "₹10,000", "second": "₹5,000" },
      "status": "upcoming",
      "rules": ["…"],
      "coordinators": [{ "name": "…", "role": "…", "phone": "…" }]
    }
  ]
}
```

### Example — register (paid event)

`POST /api/events/cse-1/register` with `Authorization: Bearer <JWT>`
```json
{
  "studentName": "Anitha Rao",
  "studentEmail": "anitha@college.edu",
  "studentPhone": "+919876543210",
  "studentRollNo": "23761A05A1",
  "college": "LBRCE (Autonomous)",
  "department": "cse",
  "teamMembers": "Kiran Kumar (23761A05B2), Divya S (23761A05C3)"
}
```
→ `201`
```json
{
  "success": true,
  "message": "Registration initiated. Please complete payment…",
  "isPaid": true,
  "registration": { "id": "…", "registrationStatus": "PENDING", "paymentStatus": "PENDING", "studentRollNo": "23761A05A1", "teamMembers": "Kiran Kumar (23761A05B2), …" },
  "paymentOrder": { "id": "order_…", "amount": 15000, "currency": "INR", "key": "rzp_test_…", "eventName": "Hackathon", "studentName": "Anitha Rao", "studentEmail": "anitha@college.edu", "studentPhone": "+919876543210" }
}
```
Free events return the same shape with `"isPaid": false` and an already-`CONFIRMED`
registration including `qrToken` + `qrCodeDataUrl`.

### Example — verify payment

`POST /api/payment/verify`
```json
{ "registrationId": "…", "razorpay_order_id": "order_…", "razorpay_payment_id": "pay_…", "razorpay_signature": "…" }
```
→ `200` `{ success, message, registration (CONFIRMED/PAID), qrToken, qrCodeDataUrl }`.
Re-posting the same payload returns `200` "already verified" — safe to retry.

## 3. Capability checklist (their "which of these exist" list)

| # | Capability | Status |
|---|---|---|
| 1 | List events + details (fee, date, time, venue, capacity, deadline, team size) | **EXISTS** — `GET /api/events`, `GET /api/events/:id`; capacity = `registeredCount` / `maxParticipants` |
| 2 | Seat availability for an event | **EXISTS** (derived: `maxParticipants - registeredCount`; no dedicated endpoint — **CAN ADD** `GET /api/events/:id/availability`) |
| 3 | Eligibility rules (year, branch, college) or check endpoint | **MISSING** — no eligibility concept anywhere; any logged-in user may register for anything. **CAN ADD** per-event rules + `POST /api/events/:id/check-eligibility` |
| 4 | Student's existing registrations | **EXISTS** — `GET /api/registrations/my` |
| 5 | Create registration from outside service | **Partially** — endpoint works with any valid user JWT, but there is no service identity. **CAN ADD** service API key + machine endpoint |
| 6 | Registration/payment status by registration or order ID | **EXISTS** by registration id (`GET /api/registrations/:id`); lookup by Razorpay order id is **MISSING — CAN ADD** |
| 7 | Registration page URL with event pre-selected | **MISSING** — frontend is a modal SPA with no routes. **CAN ADD** e.g. `/register?event=<id>` deep link |
| 8 | Login: JWT Bearer (localStorage), 7d expiry, user id = 24-hex Mongo ObjectId | **EXISTS** |
| 9 | Widget identifying the logged-in student to their server | **MISSING — CAN ADD** (signed widget token / postMessage session bridge) |
| 10 | Service authentication for their server → our API | **MISSING — CAN ADD** (scoped service API key) |
| 11 | Seat held during payment + hold duration | **MISSING — seats are NOT held** (see §5) |
| 12 | Exact status names | **EXISTS** — payment: `FREE/PENDING/PAID/FAILED/CANCELLED`; registration: `PENDING/CONFIRMED/CANCELLED`. No `expired`/`refunded` states exist |
| 13 | Duplicate-safe retries / idempotency key | **EXISTS effectively** — unique partial index on (student, event) for active regs → repeat create returns `409` with the existing registration; verify is idempotent. No idempotency-key header (**CAN ADD** trivially, barely needed) |

## 4. Errors — EXISTS (exact strings verified in code)

Format: `{ success: false, message }`. Notable cases:

| Situation | HTTP | Message (exact) |
|---|---|---|
| Not logged in (no/bad JWT) | 401 | `Authentication required. No token provided.` / `Invalid or expired session token. Please log in again.` |
| Sold out / full | 400 | `Event capacity is full. Registrations are closed.` |
| Registration closed (deadline) | 400 | `The registration deadline for this event has passed.` |
| Cancelled event | 400 | `This event has been cancelled and cannot accept registrations.` |
| Already registered (active reg exists) | 409 | `You are already registered for ${event}! View your pass in the dashboard.` (+ `registration` object) |
| Duplicate race | 409 | `You already have an active registration for this event.` |
| Not eligible | n/a | No eligibility — never returned |
| Bad signature | 400 | `Payment verification failed: Invalid cryptographic signature. …` (marks `FAILED`) |
| Already paid & confirmed (re-order) | 400 | `This registration is already paid and confirmed.` |
| Wrong role | 403 | `Forbidden. You need one of these roles: …` |
| Cancel paid+confirmed (student) | 400 | `Paid confirmed registrations cannot be cancelled. Please contact the event coordinator…` |
| Missing event | 404 | `Event not found.` |

## 5. Payment flow & seats — EXISTS (order verified, with one honest caveat)

Order: `POST /events/:id/register` → (free: instant CONFIRMED + QR) or
(PENDING registration + Razorpay order) → Razorpay checkout → `POST
/payment/verify` (HMAC-SHA256 of `order_id|payment_id`) → PAID + CONFIRMED + QR.
`payment.captured` webhook runs the same confirm path. Abandoned payments stay
PENDING forever (no expiry job); the student resumes from the dashboard via
`POST /payment/create-order`. Failed signature → `FAILED`, retry allowed.

- **FREE events:** seat reserved atomically at registration
  (`findOneAndUpdate` with `registeredCount < maxParticipants`).
- **PAID events:** seat counted ONLY at confirm (atomic CAS on
  `paymentStatus != PAID` + `$inc registeredCount`). **No seat is held while
  paying, and there is no hold timer.** Caveat: `verify` does not re-check
  capacity, so a last-seat race between a free registration and a paid
  confirmation can theoretically oversell by a small margin. If the agent needs
  guarantees, we should add a capacity re-check + waitlist (**CAN ADD**).
- No waitlist, no refund flow, no cancellation of paid+confirmed by students.

## 6. Teams — EXISTS

One registration per team, created by the team leader (only the leader needs an
account). `teamMembers` is a free-text string, conventionally
`"Name (ROLLNO), Name (ROLLNO)"`. Required: leader name, email, phone, **roll
number**, college. Team rows: name+roll required together or both empty; max
slots parsed from the event's `teamSize` (e.g. `"2 - 4 Members"` → leader + 3).
Teammates need no accounts; their details appear on the registration record,
student dashboard, coordinator view, and QR pass modal.

## 7. Required student details — EXISTS (exact validation)

Collected: full name, email (regex `^[^\s@]+@[^\s@]+\.[^\s@]+$`), mobile
(**no format validation**), **roll number** (required, uppercased), college,
branch/department (defaults `cse`). **Year of study is NOT collected.**
Signup passwords: min 6 chars, bcrypt-hashed; email OTP (6-digit, 5-min, 5
attempts) required to verify. No branch/college eligibility anywhere.

## 8. Load, limits, caching — verified

- **Rate limits: NONE** (no rate-limit middleware; one aspirational comment only).
  The agent shares the same unlimited lane — a separate key+limit is **CAN ADD**.
- Traffic handling: Atlas pool 100/10, keep-alive tuned for high concurrency;
  no load test has ever been run; **no historical Lakshya registration numbers
  are recorded in the repo** — ask the fest committee for last edition's peak.
- Caching: safe to cache `GET /api/events*` for 1–2 min (data changes only via
  admin/coordinator edits). No `Cache-Control` headers are set (**CAN ADD**).
- Load testing: must be staging-only — **no staging exists yet**, so this is
  blocked until one is created. Never load-test production (single Render free
  instance + shared Atlas).

## 9. Later-phase items

- **Event content source:** `src/data/lakshyaData.ts` seeds the Mongo `Event`
  collection; admins/coordinators edit via API. Full JSON export = `GET
  /api/events` today. Change notifications: none — poll or **CAN ADD** webhook.
- **Widget:** React SPA, **no CSP headers**, CORS allows same-origin +
  `FRONTEND_URL` only — a same-site React widget or script tag both work; a
  cross-origin widget needs a CORS entry (**one-line CAN ADD**). "Use the normal
  form instead" link: **CAN ADD** next to the widget.
- **Kill switch: MISSING — CAN ADD** (DB-backed feature flag + admin toggle,
  widget checks it on mount).
- **Post-registration notify: MISSING — CAN ADD** webhook
  (`registration.confirmed` → their URL, signed) or poll
  `GET /api/registrations/my`. Certificates: **none exist**; available
  participant data per registration: name, email, phone, roll no, college,
  branch, event, team members, payment/order ids, QR token, timestamps.
- **Data rules: UNKNOWN — not in code.** Agent data retention and chat-log
  policy must come from the college/fest committee, not this repo.

## 10. Do NOT send us

Passwords, API keys, `.env` files, or live Razorpay secrets. Staging
credentials (if any) go directly to the site owner, never in group channels.

## 11. Known issue worth flagging (found during this review)

`GET /api/registrations/:id` performs **no ownership check** — any logged-in
user can fetch any registration by id. Recommend scoping it to owner +
coordinator/admin before third-party use (**CAN ADD**, ~5 lines).

## Appendix — Postman

`docs/lakshya-api.postman_collection.json` in this repo: working collection
(variable `baseUrl`, `jwt`) covering auth, events, registration, payment
verify, my-registrations, coupons, coordinator announcements, admin inbox.
