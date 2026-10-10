/* =====================  LIVE: студенттің кіруі және жіберуі  ===================== */
const LIVE=(function(){
  const ok=typeof DB!=='undefined'&&typeof APP!=='undefined';
  const PRAC_SLIDE=8,LIMIT=30*60000;
  let offRank=null,ranks=[],me=null,run=null,sess=null,offRun=null,clock=null,ticks=PRAC_ticks();
  function PRAC_ticks(){return [[],[],[]];}
  try{me=JSON.parse(sessionStorage.getItem('surface-me')||'null');}catch(e){}
  const saveMe=()=>{try{me?sessionStorage.setItem('surface-me',JSON.stringify(me)):sessionStorage.removeItem('surface-me');}catch(e){}};
  const rid=()=>me.sid+'_'+me.key;
  const isStu=()=>ok&&me&&rootEl.dataset.role==='student';

  function attach(){
    if(offRun)offRun();
    if(offRank)offRank();offRank=DB.runs.on(me.sid,r=>{ranks=r;paintRank();});
    offRun=DB.run.on(rid(),r=>{run=r||{};ticksFromRun();if(cur===PRAC_SLIDE)paint();});
  }
  function ticksFromRun(){
    for(let n=0;n<3;n++){const t=run&&run['t'+n];if(t&&t.c)ticks[n]=t.c.slice();}
  }
  async function login(code,name,group){
    name=name.trim().replace(/\s+/g,' ');group=group.trim().replace(/\s+/g,' ');
    if(!/^\d{4}$/.test(code.trim()))return 'Код 4 санды болуы керек.';
    if(name.length<3)return 'Аты-жөніңізді толық жазыңыз.';
    if(!group)return 'Тобыңызды жазыңыз.';
    let s;try{s=await DB.session.get();}catch(e){return 'Байланыс жоқ. Интернетті тексеріңіз.';}
    if(!s||!s.open)return 'Сабақ әлі басталған жоқ. Мұғалімнен күтіңіз.';
    if(String(s.code)!==code.trim())return 'Код қате. Экрандағы кодты қайта қараңыз.';
    me={sid:s.sid,name,group,key:APP.key(group,name)};
    if(!me.key)return 'Аты-жөнінде әріп болуы керек.';
    saveMe();try{localStorage.setItem('surface-last',JSON.stringify({name,group}));}catch(e){}
    ticks=PRAC_ticks();run=null;
    const ex=await DB.run.get(rid());
    const o={};
    if(!ex||!ex.joinedAt)Object.assign(o,{sid:me.sid,name,group,key:me.key,joinedAt:Date.now()});
    if(!ex||ex.part==null)o.part=APP.PART_MAX;   // кірген бойда қатысым 30 балл
    if(Object.keys(o).length)await DB.run.patch(rid(),o);
    attach();return '';
  }
  function logout(){
    if(offRank){offRank();offRank=null;}ranks=[];paintRank();
    me=null;run=null;ticks=PRAC_ticks();saveMe();if(offRun){offRun();offRun=null;}clearInterval(clock);
  }
  function last(){try{return JSON.parse(localStorage.getItem('surface-last')||'null');}catch(e){return null;}}
  /* қолданбасы басталғанда: сессия ауысқан болса, қайта кіргізу */
  function verify(onBad){
    if(!ok||!me)return;
    DB.session.get().then(s=>{if(!s||s.sid!==me.sid){logout();onBad();}else attach();}).catch(()=>attach());
  }

  function patchT(n,o){return DB.run.patch(rid(),{['t'+n]:o});}
  function startedAt(){return run&&run.startedAt;}
  function slide(i){
    clearInterval(clock);
    if(!isStu())return;
    if(i===PRAC_SLIDE){
      if(run&&!run.startedAt)DB.run.patch(rid(),{startedAt:Date.now()});
      clock=setInterval(tick,1000);tick();
    }
  }
  function tick(){
    const el=$('#liveClock');if(!el)return;const t=(run&&run['t'+curP])||{};if(!t.s){el.textContent='';return;}
    const d=((t.st==='called'||t.st==='done')&&t.at?t.at:Date.now())-t.s,a=Math.max(0,Math.floor(d/1000)),bud=APP.TASKS[curP].budget;
    el.textContent='⏱ '+String(Math.floor(a/60)).padStart(2,'0')+':'+String(a%60).padStart(2,'0')+' / '+bud+' мин';
    el.classList.toggle('over',d>bud*60000);
  }

  /* рейтинг: студент өз экранынан көреді */
  function paintRank(){
    let b=document.getElementById('rankBtn'),p=document.getElementById('rankBox');
    if(!isStu()){if(b)b.hidden=true;if(p)p.hidden=true;return;}
    if(!b){
      b=document.createElement('button');b.id='rankBtn';b.type='button';b.className='pill';b.textContent='🏆 Рейтинг';
      p=document.createElement('aside');p.id='rankBox';p.hidden=true;
      b.onclick=()=>{p.hidden=!p.hidden;};
      const tl=document.querySelector('.tools'),th=document.getElementById('themeBtn');
      if(tl&&th)tl.insertBefore(b,th);else document.body.appendChild(b);document.body.appendChild(p);
    }
    b.hidden=false;
    const list=ranks.filter(r=>r.joinedAt).map(r=>({n:r.name,g:r.group,t:APP.total(r),me:me&&r.key===me.key})).sort((a,c)=>c.t-a.t||a.n.localeCompare(c.n,'kk'));
    p.innerHTML='<div class="rk-h"><b>Рейтинг</b><span>'+list.length+' студент</span></div>'+(list.map((x,i)=>`<div class="rk${x.me?' me':''}"><i>${i+1}</i><span>${esc(x.n)}</span><b>${x.t}</b></div>`).join('')||'<div class="rk">Әзірге ешкім жоқ</div>');
  }

  let curP=0;
  function prac(n,p){curP=n;if(!isStu())return;paint();}
  function paint(){
    if(!isStu())return;
    const n=curP,p=PRAC[n],box=$('#pracRub');if(!box)return;
    const t=(run&&run['t'+n])||{},st=t.st||'working',locked=st==='called'||st==='done';
    const started=!!t.s,pr=document.querySelector('.prac');if(pr)pr.classList.toggle('prelock',!started);
    box.parentNode.hidden=!started;$('#pracTip').hidden=!started;$('#pracList').closest('.stack-col').hidden=!started;
    const mark=st==='done'&&t.app?t.app:ticks[n];
    const rows=p.rub.map((r,k)=>`<label class="rrow${st==='done'?(t.app&&t.app[k]?' yes':' no'):''}"><input type="checkbox" data-k="${k}"${mark&&mark[k]?' checked':''}${locked?' disabled':''}><span>${r[0]}</span><b>${r[1]}</b></label>`).join('');
    const tot=p.rub.reduce((a,r)=>a+r[1],0);
    const sum=APP.sum(run);
    let msg='';
    if(st==='called')msg='<div class="st call">⏳ Мұғалім шақырылды. Орныңызда отырыңыз, мұғалім келіп 3ds Max-та тексереді.</div><div class="row"><button type="button" class="btn ghost" id="lvBack">Қайтарып алу</button></div>';
    else if(st==='done')msg=`<div class="st done">✅ Мақұлданды: ${t.score} / ${tot} балл${t.pct!=null&&t.pct<100?` · мұғалім тексеруі: ${t.pct}%`:''}</div>`;
    else if(!started)msg='<div class="st">Дайын болғанда басыңыз: тапсырма мен таймер басталады.</div><div class="row"><button type="button" class="btn" id="lvStart">Тапсырманы бастау</button></div>';
    else msg=(t.note?`<div class="st bad">Мұғалім қайтарды: ${esc(t.note)}</div>`:'<div class="st">Орындаған критерийлерді белгілеңіз, сосын жіберіңіз.</div>')+'<div class="row"><button type="button" class="btn" id="lvSend">Тапсырманы жіберу · мұғалімді шақыру</button></div><div class="st bad" id="lvErr" role="alert"></div>';
    box.innerHTML=!started?'':rows+`<div class="tot"><span>Барлық тапсырма: ${tot} балл</span><b>${tot}</b></div>`;
    let lb=$('#liveBox');if(!lb){lb=document.createElement('div');lb.id='liveBox';$('#pracGoal').closest('.card').after(lb);}
    lb.innerHTML=`<div class="livebox"><div class="row"><span class="chip">${esc(me.name)} · ${esc(me.group)}</span><span class="clock" id="liveClock"></span></div>${msg}<div class="sum">Менің тапсырма баллым: <b>${sum}</b> / 60</div></div>`;
    tick();
  }
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  document.addEventListener('change',e=>{
    const i=e.target.closest&&e.target.closest('#pracRub input[data-k]');if(!i||!isStu())return;
    const k=+i.dataset.k;ticks[curP][k]=i.checked;
    const n=PRAC[curP].rub.length;const c=[];for(let j=0;j<n;j++)c.push(!!ticks[curP][j]);
    patchT(curP,{c});
  });
  document.addEventListener('click',async e=>{
    if(!isStu())return;
    if(e.target.id==='lvStart'){patchT(curP,{s:Date.now(),st:'working'});return;}
    if(e.target.id==='lvBack'){patchT(curP,{st:'working'});return;}
    if(e.target.id!=='lvSend')return;
    const n=curP,len=PRAC[n].rub.length,c=[];for(let j=0;j<len;j++)c.push(!!ticks[n][j]);
    const er=$('#lvErr');
    if(!c.some(Boolean)){er.textContent='Кемінде бір критерийді белгілеңіз.';return;}
    e.target.disabled=true;
    try{
      const s=await DB.session.get();
      if(!s||s.sid!==me.sid){er.textContent='Жаңа сабақ басталды. Бетті жаңартып, қайта кіріңіз.';e.target.disabled=false;return;}
      if(!s.open){er.textContent='Сабақ аяқталды, жіберу жабық. Мұғалімге айтыңыз.';e.target.disabled=false;return;}
      const now=Date.now(),st=startedAt()||now,prev=(run&&run['t'+n]&&run['t'+n].s)||st;
      await patchT(n,{c,st:'called',at:now,el:+((now-prev)/60000).toFixed(1),min:+((now-st)/60000).toFixed(1),note:''});
    }catch(x){er.textContent='Жіберілмеді. Интернетті тексеріп қайта басыңыз.';e.target.disabled=false;}
  });

  attachInit();
  function attachInit(){if(ok&&me)attach();}
  function test(v){if(!isStu()||!run)return;if(run.test==null||v>run.test)DB.run.patch(rid(),{test:v});}
  return {rank:paintRank,test,on:()=>ok,me:()=>me,login,logout,verify,last,slide,prac,demo:()=>ok&&DB.mode==='demo'};
})();

/* Журнал: слайд бетінің ішінде қабат ретінде ашылады */
(function(){
  const a=document.getElementById('liveLink');if(!a)return;let o=null;
  a.addEventListener('click',e=>{
    e.preventDefault();
    if(!o){
      o=document.createElement('div');o.id='liveOvl';
      o.innerHTML='<div class="lo-bar"><button type="button" class="pill" id="loBack">← Слайдқа оралу</button><b>Журнал</b></div><iframe src="teacher.html?embed=1" title="Журнал"></iframe>';
      document.body.appendChild(o);o.querySelector('#loBack').onclick=()=>{o.hidden=true;};
    }
    o.hidden=false;
  });
})();
