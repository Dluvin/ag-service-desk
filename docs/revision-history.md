# AG Desk Pro revision history

Summary of development from the first commit through **24 September 2026**.  
Source: git `master` (98 commits, 15–24 September 2026).

AG Desk Pro started as **AG Service Desk**, a multi-tenant irrigation dealer desk: customers (farms), pivots, work orders, shop staff, and dispatch. In ten days it grew into a hosted product with catalogs, GPS, billing, a public marketing site, and dealer-facing tools.

---

## How to read this

Each section is a **phase**, not every commit. Verizon GPS, Reveal export, and logo polish each had several small production-fix commits; those are rolled up. A dated list of commit titles is at the end.

---

## 15 September 2026 — Foundation

First ship of the dealer desk and Render hosting.

- SQLite + Prisma + Docker on Render; database URL forced so hosting env vars cannot break Prisma.
- Work orders (tickets), pivots, and customers (then called farms).
- Customers as businesses with multiple contacts.
- Staff can edit customers, contacts, and pivot details.
- Customer logins can open and update work orders.
- Bird SMS on assign and updates (tech plus contacts).
- Managers, bulk staff import, ticket photos.
- Type-ahead pivot pick, search, two-column lists, hover map.
- Admin menu, company logo on header and print.
- Editable pre-season startup checklist.
- Batched QuickBooks parts import (large catalogs on Render).

## 18 September 2026 — Shops, dispatch, catalogs, GPS

The desk became a multi-shop operation tool.

- Company **stores**; dashboard and dispatch filter by shop.
- Ticket **scheduling**, dispatch **calendar**, required close amount.
- Calendar can hide so the map stays up, or open in its own tab.
- **Labor** and **equipment used** on work orders, with catalogs, import, and hours.
- Reports, staff stores, batch print.
- Managers can edit parts; large lists are paged.
- Maintenance grouped by farm with search/typeahead.
- Hover menus; catalogs under Tickets; Admin renamed **Settings**.
- Welcome and forgot-password email so staff and customers can set a login.
- **Verizon Connect Reveal**: store trucks in Settings, red map pins, on-site flash when GPS is at the pivot, vehicle page locations. Several follow-up commits to match Reveal’s GPS APIs and avoid duplicate/blank vehicle rows.

## 19 September 2026 — Platform admin and Reveal export

- Platform super-admin portal.
- Connectors, staff seats, per-truck map visibility.
- Reveal Places export to Excel (categories/groups; “all categories” download).
- Header branding: **AG Service Desk** (later AG Desk Pro) instead of only the tenant name.

## 20 September 2026 — Product, billing, marketing site

- Approved company signup, 15-day trial, demo tenant, **Stripe** checkout.
- Platform admin can create/refresh a checkout link; email it to the company admin.
- Public **AG Desk Pro** homepage, privacy, support, signup, and logos.
- Logo/transparency polish so marks work on dark headers and phones.
- **Open in Google Maps** beside the work order number.
- Start-a-company from the platform portal.

## 21 September 2026 — Work orders, farms, assets, reports

- Work orders can stay **Unassigned**; print/email when repair is done.
- Assets beyond pivots: **wells, pumps, generators**; aerial maps; sortable lists.
- Create work order from the dispatch board.
- Farms as a grouping under customers; assets stay with the farm when it moves; unassign on farm delete.
- Bulk assign assets to a farm; All Assets typeahead.
- Truck maps filter by store.
- Dispatch columns capped then independently scrollable.
- Customers submenu includes Farms (URLs unchanged).
- Customer, farm, and asset reports.
- Plan entitlements, pricing tiles, public support form, demo request from a price tile.

## 22 September 2026 — Landing and billing fixes

- Readable “Request a demo” on price tiles.
- Platform plan Save actually persists company plan changes.

## 23 September 2026 — Dispatch UX, brand, presence, reports

- Dispatch as a **filtered list** with status chips and hide-completed (list vs tiles in settings).
- After login, managers go to dispatch and techs to work orders.
- Collapsed list rows show the work order title; map opens in a new tab.
- Forms keep working after Render deploys when Server Action IDs change.
- Demo tenant renamed **American Irrigation**; site favicon.
- Tenant logos on print, welcome mail, and login; welcome mail from the dealer; “Powered by AG Desk Pro”.
- **Dark mode** (stored on the device).
- Desk Support and FAQ; empty name/email on feature requests.
- Farm detail page; searchable customer when reassigning a farm; searchable asset assign.
- Admin **Who’s signed in** (staff presence).
- Shared report nav; pivot reports on their own page.
- Work order table headings/status contrast in light and dark.
- Phone dispatch keeps the work order number visible.
- Edit/remove quantity and hours on parts, labor, and equipment lines.

