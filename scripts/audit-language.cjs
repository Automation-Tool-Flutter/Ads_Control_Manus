const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function scan(root = 'src') {
  const found = new Map();
  function walk(dir) {
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, item.name);
      if (item.isDirectory()) { if (file !== path.join('src','app','api')) walk(file); continue; }
      if (!/\.tsx?$/.test(file)) continue;
      const content = fs.readFileSync(file, 'utf8');
      const source = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true);
      function visit(node) {
        if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node) || ts.isJsxText(node)) {
          const value = node.text.trim();
          if (/[À-ÖØ-öø-ɏ\u1ea0-\u1ef9]/.test(value)) {
            if (!found.has(value)) found.set(value, []);
            found.get(value).push(file);
          }
        }
        ts.forEachChild(node, visit);
      }
      visit(source);
    }
  }
  walk(root);
  return Array.from(found, ([text, files]) => ({text, files: [...new Set(files)]}));
}
module.exports = { scan };
if (require.main === module) console.log(JSON.stringify(scan(), null, 2));
