# 點名小幫手

A small roll-call page. The default mode picks one interviewer and a few interviewees per session and records who has been picked in a Google Sheet. The old all-names ON/OFF mode is still available behind the `舊版` button.

## How it works

- `index.html` is a static page (GitHub Pages). It talks to a Google Apps Script web app (`Code.gs`) bound to the spreadsheet. The script checks a shared password and reads/writes the sheet.
- One session per day. Every change saves the whole state of today's session, replacing that date's rows, so there is no save button. The status next to the hint shows `儲存中… / ✓ 已儲存 / ✗ 儲存失敗，點此重試`.
- The upper grid puts people not yet picked in the current cycle first. Those already picked go last, with the date they were picked. A cycle ends when everyone except the current interviewer has been picked once; then the next cycle starts fresh, with no dates shown. Today's rows don't affect the order, so the grid doesn't reshuffle while you tap.

## Setup

1. Create a Google Sheet. Open **Extensions → Apps Script**, replace the editor content with `Code.gs`, save.
2. In the Apps Script editor, run `setup` once (authorize when asked). It creates two tabs:
   - `Members`: `name`, `active`. One name per row, in display order. Leave `active` blank or `TRUE`; set it to `FALSE` (or untick a checkbox) to drop someone while keeping their history.
   - `Records`: `date` (yyyy-MM-dd), `interviewer`, `interviewee`. Written by the app; one row per interviewee. Safe to edit by hand.
3. **Project Settings → Script Properties**: add `PASSWORD` with the shared password.
4. **Deploy → New deployment → Web app**: execute as **Me**, access **Anyone**. Copy the `/exec` URL.
5. Put that URL in `API_URL` near the top of the script in `index.html`, and publish.

After editing `Code.gs`, use **Deploy → Manage deployments → Edit → New version** so the same URL picks up the change.

## Notes

- Add new members at the bottom of `Members`. The old mode's shared links store positions in that list.
- Names link records to members, so renaming someone means find-and-replace in `Records` too.
- Two devices editing the same day: the last save wins. Reload to pick up the latest.
