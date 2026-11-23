D'KANDANG KUDO STABLE — RIDING SERVICES WEBSITE

CURRENT OFFERINGS (PER RIDER)
- Trial horse riding lessons: RM75 for 2 sessions
- Horse riding lessons: RM450 for 5 sessions
- Horse riding lessons: RM850 for 10 sessions
- Paddock riding: RM100 per one-hour session
- Optional helmet rental: RM15 per rider for the initial visit
- Optional boots rental: RM15 per rider for the initial visit

WEB FILES
- index.html: Riding services landing page and prices
- booking.html: First-visit request and rider details form
- booking.js: Frontend package selection and total preview
- membership.html: Retired membership signup information
- styles.css: Shared styles
- script.js: Mobile navigation and footer helpers
- apps-script/Code.gs: Server-side input validation, prices, Stripe Checkout and Sheets logging; renames existing Oride booking / Outride Bookings tab to Riding Bookings in place on setup
- apps-script/README.md: Mandatory deployment, privacy and payment instructions

Bookings select one-hour slots within 7 AM–12 PM or 4 PM–7 PM (7, 8, 9, 10, 11 AM; 4, 5, 6 PM starts). Slots are requests, not guaranteed. For multi-session lesson packages, follow-up dates are arranged directly with the stable. New memberships and outrides are no longer sold. Existing membership subscription records and payment tracking remain intact; retiring new sales does not automatically cancel existing Stripe subscriptions.

IMPORTANT
The live Google Apps Script deployment is NOT automatically updated when GitHub changes. Before publishing the new booking form, deploy the new Code.gs to the matching Apps Script endpoint. Follow apps-script/README.md exactly. The old backend cannot process the new riding service fields. Do not enable real payment during migration until the live Stripe prices and booking totals are verified.

Website domain: dkandangkudo.com
Stable phone: +60 19-258 4291
