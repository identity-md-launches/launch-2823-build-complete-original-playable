import { readdir, readFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import assert from 'node:assert/strict';
const html=await readFile('dist/index.html','utf8');
for(const token of ['<title>','name="description"','property="og:title"','property="og:image"','rel="icon"'])assert.ok(html.includes(token),`Missing ${token}`);
for(const [,path]of html.matchAll(/(?:src|href|content)="(\.\/[^"#]+)"/g))assert.ok((await stat(resolve('dist',path))).isFile(),`Missing exported asset ${path}`);
assert.equal(/(?:src|href)="\/(?!\/)/.test(html),false,'Assets must use relative URLs');
assert.ok((await stat('dist/sw.js')).size>0);
const prohibited=new Set(['.git','.github','.imd','.agents','.codex','.aws','node_modules','.vite','.cache','.npm','.playwright-mcp','playwright-report','test-results']);
const budget=8388608;let bytes=0,count=0;const paths=[];
async function walk(dir='.'){
  for(const e of await readdir(dir,{withFileTypes:true})){
    if(prohibited.has(e.name)||e.name==='.env'||e.name.startsWith('.env.')||dir==='test'&&e.name==='scratch')continue;
    const path=join(dir,e.name);
    assert.equal(e.isSymbolicLink(),false,`Submission must not contain symlinks: ${path}`);
    if(e.isDirectory())await walk(path);else{
      assert.equal(/\.(tgz|zip|deb|tar|gz|tsbuildinfo)$/.test(e.name),false,`Unexpected packaging/cache artifact: ${path}`);
      const size=(await stat(path)).size;bytes+=size;count++;paths.push({path,bytes:size});
    }
  }
}
await walk();assert.ok(bytes<=budget,`Submission ${bytes} exceeds ${budget} bytes`);
console.log(JSON.stringify({export:'dist/index.html',relativeAssets:true,metadata:true,files:count,bytes,budget,headroom:budget-bytes,largest:paths.sort((a,b)=>b.bytes-a.bytes).slice(0,6)},null,2));
