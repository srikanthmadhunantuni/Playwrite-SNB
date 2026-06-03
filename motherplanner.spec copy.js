const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test.setTimeout(1600000);

test.use({
  ignoreHTTPSErrors: true,
});

test('SAP Business One Full API Capture Flow', async ({ page }) => {

  // ==================================================
  // CREATE LOG FOLDER
  // ==================================================

  const logFolder = path.join(__dirname, 'logs');

  if (!fs.existsSync(logFolder)) {
    fs.mkdirSync(logFolder, { recursive: true });
  }

  // ==================================================
  // CREATE UNIQUE LOG FILE
  // ==================================================

  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-');

  const logFile = path.join(
    logFolder,
    `all-api-calls-${timestamp}.txt`
  );

  fs.writeFileSync(
    logFile,
    `PLAYWRIGHT COMPLETE API LOG
CREATED: ${new Date()}

`,
    'utf8'
  );

  console.log(`LOG FILE CREATED: ${logFile}`);

  // ==================================================
  // CURRENT ACTION
  // ==================================================

  let currentAction = 'INITIAL';

  // ==================================================
  // SAVE LOG
  // ==================================================

  function saveLog(content) {

    fs.appendFileSync(
      logFile,
      content,
      'utf8'
    );
  }

  // ==================================================
  // SAVE ACTION SEPARATOR
  // ==================================================

  function logAction(actionName) {

    currentAction = actionName;

    const actionLog = `

******************************************************************
ACTION STARTED
******************************************************************

TIME:
${new Date().toLocaleString()}

ACTION:
${actionName}

******************************************************************

`;

    saveLog(actionLog);

    console.log(`\n==============================`);
    console.log(`ACTION: ${actionName}`);
    console.log(`==============================\n`);
  }

  // ==================================================
  // CAPTURE ALL REQUESTS
  // ==================================================

  page.on('request', async (request) => {

    try {

      const headers = request.headers();

      const log = `

==================================================
REQUEST
==================================================

TIME:
${new Date().toLocaleString()}

ACTION:
${currentAction}

METHOD:
${request.method()}

RESOURCE TYPE:
${request.resourceType()}

URL:
${request.url()}

HEADERS:
${JSON.stringify(headers, null, 2)}

PAYLOAD:
${request.postData() || 'NO PAYLOAD'}

==================================================

`;

      saveLog(log);

      console.log(`➡️ REQUEST: ${request.method()} ${request.url()}`);

    } catch (err) {

      console.log('REQUEST CAPTURE ERROR:', err);

    }
  });

  // ==================================================
  // CAPTURE ALL RESPONSES
  // ==================================================

  page.on('response', async (response) => {

    try {

      let responseBody = '';

      try {

        responseBody = await response.text();

      } catch {

        responseBody = 'UNABLE TO READ RESPONSE BODY';

      }

      const responseHeaders = response.headers();

      const log = `

##################################################
RESPONSE
##################################################

TIME:
${new Date().toLocaleString()}

ACTION:
${currentAction}

STATUS:
${response.status()}

STATUS TEXT:
${response.statusText()}

URL:
${response.url()}

HEADERS:
${JSON.stringify(responseHeaders, null, 2)}

RESPONSE:
${responseBody}

##################################################

`;

      saveLog(log);

      console.log(`⬅️ RESPONSE: ${response.status()} ${response.url()}`);

    } catch (err) {

      console.log('RESPONSE CAPTURE ERROR:', err);

    }
  });

  // ==================================================
  // CAPTURE CONSOLE LOGS
  // ==================================================

  page.on('console', async (msg) => {

    try {

      const log = `

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
BROWSER CONSOLE
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

TIME:
${new Date().toLocaleString()}

ACTION:
${currentAction}

TYPE:
${msg.type()}

MESSAGE:
${msg.text()}

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

`;

      saveLog(log);

    } catch (err) {

      console.log('CONSOLE CAPTURE ERROR:', err);

    }
  });

  // ==================================================
  // CAPTURE PAGE ERRORS
  // ==================================================

  page.on('pageerror', async (error) => {

    try {

      const log = `

!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
PAGE ERROR
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

TIME:
${new Date().toLocaleString()}

ACTION:
${currentAction}

ERROR:
${error.message}

STACK:
${error.stack}

!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

`;

      saveLog(log);

    } catch (err) {

      console.log('PAGE ERROR CAPTURE FAILED:', err);

    }
  });

  // ==================================================
  // HELPER FUNCTION
  // ==================================================

  async function selectFirstRow() {

    await page.waitForTimeout(3000);

    await page.locator(
      '[id="__xmlview1--motherplannerTable-rowsel0"]'
    ).click();

    await page.waitForTimeout(2000);
  }

  // ==================================================
  // OPEN APPLICATION
  // ==================================================

  logAction('OPEN APPLICATION');

  await page.goto(
    'YOUR_URL_HERE',
    {
      waitUntil: 'networkidle'
    }
  );

  // ==================================================
  // LOGIN
  // ==================================================

  logAction('WAIT FOR USERNAME');

  await page.waitForSelector('#username');

  logAction('ENTER USERNAME');

  await page.fill(
    '#username',
    'balag'
  );

  logAction('CLICK LOGIN BUTTON 1');

  await page.getByRole('button', {
    name: 'Log In'
  }).click();

  await page.waitForTimeout(3000);

  logAction('ENTER PASSWORD');

  await page.fill(
    'input[name="password"]',
    process.env.PASSWORD || 'Welcome@12345'
  );

  logAction('CLICK LOGIN BUTTON 2');

  await page.getByRole('button', {
    name: 'Log In'
  }).click();

  await page.waitForLoadState('networkidle');

  // ==================================================
  // SELECT COMPANY
  // ==================================================

  logAction('OPEN COMPANY DROPDOWN');

  await page.locator('div')
    .filter({ hasText: /^Select Company$/ })
    .click();

  await page.waitForTimeout(2000);

  logAction('SEARCH COMPANY');

  await page.getByRole('textbox', {
    name: 'Search'
  }).fill('dev');

  await page.waitForTimeout(2000);

  logAction('SELECT COMPANY');

  await page.getByText(
    'Glass House (development) ('
  ).click();

  await page.waitForTimeout(2000);

  logAction('CLICK COMPANY OK BUTTON');

  await page.getByRole('button', {
    name: 'OK'
  }).click();

  await page.waitForLoadState('networkidle');

  // ==================================================
  // OPEN MOTHER PLANTS
  // ==================================================

  logAction('OPEN SEARCH');

  await page.getByRole('button', {
    name: 'Open Search'
  }).click();

  await page.waitForTimeout(2000);

  logAction('SEARCH MOTHER PLANTS');

  await page.getByRole('searchbox', {
    name: 'Search'
  }).fill('mother plants');

  await page.waitForTimeout(2000);

  logAction('OPEN MOTHER PLANTS');

  await page.getByText(
    'Mother Plants'
  ).click();

  await page.waitForLoadState('networkidle');

  // ==================================================
  // RELOAD PAGE
  // ==================================================

  logAction('RELOAD PAGE');

  await page.reload({
    waitUntil: 'networkidle'
  });

  // ==================================================
  // SELECT LOCATION
  // ==================================================

  logAction('OPEN LOCATION DROPDOWN');

  await page.locator(
    '[id="__xmlview1--locDropDown-reset"]'
  ).click();

  await page.waitForTimeout(2000);

  logAction('SEARCH LOCATION');

  await page.getByRole('searchbox', {
    name: 'Search'
  }).fill('snb9.b54');

  await page.waitForTimeout(2000);

  logAction('SELECT LOCATION SNB9.B54');

  await page.getByRole('option', {
    name: 'SNB9.B54 - C12-1000009-LIC'
  }).click();

  await page.waitForLoadState('networkidle');

  // ==================================================
  // SEARCH TEEN
  // ==================================================

  logAction('SEARCH TEEN');

  await page.getByRole('textbox', {
    name: 'Search'
  }).fill('teen');

  await page.getByRole('textbox', {
    name: 'Search'
  }).press('Enter');

  await page.waitForLoadState('networkidle');

  // ==================================================
  // CREATE PACKAGE
  // ==================================================

  logAction('SELECT ROW CREATE PACKAGE');

  await selectFirstRow();

  logAction('OPEN CREATE PACKAGE');

  await page.getByRole('button', {
    name: 'Create Package'
  }).click();

  await page.waitForTimeout(3000);

  logAction('OPEN PACKAGE TAG DROPDOWN');

  await page.locator(
    '#createPackageDialog--pTag-arrow'
  ).click();

  await page.waitForTimeout(3000);

  logAction('ENTER PACKAGE QUANTITY');

  await page.getByRole('spinbutton', {
    name: 'Qty'
  }).fill('111');

  await page.waitForTimeout(3000);

  logAction('SUBMIT CREATE PACKAGE');

  await page.getByRole('button', {
    name: 'Ok'
  }).click();

  await page.waitForLoadState('networkidle');

  // ==================================================
  // EDIT LOT NUMBER
  // ==================================================

  logAction('SELECT ROW EDIT LOT');

  await selectFirstRow();

  logAction('OPEN EDIT LOT NUMBER');

  await page.getByRole('button', {
    name: 'Edit Lot Number'
  }).click();

  await page.waitForTimeout(3000);

  logAction('ENTER LOT NUMBER');

  await page.getByRole('textbox', {
    name: 'Lot Number'
  }).fill('LOT-123');

  await page.waitForTimeout(2000);

  logAction('UPDATE LOT NUMBER');

  await page.getByRole('button', {
    name: 'Update',
    exact: true
  }).click();

  await page.waitForLoadState('networkidle');

  // ==================================================
  // CHANGE LOCATION
  // ==================================================

  logAction('SELECT ROW CHANGE LOCATION');

  await selectFirstRow();

  logAction('OPEN CHANGE LOCATION');

  await page.getByRole('button', {
    name: 'Change Location'
  }).click();

  await page.waitForTimeout(3000);

  logAction('OPEN SELECT LOCATION DROPDOWN');

  await page.getByRole('gridcell', {
    name: 'Select Location'
  }).getByLabel('Select Options').click();

  await page.waitForTimeout(2000);

  logAction('SELECT LOCATION SNB9.B55');

  await page.getByText(
    'SNB9.B55',
    { exact: true }
  ).click();

  await page.waitForTimeout(2000);

  logAction('SUBMIT CHANGE LOCATION');

  await page.getByLabel('Footer actions')
    .getByRole('button', {
      name: 'Change Location'
    }).click();

  await page.waitForLoadState('networkidle');

  // ==================================================
  // DESTROY PLANTS
  // ==================================================

  logAction('SELECT ROW DESTROY');

  await selectFirstRow();

  logAction('OPEN ADDITIONAL OPTIONS');

  await page.getByRole('button', {
    name: 'Additional Options'
  }).click();

  await page.waitForTimeout(2000);

  logAction('OPEN DESTROY PLANTS');

  await page.getByRole('button', {
    name: 'Destroy Plants'
  }).click();

  await page.waitForTimeout(3000);

  logAction('ENTER DESTROY QUANTITY');

  await page.getByRole('textbox', {
    name: 'Quantity'
  }).fill('1');

  logAction('ENTER WASTE WEIGHT');

  await page.getByRole('textbox', {
    name: 'Waste Weight (lb)'
  }).fill('1');

  logAction('OPEN WASTE METHOD');

  await page.locator(
    '[id="__select2-__table2-0-label"]'
  ).click();

  await page.waitForTimeout(2000);

  logAction('SELECT COMPOST');

  await page.getByRole('option', {
    name: 'Compost'
  }).click();

  logAction('ENTER MATERIAL USED');

  await page.getByRole('textbox', {
    name: 'Material Used'
  }).fill('soil');

  logAction('OPEN WASTE REASON');

  await page.locator(
    '[id="__select3-__table2-0-arrow"]'
  ).click();

  await page.waitForTimeout(2000);

  logAction('SELECT DAMAGE REASON');

  await page.getByRole('option', {
    name: 'Damage'
  }).click();

  logAction('ENTER DESTROY NOTES');

  await page.getByRole('textbox', {
    name: 'Notes'
  }).fill('notes');

  logAction('SUBMIT DESTROY PLANTS');

  await page.getByRole('button', {
    name: 'Destroy Plants'
  }).click();

  await page.waitForLoadState('networkidle');

  // ==================================================
  // RECORD WASTE
  // ==================================================

  logAction('SELECT ROW RECORD WASTE');

  await selectFirstRow();

  logAction('OPEN ADDITIONAL OPTIONS RECORD WASTE');

  await page.getByRole('button', {
    name: 'Additional Options'
  }).click();

  await page.waitForTimeout(2000);

  logAction('OPEN RECORD WASTE');

  await page.getByRole('button', {
    name: 'Record Waste'
  }).click();

  await page.waitForTimeout(3000);

  logAction('ENTER RECORD WASTE WEIGHT');

  await page.getByRole('spinbutton', {
    name: 'Waste Weight (lb)'
  }).fill('1');

  logAction('OPEN RECORD WASTE METHOD');

  await page.locator(
    '[id="__select6-__table3-0-label"]'
  ).click();

  await page.waitForTimeout(2000);

  logAction('SELECT RECORD WASTE COMPOST');

  await page.getByRole('option', {
    name: 'Compost'
  }).click();

  logAction('ENTER RECORD MATERIAL USED');

  await page.getByRole('textbox', {
    name: 'Material Used'
  }).fill('soil');

  logAction('OPEN RECORD WASTE REASON');

  await page.locator(
    '[id="__select7-__table3-0-arrow"]'
  ).click();

  await page.waitForTimeout(2000);

  logAction('SELECT RECORD DAMAGE');

  await page.getByRole('option', {
    name: 'Damage'
  }).click();

  logAction('ENTER RECORD NOTES');

  await page.getByRole('textbox', {
    name: 'Notes'
  }).fill('notes');

  logAction('SUBMIT RECORD WASTE');

  await page.getByRole('button', {
    name: 'Record Waste'
  }).click();

  await page.waitForLoadState('networkidle');

  // ==================================================
  // OPEN PACKAGES
  // ==================================================

  logAction('OPEN PACKAGES');

  await page.getByText('Packages', {
    exact: true
  }).click();

  await page.waitForLoadState('networkidle');

  // ==================================================
  // SELECT PACKAGE LOCATION
  // ==================================================

  logAction('OPEN PACKAGE LOCATION');

  await page.locator(
    '[id="__xmlview1--locDropDown-reset"]'
  ).click();

  await page.waitForTimeout(2000);

  logAction('SELECT PACKAGE LOCATION');

  await page.getByRole('option', {
    name: 'SNB9.B54 - C12-1000009-LIC'
  }).click();

  await page.waitForLoadState('networkidle');

  // ==================================================
  // PACKAGE CHANGE LOCATION
  // ==================================================

  logAction('SELECT PACKAGE ROW');

  await selectFirstRow();

  logAction('OPEN PACKAGE CHANGE LOCATION');

  await page.getByRole('button', {
    name: 'Change Location'
  }).click();

  await page.waitForTimeout(3000);

  logAction('OPEN PACKAGE LOCATION DROPDOWN');

  await page.getByRole('gridcell', {
    name: 'Select Location'
  }).getByLabel('Select Options').click();

  await page.waitForTimeout(2000);

  logAction('SELECT PACKAGE LOCATION SNB9.B55');

  await page.getByText(
    'SNB9.B55',
    { exact: true }
  ).click();

  await page.waitForTimeout(2000);

  logAction('SUBMIT PACKAGE CHANGE LOCATION');

  await page.getByLabel('Footer actions')
    .getByRole('button', {
      name: 'Change Location'
    }).click();

  await page.waitForLoadState('networkidle');

  // ==================================================
  // PACKAGE EDIT LOT NUMBER
  // ==================================================

  logAction('SELECT PACKAGE ROW EDIT LOT');

  await selectFirstRow();

  logAction('OPEN PACKAGE EDIT LOT');

  await page.getByRole('button', {
    name: 'Edit Lot Number'
  }).click();

  await page.waitForTimeout(3000);

  logAction('ENTER PACKAGE LOT NUMBER');

  await page.getByRole('textbox', {
    name: 'Lot Number'
  }).fill('lot123');

  await page.waitForTimeout(2000);

  logAction('UPDATE PACKAGE LOT');

  await page.getByRole('button', {
    name: 'Update',
    exact: true
  }).click();

  await page.waitForLoadState('networkidle');

  // ==================================================
  // ADJUST PACKAGE
  // ==================================================

  logAction('SELECT PACKAGE ROW ADJUST');

  await selectFirstRow();

  logAction('OPEN ADJUST');

  await page.getByRole('button', {
    name: 'Adjust'
  }).click();

  await page.waitForTimeout(3000);

  logAction('ENTER ADJUST QUANTITY');

  await page.getByRole('spinbutton', {
    name: 'Adj. Qty'
  }).fill('11');

  logAction('OPEN ADJUST REASON');

  await page.getByRole('gridcell', {
    name: 'Reason'
  }).getByLabel('Select Options').click();

  await page.waitForTimeout(2000);

  logAction('SELECT ADJUST DAMAGE');

  await page.getByRole('option', {
    name: 'Damage'
  }).click();

  logAction('ENTER ADJUST NOTES');

  await page.getByRole('textbox', {
    name: 'Notes'
  }).fill('notes');

  logAction('SUBMIT ADJUST');

  await page.getByLabel('Footer actions')
    .getByRole('button', {
      name: 'Adjust'
    }).click();

  await page.waitForLoadState('networkidle');

  // ==================================================
  // MARK AS IMMATURE
  // ==================================================

  logAction('SELECT ROW MARK IMMATURE');

  await selectFirstRow();

  logAction('OPEN MARK IMMATURE');

  await page.getByRole('button', {
    name: 'Mark as Immature'
  }).click();

  await page.waitForTimeout(3000);

  logAction('CONFIRM MARK IMMATURE');

  await page.getByRole('button', {
    name: 'OK'
  }).click();

  await page.waitForLoadState('networkidle');

  // ==================================================
  // UNMARK AS MOTHER
  // ==================================================

  logAction('SELECT ROW UNMARK MOTHER');

  await selectFirstRow();

  logAction('OPEN ADDITIONAL OPTIONS UNMARK');

  await page.getByRole('button', {
    name: 'Additional Options'
  }).click();

  await page.waitForTimeout(2000);

  logAction('OPEN UNMARK AS MOTHER');

  await page.getByRole('button', {
    name: 'Unmark as Mother'
  }).click();

  await page.waitForTimeout(3000);

  logAction('CONFIRM UNMARK MOTHER');

  await page.getByRole('button', {
    name: 'OK'
  }).click();

  await page.waitForLoadState('networkidle');

  // ==================================================
  // FINAL MESSAGE
  // ==================================================

  const finalLog = `

==================================================
TEST COMPLETED SUCCESSFULLY
==================================================

FINISHED AT:
${new Date().toLocaleString()}

LOG FILE:
${logFile}

==================================================

`;

  saveLog(finalLog);

  console.log('');
  console.log('======================================');
  console.log('FULL API CAPTURE COMPLETED');
  console.log(`LOG FILE SAVED: ${logFile}`);
  console.log('======================================');
  console.log('');

  await page.waitForTimeout(5000);

  console.log('TEST FINISHED');
  console.log(`LOG SAVED TO: ${logFile}`);

});