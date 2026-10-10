/* =====================  ОҚЫТУШЫ: журнал, кесте, дөңгелек  ===================== */
//@T
const KEY='surface-journal-v1',MAXP=40,MAXT=60;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>String(Math.round(n*10)/10).replace('.',',');
const num=v=>{const x=parseFloat(String(v).replace(',','.'));return isNaN(x)?null:x;};
const mod2=(x,m)=>((x%m)+m)%m;
const GRADES=[[95,'A','4,0'],[90,'A-','3,67'],[85,'B+','3,33'],[80,'B','3,0'],[75,'B-','2,67'],[70,'C+','2,33'],[65,'C','2,0'],[60,'C-','1,67'],[55,'D+','1,33'],[50,'D','1,0'],[0,'F','0']];
const gradeOf=p=>GRADES.find(g=>p>=g[0]);
const TOT=PRAC.map(p=>p.rub.reduce((a,r)=>a+r[1],0));

let D={cfg:{att:10,ok:5,half:2},mode:'crit',seq:1,students:[]};
let saveOK=true,tab='reg',taskI=0,q='',delArm=0;
const undo=[];
(function load(){
  try{
    const j=JSON.parse(localStorage.getItem(KEY)||'null');
    if(j&&Array.isArray(j.students)){
      D.students=j.students;D.seq=j.seq||j.students.length+1;D.mode=j.mode==='final'?'final':'crit';D.cfg=Object.assign(D.cfg,j.cfg||{});
      D.students.forEach(s=>{s.ev=s.ev||[];s.rub=s.rub||[[],[],[]];s.tot=s.tot||[null,null,null];if(s.fin===undefined)s.fin=null;});
    }
  }catch(e){}
})();
function persist(){
  try{localStorage.setItem(KEY,JSON.stringify(D));saveOK=true;}catch(e){saveOK=false;}
  refreshAll();
}
let LIVE_ST=[];
const find=id=>LIVE_ST.find(s=>s.id===id);
const here=()=>LIVE_ST;
const vis=s=>!q||s.name.toLowerCase().includes(q);

/* ---- балл есептеу ---- */
const sumEv=s=>s.ev.reduce((a,e)=>a+(+e.p||0),0);
const partOf=s=>clamp(sumEv(s),0,MAXP);
const taskOf=(s,t)=>s.tot[t]!=null?clamp(+s.tot[t],0,TOT[t]):clamp((s.rub[t]||[]).reduce((a,v)=>a+(+v||0),0),0,TOT[t]);
const autoSum=s=>clamp(TOT.reduce((a,_,t)=>a+taskOf(s,t),0),0,MAXT);
const tasksOf=s=>s.fin!=null?clamp(+s.fin,0,MAXT):autoSum(s);
const totalOf=s=>Math.round((partOf(s)+tasksOf(s))*10)/10;

/* ---- студент әрекеттері ---- */
function setHere(s,v){s.here=v;s.ev=s.ev.filter(e=>e.k!=='att');if(v&&D.cfg.att)s.ev.push({k:'att',p:+D.cfg.att,l:'Қатысу',t:Date.now()});}
function addEv(s,k,p,l){const e={k,p,l,t:Date.now()};s.ev.push(e);undo.push({id:s.id,ev:e});if(undo.length>150)undo.shift();}
function addStudent(name,isHere){
  name=name.trim().replace(/\s+/g,' ');if(!name)return null;
  let s=D.students.find(x=>x.name.toLowerCase()===name.toLowerCase());
  if(s){if(isHere&&!s.here)setHere(s,true);return{s,dup:true};}
  s={id:D.seq++,name,here:false,ev:[],rub:[[],[],[]],tot:[null,null,null],fin:null};D.students.push(s);
  if(isHere)setHere(s,true);return{s,dup:false};
}

/* ---- хабарлама ---- */
const toastEl=$('#toast');let toastT=0;
function toast(m){toastEl.textContent=m;toastEl.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>toastEl.classList.remove('on'),2400);}
function confirm2(btn,fn,txt){
  if(btn.dataset.armed){clearTimeout(+btn.dataset.armed);delete btn.dataset.armed;btn.classList.remove('armed');btn.textContent=btn.dataset.t0;fn();return;}
  btn.dataset.t0=btn.textContent;btn.classList.add('armed');btn.textContent=txt||'Растау үшін қайта басыңыз';
  btn.dataset.armed=String(setTimeout(()=>{delete btn.dataset.armed;btn.classList.remove('armed');btn.textContent=btn.dataset.t0;},4000));
}

