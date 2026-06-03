async function login(page) {

  // ==========================================
  // OPEN LOGIN PAGE
  // ==========================================

  console.log('Opening login page');

  await page.goto('https://ghdev.seedandbeyond.com:223');

  await page.waitForURL(/auth/);

  // ==========================================
  // LOGIN
  // ==========================================

  console.log('Entering username');

  await page.fill('#username', 'balag');

  await page.getByRole('button', {
    name: 'Log In'
  }).click();

  console.log('Entering password');

  await page.fill(
    'input[name="password"]',
    'Welcome@12345'
  );

  await page.getByRole('button', {
    name: 'Log In'
  }).click();

  console.log('Login successful');

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

}

module.exports = { login };