const { test, expect } = require('@playwright/test');
const fs = require('fs');

test.setTimeout(1800000);

test.use({
  ignoreHTTPSErrors: true,
});

test('SAP Business One Automation Flow', async ({ page }) => {

  // ==================================================
  // CREATE UNIQUE LOG FILE
  // ==================================================

  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-');

  const fileName = `playwrite-${timestamp}.txt`;

  fs.writeFileSync(
    fileName,
    `PLAYWRIGHT API LOG\nCREATED: ${new Date()}\n\n`
  );

  // ==================================================
  // CONTROL VARIABLES
  // ==================================================

  let captureApis = false;

  let currentAction = '';

  // ==================================================
  // CAPTURE POST / PATCH REQUESTS
  // ==================================================

  page.on('request', async (request) => {

    if (!captureApis) {
      return;
    }

    const method = request.method();

    if (method === 'POST' || method === 'PATCH') {

      const log = `
==================================================
ACTION:
${currentAction}

METHOD:
${method}

URL:
${request.url()}

PAYLOAD:
${request.postData() || 'NO PAYLOAD'}
==================================================

`;

      fs.appendFileSync(fileName, log);
    }
  });

  // ==================================================
  // CAPTURE FAILED RESPONSES
  // ==================================================

  page.on('response', async (response) => {

    if (!captureApis) {
      return;
    }

    const status = response.status();

    if (status >= 400) {

      let body = '';

      try {
        body = await response.text();
      } catch (e) {
        body = 'Unable to read response';
      }

      // ==========================================
      // SAVE TO FILE
      // ==========================================

      const errorLog = `
XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
FAILED API

ACTION:
${currentAction}

STATUS:
${status}

URL:
${response.url()}

RESPONSE:
${body}
XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

`;

      fs.appendFileSync(fileName, errorLog);

      // ==========================================
      // SHOW IN TERMINAL
      // ==========================================

      console.log('');
      console.log('❌ API FAILED');
      console.log(`ACTION: ${currentAction}`);
      console.log(`STATUS: ${status}`);
      console.log('');
      console.log('URL:');
      console.log(response.url());

      console.log('');
      console.log('RESPONSE:');

      try {

        const json = JSON.parse(body);

        console.log(
          JSON.stringify(json, null, 2)
        );

      } catch {

        console.log(body);

      }

      console.log('');
      console.log('====================================');
      console.log('');
    }
  });

  // ==================================================
  // LOGIN
  // ==================================================

  console.log('Opening Login Page');

  await page.goto(
    'https://ghdev.seedandbeyond.com:223'
  );

  await page.waitForURL(/auth/, {
    timeout: 20000
  });

  console.log('Entering Username');

  await page.fill('#username', 'balag');

  console.log('Clicking First Login Button');

  await page.getByRole('button', {
    name: 'Log In'
  }).click();

  console.log('Entering Password');

  await page.fill(
    'input[name="password"]',
    'Welcome@12345'
  );

  console.log('Submitting Login');

  await page.getByRole('button', {
    name: 'Log In'
  }).click();

  console.log('Login Successful');

  // ==================================================
  // SELECT COMPANY
  // ==================================================

  console.log('Selecting Company');

  await page.locator('div')
    .filter({ hasText: /^Select Company$/ })
    .click();

  await page.getByRole('textbox', {
    name: 'Search'
  }).fill('dev');

  await page.getByText(
    'Glass House (development) ('
  ).click();

  await page.getByRole('button', {
    name: 'OK'
  }).click();

  console.log('Company Selected Successfully');

  // ==================================================
  // OPEN MOTHER PLANTS
  // ==================================================

  console.log('Opening Mother Plants Module');

  await page.waitForTimeout(5000);

  await page.getByRole('button', {
    name: 'Open Search'
  }).click();

  await page.getByRole('searchbox', {
    name: 'Search'
  }).fill('mother plants');

  await page.getByText('Mother Plants').click();

  await page.waitForTimeout(3000);

  await page.waitForLoadState('networkidle');

  console.log('Mother Plants Opened');

  // ==================================================
  // START API CAPTURE
  // ==================================================

  captureApis = true;

  console.log('API Capture Started');

  // ==================================================
  // RELOAD PAGE
  // ==================================================

  console.log('Reloading Page');

  await page.reload({
    waitUntil: 'domcontentloaded'
  });

  await page.waitForLoadState('networkidle');

  console.log('Page Reloaded Successfully');

  // ==================================================
  // SELECT LOCATION
  // ==================================================

  currentAction = 'SELECT LOCATION';

  console.log('Opening Location Dropdown');

  await page.waitForSelector(
    '[id="__xmlview1--locDropDown-reset"]',
    {
      timeout: 20000
    }
  );

  await page.locator(
    '[id="__xmlview1--locDropDown-reset"]'
  ).click();

  console.log('Typing Location');

  await page.getByRole('searchbox', {
    name: 'Search'
  }).fill('snb9.b54');

  console.log('Selecting Location');

  await page.getByRole('option', {
    name: 'SNB9.B54 - C12-1000009-LIC'
  }).click();

  await page.waitForLoadState('networkidle');

  console.log('Location Selected Successfully');

  // ==================================================
  // SEARCH TEEN
  // ==================================================

  currentAction = 'SEARCH TEEN';

  console.log('Searching Teen Plants');

  await page.getByRole('textbox', {
    name: 'Search'
  }).fill('teen');

  await page.getByRole('textbox', {
    name: 'Search'
  }).press('Enter');

  console.log('Teen Search Completed');

  // ==================================================
// CREATE PACKAGE
// ==================================================

currentAction = 'CREATE PACKAGE';

console.log('Selecting Mother Plant Row');

await page.waitForTimeout(5000);

await page.locator(
  '[id="__xmlview1--motherplannerTable-rowsel0"]'
).click();

console.log('Opening Create Package');

await page.getByRole('button', {
  name: 'Create Package'
}).click();

console.log('Opening Package Tag Dropdown');

await page.locator(
  '#createPackageDialog--pTag-arrow'
).click();

console.log('Entering Package Quantity');

await page.getByRole('spinbutton', {
  name: 'Qty'
}).fill('111');

await page.waitForTimeout(2000);

console.log('Submitting Create Package');

// ==================================================
// WAIT FOR PACKAGE API RESPONSE
// ==================================================

const packageResponsePromise = page.waitForResponse(
  response =>
    response.url().includes('/packages/frommotherplant') &&
    response.request().method() === 'POST',
  {
    timeout: 60000
  }
);

await page.getByRole('button', {
  name: 'Ok'
}).dblclick();

// ==================================================
// GET RESPONSE
// ==================================================

const packageResponse = await packageResponsePromise;

const status = packageResponse.status();

let responseBody = '';

try {

  responseBody = await packageResponse.text();

} catch (e) {

  responseBody = 'Unable to read response';

}

// ==================================================
// SUCCESS / FAILURE
// ==================================================

if (status >= 200 && status < 300) {

  console.log('');
  console.log('====================================');
  console.log('✅ PACKAGE CREATED SUCCESSFULLY');
  console.log(`STATUS: ${status}`);
  console.log('====================================');
  console.log('');

} else {

  console.log('');
  console.log('====================================');
  console.log('❌ PACKAGE CREATION FAILED');
  console.log(`STATUS: ${status}`);
  console.log('');

  console.log('URL:');
  console.log(packageResponse.url());

  console.log('');
  console.log('RESPONSE:');

  try {

    console.log(
      JSON.stringify(
        JSON.parse(responseBody),
        null,
        2
      )
    );

  } catch {

    console.log(responseBody);

  }

  console.log('');
  console.log('====================================');
  console.log('');

}

// ==================================================
// OPTIONAL EXTRA WAIT
// ==================================================

await page.waitForLoadState('networkidle');
await page.waitForTimeout(3000);

  // ==================================================
  // EDIT LOT NUMBER
  // ==================================================

  currentAction = 'EDIT LOT NUMBER';

  console.log('Selecting Row For Edit Lot');

  await page.waitForTimeout(5000);

  await page.locator(
    '[id="__xmlview1--motherplannerTable-rowsel0"]'
  ).click();

  console.log('Opening Edit Lot Number');

  await page.getByRole('button', {
    name: 'Edit Lot Number'
  }).click();

  console.log('Entering Lot Number');

  await page.getByRole('textbox', {
    name: 'Lot Number'
  }).fill('LOT-123');

  console.log('Updating Lot Number');

  await page.getByRole('button', {
    name: 'Update',
    exact: true
  }).click();

  await page.waitForTimeout(5000);

  console.log('Lot Number Updated Successfully');


  // ==================================================
  // CHANGE LOCATION
  // ==================================================

  currentAction = 'CHANGE LOCATION';

  console.log('Selecting Row For Change Location');

  await page.locator(
    '[id="__xmlview1--motherplannerTable-rowsel0"]'
  ).click();

  console.log('Opening Change Location');

  await page.getByRole('button', {
    name: 'Change Location'
  }).click();

  await page.waitForTimeout(5000);

  console.log('Opening Select Location Dropdown');

  await page.getByRole('gridcell', {
    name: 'Select Location'
  }).getByLabel('Select Options').click();

  console.log('Selecting New Location');

  await page.getByText(
    'SNB9.B55',
    { exact: true }
  ).click();

  console.log('Submitting Change Location');

  await page.getByLabel('Footer actions')
    .getByRole('button', {
      name: 'Change Location'
    }).click();

  console.log('Location Changed Successfully');

  // ==================================================
  // DESTROY PLANTS
  // ==================================================

  currentAction = 'DESTROY PLANTS';

  console.log('Selecting Row For Destroy Plants');

  await page.locator(
    '[id="__xmlview1--motherplannerTable-rowsel0"]'
  ).click();

  console.log('Opening Additional Options');

  await page.getByRole('button', {
    name: 'Additional Options'
  }).click();

  console.log('Opening Destroy Plants');

  await page.getByRole('button', {
    name: 'Destroy Plants'
  }).click();

  console.log('Entering Destroy Quantity');

  await page.getByRole('textbox', {
    name: 'Quantity'
  }).fill('1');

  console.log('Entering Waste Weight');

  await page.getByRole('textbox', {
    name: 'Waste Weight (lb)'
  }).fill('1');

  console.log('Selecting Waste Method');

  await page.locator(
    '[id="__select2-__table2-0-label"]'
  ).click();

  await page.getByRole('option', {
    name: 'Compost'
  }).click();

  console.log('Entering Material Used');

  await page.getByRole('textbox', {
    name: 'Material Used'
  }).fill('soil');

  console.log('Selecting Waste Reason');

  await page.locator(
    '[id="__select3-__table2-0-arrow"]'
  ).click();

  await page.getByRole('option', {
    name: 'Damage'
  }).click();

  console.log('Entering Notes');

  await page.getByRole('textbox', {
    name: 'Notes'
  }).fill('notes');

  console.log('Submitting Destroy Plants');

  await page.getByRole('button', {
    name: 'Destroy Plants'
  }).click();

  await page.waitForTimeout(5000);

  console.log('Plants Destroyed Successfully');

  // ==================================================
  // RECORD WASTE
  // ==================================================

  currentAction = 'RECORD WASTE';

  console.log('Opening Additional Options Again');

  await page.getByRole('button', {
    name: 'Additional Options'
  }).click();

  console.log('Selecting Row Again');

  await page.locator(
    '[id="__xmlview1--motherplannerTable-rowsel0"]'
  ).click();

  console.log('Opening Record Waste');

  await page.getByRole('button', {
    name: 'Record Waste'
  }).click();

  console.log('Entering Record Waste Weight');

  await page.getByRole('spinbutton', {
    name: 'Waste Weight (lb)'
  }).fill('1');

  console.log('Selecting Record Waste Method');

  await page.locator(
    '[id="__select6-__table3-0-label"]'
  ).click();

  await page.getByRole('option', {
    name: 'Compost'
  }).click();

  console.log('Entering Record Waste Material');

  await page.getByRole('textbox', {
    name: 'Material Used'
  }).fill('soil');

  console.log('Selecting Record Waste Reason');

  await page.locator(
    '[id="__select7-__table3-0-arrow"]'
  ).click();

  await page.getByRole('option', {
    name: 'Damage'
  }).click();

  console.log('Entering Record Waste Notes');

  await page.getByRole('textbox', {
    name: 'Notes'
  }).fill('notes');

  console.log('Submitting Record Waste');

  await page.getByRole('button', {
    name: 'Record Waste'
  }).click();

  await page.waitForTimeout(5000);

  console.log('Waste Recorded Successfully');

  // ==================================================
  // STOP API CAPTURE
  // ==================================================

  captureApis = false;

  console.log('');
  console.log('========================================');
  console.log(`API FILE SAVED: ${fileName}`);
  console.log('========================================');
  console.log('');

});