D'KANDANG KUDO STABLE — SIMPLE WEBSITE

FILES
- index.html         Outride landing / booking page
- membership.html    Membership registration + benefits
- styles.css         Shared design
- script.js          Small helper script

STRIPE SETUP
1. Create a Stripe Payment Link for the RM250 outride.
2. In index.html, replace:
   YOUR_STRIPE_OUTRIDE_PAYMENT_LINK
   with your real Stripe link.

3. Create a recurring Stripe Payment Link for RM50/month membership.
4. In membership.html AND script.js, replace:
   YOUR_STRIPE_MEMBERSHIP_PAYMENT_LINK
   with your real Stripe link.

MEMBERSHIP DISCOUNT LOGIC SHOWN
- Outrides 1–5: 10% off = RM225
- Outrides 6–10: 20% off = RM200
- Outrides 11 onward: 30% off = RM175

IMPORTANT BEFORE LAUNCH
- Confirm rider eligibility / experience requirements.
- Add cancellation, rescheduling, rain/weather and no-show policy.
- Add any rider weight/age limits if applicable.
- Add a waiver / assumption-of-risk process if required.
- Add your preferred contact method.
- Connect the membership form to a real form service / database if you want to store submissions.
- Replace the Unsplash hero image with your own stable/trail photos for a more authentic result.

PUBLISHING
This is a static site and can be deployed to:
- Netlify
- Vercel
- GitHub Pages
- Cloudflare Pages
- Any standard web hosting


PUBLIC BOOKING PAGE
- booking.html is the non-member/public session booking form.
- Visitors can choose a date and one of two daily sessions:
  Morning: 8:00 AM–10:00 AM
  Evening: 4:30 PM–6:30 PM
- The form prevents past dates and shows a live booking summary.
- It requires acknowledgement that session timing can change due to weather, trail conditions, horse availability, or safety.
- On submit it continues to the RM250 Stripe Payment Link.
- The rider email is passed to Stripe as prefilled_email.
- Booking details are currently only stored in sessionStorage in the visitor's browser. To manage real availability, prevent double-booking, or keep booking records, connect this form to a backend/database or booking service.


NUMBER OF PAX
- Public bookings now include a pax quantity field.
- Price is calculated as RM250 × number of riders.
- Example: 2 pax = RM500, 4 pax = RM1,000.
- The current static site stores pax and calculated total in the browser session.
- For Stripe, configure the outride Payment Link to allow adjustable quantity, or use a backend/Stripe Checkout Session to enforce the exact quantity and total automatically.
