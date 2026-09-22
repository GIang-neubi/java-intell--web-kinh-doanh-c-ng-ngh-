const fs = require('fs');
const path = require('path');

function walk(dir) {
  let files = [];
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      files = files.concat(walk(full));
    } else if (full.endsWith('.jsx') || full.endsWith('.js')) {
      files.push(full);
    }
  }
  return files;
}

const files = walk('frontend/src');
console.log('Total files checked:', files.length);

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  // Simple check for useEffect where the state being set is also in dependency array
  // Pattern: const [xyz, setXyz] = useState
  const stateMatches = [...content.matchAll(/const\s+\[\s*(\w+)\s*,\s*(\w+)\s*\]\s*=\s*useState/g)];
  for (const match of stateMatches) {
    const stateVar = match[1];
    const setterVar = match[2];

    // Find useEffect that has setterVar in body and stateVar in dependency array
    const effectRegex = /useEffect\s*\(\s*\(\)\s*=>\s*\{([\s\S]*?)\}\s*,\s*\[([\s\S]*?)\]\s*\)/g;
    let effectMatch;
    while ((effectMatch = effectRegex.exec(content)) !== null) {
      const body = effectMatch[1];
      const deps = effectMatch[2];

      if (body.includes(setterVar) && deps.includes(stateVar)) {
        console.log(`[SUSPECT] ${file}: ${setterVar} called inside useEffect with ${stateVar} in deps [${deps.trim()}]`);
      }
    }
  }
}
