export const siteOrigin="https://snafshar.github.io";
export const mediaOrigin="https://silvergrain-journal.afsharsn.chatgpt.site";
export const escapeHTML=value=>String(value??"").replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const decode=value=>value.replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
export function canonicalURL(value){
  const source=new URL(value,siteOrigin),route=source.searchParams.get("route");
  const path=(route||source.pathname).replace(/\/$/,"")||"/";
  const result=new URL(path==="/"?"/":path+"/",siteOrigin);
  const page=source.searchParams.get("page");if(page&&/^[1-9]\d*$/.test(page)&&Number(page)>1)result.searchParams.set("page",page);
  return result.href;
}
export function seoHTML(markup,url,site){
  const source=new URL(url,siteOrigin),path=source.pathname.replace(/\/$/,"")||"/";
  if(path.startsWith("/cntrladmin"))return markup;
  const title=decode(/<title>([\s\S]*?)<\/title>/.exec(markup)?.[1]||site.name);
  let description=decode(/<meta name="description" content="([^"]*)"/.exec(markup)?.[1]||site.description);
  if(path==="/archive")description=`Photography articles and visual stories from ${site.name}, by ${site.author}.`;
  if(path==="/about")description=`About ${site.author}, the photographer and editor behind ${site.name}.`;
  if(path==="/contact")description=`Contact ${site.author} through ${site.name}.`;
  if(path==="/news")description=`News and announcements from ${site.name}.`;
  const canonical=canonicalURL(source),match=/<script type="application\/json" id="article-data">([\s\S]*?)<\/script>/.exec(markup);
  let article=null,assets=[];if(match){try{const data=JSON.parse(match[1]);article=data.doc;assets=data.assets||[];}catch{}}
  const cover=article?assets.find(asset=>asset.id===article.cover):null;
  const firstImage=/<img[^>]+src="([^"]+)"/.exec(markup)?.[1];
  const image=cover?.url||firstImage;const imageURL=image?new URL(decode(image),mediaOrigin).href:null;
  const author={"@type":"Person",name:site.author,url:siteOrigin+"/about/"};
  const structured=article?{"@context":"https://schema.org","@type":"BlogPosting",headline:article.title,description:article.deck,datePublished:article.date,author,publisher:{"@type":"Organization",name:site.name,url:siteOrigin+"/"},mainEntityOfPage:canonical,inLanguage:"en",...(imageURL?{image:[imageURL]}:{})}:{"@context":"https://schema.org","@type":path==="/about"?"AboutPage":path==="/contact"?"ContactPage":"WebPage",name:title,description,url:canonical,isPartOf:{"@type":"WebSite",name:site.name,url:siteOrigin+"/"}};
  const tags=`<link rel="canonical" href="${escapeHTML(canonical)}"><meta property="og:type" content="${article?"article":"website"}"><meta property="og:site_name" content="${escapeHTML(site.name)}"><meta property="og:title" content="${escapeHTML(title)}"><meta property="og:description" content="${escapeHTML(description)}"><meta property="og:url" content="${escapeHTML(canonical)}"><meta property="og:locale" content="en_US"><meta name="twitter:card" content="${imageURL?"summary_large_image":"summary"}">${imageURL?`<meta property="og:image" content="${escapeHTML(imageURL)}"><meta property="og:image:alt" content="${escapeHTML(article?.coverAlt||site.name)}">`:""}${article?`<meta property="article:published_time" content="${escapeHTML(article.date)}">`:""}<script type="application/ld+json">${JSON.stringify(structured).replace(/</g,"\\u003c")}</script>${source.searchParams.has("q")||source.searchParams.has("category")?'<meta name="robots" content="noindex,follow">':""}`;
  return markup.replace(/<meta name="description" content="[^"]*">/,`<meta name="description" content="${escapeHTML(description)}">`).replace('</head>',tags+'</head>');
}