## 24 September 2026 — Work order lines and customer invites

- Create **new part, labor, and equipment** from a work order popup without leaving the page.
- Work order **updates** collapsible; on desktop they sit under the map; **newest first**.
- Global button press/hover feedback.
- Adding a customer **contact with an email** creates a portal login and sends a welcome email.
- **Resend invite** on the contact, with status (no login, invite sent, not signed in, signed in).

---

## Product shape as of 24 September 2026

| Area | In the product |
| --- | --- |
| Tenants | Multi-company desk, trial/signup, Stripe, platform admin |
| People | Admin, manager, technician, customer portal; welcome/reset email |
| Work | Dispatch (list/tiles), calendar, map, SMS, photos, print |
| Catalog | Parts, labor, equipment on the work order |
| Places | Customers, farms, pivots and other assets, stores |
| Fleet | Verizon Reveal trucks, on-site time |
| Site | Marketing homepage, privacy, support; iOS wrap exists around the live site |

---

## Commit titles by date

### 2026-09-15

- Initial commit of AG Service Desk.
- Add Render/Docker hosting, pivot notes, and repair-done status.
- Force SQLite file URL in Docker so Render DATABASE_URL cannot break Prisma.
- Let tickets and pivots add a farmer and drop a map pin.
- Stop login from querying the database during Render builds.
- Treat farms as businesses with multiple contacts and send Bird SMS on ticket assign and updates.
- Let staff edit farms, farm contacts, and pivot details.
- Let farm logins open and update tickets, and text the tech plus all farm contacts on every change.
- Add managers, bulk staff import, ticket photos, and farm/pivot shop tools.
- Fix the Render production build for farm contact delete and ticket photos.
- Let staff pick a pivot by typing its name on a new ticket.
- Add farm and pivot search, two-column farm lists, and a hover map when picking a pivot.
- Add an Admin menu and let companies upload a logo for the header and printed tickets.
- Let shops add and remove pre-season startup checklist items.
- Import large QuickBooks parts lists in batches so ~12,000 items can finish on Render.
- Fix the Render type check for batched parts import.

### 2026-09-18

- Add company stores so dashboard and dispatch can be filtered by shop.
- Add ticket scheduling, a dispatch calendar, and a required close amount.
- Let dispatch hide the calendar so the map stays up, and open it in its own tab.
- Add labor, reports, staff stores, batch print, and nest ticket map and maintenance under Tickets.
- Let managers edit the parts catalog, page large lists, and open a ticket when maintenance starts.
- Group maintenance pivots by farm and add search so large lists are easier to work.
- Let shops type a farm name on maintenance instead of scrolling a long dropdown.
- Add equipment used on tickets with a catalog, import, and hours like labor.
- Let menus open on hover, nest catalogs under Tickets, and rename Admin to Settings with staff editing.
- Send welcome and forgot-password emails so staff and farms can set or reset a login.
- Fix the Render type check by restoring the ticket schedule import.
- Save Verizon trucks in Settings so technicians can pick a mapped vehicle from a dropdown.
- Show assigned Verizon trucks as red pins on maps and include a ticket link in assign/update SMS.
- Flash an On-site label on map pins when a truck is at a ticket pivot and time is recording.
- Show each Verizon truck's current GPS location on the vehicles settings page.
- Read nested Verizon GPS fields so truck locations show on maps and the vehicles page.
- Fall back to per-truck Verizon location calls when the bulk GPS response cannot be read.
- Look up GPS for every truck still missing after the bulk Verizon location call.
- Keep adding technicians from crashing on duplicate email, and request GPS for each Verizon truck one at a time.
- Keep Verizon GPS on the matching truck only and skip the failing per-truck status calls.
- Load truck GPS from Vehicle Update API v1 GET location for each Verizon vehicle number.
- Ask Vehicle Update API v1 for GPS by vehicle number, name, and registration, not only the stored id.
- Skip GPS for Verizon trucks with a blank Vehicle # and tell staff to fill that field.
- Replace leftover Verizon truck rows when Vehicle # is filled instead of keeping duplicates.

### 2026-09-19

