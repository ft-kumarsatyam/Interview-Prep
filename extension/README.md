# PrepOS (Chrome extension): Ask Gemini + send job pages

Gemini has no link that pre-fills a prompt, and a web page can't type into another site's tab.
This small extension bridges the gap: when you press **Ask Gemini** in PrepOS it

1. finds your already-open Gemini tab (preferring one on the same project/Gem path),
2. brings it to the front,
3. types the prompt into the box and presses send.

If no Gemini tab is open it opens your project link first. If the extension isn't installed, PrepOS
keeps working: it copies the prompt and opens Gemini, and you paste it.

## Install (Chrome, Edge, Brave)
1. Open `chrome://extensions` and turn on **Developer mode**.
2. **Load unpacked** and pick this `extension/` folder.
3. Reload PrepOS. The Settings page shows "Extension connected".

It only runs on `localhost`, `127.0.0.1` and `*.vercel.app`. If you use a custom domain, add it to
`content_scripts[0].matches` in `manifest.json` and reload the extension.

## Privacy
Permissions: `tabs` and `scripting`, with host access to `gemini.google.com` only. It reads nothing
from Gemini and sends nothing anywhere; the prompt goes from your PrepOS tab to your Gemini tab on your machine.

## If it stops filling the box
Gemini changes its markup now and then. The selectors for the input and send button are in
`fillGemini` at the top of `background.js`; update them there. The prompt is always on your
clipboard as well, so you can paste it meanwhile.


## Send a job or profile page to PrepOS
Open a job posting on Naukri, LinkedIn, Indeed, Wellfound or any careers page and click the PrepOS
toolbar icon. The extension reads **only that page, only when you click** (the `activeTab` permission
gives it no standing access to any site), pulls out the title, company and description (from the page's
`JobPosting` data when it has it), and hands it to your open PrepOS tab. If PrepOS isn't open it waits in
the extension's storage (at most 20) and is delivered the next time you open PrepOS.

The badge tells you what happened: a green tick means PrepOS got it, a blue 1 means it is queued, `?`
means the page didn't look like a job, `!` means the page can't be read (for example a `chrome://` page).

On your own profile page (`linkedin.com/in/...`, Naukri's profile, Wellfound's profile) the icon sends
the page text instead, and PrepOS saves a read-only snapshot you can audit like a resume.

It never logs in, never clicks Apply and never sends anything except to your own PrepOS tab. Permissions
added: `activeTab` and `storage`. Reload the extension at `chrome://extensions` after updating it.


## Send without a PrepOS tab (API token)
Open the extension's **Options** (right-click the icon > Options). Paste your PrepOS address and an API token
that has the `capture:write` scope (PrepOS: Settings > API tokens), then Save. Chrome asks permission for that one
address. From then on a click sends the page straight to `POST /api/v1/jobs` (or `/profiles`) with the token, so no PrepOS
tab is needed. Each capture carries an `Idempotency-Key`, so a retry after a flaky connection never saves it twice. If the
token is wrong or expired the badge shows `!` and the capture waits in the queue; if the network is down it also waits,
and the open-tab path still works as before. Remove the token any time with **Remove**. It is stored only in this browser
and is sent only to the address you entered. The API is described at `/api/v1/openapi.json`.
