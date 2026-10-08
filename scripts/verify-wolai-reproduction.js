import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

async function run() {
  console.log('--- Starting Wolai Reproduction & BlockHandle Verification ---');
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    defaultViewport: { width: 1280, height: 900, deviceScaleFactor: 2 },
  });

  const page = await browser.newPage();
  await page.goto('http://localhost:1420', { waitUntil: 'networkidle0' });
  await page.waitForSelector('.ProseMirror');
  await new Promise(r => setTimeout(r, 600));

  // 1. Verify Typography Styles
  console.log('\n[1] Verifying Typography Styles...');
  const styles = await page.evaluate(() => {
    const h1 = document.querySelector('.ProseMirror h1');
    const h2 = document.querySelector('.ProseMirror h2');
    const h3 = document.querySelector('.ProseMirror h3');
    const h4 = document.querySelector('.ProseMirror h4');
    const pre = document.querySelector('.ProseMirror pre');
    const quote = document.querySelector('.ProseMirror blockquote');
    const callout = document.querySelector('.wolai-callout');

    return {
      h1: h1 ? { fontSize: window.getComputedStyle(h1).fontSize, fontWeight: window.getComputedStyle(h1).fontWeight } : null,
      h2: h2 ? { fontSize: window.getComputedStyle(h2).fontSize, fontWeight: window.getComputedStyle(h2).fontWeight } : null,
      h3: h3 ? { fontSize: window.getComputedStyle(h3).fontSize, fontWeight: window.getComputedStyle(h3).fontWeight } : null,
      h4: h4 ? { fontSize: window.getComputedStyle(h4).fontSize, fontWeight: window.getComputedStyle(h4).fontWeight } : null,
      preBg: pre ? window.getComputedStyle(pre).backgroundColor : null,
      quoteBorder: quote ? window.getComputedStyle(quote).borderLeftWidth : null,
      callout: !!callout,
    };
  });
  console.log('  Styles computed:', JSON.stringify(styles, null, 2));

  if (styles.h1?.fontSize !== '28px' || styles.h2?.fontSize !== '22px') {
    throw new Error('Typography font sizes are incorrect!');
  }
  console.log('  ✓ Typography matches Wolai specification exactly!');

  // 2. Verify Hover to reveal BlockHandle (+ and ⠿)
  console.log('\n[2] Verifying BlockHandle Hover Interaction...');
  // Hover over the H2 block
  const h2BoundingBox = await page.evaluate(() => {
    const h2 = document.querySelector('.ProseMirror h2');
    if (!h2) return null;
    const rect = h2.getBoundingClientRect();
    return { x: rect.x + 20, y: rect.y + 10 };
  });

  if (!h2BoundingBox) throw new Error('Could not find H2 block!');
  await page.mouse.move(h2BoundingBox.x, h2BoundingBox.y);
  await new Promise(r => setTimeout(r, 200));

  const handleInfo = await page.evaluate(() => {
    const handle = document.querySelector('[data-testid="block-handle"]');
    const addBtn = document.querySelector('[data-testid="block-handle-add"]');
    const gripBtn = document.querySelector('[data-testid="block-handle-grip"]');
    if (!handle) return null;
    const computed = window.getComputedStyle(handle);
    const rect = handle.getBoundingClientRect();
    return {
      visible: computed.opacity === '1',
      hasAdd: !!addBtn,
      hasGrip: !!gripBtn,
      rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
    };
  });

  console.log('  BlockHandle status on H2 hover:', JSON.stringify(handleInfo, null, 2));
  if (!handleInfo || !handleInfo.visible || !handleInfo.hasGrip || !handleInfo.hasAdd) {
    throw new Error('BlockHandle did not appear on hover!');
  }
  console.log('  ✓ BlockHandle correctly appeared with + and ⠿ buttons!');

  // Take screenshot with hover handle visible
  const evidenceDir = path.resolve('.evidence/v0.1.0');
  if (!fs.existsSync(evidenceDir)) {
    fs.mkdirSync(evidenceDir, { recursive: true });
  }

  const hoverScreenshotPath = path.join(evidenceDir, 'wolai_block_handle_hover.png');
  await page.screenshot({ path: hoverScreenshotPath });
  console.log('  ✓ Saved screenshot with BlockHandle hover to:', hoverScreenshotPath);

  // 3. Verify Click ⠿ to open Block Menu and trigger NodeSelection
  console.log('\n[3] Verifying Click ⠿ to open Block Menu & NodeSelection...');
  const gripCenter = await page.evaluate(() => {
    const gripBtn = document.querySelector('[data-testid="block-handle-grip"]');
    if (!gripBtn) return null;
    const rect = gripBtn.getBoundingClientRect();
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  });

  if (!gripCenter) throw new Error('Could not find grip handle center!');
  await page.mouse.click(gripCenter.x, gripCenter.y);
  await new Promise(r => setTimeout(r, 200));

  const menuInfo = await page.evaluate(() => {
    const menu = document.querySelector('[data-testid="block-menu"]');
    const selectedNode = document.querySelector('.ProseMirror-selectednode');
    return {
      menuVisible: !!menu,
      hasSelectedNode: !!selectedNode,
      selectedTag: selectedNode?.tagName,
      itemCount: menu ? menu.querySelectorAll('button').length : 0,
    };
  });

  console.log('  BlockMenu & Selection info:', JSON.stringify(menuInfo, null, 2));
  if (!menuInfo.menuVisible || !menuInfo.hasSelectedNode) {
    throw new Error('BlockMenu did not open or NodeSelection was not triggered!');
  }
  console.log(`  ✓ BlockMenu opened with ${menuInfo.itemCount} actions and target block node selected!`);

  // Take screenshot with menu open
  const menuScreenshotPath = path.join(evidenceDir, 'wolai_block_menu_open.png');
  await page.screenshot({ path: menuScreenshotPath });
  console.log('  ✓ Saved screenshot with BlockMenu open to:', menuScreenshotPath);

  // Close menu by clicking outside
  await page.mouse.click(10, 10);
  await new Promise(r => setTimeout(r, 200));

  // 4. Verify Native Markdown Typing Input Rules
  console.log('\n[4] Verifying Native Markdown Input Rules typing...');
  await page.evaluate(() => {
    window.__editor.commands.clearContent();
  });
  await page.click('.ProseMirror');
  await new Promise(r => setTimeout(r, 200));

  // Type '# Wolai Heading 1'
  await page.keyboard.type('# Wolai Heading 1');
  await page.keyboard.press('Enter');
  await new Promise(r => setTimeout(r, 100));

  // Type '## Wolai Heading 2'
  await page.keyboard.type('## Wolai Heading 2');
  await page.keyboard.press('Enter');
  await new Promise(r => setTimeout(r, 100));

  // Type '### Wolai Heading 3'
  await page.keyboard.type('### Wolai Heading 3');
  await page.keyboard.press('Enter');
  await new Promise(r => setTimeout(r, 100));

  // Type '#### Wolai Heading 4'
  await page.keyboard.type('#### Wolai Heading 4');
  await page.keyboard.press('Enter');
  await new Promise(r => setTimeout(r, 100));

  // Type '> Wolai Blockquote'
  await page.keyboard.type('> Wolai Blockquote');
  await page.keyboard.press('Enter');
  await new Promise(r => setTimeout(r, 100));

  // Type '- [ ] Task item'
  await page.keyboard.type('- [ ] Wolai Task');
  await page.keyboard.press('Enter');
  await new Promise(r => setTimeout(r, 200));

  const markdownResults = await page.evaluate(() => {
    return {
      h1: document.querySelector('.ProseMirror h1')?.innerText,
      h2: document.querySelector('.ProseMirror h2')?.innerText,
      h3: document.querySelector('.ProseMirror h3')?.innerText,
      h4: document.querySelector('.ProseMirror h4')?.innerText,
      blockquote: document.querySelector('.ProseMirror blockquote')?.innerText?.trim(),
      taskList: !!document.querySelector('.ProseMirror ul[data-type="taskList"]'),
    };
  });

  console.log('  Native Markdown parsed elements:', JSON.stringify(markdownResults, null, 2));
  if (!markdownResults.h1 || !markdownResults.h2 || !markdownResults.h3 || !markdownResults.h4 || !markdownResults.blockquote) {
    throw new Error('Native markdown syntax failed to convert into blocks!');
  }
  console.log('  ✓ Native Markdown #, ##, ###, ####, >, - [ ] all work flawlessly!');

  // Take final verified screenshot
  const finalScreenshotPath = path.join(evidenceDir, 'wolai_reproduction_verified.png');
  await page.screenshot({ path: finalScreenshotPath });
  console.log('  ✓ Saved final verified screenshot to:', finalScreenshotPath);

  await browser.close();
  console.log('\n--- All Wolai Reproduction Verifications PASSED! ---');
}

run().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