/* ====================  ЖУРНАЛ  ==================== */
const gb=$('#gb'),board=$('#board'),gbBody=$('#gbBody');
const TABS=[['reg','Тіркеу'],['part','Қатысым · 40'],['task','Тапсырмалар · 60'],['set','Параметрлер']];
function renderGbTabs(){$('#gbTabs').innerHTML=TABS.map(t=>`<button class="tab" role="tab" aria-selected="${t[0]===tab}" data-tab="${t[0]}">${t[1]}</button>`).join('');}
function paintSave(){$('#gbSave').textContent=saveOK?'Сақталды ✓':'⚠ Сақталмайды: CSV жүктеңіз';}
function paintHdr(){const n=D.students.length,h=here().length;$('#gbBtn').textContent=n?'Журнал · '+h+'/'+n:'Журнал';}
function openGb(t){closeBoard();if(t)tab=t;gb.hidden=false;renderGbTabs();renderTab();paintSave();}
function closeGb(){gb.hidden=true;}
function openBoard(){gb.hidden=true;board.hidden=false;renderBoard();}
function closeBoard(){board.hidden=true;}
function closeOverlays(){gb.hidden=true;board.hidden=true;}
function renderTab(){
  gbBody.innerHTML=tab==='reg'?regHTML():tab==='part'?partHTML():tab==='task'?taskHTML():setHTML();
  if(tab==='reg')regChips();
}

/* --- тіркеу --- */
function regHTML(){return `
<div class="reg">
  <div class="card stack-col">
    <h3>Жылдам тіркеу</h3>
    <p class="hint">Аты-жөнін жазып Enter басыңыз. Студент бірден «келді» болып, ${fmt(D.cfg.att)} балл алады.</p>
    <div class="row"><input class="inp" id="regName" placeholder="Мысалы: Аманов Данияр" autocomplete="off" style="flex:1;min-width:160px"><button class="btn" data-a="regadd">Қосу</button></div>
    <h3 style="margin-top:8px">Топ тізімін қою</h3>
    <textarea class="inp" id="regList" rows="7" placeholder="Әр жолға бір студент"></textarea>
    <div class="row"><button class="btn ghost" data-a="regimport">Тізімді жүктеу</button></div>
    <p class="hint">Тізімнен жүктелгендер «келмеді» болып тұрады. Келгенде атын басыңыз.</p>
  </div>
  <div class="card stack-col">
    <div class="row" style="justify-content:space-between"><h3>Студенттер</h3><span class="hint" id="regCount"></span></div>
    <div class="row"><button class="btn ghost" data-a="regall">Барлығы келді</button></div>
    <div class="schips" id="regChips"></div>
  </div>
</div>`;}
function regChips(){
  const el=$('#regChips');if(!el)return;
  const L=D.students.filter(vis);
  el.innerHTML=L.length?L.map(s=>`<button type="button" class="sc${s.here?' here':''}" data-a="here" data-id="${s.id}" title="${s.here?'Келді. Басыңыз: келмеді деп белгілеу':'Келді деп белгілеу'}">${esc(s.name)}<i data-a="del" data-id="${s.id}" class="${delArm===s.id?'arm':''}" title="Жою">${delArm===s.id?'жою?':'×'}</i></button>`).join(''):'<p class="hint">'+(D.students.length?'Табылмады.':'Әзірге студент жоқ.')+'</p>';
  $('#regCount').textContent='Келді: '+here().length+' / '+D.students.length;
}

/* --- қатысым --- */
function pcHTML(s){
  const p=partOf(s);
  const tip=s.ev.slice(-6).map(e=>(e.p>0?'+':'')+fmt(e.p)+' '+e.l).join(', ');
  return `<div class="pc" data-id="${s.id}" title="${esc(tip)}"><div class="pc-top"><span class="pc-name">${esc(s.name)}</span><span class="pc-pts"><b>${fmt(p)}</b>/${MAXP}</span></div><div class="meter"><i style="width:${p/MAXP*100}%"></i></div><div class="pc-btns">${[1,2,3,-1].map(v=>`<button type="button" data-a="act" data-id="${s.id}" data-p="${v}">${v>0?'+':'−'}${Math.abs(v)}</button>`).join('')}</div></div>`;
}
function partHTML(){
  const hs=here().filter(vis);
  return `<div class="row" style="margin-bottom:12px"><button class="btn ghost" data-a="allp">Барлық келгенге +1</button><span class="hint">Белсенділік үшін +1, +2, +3 басыңыз. Қате болса −1 немесе «Болдырмау». Қатысым ең көбі ${MAXP} балл.</span></div><div class="pgrid">${hs.map(pcHTML).join('')||'<p class="hint">Келген студент жоқ. «Тіркеу» бөлімінен қосыңыз.</p>'}</div>`;
}
function updPc(s){const el=$('.pc[data-id="'+s.id+'"]',gbBody);if(el)el.outerHTML=pcHTML(s);}

