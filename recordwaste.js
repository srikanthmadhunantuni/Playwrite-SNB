async function recordWaste(page) {

  console.log('Opening Record Waste');

  await page.getByRole('button', {
    name: 'Additional Options'
  }).click();

  await page.getByRole('button', {
    name: 'Record Waste'
  }).click();

  await page.getByRole('spinbutton', {
    name: 'Waste Weight (lb)'
  }).fill('1');

  await page.locator(
    '[id="__select6-__table3-0-label"]'
  ).click();

  await page.getByRole('option', {
    name: 'Compost'
  }).click();

  await page.getByRole('textbox', {
    name: 'Material Used'
  }).fill('soil');

  await page.locator(
    '[id="__select7-__table3-0-arrow"]'
  ).click();

  await page.getByRole('option', {
    name: 'Damage'
  }).click();

  await page.getByRole('textbox', {
    name: 'Notes'
  }).fill('notes');

  await page.getByRole('button', {
    name: 'Record Waste'
  }).click();

  console.log('Waste recorded successfully');
}

module.exports = { recordWaste };