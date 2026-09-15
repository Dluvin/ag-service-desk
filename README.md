# AG Service Desk

Multi-tenant service desk for irrigation companies. Track pivots on Google Maps, assign service tickets to technicians, and give farmers a login for status.

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
| Technician | mike@heartland.ag | Heartland Irrigation |
| Farmer | tom@greenacres.farm | Heartland Irrigation |
| Other company admin | admin@prairie.ag | Prairie Tech Irrigation |

Prairie Tech is a second tenant so you can confirm data does not leak across companies.

## Roles

- **Company admin** — farmers, pivots, technicians, assign tickets, all statuses
- **Technician** — assigned tickets, status updates, maps for those jobs
- **Farmer** — own pivots and tickets, request service, read technician notes, see parts used and startup status

## Extra boards

- **Dispatch** — kanban of open tickets plus **Repair done**, assign a technician, map of today's stops
- **Startup** — current-year pre-season checklist per pivot; a fail opens a high-priority ticket
- **Parts** — company catalog you can import from QuickBooks; techs pick those items on tickets

Ticket statuses: Open, Assigned, In progress, Waiting on parts, **Repair done**, Completed, Cancelled. Marking a ticket Completed requires an invoice number for the PDF.

## Host the app (login + database)

GitHub Pages cannot do this. The desk needs a Node server and a database.

**On a VPS or your PC with Docker:**

```bash
# set AUTH_SECRET to a long random string first
docker compose up --build
```

Open http://localhost:3000 and create a company at `/signup`. Ticket data is stored in a Docker volume.

**On the internet:** connect the GitHub repo https://github.com/Dluvin/ag-service-desk to [Render](https://render.com) or [Railway](https://railway.app). Use the Dockerfile. Set `AUTH_SECRET` to a long random string. Add a persistent disk at `/data` so the SQLite database is not wiped on redeploy.

Local `npm run dev` is unchanged (`DATABASE_URL=file:./dev.db`).

