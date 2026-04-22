const SHEET_GUESTS = 'guests';
const SHEET_ATTEMPTS = 'attempts';
const SHEET_WINNERS = 'winners';

function doGet(e) {
  const endpoint = String((e && e.parameter && e.parameter.endpoint) || '').toLowerCase();
  if (endpoint === 'guests') {
    return ContentService.createTextOutput(
      JSON.stringify({ guests: getGuests() })
    ).setMimeType(ContentService.MimeType.JSON);
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

  if (endpoint === 'attempt') {
    appendAttempt_(payload);
    return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(
      ContentService.MimeType.JSON
    );
  }

  if (endpoint === 'winner') {
    appendWinner_(payload);
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
    .map((row) => ({
      id: String(row.id || ''),
      name: String(row.name || ''),
      fact: String(row.fact || ''),
      active: true,
    }))
    .filter((row) => row.id && row.name && row.fact);
}

function submitAttempt(payload) {
  appendAttempt_(payload || {});
  return { ok: true };
}

function submitWinner(payload) {
  appendWinner_(payload || {});
  return { ok: true };
}

function appendAttempt_(body) {
  const sheet = getSheet_(SHEET_ATTEMPTS);
  sheet.appendRow([
    new Date().toISOString(),
    String(body.playerName || ''),
    String(body.assignedGuestId || ''),
    String(body.assignedGuestName || ''),
    String(body.answerName || ''),
    Boolean(body.isCorrect),
    String(body.sessionId || ''),
  ]);
}

function appendWinner_(body) {
  const sheet = getSheet_(SHEET_WINNERS);
  const rows = sheetToObjects_(sheet);
  const duplicate = rows.find(
    (row) =>
      String(row.playerName || '').toLowerCase() === String(body.playerName || '').toLowerCase() &&
      String(row.sessionId || '') === String(body.sessionId || '')
  );

  if (duplicate) {
    return;
  }

  sheet.appendRow([
    new Date().toISOString(),
    String(body.playerName || ''),
    String(body.assignedGuestName || ''),
    String(body.sessionId || ''),
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

