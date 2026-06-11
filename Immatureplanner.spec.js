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

  async function selectFirstRow(tableId = null) {
    await closeAnyPopup();
    await safeWait(4000);
    const selector = tableId
      ? `[id="${tableId}-rowsel0"]`
      : '[id*="rowsel0"]';
    const row = page.locator(selector).first();
    await row.waitFor({ state: 'visible', timeout: 30000 });
    await row.click({ force: true });
    await safeWait(2000);
  }

  // ==================================================
  // ROBUST DROPDOWN HELPERS
  // ==================================================

  /**
   * Open a SAPUI5 Select/ComboBox by its arrow button ID and pick an option by text.
   * Waits for the listbox/popup to appear before clicking the option.
   *
   * @param {string} arrowId   - The element ID of the -arrow element (e.g. '#myDialog--myField-arrow')
   * @param {string} optionText - Visible text of the option to click (exact match)
   * @param {object} opts
   *   @param {number} opts.arrowTimeout   - ms to wait for the arrow to be visible (default 30000)
   *   @param {number} opts.optionTimeout  - ms to wait for the option to appear   (default 20000)
   *   @param {boolean} opts.exact         - whether getByRole option match is exact (default true)
   */
  async function selectDropdownByArrow(arrowId, optionText, opts = {}) {
    const {
      arrowTimeout = 30000,
      optionTimeout = 20000,
      exact = true,
    } = opts;

    const arrow = page.locator(arrowId);
    await arrow.waitFor({ state: 'visible', timeout: arrowTimeout });
    await arrow.click({ force: true });
    await safeWait(800);

    // Wait for the SAPUI5 popup/listbox overlay
    const popup = page.locator('.sapMPopover, .sapMSelectList, .sapMSuggestionsPopover').last();
    try {
      await popup.waitFor({ state: 'visible', timeout: 5000 });
    } catch (e) {
      // Popup may not have a generic class — continue anyway
    }

    const option = page.getByRole('option', { name: optionText, exact }).first();
    await option.waitFor({ state: 'visible', timeout: optionTimeout });
    await option.click({ force: true });
    await safeWait(800);
  }

  /**
   * Type into a SAPUI5 ComboBox/Input (by its combobox role + label) and
   * wait for the suggestion list item to appear, then click it.
   *
   * @param {string|import('@playwright/test').Locator} comboLocator
   *   - a string label used with page.getByRole('combobox', { name })
   *   - OR a Playwright Locator
   * @param {string} fillValue  - text to type into the combobox
   * @param {string} selectText - visible text of the suggestion/option to click
   * @param {object} opts
   *   @param {number} opts.timeout  - ms to wait for suggestion item (default 20000)
   *   @param {string} opts.itemSelector - custom CSS selector for suggestion items
   *                                       (default searches common SAPUI5 list item classes)
   */
  async function fillComboAndSelect(comboLocator, fillValue, selectText, opts = {}) {
    const {
      timeout = 20000,
      itemSelector = '.sapMSLI, .sapMSLITitle, .sapMSLITitleOnly, .sapMSelectListItem',
    } = opts;

    const combo = typeof comboLocator === 'string'
      ? page.getByRole('combobox', { name: comboLocator })
      : comboLocator;

    await combo.waitFor({ state: 'visible', timeout: 30000 });
    await combo.click({ force: true });
    await combo.fill('');           // clear first
    await safeWait(300);
    await combo.fill(fillValue);
    await safeWait(1000);

    // Try by role option first (works for Select lists)
    try {
      const roleOption = page.getByRole('option', { name: selectText }).first();
      await roleOption.waitFor({ state: 'visible', timeout: 5000 });
      await roleOption.click({ force: true });
      await safeWait(500);
      return;
    } catch (e) { /* fall through */ }

    // Try by text in suggestion items
    try {
      const textOption = page.locator(itemSelector).filter({ hasText: selectText }).first();
      await textOption.waitFor({ state: 'visible', timeout });
      await textOption.click({ force: true });
      await safeWait(500);
      return;
    } catch (e) { /* fall through */ }

    // Last resort: getByText
    const fallback = page.getByText(selectText, { exact: false }).first();
    await fallback.waitFor({ state: 'visible', timeout });
    await fallback.click({ force: true });
    await safeWait(500);
  }

  /**
   * Open the Location dropdown (handles both the reset-arrow ID and
   * the generic 'Select Options' label) and pick a location by full text.
   */
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

    // SAPUI5 Select popup has a searchbox
    const searchBox = page.getByRole('searchbox', { name: 'Search' });
    if (await searchBox.count()) {
      await searchBox.fill(locationText.split(' ')[0].toLowerCase());
      await safeWait(1000);
    }

    const option = page.getByRole('option', { name: locationText });
    await option.waitFor({ state: 'visible', timeout: 15000 });
    await option.click({ force: true });
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
  // SORT DESCENDING by METRC UID column helper
  // ==================================================

  async function sortDescendingByMetrcUID() {
    // Click column header
    await page.locator('div').filter({ hasText: /^METRC UID$/ }).nth(1).click();
    await safeWait(500);
    // Prefer menuitem, fall back to plain text
    try {
      await page.getByRole('menuitem', { name: 'Sort Descending' }).click();
    } catch (e) {
      await page.getByText('Sort Descending').click();
    }
    await safeWait(2000);
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
    // LOGIN
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
    // OPEN MOTHER PLANTS MODULE
    // ==================================================

    console.log('Opening Mother Plants Module');

    await page.getByRole('button', { name: 'Open Search' }).click({ force: true });
     await safeWait(10000);
    await page.getByRole('searchbox', { name: 'Search' }).fill('mother plants');
    await safeWait(10000);
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

    await safeWait(3000);
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
    await safeWait(2000);

    // Open package tag dropdown
    console.log('Opening Package Tag Dropdown');
    await selectDropdownByArrow('#createPackageDialog--pTag-arrow', '', {
      exact: false,
      optionTimeout: 20000,
    });
    // NOTE: pick the first available option after opening
    // If you need a specific tag, replace '' above with the exact tag text
    // and set exact: true. For now we just open to trigger the default selection.
    // Re-open and pick properly if a specific value is needed:
    // await selectDropdownByArrow('#createPackageDialog--pTag-arrow', 'YOUR_TAG_VALUE');

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
    await sortDescendingByMetrcUID();
    await selectFirstRow();
    await safeWait(2000);
    await clickButton('Mark as Immature');
    await safeWait(2000);
    await clickButton('OK', { required: false });
    await safeWait(6000);
    console.log('Marked As Immature');

    // ==================================================
    // OPEN IMMATURE PLANTS
    // ==================================================

    console.log('Opening Immature Plants');
    await page.locator('[id="__xmlview1--navigate-arrow"]').click();
    await safeWait(1000);
    // Wait for the option to appear in the nav dropdown
    const immatureOption = page.getByRole('option', { name: 'Immature Plants' });
    await immatureOption.waitFor({ state: 'visible', timeout: 15000 });
    await immatureOption.click({ force: true });
    await safeWait(5000);

    // ==================================================
    // RESTART API CAPTURE AFTER NAVIGATION
    // ==================================================

    captureApis = true;
    console.log('API Capture Started');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await safeWait(10000);
    console.log('Page Reloaded Successfully');

    // ==================================================
    // SELECT LOCATION (Immature Plants)
    // ==================================================

    logAction('SELECT LOCATION');
    await selectLocation('SNB9.B54 - C12-1000009-LIC');
    console.log('Location Selected Successfully');

    // ==================================================
    // SEARCH CUTTINGS — Change Growth Phase
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
    // SEARCH STICKINGS — Change Growth Phase
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
    // SEARCH TEEN — Change Growth Phase
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
    // CHANGING LOCATION
    // ==================================================

    logAction('Changing Location');
    console.log('Change Location');

    await page.getByRole('button', { name: 'Clear All Filters' }).click();
    await safeWait(1000);

    await page.getByRole('textbox', { name: 'Search' }).fill('Teen');
    await page.getByRole('textbox', { name: 'Search' }).press('Enter');
    await safeWait(2000);

    await sortDescendingByMetrcUID();

    await page.locator('[id="__xmlview1--clonePlannerTable-rowsel0"]').click();
    await page.getByRole('button', { name: 'Additional Options' }).click();
    await safeWait(1000);
    await page.getByRole('button', { name: 'Change Location' }).click();
    await safeWait(2000);

    // Select Location inside the dialog
    await page.getByRole('gridcell', { name: 'Select Location' }).getByLabel('Select Options').click();
    await safeWait(1000);

    // Fill the combobox that opens
    const locationCombo = page.getByRole('combobox', { name: 'Select Location' });
    await locationCombo.fill('SNB9.B55');
    await safeWait(1500);

    // Pick the suggestion
    const snb9Option = page.getByText('SNB9.B55', { exact: true }).first();
    await snb9Option.waitFor({ state: 'visible', timeout: 15000 });
    await snb9Option.click({ force: true });
    await safeWait(1000);

    await page.getByRole('button', { name: 'Change Location' }).click();
    await safeWait(10000);

    // ==================================================
    // EDIT HARVEST NAME
    // ==================================================

    logAction('Edit Harvest Name');
    console.log('Edit Harvest Name');

    function generateHarvestName() {
      const digits = Math.floor(1000 + Math.random() * 9000);
      return `HRST${digits}`;
    }

    await sortDescendingByMetrcUID();

    await page.locator('[id="__xmlview1--clonePlannerTable-rowsel0"]').click();
    await page.getByRole('button', { name: 'Edit Harvest Name' }).click();
    await safeWait(2000);

    await page.getByRole('textbox', { name: 'New Harvest Name' }).click();
    await page.getByRole('textbox', { name: 'New Harvest Name' }).fill(generateHarvestName());

    await page.getByRole('button', { name: 'Update', exact: true }).click();
    await safeWait(10000);

    // ==================================================
    // EDIT LOT NUMBER
    // ==================================================

    logAction('Edit Lot Number');

    const lotNumber = `Lot${Math.floor(1000 + Math.random() * 9000)}`;
    console.log('Generated Lot Number:', lotNumber);

    await sortDescendingByMetrcUID();

    await page.locator('[id="__xmlview1--clonePlannerTable-rowsel0"]').click();
    await page.getByRole('button', { name: 'Edit Lot Number' }).click();
    await safeWait(2000);

    await page.getByRole('textbox', { name: 'Lot Number', exact: true }).click();
    await page.getByRole('textbox', { name: 'Lot Number', exact: true }).fill(lotNumber);

    await page.getByRole('button', { name: 'Update', exact: true }).click();
    await safeWait(5000);

    // ==================================================
    // SPLIT BATCH
    // ==================================================

     logAction('Split Batch');
console.log('Split Batch');

await page.getByRole('button', { name: 'Clear All Filters' }).click();

await page.getByText('METRC UID').click();
await page.getByRole('menuitem', { name: 'Sort Descending' }).click();

await page.locator('[id="__xmlview1--clonePlannerTable-rowsel0"]').click();

await page.getByRole('button', { name: 'Additional Options' }).click();
await page.getByRole('button', { name: 'Split Batch' }).click();

await page.waitForTimeout(2000);

// Location dropdown
await page.locator('#splitPackageClone--location-arrow').waitFor({
  state: 'visible',
  timeout: 30000
});

await page.locator('#splitPackageClone--location-arrow').click();

await page.getByRole('searchbox', { name: 'Search' }).waitFor({
  state: 'visible',
  timeout: 30000
});

await page.getByRole('searchbox', { name: 'Search' }).fill('snb9.b54');

await page.waitForTimeout(1000);
await page.keyboard.press('Enter');

await page.waitForTimeout(2000);

// Package Tag dropdown
const packageTagValue = '1A4FF0300000261000006326';

const packageTagArrow = page.locator('[id="__select0-arrow"]');

await packageTagArrow.waitFor({
  state: 'visible',
  timeout: 30000
});

await packageTagArrow.click();

await page.waitForTimeout(1000);

try {
  const packageOption = page.getByRole('option', { name: packageTagValue }).first();

  await packageOption.waitFor({
    state: 'visible',
    timeout: 15000
  });

  await packageOption.click();

} catch (error) {
  console.log('Package Tag option not visible, using keyboard fallback');

  await page.keyboard.type(packageTagValue);
  await page.waitForTimeout(1000);
  await page.keyboard.press('Enter');
}

await page.waitForTimeout(1000);

// Quantity
await page.getByRole('textbox', { name: 'Quantity', exact: true }).fill('3');

await page.waitForTimeout(1000);

// Create
await page.getByRole('button', { name: 'Create', exact: true }).click();

    // ==================================================
    // CHANGE STRAIN
    // ==================================================

    logAction('Change Strain');
    console.log('Change Strain');

    await page.getByRole('button', { name: 'Clear All Filters' }).click();
    await safeWait(1000);

    await page.getByRole('textbox', { name: 'Search' }).fill('teen');
    await page.getByRole('textbox', { name: 'Search' }).press('Enter');
    await safeWait(2000);

    await sortDescendingByMetrcUID();

    await page.locator('[id="__xmlview1--clonePlannerTable-rowsel0"]').click();
    await page.getByRole('button', { name: 'Additional Options' }).click();
    await safeWait(1000);
    await page.getByRole('button', { name: 'Change Strain' }).click();
    await safeWait(2000);

    // New Strain input — type and wait for table row suggestion
    await page.getByRole('textbox', { name: 'New Strain' }).fill('sage');
    await safeWait(2000);

    // Click SAGE in the suggestion table
    const sageOption = page.locator('.sapMListTbl td, .sapUiTableDataCell').filter({ hasText: 'SAGE' }).first();
    try {
      await sageOption.waitFor({ state: 'visible', timeout: 10000 });
      await sageOption.click({ force: true });
    } catch (e) {
      // Fallback: use original specific locator
      await page
        .locator('[id="__text89-changeItemMETRC--productInputMETRC-changeItemMETRC--changeItemMETRCTable-0-1"]')
        .getByText('SAGE')
        .click();
    }

    await safeWait(10000);
    await page.getByRole('button', { name: 'Update', exact: true }).click();
    await safeWait(3000);

    // Dismiss any overlay/dialog
    try {
      await page.locator('[id="__dialog0-TextLabel-text"]').click();
    } catch (e) {}
    try {
      await page.locator('#sap-ui-blocklayer-popup').click();
    } catch (e) {}
    await safeWait(3000);

    // ==================================================
    // ADJUST
    // ==================================================

    logAction('Adjust');
    console.log('Adjust');

    await page.getByRole('button', { name: 'Clear All Filters' }).click();
    await safeWait(1000);
    await sortDescendingByMetrcUID();

    await page.locator('[id="__xmlview1--clonePlannerTable-rowsel0"]').click();
    await page.getByRole('button', { name: 'Additional Options' }).click();
    await safeWait(1000);
    await page.getByRole('button', { name: 'Adjust' }).click();
    await safeWait(2000);

    await page.getByRole('spinbutton', { name: 'Adj. Qty' }).click();
    await page.getByRole('spinbutton', { name: 'Adj. Qty' }).fill('11');
    await safeWait(500);

    // Reason dropdown — click the cell first, then the Select Options label
    await page.locator('[id="__item22-__table0-0-cell4"]').click();
    await safeWait(500);
    await page.getByRole('gridcell', { name: 'Reason' }).getByLabel('Select Options').click();
    await safeWait(1000);

    // Fill combobox and pick Incorrect Quantity
    await fillComboAndSelect('Reason', 'Inc', 'Incorrect Quantity', { timeout: 15000 });

    await page.getByRole('textbox', { name: 'Notes' }).fill('notes');
    await safeWait(500);

    await page.getByRole('button', { name: 'Adjust' }).click();
    await safeWait(3000);

    // Wait for processing — dismiss progressbar/dialog if needed
    try {
      await page.getByRole('progressbar', { name: 'Please wait' }).waitFor({ state: 'visible', timeout: 10000 });
      await page.waitForFunction(
        () => !document.querySelector('[aria-label="Please wait"]'),
        { timeout: 30000 }
      );
    } catch (e) {}

    await page.getByText(`We\u2019re working on Adjust.`).waitFor({
      state: 'visible',
      timeout: 30000,
    });
    await safeWait(10000);

    // ==================================================
    // MARK AS MOTHER
    // ==================================================

    logAction('Mark as Mother');
    console.log('Mark as Mother');

    await page.getByRole('button', { name: 'Clear All Filters' }).click();
    await safeWait(1000);

    await page.getByRole('textbox', { name: 'Search' }).fill('cuttings');
    await page.getByRole('textbox', { name: 'Search' }).press('Enter');
    await safeWait(2000);

    await sortDescendingByMetrcUID();

    await page.locator('[id="__xmlview1--clonePlannerTable-rowsel0"]').click();
    await page.getByRole('button', { name: 'Mark as Mother' }).click();
    await safeWait(2000);

    // Confirm dialog
    const confirmDialog = page.getByRole('alertdialog', { name: /Confirmation/i });
    try {
      await confirmDialog.waitFor({ state: 'visible', timeout: 10000 });
    } catch (e) {}
    await page.getByRole('button', { name: 'OK' }).click();
    await safeWait(5000);

    // ==================================================
    // DESTROY PLANTS
    // ==================================================

    logAction('Destroy Plants');
    console.log('Destroy Plants');

    await page.getByRole('button', { name: 'Clear All Filters' }).click();
    await safeWait(1000);
    await sortDescendingByMetrcUID();

    // Note: original used __xmlview5 — keep that for Destroy Plants section
    await page.locator('[id="__xmlview5--clonePlannerTable-rowsel0"]').click();
    await page.getByRole('button', { name: 'Additional Options' }).click();
    await safeWait(1000);
    await page.getByRole('button', { name: 'Destroy Plants' }).click();
    await safeWait(2000);

    // Quantity and Waste Weight
    await page.getByRole('textbox', { name: 'Quantity' }).fill('1');
    await page.getByRole('textbox', { name: 'Waste Wgt (lb)' }).fill('1');
    await safeWait(500);

    // Waste Method dropdown
    await page.getByRole('gridcell', { name: 'Waste Method' }).getByLabel('Select Options').click();
    await safeWait(1000);
    await fillComboAndSelect('Waste Method', 'Compo', 'Compost', { timeout: 15000 });

    // Material Used
    await page.getByRole('textbox', { name: 'Material Used' }).fill('soil');
    await safeWait(500);

    // Reason dropdown
    await page.getByRole('gridcell', { name: 'Reason' }).getByLabel('Select Options').click();
    await safeWait(1000);
    await fillComboAndSelect('Reason', 'Damage', 'Damage', { timeout: 15000 });

    // Notes
    await page.getByRole('textbox', { name: 'Notes' }).fill('notes');
    await safeWait(500);

    await page.getByRole('button', { name: 'Destroy Plants' }).click();
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
