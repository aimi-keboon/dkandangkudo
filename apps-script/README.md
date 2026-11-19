# D'Kandang Kudo — group riders and Stripe Checkout

This branch adapts the KEBOON Shop pattern: GitHub Pages posts to Google Apps Script, which creates Stripe Checkout Sessions and verifies payment through Stripe's API. No Stripe key is stored in GitHub.

**Existing deployment:** The website action is now wired to the user's current Apps Script deployment:
https://script.google.com/macros/s/AKfycbzDm56EjwkL8YZOpj6QiUJW3RRKGD9P7KAPIwXt4L7vbrRtP_bkitQiiew4XDn3WBAL/exec

**Critical:** This is the URL of the EXISTING booking/membership handler, not proof that the new Code.gs is deployed. Existing code does not understand the new `riders_json` and `subscription_ack` fields, or secure server-calculated rental line items. Do not merge PR #2 until this exact deployment serves the updated Code.gs and live payments are enabled. Google Apps Script deployments run a published version, not necessarily the editor's latest saved code.

## Prices

- Outride: RM250 per rider; independent optional helmet RM15 and boots RM15 per rider.
- Each rider supplies full name, mobile, weight in kg, experience level, and equipment choices. Up to 10 riders in one booking.
- Example: 2 riders, 1 helmet and 1 boots rental = RM530.
- Membership: recurring RM50/month using a real Stripe monthly subscription Price, not a one-off Payment Link.
- The backend ignores the frontend total and recalculates every booking amount and Stripe Checkout line item.

## Deployment — required before checkout works

1. **Reuse the same Apps Script project if you want to retain the provided /exec URL.** Back up the original Code.gs and existing Google Sheet first, then replace the project's handler code with the complete contents of `apps-script/Code.gs`. If you prefer zero-downtime transition, create a second Apps Script project/deployment and update the form URLs instead; a new standalone project will NOT retain the existing deployment URL.
2. In Apps Script > Project settings > Script properties, configure:

   DKK_SPREADSHEET_ID — the existing D'Kandang Kudo spreadsheet ID
   DKK_STRIPE_SECRET_KEY — your LIVE Stripe secret key (sk_live_...) from the Keboon account, stored ONLY in private Script Properties
   Membership Price ID — already hardcoded in Code.gs to the existing live D'Kandang Kudo Stable Membership, RM50/month: price_1UEnG7L8CyJDBl205qCoFbh9. No new Price is needed.
   DKK_CHECKOUT_ENABLED — false until the live deployment is ready, then true to enable real charges
   DKK_ADMIN_EMAIL — optional admin email for verified payment notifications

3. Run setupDkkCheckout once and grant Sheets, MailApp, UrlFetchApp, and trigger permissions. It retains the existing Outride Bookings and Membership Registrations columns, appends tracking columns, adds an Outride Riders tab, and installs a syncDkkPayments trigger about every 5 minutes.
4. **For the existing deployment ID:** go to Apps Script > Deploy > Manage deployments, edit the existing Web app deployment, choose **New version**, and deploy with Execute as **Me** and access **Anyone**. Confirm the resulting /exec URL matches the one above (already set in both HTML forms). A simple Save does not update a deployed version. If the URL differs, update both forms on the PR branch.
5. Reuse the existing LIVE D'Kandang Kudo monthly MYR RM50 Price already configured in Code.gs. This price was verified in the connected Stripe account. Set the matching live Stripe key privately in Apps Script; never paste the key in GitHub or chat.
6. Once ready for real transactions, set DKK_CHECKOUT_ENABLED=true. **All successful Stripe checkouts charge real money; membership starts recurring live billing.** Review group totals, rental choices, booking dates and member subscription terms carefully. A live trial purchase is a real charge and needs a refund or cancellation if reversed.
7. Before switching checkout on, confirm rider weight suitability policy, group limits, equipment availability, refund/cancellation terms, customer-data privacy and staff confirmation. **Coordinate the website merge with the Apps Script deployment:** the old website does not send per-rider JSON while the updated Apps Script requires it, and the new website will malfunction against the old Apps Script. Plan a short maintenance/cutover window, or use a separately deployed endpoint until both sides are ready. Keep PR #2 as a draft until confirmed.

## Status and privacy

Outrides start Pending. Stripe-verified Paid makes the booking Awaiting stable confirmation, NOT automatically confirmed. Membership status updates from the Stripe subscription and its latest invoice; recurring failures and cancellations are reflected. Do not infer Paid from the browser return URL.

Each rider's weight and phone are stored in the private Outride Riders tab linked to Booking ID; restrict Google Sheets access. The system does not currently reserve a horse or prevent double booking, and the stable must review rider suitability.

Because Apps Script web apps cannot reliably read Stripe-Signature headers, as in KEBOON Shop this integration uses 5-minute Stripe API polling, not an unauthenticated webhook. Stripe Dashboard remains the payment source of truth. The polling implementation checks at most 40 recently submitted rows per tab per run, so scale it before high-volume use.

Membership self-service cancellation via Customer Portal and progressive membership discounts on outrides are not yet automated. Don't claim those features are implemented. Before collecting payment for a requested outride, decide whether the stable will refund when availability/suitability is declined; an approval-first workflow may be preferable.

No real payments, Stripe account changes or Apps Script deployments were performed by creating this PR. This branch is configured for live Stripe only; do not enable it until ready for real transactions.
## Stripe total matching safeguard

Outride Stripe Checkout Sessions use server-calculated inline MYR prices, not an existing `buy.stripe.com` Payment Link. Apps Script independently validates all `riders_json` entries and adds RM250 per rider + RM15 per helmet and RM15 per pair of boots. Before returning any payment button, it now verifies Stripe's returned `amount_total`, `currency`, `client_reference_id`, and mode, and rejects/attempts to expire mismatched sessions. Membership uses the existing fixed RM50/month Stripe Price and checks its first Checkout Session total separately.

**If a visitor still sees the old Stripe product price, it means they are using a legacy Payment Link, or the web app is running an outdated deployment version.** In the same Apps Script project, replace Code.gs with the updated source, then Deploy > Manage deployments > Edit > New version > Deploy. Confirm that the deployed `/exec` URL is the one currently used in booking.html and membership.html. Simply saving Code.gs does not update the deployed web app. Search any other on-site contact links or emails for old `buy.stripe.com` links, since these bypass the new group total.

Run `testDkkBookingValidation()` to check that 3 riders + 2 helmets + 1 boots equals RM795 without creating a Stripe charge. This is a local calculation self-test, **not** an end-to-end payment verification. Never collect live payment until the amount shown in Stripe matches the booking summary and the checkout source is correct.
