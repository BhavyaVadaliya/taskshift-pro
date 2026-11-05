# TaskShift Pro – Employee Shift & Task Reminder Management System

**TaskShift Pro** is an enterprise-grade, production-ready full-stack web application designed to manage employee shifts, schedule dynamic recurring tasks, deliver automated browser push & in-app notifications, enforce task checklists, and provide live real-time monitoring and reporting in the admin dashboard.

---

## 🌟 Key Features

### 1. Dual Independent Role Dashboards
- **Admin Dashboard**: Live employee attendance & task completion overview, interactive analytics charts (daily throughput, employee performance, attendance distribution), real-time floor monitoring, and customizable administrative controls.
- **Employee Workspace**: Start/End shift controls, live duration ticker, break management, real-time checklist drawers with note tracking, today's required progress indicator (`Completed Required Items / Total Required Items`), and task history.

### 2. Multi-Shift Management (Including Overnight Shifts)
- Dynamic shift creator (Morning, Evening, Night / Overnight).
- Configurable break allowances, grace periods, early clock-in permissions, and auto-logout rules.
- Robust prevention of multiple active shifts per employee.
- Forgotten logout detection: flags attendance records for admin review rather than silently altering actual punch-out timestamps.

### 3. Task & Checklist Management
- Dynamic task template creator with checklist items builder (required/optional flags, sorting).
- Recurrence engine: `DAILY`, `WEEKLY`, `SPECIFIC_DAYS`, `ONCE`.
- Strict availability enforcement: Employees cannot start tasks before scheduled availability unless explicitly permitted by admin.
- Audit preservation: Editing recurring task templates does not alter or corrupt historical completed instances.
- Duplicate, pause, activate, or archive tasks with 1 click.

### 4. Automated Notification & Web Push System
- Browser Web Push Notifications via standard Web Push API and VAPID authentication.
- Offline service worker (`public/sw.js`) that displays native OS notifications and navigates to the target task on click.
- Audio bell chimes synthesized using HTML5 Web Audio API (zero external audio file dependency issues).
- In-app notification center with unread count badge, toast alerts, and acknowledgment tracking.
- Background scheduler daemon that evaluates shift times and dispatches reminders at configured times (`reminderTime`, repeat reminder intervals, overdue alerts).

### 5. Live Task Monitoring & Audit Timeline
- Dedicated live task monitoring table showing employee, scheduled time, reminder sent timestamp, acknowledgment timestamp, start time, completion time, checklists fraction, and delay duration.
- Chronological task audit timeline detailing every action from shift clock-in to checklist marks and task completion.

### 6. Reports & Analytics Export
- Employee-wise and department-wise KPI metrics: Total shifts, working hours, average shift duration, assigned tasks, completed, overdue, missed, and on-time completion percentage.
- One-click **CSV Export**, Excel-compatible data tables, and clean **Printable Reports**.

### 7. Administrative Settings & Customization
- Database-backed company settings: Company Name & Logo, Timezone, Working Days, Grace Periods, Auto-logout Rules, Task Completion Rules, and Notification Message Templates.
- Official Holiday Calendar CRUD.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS |
| **Icons & UI** | Lucide Icons, Shadcn-style utility classes (`clsx`, `tailwind-merge`) |
| **Backend** | Next.js API Route Handlers (Node.js runtime) |
| **Database ORM** | Prisma ORM 5.x |
| **Database** | PostgreSQL (Production target) & SQLite (Zero-setup local development) |
| **Authentication** | Secure Bcrypt.js password hashing, JWT session cookies (HttpOnly, SameSite) |
| **Notifications** | Web Push API, Service Worker, VAPID, HTML5 Web Audio API |
| **Data Export** | Structured CSV Generation, Native Print Stylesheets |

---

## 🗄️ Database Architecture & Schemas

