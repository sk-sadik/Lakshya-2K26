# Lakshya 2027 — Product Architecture

**Product:** Official web portal for *Lakshya 2027*, the national-level technical
symposium of Lakireddy Bali Reddy College of Engineering (Autonomous), Mylavaram.
**Repo:** `https://github.com/sk-sadik/Lakshya-2K27` (`main`)
**Live URL:** `https://lakshya2K27.onrender.com`
**Audience:** students/participants, event coordinators, fest administrators.

---

## 1. What the product does (capabilities)

| Area | What users can do |
|---|---|
| Event discovery | Browse 10 department arenas (9 engineering + MBA), 18 events, search/filter, rulebooks, schedule |
| Registration | Sign up, verify email via OTP, register for events (solo/team), pay via Razorpay, get QR delegate pass |
| Delegate pass | Interactive 3D holographic pass, downloadable, scannable at turnstiles |
| Food passes | One dining QR pass per event registered; emailed; scanned/redeemed at food court |
| Coordinator console | Create/manage events, view per-event participants, issue + email food passes, send event announcements, QR check-in, verify/redeem food passes |
| Admin console | Users, events, registrations, analytics, announcements to all/coordinators/participants, reports inbox, food-token oversight |
| Messaging | Admin↔coordinator↔student broadcasts, targeted notices, support reports with replies |

---

## 2. System architecture (single-service deployment)

```
                    ┌──────────────────────────────────────────────┐
                    │  Render — Web Service (Node.js, 1 instance)  │
                    │                                              │
  Browser ──HTTPS─▶ │  Express 4 (TypeScript via tsx)              │
                    │   ├── /  → Vite build (dist/, SPA fallback)  │
                    │   └── /api/* → REST controllers ──┐         │
                    │         ├── /auth /events         │         │
                    │         ├── /registrations /payment│        │
                    │         ├── /coupons /coordinator │         │
                    │         └── /admin                │         │
                    └──────────────────────────────────┼──────────┘
                                                       │
              ┌────────────────────────────────────────┼───────────────────────┐
              │                                        ▼                       │
              │  MongoDB Atlas (lakshya2027)   Razorpay (checkout + webhook)  │
              │  Users · Events · Registrations  Brevo HTTPS API (OTP + food  │
              │  FoodCoupons · Notifications ·   passes; Gmail SMTP fallback) │
              │  SupportReports · OTPs                                        │
              └──────────────────────────────────────────────────────────────┘
```

- **One deployable unit:** `npm install && npm run build` → `npm start`
  (`render.yaml` Blueprint included). Health check: `GET /api/health`.
- **Same-origin design:** frontend calls relative `/api/*`, so there are no
  CORS issues in production.
- **Database:** MongoDB Atlas, connection pool 100/10 with retry logic.
- **Payments:** Razorpay Checkout (currently **test-mode** keys) + HMAC webhook.
- **Email:** Brevo HTTPS API (primary; works where SMTP ports are blocked) with
  Gmail SMTP fallback; OTP, password resets, food passes.

## 3. Technology stack

| Layer | Choices |
|---|---|
| Frontend | React 19 + TypeScript, Vite 8, Tailwind CSS 4, Three.js hero, Recharts dashboards, Lucide icons, canvas-confetti, QR rendering |
| Backend | Node.js (≥20) + Express 4 + TypeScript, Mongoose ODM, `jsonwebtoken` + `bcryptjs`, `qrcode`, `razorpay` SDK, `nodemailer` |
| Data | MongoDB Atlas |
| Hosting | Render (single web service, free tier) |
| Integrations | Razorpay, Brevo, Gmail SMTP |

## 4. Frontend module map (`src/`)

