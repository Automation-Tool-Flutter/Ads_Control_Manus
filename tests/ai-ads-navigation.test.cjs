const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const {renderToStaticMarkup} = require('react-dom/server');
function navigation(pathname) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync('src/components/layout/WorkbenchNavigation.tsx','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText;
  vm.runInNewContext(source,{exports,require:name=> {
    if(name==='react/jsx-runtime') return require(name);
    if(name==='next/link') return {default: ({children, ...props})=>React.createElement('a',props,children)};
    if(name==='next/navigation') return {usePathname:()=>pathname};
    if(name==='./AdsIcon') return {AdsIcon:()=>null};
    throw new Error(name);
  }});
  return {html:renderToStaticMarkup(React.createElement(exports.WorkbenchNavigation,{accountBase:'/accounts/act_1',query:'?currency=VND&accountName=Sample'})),sections:exports.WORKBENCH_SECTIONS};
}
test('AI Ads navigation retains all twelve account tools and account context',()=>{
  const {html,sections}=navigation('/accounts/act_1');
  assert.equal(sections.flatMap(section=>section.items).length,12);
  assert.equal((html.match(/<a /g)||[]).length,12);
  assert.equal((html.match(/currency=VND/g)||[]).length,12);
  assert.equal((html.match(/<details open/g)||[]).length,4);
  assert.equal((html.match(/aria-current="page"/g)||[]).length,1);
});
test('nested campaigns highlight only their campaign manager parent',()=>{
  const {html}=navigation('/accounts/act_1/campaigns/c1/adsets/s1');
  assert.equal((html.match(/aria-current="page"/g)||[]).length,1);
  assert.match(html,/aria-current="page" href="\/accounts\/act_1\/campaigns\?/);
});
test('AI builder has a distinct active navigation item',()=>{
  const {html}=navigation('/accounts/act_1/campaign-builder');
  assert.equal((html.match(/aria-current="page"/g)||[]).length,1);
  assert.match(html,/aria-current="page" href="\/accounts\/act_1\/campaign-builder\?/);
});
