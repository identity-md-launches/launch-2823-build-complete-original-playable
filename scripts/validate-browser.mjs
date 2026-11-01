/** Real production-export interactions. All API mutations are isolated test fixtures. */
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import assert from 'node:assert/strict';
import { chromium, webkit } from 'playwright';
import { makePuzzle, practicePuzzle } from '../src/game.ts';
const fixture = JSON.parse(await readFile('test/fixtures/core.json','utf8'));
const saveKey = 'squeekforest-seedkeeper-v1';
const out = 'test/scratch/browser-validation'; await mkdir(out, {recursive:true});
const root = resolve('dist');
const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.woff':'font/woff','.woff2':'font/woff2'};
const server = createServer(async(req,res)=>{
  try { const pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname); if(!pathname.startsWith('/preview/')) {res.writeHead(404).end();return;}
    const file = resolve(root,pathname.slice('/preview/'.length)||'index.html'); if(file !== root && !file.startsWith(root+'/')) {res.writeHead(403).end();return;}
    const body=await readFile(file); res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream'});res.end(body);
  }catch{res.writeHead(404).end('Not found');}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url=`http://127.0.0.1:${server.address().port}/preview/`;
const report={runAt:new Date().toISOString(),basePath:'/preview/',engines:[],limitations:[]};
const stored = page => page.evaluate(key=>JSON.parse(localStorage.getItem(key)),saveKey);
async function solve(page,puzzle){
  for(const step of puzzle.solution) {
    await page.locator(`.seed-option`).filter({has:page.locator(`.seed-text strong`,{hasText:step.seed==='pine'?'Sunpine':step.seed==='willow'?'Willow':'Glowcap'})}).click();
    await page.locator(`#tile-${step.cell}`).click();
  }
}
for(const [name,type]of [['chromium',chromium],['webkit',webkit]].filter(([name])=>!process.env.SEEDKEEPER_BROWSER||process.env.SEEDKEEPER_BROWSER===name)) {
  const result={name,version:'',passed:[],failures:[],consoleErrors:[],localFailures:[]};report.engines.push(result);
  let browser;
  try {
    browser=await type.launch({headless:true});result.version=browser.version();
    // Keep network-fixture tests outside service-worker interception. Offline caching has its own context below.
    const context=await browser.newContext({viewport:{width:1440,height:1024},reducedMotion:'reduce',serviceWorkers:'block'});
    let responseMode='valid'; let currentFixture=structuredClone(fixture);
    await context.route('https://api.squeekchain.com/**',async route=>{
      if(responseMode==='abort')return route.abort('failed');
      if(responseMode==='http503')return route.fulfill({status:503,body:'unavailable'});
      if(responseMode==='unavailable')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({schemaVersion:1,status:'unavailable'})});
      return route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify(currentFixture)});
    });
    const page=await context.newPage();
    page.setDefaultTimeout(10000);
    page.on('pageerror',e=>result.consoleErrors.push(e.message));
    page.on('response',r=>{if(r.url().startsWith(url)&&r.status()>=400)result.localFailures.push(`${r.status()} ${r.url()}`);});
    await page.goto(url);await page.waitForFunction(()=>document.querySelector('.game-topline .status')?.textContent==='LIVE');
    assert.equal((await stored(page)).archive.length,1);result.passed.push('Validated fixture unlocks a LIVE grove at the observed milestone');
    const entry=(await stored(page)).archive[0];
    const puzzle=makePuzzle('verified',entry.milestone,`${entry.evidence.height}|${entry.evidence.blockHash}|${entry.evidence.transactionHash}`,entry.id);
    await page.locator(`#tile-${puzzle.terrain.indexOf('pond')}`).click();
    assert.equal((await stored(page)).games[entry.id],undefined);await page.getByRole('status').filter({hasText:'is a pond'}).waitFor();
    result.passed.push('Invalid planting explains the rule and consumes no move');
    await solve(page,puzzle);await page.getByText('A little light, returned.',{exact:true}).waitFor();
    assert.equal((await stored(page)).games[entry.id].best,440);
    assert.equal((await stored(page)).games[entry.id].plants.length,4);result.passed.push('Complete strategic playthrough awakens 3 spirits and earns exactly 440 points');
    await page.screenshot({path:`${out}/${name}-restored.png`,fullPage:true});
    await page.getByRole('button',{name:'Undo',exact:true}).click();
    assert.equal((await stored(page)).games[entry.id].plants.length,3);assert.equal((await stored(page)).games[entry.id].best,440);
    await page.reload();await page.waitForFunction(()=>document.querySelectorAll('.tile.planted').length===3);
    assert.equal((await stored(page)).games[entry.id].best,440);result.passed.push('Undo refunds seed; reload retains in-progress board and completed best');
    await page.getByRole('button',{name:'Restart',exact:true}).click();await solve(page,puzzle);
    assert.equal((await stored(page)).games[entry.id].best,440);assert.equal(await page.locator('.keeper-score strong').textContent(),'440');
    result.passed.push('Replay keeps highest score and does not farm cumulative points');
    await page.getByRole('button',{name:'Field guide',exact:true}).click();assert.equal(await page.locator('dialog').evaluate(e=>e.open),true);
    await page.keyboard.press('Escape');assert.equal(await page.locator('dialog').evaluate(e=>e.open),false);
    assert.equal(await page.evaluate(()=>document.activeElement?.textContent),'Field guide');result.passed.push('Native field guide opens, Escape closes, focus returns to trigger');
    await page.getByRole('button',{name:'Forest memory',exact:true}).click();
    await page.getByText('0 additional settled blocks · 0 additional growth trees · 0 new groves.',{exact:true}).waitFor();
    assert.equal(await page.getByRole('cell',{name:'5,973',exact:true}).count()>0,true);result.passed.push('Unchanged returning height correctly shows zero growth; snapshot table shows actual observed evidence');
    const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Export snapshots'}).click();const download=await downloadPromise;assert.equal(download.suggestedFilename(),'squeekforest-memory.json');result.passed.push('Forest snapshot JSON export downloads');
    await page.getByRole('button',{name:'The grove',exact:true}).click();
    responseMode='abort';await page.getByRole('button',{name:'Refresh',exact:true}).click();await page.locator('.data-bar .status').filter({hasText:'STALE'}).waitFor();
    assert.equal((await stored(page)).archive.length,1);assert.equal(await page.locator('.tile.planted').count(),4);result.passed.push('API network failure labels cached evidence STALE and preserves playable save');
    responseMode='valid'; currentFixture=structuredClone(fixture);currentFixture.core.blockHeight='6061';currentFixture.core.cumulativeBlockUnits='6061689426642';
    await page.getByRole('button',{name:'Refresh',exact:true}).click();await page.waitForFunction(k=>JSON.parse(localStorage.getItem(k)).archive.length===2,saveKey);
    assert.equal((await stored(page)).archive[1].milestone,6060);await page.getByRole('button',{name:'Open new grove'}).click();assert.equal(await page.locator('.grove-name>span').textContent(),'Block milestone 6,060');
    await page.getByRole('button',{name:/Grove journal/}).click();await page.getByRole('button',{name:'Replay grove'}).click();assert.equal(await page.locator('.tile.planted').count(),4);result.passed.push('Confirmed milestone unlocks another puzzle; journal replays earlier restored grove');
    responseMode='http503';await page.evaluate(()=>localStorage.clear());await page.reload();await page.locator('.data-bar .status').filter({hasText:'OFFLINE'}).waitFor();
    assert.equal(await page.locator('.game-topline .status').textContent(),'PRACTICE');assert.equal((await stored(page))?.archive.length??0,0);result.passed.push('HTTP 503 without cache shows OFFLINE connection and explicitly labeled PRACTICE puzzle');
    await page.setViewportSize({width:390,height:844});
    const p=practicePuzzle(); await solve(page,p);await page.getByText('A little light, returned.',{exact:true}).waitFor();
    assert.equal((await stored(page)).games[p.id].best,440);assert.equal((await stored(page)).snapshots.length,0);assert.equal((await stored(page)).archive.length,0);
    result.passed.push('Touch-sized mobile practice playthrough scores correctly without adding blockchain observations');
    await page.getByRole('button',{name:'Restart',exact:true}).click();
    for(const width of [320,390,760,1440]) {
      await page.setViewportSize({width,height:width===1440?1024:844});
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth);assert.equal(overflow,false,`overflow at ${width}`);
      assert.equal(await page.getByRole('button',{name:'Field guide',exact:true}).count(),1,`Field guide accessible name at ${width}`);
      await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`${out}/${name}-${width}.png`,fullPage:true});
      if(width===390){const box=await page.locator('.seed-options').boundingBox();assert.ok(box.y+box.height<844,'seed control visible on first screen');}
    }
    result.passed.push('320/390/760/1440 responsive layouts have no overflow; main action visible at 390');
    result.passed.push('Field guide retains its accessible name in the icon-only 320px header');
    const exhaustedPlan=[{cell:20,seed:'pine'},{cell:0,seed:'pine'},{cell:4,seed:'willow'},{cell:7,seed:'willow'},{cell:18,seed:'glowcap'},{cell:19,seed:'glowcap'}];
    await solve(page,{...p,solution:exhaustedPlan});await page.getByText('The forest is still sleeping.',{exact:true}).waitFor();assert.equal((await stored(page)).games[p.id].plants.length,6);
    await page.getByRole('button',{name:'Undo',exact:true}).click();assert.equal((await stored(page)).games[p.id].plants.length,5);await page.getByRole('button',{name:'Restart',exact:true}).click();
    result.passed.push('Six-move unfinished state explains recovery; undo and restart remain usable');
    await page.setViewportSize({width:390,height:844});await page.locator('#tile-0').focus();await page.keyboard.press('ArrowRight');assert.equal(await page.evaluate(()=>document.activeElement.id),'tile-1');
    const first=p.solution[0];await page.locator('.seed-option').filter({hasText:'Willow'}).click();await page.locator(`#tile-${first.cell}`).focus();await page.keyboard.press('Enter');assert.equal((await stored(page)).games[p.id].plants.length,1);result.passed.push('Keyboard arrows and Enter perform real board interaction');
    await page.getByRole('button',{name:'Restart',exact:true}).click();await page.getByRole('button',{name:'Hint',exact:true}).click();await page.getByRole('status').filter({hasText:'Try Willow'}).waitFor();
    result.passed.push('Mobile hint control supplies a legal planting route');
    responseMode='unavailable';await page.getByRole('button',{name:'Refresh',exact:true}).click();await page.locator('.feed-error').filter({hasText:'reports settlement data unavailable'}).waitFor();result.passed.push('HTTP 200 unavailable response is rejected without inventing height');
    responseMode='valid';currentFixture=structuredClone(fixture);currentFixture.chain.chainId='1';await page.getByRole('button',{name:'Refresh',exact:true}).click();await page.locator('.feed-error').filter({hasText:'Unexpected network'}).waitFor();result.passed.push('Wrong-chain payload is rejected with actionable visible error');
    // A recorded visit is an observation, not an estimated historical measurement.
    currentFixture=structuredClone(fixture);await page.getByRole('button',{name:'Refresh',exact:true}).click();await page.locator('.data-bar .status').filter({hasText:'LIVE'}).waitFor();
    currentFixture.core.blockHeight='6000';currentFixture.core.blockProgress='0';currentFixture.core.cumulativeBlockUnits='6000000000000';await page.reload();await page.locator('.data-bar .status').filter({hasText:'LIVE'}).waitFor();await page.getByRole('button',{name:'Forest memory',exact:true}).click();
    await page.getByText('27 additional settled blocks · 1 additional growth tree · 1 new grove.',{exact:true}).waitFor();result.passed.push('Returning visit computes exact crossed tree/grove boundaries from stored observations');
    for(const width of [320,390,1440]){
      await page.setViewportSize({width,height:844});
      for(const name of ['Forest memory',/Grove journal/]){await page.getByRole('button',{name}).click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth),false,`secondary-view overflow at ${width}`);}
      await page.getByRole('button',{name:'The grove',exact:true}).click();await page.getByRole('button',{name:'View data evidence'}).click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth),false);await page.getByRole('button',{name:'Hide data evidence'}).click();
    }
    result.passed.push('Memory, journal and expanded hash evidence reflow without overflow at 320/390/1440');
    const offlineContext=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',serviceWorkers:'allow'});
    const offlineSave=await stored(page);
    await offlineContext.addInitScript(({key,save})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(save));},{key:saveKey,save:offlineSave});
    await offlineContext.route('https://api.squeekchain.com/**',r=>r.abort());
    const offlinePage=await offlineContext.newPage();offlinePage.setDefaultTimeout(10000);offlinePage.on('pageerror',e=>result.consoleErrors.push(e.message));
    await offlinePage.goto(url);
    await offlinePage.evaluate(async()=>{await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));});
    await offlineContext.setOffline(true);await offlinePage.reload();await offlinePage.locator('.data-bar .status').filter({hasText:'STALE'}).waitFor();
    await offlinePage.getByRole('button',{name:'The grove',exact:true}).click();assert.equal(await offlinePage.locator('.tile').count(),25);await offlinePage.locator('.seed-option').filter({hasText:'Willow'}).click();await offlinePage.locator(`#tile-${p.solution[0].cell}`).click();
    assert.equal((await stored(offlinePage)).games[p.id].plants.length,1);await offlinePage.screenshot({path:`${out}/${name}-offline.png`,fullPage:true});
    result.passed.push('Previously loaded static shell reloads with the browser offline and practice remains playable');
    await offlineContext.setOffline(false);await offlinePage.getByRole('button',{name:'Restart',exact:true}).click();
    await offlinePage.evaluate(()=>{Storage.prototype.setItem=function(){throw new DOMException('Storage quota exceeded','QuotaExceededError');};});
    await offlinePage.locator(`#tile-${p.solution[0].cell}`).click();await offlinePage.getByRole('alert').filter({hasText:'could not save progress'}).waitFor();assert.equal(await offlinePage.locator('.tile.planted').count(),1);
    result.passed.push('Storage quota failure shows an honest alert and game continues in memory');
    assert.equal(result.consoleErrors.length,0);assert.equal(result.localFailures.length,0);result.passed.push('No runtime exceptions or missing local resources under gateway subpath');
    await offlineContext.close();await context.close();
  }catch(e){result.failures.push(e.stack||String(e));}
  finally{await browser?.close();}
}
await new Promise(r=>server.close(r));
await writeFile(`${out}/results.json`,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(report.engines.some(e=>e.failures.length))process.exitCode=1;
