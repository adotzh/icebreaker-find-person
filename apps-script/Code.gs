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

  if (endpoint === 'get_progress') {
    const playerGuestId = String((e && e.parameter && e.parameter.playerGuestId) || '');
    const progress = getProgress_(playerGuestId);
    return ContentService.createTextOutput(JSON.stringify(progress)).setMimeType(
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

  const contains = guests.find((guest) => normalizeName_(guest.name).indexOf(normalizedInput) !== -1);
  if (contains) {
    return contains;
  }

  // Typo-tolerant fallback for near matches (e.g. Ana vs Anna).
  var bestGuest = null;
  var bestScore = 0;

  for (var i = 0; i < guests.length; i++) {
    var candidate = guests[i];
    var candidateName = normalizeName_(candidate.name);
    var score = similarityScore_(normalizedInput, candidateName);
    if (score > bestScore) {
      bestScore = score;
      bestGuest = candidate;
    }
  }

  return bestScore >= 0.78 ? bestGuest : null;
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
  const name = String((payload && payload.name) || '').trim();
  const fact = String((payload && payload.fact) || '').trim();
  if (!name || !fact) {
    throw new Error('name and fact are required.');
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
  const nameIndex = headers.indexOf('name');
  const activeIndex = ensureColumn_(guestsSheet, headers, 'active');

  const now = new Date().toISOString();
  var updated = false;

  if (guestId) {
    for (var rowIndex = 1; rowIndex < values.length; rowIndex++) {
      if (String(values[rowIndex][idIndex] || '') !== guestId) {
        continue;
      }

      if (nameIndex !== -1) {
        guestsSheet.getRange(rowIndex + 1, nameIndex + 1).setValue(name);
      }
      guestsSheet.getRange(rowIndex + 1, factIndex + 1).setValue(fact);
      guestsSheet.getRange(rowIndex + 1, activeIndex + 1).setValue(true);
      guestsSheet.getRange(rowIndex + 1, confirmedIndex + 1).setValue(true);
      guestsSheet.getRange(rowIndex + 1, activatedAtIndex + 1).setValue(now);
      guestsSheet.getRange(rowIndex + 1, factUpdatedAtIndex + 1).setValue(now);
      updated = true;
      break;
    }
  }

  if (!updated) {
    const newGuestId = createGuestId_(values, idIndex);
    const row = [];
    for (var col = 0; col < headers.length; col++) {
      const header = headers[col];
      if (header === 'id') {
        row[col] = newGuestId;
      } else if (header === 'name') {
        row[col] = name;
      } else if (header === 'fact') {
        row[col] = fact;
      } else if (header === 'active') {
        row[col] = true;
      } else if (header === 'factConfirmed') {
        row[col] = true;
      } else if (header === 'activatedAt') {
        row[col] = now;
      } else if (header === 'factUpdatedAt') {
        row[col] = now;
      } else {
        row[col] = '';
      }
    }
    guestsSheet.appendRow(row);
  }

  const normalizedName = normalizeName_(name);
  return (
    getGuests().find(
      (guest) =>
        (guestId && String(guest.id) === guestId) || normalizeName_(guest.name) === normalizedName
    ) || null
  );
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

function getProgress_(playerGuestId) {
  if (!playerGuestId) {
    return { answeredCardIds: [], skippedCardIds: [], currentCycle: 'initial' };
  }

  const answersRows = getOptionalSheetObjects_(SHEET_ANSWERS);
  const skipsRows = getOptionalSheetObjects_(SHEET_SKIPS);

  const answeredCardIds = unique_(
    answersRows
      .filter(
        (row) =>
          String(row.playerGuestId || '') === playerGuestId &&
          String(row.result || '').toLowerCase() === 'correct'
      )
      .map((row) => String(row.targetGuestId || ''))
      .filter(Boolean)
  );

  const skippedAll = unique_(
    skipsRows
      .filter((row) => String(row.playerGuestId || '') === playerGuestId)
      .map((row) => String(row.targetGuestId || ''))
      .filter(Boolean)
  );
  const skippedCardIds = skippedAll.filter((id) => answeredCardIds.indexOf(id) === -1);

  const latestSkipCycle = getLatestCycle_(skipsRows, playerGuestId);
  const latestAnswerCycle = getLatestCycle_(answersRows, playerGuestId);
  const currentCycle =
    latestSkipCycle === 'replay-skipped' || latestAnswerCycle === 'replay-skipped'
      ? 'replay-skipped'
      : 'initial';

  return {
    answeredCardIds: answeredCardIds,
    skippedCardIds: skippedCardIds,
    currentCycle: currentCycle,
  };
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

function getOptionalSheetObjects_(name) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(name);
  if (!sheet || sheet.getLastRow() < 2) {
    return [];
  }
  return sheetToObjects_(sheet);
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

function unique_(values) {
  const map = {};
  const result = [];
  for (var i = 0; i < values.length; i++) {
    const value = values[i];
    if (map[value]) {
      continue;
    }
    map[value] = true;
    result.push(value);
  }
  return result;
}

function getLatestCycle_(rows, playerGuestId) {
  var latestTimestamp = '';
  var latestCycle = 'initial';

  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    if (String(row.playerGuestId || '') !== playerGuestId) {
      continue;
    }
    var timestamp = String(row.timestamp || '');
    if (timestamp >= latestTimestamp) {
      latestTimestamp = timestamp;
      latestCycle = String(row.cycle || 'initial');
    }
  }

  return latestCycle === 'replay-skipped' ? 'replay-skipped' : 'initial';
}

function normalizeName_(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9а-яё\s-]/gi, '')
    .replace(/\s+/g, ' ');
}

function createGuestId_(values, idIndex) {
  if (idIndex === -1) {
    return String(Date.now());
  }

  var maxId = 0;
  for (var rowIndex = 1; rowIndex < values.length; rowIndex++) {
    var candidate = parseInt(String(values[rowIndex][idIndex] || ''), 10);
    if (!isNaN(candidate) && candidate > maxId) {
      maxId = candidate;
    }
  }
  if (maxId > 0) {
    return String(maxId + 1);
  }
  return String(Date.now());
}

function similarityScore_(left, right) {
  if (!left || !right) {
    return 0;
  }

  if (left === right) {
    return 1;
  }

  var distance = levenshteinDistance_(left, right);
  var maxLen = Math.max(left.length, right.length);
  if (maxLen === 0) {
    return 1;
  }

  return 1 - distance / maxLen;
}

function levenshteinDistance_(left, right) {
  var rows = left.length + 1;
  var cols = right.length + 1;
  var matrix = [];

  for (var i = 0; i < rows; i++) {
    matrix[i] = [];
    matrix[i][0] = i;
  }
  for (var j = 0; j < cols; j++) {
    matrix[0][j] = j;
  }

  for (var row = 1; row < rows; row++) {
    for (var col = 1; col < cols; col++) {
      var cost = left.charAt(row - 1) === right.charAt(col - 1) ? 0 : 1;
      matrix[row][col] = Math.min(
        matrix[row - 1][col] + 1,
        matrix[row][col - 1] + 1,
        matrix[row - 1][col - 1] + cost
      );
    }
  }

  return matrix[rows - 1][cols - 1];
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

