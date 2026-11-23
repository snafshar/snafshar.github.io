export const backend = "https://silvergrain-journal.afsharsn.chatgpt.site";
export const pagesOrigin = "https://snafshar.github.io";
export const publicBase = "/";
export const adminBase = "/cntrladmin/";
export function isAdmin(path) {return path === "/cntrladmin" || path.startsWith("/cntrladmin/");}
export function sourceURL(href) {
  const page = new URL(href), route = page.searchParams.get("route");
  const path = route || (isAdmin(page.pathname)?"/cntrladmin":page.pathname.replace(/\/$/,"")||"/");
  if(!path.startsWith("/") || path.startsWith("//") || path.includes("?") || path.includes("#")) throw new Error("Invalid page address.");
  const source = new URL(path,backend);
  if(source.origin!==backend) throw new Error("Invalid page address.");
  for(const [key,value] of page.searchParams) if(key!=="route") source.searchParams.append(key,value);
  source.hash=page.hash;
  return source;
}
export function routeURL(value, current=pagesOrigin+publicBase) {
  if(value.startsWith("#")) return value;
  const url = new URL(value,current);
  if(!["http:","https:"].includes(url.protocol) || (url.origin!==backend && url.origin!==pagesOrigin)) return url.href;
  if(url.origin===pagesOrigin && [publicBase,adminBase].includes(url.pathname)) return url.href;
  if(!isAdmin(url.pathname)) {
    const page=new URL(url.pathname.replace(/\/$/,"")+"/",pagesOrigin);page.search=url.search;page.hash=url.hash;return page.href;
  }
  const page = new URL(isAdmin(url.pathname)?adminBase:publicBase,pagesOrigin);
  if(url.pathname!=="/" && url.pathname!=="/cntrladmin" && url.pathname!=="/cntrladmin/") page.searchParams.set("route",url.pathname);
  for(const [key,value] of url.searchParams) if(key!=="route") page.searchParams.append(key,value);
  page.hash=url.hash;
  return page.href;
}
export function assetURL(value, media={}) {
  if(!value || /^(blob:|data:)/.test(value)) return value;
  const url = new URL(value,backend);
  if(url.origin!==backend) return url.href;
  if(media[url.pathname]) return media[url.pathname];
  if(url.pathname.startsWith("/media/")) return url.href;
  if(url.pathname.startsWith("/press/demo/")) return url.href;
  if(url.pathname.startsWith("/press/")) return pagesOrigin+publicBase+url.pathname.slice(1)+url.search;
  if(url.pathname==="/favicon.svg") return pagesOrigin+publicBase+"favicon.svg";
  const scripts={"/cntrladmin/studio.mjs":"studio.mjs","/cntrladmin/settings.mjs":"settings.mjs","/cntrladmin/statistics.mjs":"statistics.mjs"};
  if(scripts[url.pathname]) return pagesOrigin+publicBase+"admin/"+scripts[url.pathname];
  return url.href;
}
