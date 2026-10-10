import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import http from 'http';

function checkServerReady(port = 1420) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}`, (res) => {
      resolve(true);
    });
    req.on('error', () => {
      resolve(false);
    });
    req.setTimeout(1000, () => {
      req.abort();
      resolve(false);
    });
  });
}

async function run() {
  console.log('--- Starting Release v0.2.0 Verification Suite ---');

  const evidenceDir = path.resolve('.evidence/v0.2.0');
  if (!fs.existsSync(evidenceDir)) {
    fs.mkdirSync(evidenceDir, { recursive: true });
  }

  // 1. Ensure Vite server is running
  let viteProcess = null;
  const isReady = await checkServerReady(1420);
  if (!isReady) {
    console.log('Vite server not detected on :1420. Starting Vite...');
    viteProcess = spawn('npx', ['vite', '--port', '1420', '--clearScreen', 'false'], {
      stdio: 'pipe',
    });

    let attempts = 0;
    while (attempts < 20) {
      await new Promise((r) => setTimeout(r, 500));
      if (await checkServerReady(1420)) {
        console.log('Vite server ready!');
        break;
      }
      attempts++;
    }
  } else {
    console.log('Vite server already running on :1420');
  }

  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    defaultViewport: { width: 1280, height: 900, deviceScaleFactor: 2 },
  });

  const page = await browser.newPage();
  page.on('console', (msg) => {
    console.log('BROWSER:', msg.text());
  });
  page.on('pageerror', (err) => {
    console.log('BROWSER ERROR:', err.message);
  });

  try {
    await page.goto('http://localhost:1420', { waitUntil: 'networkidle0' });
    await page.waitForSelector('.ProseMirror');
    await new Promise((r) => setTimeout(r, 600));

    // ==============================================================
    // [Test 1] Global Fulltext Search (Cmd+P) & Navigation
    // ==============================================================
    console.log('\n[1] Verifying Global Fulltext Search (Cmd+P)...');

    // Click sidebar search button
    await page.click('[data-testid="sidebar-search-button"]');
    await new Promise((r) => setTimeout(r, 300));

    const isModalOpen = await page.evaluate(
      () => !!document.querySelector('[data-testid="global-search-modal"]')
    );
    if (!isModalOpen) throw new Error('Global search modal failed to open!');
    console.log('  ✓ Search modal successfully opened via button');

    // Type query "欢迎"
    await page.type('[data-testid="global-search-input"]', '欢迎');
    await new Promise((r) => setTimeout(r, 300));

    const searchResults = await page.evaluate(() => {
      const items = document.querySelectorAll('[data-testid="search-result-item"]');
      const marks = document.querySelectorAll('[data-testid="search-results-list"] mark');
      return {
        count: items.length,
        hasMarks: marks.length > 0,
        firstTitle: items[0]?.querySelector('.text-xs')?.textContent,
      };
    });

    console.log('  Search results:', JSON.stringify(searchResults));
    if (searchResults.count === 0 || !searchResults.hasMarks) {
      throw new Error('Search failed to return highlighted matching results!');
    }
    console.log('  ✓ CJK search correctly returned matches with keyword highlights');

    // Screenshot: Global Search
    const searchScreenshot = path.join(evidenceDir, 'v0.2.0_global_search.png');
    await page.screenshot({ path: searchScreenshot });
    console.log('  ✓ Saved screenshot:', searchScreenshot);

    // Press Enter to select first item and close modal
    await page.keyboard.press('Enter');
    await new Promise((r) => setTimeout(r, 300));

    const isModalClosed = await page.evaluate(
      () => !document.querySelector('[data-testid="global-search-modal"]')
    );
    if (!isModalClosed) throw new Error('Search modal did not close on Enter!');
    console.log('  ✓ Search selection navigated and closed modal on Enter');

    // ==============================================================
    // [Test 2] Double Brackets WikiLink ('[[') Autocompletion & Pill
    // ==============================================================
    console.log('\n[2] Verifying WikiLink ("[[") Autocompletion & Pill...');

    await page.click('.ProseMirror');
    await page.keyboard.press('Enter');
    await page.keyboard.type('参考链接：[[');
    await new Promise((r) => setTimeout(r, 300));

    const isWikiMenuOpen = await page.evaluate(
      () => !!document.querySelector('[data-testid="wikilink-menu"]')
    );
    if (!isWikiMenuOpen) throw new Error('WikiLink menu did not open on "[[" !');
    console.log('  ✓ WikiLink popup opened at cursor on "[["');

    // Screenshot: WikiLink Menu Open
    const wikiMenuScreenshot = path.join(evidenceDir, 'v0.2.0_wikilink_menu.png');
    await page.screenshot({ path: wikiMenuScreenshot });
    console.log('  ✓ Saved screenshot:', wikiMenuScreenshot);

    // Press Enter to complete WikiLink
    await page.keyboard.press('Enter');
    await new Promise((r) => setTimeout(r, 500));

    const debugInfo = await page.evaluate(() => {
      return {
        html: document.querySelector('.ProseMirror')?.innerHTML,
        menuExists: !!document.querySelector('[data-testid="wikilink-menu"]'),
        pills: document.querySelectorAll('[data-type="wiki-link"]').length,
      };
    });
    console.log('  Debug Info after Enter:', JSON.stringify(debugInfo, null, 2));

    const wikiPill = await page.evaluate(() => {
      const pill = document.querySelector('[data-type="wiki-link"]');
      return {
        exists: !!pill,
        title: pill?.getAttribute('data-target-title'),
        text: pill?.textContent,
      };
    });

    console.log('  WikiLink Pill in DOM:', JSON.stringify(wikiPill));
    if (!wikiPill.exists || !wikiPill.title) {
      throw new Error('WikiLink pill failed to render in editor!');
    }
    console.log('  ✓ WikiLink pill rendered cleanly with 🔗 and title');

    // Screenshot: WikiLink Pill in Editor
    const wikiPillScreenshot = path.join(evidenceDir, 'v0.2.0_wikilink_pill.png');
    await page.screenshot({ path: wikiPillScreenshot });
    console.log('  ✓ Saved screenshot:', wikiPillScreenshot);

    // ==============================================================
    // [Test 3] Backlinks Panel (Incoming references scanning)
    // ==============================================================
    console.log('\n[3] Verifying Backlinks Panel...');

    // Create a second document that links to the welcome document
    await page.evaluate(async () => {
      // Create new page
      const createBtn = document.querySelector('button[title="新建页面"]');
      if (createBtn) createBtn.click();
    });
    await new Promise((r) => setTimeout(r, 600));

    // In the new document, insert link to "👋 欢迎与快速上手"
    await page.evaluate(() => {
      const ed = window.__editor;
      if (ed) {
        ed.commands.clearContent();
        ed.commands.insertContent('<p>这里引用了上一篇文档：</p>');
        ed.commands.insertWikiLink('👋 欢迎与快速上手');
      }
    });
    // Wait for 1000ms auto-save debounce
    await new Promise((r) => setTimeout(r, 1300));

    // Switch back to "👋 欢迎与快速上手"
    await page.evaluate(() => {
      const pages = Array.from(document.querySelectorAll('span'));
      const welcome = pages.find((el) => el.textContent?.includes('欢迎与快速上手'));
      if (welcome) welcome.click();
    });
    await new Promise((r) => setTimeout(r, 800));

    // Verify Backlinks Panel at bottom
    const backlinksInfo = await page.evaluate(() => {
      const panel = document.querySelector('[data-testid="backlinks-panel"]');
      const countEl = document.querySelector('[data-testid="backlinks-count"]');
      const cards = document.querySelectorAll('[data-testid="backlink-card"]');
      return {
        hasPanel: !!panel,
        count: countEl ? parseInt(countEl.textContent || '0', 10) : 0,
        cardCount: cards.length,
        firstCardText: cards[0]?.textContent,
      };
    });

    console.log('  Backlinks Panel status:', JSON.stringify(backlinksInfo));
    if (!backlinksInfo.hasPanel || backlinksInfo.count === 0) {
      throw new Error('Backlinks panel failed to detect incoming reference!');
    }
    console.log(`  ✓ Backlinks Panel successfully detected ${backlinksInfo.count} incoming reference(s)`);

    // Scroll down to Backlinks Panel for screenshot
    await page.evaluate(() => {
      document.querySelector('[data-testid="backlinks-panel"]')?.scrollIntoView({ behavior: 'instant' });
    });
    await new Promise((r) => setTimeout(r, 300));

    const backlinksScreenshot = path.join(evidenceDir, 'v0.2.0_backlinks_panel.png');
    await page.screenshot({ path: backlinksScreenshot });
    console.log('  ✓ Saved screenshot:', backlinksScreenshot);

    // ==============================================================
    // [Test 4] Multi-format File Import Pipeline
    // ==============================================================
    console.log('\n[4] Verifying File Import Pipeline...');

    // Scroll back to top
    await page.evaluate(() => window.scrollTo(0, 0));

    // Simulate file import via file input change
    const importSuccess = await page.evaluate(async () => {
      const input = document.querySelector('[data-testid="file-import-input"]');
      if (!input) return false;

      // Construct a simulated File
      const content = '# 外部导入的调研报告\n\n这是通过 **本地导入流水线** 导入的测试 Markdown 文件。\n\n- [x] 纯本地无云端依赖\n- [x] 自动创建独立页面\n';
      const file = new File([content], '外部导入的调研报告.md', { type: 'text/markdown' });

      // Dispatch change with DataTransfer
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;

      input.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    });

    if (!importSuccess) throw new Error('File import trigger failed!');
    await new Promise((r) => setTimeout(r, 1000));

    const importedDocTitle = await page.evaluate(() => {
      return document.querySelector('header span.text-xs')?.textContent;
    });

    console.log('  Active document title after import:', importedDocTitle);
    if (!importedDocTitle || !importedDocTitle.includes('外部导入的调研报告')) {
      throw new Error('Imported document failed to become active or render in sidebar!');
    }
    console.log('  ✓ File imported successfully, new page created and opened');

    // Screenshot: Import Pipeline result
    const importScreenshot = path.join(evidenceDir, 'v0.2.0_import_pipeline.png');
    await page.screenshot({ path: importScreenshot });
    console.log('  ✓ Saved screenshot:', importScreenshot);

    console.log('\n======================================================');
    console.log('🎉 ALL v0.2.0 SPEC & ACCEPTANCE CRITERIA VERIFIED! 🎉');
    console.log('======================================================\n');
  } finally {
    await browser.close();
    if (viteProcess) {
      viteProcess.kill();
    }
  }
}

run().catch((err) => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});
