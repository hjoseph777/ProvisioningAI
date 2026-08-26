import { chromium } from 'playwright';

const wf = {
  id: 'visual-hover-test2', name: 'Visual Hover Test 2',
  states: [
    { id: 'sA', name: 'StateA', initial: true },
    { id: 'sB', name: 'StateB' },
    { id: 'sC', name: 'StateC' },
    { id: 'sD', name: 'StateD' },
  ],
  transitions: [
    { id: 't1', from: 'StateA', to: 'StateB', conditions: 'after(365d)' },
    { id: 't2', from: 'StateB', to: 'StateC', conditions: 'script(Option Explicit\r\nDim created\r\ncreated = CDate(PropertyValues.SearchForProperty(21).TypedValue.DisplayValue)\r\nIf DateDiff("n", created, Now()) > 1 Then\nAllowStateTransition = True\nEnd If)' },
    { id: 't3', from: 'StateC', to: 'StateD', conditions: 'if(Status=Approved)+priority(10)' },
  ],
  groups: [], theme: 'neutral', comments: [],
};
const storeEnvelope = { state: { workflows: [wf], activeId: wf.id, users: [], properties: [], rules: [] }, version: 0 };

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
await context.addInitScript((envelope) => localStorage.setItem('provisioningai-workflow-store', JSON.stringify(envelope)), storeEnvelope);
const page = await context.newPage();
await page.goto('http://localhost:3003/');
await page.waitForSelector('.diagram-wrap svg', { timeout: 10000 });
await page.waitForTimeout(1500);

// Full canvas, no hover yet — confirm labels are compact/correct now.
await page.screenshot({ path: 'C:/Users/Owner/AppData/Local/Temp/claude/c--Users-Owner-Xerox-ProvisioningAI/7ec4832e-d952-43e3-9f98-78129a7bb172/scratchpad/canvas-fixed-labels.png' });

const ghostBox = await page.evaluate(() => {
  const svg = document.querySelector('.diagram-wrap svg[data-base-width]')
    || Array.from(document.querySelectorAll('.diagram-wrap svg')).find(s => s.querySelector('path.transition'));
  const ghosts = [...svg.querySelectorAll('.ghost-overlay path')];
  const target = ghosts.find(g => g.querySelector('title')?.textContent.includes('script'));
  if (!target) return null;
  const len = target.getTotalLength();
  const mid = target.getPointAtLength(len / 2);
  const ctm = target.getScreenCTM();
  const sp = svg.createSVGPoint(); sp.x = mid.x; sp.y = mid.y;
  const screenPt = sp.matrixTransform(ctm);
  return { x: screenPt.x, y: screenPt.y };
});
console.log('ghost screen point:', JSON.stringify(ghostBox));

if (ghostBox) {
  await page.mouse.move(ghostBox.x - 50, ghostBox.y - 50);
  await page.mouse.move(ghostBox.x, ghostBox.y, { steps: 5 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'C:/Users/Owner/AppData/Local/Temp/claude/c--Users-Owner-Xerox-ProvisioningAI/7ec4832e-d952-43e3-9f98-78129a7bb172/scratchpad/hover-tooltip-attempt2.png' });
  console.log('hover screenshot taken');
}
await browser.close();
