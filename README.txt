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
  Telegram bot, e.g. "New contact inquiry — CrediConnect Solutions.
  Name: Juan Dela Cruz. Company: ..., Email: juan@email.com."
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
