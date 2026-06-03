const { test, expect } = require('@playwright/test');

test.setTimeout(1800000);

test.use({
  ignoreHTTPSErrors: true,
});

test('SAP Business One Automation Flow', async ({ page }) => {

  // ==========================================
  // OPEN LOGIN PAGE
  // ==========================================

  console.log('Opening login page');

  await page.goto('https://ghdev.seedandbeyond.com:223');

  await page.waitForURL(/auth/, {
    timeout: 20000
  });

  // ==========================================
  // LOGIN
  // ==========================================

  console.log('Entering username');

  await page.waitForSelector('#username', {
    timeout: 15000
  });

  await page.fill('#username', 'balag');

  console.log('Clicking first login button');

  await page.getByRole('button', {
    name: 'Log In'
  }).click();

  console.log('Entering password');

  await page.fill(
    'input[name="password"]',
    'Welcome@12345'
  );

  console.log('Submitting login');

  await page.getByRole('button', {
    name: 'Log In'
  }).click();

  // ==========================================
  // SELECT COMPANY
  // ==========================================

  console.log('Selecting company');

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

  console.log('Company selected successfully');

  // ==========================================
  // OPEN MOTHER PLANTS
  // ==========================================

  console.log('Opening Mother Plants module');

  await page.waitForTimeout(20000);

  await page.getByRole('button', {
    name: 'Open Search'
  }).click();

  await page.getByRole('searchbox', {
    name: 'Search'
  }).fill('mother plants');

  await page.getByText('Mother Plants').click();

  await page.waitForTimeout(3000);

  await page.waitForLoadState('networkidle');

  console.log('Mother Plants opened');

  // ==========================================
  // RELOAD PAGE
  // ==========================================

  console.log('Reloading page');

  await page.reload({
    waitUntil: 'domcontentloaded'
  });

  await page.waitForLoadState('networkidle');

  console.log('Page reloaded successfully');

  // ==========================================
  // SELECT LOCATION
  // ==========================================

  console.log('Selecting location');

  await page.waitForSelector(
    '[id="__xmlview1--locDropDown-reset"]',
    {
      timeout: 20000
    }
  );

  await page.locator(
    '[id="__xmlview1--locDropDown-reset"]'
  ).click();

  await page.getByRole('searchbox', {
    name: 'Search'
  }).fill('snb9.b54');

  await page.getByRole('option', {
    name: 'SNB9.B54 - C12-1000009-LIC'
  }).click();

  await page.waitForLoadState('networkidle');

  console.log('Location selected');

  // ==========================================
  // SEARCH TEEN
  // ==========================================

  console.log('Searching Teen plants');

  await page.getByRole('textbox', {
    name: 'Search'
  }).fill('teen');

  await page.getByRole('textbox', {
    name: 'Search'
  }).press('Enter');


  // ==========================================
  // CREATE PACKAGE
  // ==========================================

  console.log('Creating package');
await page.waitForTimeout(5000);
  await page.locator(
    '[id="__xmlview1--motherplannerTable-rowsel0"]'
  ).click();

 // await page.locator('[id="__xmlview1--motherplannerTable-rowsel0"]').click();

  await page.getByRole('button', {
    name: 'Create Package'
  }).click();

  await page.locator(
    '#createPackageDialog--pTag-arrow'
  ).click();
 
   await page.getByRole('spinbutton', {
    name: 'Qty'
  }).fill('111');

  await page.waitForTimeout(5000);

  await page.getByRole('button', {
    name: 'Ok'
  }).dblclick();


  await page.waitForLoadState('networkidle');

  console.log('Package created successfully');
 
('Package created successfully');
await page.waitForTimeout(10000);
console.log('Selecting Mother Plant Row');



// ==========================================
// EDIT LOT NUMBER
// ==========================================

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
  }).click();

await page.getByRole('textbox', {
  name: 'Lot Number'
}).fill('LOT-123');

console.log('Updating Lot Number');

await page.getByRole('button', {
  name: 'Update',
  exact: true
}).click();

