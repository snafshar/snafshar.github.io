import {mkdir,readFile,writeFile,rm} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {canonicalURL,escapeHTML,mediaOrigin,siteOrigin} from "../press/seo.mjs";

function publicLink(value,attribute){
  if(!value||value.startsWith('#')||/^(data:|blob:|mailto:|tel:)/.test(value))return value;
  const url=new URL(value,mediaOrigin);
  if(url.origin!==mediaOrigin&&url.origin!==siteOrigin)return value;
  if(url.pathname.startsWith('/media/')||url.pathname.startsWith('/press/demo/'))return mediaOrigin+url.pathname+url.search+url.hash;
  if(url.pathname.startsWith('/press/')||url.pathname.startsWith('/admin/')||url.pathname==='/favicon.svg')return url.pathname+url.search;
  if(attribute==='src')return value;
  const clean=new URL(canonicalURL(url));clean.search=url.search;clean.hash=url.hash;return clean.href;
}
export async function prerender(directory,transport=fetch){
  const bootstrap=await readFile(path.join(directory,'index.html'),'utf8');
  const bootScript=/<script type="module" src="[^"]+"><\/script>/.exec(bootstrap)?.[0];
  const csp=/<meta http-equiv="Content-Security-Policy"[^>]+>/.exec(bootstrap)?.[0];
  if(!bootScript||!csp)throw new Error('Missing public bootstrap assets.');
  const headers={Origin:siteOrigin,'User-Agent':'Mozilla/5.0 (compatible; MyPhotoStoriesPublisher/1.0)'};
  async function load(url){const response=await transport(url,{headers,redirect:'error',signal:AbortSignal.timeout(30000)});if(!response.ok)throw new Error('Public export failed: '+response.status);return response.json();}
  const catalog=await load(mediaOrigin+'/github/catalog');
  if(!Array.isArray(catalog.routes)||catalog.routes.length>1000)throw new Error('Invalid public route catalog.');
  const paths=[],outputs=[];
  for(const route of catalog.routes){
    if(!/^\/(?:archive|about|news|contact|privacy|(?:story|news)\/[a-z0-9-]{1,90})?$/.test(route))throw new Error('Refusing a non-public export route.');
    const value=await load(mediaOrigin+'/github/relay?path='+encodeURIComponent(route));
    if(typeof value.html!=='string'||!value.html.includes('<html'))throw new Error('Missing public article HTML.');
    let html=value.html.replace(/<script type="module" src="[^"]*"><\/script>/g,'');
    if(route==='/contact')html=html.replace(/<form\b[\s\S]*?<\/form>/g,'<p>Enable JavaScript to use the contact form.</p>');
    html=html.replace(/\b(href|src)="([^"]*)"/g,(_all,attribute,value)=>`${attribute}="${publicLink(value.replace(/&amp;/g,'&'),attribute).replace(/&/g,'&amp;')}"`);
    html=html.replace(/srcset="([^"]*)"/g,(_all,value)=>'srcset="'+value.split(',').map(part=>{const [url,...size]=part.trim().split(/\s+/);return [publicLink(url,'src'),...size].join(' ');}).join(', ')+'"');
    html=html.replace('</head>',`${csp}<meta name="referrer" content="strict-origin-when-cross-origin"><link rel="stylesheet" href="/pages.css">${bootScript}</head>`);
    html=html.replace(/(<body[^>]*>)/,'$1<div id="pages-root">').replace('</body>','</div></body>');
    const file=path.join(directory,route==='/'?'index.html':route.slice(1)+'/index.html');
    outputs.push({file,html});paths.push({path:route,url:canonicalURL(route)});
  }
  for(const owned of ['archive','about','news','contact','privacy','story'])await rm(path.join(directory,owned),{recursive:true,force:true});
  for(const output of outputs){await mkdir(path.dirname(output.file),{recursive:true});await writeFile(output.file,output.html);}
  await writeFile(path.join(directory,'sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+paths.map(p=>'<url><loc>'+escapeHTML(p.url)+'</loc></url>').join('')+'</urlset>\n');
  await writeFile(path.join(directory,'robots.txt'),'User-agent: *\nAllow: /\nDisallow: /cntrladmin/\nDisallow: /admin/\nSitemap: '+siteOrigin+'/sitemap.xml\n');
  await writeFile(path.join(directory,'.nojekyll'),'');
  return paths;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify({pages:(await prerender(path.resolve(process.argv[2]||'outputs/github-pages'))).length}));