The database schema includes 18 normalized models:
1. `User`: Core authentication, employee ID, role (`SUPER_ADMIN`, `ADMIN`, `EMPLOYEE`), active state.
2. `EmployeeProfile`: Full name, phone, department, designation, assigned shift, working days, working hours.
3. `Department`: Name, code, description, manager assignment.
4. `Shift`: Shift name, start time, end time, break duration, grace period, early punch-in, auto logout, overnight flag.
5. `ShiftAttendance`: Clock-in, clock-out, expected end, break minutes, status (`ON_TIME`, `LATE`, `ACTIVE`, `COMPLETED`, `FORGOTTEN_LOGOUT`), notes, flags.
6. `ShiftBreak`: Attendance break start, end, duration in minutes, reason.
7. `Task`: Task template, description, instructions, category, priority, start/due/reminder times, recurrence rules, department/shift.
8. `TaskAssignment`: Many-to-many relationship mapping tasks to assigned employees.
9. `TaskChecklist`: Ordered checklist items within a task with required flags.
10. `TaskInstance`: Date-specific task instance generated for an employee with status (`NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`, `COMPLETED_LATE`, `OVERDUE`, `MISSED`), started/completed timestamps, delay minutes, notification timestamps.
11. `ChecklistCompletion`: Status of each checklist item in a task instance with timestamp, late flag, and employee comments.
12. `NotificationSchedule`: Reminder time, message, repeat interval, max reminders, escalation minutes.
13. `NotificationLog`: Log of dispatched notifications with delivery status (`DELIVERED`, `SENT`, `FAILED`) and read status.
14. `PushSubscription`: Browser Web Push subscription endpoint and cryptographic keys (`p256dh`, `auth`).
15. `EmployeeActivityLog`: Immutable log of user actions (`SHIFT_STARTED`, `TASK_STARTED`, `CHECKLIST_COMPLETED`, `TASK_COMPLETED`, `SHIFT_ENDED`).
16. `Holiday`: Official holiday calendar dates and descriptions.
17. `CompanySetting`: Dynamic database-stored application configurations.
18. `AuditLog`: Administrative audit trail logging entity changes, old values, new values, and admin justification reasons.

---

## 🚀 Quick Start & Local Setup

### Prerequisites
- Node.js 18.x or 20.x or higher
- npm or pnpm or yarn

### 1. Installation
Clone or navigate to the project directory and install dependencies:
```bash
npm install
```

