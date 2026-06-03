async function selectLocation(page, location) {

  // ==========================================
  // RELOAD PAGE
  // ==========================================

  console.log('Reloading page');

  await page.reload({
    waitUntil: 'networkidle'
  });

  await page.waitForLoadState('networkidle');

  // ==========================================
  // SELECT LOCATION
  // ==========================================

  console.log(`Selecting location ${location}`);

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
  }).fill(location);

  await page.getByRole('option', {
    name: new RegExp(location, 'i')
  }).click();

  await page.waitForLoadState('networkidle');

  console.log('Page reloaded successfully and location selected');

}

module.exports = { selectLocation };