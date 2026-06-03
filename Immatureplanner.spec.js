const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// ==================================================
// ONE LOG FILE FOR ENTIRE EXECUTION
// ==================================================

const logFolder = path.join(process.cwd(), 'playwright-logs');

if (!fs.existsSync(logFolder)) {
  fs.mkdirSync(logFolder, { recursive: true });
}

const timestamp = new Date()
  .toISOString()
  .replace(/[:.]/g, '-');

const GLOBAL_LOG_FILE = path.join(
  logFolder,
  `motherplanner-${timestamp}.txt`
);

fs.writeFileSync(
  GLOBAL_LOG_FILE,
  `PLAYWRIGHT EXECUTION LOG\nSTARTED: ${new Date()}\n\n`,
  'utf8'
);

// ==================================================
// GLOBAL SETTINGS
// ==================================================

test.setTimeout(1800000);

test.use({
  ignoreHTTPSErrors: true,
});

// ==================================================
// SINGLE CONTINUOUS TEST
// MOTHER PLANNER FLOW  +  PACKAGES FLOW
//
// Run it (NO --debug, so it never stops on a play button):
//   npx playwright test tests/motherplanner-full.spec.js --headed
// ==================================================

test('SAP Business One Full Automation Flow', async ({ page }) => {

  // ==================================================
  // CONTROL VARIABLES
  // ==================================================

  let captureApis = false;
  let currentAction = '';

  // ==================================================
  // HELPERS
  // ==================================================

  function appendLog(text) {
    fs.appendFileSync(GLOBAL_LOG_FILE, text, 'utf8');
  }

  function logAction(action) {
    currentAction = action;

    console.log('');
    console.log('====================================');
    console.log(`ACTION: ${action}`);
    console.log('====================================');
    console.log('');

    appendLog(`\n====================================\nACTION: ${action}\n====================================\n`);
  }

  async function safeWait(ms = 3000) {
    await page.waitForTimeout(ms);
  }

  async function closeAnyPopup() {
    await safeWait(1000);

    const buttons = ['OK', 'Ok', 'Close', 'Cancel'];

    for (const name of buttons) {
      try {
        const btn = page.getByRole('button', { name, exact: true }).last();
        if (await btn.count()) {
          if (await btn.isVisible()) {
            await btn.click({ force: true });
            await safeWait(2000);
            return;
          }
        }
      } catch (e) {}
    }

    try {
      await page.keyboard.press('Escape');
      await safeWait(1000);
    } catch (e) {}
  }

  async function clickButton(name, options = {}) {
    const { exact = true, timeout = 30000, required = true } = options;

    await closeAnyPopup();

    const button = page.getByRole('button', { name, exact }).last();

    try {
      await button.waitFor({ state: 'visible', timeout });
      await button.click({ force: true });
      await safeWait(3000);
      return true;
    } catch (e) {
      console.log(`Button not found or not visible: ${name}`);
      if (required) throw e;
      return false;
    }
  }

  async function selectFirstRow() {
    await closeAnyPopup();
    await safeWait(4000);

    const row = page.locator('[id*="rowsel0"]').first();

    await row.waitFor({ state: 'visible', timeout: 30000 });
    await row.click({ force: true });
    await safeWait(2000);
  }

  async function openLocationDropdown() {
    const dropdown = page.locator('[id="__xmlview1--locDropDown-reset"]');

    if (await dropdown.count()) {
      await dropdown.click({ force: true });
      return;
    }

    await page.getByLabel('Select Options').last().click({ force: true });
  }

  async function selectLocation(locationText) {
    await openLocationDropdown();
    await safeWait(2000);

    const searchBox = page.getByRole('searchbox', { name: 'Search' });

    if (await searchBox.count()) {
      await searchBox.fill(locationText.split(' ')[0].toLowerCase());
      await safeWait(1000);
    }

    await page.getByRole('option', { name: locationText }).click({ force: true });
    await safeWait(5000);
  }

  async function openPackagesTab() {
    logAction('OPEN PACKAGES');

    await closeAnyPopup();
    await safeWait(5000);

    console.log('Opening Packages Tab');

    const packagesTab = page.getByText('Packages', { exact: true }).last();

    await packagesTab.waitFor({ state: 'visible', timeout: 30000 });
    await packagesTab.scrollIntoViewIfNeeded();
    await packagesTab.click({ force: true });

    await safeWait(10000);
    await closeAnyPopup();

    console.log('Packages Opened');
  }

  // ==================================================
  // API LISTENERS (capture POST / PATCH / PUT / DELETE)
  // ==================================================

  page.on('request', async (request) => {
    if (!captureApis) return;

    const method = request.method();

    if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
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

      appendLog(log);

      console.log('');
      console.log(`API ${method}`);
      console.log(`ACTION: ${currentAction}`);
      console.log(request.url());
      console.log('');
    }
  });

  // ==================================================
  // CAPTURE FAILED RESPONSES
  // ==================================================

  page.on('response', async (response) => {
    if (!captureApis) return;

    const status = response.status();

    if (status >= 400) {
      let body = '';

      try {
        body = await response.text();
      } catch (e) {
        body = 'Unable to read response';
      }

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

      appendLog(errorLog);

      console.log('');
      console.log('❌ API FAILED');
      console.log(`ACTION: ${currentAction}`);
      console.log(`STATUS: ${status}`);
      console.log(response.url());
      console.log(body);
      console.log('');
    }
  });

  try {

    // ==================================================
    // LOGIN  (done ONCE for the whole flow)
    // ==================================================

    console.log('Opening Login Page');

    await page.goto('https://ghdev.seedandbeyond.com:223', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });

    await page.waitForURL(/auth/, { timeout: 30000 });

    console.log('Entering Username');
    await page.fill('#username', 'balag');

    console.log('Clicking First Login Button');
    await page.getByRole('button', { name: 'Log In' }).click();

    console.log('Entering Password');
    await page.fill('input[name="password"]', 'Welcome@12345');

    console.log('Submitting Login');
    await page.getByRole('button', { name: 'Log In' }).click();

    console.log('Login Submitted');

    // ==================================================
    // SELECT COMPANY
    // ==================================================

    await safeWait(8000);

    try {
      const selectCompany = page.locator('div').filter({ hasText: /^Select Company$/ });

      if (await selectCompany.count()) {
        await selectCompany.click({ force: true });

        await page.getByRole('textbox', { name: 'Search' }).fill('dev');

        await page.getByText('Glass House (development) (').click({ force: true });

        const okButton = page.getByRole('button', { name: 'OK' }).first();

        if (await okButton.count()) {
          await okButton.click({ force: true });
        }
      }
    } catch (e) {
      console.log('Company selection skipped or already selected');
    }

    await safeWait(10000);

    console.log('Company Selected / Already Loaded');

    // ==================================================
    // OPEN MOTHER PLANTS
    // ==================================================

    console.log('Opening Mother Plants Module');

    await page.getByRole('button', { name: 'Open Search' }).click({ force: true });

    await page.getByRole('searchbox', { name: 'Search' }).fill('mother plants');

    await page.getByText('Mother Plants', { exact: true }).click({ force: true });

    await safeWait(10000);

    console.log('Mother Plants Opened');

    // ==================================================
    // START API CAPTURE
    // ==================================================

    captureApis = true;

    console.log('API Capture Started');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await safeWait(10000);

    console.log('Page Reloaded Successfully');

    // ==================================================
    // ==================================================
    //  MOTHER PLANNER FLOW  (was Test 1)
    // ==================================================
    // ==================================================

    // ==================================================
    // SELECT LOCATION
    // ==================================================

    logAction('SELECT LOCATION');

    await selectLocation('SNB9.B54 - C12-1000009-LIC');

    console.log('Location Selected Successfully');

    // ==================================================
    // SEARCH TEEN
    // ==================================================

    logAction('SEARCH TEEN');

    console.log('Searching Teen Plants');

    await page.getByRole('textbox', { name: 'Search' }).fill('teen');
    await page.getByRole('textbox', { name: 'Search' }).press('Enter');

    console.log('Teen Search Completed');

    // ==================================================
    // CREATE PACKAGE
    // ==================================================

    logAction('CREATE PACKAGE');

    console.log('Selecting Mother Plant Row');

    await safeWait(5000);

    await page.locator('[id="__xmlview1--motherplannerTable-rowsel0"]').click();

    console.log('Opening Create Package');

    await page.getByRole('button', { name: 'Create Package' }).click();

    console.log('Opening Package Tag Dropdown');

    await page.locator('#createPackageDialog--pTag-arrow').click();

    console.log('Entering Package Quantity');

    await page.getByRole('spinbutton', { name: 'Qty' }).fill('111');

    await safeWait(2000);

    console.log('Submitting Create Package');

    const packageResponsePromise = page.waitForResponse(
      response =>
        response.url().includes('/packages/frommotherplant') &&
        response.request().method() === 'POST',
      { timeout: 60000 }
    );

    await page.getByRole('button', { name: 'Ok' }).dblclick();

    const packageResponse = await packageResponsePromise;
    const packageStatus = packageResponse.status();

    let responseBody = '';

    try {
      responseBody = await packageResponse.text();
    } catch (e) {
      responseBody = 'Unable to read response';
    }

    if (packageStatus >= 200 && packageStatus < 300) {
      console.log('');
      console.log('====================================');
      console.log('✅ PACKAGE CREATED SUCCESSFULLY');
      console.log(`STATUS: ${packageStatus}`);
      console.log('====================================');
      console.log('');
    } else {
      console.log('');
      console.log('====================================');
      console.log('❌ PACKAGE CREATION FAILED');
      console.log(`STATUS: ${packageStatus}`);
      console.log('URL:');
      console.log(packageResponse.url());
      console.log('RESPONSE:');

      try {
        console.log(JSON.stringify(JSON.parse(responseBody), null, 2));
      } catch {
        console.log(responseBody);
      }

      console.log('====================================');
      console.log('');
    }

    await page.waitForLoadState('networkidle');
    await safeWait(3000);

    // ==================================================
    // ==================================================
    //  PACKAGES FLOW  (was Test 2)
    //  Continues in the SAME session — no re-login,
    //  no play button, no stop.
    // ==================================================
    // ==================================================

    // ==================================================
    // OPEN PACKAGES
    // ==================================================

    await openPackagesTab();

    // ==================================================
    // SELECT PACKAGE LOCATION
    // ==================================================

    logAction('SELECT PACKAGE LOCATION');

    await selectLocation('SNB9.B54 - C12-1000009-LIC');

    // ==================================================
    // MARK AS IMMATURE
    // ==================================================

    logAction('MARK AS IMMATURE');
    await safeWait(2000);
    await page.locator('div').filter({ hasText: /^METRC UID$/ }).nth(1).click();
    await page.getByText('Sort Descending').click();
    await safeWait(2000);
    await selectFirstRow();
    await safeWait(2000);
    await clickButton('Mark as Immature');
    await safeWait(2000);
    await clickButton('OK', { required: false });

    await safeWait(6000);

    console.log('Marked As Immature');



  } finally {

    captureApis = false;

    console.log('');
    console.log('========================================');
    console.log(`API FILE SAVED: ${GLOBAL_LOG_FILE}`);
    console.log('========================================');
    console.log('');

    appendLog(`\n========================================\nAPI FILE SAVED: ${GLOBAL_LOG_FILE}\n========================================\n`);
  }

});