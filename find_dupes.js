const { LIBRARY } = require('./app/lib/djCaresLibrary');

const vids = LIBRARY.filter(i => i.videoId).map(i => i.videoId);
const seen = new Map();

vids.forEach(vid => {
  if (seen.has(vid)) {
    seen.get(vid).push(vid);
  } else {
    seen.set(vid, [vid]);
  }
});

console.log("Duplicates:");
const dupes = Array.from(seen.entries()).filter(([, arr]) => arr.length > 1);
dupes.forEach(([vid, arr]) => {
  const items = LIBRARY.filter(i => i.videoId === vid);
  console.log(`\nVideo ID: ${vid} (${arr.length} times)`);
  items.forEach(i => console.log(`  - ${i.id}: ${i.title} (${i.author})`));
});

console.log(`\n\nTotal duplicates: ${dupes.length}`);
