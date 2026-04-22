const SHEET_GUESTS = 'guests';
const SHEET_ANSWERS = 'answers';
const SHEET_SKIPS = 'skips';

function doGet(e) {
  const endpoint = String((e && e.parameter && e.parameter.endpoint) || '').toLowerCase();

  if (endpoint === 'guests') {
    return ContentService.createTextOutput(
      JSON.stringify({ guests: getGuests() })
    ).setMimeType(ContentService.MimeType.JSON);
  }

  if (endpoint === 'get_profile') {
    const name = String((e && e.parameter && e.parameter.name) || '');
    const guest = getProfileByName_(name);
    return ContentService.createTextOutput(JSON.stringify({ guest: guest })).setMimeType(
      ContentService.MimeType.JSON
    );
  }

  if (endpoint === 'get_deck' || endpoint === 'refresh_deck') {
    const playerGuestId = String((e && e.parameter && e.parameter.playerGuestId) || '');
    const cards = getDeck_(playerGuestId);
    return ContentService.createTextOutput(JSON.stringify({ cards: cards })).setMimeType(
      ContentService.MimeType.JSON
    );
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Icebreaker QR Challenge</title>
      </head>
      <body style="font-family: Arial, sans-serif; padding: 16px;">
        <h1>Icebreaker QR Challenge</h1>
        <p id="status">Loading guests...</p>
        <p style="margin-top:8px;color:#555;">
          JSON test endpoint: <code>?endpoint=guests</code>
        </p>
        <script>
          google.script.run
            .withSuccessHandler(function(guests) {
              document.getElementById('status').textContent =
                'Loaded ' + guests.length + ' active guests. Script is working.';
            })
            .withFailureHandler(function(error) {
              document.getElementById('status').textContent =
                'Error: ' + (error && error.message ? error.message : 'Unknown error');
            })
            .getGuests();
        </script>
      </body>
    </html>
  `;

  return HtmlService.createHtmlOutput(html).setTitle('Icebreaker QR Challenge');
}

function doPost(e) {
  const endpoint = String((e && e.parameter && e.parameter.endpoint) || '').toLowerCase();
  const payload = parseJsonBody_(e);

  if (endpoint === 'activate_profile') {
    const guest = activateProfile_(payload);
    return ContentService.createTextOutput(JSON.stringify({ guest: guest })).setMimeType(
      ContentService.MimeType.JSON
    );
  }

  if (endpoint === 'submit_guess') {
    const result = submitGuess_(payload);
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(
      ContentService.MimeType.JSON
    );
  }

  if (endpoint === 'skip_card') {
    appendSkip_(payload);
    return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(
      ContentService.MimeType.JSON
    );
  }

  return ContentService.createTextOutput(JSON.stringify({ error: 'Route not found' })).setMimeType(
    ContentService.MimeType.JSON
  );
}

function getGuests() {
  const guestsSheet = getSheet_(SHEET_GUESTS);
  const rows = sheetToObjects_(guestsSheet);

  return rows
    .filter((row) => String(row.active).toLowerCase() === 'true')
    .map((row) => {
      const rawConfirmed = String(row.factConfirmed || '').trim().toLowerCase();
      // Backward-compatible fallback: old rows without factConfirmed are considered activated.
      const factConfirmed = rawConfirmed ? rawConfirmed === 'true' : true;
      return {
        id: String(row.id || ''),
        name: String(row.name || ''),
        fact: String(row.fact || ''),
        active: true,
        factConfirmed: factConfirmed,
        activatedAt: String(row.activatedAt || ''),
        factUpdatedAt: String(row.factUpdatedAt || ''),
      };
    })
    .filter((row) => row.id && row.name && row.fact);
}

function getProfileByName_(rawName) {
  const normalizedInput = normalizeName_(rawName);
  if (!normalizedInput) {
    return null;
  }

  const guests = getGuests();
  const exact = guests.find((guest) => normalizeName_(guest.name) === normalizedInput);
  if (exact) {
    return exact;
  }

  return guests.find((guest) => normalizeName_(guest.name).indexOf(normalizedInput) !== -1) || null;
}

function getDeck_(playerGuestId) {
  return getGuests()
    .filter(
      (guest) =>
        guest.active === true &&
        guest.factConfirmed === true &&
        String(guest.id) !== String(playerGuestId)
    )
    .map((guest) => ({
      id: guest.id,
      fact: guest.fact,
    }));
}

function activateProfile_(payload) {
  const guestId = String((payload && payload.guestId) || '');
  const fact = String((payload && payload.fact) || '').trim();
  if (!guestId || !fact) {
    throw new Error('guestId and fact are required.');
  }

  const guestsSheet = getSheet_(SHEET_GUESTS);
  const values = guestsSheet.getDataRange().getValues();
  if (!values.length) {
    throw new Error('Guests sheet is empty.');
  }

  const headers = values[0].map((value) => String(value || '').trim());
  const idIndex = headers.indexOf('id');
  const factIndex = headers.indexOf('fact');
  const confirmedIndex = ensureColumn_(guestsSheet, headers, 'factConfirmed');
  const activatedAtIndex = ensureColumn_(guestsSheet, headers, 'activatedAt');
  const factUpdatedAtIndex = ensureColumn_(guestsSheet, headers, 'factUpdatedAt');

  if (idIndex === -1 || factIndex === -1) {
    throw new Error('Guests sheet must include id and fact columns.');
  }

  const now = new Date().toISOString();
  for (var rowIndex = 1; rowIndex < values.length; rowIndex++) {
    if (String(values[rowIndex][idIndex] || '') !== guestId) {
      continue;
    }

    guestsSheet.getRange(rowIndex + 1, factIndex + 1).setValue(fact);
    guestsSheet.getRange(rowIndex + 1, confirmedIndex + 1).setValue(true);
    guestsSheet.getRange(rowIndex + 1, activatedAtIndex + 1).setValue(now);
    guestsSheet.getRange(rowIndex + 1, factUpdatedAtIndex + 1).setValue(now);
    break;
  }

  return getGuests().find((guest) => String(guest.id) === guestId) || null;
}

function submitGuess_(payload) {
  const playerGuestId = String((payload && payload.playerGuestId) || '');
  const targetGuestId = String((payload && payload.targetGuestId) || '');
  const answerName = String((payload && payload.answerName) || '');
  const cycle = String((payload && payload.cycle) || 'initial');
  const sessionId = String((payload && payload.sessionId) || '');

  const guests = getGuests();
  const target = guests.find((guest) => String(guest.id) === targetGuestId);
  if (!target) {
    throw new Error('Target guest not found.');
  }

  const isCorrect = normalizeName_(answerName) === normalizeName_(target.name);
  const result = isCorrect ? 'correct' : 'incorrect';
  appendAnswer_({
    sessionId: sessionId,
    playerGuestId: playerGuestId,
    targetGuestId: targetGuestId,
    answerName: answerName,
    result: result,
    cycle: cycle,
  });

  return { ok: true, result: result };
}

function appendAnswer_(body) {
  const sheet = ensureSheet_(SHEET_ANSWERS, [
    'timestamp',
    'sessionId',
    'playerGuestId',
    'targetGuestId',
    'answerName',
    'result',
    'cycle',
  ]);
  sheet.appendRow([
    new Date().toISOString(),
    String(body.sessionId || ''),
    String(body.playerGuestId || ''),
    String(body.targetGuestId || ''),
    String(body.answerName || ''),
    String(body.result || 'incorrect'),
    String(body.cycle || 'initial'),
  ]);
}

function appendSkip_(body) {
  const sheet = ensureSheet_(SHEET_SKIPS, [
    'timestamp',
    'sessionId',
    'playerGuestId',
    'targetGuestId',
    'cycle',
  ]);
  sheet.appendRow([
    new Date().toISOString(),
    String(body.sessionId || ''),
    String(body.playerGuestId || ''),
    String(body.targetGuestId || ''),
    String(body.cycle || 'initial'),
  ]);
}

function getSheet_(name) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(name);
  if (!sheet) {
    throw new Error('Missing required sheet: ' + name);
  }
  return sheet;
}

function ensureSheet_(name, headers) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(name);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(name);
  }

  const currentHeaders = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), headers.length)).getValues()[0];
  const isEmptyHeader = currentHeaders.every((value) => String(value || '').trim() === '');
  if (sheet.getLastRow() === 0 || isEmptyHeader) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  return sheet;
}

function ensureColumn_(sheet, headers, headerName) {
  var index = headers.indexOf(headerName);
  if (index !== -1) {
    return index;
  }

  index = headers.length;
  headers.push(headerName);
  sheet.getRange(1, index + 1).setValue(headerName);
  return index;
}

function sheetToObjects_(sheet) {
  const range = sheet.getDataRange();
  const values = range.getValues();
  if (!values.length) {
    return [];
  }

  const headers = values[0].map((header) => String(header || '').trim());
  return values.slice(1).map((row) => {
    const entry = {};
    headers.forEach((header, index) => {
      entry[header] = row[index];
    });
    return entry;
  });
}

function normalizeName_(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9а-яё\s-]/gi, '')
    .replace(/\s+/g, ' ');
}

function parseJsonBody_(e) {
  const postData = e && e.postData && e.postData.contents;
  if (!postData) {
    return {};
  }

  try {
    return JSON.parse(postData);
  } catch (error) {
    return {};
  }
}

