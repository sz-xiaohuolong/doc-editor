import puppeteer from 'puppeteer-core';

async function run() {
  console.log('--- Starting Complete E2E Verification ---');
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
  });

  const page = await browser.newPage();
  page.on('console', msg => {
    console.log('BROWSER LOG:', msg.text());
  });

  await page.goto('http://localhost:1420', { waitUntil: 'networkidle0' });
  await page.waitForSelector('.ProseMirror');

  // Helper to get HTML
  const getHTML = () => page.evaluate(() => document.querySelector('.ProseMirror')?.innerHTML || '');
  
  // Helper to clear editor
  const clearEditor = () => page.evaluate(() => {
    const ed = window.__editor;
    if (ed) {
      ed.commands.clearContent();
      ed.commands.focus();
    }
  });

  // ==========================================
  // Test 1: Slash Menu - ArrowDown & Enter key
  // ==========================================
  console.log('\n[Test 1] Testing Slash Menu Arrow navigation and Enter selection...');
  await clearEditor();
  await page.click('.ProseMirror');
  await page.keyboard.type('/');
  await new Promise(r => setTimeout(r, 200));

  const isMenuOpen1 = await page.evaluate(() => !!document.querySelector('.fixed.z-50'));
  console.log('  Menu opened on "/":', isMenuOpen1);
  if (!isMenuOpen1) throw new Error('Slash menu did not open!');

  // ArrowDown to item 1 (待办列表)
  await page.keyboard.press('ArrowDown');
  await new Promise(r => setTimeout(r, 100));

  // Press Enter
  await page.keyboard.press('Enter');
  await new Promise(r => setTimeout(r, 300));

  const htmlAfterEnter = await getHTML();
  console.log('  HTML after Enter on 待办列表:', htmlAfterEnter);
  const hasTaskList1 = htmlAfterEnter.includes('data-type="taskList"') || htmlAfterEnter.includes('data-type="taskItem"');
  console.log('  Successfully converted to task list:', hasTaskList1);
  if (!hasTaskList1) throw new Error('Enter on Slash Menu failed to convert to TaskList!');

  // ==========================================
  // Test 2: Slash Menu - Mouse click
  // ==========================================
  console.log('\n[Test 2] Testing Slash Menu Mouse Click selection...');
  await clearEditor();
  await page.click('.ProseMirror');
  await page.keyboard.type('/h2');
  await new Promise(r => setTimeout(r, 200));

  const isMenuOpen2 = await page.evaluate(() => !!document.querySelector('.fixed.z-50'));
  console.log('  Menu opened on "/h2":', isMenuOpen2);
  
  // Click on the filtered button
  const h2Btn = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll('.fixed.z-50 button'));
    return buttons.find(b => b.textContent?.includes('大标题'));
  });
  if (!h2Btn) throw new Error('H2 button in menu not found!');
  await h2Btn.click();
  await new Promise(r => setTimeout(r, 300));

  const htmlAfterClick = await getHTML();
  console.log('  HTML after clicking H2:', htmlAfterClick);
  const hasH2 = htmlAfterClick.includes('<h2');
  console.log('  Successfully converted to H2:', hasH2);
  if (!hasH2) throw new Error('Click on Slash Menu failed to convert to H2!');

  // ==========================================
  // Test 3: Heading Enter exits to Paragraph
  // ==========================================
  console.log('\n[Test 3] Testing Heading Enter exits to Paragraph...');
  await clearEditor();
  await page.click('.ProseMirror');
  await page.keyboard.type('# Main Title');
  await new Promise(r => setTimeout(r, 200));
  await page.keyboard.press('Enter');
  await new Promise(r => setTimeout(r, 200));
  await page.keyboard.type('Paragraph text below title');
  await new Promise(r => setTimeout(r, 200));

  const htmlHeadingExit = await getHTML();
  console.log('  HTML after Heading Enter:', htmlHeadingExit);
  const hasHeadingAndP = htmlHeadingExit.includes('<h1>Main Title</h1>') && htmlHeadingExit.includes('<p>Paragraph text below title</p>');
  console.log('  Successfully created H1 then P on Enter:', hasHeadingAndP);
  if (!hasHeadingAndP) throw new Error('Enter in Heading did not exit to Paragraph!');

  // ==========================================
  // Test 4: Native Markdown H4 input rule (#### )
  // ==========================================
  console.log('\n[Test 4] Testing Native Markdown H4 (#### )...');
  await clearEditor();
  await page.click('.ProseMirror');
  await page.keyboard.type('#### Small Heading 4');
  await new Promise(r => setTimeout(r, 200));

  const htmlH4 = await getHTML();
  console.log('  HTML after typing "#### Small Heading 4":', htmlH4);
  const hasH4 = htmlH4.includes('<h4>Small Heading 4</h4>');
  console.log('  Successfully created H4 via native md:', hasH4);
  if (!hasH4) throw new Error('Native #### did not create H4!');

  // ==========================================
  // Test 5: Native Markdown TaskList (- [ ] )
  // ==========================================
  console.log('\n[Test 5] Testing Native Markdown TaskList (- [ ] )...');
  await clearEditor();
  await page.click('.ProseMirror');
  await page.keyboard.type('- [ ] Task Item One');
  await new Promise(r => setTimeout(r, 200));

  const htmlTask = await getHTML();
  console.log('  HTML after typing "- [ ] Task Item One":', htmlTask);
  const hasTask = (htmlTask.includes('data-type="taskList"') || htmlTask.includes('data-type="taskItem"')) && htmlTask.includes('Task Item One');
  console.log('  Successfully created TaskList via native "- [ ] ":', hasTask);
  if (!hasTask) throw new Error('Native - [ ] did not create TaskList!');

  // ==========================================
  // Test 6: Native Markdown Callout (> [!NOTE] )
  // ==========================================
  console.log('\n[Test 6] Testing Native Markdown Callout (> [!NOTE] )...');
  await clearEditor();
  await page.click('.ProseMirror');
  await page.keyboard.type('> [!NOTE] Alert message');
  await new Promise(r => setTimeout(r, 200));

  const htmlCallout = await getHTML();
  console.log('  HTML after typing "> [!NOTE] Alert message":', htmlCallout);
  const hasCallout = htmlCallout.includes('data-type="callout"') && htmlCallout.includes('Alert message');
  console.log('  Successfully created Callout via native "> [!NOTE] ":', hasCallout);
  if (!hasCallout) throw new Error('Native > [!NOTE] did not create Callout!');

  // ==========================================
  // Test 7: Native Markdown Bullet List (- item)
  // ==========================================
  console.log('\n[Test 7] Testing Native Markdown Bullet List (- item)...');
  await clearEditor();
  await page.click('.ProseMirror');
  await page.keyboard.type('- Bullet One');
  await new Promise(r => setTimeout(r, 200));

  const htmlBullet = await getHTML();
  console.log('  HTML after typing "- Bullet One":', htmlBullet);
  const hasBullet = htmlBullet.includes('<ul') && htmlBullet.includes('Bullet One');
  console.log('  Successfully created Bullet List via native "- ":', hasBullet);
  if (!hasBullet) throw new Error('Native - did not create Bullet List!');

  // ==========================================
  // Test 8: Clean Markdown Export (getMarkdown)
  // ==========================================
  console.log('\n[Test 8] Testing Clean Markdown Export...');
  const mdExport = await page.evaluate(() => {
    return window.__editor?.storage?.markdown?.getMarkdown();
  });
  console.log('  Exported Markdown:\n', mdExport);
  const isClean = !mdExport.includes('<!--') && !mdExport.includes('<block>') && mdExport.includes('- Bullet One');
  console.log('  Markdown is clean and valid:', isClean);
  if (!isClean) throw new Error('Exported markdown contains invalid tags or missed content!');

  // Save evidence screenshot
  await page.screenshot({ path: '.evidence/e2e_verified.png' });
  console.log('\n🎉 ALL 8 E2E TESTS PASSED PERFECTLY!');

  await browser.close();
}

run().catch(err => {
  console.error('\n❌ E2E VERIFICATION FAILED:', err);
  process.exit(1);
});
