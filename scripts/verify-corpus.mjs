import { readJson } from '../lib/blob-json.mjs';
import { isCompleteArticle } from '../lib/article-contract.mjs';
import assert from 'node:assert/strict';
import { writeFile, mkdir } from 'node:fs/promises';
const endpoint=process.argv[2];
const s=await readJson('kb/snapshot-v2.json');
const articles=s.kb.filter(isCompleteArticle);
const longest=articles.reduce((a,b)=>a.text.length>b.text.length?a:b);
const another=articles.find(a=>/^For (Families|Parents):/i.test(a.title));
const checks=[];
for(const a of [longest,another]) {
 let offset=0,revision;const pages=[];
 do {
  const headers={'content-type':'application/json'};
  if(process.env.MCP_API_KEY)headers.authorization=`Bearer ${process.env.MCP_API_KEY}`;
  const r=await fetch(endpoint,{method:'POST',headers,body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'read_clever_article',arguments:{url:a.url,offset,revision}}})});
  assert.equal(r.status,200); const body=await r.json();assert.equal(body.result.isError,false,JSON.stringify(body));
  const data=body.result.structuredContent;assert.deepEqual(data,JSON.parse(body.result.content[0].text));
  if(a.text.length>16000)assert.equal(data.complete,false);
  pages.push(data.text);offset=data.next_offset;revision=data.revision;
 } while(offset!==null);
 assert.equal(pages.join(''),a.text);
 checks.push({articleId:a.id,title:a.title,characters:a.text.length,pages:pages.length,revision,exactReconstruction:true});
}
await mkdir('verification',{recursive:true});
await writeFile('verification/corpus-report.json',JSON.stringify({verifiedAt:new Date().toISOString(),manifest:s.manifest,checks},null,2));
console.log(JSON.stringify(checks,null,2));
