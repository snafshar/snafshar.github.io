export const settingsGroups = [
  {title:"Identity",fields:[
    {name:"name",label:"Blog name",type:"text",value:"MyPhotoStories",maxLength:80,required:true},
    {name:"tagline",label:"Tagline",type:"text",value:"Photography by Sina Afshar",maxLength:200},
    {name:"author",label:"Author name",type:"text",value:"Sina Afshar",maxLength:100},
    {name:"location",label:"Location",type:"text",value:"Pisa, Italy",maxLength:100},
    {name:"description",label:"Search description",type:"textarea",value:"A personal journal of photographs and stories by Sina Afshar.",maxLength:300},
    {name:"footerText",label:"Copyright credit",type:"text",value:"Sina Afshar",maxLength:160},
  ]},
  {title:"Colours",fields:[
    {name:"background",label:"Background colour",type:"color",value:"#f3eddf"},
    {name:"nameColor",label:"Blog name colour",type:"color",value:"#181818"},
    {name:"textColor",label:"Text colour",type:"color",value:"#181818"},
    {name:"mutedColor",label:"Secondary text colour",type:"color",value:"#5c5c5c"},
    {name:"linkColor",label:"Link colour",type:"color",value:"#181818"},
    {name:"dividerColor",label:"Separator colour",type:"color",value:"#d9d3c7"},
  ]},
  {title:"Typography",fields:[
    {name:"nameFont",label:"Blog name font",type:"select",value:"instrument",options:[["instrument","Instrument Serif"],["georgia","Georgia"],["sans","Inter"]]},
    {name:"nameSize",label:"Blog name size (px)",type:"number",value:70,min:32,max:110},
    {name:"excerptSize",label:"Story preview text size (px)",type:"number",value:17,min:14,max:24},
  ]},
  {title:"Layout and photos",fields:[
    {name:"contentWidth",label:"Page width (px)",type:"number",value:1160,min:900,max:1440},
    {name:"postSpacing",label:"Space between photo rows (px)",type:"number",value:76,min:38,max:140},
    {name:"postsPerPage",label:"Posts per page",type:"number",value:10,min:1,max:30},
    {name:"photoLayout",label:"Photo placement",type:"select",value:"alternate",options:[["alternate","Alternate sides"],["left","Always on the left"],["right","Always on the right"]]},
    {name:"photoStyle",label:"Photo appearance",type:"select",value:"monochrome",options:[["monochrome","Black and white"],["original","Original colours"]]},
  ]},
  {title:"Visible details",fields:[
    {name:"showCaptions",label:"Show photo captions",type:"checkbox",value:true},
    {name:"showLocations",label:"Show photo locations",type:"checkbox",value:true},
    {name:"showDates",label:"Show publication dates",type:"checkbox",value:true},
    {name:"showAuthor",label:"Show the author on articles",type:"checkbox",value:true},
    {name:"showSeparators",label:"Show separators between photo rows",type:"checkbox",value:true},
  ]},
  {title:"Navigation and contact",fields:[
    {name:"menuAbout",label:"Show About me in the menu",type:"checkbox",value:true},
    {name:"menuNews",label:"Show News in the menu",type:"checkbox",value:true},
    {name:"menuContact",label:"Show Contact in the menu",type:"checkbox",value:true},
    {name:"contactForm",label:"Accept messages through the contact form",type:"checkbox",value:true},
  ]},
];

// Appearance profiles are stored independently. Existing desktop fields keep their names.
const paging=settingsGroups.find(g=>g.title==="Layout and photos").fields;
const pageField=paging.splice(paging.findIndex(f=>f.name==="postsPerPage"),1)[0];
settingsGroups.push({title:"Publishing",fields:[pageField]});
const extraAppearance = [
  {name:"headlineSize",label:"Post headline size (px; 0 = automatic)",type:"number",value:0,min:0,max:90},
  {name:"rowGap",label:"Photo / text gap (px; 0 = automatic)",type:"number",value:0,min:0,max:150},
  {name:"navSize",label:"Navigation text size (px; 0 = automatic)",type:"number",value:0,min:0,max:30},
  {name:"photoRadius",label:"Photo corner radius (px)",type:"number",value:0,min:0,max:80},
  {name:"articleWidth",label:"Article width (px; 0 = original)",type:"number",value:0,min:0,max:1440},
  {name:"excerptLineHeight",label:"Preview line height (%; 0 = automatic)",type:"number",value:0,min:0,max:240},
];
settingsGroups.splice(4,0,{title:"More appearance controls",fields:extraAppearance});
const appearanceTitles=new Set(["Colours","Typography","Layout and photos","More appearance controls"]);
const appearanceGroups=settingsGroups.filter(g=>appearanceTitles.has(g.title));
for(const group of appearanceGroups)group.scope="desktop";
settingsGroups.push(...appearanceGroups.map(group=>({title:group.title,scope:"mobile",fields:group.fields.filter(f=>f.name!=="postsPerPage").map(f=>({...f,name:"mobile"+f.name[0].toUpperCase()+f.name.slice(1)}))})));
settingsGroups.push({title:"Mobile scaling",scope:"mobile",fields:[
  {name:"mobileCanvasWidth",label:"Desktop canvas width on phones (px)",type:"number",value:1160,min:980,max:1600},
]});
settingsGroups.push({title:"Recommendations",fields:[
  {name:"recommendationsDesktop",label:"Show related posts on desktop",type:"checkbox",value:false},
  {name:"recommendationsMobile",label:"Show related posts on mobile",type:"checkbox",value:true},
  {name:"recommendationCount",label:"Number of related posts",type:"number",value:3,min:1,max:6},
]});
export const mobileAppearanceKeys=appearanceGroups.flatMap(g=>g.fields.filter(f=>f.name!=="postsPerPage").map(f=>f.name));
export function withProfileDefaults(raw={}) {
  const merged={...defaultSettings,...raw};
  for(const key of mobileAppearanceKeys){const mobile="mobile"+key[0].toUpperCase()+key.slice(1);if(!(mobile in raw))merged[mobile]=merged[key];}
  return merged;
}

