# Portfolio website of Anandu Prabhakaran

Live site: https://anandupiiserk.github.io/ (GitHub Pages, branch `main`, files served from the repository root).

This repository is self-contained. Everything needed to change the site is here: the published files at the root and the build tools in `tools/`. Read this file first, then follow the runbooks below.

## Layout

| Path | What it is | Edit by hand? |
|---|---|---|
| `index.html`, `home.html`, `about.html`, `research.html`, `publications.html`, `workshops.html`, `gallery.html`, `contact.html` | Published pages. Generated. `home.html` is a copy of `index.html`. | No. Edit `tools/build_pages.py`, then build. |
| `style.css`, `script.js` | Shared look and behaviour. | Yes. These are the source. |
| `i18n.js` | Translations for 9 languages. Generated. | No. Edit `tools/translations*.py`, then build. |
| `img/` | Site images (portrait). | Yes. |
| `gallery/` | Photos (`PREFIX_NNN.JPG`, `PREFIX_NNN_NN.JPG`), `captions.txt`, `manifest.json` and `t/` thumbnails (both generated). | Photos via the `photos` command, captions by hand. |
| `tools/build_pages.py` | Generator. All page text lives here, plus the cache-busting version string and the Last Updated stamping. | Yes. |
| `tools/page_stamps.json` | Per-page content hash and Last Updated time. Never delete it. | No. |
| `tools/translations.py`, `translations_content.py`, `translations_extra.py` | Source of the translations. | Yes. |
| `tools/build_gallery.py`, `tools/build_i18n.py` | Helpers run by the build. | Rarely. |
| `tools/site.py` | The single command-line tool (below). | Rarely. |

## Commands

Run from any folder. Needs Python 3 and Pillow; `test` also needs Playwright with Chromium.

```
python3 tools/site.py build                       # regenerate i18n.js, thumbnails, manifest, all pages
python3 tools/site.py bump                        # raise the cache version string, then build
python3 tools/site.py photos MSpace_027 a.jpg b.jpg   # resize and name photos as a carousel (MSpace_027_01.JPG ...)
python3 tools/site.py photos MSpace_028 one.jpg --single   # one photo, named MSpace_028.JPG
python3 tools/site.py photos MSpace_027 c.jpg --start 3    # append to an existing carousel from number 03
python3 tools/site.py touch all                  # set Last Updated to now for visible changes made only in script.js or style.css (name pages or use all)
python3 tools/site.py check                       # static checks, exit code 1 on errors
python3 tools/site.py test --shots /tmp/shots     # Chromium test of all pages at 4 widths
python3 tools/site.py serve                       # http://localhost:8799 for looking by hand
```

## Runbook for any change

1. Read the request. State in one line how you read it. Search the web for any name or fact you are unsure of.
2. Make the change in a source file: page text in `tools/build_pages.py`, look and behaviour in `style.css` and `script.js`, captions in `gallery/captions.txt`, translations in `tools/translations*.py`. Never edit a generated HTML page or `i18n.js` by hand.
3. `python3 tools/site.py bump` (use `build` if only captions or page text changed).
4. `python3 tools/site.py check` and `python3 tools/site.py test`. Look at screenshots of what changed at 1440, 768, 390 and 320 px.
5. Commit with a short message and push to `main`. Use the attribution lines your environment specifies.
6. Tell the owner what changed, what could not be verified, and to hard refresh (Ctrl+Shift+R). GitHub Pages needs 1 to 2 minutes.

## Gallery rules

* Prefixes: `PhD_`, `Conf_`, `WORK_`, `Meet_`, `Event_`, `Field_`, `Visit_`, `MSpace_`. IDs have 3 digits. Read `gallery/captions.txt` for the highest number in a prefix before adding.
* A carousel is `ID_01.JPG`, `ID_02.JPG` ... with no gaps (up to 40) and one line `ID | [YYYY-MM-DD] caption`. A single photo is `ID.JPG` and one line `ID | [date] caption`. A per-photo caption is `ID_NN | text` and carries exact dates and details. One date per carousel.
* The gallery sorts by that date, newest first. A photo shows only if its ID has a line in `captions.txt`.
* Related photos go in one carousel unless the owner says otherwise. To insert in the middle, renumber so there are no gaps.
* Photos: 2000 px long edge, JPEG quality 85, progressive. The `photos` command does this. Do not commit originals.
* Check names of places, monuments and events online before writing them. Never guess people's names. The owner's dates and captions are often garbled: say how you read them.

