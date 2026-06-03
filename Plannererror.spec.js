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
// Behaviour:
//   - Runs both flows in ONE session (no play button, no re-login).
//   - A WATCHDOG listens to every response. The INSTANT any API call
//     returns status >= 400, the error is captured to log + console,
//     the page is closed to unblock the current action, and the test
//     ABORTS immediately (no waiting for the next step).
//
// Run it (NO --debug):
//   npx playwright test tests/motherplanner-full.spec.js --headed
// ==================================================

test('SAP Business One Full Automation Flow', async ({ page }) => {

  // ==================================================
  // CONTROL VARIABLES
  // ==================================================

  let captureApis = false;
  let currentAction = '';
  let apiError = null;          // first failed API call
  let rejectWatchdog;           // call to abort the whole flow

  // a promise that NEVER resolves, only rejects when an API fails
  const watchdog = new Promise((_, reject) => {
    rejectWatchdog = reject;
  });
  // keep node from flagging the watchdog as unhandled before the race
  watchdog.catch(() => {});

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
  // WATCHDOG: abort the INSTANT any API call fails
  // ==================================================

  page.on('response', async (response) => {
    if (!captureApis) return;

    const status = response.status();

    if (status >= 400) {
      // only handle the first failure
      if (apiError) return;

      let body = '';
      try {
        body = await response.text();
      } catch (e) {
        body = 'Unable to read response';
      }

      apiError = {
        action: currentAction,
        status,
        url: response.url(),
        body,
      };

      const errorLog = `
XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
FAILED API  ->  STOPPING EXECUTION

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
      console.log('❌ API FAILED -> STOPPING');
      console.log(`ACTION: ${currentAction}`);
      console.log(`STATUS: ${status}`);
      console.log(response.url());
      console.log(body);
      console.log('');

      // 1) reject the watchdog so Promise.race throws
      rejectWatchdog(
        new Error(`Stopped: API ${status} during "${apiError.action}" -> ${apiError.url}`)
      );

      // 2) close the page so the CURRENT in-flight action unblocks
      //    immediately instead of waiting for its timeout
      try {
        await page.close();
      } catch (e) {}
    }
  });

  // ==================================================
  // THE WHOLE FLOW (raced against the watchdog)
  // ==================================================

  const runFlow = async () => {

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
    //  MOTHER PLANNER FLOW
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
    }
    // a failing create-package response is also caught by the watchdog,
    // which will abort the run; no extra handling needed here.

    await page.waitForLoadState('networkidle');
    await safeWait(3000);

    // ==================================================
    // EDIT LOT NUMBER
    // ==================================================

    logAction('EDIT LOT NUMBER');

    console.log('Selecting Row For Edit Lot');

    await safeWait(5000);

    await page.locator('[id="__xmlview1--motherplannerTable-rowsel0"]').click();

    console.log('Opening Edit Lot Number');

    await page.getByRole('button', { name: 'Edit Lot Number' }).click();

    console.log('Entering Lot Number');

    await page.getByRole('textbox', { name: 'Lot Number' }).fill('LOT-123');

    console.log('Updating Lot Number');

    await page.getByRole('button', { name: 'Update', exact: true }).click();

    await safeWait(5000);

    console.log('Lot Number Updated Successfully');

    // ==================================================
    // CHANGE LOCATION
    // ==================================================

    logAction('CHANGE LOCATION');

    console.log('Selecting Row For Change Location');

    await page.locator('[id="__xmlview1--motherplannerTable-rowsel0"]').click();

    console.log('Opening Change Location');

    await page.getByRole('button', { name: 'Change Location' }).click();

    await safeWait(5000);

    console.log('Opening Select Location Dropdown');

    await page.getByRole('gridcell', { name: 'Select Location' })
      .getByLabel('Select Options')
      .click();

    console.log('Selecting New Location');

    await page.getByText('SNB9.B55', { exact: true }).click();

    console.log('Submitting Change Location');

    await page.getByLabel('Footer actions')
      .getByRole('button', { name: 'Change Location' })
      .click();

    console.log('Location Changed Successfully');

    // ==================================================
    // DESTROY PLANTS
    // ==================================================

    logAction('DESTROY PLANTS');

    console.log('Selecting Row For Destroy Plants');

    await page.locator('[id="__xmlview1--motherplannerTable-rowsel0"]').click();

    console.log('Opening Additional Options');

    await page.getByRole('button', { name: 'Additional Options' }).click();

    console.log('Opening Destroy Plants');

    await page.getByRole('button', { name: 'Destroy Plants' }).click();

    console.log('Entering Destroy Quantity');

    await page.getByRole('textbox', { name: 'Quantity' }).fill('1');

    console.log('Entering Waste Weight');

    await page.getByRole('textbox', { name: 'Waste Weight (lb)' }).fill('1');

    console.log('Selecting Waste Method');

    await page.locator('[id="__select2-__table2-0-label"]').click();
    await page.getByRole('option', { name: 'Compost' }).click();

    console.log('Entering Material Used');

    await page.getByRole('textbox', { name: 'Material Used' }).fill('soil');

    console.log('Selecting Waste Reason');

    await page.locator('[id="__select3-__table2-0-arrow"]').click();
    await page.getByRole('option', { name: 'Damage' }).click();

    console.log('Entering Notes');

    await page.getByRole('textbox', { name: 'Notes' }).fill('notes');

    console.log('Submitting Destroy Plants');

    await page.getByRole('button', { name: 'Destroy Plants' }).click();

    await safeWait(5000);

    console.log('Plants Destroyed Successfully');

    // ==================================================
    // RECORD WASTE
    // ==================================================

    logAction('RECORD WASTE');

    console.log('Opening Additional Options Again');

    await page.getByRole('button', { name: 'Additional Options' }).click();

    console.log('Selecting Row Again');

    await page.locator('[id="__xmlview1--motherplannerTable-rowsel0"]').click();

    console.log('Opening Record Waste');

    await page.getByRole('button', { name: 'Record Waste' }).click();

    console.log('Entering Record Waste Weight');

    await page.getByRole('spinbutton', { name: 'Waste Weight (lb)' }).fill('1');

    console.log('Selecting Record Waste Method');

    await page.locator('[id="__select6-__table3-0-label"]').click();
    await page.getByRole('option', { name: 'Compost' }).click();

    console.log('Entering Record Waste Material');

    await page.getByRole('textbox', { name: 'Material Used' }).fill('soil');

    console.log('Selecting Record Waste Reason');

    await page.locator('[id="__select7-__table3-0-arrow"]').click();
    await page.getByRole('option', { name: 'Damage' }).click();

    console.log('Entering Record Waste Notes');

    await page.getByRole('textbox', { name: 'Notes' }).fill('notes');

    console.log('Submitting Record Waste');

    await page.getByRole('button', { name: 'Record Waste' }).click();

    await safeWait(5000);

    console.log('Waste Recorded Successfully');

    // ==================================================
    // ==================================================
    //  PACKAGES FLOW
    //  Continues in the SAME session — no re-login.
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
    // PACKAGE CHANGE LOCATION
    // ==================================================

    logAction('PACKAGE CHANGE LOCATION');

    await selectFirstRow();

    await clickButton('Change Location');

    await page.getByLabel('Select Options').last().click({ force: true });
    await safeWait(2000);

    await page.getByText('SNB9.B55', { exact: true }).click({ force: true });
    await safeWait(2000);

    await page.getByRole('button', { name: 'Change Location', exact: true }).last().click({ force: true });
    await safeWait(8000);

    console.log('Package Location Changed Successfully');

    // ==================================================
    // PACKAGE EDIT LOT NUMBER
    // ==================================================

    logAction('PACKAGE EDIT LOT NUMBER');

    await selectFirstRow();

    await clickButton('Edit Lot Number');

    await page.getByRole('textbox', { name: 'Lot Number' }).fill('lot123');

    await page.getByRole('button', { name: 'Update', exact: true }).last().click({ force: true });
    await safeWait(6000);

    console.log('Package Lot Updated');

    // ==================================================
    // ADJUST PACKAGE
    // ==================================================

    logAction('ADJUST PACKAGE');

    await selectFirstRow();

    await clickButton('Adjust');

    await page.getByRole('spinbutton', { name: 'Adj. Qty' }).fill('11');

    await page.getByLabel('Select Options').last().click({ force: true });
    await safeWait(2000);

    await page.getByRole('option', { name: 'Damage' }).click({ force: true });

    await page.getByRole('textbox', { name: 'Notes' }).fill('notes');

    await page.getByRole('button', { name: 'Adjust', exact: true }).last().click({ force: true });
    await safeWait(8000);

    console.log('Package Adjust Completed');

    // ==================================================
    // MARK AS IMMATURE
    // ==================================================

    logAction('MARK AS IMMATURE');

    await selectFirstRow();

    await clickButton('Mark as Immature');

    await clickButton('OK', { required: false });

    await safeWait(6000);

    console.log('Marked As Immature');

    // ==================================================
    // UNMARK AS MOTHER
    // ==================================================

    logAction('UNMARK AS MOTHER');

    await safeWait(5000);

    await page.locator('[id="__xmlview1--motherplannerTable-rowsel0"]').click();

    await page.getByRole('button', { name: 'Additional Options' }).click();

    await page.getByRole('button', { name: 'Unmark as Mother' }).click();

    await page.getByRole('button', { name: 'OK' }).click();

    await safeWait(6000);

    console.log('Unmark Mother Completed');
  };

  // ==================================================
  // RUN: flow vs watchdog — whichever settles first wins
  // ==================================================

  const flowPromise = runFlow();
  // swallow the flow's own rejection that happens when the
  // watchdog closes the page mid-action (handled via watchdog)
  flowPromise.catch(() => {});

  try {
    await Promise.race([flowPromise, watchdog]);
  } catch (e) {
    if (apiError) {
      // surface a clean, meaningful failure for the report
      throw new Error(
        `Stopped due to API error during "${apiError.action}" ` +
        `(status ${apiError.status}): ${apiError.url}`
      );
    }
    throw e;
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