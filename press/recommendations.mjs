// Deterministic content similarity. No cookies, browsing history or personal data.
const stop=new Set('the and for with from that this have your you are was were into about when where what how its our can but not has will than then they their them just also some more very one all which'.split(' '));
function tokens(text){return String(text||'').toLowerCase().normalize('NFKC').match(/[\p{L}\p{N}]{3,}/gu)?.filter(t=>!stop.has(t))||[];}
function vector(entry){
  const map=new Map();
  const add=(text,weight)=>{for(const word of tokens(text))map.set(word,(map.get(word)||0)+weight);};
  add(entry.title,4);add(entry.deck,2);add(entry.category,3);add(entry.location,2);
  add((entry.body||[]).map(p=>(p.runs||[]).map(r=>r.text).join(' ')).join(' ').slice(0,24000),1);
  return map;
}
export function recommend(current,published,limit=3){
  const unique=[...new Map(published.filter(e=>e.id!==current.id).map(e=>[e.id,e])).values()];
  const all=[current,...unique],vectors=all.map(vector),frequency=new Map();
  for(const v of vectors)for(const word of v.keys())frequency.set(word,(frequency.get(word)||0)+1);
  const weighted=v=>new Map([...v].map(([word,count])=>[word,(1+Math.log(count))*(1+Math.log((all.length+1)/(frequency.get(word)+1)))]));
  const weights=vectors.map(weighted),norm=v=>Math.sqrt([...v.values()].reduce((n,x)=>n+x*x,0)),base=weights[0],baseNorm=norm(base);
  return unique.map((entry,i)=>{
    const v=weights[i+1],denominator=baseNorm*norm(v);
    const similarity=denominator?[...base].reduce((sum,[word,value])=>sum+value*(v.get(word)||0),0)/denominator:0;
    const sameCategory=current.category&&current.category.toLowerCase()===entry.category?.toLowerCase();
    const samePlace=current.location&&current.location.toLowerCase()===entry.location?.toLowerCase();
    return {entry,score:similarity+(sameCategory?.18:0)+(samePlace?.1:0),reason:sameCategory?'More in '+entry.category:samePlace?'More from '+entry.location:'Similar themes'};
  }).filter(item=>item.score>.025).sort((a,b)=>b.score-a.score||String(b.entry.date).localeCompare(String(a.entry.date))||a.entry.id.localeCompare(b.entry.id)).slice(0,Math.max(1,Math.min(6,limit)));
}
