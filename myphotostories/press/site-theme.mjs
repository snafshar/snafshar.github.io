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

export const defaultSettings = {
  revision:0,
  ...Object.fromEntries(settingsGroups.flatMap(group=>group.fields.map(field=>[field.name,field.value]))),
};

const nameFonts={instrument:'"Instrument Serif",Georgia,serif',georgia:'Georgia,"Times New Roman",serif',sans:'Inter,Arial,sans-serif'};

// All values reaching this renderer are validated on the server.
export function themeCSS(site){
  const photoSide=site.photoLayout==="left"?1:2;
  const placement=site.photoLayout==="alternate"?"":`
    .public-body .magazine-spread:not(.text-only){grid-template-columns:${photoSide===1?"minmax(0,1.65fr) minmax(0,1fr)":"minmax(0,1fr) minmax(0,1.65fr)"}}
    .public-body .magazine-spread .magazine-photograph{grid-column:${photoSide};grid-row:1}
    .public-body .magazine-spread .magazine-text{grid-column:${photoSide===1?2:1};grid-row:1}
    @media(max-width:760px){.public-body .magazine-spread:not(.text-only){grid-template-columns:1fr}.public-body .magazine-spread .magazine-photograph,.public-body .magazine-spread .magazine-text{grid-column:auto;grid-row:auto}}
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
    @media print{.public-body{--paper:#fff;--ink:#000;background:#fff}.public-body .wrap{width:100%}}
  `;
}
