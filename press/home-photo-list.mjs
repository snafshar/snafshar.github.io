export const maxHomePhotos=20;

// Second photographs for the four published guides, from the journal's public collection.
const guidePairs=new Map([
  ["patience-and-the-street-frame",["street","arcade"]],
  ["black-and-white-is-about-tones",["arcade","dolomites"]],
  ["reflections-without-perfect-symmetry",["alpine-lake","coast"]],
  ["photographing-architecture-with-clear-intent",["arcade","street"]],
]);
export function homePhotoCandidates(doc){
  if(Array.isArray(doc.homepagePhotos))return doc.homepagePhotos;
  const guide=guidePairs.get(doc.id);
  const related=guide&&guide[0]===doc.cover?guide.slice(1):[];
  return [...new Set([doc.cover,...doc.frames.map(f=>f.asset),...related].filter(Boolean))];
}
export function homePhotoIds(doc,assets){
  if(!Array.isArray(doc.homepagePhotos)&&assets.get(doc.cover)?.kind==="video")return [];
  return homePhotoCandidates(doc).filter(id=>assets.get(id)?.kind==="image").slice(0,maxHomePhotos);
}
