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
    // OPEN Immature Plants
    // ==================================================

    console.log('Opening Immature Plants Module');

    await page.getByRole('button', { name: 'Open Search' }).click({ force: true });
    await safeWait(1000);
    await page.getByRole('searchbox', { name: 'Search' }).fill('Immature Plants');
    await safeWait(1000);

    await page.getByText('Immature Plants', { exact: true }).click({ force: true });

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



    //await safeWait(6000);

    //console.log('Marked As Immature');

     //console.log('Opening Immature Plants');
  //await page.locator('[id="__xmlview1--navigate-arrow"]').click();
  //await page.getByRole('option', { name: 'Immature Plants' }).click();


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
    // SEARCH Cuttings
    // ==================================================

    logAction('SEARCH Cuttings');

    console.log('Searching Clone cuttings');

    await page.getByRole('textbox', { name: 'Search' }).fill('Cuttings');
    await page.getByRole('textbox', { name: 'Search' }).press('Enter');
    await page.getByRole('textbox', { name: 'Search' }).click();
    await page.getByRole('textbox', { name: 'Search' }).fill('Clone Cuttings');
    await page.getByRole('textbox', { name: 'Search' }).press('Enter');
    await page.locator('div').filter({ hasText: /^METRC UID$/ }).nth(1).click();
    await page.getByText('Sort Descending').click();
    await page.locator('[id="__xmlview1--clonePlannerTable-rowsel0"]').click();
    await page.getByRole('button', { name: 'Additional Options' }).click();
    await page.getByRole('button', { name: 'Change Growth Phase' }).click();
    await safeWait(10000);
    await page.getByRole('combobox', { name: 'Plugs' }).click();
    await safeWait(10000);
    await page.locator('#changeGrowthPhaseDialog--itemSticking-arrow').click();
    await page.getByRole('combobox', { name: 'Plugs' }).fill('Moms');
    await page.locator('.sapMSLITitleOnly').click();
    await page.getByRole('spinbutton', { name: 'No. of Plugs' }).click();
    await page.getByRole('spinbutton', { name: 'No. of Plugs' }).fill('1');
    await page.getByRole('button', { name: 'Ok' }).click();
    //await page.getByRole('dialog', { name: 'Messages' }).click();
    console.log('Cutting Search Completed');

    
    // ==================================================
    // SEARCH Stickings
    // ==================================================
logAction('SEARCH Sticking');
console.log('Searching Sticking');

await page.getByRole('button', { name: 'Clear All Filters' }).click();

await page.getByRole('textbox', { name: 'Search' }).click();
await page.getByRole('textbox', { name: 'Search' }).fill('sticking');
await page.getByRole('textbox', { name: 'Search' }).press('Enter');

await safeWait(2000);

await page.locator('div').filter({ hasText: /^METRC UID$/ }).nth(1).click();
await page.getByText('Sort Descending').click();

await safeWait(2000);

await page.locator('[id="__xmlview1--clonePlannerTable-rowsel0"]').click();

await page.getByRole('button', { name: 'Additional Options' }).click();
await page.getByRole('button', { name: 'Change Growth Phase' }).click();

await safeWait(2000);

// Open Stick Growth Tag dropdown
const growthTagValue = '1A4FF0200000261000008544';

const growthTagArrow = page.locator('#changeGrowthPhaseDialog--stickGrowthTag-arrow');
await growthTagArrow.waitFor({ state: 'visible', timeout: 30000 });
await growthTagArrow.click();

await safeWait(1000);

// Select Growth Tag safely
try {
  const option = page.getByRole('option', { name: growthTagValue }).first();
  await option.waitFor({ state: 'visible', timeout: 15000 });
  await option.click();
} catch (error) {
  console.log('Dropdown option not visible, using keyboard fallback');

  await page.keyboard.type(growthTagValue);
  await safeWait(1000);
  await page.keyboard.press('Enter');
}

await safeWait(1000);

// Blocks
const blocksCombo = page.getByRole('combobox', { name: 'Blocks' });
await blocksCombo.waitFor({ state: 'visible', timeout: 30000 });
await blocksCombo.click();
await blocksCombo.fill('40/40');

await safeWait(1000);

// Select ROCKWOOL BLOCK option
await page.getByText('ROCKWOOL BLOCK GR10 4" x 4" x').click();

await safeWait(1000);