- Add a platform super-admin portal, Connectors, staff seats, and per-truck map visibility.
- Export Verizon Reveal Places to a CSV Excel can open via the Geofence API.
- Fix Render TypeScript build by restoring parseDateTimeLocal and form action types.
- Load Reveal Places by group and category so the Excel export is not an empty sheet.
- Require a Reveal Place category for Geofence export instead of the 404 list-all call.
- Combine ALL truck groups or many Place categories into one Excel download.
- Export ALL Reveal Places from the 326 known categories in one Excel file.
- Show AG Service Desk in the header instead of the company name.
- Add approved signup with 15-day trial, demo tenant, and Stripe checkout.

### 2026-09-20

- Let platform admins create or refresh a Stripe checkout link after approval.
- Email the company admin the Stripe checkout link when billing is created.
- Ship the AG Desk Pro marketing homepage with live product and field photos.
- Match the public homepage colors to the cream and emerald desk.
- Add public privacy and support pages to the marketing site menu.
- Show the AgDeskPro logo on the marketing site, signup flow, and emails.
- Use the light AgDeskPro mark on dark headers and keep the original on light pages.
- Remove the black bar from both AgDeskPro logos so they sit on page backgrounds.
- Put an Open in Google Maps link beside the ticket number so phones can navigate without scrolling.
- Point sign-in at a new transparent logo file so phones and browsers cannot keep the old black PNG.
- Open the counters inside the AgDeskPro letters so the page shows through.
- Add a Start a company link on the platform admin portal.

### 2026-09-21

- Work orders can stay Unassigned, print and email customers when a repair is done, and track wells, pumps, and generators with aerial maps and sortable lists.
- Put a Create work order button on the dispatch board so techs can start a ticket without leaving the board.
- Shops can group equipment under farms and filter truck maps by store so each location keeps its own assets and fleet.
- Customer pivot search uses pivot wording, and truck maps treat all-stores with the shared store constant.
- Make All Assets easier to find with typeahead, and let shops assign selected customer equipment to a farm in one step.
- Keep farm-assigned equipment with a farm when it moves, and let shops select every listed asset at once.
- Unassign farm assets on delete so they stay with the customer, and collapse Farms/Add farm so customer pages stay shorter.
- Keep dispatch columns at three visible tickets, then scroll each column independently so long queues stay usable.
- Fix the dispatch column TypeScript error that blocked the Render production build.
- Shrink the landing headline one step and collapse dispatch card details under priority until hover.
- Add a Customers submenu with Farms so shops can list every farm without changing customer URLs.
- Add customer, farm, and asset reports plus plan entitlements, pricing tiles, and a public support form.
- Let price tiles request a demo and include the chosen version in the request.

### 2026-09-22

- Make Request a demo text white on landing price tiles so the emerald CTA stays readable.
- Fix platform plan Save so company plan changes persist and show a result.

### 2026-09-23

- Switch dispatch to a filtered list with status chips and hide completed, and map Open work order to /map.
- Let managers pick list or tiles on dispatch, and send each role to its usual home after login.
- Fix the dashboard type-check after sending shop staff to their usual home.
- Show the work order title on collapsed dispatch list rows so the problem is visible without expanding.
- Open the dispatch work order map in a new tab so the fleet board stays available.
- Keep forms working after a Render deploy when Server Action IDs change.
- Rename Demo Irrigation to American Irrigation and add the site favicon.
- Show tenant logos on print and welcome mail, and dealer logos on login.
- Send welcome emails from the dealer and add a Powered by AG Desk Pro footer.
- Let staff switch the desk to dark mode and keep the choice on this device.
- Add desk Support and FAQ so staff can request features and find how-to answers.
- Leave Support feature-request name and email empty so staff type their own.
- Let staff assign assets from a searchable dropdown instead of checking the list.
- Open each farm on its own page with customer, contact, and add-asset.
- Let staff search customers when reassigning a farm.
- Let dealer admins see who is signed in, and put report nav on every report page.
- Restore report status badges so the production build succeeds.
- Give pivot reports their own page, and keep work order numbers visible on phone dispatch.
- Make work order column headings and status easier to read in light and dark mode.
- Let staff change quantity and remove parts, labor, and equipment on a work order.

### 2026-09-24

- Let staff add parts, labor, and equipment from a work order without leaving the page.
- Show work order updates under the map on desktop, newest first.
- Send customer contact welcome emails and let staff resend invites with status.

---

Latest commit on this history: `00b328b` (24 September 2026).