await page.waitForTimeout(5000);

console.log('Lot Number Updated');

  console.log('Opening Change Location');

await page.locator(
    '[id="__xmlview1--motherplannerTable-rowsel0"]'
  ).click();

  // ==========================================
  // CHANGE LOCATION
  // ==========================================

  console.log('Opening Change Location');

  await page.getByRole('button', {
    name: 'Change Location'
  }).click();
  await page.waitForTimeout(5000);
  console.log('Opening Select Location Dropdown');

  await page.getByRole('gridcell', {
    name: 'Select Location'
  }).getByLabel('Select Options').click();

  console.log('Selecting New Location SNB9.B55');

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


// ==========================================
// DESTROY PLANTS
// ==========================================

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

console.log('Entering Quantity');

await page.getByRole('textbox', {
  name: 'Quantity'
}).click();

await page.getByRole('textbox', {
  name: 'Quantity'
}).fill('1');

console.log('Entering Waste Weight');

await page.getByRole('textbox', {
  name: 'Waste Weight (lb)'
}).click();

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
}).click();

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
}).click();

await page.getByRole('textbox', {
  name: 'Notes'
}).fill('nots');

console.log('Submitting Destroy Plants');

await page.getByRole('button', {
  name: 'Destroy Plants'
}).click();

await page.waitForTimeout(5000);

console.log('Plants Destroyed Successfully');


// ==========================================
// RECORD WASTE
// ==========================================

console.log('Opening Additional Options Again');

await page.getByRole('button', {
  name: 'Additional Options'
}).click();

console.log('Selecting Row Again');

await page.locator(
  '[id="__xmlview1--motherplannerTable-rowsel0"]'
).click();

console.log('Opening Additional Options');

await page.getByRole('button', {
  name: 'Additional Options'
}).click();

console.log('Opening Record Waste');

await page.getByRole('button', {
  name: 'Record Waste'
}).click();

console.log('Entering Waste Weight');

await page.getByRole('spinbutton', {
  name: 'Waste Weight (lb)'
}).click();

await page.getByRole('spinbutton', {
  name: 'Waste Weight (lb)'
}).fill('1');

console.log('Selecting Waste Method');

await page.locator(
  '[id="__select6-__table3-0-label"]'
).click();

await page.getByRole('option', {
  name: 'Compost'
}).click();

console.log('Entering Material Used');

await page.getByRole('textbox', {
  name: 'Material Used'
}).click();

await page.getByRole('textbox', {
  name: 'Material Used'
}).fill('soil');

console.log('Selecting Waste Reason');

await page.locator(
  '[id="__select7-__table3-0-arrow"]'
).click();

await page.getByRole('option', {
  name: 'Damage'
}).click();

console.log('Entering Notes');

await page.getByRole('textbox', {
  name: 'Notes'
}).click();

await page.getByRole('textbox', {
  name: 'Notes'
}).fill('nots');

console.log('Submitting Record Waste');

await page.getByRole('button', {
  name: 'Record Waste'
}).click();

await page.waitForTimeout(5000);

console.log('Waste Recorded Successfully');


  // ==========================================
  // OPEN PACKAGES
  // ==========================================

  await page.getByText('Packages', { exact: true }).click();
await page.waitForTimeout(5000);

  // ==========================================
  // SELECT LOCATION
  // ==========================================

  console.log('Opening Location Dropdown');

  await page.locator(
    '[id="__xmlview1--locDropDown-reset"]'
  ).click();

  console.log('Selecting Location SNB9.B54');

  await page.getByRole('option', {
    name: 'SNB9.B54 - C12-1000009-LIC'
  }).click();

  console.log('Location Selected');

  // ==========================================
  // SELECT ROW
  // ==========================================

  console.log('Selecting Mother Plant Row');

  await page.locator(
    '[id="__xmlview1--motherplannerTable-rowsel0"]'
  ).click();

  // ==========================================
  // CHANGE LOCATION
  // ==========================================

  console.log('Opening Change Location');

  await page.getByRole('button', {
    name: 'Change Location'
  }).click();
  await page.waitForTimeout(5000);
  console.log('Opening Select Location Dropdown');

  await page.getByRole('gridcell', {
    name: 'Select Location'
  }).getByLabel('Select Options').click();

  console.log('Selecting New Location SNB9.B55');

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

  // ==========================================
  // EDIT LOT NUMBER
  // ==========================================

  console.log('Selecting Row Again');

  await page.locator(
    '[id="__xmlview1--motherplannerTable-rowsel0"]'
  ).click();

  console.log('Opening Edit Lot Number');

  await page.getByRole('button', {
    name: 'Edit Lot Number'
  }).click();
