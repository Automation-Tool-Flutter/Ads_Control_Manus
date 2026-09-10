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
function render({search='',filter='Quick access',base='/accounts/act_1',pathname='/accounts/act_1/optimize'}={}) {
  let stateIndex=0;
  const dependencies = {
    'react': {...React,useState:initial=>{const index=stateIndex++; return [index === 0 ? search : index === 1 ? filter : initial,()=>{}];}},
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
test('quick access shows six compact task tiles instead of the full sidebar',()=>{
  const html=render();
  assert.equal((html.match(/class="mobile-tool-tile"/g)||[]).length,6);
  assert.match(html,/Budgets/); assert.match(html,/Create campaign/);
  assert.doesNotMatch(html,/<details/);
  assert.match(html,/Menu primary navigation/);
  assert.match(html,/Close all tools/);
  assert.match(html,/Customize/);
});
test('all tools preserves twelve account tools and four workspace tools',()=>{
  const html=render({filter:'All tools'});
  assert.equal((html.match(/class="mobile-tool-tile"/g)||[]).length,16);
  assert.equal((html.match(/aria-current="page"/g)||[]).length,1);
  assert.match(html,/currency=VND/);
});
test('search finds tools outside the selected category using full names',()=>{
  const html=render({filter:'Workspace',search:'performance intelligence'});
  assert.equal((html.match(/class="mobile-tool-tile"/g)||[]).length,1);
  assert.match(html,/Performance/);
});
test('unmatched search has a clear recovery action',()=>{
  const html=render({search:'zzzzmissing'});
  assert.match(html,/No matching tools/); assert.match(html,/Show all tools/);
});
test('account tools without an account lead to selection with an explicit label',()=>{
  const html=render({base:'',filter:'Build',pathname:'/pages'});
  assert.equal((html.match(/Select account/g)||[]).length,4);
  assert.doesNotMatch(html,/\/accounts\/undefined/);
});
