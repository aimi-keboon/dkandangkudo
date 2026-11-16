# D'Kandang Kudo — group riders and Stripe Checkout

This branch adapts the KEBOON Shop pattern: GitHub Pages sends a normal HTML POST to a separate Google Apps Script, which creates Stripe Checkout Sessions and verifies payment status by querying Stripe's API. No Stripe key is stored in GitHub.

## Prices

- Outride: RM250 per rider; independent optional helmet RM15 and boots RM15 per rider.
- Each rider supplies full name, mobile, weight in kg, experience level, and equipment choices. Up to 10 riders in one booking.
- Example: 2 riders, 1 helmet and 1 boots rental = RM530.
- Membership: recurring RM50/month using a real Stripe monthly subscription Price, not a one-off Payment Link.
- The backend ignores the frontend total and recalculates every booking amount and Stripe Checkout line item.

## Deployment — required before checkout works

1. Create a NEW standalone Google Apps Script project. Back up the existing Apps Script and Sheet before migration. Paste the entire apps-script/Code.gs file into the new project.
2. In Apps Script > Project settings > Script properties, configure:

   DKK_SPREADSHEET_ID — the existing D'Kandang Kudo spreadsheet ID
   DKK_STRIPE_SECRET_KEY — a Stripe TEST secret key initially (sk_test_...)
   DKK_MEMBERSHIP_PRICE_ID — a test Stripe recurring monthly MYR 50 Price ID (price_...)
   DKK_CHECKOUT_ENABLED — false to start; true during controlled sandbox testing
   DKK_ADMIN_EMAIL — optional admin email for verified payment notifications

3. Run setupDkkCheckout once and grant Sheets, MailApp, UrlFetchApp, and trigger permissions. It retains the existing Outride Bookings and Membership Registrations columns, appends tracking columns, adds an Outride Riders tab, and installs a syncDkkPayments trigger about every 5 minutes.
4. Deploy as a Web app, Execute as Me, access Anyone. Copy the URL ending /exec. Replace YOUR_NEW_DKK_APPS_SCRIPT_EXEC_URL in BOTH booking.html and membership.html with that URL. The placeholder deliberately keeps checkout unavailable before setup.
5. Create a Stripe TEST active MYR RM50/month recurring Price in your Stripe account. Set its Price ID and matching test secret key in private Apps Script properties; do not commit any secret.
6. Enable DKK_CHECKOUT_ENABLED in your TEST deployment. Test single and multiple riders, rental choices, Monday rejection, invalid weights, successful and abandoned checkouts, and recurring membership. After paying in Stripe sandbox, run syncDkkPayments or wait for its trigger, then check all Sheets.
7. Only after test success: review rider weight suitability policy, group limits, equipment availability, cancellation/refunds, data retention/privacy, session capacity and your confirmation process. To go live use the LIVE Stripe key and LIVE recurring Price ID in matching mode and a clean production testing/record strategy. Redeploy a new Apps Script version after updates.

## Status and privacy

Outrides start Pending. Stripe-verified Paid makes the booking Awaiting stable confirmation, NOT automatically confirmed. Membership status updates from the Stripe subscription and its latest invoice; recurring failures and cancellations are reflected. Do not infer Paid from the browser return URL.

Each rider's weight and phone are stored in the private Outride Riders tab linked to Booking ID; restrict Google Sheets access. The system does not currently reserve a horse or prevent double booking, and the stable must review rider suitability.

Because Apps Script web apps cannot reliably read Stripe-Signature headers, as in KEBOON Shop this integration uses 5-minute Stripe API polling, not an unauthenticated webhook. Stripe Dashboard remains the payment source of truth. The polling implementation checks at most 40 recently submitted rows per tab per run, so scale it before high-volume use.

Membership self-service cancellation via Customer Portal and progressive membership discounts on outrides are not yet automated. Don't claim those features are implemented. Before collecting payment for a requested outride, decide whether the stable will refund when availability/suitability is declined; an approval-first workflow may be preferable.

No real payment, Stripe account change or Apps Script deployment was performed by creating this PR.