// No. of Blocks
const noOfBlocks = page.getByRole('spinbutton', { name: 'No. of Blocks' });
await noOfBlocks.waitFor({ state: 'visible', timeout: 30000 });
await noOfBlocks.click();
await noOfBlocks.fill('1');

await safeWait(1000);

// Click OK
await page.getByRole('button', { name: 'Ok' }).click();

// Wait for processing message
await page.getByText('We’re working on Changing the').waitFor({
  state: 'visible',
  timeout: 30000
});

await safeWait(10000);
     
    // ==================================================
    // SEARCH Teen
    // ==================================================
 // SEARCH Teen
// ==================================================
logAction('SEARCH Teen');
console.log('Searching Teen plants');

await page.getByRole('button', { name: 'Clear All Filters' }).click();

await page.getByRole('textbox', { name: 'Search' }).click();
await page.getByRole('textbox', { name: 'Search' }).fill('Teen');
await page.getByRole('textbox', { name: 'Search' }).press('Enter');

await safeWait(2000);

await page.locator('div').filter({ hasText: /^METRC UID$/ }).nth(1).click();
await page.getByRole('menuitem', { name: 'Sort Descending' }).click();

await safeWait(2000);

await page.locator('[id="__xmlview1--clonePlannerTable-rowsel0"]').click();

await page.getByRole('button', { name: 'Additional Options' }).click();
await page.getByRole('button', { name: 'Change Growth Phase' }).click();

await safeWait(2000);

// Open Begging Tag dropdown
const teenGrowthTagValue = '1A4FF0200000261000008544';

const beggingTagArrow = page.locator('#changeGrowthPhaseDialog--beggingTag-arrow');
await beggingTagArrow.waitFor({ state: 'visible', timeout: 30000 });
await beggingTagArrow.click();

await safeWait(1000);

// Select Growth Tag safely
try {
  const option = page.getByRole('option', { name: teenGrowthTagValue }).first();
  await option.waitFor({ state: 'visible', timeout: 15000 });
  await option.click();
} catch (error) {
  console.log('Teen dropdown option not visible, using keyboard fallback');

  await page.keyboard.type(teenGrowthTagValue);
  await safeWait(1000);
  await page.keyboard.press('Enter');
}

await safeWait(1000);

// Click OK
await page.getByRole('button', { name: 'Ok' }).click();

// Optional dialog label handling
const dialogLabel = page.locator('[id="__dialog0-TextLabel-text"]');

try {
  await dialogLabel.waitFor({ state: 'visible', timeout: 10000 });
  await dialogLabel.click();
  await safeWait(500);
  await dialogLabel.click();
} catch (error) {
  console.log('Dialog label not visible, continuing...');
}

// Wait for processing message
await page.getByText('We’re working on Changing the').waitFor({
  state: 'visible',
  timeout: 30000
});

await safeWait(10000);

    // ==================================================
    // Changing Location
    // ==================================================
    logAction('Changing Location');

    console.log('Change Location');
    await page.getByRole('button', { name: 'Clear All Filters' }).click();
    await page.getByRole('textbox', { name: 'Search' }).click();
    await page.getByRole('textbox', { name: 'Search' }).fill('Teen');
    await page.getByRole('textbox', { name: 'Search' }).press('Enter');
    await page.locator('div').filter({ hasText: /^METRC UID$/ }).nth(1).click();
    await page.getByRole('menuitem', { name: 'Sort Descending' }).click();
    await page.locator('[id="__xmlview1--clonePlannerTable-rowsel0"]').click();
    await page.getByRole('button', { name: 'Additional Options' }).click();
    await page.getByRole('button', { name: 'Change Location' }).click();
    await page.getByRole('gridcell', { name: 'Select Location' }).getByLabel('Select Options').click();
    await page.getByRole('combobox', { name: 'Select Location' }).fill('SNB9.B55');
    await page.getByText('SNB9.B55').click();
    await page.getByRole('button', { name: 'Change Location' }).click();
    await safeWait(10000);


    // ==================================================
    // Edit Harvest Name
    // ==================================================
    logAction('Edit Harvest Name');

    console.log('Edit Harvest Name');
    function generateHarvestName() {
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `HRST${digits}`;
}

await page.getByRole('button', { name: 'Edit Harvest Name' }).click();
await page.getByRole('textbox', { name: 'New Harvest Name' }).click();
await page.getByRole('textbox', { name: 'New Harvest Name' }).fill(generateHarvestName());
await page.getByRole('button', { name: 'Update', exact: true }).click();
    await safeWait(10000);



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
