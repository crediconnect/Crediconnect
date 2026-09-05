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
- Leadership roster (about.html), the 8-item KPI dashboard (about.html)
  and the Open Roles list (careers.html) are now editable at runtime
  through admin.html ("Staff Portal" link in the footer of every page).
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

Note: admin.html has no built-in rate limiting or account system beyond
the single shared password — fine for a class project / internal demo,
not for a real production site with sensitive data.

Email OTP verification (optional, added on top of the above):
- Staff Portal sign-in: after the correct password, admin.html now also
  emails a 6-digit code and asks for it before unlocking the editor.
- Contact form and Careers application: each has a "Verify email" step
  next to the email field. A code is emailed to whatever address the
  visitor typed; entering it correctly unlocks the Submit button.
- This uses Resend (resend.com) to send the emails and Netlify Blobs
  (the same store used above) to hold codes for 10 minutes.

One-time setup for OTP, in Netlify → Site configuration → Environment
variables, in addition to ADMIN_PASSWORD above:
1. RESEND_API_KEY — an API key from a free Resend account (resend.com).
2. RESEND_FROM — the "from" address to send as, e.g.
   "CrediConnect Solutions <onboarding@resend.dev>" (Resend's free
   onboarding@resend.dev sender works without verifying your own domain;
   for a real domain, verify it in Resend first and use that instead).
3. ADMIN_EMAIL — the staff inbox that should receive the admin sign-in
   codes (only used for the Staff Portal step, never shown to visitors).

If RESEND_API_KEY / RESEND_FROM are left unset, OTP quietly turns itself
off everywhere: admin.html falls back to password-only sign-in, and the
contact/careers forms skip straight to an enabled Submit button — nothing
breaks, the site just behaves as it did before this feature was added.

Note: the contact/careers OTP gate only controls whether the Submit
button is enabled in the browser — like the admin password, it's a
reasonable deterrent for a class project, not tamper-proof server-side
enforcement (someone could still edit the page's JavaScript to submit
without verifying). Good enough to cut down on obviously fake emails,
not meant to stop a determined bad actor.

SMS notifications to staff (separate from the email OTP above):
- Every time the contact form or careers application is successfully
  submitted, an instant message is sent to a Telegram chat via a free
  Telegram bot, e.g. "New contact inquiry — CrediConnect Solutions.
  Name: Juan Dela Cruz. Company: ..., Email: juan@email.com."
- This is a one-way alert to staff, not a code the visitor has to enter
  — different from the email OTP step, which is about verifying the
  visitor's own email address before they can submit.
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
