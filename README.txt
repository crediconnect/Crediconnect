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
