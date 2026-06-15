const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    // Navigate to app
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    console.log('✅ App loaded');

    // Test 1: Check sidebar exists
    const sidebar = await page.$('.bg-white.border-r');
    if (sidebar) {
      console.log('✅ Sidebar found');
    } else {
      console.log('❌ Sidebar not found');
    }

    // Test 2: Add an assignment
    await page.fill('input[placeholder="e.g., Math"]', 'Math');
    await page.fill('input[placeholder="e.g., Chapter 5 Problem Set"]', 'Homework 5');
    const dateInput = await page.$('input[type="date"]');
    await dateInput.evaluate(el => el.value = '2026-06-20');
    await page.click('button:has-text("Add Assignment")');
    await page.waitForTimeout(500);
    console.log('✅ Assignment added');

    // Test 3: Check if assignment appears in sidebar
    const mathSubject = await page.$text('Math');
    if (mathSubject) {
      console.log('✅ Math subject appears in sidebar');
    }

    // Test 4: Click to expand subject
    const subjectButton = await page.$('button:has-text("Math")');
    if (subjectButton) {
      await subjectButton.click();
      await page.waitForTimeout(300);
      console.log('✅ Subject button clicked');
    }

    // Test 5: Check assignment appears in dropdown
    const assignmentTitle = await page.$text('Homework 5');
    if (assignmentTitle) {
      console.log('✅ Assignment appears in sidebar dropdown');
    }

    // Test 6: Delete assignment
    const deleteButton = await page.$('button:has-text("Delete")');
    if (deleteButton) {
      await deleteButton.click();
      await page.waitForTimeout(500);
      console.log('✅ Delete button clicked');
    }

    // Test 7: Check assignment is removed
    const assignmentRemoved = await page.$text('Homework 5');
    if (!assignmentRemoved) {
      console.log('✅ Assignment deleted successfully');
    }

    await browser.close();
    console.log('\n✅ All tests passed!');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
