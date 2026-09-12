const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const {renderToStaticMarkup} = require('react-dom/server');
function render(pathname, signedIn = true) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync('src/components/layout/BottomNav.tsx','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText;
  const dependency = name => {
    if(name==='react/jsx-runtime' || name==='react') return require(name);
    if(name==='next/link') return {default: ({children,...props})=>React.createElement('a',props,children)};
    if(name==='next/navigation') return {usePathname:()=>pathname,useRouter:()=>({push(){}})};
    if(name==='@/contexts/AuthContext') return {useAuth:()=>({state:{user:signedIn ? {id:'u1'} : null, token:'test'}})};
    if(name==='@/hooks/useAccountDetail') return {useAccountDetail:()=>({state:{status:'success',data:{id:'act_1',name:'Test',currency:'VND'}}})};
    if(name==='./MobileNavBar') {
      const navExports = {};
      const compiled = ts.transpileModule(fs.readFileSync('src/components/layout/MobileNavBar.tsx','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText;
      vm.runInNewContext(compiled, {exports:navExports,require:dependency});
      return navExports;
    }
    if(name==='@/components/ui/BrandLogo') return {BrandLogo:()=>React.createElement('img',{src:'/meta-ads-ai.png',alt:''})};
    if(name==='./AdsIcon') return {AdsIcon:()=>null};
    throw new Error(name);
  };
  vm.runInNewContext(source,{exports,require:dependency});
  return renderToStaticMarkup(React.createElement(exports.BottomNav));
}
test('mobile navigation has five primary destinations with a dedicated AI button',()=>{
  const html=render('/accounts/act_1');
  assert.equal((html.match(/<a /g)||[]).length,3);
  assert.equal((html.match(/<button /g)||[]).length,2);
  assert.match(html,/Open Meta AI/);
  assert.match(html,/src="\/meta-ads-ai.png"/);
  assert.match(html,/>Meta AI<\/span>/);
  assert.match(html,/Open all tools/);
});
test('mobile campaign navigation preserves account and currency',()=>{
  const html=render('/accounts/act_1/campaigns/c1');
  assert.match(html,/href="\/accounts\/act_1\/campaigns\?accountName=Test&amp;currency=VND" aria-current="page"/);
  assert.equal((html.match(/aria-current="page"/g)||[]).length,1);
});
test('signed-out pages do not show app navigation',()=>assert.equal(render('/login',false),''));

test('global navigation does not duplicate the Home destination',()=>{
  const html=render('/accounts');
  assert.match(html,/href="\/businesses"/);
  assert.match(html,/>Assets<\/span>/);
  assert.equal((html.match(/href="\/accounts"/g)||[]).length,1);
});

test('back is hidden on primary roots regardless of saved browser history', () => {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync('src/hooks/useAppBack.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(source, { exports, require: name => name === 'react' ? React : {} });
  const { shouldShowAppBack } = exports;
  for (const path of ['/', '/accounts', '/accounts/', '/businesses', '/pages', '/login']) {
    assert.equal(shouldShowAppBack(path, true, '/accounts'), false, path);
    assert.equal(shouldShowAppBack(path, false, null), false, path);
  }
  assert.equal(shouldShowAppBack('/accounts/act_1', true, '/accounts'), true);
  assert.equal(shouldShowAppBack('/accounts/act_1/campaigns/10', false, '/accounts/act_1/campaigns'), true);
  assert.equal(shouldShowAppBack('/pages/42', true, '/pages'), true);
  assert.equal(shouldShowAppBack('/contact', false, null), false);
  const header = fs.readFileSync('src/components/layout/Header.tsx', 'utf8');
  assert.ok(header.includes('d="m15 5-7 7 7 7"'));
  assert.ok(header.includes("goBack(backHref || '/accounts')"));
});