/* --- тапсырмалар --- */
function taskRow(s){
  const t=taskI,p=PRAC[t];const sum=(s.rub[t]||[]).reduce((a,v)=>a+(+v||0),0);
  const note=s.here?'':'<em>келмеді</em>';
  const finNote=s.fin!=null?`<em>қорытынды: ${fmt(s.fin)}</em>`:'';
  return `<tr data-id="${s.id}" class="${s.here?'':'abs'}"><td class="nm">${esc(s.name)}${note}${finNote}</td>${p.rub.map((r,c)=>{const v=(s.rub[t]||[])[c];return `<td><input class="gi" type="number" inputmode="decimal" min="0" max="${r[1]}" step="0.5" data-id="${s.id}" data-c="${c}" value="${v==null?'':v}" aria-label="${esc(s.name)}: ${esc(r[0])}"></td>`;}).join('')}<td><input class="gi tot" type="number" inputmode="decimal" min="0" max="${TOT[t]}" step="0.5" data-id="${s.id}" data-c="tot" placeholder="${fmt(sum)}" value="${s.tot[t]==null?'':s.tot[t]}" aria-label="${esc(s.name)}: жалпы"></td><td class="tb"><button type="button" class="mini" data-a="full" data-id="${s.id}">Толық</button> <button type="button" class="mini" data-a="clr" data-id="${s.id}" title="Тазалау">×</button></td></tr>`;
}
function finRow(s){
  const auto=autoSum(s);
  return `<tr data-id="${s.id}" class="${s.here?'':'abs'}"><td class="nm">${esc(s.name)}${s.here?'':'<em>келмеді</em>'}</td><td style="font-family:var(--font-mono)">${fmt(auto)}</td><td><input class="gi tot" type="number" inputmode="decimal" min="0" max="${MAXT}" step="0.5" data-id="${s.id}" data-c="fin" placeholder="${fmt(auto)}" value="${s.fin==null?'':s.fin}" aria-label="${esc(s.name)}: қорытынды балл"></td><td class="tb"><button type="button" class="mini" data-a="clrfin" data-id="${s.id}" title="Тазалау">×</button></td></tr>`;
}
function taskHTML(){
  const crit=D.mode!=='final';const L=D.students.filter(vis);
  let head,rows;
  if(crit){
    const p=PRAC[taskI];
    head=`<tr><th>Студент</th>${p.rub.map(r=>`<th title="${esc(r[0])}"><span class="th-l">${esc(r[0])}</span><b>/${r[1]}</b></th>`).join('')}<th>Жалпы<b>/${TOT[taskI]}</b></th><th></th></tr>`;
    rows=L.map(taskRow).join('');
  }else{
    head=`<tr><th>Студент</th><th>Критерий қосындысы<b>auto</b></th><th>Тапсырма балы<b>/${MAXT}</b></th><th></th></tr>`;
    rows=L.map(finRow).join('');
  }
  return `<div class="row" style="margin-bottom:10px;justify-content:space-between">
    <div class="seg" role="group" aria-label="Бағалау тәсілі"><button type="button" data-a="mode" data-m="crit" aria-pressed="${crit}">Әр тапсырма бойынша (критерий)</button><button type="button" data-a="mode" data-m="final" aria-pressed="${!crit}">Соңында бір балл (60)</button></div>
    ${crit?`<div class="tabs" role="tablist">${PRAC.map((p,i)=>`<button type="button" class="tab" role="tab" aria-selected="${i===taskI}" data-a="tt" data-i="${i}">${i+1} · ${p.tab.split(' · ')[1]} · ${TOT[i]}</button>`).join('')}</div>`:''}
  </div>
  <p class="hint" style="margin-bottom:10px">${crit?'Критерийге балл жазып Enter басыңыз: келесі студентке өтеді. «Толық» батырмасы бәріне максимум қояды. «Жалпы» ұяшығына тікелей балл жазуға да болады. Қорытынды балл қойылса, ол басым болады.':'Сабақ соңында әр студентке тапсырма үшін бір жалпы балл (0–'+MAXT+') қойыңыз. Ол критерийлердің қосындысынан басым болады. Enter: келесі студент.'}</p>
  <div class="gt-wrap"><table class="gt"><thead>${head}</thead><tbody>${rows||'<tr><td colspan="9" class="hint" style="padding:18px">Студент жоқ. Алдымен «Тіркеу» бөлімінен қосыңыз.</td></tr>'}</tbody></table></div>`;
}
function onGrade(t){
  const s=find(+t.dataset.id);if(!s)return;const c=t.dataset.c;let v=num(t.value);const max=+t.max;
  if(v!=null){if(v<0){v=0;t.value='0';}if(v>max){v=max;t.value=String(max);}}
  if(c==='fin')s.fin=v;
  else if(c==='tot')s.tot[taskI]=v;
  else{if(!s.rub[taskI])s.rub[taskI]=[];s.rub[taskI][+c]=v;}
  persist();
  if(c!=='tot'&&c!=='fin'){
    const tr=t.closest('tr');const tt=tr&&tr.querySelector('[data-c="tot"]');
    if(tt)tt.placeholder=fmt((s.rub[taskI]||[]).reduce((a,x)=>a+(+x||0),0));
  }
}