### 2. Environment Variables Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default `.env` configuration for local development:
```env
# Database (Default zero-setup SQLite database file)
DATABASE_URL="file:./dev.db"

# Session JWT Secret
JWT_SECRET="employee_shift_task_management_super_secure_jwt_secret_key_2025_prod_ready"

# Web Push Notification VAPID Keys
NEXT_PUBLIC_VAPID_PUBLIC_KEY="BAYH1URhQC2oc-lbNDhjREa5Sf3UGM0-h_-3wAR6SpqFg3D95Tljq45q6UVtHwoWxr8hTd5ZGYruToO8TdC0SBo"
VAPID_PRIVATE_KEY="Y02DzmwaPdoOyplMU1q9kJyjCwXpFLdLMppW0t4qwKg"
VAPID_SUBJECT="mailto:admin@company.com"

# Application URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Database Initialization & Seeding
Initialize the database and populate it with rich test data (admin accounts, employee accounts, shifts, departments, checklists, schedules, and settings):
```bash
npx prisma db push
npm run seed
```

### 4. Start the Application
Start the Next.js development server:
```bash
npm run dev
```
Open your browser at: **[http://localhost:3000](http://localhost:3000)**

---

## 👥 Pre-configured Test Accounts

You can log in using either **Email** or **Employee ID**. Quick-login buttons are also provided directly on the login page:

| Role | Email | Employee ID | Password | Assigned Shift | Department |
|---|---|---|---|---|---|
| **Super Admin** | `admin@company.com` | `ADM001` | `admin123` | N/A | Management |
| **Employee 1** | `john.doe@company.com` | `EMP101` | `employee123` | Morning Shift (09:00 - 18:00) | Customer Support |
| **Employee 2** | `sarah.j@company.com` | `EMP102` | `employee123` | Morning Shift (09:00 - 18:00) | Operations & Logistics |
| **Employee 3** | `m.chen@company.com` | `EMP103` | `employee123` | Evening Shift (14:00 - 23:00) | Technical Support |
| **Employee 4** | `emily.d@company.com` | `EMP104` | `employee123` | Night Shift (22:00 - 07:00, Overnight) | Technical Support |

---

## ⏰ Background Notification Scheduler

The scheduler does not depend merely on frontend intervals. It runs server-side:
1. **HTTP Cron Tick Endpoint**:
   - `POST /api/cron/tick` or `GET /api/cron/tick`
   - Evaluates active shifts, generates recurring task instances, checks notification reminder times, dispatches Web Push notifications, marks overdue tasks, and flags forgotten shift punch-outs.
2. **Standalone Background Daemon**:
   To run the background scheduler continuously in a separate terminal process:
   ```bash
   npm run worker
   ```
   This worker checks every 30 seconds and automatically triggers scheduled notifications and state transitions.

---

## 🐘 Switching between PostgreSQL & SQLite

The system is architected to support both PostgreSQL (production standard) and SQLite (instant zero-dependency local dev):

- **To switch to PostgreSQL**:
  ```bash
  npm run db:switch:postgres
  ```
  Set your PostgreSQL connection string in `.env`:
  ```env
  DATABASE_URL="postgresql://postgres:password@localhost:5432/taskshift_db?schema=public"
  ```
  Apply migrations:
  ```bash
  npx prisma db push
  npm run seed
  ```

- **To switch back to SQLite**:
  ```bash
  npm run db:switch:sqlite
  npx prisma db push
  ```

---

## 🔔 Web Push Notification Setup

1. **VAPID Keys**:
   To generate new VAPID keys if desired:
   ```bash
   npx web-push generate-vapid-keys
   ```
   Place the public key in `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and the private key in `VAPID_PRIVATE_KEY` in `.env`.
2. **HTTPS / Localhost Requirement**:
   Browser push notifications require a secure context (HTTPS) or `http://localhost`.
3. **Browser Permission**:
   When prompted, click **Allow** or click the **"Enable Push Notifications"** pill in the top header.
4. **Testing Notifications**:
   Navigate to **Admin -> Notification Schedule** and click **"Test Notification System"**. Your browser will receive a push notification immediately with sound chime.

---

## 🌐 Production Deployment Guide

### Option 1: Vercel + Supabase / Neon PostgreSQL
1. Create a free PostgreSQL database on **Neon** ([neon.tech](https://neon.tech)) or **Supabase** ([supabase.com](https://supabase.com)).
2. Run `npm run db:switch:postgres`.
3. Connect your repository to Vercel.
4. Add the environment variables (`DATABASE_URL`, `JWT_SECRET`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `NEXT_PUBLIC_APP_URL`) in Vercel Project Settings.
5. Set `vercel.json` crons to ping `/api/cron/tick` every minute:
   ```json
   {
     "crons": [
       {
         "path": "/api/cron/tick",
         "schedule": "* * * * *"
       }
     ]
   }
   ```

### Option 2: Docker / Self-Hosted VPS
1. Build the production image:
   ```bash
   npm run build
   npm start
   ```
2. Start the background scheduler with PM2 or systemd:
   ```bash
   pm2 start npm --name "taskshift-web" -- start
   pm2 start scripts/scheduler-worker.mjs --name "taskshift-scheduler"
   ```

---

## 🛡️ Security & Integrity Highlights
- **Server-Side Validation**: Task completion timestamps, shift clock-in times, and checklist states are stamped server-side in UTC to prevent client tampering.
- **Audit Logging**: Any administrative attendance correction requires a compliance reason and is permanently recorded in `AuditLog`.
- **Role-Based Access Control**: Non-admin users are strictly blocked from `/admin/*` pages and API routes via JWT cookie verification.
