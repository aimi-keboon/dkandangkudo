# D'Kandang Kudo — Riding lessons and paddock bookings

## Current services (MYR, per rider)
- Trial horse riding lessons: **RM75 for 2 sessions**
- Horse riding lessons: **RM450 for 5 sessions**
- Horse riding lessons: **RM850 for 10 sessions**
- Paddock riding: **RM100 per one-hour session**
- Optional helmet rental: **RM15 per rider for the initial visit**
- Optional boots rental: **RM15 per rider for the initial visit**

Students select one of eight fixed one-hour slots: morning 7–8, 8–9, 9–10, 10–11, or 11–12; evening 4–5, 5–6, or 6–7. Out-of-hours starts are rejected by the backend. For lesson packages, the first preferred date and time are requested online; subsequent lesson dates and any future equipment rental arrangements are confirmed with the stable. Groups up to 10 riders can be booked. This is **not** an automatic scheduling or horse reservation system.

## What changed
- Outrides are no longer offered and the legacy "public-outride-booking" source is not accepted.
- New membership sales are disabled. The former membership page links back to riding options.
- Existing records and Stripe payment sync are retained. The former `Outride Bookings` or `Oride booking` tab is renamed **in place** to `Riding Bookings` when `setupDkkCheckout()` runs; no historical rows are discarded. The `Outride Riders` and `Membership Registrations` tabs remain unchanged. New riding orders are stored in the renamed bookings sheet with extra **Riding Option**, **Paddock Hours**, and **Preferred Time** columns.
- The webpage does not set the final Stripe price. Apps Script independently validates the service and calculates: riders × selected lesson package / one-hour paddock price + RM15 per selected helmet + RM15 per selected boots.
- A Stripe Checkout Session's total, currency, mode and booking ID are checked before the checkout URL is returned.

## Important: Deploy backend before accepting payments
**Editing GitHub does NOT deploy Google Apps Script.** Current form endpoint:
https://script.google.com/macros/s/AKfycbzDm56EjwkL8YZOpj6QiUJW3RRKGD9P7KAPIwXt4L7vbrRtP_bkitQiiew4XDn3WBAL/exec

1. Back up your current Apps Script and spreadsheet.
2. Update that project's `Code.gs` with `apps-script/Code.gs` from this branch.
3. Confirm `DKK_SPREADSHEET_ID`, `DKK_STRIPE_SECRET_KEY` and `DKK_CHECKOUT_ENABLED` in private Script Properties. Never commit any Stripe secrets.
4. With checkout temporarily disabled, run `setupDkkCheckout()` to rename the existing `Oride booking`/`Outride Bookings` tab to `Riding Bookings` **in place**, preserve all rows, add columns if needed, and retain payment-sync triggers. If there are multiple matching tabs or another `Riding Bookings` tab already exists, the migration stops instead of mixing records. Run `testDkkBookingValidation()` to check pricing without charging money.
5. **Do not manually rename the tab before updating the deployed backend.** The former deployed version still looks for the old tab; take a spreadsheet backup and coordinate the migration. In Apps Script: **Deploy → Manage deployments → Edit → New version → Deploy**; saving alone does not update the public web app. Verify the /exec URL is unchanged.
6. Check the website against the **actual deployed** backend before enabling real payments. Stop/disable checkout while migrating or use a separate new deployment URL; the old backend does not understand the new service codes and the old frontend sends outride fields.
7. Only enable live charges after testing all service totals, rental choices, first preferred date/time, approval/refund handling and Stripe confirmations. Paid bookings still require a stable confirmation and may need manual refunds if declined.

**Existing memberships:** The repository disables only *new registration*; it does not cancel existing Stripe subscriptions. Those must be managed explicitly in Stripe. Historical records stay in the existing spreadsheet.

**Privacy:** Each rider's phone number, weight, and experience are stored in a private sheet; restrict its access. The existing Stripe-sync trigger checks payment status using Stripe's API instead of relying on the browser redirect.

## Booking tab migration

The new backend reads/writes `Riding Bookings`. `setupDkkCheckout()` recognizes old tabs named `Outride Bookings`, `Outride Booking`, `Oride booking`, or `Oride bookings` (case-insensitively) and renames the single match while keeping its sheet ID, records and formatting. It does **not** rename or erase the `Outride Riders` historical details tab. When old and new booking tabs both exist, setup refuses to guess which is authoritative; reconcile them first.

After deployment, verify a new checkout appends to `Riding Bookings` and that the existing Stripe payment-sync trigger still updates historical transactions.