/* --- параметрлер --- */
function setHTML(){
  return `<div class="set-grid">
  <div class="card stack-col"><h3>Балл параметрлері</h3>
    <label class="srow"><span>Тіркелгені үшін (сабаққа келді)</span><input class="inp sm" type="number" step="0.5" min="0" max="40" data-cfg="att" value="${D.cfg.att}"></label>
    <label class="srow"><span>Дұрыс жауап (тест, ойын)</span><input class="inp sm" type="number" step="0.5" min="0" max="40" data-cfg="ok" value="${D.cfg.ok}"></label>
    <label class="srow"><span>Жартылай дұрыс жауап</span><input class="inp sm" type="number" step="0.5" min="0" max="40" data-cfg="half" value="${D.cfg.half}"></label>
    <p class="hint">Қатысымның жалпы шегі ${MAXP} балл. Қалғанын «Қатысым» бөлімінде +1, +2, +3 арқылы қосасыз.</p>
  </div>
  <div class="card"><h3>Баға шкаласы (100 балдық)</h3>
    <table class="gscale" style="margin-top:8px"><thead><tr><th>Баға</th><th>Балл</th><th>GPA</th></tr></thead><tbody>${GRADES.map((g,i)=>`<tr><td><b>${g[1]}</b></td><td>${g[0]}${i===0?'–100':'–'+(GRADES[i-1][0]-1)}</td><td>${g[2]}</td></tr>`).join('').replace(/<td>0–/,'<td>0–')}</tbody></table>
  </div>
  <div class="card stack-col"><h3>Деректер</h3>
    <p class="hint">Журнал осы браузерде автоматты сақталады. Сабақ соңында CSV жүктеп алыңыз.</p>
    <button type="button" class="danger" data-a="clrscores">Баллдарды тазалау (тізім қалады)</button>
    <button type="button" class="danger" data-a="clrall">Бәрін тазалау (жаңа сабақ)</button>
  </div></div>`;
}

