CrediConnect Solutions — multi-page company website

Open index.html to start. Pages: Services, About, Careers, Contact.
Contact and "Talk to us" (careers.html + contact.html) are unchanged — still
the primary way visitors reach the team.

Backend / forms (Netlify Forms — no server code needed):
- contact.html: "contact" form — name, work email, company, message.
- careers.html: "careers-application" form — name, email, phone, position,
  resume upload (PDF/DOC/DOCX), optional message. Uses multipart/form-data
  so Netlify can store the resume file as an attachment.

Both forms are detected automatically by Netlify at deploy time because of
the data-netlify="true" attribute — no functions or database required.

To get emailed when someone submits:
Netlify dashboard → Site configuration → Forms → Form notifications →
Add notification → "Email notification" → pick the form (contact or
careers-application) → enter the notification email address → Save.
Submissions are also visible anytime in Site configuration → Forms.

Admin backend (Netlify Functions + Netlify Blobs — a real database):
- Leadership roster (about.html), the 8-item KPI dashboard (about.html),
  twelve months of KPI trend data (also about.html, feeding the trend
  charts), and the Open Roles list (careers.html) are now editable at
  runtime through admin.html ("Staff Portal" link in the footer of every
  page).
- Data lives in Netlify Blobs (a key-value store built into every Netlify
  site — no external database, no signup, no API keys). Files under
  netlify/functions/ read and write it.
- About and Careers pages fetch this data on load and render it. If the
  fetch fails (e.g. opening the raw HTML files locally, or before first
  deploy) they silently fall back to the content already written in the
  HTML, so the site never breaks.

One-time setup after deploying to Netlify:
1. Site configuration → Environment variables → add ADMIN_PASSWORD with
   whatever password the staff should use to sign in to admin.html.
   Without this variable set, all admin writes are rejected — reads
   (the public pages) still work fine.
2. Deploy via a Git-connected Netlify site or `netlify deploy` (Netlify
   CLI), NOT a plain drag-and-drop of just this folder. The functions
   need `npm install` to run (for the @netlify/blobs package listed in
   package.json), which only happens on a build — either connect this
   folder to a GitHub/GitLab repo and link it in Netlify, or install the
   Netlify CLI and run `netlify deploy --prod` from inside this folder.
3. Visit yoursite.netlify.app/admin.html, enter the ADMIN_PASSWORD, and
   edit the three sections (Leadership, KPI Dashboard, Open Roles). Add
   rows with "+ Add...", edit any field inline, remove with "Remove",
   then "Save" each section separately.

Security hardening (added on top of the original shared-password/OTP setup):
- Rate limiting: admin-auth, send-otp and verify-otp each limit attempts
  per client IP (5–8 tries per 15-minute window) and lock out for 15
  minutes once exceeded. notify-telegram is also capped (10/15 min) since
  it's a public endpoint anyone could otherwise call directly to spam the
  staff Telegram bot.
- The OTP code itself is also capped at 5 wrong guesses before it's
  invalidated and a new one has to be requested.
- Password comparisons (ADMIN_PASSWORD and the OTP code) use a
  constant-time check so response timing can't be used to guess them
  character by character.
- Sessions issued after OTP verification: fixed 2-hour absolute expiry, but
  also extend on active use (30-minute sliding idle window, never past the
  2-hour cap) so the portal doesn't get logged out mid-edit. There's now a
  "Sign out" button in admin.html that calls revoke-session.js to delete
  the session immediately server-side, rather than leaving it valid until
  it naturally expires.
- Every leadership/KPI/jobs save is written to a capped audit log (last
  200 entries — action, section, item count, timestamp), viewable in
  admin.html under the new "Activity Log" tab. This is the closest
  equivalent to per-user accountability the site has, since everyone still
  signs in with one shared password.
- The admin write endpoints (leadership/kpis/jobs POST) check the request's
  Origin header against the site's own host as defense-in-depth against
  CSRF. This isn't strictly needed today — the admin app authenticates with
  an explicit header, not an ambient cookie, so a third-party site can't
  make the browser send it automatically — but it's a cheap second layer
  in case sessions ever move to cookies later.

Still true, and worth knowing before handling real sensitive data: this
remains a single shared password rather than per-user accounts, there's no
password hashing/rotation flow, and Netlify Blobs isn't an audited
compliance-grade datastore. Fine for a class project / internal demo, but
a real production financial-services portal would still want per-user
authentication (e.g. an identity provider) before going live.

