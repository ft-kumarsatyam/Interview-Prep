# PrepOS: Ask Gemini (Chrome extension)

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