/* --- CSV --- */
function csv(){
  const q2=v=>'"'+String(v).replace(/"/g,'""')+'"';
  const rows=[['№','Аты-жөні','Келді','Қатысым /40',...PRAC.map((p,i)=>'Т'+(i+1)+' '+p.tab.split(' · ')[1]+' /'+TOT[i]),'Тапсырма /60','Барлығы /100','Баға']];
  D.students.forEach((s,i)=>{const tot=totalOf(s);rows.push([i+1,s.name,s.here?'иә':'жоқ',fmt(partOf(s)),...PRAC.map((_,t)=>s.fin!=null?'':fmt(taskOf(s,t))),fmt(tasksOf(s)),fmt(tot),gradeOf(tot)[1]]);});
  const blob=new Blob(['﻿'+rows.map(r=>r.map(q2).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='surface-ball-'+new Date().toISOString().slice(0,10)+'.csv';document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);toast('CSV жүктелді');
}

/* --- журнал оқиғалары --- */
gbBody.addEventListener('click',e=>{
  const a=e.target.closest('[data-a]');if(!a)return;
  const act=a.dataset.a,id=+a.dataset.id,s=find(id);
  switch(act){
    case 'regadd':{
      const inp=$('#regName');const r=addStudent(inp.value,true);
      if(!r){toast('Аты-жөнін жазыңыз');inp.focus();break;}
      persist();regChips();inp.value='';inp.focus();
      toast(r.dup?r.s.name+': белгіленді':r.s.name+': келді, +'+fmt(D.cfg.att)+' балл');break;}
    case 'regimport':{
      const lines=$('#regList').value.split(/\r?\n/).map(l=>l.replace(/^\s*\d+[.)]?\s+/,'').trim()).filter(Boolean);
      let n=0;lines.forEach(l=>{const r=addStudent(l,false);if(r&&!r.dup)n++;});
      persist();regChips();$('#regList').value='';toast(n+' студент қосылды');break;}
    case 'regall':here().length<D.students.length&&D.students.forEach(x=>{if(!x.here)setHere(x,true);});persist();regChips();break;
    case 'here':if(s){setHere(s,!s.here);persist();regChips();}break;
    case 'del':
      e.stopPropagation();
      if(delArm===id){D.students=D.students.filter(x=>x.id!==id);W.asked.delete(id);delArm=0;persist();regChips();}
      else{delArm=id;regChips();setTimeout(()=>{if(delArm===id){delArm=0;regChips();}},3500);}
      break;
    case 'act':if(s){const p=+a.dataset.p;addEv(s,'act',p,'Белсенділік');persist();updPc(s);}break;
    case 'allp':here().forEach(x=>addEv(x,'act',1,'Белсенділік'));persist();renderTab();toast('Барлығына +1');break;
    case 'mode':D.mode=a.dataset.m;persist();renderTab();break;
    case 'tt':taskI=+a.dataset.i;renderTab();break;
    case 'full':if(s){s.rub[taskI]=PRAC[taskI].rub.map(r=>r[1]);s.tot[taskI]=null;persist();const tr=a.closest('tr');tr.outerHTML=taskRow(s);}break;
    case 'clr':if(s){s.rub[taskI]=[];s.tot[taskI]=null;persist();const tr=a.closest('tr');tr.outerHTML=taskRow(s);}break;
    case 'clrfin':if(s){s.fin=null;persist();const tr=a.closest('tr');tr.outerHTML=finRow(s);}break;
    case 'clrscores':confirm2(a,()=>{D.students.forEach(x=>{x.ev=[];x.rub=[[],[],[]];x.tot=[null,null,null];x.fin=null;if(x.here)setHere(x,true);});undo.length=0;W.asked.clear();W.cur=null;persist();toast('Баллдар тазаланды');});break;
    case 'clrall':confirm2(a,()=>{D.students=[];D.seq=1;undo.length=0;W.asked.clear();W.cur=null;persist();renderTab();toast('Журнал тазаланды');});break;
  }
});
gbBody.addEventListener('input',e=>{
  const t=e.target;
  if(t.classList.contains('gi'))onGrade(t);
  else if(t.dataset.cfg){
    const v=clamp(num(t.value)??0,0,40);D.cfg[t.dataset.cfg]=v;
    if(t.dataset.cfg==='att')D.students.forEach(x=>{if(x.here)setHere(x,true);});
    persist();paintBtns();
  }
});
gbBody.addEventListener('keydown',e=>{
  const t=e.target;
  if(e.key==='Enter'&&t.id==='regName'){e.preventDefault();const b=$('[data-a="regadd"]',gbBody);if(b)b.click();return;}
  if(e.key==='Enter'&&t.classList&&t.classList.contains('gi')){
    e.preventDefault();
    const cells=$$('.gi[data-c="'+t.dataset.c+'"]',gbBody);const i=cells.indexOf(t);const nx=cells[i+1]||cells[i];nx.focus();try{nx.select();}catch(_){}
  }
});
$('#gbTabs').addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(!b)return;tab=b.dataset.tab;renderGbTabs();renderTab();});
$('#gbSearch').addEventListener('input',e=>{q=e.target.value.trim().toLowerCase();renderTab();});
$('#gbUndo').addEventListener('click',()=>{
  const u=undo.pop();if(!u){toast('Болдыратын әрекет жоқ');return;}
  const s=find(u.id);if(!s)return;const i=s.ev.indexOf(u.ev);if(i>=0)s.ev.splice(i,1);
  persist();renderTab();toast('Болдырылмады: '+s.name+' '+(u.ev.p>0?'+':'')+fmt(u.ev.p));
});
$('#gbCsv').addEventListener('click',csv);
$('#gbClose').addEventListener('click',closeGb);
$('#gbBoard').addEventListener('click',openBoard);
gb.addEventListener('mousedown',e=>{if(e.target===gb)closeGb();});
$('#gbBtn').addEventListener('click',()=>gb.hidden?openGb():closeGb());
$('#bdBtn').addEventListener('click',()=>board.hidden?openBoard():closeBoard());
$('#bdClose').addEventListener('click',closeBoard);
$('#bdJ').addEventListener('click',()=>openGb());

