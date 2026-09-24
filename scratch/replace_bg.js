const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('c:/Users/gamin/Downloads/baitaplon/frontend/src', function(filePath) {
  if (filePath.endsWith('.jsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Replace background inline styles
    content = content.replace(/background:\s*['"]#fff['"]/g, "background: 'var(--bg-card)'");
    content = content.replace(/background:\s*['"]#ffffff['"]/g, "background: 'var(--bg-card)'");
    content = content.replace(/backgroundColor:\s*['"]#fff['"]/g, "backgroundColor: 'var(--bg-card)'");
    content = content.replace(/backgroundColor:\s*['"]#ffffff['"]/g, "backgroundColor: 'var(--bg-card)'");
    content = content.replace(/background:\s*['"]#f8fafc['"]/g, "background: 'var(--bg)'");

    // Replace css in <style>
    content = content.replace(/background:\s*#fff\b/g, "background: var(--bg-card)");
    content = content.replace(/background:\s*#ffffff\b/g, "background: var(--bg-card)");
    content = content.replace(/background-color:\s*#fff\b/g, "background-color: var(--bg-card)");
    content = content.replace(/background-color:\s*#ffffff\b/g, "background-color: var(--bg-card)");
    content = content.replace(/background:\s*#f8fafc\b/g, "background: var(--bg)");

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Updated:', filePath);
    }
  }
});