await page.waitForTimeout(5000);
  console.log('Entering Lot Number');

  await page.getByRole('textbox', {
    name: 'Lot Number'
  }).click();

  await page.getByRole('textbox', {
    name: 'Lot Number'
  }).fill('lot123');

  console.log('Updating Lot Number');

  await page.getByRole('button', {
    name: 'Update',
    exact: true
  }).click();

  console.log('Lot Number Updated Successfully');

  // ==========================================
  // ADJUST 
  // ==========================================

  console.log('Selecting Row Again');
await page.waitForTimeout(5000);
  await page.locator(
    '[id="__xmlview1--motherplannerTable-rowsel0"]'
  ).click();

  console.log('Opening Adjust Screen');

  await page.getByRole('button', {
    name: 'Adjust'
  }).click();

  console.log('Entering Adjustment Quantity');

  await page.getByRole('spinbutton', {
    name: 'Adj. Qty'
  }).click();

  await page.getByRole('spinbutton', {
    name: 'Adj. Qty'
  }).fill('11');

  console.log('Opening Reason Dropdown');

  await page.getByRole('gridcell', {
    name: 'Reason'
  }).getByLabel('Select Options').click();

  console.log('Selecting Reason Damage');

  await page.getByRole('option', {
    name: 'Damage'
  }).click();

  console.log('Entering Notes');

  await page.getByRole('textbox', {
    name: 'Notes'
  }).click();

  await page.getByRole('textbox', {
    name: 'Notes'
  }).fill('notes');

  console.log('Submitting Adjustment');

  await page.getByLabel('Footer actions')
    .getByRole('button', {
      name: 'Adjust'
    }).click();

  console.log('Adjustment Completed Successfully');

  // ==========================================
  // MARK AS IMMATURE
  // ==========================================

  console.log('Selecting Row Again');

  await page.locator(
    '[id="__xmlview1--motherplannerTable-rowsel0"]'
  ).click();

  console.log('Opening Mark As Immature');

  await page.getByRole('button', {
    name: 'Mark as Immature'
  }).click();

  console.log('Confirming Mark As Immature');

  await page.getByRole('button', {
    name: 'OK'
  }).click();

  console.log('Plant Marked As Immature');

  // ==========================================
  // UNMARK AS MOTHER
  // ==========================================
//await page.locator('[id="__xmlview1--motherplannerTable-rowsel0"]').click();
  await page.waitForTimeout(5000);
  await page.locator(
    '[id="__xmlview1--motherplannerTable-rowsel0"]'
  ).click();
  await page.getByRole('button', { name: 'Additional Options' }).click();
  await page.getByRole('button', { name: 'Unmark as Mother' }).click();
  await page.getByRole('button', { name: 'OK' }).click();
/*
  console.log('Selecting Row Again');
await page.waitForTimeout(5000);
  await page.locator(
    '[id="__xmlview1--motherplannerTable-rowsel0"]'
  ).click();

  console.log('Opening Additional Options');

  await page.getByRole('button', {
    name: 'Additional Options'
  }).click();

  console.log('Opening Unmark As Mother');

  await page.getByRole('button', {
    name: 'Unmark as Mother'
  }).click();

  console.log('Confirming Unmark As Mother');

  await page.getByRole('button', {
    name: 'OK'
  }).click();*/

  console.log('Plant Unmarked As Mother Successfully');

});