/* ====================  ТАҚТАДАҒЫ КЕСТЕ  ==================== */
function renderBoard(){
  if(board.hidden)return;
  const L=$('#bdList');
  const list=D.students.slice().sort((a,b)=>totalOf(b)-totalOf(a)||a.name.localeCompare(b.name,'kk'));
  const n=list.length;
  const old=new Map($$('.bd-row',L).map(e=>[e.dataset.id,e.getBoundingClientRect()]));
  const avg=n?list.reduce((a,s)=>a+totalOf(s),0)/n:0;
  const best=list[0];
  $('#bdSum').innerHTML=`<span class="chip">Келді: ${here().length} / ${n}</span><span class="chip">Орташа: ${fmt(avg)}</span>`+(best&&totalOf(best)>0?`<span class="chip">Алда: ${esc(best.name)} · ${fmt(totalOf(best))}</span>`:'');
  $('#bdGrades').textContent=GRADES.map(g=>g[1]+' '+g[0]+'+').join(' · ');
  if(!n){L.className='bd-list';L.style.gridTemplateColumns='';L.style.gridTemplateRows='';L.innerHTML='<div class="bd-empty">Студенттер әлі тіркелмеген. Журнал → Тіркеу.</div>';return;}
  const used=$('.bd-head',board).offsetHeight+$('.bd-foot',board).offsetHeight+30;
  const avail=innerHeight-used;
  const cols=n>26?3:n>13?2:1,per=Math.ceil(n/cols);
  const rh=clamp((avail-(per-1)*8)/per,30,64);
  L.className='bd-list'+(cols===3?' d3':'');
  L.style.gridTemplateColumns='repeat('+cols+',minmax(0,1fr))';
  L.style.gridTemplateRows='repeat('+per+','+rh+'px)';
  L.style.setProperty('--rh',rh+'px');
  const first=old.size===0;
  L.innerHTML=list.map((s,i)=>{
    const pt=partOf(s),tk=tasksOf(s),tot=totalOf(s);
    return `<div class="bd-row${i<3&&tot>0?' top'+(i+1):''}" data-id="${s.id}"><span class="bd-rk">${i+1}</span><span class="bd-nm">${esc(s.name)}${s.here?'':'<em>келмеді</em>'}</span><span class="bd-m part"><i data-w="${pt/MAXP*100}" style="width:${first?0:pt/MAXP*100}%"></i><b>${fmt(pt)}</b></span><span class="bd-m task"><i data-w="${tk/MAXT*100}" style="width:${first?0:tk/MAXT*100}%"></i><b>${fmt(tk)}</b></span><span class="bd-tot">${fmt(tot)}</span><span class="bd-gr">${gradeOf(tot)[1]}</span></div>`;
  }).join('');
  if(first){requestAnimationFrame(()=>requestAnimationFrame(()=>{$$('.bd-m i',L).forEach(i=>{i.style.width=i.dataset.w+'%';});}));}
  if(!reduce&&!first){
    $$('.bd-row',L).forEach(el=>{
      const o=old.get(el.dataset.id);if(!o)return;const nw=el.getBoundingClientRect();
      const dx=o.left-nw.left,dy=o.top-nw.top;if(!dx&&!dy)return;
      el.style.transition='none';el.style.transform='translate('+dx+'px,'+dy+'px)';
    });
    requestAnimationFrame(()=>requestAnimationFrame(()=>{$$('.bd-row',L).forEach(el=>{el.style.transition='transform .7s cubic-bezier(.2,.8,.2,1)';el.style.transform='';});}));
  }
}
function refreshAll(){paintHdr();renderBoard();paintPool();}
addEventListener('resize',()=>{renderBoard();if(!WB.hidden)drawWheel();});

