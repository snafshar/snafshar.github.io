// Newspaper coordinates are independent of the screen size. Both the editor and
// the reader use these measurements, including the space below a caption.
export const WIDTH=960, HEIGHT=800, GUTTER=30;
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const format={
  p:{size:18,line:28,after:13,family:'Georgia, "Times New Roman", serif'},
  quote:{size:21,line:31,after:17,family:'Georgia, "Times New Roman", serif'},
  h2:{size:28,line:35,after:10,family:'"Instrument Serif", Georgia, serif'},
};
export function fontFor(kind,run) {
  const f=format[kind]||format.p;
  return (run.italic||kind==="quote"?"italic ":"")+(run.bold?"bold ":"")+f.size+"px "+f.family;
}
export const captionFont='13px Inter, Arial, sans-serif';
export function measurer(){
  const ctx=document.createElement("canvas").getContext("2d"), cache=new Map();
  let font="";
  return (text,style)=>{
    const key=style+"\n"+text;
    if(cache.has(key))return cache.get(key);
    if(font!==style){font=style;ctx.font=style;}
    const value=ctx.measureText(text).width;
    if(cache.size>35000)cache.clear();
    cache.set(key,value);return value;
  };
}
function styleKey(r){return (r.bold?1:0)+(r.italic?2:0)+(r.underline?4:0);}
function appendRun(list,text,source){
  if(!text)return;
  const previous=list.at(-1);
  if(previous&&styleKey(previous)===styleKey(source))previous.text+=text;
  else list.push({text,bold:!!source.bold,italic:!!source.italic,underline:!!source.underline});
}
export function prepare(body,measure){
  return body.map(p=>{
    const words=[];let pieces=[];
    function commit(){
      if(!pieces.length)return;
      const text=pieces.map(p=>p.text).join("");
      words.push({pieces,text,width:pieces.reduce((n,r)=>n+measure(r.text,fontFor(p.kind,r)),0)});
      pieces=[];
    }
    for(const r of p.runs)for(const part of r.text.match(/\s+|[^\s]+/gu)||[]){
      if(/^\s/u.test(part))commit();else appendRun(pieces,part,r);
    }
    commit();return {kind:p.kind,words};
  });
}
function wordPart(w,from,to,kind,measure) {
  const pieces=[];let n=0;
  for(const r of w.pieces){const start=Math.max(0,from-n),end=Math.min(r.text.length,to-n);if(start<end)appendRun(pieces,r.text.slice(start,end),r);n+=r.text.length;if(n>=to)break;}
  return {pieces,width:pieces.reduce((s,r)=>s+measure(r.text,fontFor(kind,r)),0)};
}
function splitLength(word,offset,width,kind,measure){
  const remaining=Array.from(word.text.slice(offset));let low=1,high=remaining.length;
  while(low<high){const mid=Math.ceil((low+high)/2),len=remaining.slice(0,mid).join("").length;if(wordPart(word,offset,offset+len,kind,measure).width<=width)low=mid;else high=mid-1;}
  return remaining.slice(0,low).join("").length;
}
export function captionLines(text,width,measure){
  const lines=[];let line="";
  for(const word of text.trim().split(/\s+/u).filter(Boolean)){
    if(line&&measure(line+" "+word,captionFont)>width){lines.push(line);line="";}
    if(measure(word,captionFont)<=width){line=line?line+" "+word:word;continue;}
    for(const ch of word){if(line&&measure(line+ch,captionFont)>width){lines.push(line);line="";}line+=ch;}
  }
  if(line)lines.push(line);return lines;
}
export function resizeFrame(f, dx, dy, proportional=false) {
  const maxW = WIDTH-f.x, maxH = Math.min(760,HEIGHT-f.y);
  if (!proportional) return {w:clamp(f.w+dx,64,maxW), h:clamp(f.h+dy,40,maxH)};
  const factor = Math.abs(dx/f.w) > Math.abs(dy/f.h) ? 1+dx/f.w : 1+dy/f.h;
  const scale = clamp(factor, Math.max(64/f.w,40/f.h), Math.min(maxW/f.w,maxH/f.h));
  return {w:Math.round(f.w*scale), h:Math.round(f.h*scale)};
}
export function frameGeometry(frame,measure){
  let w=clamp(frame.w,64,WIDTH),caption=captionLines(frame.caption||"",w,measure);
  while(caption.length>39 && w<WIDTH){w=Math.min(WIDTH,w+32);caption=captionLines(frame.caption,w,measure);}
  const cap=caption.length?caption.length*18+8:0,h=clamp(frame.h,40,Math.min(760,HEIGHT-cap));
  return {...frame,w,h,x:clamp(frame.x,0,WIDTH-w),y:clamp(frame.y,0,HEIGHT-h-cap),captionLines:caption,totalH:h+cap};
}
// Subtract every intersecting media rectangle. A frame crossing a gutter cuts a
// different interval from each neighboring column, at each affected text line.
export function openIntervals(left,right,y,line,frames){
  const cuts=frames.filter(f=>y<f.y+f.totalH+10 && y+line>f.y-9 && left<f.x+f.w+12 && right>f.x-12)
    .map(f=>[Math.max(left,f.x-12),Math.min(right,f.x+f.w+12)]).sort((a,b)=>a[0]-b[0]);
  const result=[];let cursor=left;
  for(const [a,b] of cuts){if(a-cursor>=48)result.push([cursor,a]);cursor=Math.max(cursor,b);}
  if(right-cursor>=48)result.push([cursor,right]);return result;
}
const endOf=(c,p)=>c.p>=p.length;
function consume(paras,start,height,cols,frames,measure,record){
  const cursor={...start}, lines=[],colW=(WIDTH-(cols-1)*GUTTER)/cols;let bottom=0;
  for(let col=0;col<cols&&!endOf(cursor,paras);col++){
    const left=col*(colW+GUTTER);let y=0;
    while(!endOf(cursor,paras)){
      const index=cursor.p,para=paras[index],fmt=format[para.kind]||format.p;
      if(y+fmt.line>height)break;
      if(!para.words.length){cursor.p++;cursor.word=cursor.offset=0;y+=fmt.line;bottom=Math.max(y,bottom);continue;}
      let finished=false;
      for(const [x,right] of openIntervals(left,left+colW,y,fmt.line,frames)){
        const room=right-x,pieces=[];let used=0,gaps=0,any=false;
        const firstWord=cursor.word;
        while(cursor.word<para.words.length){
          const w=para.words[cursor.word],full=cursor.offset?wordPart(w,cursor.offset,w.text.length,para.kind,measure):w;
          const space=any?measure(" ",fontFor(para.kind,{})):0;
          if(any && used+space+full.width>room+.01)break;
          if(!any && full.width>room+.01){
            const length=splitLength(w,cursor.offset,room,para.kind,measure),part=wordPart(w,cursor.offset,cursor.offset+length,para.kind,measure);
            if(record)for(const r of part.pieces)appendRun(pieces,r.text,r);
            cursor.offset+=length;if(cursor.offset>=w.text.length){cursor.word++;cursor.offset=0;}
            used+=part.width;any=true;break;
          }
          if(any){if(record)appendRun(pieces," ",{});gaps++;used+=space;}
          if(record)for(const r of full.pieces)appendRun(pieces,r.text,r);
          used+=full.width;any=true;cursor.word++;cursor.offset=0;
        }
        if(!any)continue;
        finished=cursor.word>=para.words.length;
        if(record)lines.push({x,y,room,used,gaps,finished,kind:para.kind,pieces,paragraph:index,firstWord,line:fmt.line});
        bottom=Math.max(bottom,y+fmt.line);
        if(finished){cursor.p++;cursor.word=cursor.offset=0;break;}
      }
      y+=fmt.line+(finished?fmt.after:0);
    }
  }
  return {cursor,lines,bottom};
}
export function paginate(doc,paras,measure){
  const cols=clamp(doc.columns||1,1,4),framesByPage=new Map();
  let required=Math.max(1,doc.pages||1);
  for(const f of doc.frames){required=Math.max(required,f.page+1);if(!framesByPage.has(f.page))framesByPage.set(f.page,[]);framesByPage.get(f.page).push(frameGeometry(f,measure));}
  const pages=[];let cursor={p:0,word:0,offset:0};
  while(pages.length<required||!endOf(cursor,paras)){
    const page=pages.length,frames=framesByPage.get(page)||[],mediaEnd=Math.max(0,...frames.map(f=>f.y+f.totalH));
    let height=HEIGHT;
    const initial=consume(paras,cursor,height,cols,frames,measure,false);
    if(page+1>=required && endOf(initial.cursor,paras)){
      let lo=Math.max(45,Math.ceil(mediaEnd)),hi=HEIGHT;
      while(lo<hi){const mid=Math.floor((lo+hi)/2);if(endOf(consume(paras,cursor,mid,cols,frames,measure,false).cursor,paras))hi=mid;else lo=mid+1;}
      height=lo;
    }
    const result=consume(paras,cursor,height,cols,frames,measure,true);
    pages.push({frames,lines:result.lines,height:page+1<required||!endOf(result.cursor,paras)?HEIGHT:Math.max(45,Math.ceil(mediaEnd),Math.ceil(result.bottom)),columns:cols});
    cursor=result.cursor;
  }
  return pages;
}
export function anchorParagraph(frame,page){
  const rows=page.lines;if(!rows.length)return null;
  const centerX=frame.x+frame.w/2,centerY=frame.y+frame.h/2;
  let result=rows[0],best=Infinity;
  for(const row of rows){
    const dx=Math.max(row.x-centerX,0,centerX-row.x-row.room);
    const score=Math.abs(row.y-centerY)+.55*dx;
    if(score<best){best=score;result=row;}
  }
  return result.paragraph;
}
