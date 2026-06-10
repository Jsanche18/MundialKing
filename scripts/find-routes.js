const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      results.push(fullPath);
    }
  });
  return results;
}

const apiDir = path.join(__dirname, '../src/app/api');
if (fs.existsSync(apiDir)) {
  const files = walk(apiDir);
  console.log(`Found ${files.length} TypeScript files:`);
  files.forEach(file => {
    const rel = path.relative(path.join(__dirname, '..'), file);
    console.log(`\n--- ${rel} ---`);
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (line.includes('import ') || line.includes('require(')) {
        console.log(`${idx + 1}: ${line.trim()}`);
      }
    });
  });
} else {
  console.log('API directory does not exist at ' + apiDir);
}