/* ====================  ДӨҢГЕЛЕК  ==================== */
const WB=$('#wheelbox'),CV=$('#whCv');
const W={ang:0,spin:false,asked:new Set(),cur:null,hi:-1,items:[],noRep:true,auto:false,closed:{},newRound:false,note:null};
const PAL=['#0a7d5e','#b97800','#2f6fb5','#8a4fa8','#c13636','#2f8f9e'];
const shortName=nm=>{const t=nm.split(' ');return t.length>1?t[0]+' '+t[1][0]+'.':nm;};
function askCtx(){
  if(cur===9)return{t:qi>=QUIZ.length?'Тест':'Тест · '+(qi+1)+'-сұрақ',ev:'Тест №'+(qi+1)};
  if(cur===7)return{t:'Ойын · '+CASES[caseI].tab,ev:'Ойын №'+(caseI+1)};
  return{t:'Қатысым · жалпы сұрақ',ev:'Жауап'};
}
function peek(){
  const h=here();if(!W.noRep)return h;
  const p=h.filter(s=>!W.asked.has(s.id));return p.length?p:h;
}
function pool(){
  const h=here();if(!W.noRep)return h;
  let p=h.filter(s=>!W.asked.has(s.id));
  if(!p.length&&h.length){W.asked.clear();p=h.slice();W.newRound=true;}
  return p;
}
function colorFor(i,n){let c=PAL[i%PAL.length];if(i===n-1&&n>1&&i%PAL.length===0)c='#5b7a2f';return c;}
function drawWheel(){
  const items=W.items,n=items.length;
  const css=CV.getBoundingClientRect().width||300;const dpr=Math.min(devicePixelRatio||1,2);
  const px=Math.round(css*dpr);if(CV.width!==px){CV.width=px;CV.height=px;}
  const g=CV.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,css,css);
  const cx=css/2,cy=css/2,R=css/2-8;
  if(!n){
    g.beginPath();g.arc(cx,cy,R,0,7);g.fillStyle='#8ea2b3';g.fill();g.fillStyle='#fff';g.font='600 15px Onest,system-ui,sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('Кірген студент жоқ',cx,cy);
  }else{
    const seg=2*Math.PI/n;
    items.forEach((s,i)=>{
      const a0=-Math.PI/2+W.ang+i*seg,a1=a0+seg,hi=i===W.hi;
      g.beginPath();g.moveTo(cx,cy);g.arc(cx,cy,R,a0,a1);g.closePath();
      g.fillStyle=hi?'#f2b84b':colorFor(i,n);g.fill();g.strokeStyle='rgba(255,255,255,.9)';g.lineWidth=n>40?1:2;g.stroke();
      const arc=n===1?R:seg*R*.62;
      if(arc>11){
        g.save();g.translate(cx,cy);g.rotate(a0+seg/2);
        const fs=Math.max(9,Math.min(14,arc*.62));g.font='600 '+fs+'px Onest,system-ui,sans-serif';g.textAlign='right';g.textBaseline='middle';g.fillStyle=hi?'#1d1500':'#fff';
        const maxW=R-10-R*.17;let label=shortName(s.name);
        if(g.measureText(label).width>maxW)label=s.name.split(' ')[0];
        while(label.length>3&&g.measureText(label).width>maxW)label=label.slice(0,-2)+'…';
        g.fillText(label,R-10,0);g.restore();
      }
    });
    g.beginPath();g.arc(cx,cy,R*.13,0,7);g.fillStyle='#0f1b26';g.fill();g.strokeStyle='#fff';g.lineWidth=3;g.stroke();
  }
  g.beginPath();g.moveTo(cx-12,2);g.lineTo(cx+12,2);g.lineTo(cx,26);g.closePath();g.fillStyle='#fff';g.fill();g.strokeStyle='#0f1b26';g.lineWidth=2.5;g.stroke();
}
function randInt(n){const a=new Uint32Array(1);try{crypto.getRandomValues(a);}catch(e){a[0]=Math.random()*4294967296;}return Math.floor(a[0]/4294967296*n);}
function spinWheel(){
  if(W.spin)return;
  const p=pool();
  if(!p.length){toast('Сабаққа кірген студент әлі жоқ');return;}
  if(W.newRound){toast('Жаңа айналым: барлық студент қайта қатысады');W.newRound=false;}
  if(W.cur&&!W.cur.done)W.asked.delete(W.cur.id);
  W.items=p.slice();W.hi=-1;W.cur=null;W.note=null;paintRes();
  const n=p.length,seg=2*Math.PI/n,k=randInt(n),jit=(Math.random()-.5)*.6*seg;
  const turns=reduce?0:4+Math.floor(Math.random()*3);
  const delta=turns*2*Math.PI+mod2(-((k+.5)*seg+jit)-W.ang,2*Math.PI);
  const from=W.ang,dur=reduce?400:4200+Math.random()*900,t0=performance.now();
  W.spin=true;$('#whSpin').disabled=true;
  const step=now=>{
    const t=clamp((now-t0)/dur),e=1-Math.pow(1-t,4);
    W.ang=from+delta*e;drawWheel();
    if(t<1)requestAnimationFrame(step);else finishSpin(k);
  };
  requestAnimationFrame(step);
}
function finishSpin(k){
  W.spin=false;W.ang=W.ang%(2*Math.PI);W.hi=k;
  const s=W.items[k];W.asked.add(s.id);
  W.cur={id:s.id,ev:askCtx().ev,done:false,miss:false};
  $('#whSpin').disabled=false;drawWheel();paintRes(true);paintPool();
}
function paintRes(pop){
  const c=W.cur,s=c&&find(c.id),nm=$('#whName');
  nm.textContent=s?s.name:'—';
  if(pop&&s){nm.classList.remove('pop');void nm.offsetWidth;nm.classList.add('pop');}
  $$('.wh-btns button',WB).forEach(b=>{b.disabled=!c||c.done;});
  const note=$('#whNote');
  if(W.note){note.textContent=W.note.t;note.className='wh-note '+W.note.c;}
  else if(c&&!c.done){note.textContent=cur===9||cur===7?'Жауап беруін өтініңіз. Жауап басылғанда балл автоматты қосылады.':'Жауабына қарай батырманы басыңыз.';note.className='wh-note';}
  else{note.textContent='';note.className='wh-note';}
}
function setNote(t,c){W.note={t,c};paintRes();}
function award(kind){
  const c=W.cur;if(!c||c.done)return;const s=find(c.id);if(!s)return;
  const p=kind==='ok'?+D.cfg.ok:kind==='half'?+D.cfg.half:0;
  c.done=true;addEv(s,'ans',p,c.ev+(kind==='no'?' · қате':kind==='half'?' · жартылай':''));
  persist();
  setNote(kind==='no'?s.name+': 0 балл':s.name+': +'+fmt(p)+' балл',kind==='no'?'bad':'good');
  toast(kind==='no'?s.name+': 0 балл':s.name+': +'+fmt(p)+' балл');
}
function paintBtns(){$('#whOk').textContent='+'+fmt(D.cfg.ok);$('#whHalf').textContent='+'+fmt(D.cfg.half);}
function paintPool(){
  const h=here().length;$('#whPool').textContent=h?'Қалған: '+(W.noRep?peek().length&&here().filter(s=>!W.asked.has(s.id)).length:h)+' / '+h:'Келген студент жоқ';
  if(!W.spin&&!W.cur){W.items=peek();W.hi=-1;if(!WB.hidden)drawWheel();}
}
function showWheel(auto){
  WB.hidden=false;W.auto=!!auto;$('#whBtn').setAttribute('aria-pressed','true');
  document.body.classList.toggle('wheel-dock',cur===7||cur===9);
  paintBtns();$('#whCtx').textContent=askCtx().t;paintPool();setTimeout(()=>{W.items=W.cur?W.items:peek();drawWheel();},30);
}
function hideWheel(){WB.hidden=true;W.auto=false;$('#whBtn').setAttribute('aria-pressed','false');document.body.classList.remove('wheel-dock');}
function toggleWheel(){if(WB.hidden)showWheel(false);else{hideWheel();}}
$('#whBtn').addEventListener('click',toggleWheel);
$('#whClose').addEventListener('click',()=>{W.closed[cur]=true;hideWheel();});
$('#whSpin').addEventListener('click',spinWheel);
if(typeof DB!=='undefined'){
  let offW=null,sidW=null;
  DB.session.on(s=>{
    if(!s||!s.sid||s.sid===sidW)return;sidW=s.sid;if(offW)offW();
    offW=DB.runs.on(sidW,r=>{
      LIVE_ST=r.filter(x=>x.joinedAt).map(x=>({id:x.id,name:x.name})).sort((a,b)=>a.name.localeCompare(b.name,'kk'));
      if(!WB.hidden)paintPool();
    });
  });
}
CV.addEventListener('click',spinWheel);
$('#whNoRep').addEventListener('change',e=>{W.noRep=e.target.checked;if(!W.noRep)W.asked.clear();paintPool();});
WB.addEventListener('click',e=>{const b=e.target.closest('[data-r]');if(b&&!b.disabled)award(b.dataset.r);});

