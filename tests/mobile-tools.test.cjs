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
  vm.runInNewContext(source,{exports,URLSearchParams,require:name=>{
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
    './MenuAccountPicker':{MenuAccountPicker:()=>null},
    '@/lib/menu-navigation':{beginMenuNavigation(){}},
    '@/components/ui/BrandLogo':{BrandLogo:()=>React.createElement('img',{src:'/meta-ads-ai.png',alt:''})},
    '@/components/ui/UserAvatar':{UserAvatar:()=>null},
    'next/navigation':{usePathname:()=>pathname,useRouter:()=>({push(){}})},
  };
  dependencies['./WorkbenchNavigation']=load('src/components/layout/WorkbenchNavigation.tsx',dependencies);
  dependencies['./MobileNavBar']=load('src/components/layout/MobileNavBar.tsx',dependencies);
  const {MobileToolMenu}=load('src/components/layout/MobileToolMenu.tsx',dependencies);
  return renderToStaticMarkup(React.createElement(MobileToolMenu,{accountBase:base,query:'?accountName=Demo&currency=VND',accountName:'Demo account',pathname,name:'Demo User',userId:'demo',onClose(){},onLogout(){}}));
}
test('menu has four compact shortcuts and two permanently visible tool groups',()=>{
  const html=render();
  assert.equal((html.match(/class="mobile-menu-shortcut"/g)||[]).length,4);
  assert.equal((html.match(/class="mobile-menu-group"/g)||[]).length,2);
  assert.match(html,/Analyze &amp; optimize/); assert.match(html,/Create &amp; manage/);
  assert.doesNotMatch(html,/mobile-tools-filters|mobile-menu-ai/);
  assert.doesNotMatch(html,/<details|<summary|mobile-menu-expand/);
  assert.doesNotMatch(html,/menu-group-Workspace|Switch account/);
  assert.match(html,/href="\/settings"/); // Profile still opens settings.
  assert.match(html,/Menu primary navigation/);
  assert.match(html,/Close all tools/);
});

test('grouped menu preserves twelve account tools and the current account query',()=>{
  const html=render();
  assert.equal((html.match(/class="mobile-menu-row"/g)||[]).length,12);
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
  assert.equal((html.match(/class="mobile-menu-row mobile-menu-pin"/g)||[]).length,12);
  assert.match(html,/Cancel shortcut changes/);
  assert.match(html,/>Cancel<\/button>/);
  assert.match(html,/Save shortcuts \(4\)/);
  assert.doesNotMatch(html,/Menu primary navigation/);
});

test('an account tool opens the picker then navigates to that tool after selection', () => {
  const states = [];
  let cursor = 0;
  const events = [];
  const dialog = { close() { events.push('close dialog'); } };
  const Picker = () => null;
  const dependencies = {
    react: {
      ...React,
      useState(initial) {
        const index = cursor++;
        if (!(index in states)) states[index] = initial;
        return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }];
      },
      useRef: initial => ({ current: initial === null ? { closest: () => dialog } : initial }),
      useEffect() {},
    },
    'next/link': { default: 'a' },
    'next/navigation': { useRouter: () => ({ push: href => events.push(href) }) },
    './AdsIcon': { AdsIcon: () => null },
    '@/components/ui/UserAvatar': { UserAvatar: () => null },
    './MobileNavBar': { MobileNavBar: () => null },
    './MenuAccountPicker': { MenuAccountPicker: Picker },
    '@/lib/menu-navigation': { beginMenuNavigation: () => events.push('show loading') },
  };
  dependencies['./WorkbenchNavigation'] = load('src/components/layout/WorkbenchNavigation.tsx', dependencies);
  const { MobileToolMenu } = load('src/components/layout/MobileToolMenu.tsx', dependencies);
  const props = { accountBase: '', query: '', pathname: '/accounts', name: 'Demo', userId: 'u', onClose: () => events.push('close menu'), onLogout() {} };
  const renderMenu = () => { cursor = 0; return MobileToolMenu(props); };
  function nodes(node) {
    if (!node || typeof node !== 'object') return [];
    if (Array.isArray(node)) return node.flatMap(nodes);
    return [node, ...nodes(node.props?.children)];
  }
  let tree = renderMenu();
  const budget = nodes(tree).find(node => node.type === 'button' && nodes(node).some(child => child.type === 'strong' && child.props.children === 'Budgets'));
  assert.ok(budget);
  budget.props.onClick();
  assert.deepEqual(events, []); // Selecting a tool must not just send the user back to /accounts.
  tree = renderMenu();
  let picker = nodes(tree).find(node => node.type === Picker);
  assert.equal(picker.props.label, 'Budgets');
  picker.props.onCancel();
  assert.equal(nodes(renderMenu()).some(node => node.type === Picker), false);
  budget.props.onClick();
  picker = nodes(renderMenu()).find(node => node.type === Picker);
  picker.props.onSelect({ id: 'act_123', name: 'Demo & Co', currency: 'VND' });
  assert.deepEqual(events.slice(0, 3), ['show loading', 'close dialog', 'close menu']);
  const destination = new URL(events[3], 'https://example.test');
  assert.equal(destination.pathname, '/accounts/act_123/budget-optimizer');
  assert.equal(destination.searchParams.get('accountName'), 'Demo & Co');
  assert.equal(destination.searchParams.get('currency'), 'VND');
});
