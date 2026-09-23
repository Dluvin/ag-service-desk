# AG Service Desk

Multi-tenant service desk for irrigation companies. Track pivots on Google Maps, assign work orders to technicians, and give customers a login for status.

## Run locally

```bash
npm install
npx prisma db push
npx tsx prisma/seed.ts
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Demo logins

Password for all accounts: `demo1234`

| Role | Email | Tenant |
| --- | --- | --- |
| Company admin | admin@heartland.ag | Heartland Irrigation |
| Manager | manager@heartland.ag | Heartland Irrigation |
| Technician | mike@heartland.ag | Heartland Irrigation |
| Customer | tom@greenacres.farm | Heartland Irrigation |
| Other company admin | admin@prairie.ag | Prairie Tech Irrigation |

Prairie Tech is a second tenant so you can confirm data does not leak across companies.

## Roles

- **Company admin** — customers, pivots, technicians, managers, assign work orders, delete records, import pivots and staff
- **Manager** — assign and edit work orders, add customers and technicians (cannot delete or import pivots/staff)
- **Technician** — assigned work orders, status updates, add customers and pivots (cannot delete anything)
- **Customer** — own pivots and work orders, request service, read technician notes, see parts used and startup status

## Extra boards

- **Dispatch** — list of work orders with status filters and hide completed, assign a technician, map of today's stops
- **Startup** — current-year pre-season checklist per pivot; a fail opens a high-priority work order
- **Parts** — company catalog you can import from QuickBooks; techs pick those items on work orders

Work order statuses: Unassigned, Assigned, In progress, Waiting on parts, **Repair done**, Completed, Cancelled. Marking a work order Completed requires an invoice number for the PDF.

## Host the app (login + database)

GitHub Pages cannot do this. The desk needs a Node server and a database.

**On a VPS or your PC with Docker:**

```bash
# set AUTH_SECRET to a long random string first
docker compose up --build
```

Open http://localhost:3000 and create a company at `/signup`. Work order data is stored in a Docker volume.

**On the internet:** connect the GitHub repo https://github.com/Dluvin/ag-service-desk to [Render](https://render.com) or [Railway](https://railway.app). Use the Dockerfile. Set `AUTH_SECRET` to a long random string. Add a persistent disk at `/data` so the SQLite database is not wiped on redeploy.

To open the super-admin tenant portal, set `PLATFORM_ADMIN_EMAIL` and `PLATFORM_ADMIN_PASSWORD`, then visit `/platform/login`. The first successful sign-in creates that platform user. From there you can approve new signups (15-day trial, then $499/month), open a company as their admin, pause logins, or delete a tenant.

Set `APP_URL` to the public site (for example `https://agdeskpro.com`). Signups email `SIGNUP_NOTIFY_EMAIL` (default `david@agdeskpro.com`). Stripe billing on approve needs `STRIPE_SECRET_KEY`, `STRIPE_PRICE_BASE`, and `STRIPE_WEBHOOK_SECRET`.

Local `npm run dev` is unchanged (`DATABASE_URL=file:./dev.db`).

