# Icebreaker Find Person

## This You?

The easiest way to start a conversation without overthinking it.

You will see a bunch of random facts about people at this party.
Some impressive. Some chaotic. Some questionable.

Your job is to figure out who is who by actually talking to people.

Guests scan a QR code, activate their profile, and move through guest cards one by one.
They submit guesses, skip cards, and keep exploring new people in the room.

## Why this is fun at events
- Breaks awkward silence in the first minutes.
- Gives every guest an easy reason to approach someone new.
- Works for birthdays, team offsites, community meetups, and networking nights.
- Creates instant engagement and energy without a host doing manual matchmaking.

## How guests experience it
1. Scan QR code.
2. Enter their own name.
3. Receive one mystery fact.
4. Find the person behind the fact.
5. Submit answer and celebrate if correct.

## How hosts use it
1. Prepare guest list in Google Sheets.
2. Add one fun fact per guest.
3. Deploy Apps Script web app.
4. Print one QR code that links to the app URL.
5. Run raffle from the `winners` sheet.

## Data setup (Google Sheets)
Create one spreadsheet with 3 tabs:

### `guests`
Headers:
- `id`
- `name`
- `fact`
- `active`

Example:
- `1 | Alex Morgan | Speaks 4 languages | true`

### `attempts`
Headers:
- `timestamp`
- `playerName`
- `assignedGuestId`
- `assignedGuestName`
- `answerName`
- `isCorrect`
- `sessionId`

### `winners`
Headers:
- `timestamp`
- `playerName`
- `assignedGuestName`
- `sessionId`

## Deploy with Apps Script (single-file mode)
This repo includes `apps-script/Code.gs` ready for deployment without `index.html`.

1. Open your Google Sheet.
2. Go to **Extensions -> Apps Script**.
3. Replace code in `Code.gs` with `apps-script/Code.gs` from this repo.
4. Save.
5. Deploy as **Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Copy `/exec` URL and use it as your QR destination.

### Endpoint check
To verify public guest JSON:
- `YOUR_EXEC_URL?endpoint=guests`

## Frontend local development
1. Install dependencies:
   - `npm install`
2. Create `.env` from `.env.example`:
   - `VITE_API_BASE_URL="YOUR_EXEC_URL"`
3. Run:
   - `npm run dev`

## GitHub Pages deployment
This repository includes `.github/workflows/deploy.yml`:
- builds on push to `main`
- uploads `dist`
- deploys to GitHub Pages

Set repository secret:
- `VITE_API_BASE_URL` = your Apps Script `/exec` URL

## Technical notes
- Name matching is case-insensitive and supports Cyrillic + Latin input.
- A player is never assigned to themself.
- Session and assignment are persisted in `localStorage`.
- Winner writes are deduplicated by `playerName + sessionId`.

## Build
- `npm run build`
- `npm run preview`
