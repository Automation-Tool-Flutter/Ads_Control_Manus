const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const {renderToStaticMarkup} = require('react-dom/server');
function load(file, dependencies) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText;
  vm.runInNewContext(source,{exports,require:name=>{
    if(dependencies[name]) return dependencies[name];
    if(name==='react/jsx-runtime') return require(name);
    throw new Error(name);
  }});
  return exports;
}
function render({search='',editing=false,base='/accounts/act_1',pathname='/accounts/act_1/optimize'}={}) {
  let stateIndex=0;
  const dependencies = {
    'react': {...React,useState:initial=>{const index=stateIndex++; return [index === 0 ? search : index === 2 ? editing : initial,()=>{}];}},
    'next/link':{default:({children,...props})=>React.createElement('a',props,children)},
    './AdsIcon':{AdsIcon:()=>null},
    '@/components/ui/BrandLogo':{BrandLogo:()=>React.createElement('img',{src:'/meta-ads-ai.png',alt:''})},
    '@/components/ui/UserAvatar':{UserAvatar:()=>null},
    'next/navigation':{usePathname:()=>pathname,useRouter:()=>({push(){}})},
  };
  dependencies['./WorkbenchNavigation']=load('src/components/layout/WorkbenchNavigation.tsx',dependencies);
  dependencies['./MobileNavBar']=load('src/components/layout/MobileNavBar.tsx',dependencies);
  const {MobileToolMenu}=load('src/components/layout/MobileToolMenu.tsx',dependencies);
  return renderToStaticMarkup(React.createElement(MobileToolMenu,{accountBase:base,query:'?accountName=Demo&currency=VND',accountName:'Demo account',pathname,name:'Demo User',userId:'demo',onClose(){},onLogout(){}}));
}
test('menu has four compact shortcuts and three visible tool groups',()=>{
  const html=render();
  assert.equal((html.match(/class="mobile-menu-shortcut"/g)||[]).length,4);
  assert.equal((html.match(/class="mobile-menu-group"/g)||[]).length,3);
  assert.match(html,/Analyze &amp; optimize/); assert.match(html,/Create &amp; manage/);
  assert.doesNotMatch(html,/mobile-tools-filters|mobile-menu-ai/);
  assert.match(html,/Menu primary navigation/);
  assert.match(html,/Close all tools/);
});

test('grouped menu preserves all sixteen tools and the current account query',()=>{
  const html=render();
  assert.equal((html.match(/class="mobile-menu-row"/g)||[]).length,16);
  assert.match(html,/aria-current="page"/);
  assert.match(html,/currency=VND/);
});

test('search finds full tool names without a category filter',()=>{
  const html=render({search:'performance intelligence'});
  assert.equal((html.match(/class="mobile-menu-row"/g)||[]).length,1);
  assert.match(html,/Performance/);
  assert.doesNotMatch(html,/class="mobile-menu-shortcut"/);
});

test('unmatched search has a clear recovery action',()=>{
  const html=render({search:'zzzzmissing'});
  assert.match(html,/No matching tools/); assert.match(html,/Clear search/);
});

test('workspace menu explains account selection without showing unusable shortcuts',()=>{
  const html=render({base:'',pathname:'/pages'});
  assert.equal((html.match(/Select account first/g)||[]).length,12);
  assert.doesNotMatch(html,/class="mobile-menu-shortcut"/);
  assert.equal(html.includes('/accounts/undefined'), false);
});

test('shortcut editing has explicit cancel and save instead of navigation controls',()=>{
  const html=render({editing:true});
  assert.equal((html.match(/class="mobile-menu-row mobile-menu-pin"/g)||[]).length,16);
  assert.match(html,/Cancel shortcut changes/);
  assert.match(html,/>Cancel<\/button>/);
  assert.match(html,/Save shortcuts \(4\)/);
  assert.doesNotMatch(html,/Menu primary navigation/);
});
