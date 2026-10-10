/* =====================  КІРУ: рөл таңдау және курстар  ===================== */
const GATE=$('#gate'),rootEl=document.documentElement;
const LESSONS=[
 ['1','Компьютерлік графика және 3D негіздері. 3ds Max жұмыс ортасы'],
 ['2','Графиктік деректерді сипаттау. Примитивтерді құру'],
 ['3','3D нысанының қаңқалық-тор құрылымын өңдеу'],
 ['4','Интерфейс және проекция терезелері. Төбелерді, беттерді және көпбұрышты беттерді өңдеу'],
 ['5–6','Сплайндар негізінде 3D нысандарын әзірлеу'],
 ['7–8','Surface модификаторын пайдаланып бетті жасау',true],
 ['9','NURBS-беттерді біріктіру операцияларын қолдану'],
 ['10','Патчворкты модельдеу негіздері'],
 ['11','Түрлендіргіштер. Құрамдас нысандар және лофтинг'],
 ['12','Проекцияның үш терезесі бойынша объектінің құрылысы. Рельефті құру'],
 ['13','Жарық көздерін орналастыру және 3D-сахнаны жарықтандыру принциптері'],
 ['14','3D нысандарының беттеріндегі текстураларды қабаттастыру'],
 ['15','3D нысандарын визуализациялау']
];
let role='none',deepPending=/^#s\d+$/.test(location.hash||'');
try{const r=sessionStorage.getItem('surface-role');if(r==='student'||r==='teacher')role=r;}catch(e){}