/* ---- слайд пен тест/ойын байланысы ---- */
const TQ={
  refresh(){
    if(W.cur&&W.cur.ev!==askCtx().ev){if(!W.cur.done)W.asked.delete(W.cur.id);W.cur=null;W.hi=-1;W.note=null;if(!W.spin)paintRes();paintPool();}
    $('#whCtx').textContent=askCtx().t;
  },
  slide(i){
    if(!isT())return;
    const dock=i===7||i===9;
    document.body.classList.toggle('wheel-dock',!WB.hidden&&dock);
    if(dock){if(WB.hidden&&!W.closed[i]&&here().length)showWheel(true);}
    else if(W.auto&&!WB.hidden)hideWheel();
    $('#whCtx').textContent=askCtx().t;
  },
  answered(ok,final){
    const c=W.cur;if(!c||c.done||W.spin)return;
    if(!ok){
      if(final)award('no');
      else{c.miss=true;setNote('Қате жауап. Енді дұрысын тапса, жартылай балл қосылады.','bad');}
      return;
    }
    award(c.miss?'half':'ok');
  },
  modal(e){
    if(gb.hidden&&board.hidden)return false;
    const k=e.key;
    if(k==='Escape'){closeOverlays();return true;}
    if(!board.hidden&&(k==='b'||k==='B'||k==='и'||k==='И')){const t=e.target;if(!(t&&t.tagName==='INPUT')){closeBoard();return true;}}
    return true;
  },
  openGb(){if(!isT())return;gb.hidden?openGb():closeGb();},
  openBoard(){if(!isT())return;board.hidden?openBoard():closeBoard();},
  toggleWheel(){if(isT())toggleWheel();}
};
paintHdr();paintBtns();
//@/T