Telegram privacy: the instant staff alert for contact/careers submissions
no longer includes the visitor's name, email, or company — it just says a
new inquiry/application came in (and, for careers, which role) and points
staff to the Netlify dashboard, where the actual submission with personal
details is stored. Personal information is no longer relayed through a
third-party chat app.

KPI monthly trends (about.html):
- The About page now shows three trend charts under the KPI dashboard —
  percentage metrics (CSAT, FCR, Attendance, QA, Call Resolution,
  Productivity), Average Handle Time, and Net Promoter Score — each
  plotted across 12 months.
- Data lives in Netlify Blobs under kpi-monthly (netlify/functions/
  kpi-monthly.js), seeded from the team's "Call Center KPI Dashboard"
  spreadsheet. Edit it in admin.html under the "Monthly Trends" tab — a
  12-row table (one row per month, one column per metric) rather than the
  add/remove row editor used for the other sections, since the month list
  itself doesn't change.
- The charts are hand-rolled inline SVG (in script.js) rather than a
  charting library, since there were only three small charts to draw and
  it avoids an extra script dependency.

Our Facility section (about.html):
- Two concept images — facility-building-blueprint.webp (an architectural
  concept for a 4-story office) and facility-rooms-blueprint.webp (concept
  floor plans for the Operations Floor, Supervisor Area, QA Room, HR
  Office, Training Room, Restrooms, Server Room, and Emergency Exit) — are
  presented as a "Facility concept" section on the About page, labeled as
  concept art rather than photos of an actual existing building.
- facility-rooms-blueprint.webp is also used, very faintly (5% opacity),
  as a background texture behind the "Our story" panel earlier on the
  same page.

Staff Portal login code via Telegram (optional, added on top of the above):
- Staff Portal sign-in: after the correct password, admin.html now also
  sends a 6-digit code to the staff Telegram chat and asks for it before
  unlocking the editor.
- This uses the same Telegram bot as the staff alerts below (see "One-time
  setup for Telegram alerts") and Netlify Blobs (the same store used
  above) to hold the code for 10 minutes. No separate setup is needed —
  once TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are set, both the login
  code and the alerts below work.
- If TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID are left unset, this quietly
  turns itself off: admin.html falls back to password-only sign-in —
  nothing breaks, the site just behaves as it did before this feature was
  added.
- There used to be an emailed OTP step here (via Resend) for the Staff
  Portal, plus an email "Verify email" step on the contact and careers
  forms. Both have been removed — Resend is no longer used anywhere in
  this project, and the contact/careers forms go straight to an enabled
  Submit button with no verification step.

Instant alerts to staff (separate from the login code above):
- Every time the contact form or careers application is successfully
  submitted, an instant message is sent to a Telegram chat via a free
  Telegram bot, e.g. "New contact inquiry received — check the Netlify
  dashboard for details." (careers alerts also name the role applied for).
- These alerts are intentionally minimal and no longer include the
  visitor's name, email, or company — see "Telegram privacy" above.
- This is a one-way alert to staff, not a code anyone has to enter — it's
  purely informational, sent right after a successful submission.
- This uses Telegram instead of real SMS because genuine SMS delivery
  isn't free anywhere at real volume (Twilio, Semaphore, etc. all
  charge per text past a small trial credit) — Telegram's Bot API is
  free and unlimited, and delivers as an instant push notification to
  whatever phone/device has Telegram installed.

One-time setup for Telegram alerts, in Netlify → Site configuration →
Environment variables:
1. In Telegram, message **@BotFather** → send `/newbot` → follow the
   prompts (choose a name and a username ending in "bot"). BotFather
   replies with a token that looks like `123456789:AAExampleTokenHere`.
2. Message your new bot anything (e.g. "hi") so it can see your chat —
   bots can't message you first.
3. Find your chat ID: open this URL in a browser (with your own token
   filled in): https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates
   Look for `"chat":{"id":123456789,...}` in the response — that number
   is your chat ID. (If it's empty, make sure step 2's message was sent
   after creating the bot, then reload the URL.)
4. Add these two environment variables:
   - TELEGRAM_BOT_TOKEN — the token from BotFather
   - TELEGRAM_CHAT_ID — the chat ID from step 3

If those two variables are left unset, Telegram notifications quietly
do nothing — form submissions still succeed and show their normal
"Thank you" message either way.