function applyRole(r,save){
  let me;role=r;rootEl.dataset.role=r;
  if(save!==false){try{r==='none'?sessionStorage.removeItem('surface-role'):sessionStorage.setItem('surface-role',r);}catch(e){}}
  if(r!=='teacher'){closeOverlays();hideWheel();const n=$('#notes');if(n)n.hidden=true;}
  paintHdr();
  const chip=$('#gtRole');chip.hidden=r==='none';chip.textContent=r==='teacher'?'Мұғалім':'Студент';
  $('#gtSwitch').hidden=r==='none';
  if(r==='none')LIVE.logout();
  LIVE.rank();
  if(me=LIVE.me(),me&&r==='student')chip.textContent='Студент · '+me.name;
  if(r!=='teacher'&&cur>=0)resetSteps(cur,true);
}
function showScreen(w){
  $('#gtRoles').hidden=w!=='roles';$('#gtCourses').hidden=w!=='courses';$('#gtLogin').hidden=w!=='login';
  if(w==='roles'){$('#gtPw').hidden=true;$('.gt-roles',GATE).hidden=false;$('#gtPwErr').textContent='';}
  GATE.scrollTop=0;
  if(w==='courses')setTimeout(focusOpen,60);
}
function focusOpen(){
  const c=$('.lesson.open',GATE);if(!c||GATE.hidden)return;
  const top=c.offsetTop-Math.max(80,(GATE.clientHeight-c.offsetHeight)/2-40);
  if(top>40)GATE.scrollTo({top,behavior:reduce?'auto':'smooth'});
}
function openGate(w,keepHash){
  closeMenu();GATE.hidden=false;showScreen(w);
  if(!keepHash){try{history.replaceState(null,'',location.pathname+location.search);}catch(e){}}
  setTimeout(()=>{const f=w==='roles'?$('.role',GATE):$('.lesson.open .btn',GATE);if(f)f.focus({preventScroll:true});},40);
}
function closeGate(){
  GATE.hidden=true;
  try{if(cur>=0)history.replaceState(null,'','#s'+(cur+1));}catch(e){}
  setTimeout(()=>{VPS.forEach(v=>v.resize());},60);
}
function renderLessons(){
  $('#gtStat').innerHTML='<span class="chip">Ашық: 1 / '+LESSONS.length+'</span><span class="chip">Қалған сабақтар жақында ашылады</span><button type="button" class="chip" id="gtJump" style="cursor:pointer;border-color:var(--accent);color:var(--accent)">Ашық сабаққа өту ↓</button>';
  $('#gtList').innerHTML=LESSONS.map(l=>l[2]
    ?`<article class="lesson open"><span class="ln">${l[0]}</span><div><h3>${l[1]}</h3><p>50 минуттық сабақ: анимация, зертхана, «Қатені тап» ойыны, практика, тест</p><div class="tags"><span class="chip">Surface</span><span class="chip">Steps</span><span class="chip">Flip Normals</span><span class="chip">Shell</span></div></div><div class="act"><button type="button" class="btn" data-open="1">Сабақты ашу →</button></div></article>`
    :`<article class="lesson locked" aria-disabled="true"><span class="ln">${l[0]}</span><div><h3>${l[1]}</h3><p>Әзірге жабық</p></div><span class="lk act"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/></svg>Жабық</span></article>`
  ).join('');
}
function afterRole(){
  if(deepPending){deepPending=false;closeGate();}
  else openGate('courses',true);
}
$('.gt-roles',GATE).addEventListener('click',e=>{
  const b=e.target.closest('.role');if(!b)return;
  if(b.dataset.role==='student'){
    if(!LIVE.on()){applyRole('student');afterRole();return;}
    $('#lgDemo').hidden=!LIVE.demo();$('#lgErr').textContent='';showScreen('login');fillRoster();setTimeout(()=>$('#lgCode').focus(),40);
  }
  else{applyRole('teacher');afterRole();}
});
const LAT_KEYS="qwertyuiop[]asdfghjkl;'zxcvbnm,.",CYR_KEYS='йцукенгшщзхъфывапролджэячсмитьбю';
const normPw=s=>s.trim().toLowerCase().split('').map(c=>{const i=CYR_KEYS.indexOf(c);return i>=0?LAT_KEYS[i]:c;}).join('');
function tryPw(){
  if(normPw($('#gtPwIn').value)===normPw(String((window.APP_CONFIG&&APP_CONFIG.teacherPassword)||'surface7'))){applyRole('teacher');afterRole();}
  else{
    $('#gtPwErr').textContent='Құпиясөз қате. Қайта көріңіз.';
    const f=$('#gtPw');f.classList.remove('shake');void f.offsetWidth;f.classList.add('shake');$('#gtPwIn').select();
  }
}
let ROSTER=[];
async function fillRoster(){
  const g=$('#lgGroup');g.innerHTML='<option value="">Жүктелуде…</option>';
  try{const s=await DB.session.get();ROSTER=(s&&Array.isArray(s.roster))?s.roster:[];}catch(e){ROSTER=[];}
  const groups=[...new Set(ROSTER.map(x=>x.g))].sort();
  if(!groups.length){g.innerHTML='<option value="">Тізім жоқ</option>';$('#lgName').innerHTML='';$('#lgErr').textContent='Мұғалім әлі студенттер тізімін енгізген жоқ.';return;}
  const l=LIVE.last();
  g.innerHTML=groups.map(x=>`<option${l&&l.group===x?' selected':''}>${x}</option>`).join('');
  fillNames(l&&l.group===g.value?l.name:'');
}
function fillNames(sel){
  const g=$('#lgGroup').value;
  $('#lgName').innerHTML=ROSTER.filter(x=>x.g===g).map(x=>x.n).sort((a,b)=>a.localeCompare(b,'kk')).map(n=>`<option${n===sel?' selected':''}>${n}</option>`).join('');
}
$('#lgGroup').addEventListener('change',()=>fillNames(''));
async function tryLogin(){
  const b=$('#lgGo');b.disabled=true;
  const er=await LIVE.login($('#lgCode').value,$('#lgName').value,$('#lgGroup').value);
  b.disabled=false;
  if(er){$('#lgErr').textContent=er;const f=$('#lgBox');f.classList.remove('shake');void f.offsetWidth;f.classList.add('shake');return;}
  applyRole('student');afterRole();
}
$('#lgGo').addEventListener('click',tryLogin);
['#lgCode'].forEach(s=>$(s).addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();tryLogin();}}));
$('#lgCode').addEventListener('input',e=>{e.target.value=e.target.value.replace(/\D/g,'').slice(0,4);});
$('#lgBack').addEventListener('click',()=>showScreen('roles'));
$('#gtList').addEventListener('click',e=>{if(e.target.closest('[data-open]'))closeGate();});
$('#gtStat').addEventListener('click',e=>{if(e.target.closest('#gtJump'))focusOpen();});
$('#gtSwitch').addEventListener('click',()=>{applyRole('none');openGate('roles');});
$('#gtTheme').addEventListener('click',()=>$('#themeBtn').click());

/* мәзірге: курстарға оралу, рөлді ауыстыру */
(function(){
  const box=document.createElement('div');box.className='menu-extra';
  box.innerHTML='<button type="button" class="mi" data-x="courses"><span class="n">⌂</span><span class="t">Курстарға оралу</span><span class="ph">Басты бет</span></button><button type="button" class="mi" data-x="role"><span class="n">⇄</span><span class="t">Рөлді ауыстыру</span><span class="ph" id="menuRoleTag"></span></button>';
  $('#menu').insertBefore(box,$('#menuList'));
  box.addEventListener('click',e=>{
    const b=e.target.closest('[data-x]');if(!b)return;
    if(b.dataset.x==='courses')openGate('courses');
    else{applyRole('none');openGate('roles');}
  });
})();

if(role==='student'&&LIVE.on()&&!LIVE.me())role='none';
renderLessons();
applyRole(role,false);
LIVE.verify(()=>{applyRole('none');openGate('roles');});
if(role==='none')openGate('roles',true);
else if(deepPending){deepPending=false;GATE.hidden=true;}
else openGate('courses',true);
