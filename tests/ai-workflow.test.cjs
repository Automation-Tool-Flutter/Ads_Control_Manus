const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
function load(relative) {
  const filename = path.resolve(__dirname, '..', relative);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } });
  const instance = new Module(filename, module);
  instance.filename = filename;
  instance.paths = module.paths;
  instance._compile(compiled.outputText, filename);
  return instance.exports;
}
const { groupActions, planActions, learningActions, saveActionSource, readAccountActions, markActionGroups } = load('src/lib/action-center.ts');
const { resolveViewContext } = load('src/lib/ai-view-context.ts');
const base = { id: 'a', source: 'budget', entityId: 'c1', entityName: 'Campaign', title: 'Increase', evidence: [], href: '/accounts/act_1/budget-optimizer', priority: 'medium', direction: 'increase', target: '1200', updatedAt: '2026-09-08T00:00:00Z' };
test('groups equivalent structured actions but preserves their source evidence', () => {
  const items = groupActions([base, {...base, id:'b', source:'plan'}]);
  assert.equal(items.length, 1);
  assert.equal(items[0].members.length, 2);
});
test('different budgets and opposing status changes require comparison', () => {
  const items = groupActions([base, {...base, id:'b', target:'1500'}, {...base,id:'c',direction:'pause',target:'PAUSED'}]);
  assert.equal(items.length, 3); assert.ok(items.every(item => item.conflict));
});
test('free text is not merged just because it concerns the same campaign', () => {
  assert.equal(groupActions([{...base,direction:'review',title:'Check tracking'}, {...base,direction:'review',title:'Replace creative'}]).length,2);
});
test('dismissed proposals do not cause pending conflicts', () => {
  const a = groupActions([base])[0];
  const items = groupActions([base,{...base,direction:'decrease',target:'800'}], {[a.id]:'dismissed'});
  assert.ok(items.every(item => !item.conflict));
});
test('context resolves current campaign, selected rows and unavailable IDs', () => {
  const snapshot = {accountId:'act_1', campaigns:[{id:'c1',name:'Campaign',entityType:'campaign'}],adsets:[],ads:[],period:{days:14}};
  assert.equal(resolveViewContext(snapshot,{pathname:'/accounts/act_1/campaigns/c1',selectedIds:[]}).entities[0].id,'c1');
  const result = resolveViewContext(snapshot,{pathname:'/accounts/act_1/campaigns',selectedIds:['c1','missing'],dateLabel:'30 ngày'});
  assert.deepEqual(result.missingIds,['missing']); assert.equal(result.actualDataPeriod.days,14);
  assert.equal(resolveViewContext(snapshot,{pathname:'/accounts/act_2/campaigns/c1',selectedIds:['c1']}),null);
});
test('ad query focus takes priority over its parent adset', () => {
  const snapshot = {accountId:'act_1',campaigns:[],adsets:[{id:'s1',name:'Set',entityType:'adset'}],ads:[{id:'a1',name:'Ad',entityType:'ad'}],period:{days:7}};
  assert.equal(resolveViewContext(snapshot,{pathname:'/accounts/act_1/campaigns/c1/adsets/s1',focusedAdId:'a1',selectedIds:[]}).entities[0].id,'a1');
});
test('checkpoints are due only after the correct interval; rollback is excluded', () => {
  const record = {id:'r',accepted:true,entityId:'c1',entityName:'Campaign',recommendationTitle:'Budget',appliedAt:'2026-09-01T00:00:00Z',checkpoints:[]};
  assert.equal(learningActions('act_1',[record],Date.parse('2026-09-03')).length,0);
  assert.equal(learningActions('act_1',[record],Date.parse('2026-09-04')).length,1);
  assert.equal(learningActions('act_1',[{...record,rolledBackAt:'2026-09-02'}],Date.parse('2026-09-08')).length,0);
});
test('plan only exposes pending items and computes schedule day', () => {
  const item = {id:'p',day:3,status:'pending',entityId:'c1',entityName:'C',title:'Pause',description:'Evidence',evidence:[],action:{type:'pause_entity',proposedDailyBudgetRaw:'0',targetStatus:'PAUSED'}};
  const result = planActions('act_1',{id:'plan',startDate:'2026-09-01',createdAt:'2026-09-01',currency:'VND',items:[item,{...item,id:'done',status:'applied'}]});
  assert.equal(result.length,1); assert.equal(result[0].target,'PAUSED'); assert.equal(result[0].dueAt,'2026-09-03T00:00:00.000Z');
});
test('storage isolates accounts and preserves review state across refresh', () => {
  const memory = new Map();
  global.window = {dispatchEvent() {}};
  global.localStorage = {getItem:key=>memory.get(key) ?? null,setItem:(key,value)=>memory.set(key,value)};
  saveActionSource('act_1','budget',[base]);
  assert.equal(readAccountActions('act_2').length,0);
  const item = readAccountActions('act_1')[0];
  markActionGroups('act_1',[item.id],'reviewed');
  assert.equal(readAccountActions('act_1')[0].review,'reviewed');
  localStorage.setItem('ai-learning-records:act_1',JSON.stringify([{accepted:true,entityId:'c1',source:'budget_optimizer',appliedAt:'2026-09-09T00:00:00Z',rolledBackAt:'2026-09-09'}]));
  assert.equal(readAccountActions('act_1').length,0);
  memory.set('ai-action-center:act_1','invalid JSON');
  assert.equal(readAccountActions('act_1').length,0);
});
