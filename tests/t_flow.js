const {chromium}=require('playwright');
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1366,height:800}});
 const errs=[];const hook=(p,n)=>{p.on('pageerror',e=>errs.push(n+' PAGEERR '+e));p.on('console',m=>{if(m.type()==='error'&&!/fonts|gstatic|ERR_/.test(m.text()))errs.push(n+' '+m.text())});};
 const T=await ctx.newPage();hook(T,'T');await T.goto('http://localhost:8765/teacher.html');
 await T.fill('#pw','wrong');await T.press('#pw','Enter');console.log('bad pw err:',await T.textContent('#pwErr'));
 await T.fill('#pw','surface7');await T.press('#pw','Enter');await T.waitForSelector('#app:not([hidden])');
 console.log('code before start:',await T.textContent('#code'));
 await T.click('#bStart');await T.waitForFunction(()=>/^\d{4}$/.test(document.querySelector('#code').textContent));const code=await T.textContent('#code');console.log('code:',code);
 const S=await ctx.newPage();hook(S,'S');await S.goto('http://localhost:8765/index.html');await S.waitForTimeout(500);
 await S.click('.role.s');await S.waitForTimeout(200);
 console.log('login visible',await S.isVisible('#gtLogin'),'demo banner',await S.isVisible('#lgDemo'));
 // wrong code
 await S.fill('#lgCode','0000');await S.fill('#lgName','Асан Әлиев');await S.fill('#lgGroup','КИ-31');await S.press('#lgGroup','Enter');await S.waitForTimeout(300);
 console.log('wrong code:',await S.textContent('#lgErr'));
 await S.fill('#lgCode',code);await S.press('#lgCode','Enter');await S.waitForTimeout(500);
 console.log('courses visible',await S.isVisible('#gtCourses'),'role chip',await S.textContent('#gtRole'));
 await T.waitForTimeout(300);console.log('teacher sees students:',await T.textContent('#stIn'));
 await S.click('[data-open]');await S.waitForTimeout(400);
 await S.click('#toPrac');await S.waitForTimeout(700);
 console.log('student sees checkboxes:',await S.locator('#pracRub input[data-k]').count(),'| send btn',await S.isVisible('#lvSend'));
 await S.click('#lvSend');console.log('0 ticks err:',await S.textContent('#lvErr'));
 const cbs=S.locator('#pracRub input[data-k]');await cbs.nth(0).check();await cbs.nth(1).check();await cbs.nth(2).check();
 await S.waitForTimeout(1300);console.log('clock:',await S.textContent('#liveClock'));
 await T.waitForTimeout(300);console.log('teacher table cell before submit:',(await T.textContent('#tb tr td:nth-child(4)')).trim());
 await S.click('#lvSend');await S.waitForTimeout(500);
 console.log('student status:',(await S.textContent('.livebox .st')).trim());
 await T.waitForTimeout(500);
 console.log('queue cards:',await T.locator('.qc').count(),'| call chip',await T.textContent('#stCall'));
 console.log('card title:',(await T.textContent('.qc h3')).trim(),'| auto score',await T.inputValue('.qc .sc'));
 await T.screenshot({path:'f1_teacher_queue.png'});
 // teacher untick 3rd then approve
 await T.locator('.qc input[data-k="2"]').uncheck();console.log('score after untick',await T.inputValue('.qc .sc'));
 await T.click('.qc button[data-a="ok"]');await S.waitForTimeout(600);
 console.log('student after approve:',(await S.textContent('.livebox .st')).trim(),'|',(await S.textContent('.livebox .sum')).trim());
 await S.screenshot({path:'f2_student_done.png'});
 await T.fill('#tb input.part','35');await T.press('#tb input.part','Enter');await T.waitForTimeout(400);
 console.log('table row:',(await T.textContent('#tb tr')).replace(/\s+/g,' ').trim());
 // second task: return flow
 await S.locator('#pracTabs .tab').nth(1).click();await S.waitForTimeout(300);
 await S.locator('#pracRub input[data-k]').nth(0).check();await S.click('#lvSend');await T.waitForTimeout(600);
 await T.click('.qc button[data-a="ret"]');await T.fill('.qc .note','Array санын тексеріңіз');await T.click('.qc button[data-a="ret"]');await S.waitForTimeout(600);
 console.log('returned msg:',(await S.textContent('.livebox .st')).trim());
 await T.screenshot({path:'f3_teacher_table.png'});
 // reload student keeps login
 await S.reload();await S.waitForTimeout(700);console.log('after reload gate visible:',await S.isVisible('#gate'),'role',await S.locator('html').getAttribute('data-role'));
 // end session: still logged in, but submit blocked; new session kicks out
 await T.click('#bEnd');await T.waitForTimeout(300);
 await S.locator('#pracTabs .tab').nth(1).click();await S.waitForTimeout(300);await S.locator('#pracRub input[data-k]').nth(1).check();await S.click('#lvSend');await S.waitForTimeout(400);
 console.log('submit after end:',(await S.textContent('#lvErr')).trim());
 await T.click('#bStart');await T.waitForTimeout(300);await S.reload();await S.waitForTimeout(900);
 console.log('after NEW session+reload roles screen:',await S.isVisible('#gtRoles'),'role',await S.locator('html').getAttribute('data-role'));
 console.log('teacher table after new session rows:',await T.locator('#tb tr').count());
 // mobile
 const M=await (await b.newContext({viewport:{width:390,height:800}})).newPage();
 await M.goto('http://localhost:8765/index.html');await M.waitForTimeout(500);await M.click('.role.s');await M.waitForTimeout(300);await M.screenshot({path:'f4_mobile_login.png'});
 // teacher in lesson still works
 const L=await ctx.newPage();hook(L,'L');await L.goto('http://localhost:8765/index.html');await L.waitForTimeout(400);
 await L.click('.role.t');await L.fill('#gtPwIn','surface7');await L.press('#gtPwIn','Enter');await L.waitForTimeout(400);
 console.log('teacher role:',await L.locator('html').getAttribute('data-role'));await L.click('[data-open]');await L.waitForTimeout(300);console.log('live link visible:',await L.isVisible('#liveLink'));
 console.log('ERRORS:',errs);
 await b.close();
})();