| Area | Key files |
|---|---|
| Shell/routing | `App.tsx` (view switch: site vs role dashboards), `main.tsx`, `index.css` (global responsive safety net) |
| Public site | `ThreeHeroCore` (3D hero), `DepartmentArenas` (3D cylinder + grid fallback), `EventsExplorer`, `EventModal`, `PassGenerator3D`, `TimelineSchedule`, `CampusSpotlight` (college + leadership), `Navbar` (mobile drawer), `Footer`, `RegistrationModal`, `auth/LoginModal` |
| Student | `dashboard/StudentDashboard` (events, registrations + pay, **My Food Passes**, QR pass, notifications, profile) |
| Coordinator | `dashboard/CoordinatorDashboard` (events, registrations, per-event food passes, announcements to own registrants, scanner, stats) + `CoordinatorMessagesSection` |
| Admin | `dashboard/AdminDashboard` (users, events, registrations, announcements, reports, food tokens, colleges) |
| Data layer | `services/dbService.ts` (all API calls, JWT header injection, local caching), `data/lakshyaData.ts` (event seed content), `types.ts` |

The site is fully responsive (mobile/tablet/desktop): collapsing grids,
scrollable data tables, hamburger navigation, touch-sized controls.

## 5. Backend module map (`server/`)

| Area | Files |
|---|---|
| Entry | `server.ts` (CORS, JSON parsing, request log, `/api` routes, frontend static + SPA fallback, Mongo connect, seed, SMTP/API mail check) |
| Routes | `routes/authRoutes`, `eventRoutes`, `registrationRoutes`, `paymentRoutes`, `couponRoutes`, `coordinatorRoutes`, `adminRoutes` |
| Logic | `controllers/authController` (OTP, JWT 7-day), `eventController` (CRUD + capacity parsing), `registrationController` (free-instant vs paid-pending flow), `paymentController` (order, HMAC verify, webhook, atomic confirm), `couponController` (per-event food passes), `coordinatorController` (ownership + event announcements), `adminController` (users, analytics, broadcasts, reports) |
| Data models | `User`, `Coordinator`, `Event`, `Registration`, `FoodCoupon` (unique per event×participant), `Notification` (role/user targeting), `SupportReport`, `OTP` |
| Services | `emailService` (Brevo API-first + SMTP fallback, background sends), `qrService` (registration QR badges), `config/db` (pooled Atlas connection) |

## 6. Core flows

**Signup:** register (name/email/password/college/branch/phone/roll) → OTP
stored (hashed, 5-min, 5 attempts) → email sent in background → verify OTP →
JWT issued. Login re-issues JWT; 401s auto sign-out site-wide.

**Event registration:** details form (own roll no + teammates' name/roll pairs)
→ `POST /events/:id/register` → free = instant CONFIRMED + QR; paid = PENDING +
Razorpay order → checkout → `verify` (atomic compare-and-swap, exactly-once
count) → CONFIRMED + QR. Duplicate (student, event) blocked (`409`).
Capacity enforced at registration; free seats reserved atomically.

**Food passes:** coordinator/admin generates one pass per confirmed (event,
participant) → emailed with QR → student sees it under My Food Passes →
scanned/redeemed at venue (statuses ACTIVE → USED/EXPIRED/CANCELLED).

**Announcements:** admin → all / coordinators / participants; coordinator →
own event's registrants only (private per-student inbox items).

## 7. Roles & access

- **Student:** register, pay, passes, own data, notifications, support queries.
- **Coordinator:** own events + their registrations/coupons/announcements only
  (ownership enforced server-side); food-pass scan/redeem; check-in.
- **Admin:** everything, plus user management, global broadcasts, reports,
  manual coupons. JWT carries `{ id, email, roles }`, 7-day expiry.

## 8. Environments & operations

| Item | Status |
|---|---|
| Production | Render, auto-deploys from `main` |
| Staging | **Not set up** (recommended before load testing / live payments) |
| Payments | Razorpay **test mode** (live keys pending) |
| Secrets | `.env` local only (gitignored); production values in Render dashboard |
| Health | `GET /api/health`; boot verifies Mongo + mail path in logs |
| Seed | Idempotent bootstrap (default accounts/events) runs when DB is empty |

## 9. Current limitations (roadmap input)

- Free-tier hosting sleeps when idle (first load after ~15 min is slow); no
  staging; test-mode payments; no rate limiting yet; no refund/waitlist flows;
  seats are not held during payment; third-party service API keys not yet
  issued. None affect normal fest-day operation at moderate scale.