## Standing rules

* Never use the em dash character anywhere (text, captions, code comments). `check` counts it.
* Write `PhD` (capital P, capital D, lower-case h). For labels styled as upper case use the class `nocaps`; do not wrap words in extra tags because translation is keyed on exact text.
* No Facebook or Instagram links. Shared or copied links must never end in `.html`.
* Reply in English, directly, without flattery. Label uncertainty. Never invent names, dates, places or sources.
* Times are shown in IST.

## Things to know

* Translation works on exact English strings. A changed or new string shows in English until it is added to `tools/translations*.py`.
* Every change to `style.css`, `script.js` or `i18n.js` needs `bump`, or visitors keep old cached files.
* Each page has its own Last Updated time in a `last-updated` meta tag. It changes when that page's own content changes (even one letter), and for every page when the shared header, footer, menu or social buttons change, because they show on every page. Those shared parts are the blocks in `script.js` between the `@stamp` and `@endstamp` comments (the `SITE` data, `socialsHTML` and `buildChrome`); keep new header or footer text inside them. Gallery photo or caption changes update the Gallery page. Styling, behaviour code and translations do not stamp anything; after a visible change made only there, run `python3 tools/site.py touch <pages>` (or `all`).
* `.copy .cp` (the copyright line) uses transparent shimmer text: put new footer elements next to it, not inside it.
* The boot screen shows once per browser session; use a fresh browser context to see it. The first-visit wave around the theme button uses the localStorage key `thint`.
* Content protection is on: right-click, text selection, copy, cut, select all (Ctrl/Cmd+A) and print (Ctrl/Cmd+P and the print dialog) are disabled outside form fields. See `protect()` in `script.js` and the last block of `style.css`. The copy-link, copy-email and share buttons still work. It only deters casual copying; anyone can still read the page source or take screenshots.
* Right-click opens a small shortcut menu instead of the browser menu (`ctxMenu()` in `script.js`): F / F11 full screen, V voice assistant, and L language change (shown and working only while the voice assistant is on; otherwise the language button is used), and R reset to English (shown whenever the language is not English). The voice start notice also tells the visitor about L and R. The same keys work without the menu, except inside form fields.
* The keyboard shortcuts for developer tools (F12, Ctrl/Cmd+Shift+I, J, C, Cmd+Option+I) and view source (Ctrl/Cmd+U) are blocked in `protect()`. The browser menu still opens developer tools; this cannot be prevented.


## Appointment booking (Contact page)

The picker reads busy times from the Google Calendar of anandupiiserk@gmail.com and adds requests to it, through the Apps Script web app in `tools/google/appointments.gs` (project "Website appointments" in that Google account, deployed as a web app, execute as owner, access anyone). The web app URL is `APPT_ENDPOINT` in `tools/build_pages.py`. If it is empty or unreachable the picker falls back to opening the visitor's email app.

- Block a day: add an all-day event to the Google Calendar (any title). Timed events block only their own time. Google's Indian holiday calendar is also read.
- Weekends, 10:00 to 18:00 IST, 30 or 60 minutes, the holidays in `APPT_BLOCKED` and the ranges in `tools/unavailable.json` (`python3 tools/site.py block|unblock|blocked`) are enforced on the page.
- Changing the script: edit it in script.google.com, then Deploy, Manage deployments, edit, New version (the URL stays the same). Keep `tools/google/appointments.gs` in step.
- Requests appear on the calendar as "REQUEST (pending): name" (orange) and an email goes to the owner and the visitor.
- Sending email needs the `script.google.com` permission to send mail as the owner. If emails stop arriving, open the project in script.google.com, run any function that calls MailApp (for example a one-line test) and approve the permission prompt, then Deploy, Manage deployments, New version. Errors are written to the Executions log.


### Composing emails from the admin portal
Every contact-message notification has a Reply button (rich editor with attachments) and a Write a new email button. The new-email page starts a fresh conversation with any address, sent as Anandu Prabhakaran; bookmark that page for later use.

### Lite mode (temporary)
`LITE = True` (pages listed in LIVE_PAGES stay live) in tools/build_pages.py and `lite: true` plus `galleryOn: false` in script.js keep only the home page live (other pages become a small notice, no gallery downloads). To restore everything: set LITE = False, lite: false, galleryOn: true, then `python3 tools/site.py bump` and `build`.