export const defaultSettings = {
  revision:0,
  ...Object.fromEntries(settingsGroups.flatMap(group=>group.fields.map(field=>[field.name,field.value]))),
};

const nameFonts={instrument:'"Instrument Serif",Georgia,serif',georgia:'Georgia,"Times New Roman",serif',sans:'Inter,Arial,sans-serif'};

// All values reaching this renderer are validated on the server.
export function desktopThemeCSS(site){
  const photoSide=site.photoLayout==="left"?1:2;
  const placement=site.photoLayout==="alternate"?"":`
    .public-body .magazine-spread:not(.text-only){grid-template-columns:${photoSide===1?"minmax(0,1.65fr) minmax(0,1fr)":"minmax(0,1fr) minmax(0,1.65fr)"}}
    .public-body .magazine-spread .magazine-photograph{grid-column:${photoSide};grid-row:1}
    .public-body .magazine-spread .magazine-text{grid-column:${photoSide===1?2:1};grid-row:1}
    @media(max-width:760px){.public-body .magazine-spread:not(.text-only){grid-template-columns:${photoSide===1?"minmax(0,1.2fr) minmax(0,1fr)":"minmax(0,1fr) minmax(0,1.2fr)"}}}
  `;
  return `
    .public-body{--paper:${site.background};--ink:${site.textColor};--muted:${site.mutedColor};--line:${site.dividerColor};--accent:${site.linkColor};--photo-filter:${site.photoStyle==="original"?"none":"grayscale(1)"}}
    .public-body .wrap{max-width:${site.contentWidth}px}
    .public-body .article-page{max-width:960px}
    .public-body .brand,.public-body .site-name{color:${site.nameColor};font-family:${nameFonts[site.nameFont]||nameFonts.instrument}}
    .public-body .site-name{font-size:clamp(min(46px,${site.nameSize}px),5.5vw,${site.nameSize}px);overflow-wrap:anywhere}
    .public-body .magazine-story{font-size:${site.excerptSize}px;color:var(--ink)}
    .public-body .article-deck,.public-body .reading-flow,.public-body .about-copy,.public-body .press-line{color:var(--ink)}
    .public-body .frame-caption,.public-body .flow-figure figcaption{color:var(--muted)}
    .public-body .magazine-spread{padding-bottom:clamp(38px,6vw,${site.postSpacing}px);margin-bottom:clamp(38px,6vw,${site.postSpacing}px);${site.showSeparators?"":"border-bottom-color:transparent;"}}
    .public-body .magazine-text h2 a,.public-body .news-item a,.public-body .quiet-link,.public-body .channel,.public-body .story-pager a,.public-body .archive-link,.public-body .pager a{color:${site.linkColor}}
    .public-body .magazine-photo-link img,.public-body .magazine-photo-link video,.public-body .media-wrap img,.public-body .media-wrap video,.public-body .frame-box img,.public-body .frame-box video{filter:var(--photo-filter)}
    ${placement}
    @media(max-width:760px){.public-body .magazine-story{font-size:clamp(14px,3.65vw,${site.excerptSize}px)}}
    @media print{.public-body{--paper:#fff;--ink:#000;background:#fff}.public-body .wrap{width:100%}}
  `;
}

function extraCSS(site){
  return [
    site.headlineSize?`.public-body .magazine-text h2{font-size:${site.headlineSize}px}`:"",
    site.rowGap?`.public-body .magazine-spread{gap:${site.rowGap}px}`:"",
    site.navSize?`.public-body .site-nav a{font-size:${site.navSize}px}`:"",
    site.photoRadius?`.public-body .magazine-photo-link img,.public-body .magazine-photo-link video{border-radius:${site.photoRadius}px}`:"",
    site.articleWidth?`.public-body .article-page{max-width:${site.articleWidth}px}`:"",
    site.excerptLineHeight?`.public-body .magazine-story{line-height:${site.excerptLineHeight/100}}`:"",
  ].join("\n");
}
export function themeCSS(settings){
  const site=withProfileDefaults(settings),mobile={...site};
  for(const key of mobileAppearanceKeys)mobile[key]=site["mobile"+key[0].toUpperCase()+key.slice(1)];
  const mobileCSS=(desktopThemeCSS(mobile)+extraCSS(mobile)).replaceAll(".public-body","html[data-mobile-layout] .public-body");
  return desktopThemeCSS(site)+extraCSS(site)+mobileCSS+`
    .public-body .recommendations{${site.recommendationsDesktop?"":"display:none;"}margin-block:48px;border-top:1px solid var(--line);padding-top:24px}
    html[data-mobile-layout] .public-body .recommendations{display:${site.recommendationsMobile?"block":"none"}}
    .recommendation-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:26px;margin-top:20px}
    .recommendation-grid a{display:block;color:var(--accent)}
    .recommendation-grid h3{font-size:25px;line-height:1.2}
    .recommendation-grid p{font-size:14px;margin-top:10px;color:var(--muted)}
    @media print{.recommendations{display:none!important}}
  `;
}
