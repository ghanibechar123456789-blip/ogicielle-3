'use strict';
/* دفتر المحل — v2. البيانات تُحفظ في الجهاز (localStorage) بالمفتاح dm، وبنفس صيغة النسخة الأولى {p,d,s} مع حقول إضافية. */
const $=id=>document.getElementById(id);
const DEF={shop:'',phone:'',addr:'',foot:'شكراً لزيارتكم',paper:'80',theme:'auto',lb:0};
const VIEWS=['sell','prod','inv','debt','rep','set'];

/* ---------- الحالة ---------- */
function norm(o){
  o=o&&typeof o==='object'?o:{};
  o.p=Array.isArray(o.p)?o.p:[];o.d=Array.isArray(o.d)?o.d:[];o.s=Array.isArray(o.s)?o.s:[];
  o.i=Array.isArray(o.i)?o.i:[];o.pl=Array.isArray(o.pl)?o.pl:[];
  o.n=o.n||(o.i.length?Math.max(...o.i.map(x=>x.no||0))+1:1);
  o.cfg=Object.assign({},DEF,o.cfg);
  return o;
}
let S;try{S=JSON.parse(localStorage.getItem('dm'))}catch(e){}
S=norm(S);
const AK='dm_auth',SK='dm_ok';
let AUTH=null;try{AUTH=JSON.parse(localStorage.getItem(AK))}catch(e){}
const cart={};
let view='sell',payDebt=false,pf='all',cartOpen=false,range='7',repTable=false,invLimit=60,lastInv=null;

let saveFail=false;
function save(){
  try{localStorage.setItem('dm',JSON.stringify(S));saveFail=false}
  catch(e){if(!saveFail)note('تعذّر حفظ البيانات: مساحة المتصفح ممتلئة. احفظ نسخة احتياطية الآن.');saveFail=true}
}

/* ---------- أدوات ---------- */
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>(Math.round(Number(n||0)*100)/100).toLocaleString('en-US')+' دج';
const find=id=>S.p.find(p=>p.id===id);
const ic=(n,c)=>`<svg class="ic ${c||''}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const pad=n=>String(n).padStart(2,'0');
const hue=s=>{let h=7;for(const c of String(s))h=(h*31+c.charCodeAt(0))%360;return h};
const av=n=>{n=String(n||'').trim();if(n.length>3&&n.startsWith('ال'))n=n.slice(2);return `<span class="av" style="--h:${hue(n)}" aria-hidden="true">${esc([...n][0]||'؟')}</span>`};
const dayKey=ts=>{const d=new Date(ts);return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())};
const saleTs=s=>s.ts||Date.parse(s.t)||0;
const dt=ts=>new Date(ts).toLocaleString('ar-DZ',{dateStyle:'short',timeStyle:'short'});
const shopName=()=>S.cfg.shop||'دفتر المحل';
function note(t){const e=$('toast');e.textContent=t;e.classList.add('on');clearTimeout(note.t);note.t=setTimeout(()=>e.classList.remove('on'),2800)}
function copy(t,msg){
  const fb=()=>{const a=document.createElement('textarea');a.value=t;document.body.appendChild(a);a.select();let ok=false;try{ok=document.execCommand('copy')}catch(e){}a.remove();note(ok?(msg||'تم النسخ'):'تعذّر النسخ')};
  try{navigator.clipboard.writeText(t).then(()=>note(msg||'تم النسخ'),fb)}catch(e){fb()}
}
function dlg(html){const d=$('dlg');d.innerHTML=html;if(!d.open)d.showModal()}
function closeDlg(){const d=$('dlg');if(d.open)d.close()}
$('dlg').addEventListener('click',e=>{if(e.target===$('dlg'))closeDlg()});
const dhead=t=>`<div class="dh"><h2>${t}</h2><button class="iconbtn" data-act="closedlg" aria-label="إغلاق">${ic('x')}</button></div>`;

/* ---------- باركود Code 128 (النوع B) ---------- */
const C128=('212222 222122 222221 121223 121322 131222 122213 122312 132212 221213 221312 231212 112232 122132 122231 113222 123122 123221 223211 221132 221231 213212 223112 312131 311222 321122 321221 312212 322112 322211 212123 212321 232121 111323 131123 131321 112313 132113 132311 211313 231113 231311 112133 112331 132131 113123 113321 133121 313121 211331 231131 213113 213311 213131 311123 311321 331121 312113 312311 332111 314111 221411 431111 111224 111422 121124 121421 141122 141221 112214 112412 122114 122411 142112 142211 241211 221114 413111 241112 134111 111242 121142 121241 114212 124112 124211 411212 421112 421211 212141 214121 412121 111143 111341 131141 114113 114311 411113 411311 113141 114131 311141 411131 211412 211214 211232 2331112').split(' ');
function code128(text){
  text=String(text||'');
  if(!text||/[^\x20-\x7e]/.test(text))return '';
  const vals=[104];let sum=104;
  [...text].forEach((ch,i)=>{const v=ch.charCodeAt(0)-32;vals.push(v);sum+=v*(i+1)});
  vals.push(sum%103,106);
  let x=10,bars='';
  vals.forEach(v=>{const p=C128[v];for(let k=0;k<p.length;k++){const w=+p[k];if(k%2===0)bars+=`<rect x="${x}" y="0" width="${w}" height="60"/>`;x+=w}});
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${x+10} 60" preserveAspectRatio="none" shape-rendering="crispEdges" fill="#000" role="img" aria-label="باركود ${esc(text)}">${bars}</svg>`;
}
function genCode(){
  let c;
  do{
    let d='20';for(let i=0;i<10;i++)d+=Math.floor(Math.random()*10);
    let s=0;for(let i=0;i<12;i++)s+=(+d[i])*(i%2?3:1);
    c=d+((10-s%10)%10);
  }while(S.p.some(p=>p.bc===c));
  return c;
}

/* ---------- رموز المنتجات والإضافات السريعة (بدون باركود) ---------- */
const QUICK=[
 ['بيض','🥚'],['خبز','🍞'],['خبز تقليدي (كسرة)','🫓'],['باغيت','🥖'],['حليب','🥛'],['زبدة','🧈'],['جبن','🧀'],
 ['طماطم','🍅'],['بطاطا','🥔'],['بصل','🧅'],['ثوم','🧄'],['جزر','🥕'],['فلفل','🌶️'],['خيار','🥒'],['سلطة','🥬'],['ليمون','🍋'],
 ['تفاح','🍎'],['موز','🍌'],['برتقال','🍊'],['عنب','🍇'],['بطيخ','🍉'],['فراولة','🍓'],['تمر','🌴'],
 ['دجاج','🍗'],['لحم','🥩'],['سمك','🐟'],['أرز','🍚'],['معكرونة','🍝'],['سكر','🍬'],['ملح','🧂'],['زيت','🫒'],['قهوة','☕'],['شاي','🍵'],
 ['ماء','💧'],['عصير','🧃'],['مشروب غازي','🥤'],['حلويات','🍰'],['بسكويت','🍪'],['شوكولاطة','🍫'],['مصاصة','🍭'],['آيس كريم','🍦'],
 ['صابون','🧼'],['منظّف','🧴'],['ورق','🧻'],['سجائر','🚬'],['شحن هاتف','📱']
];
const EMOJIS=[...new Set(QUICK.map(q=>q[1]).concat(['📦','🛒','🥫','🍯','🥜','🧂','🍼','🥗','🍕','🍔','🥪','🌽','🍆','🥦','🍑','🍐','🍍','🥭','🍈','🥥','🔋','💡','✏️','📓','🧽','🪥','💊','🎁']))];
function guessEm(name){
  const n=String(name||'').trim();if(!n)return '';
  const hit=QUICK.find(q=>n.includes(q[0].split(' ')[0])||q[0].includes(n));
  return hit?hit[1]:'';
}
/* أيقونة المنتج: رمزه إن وُجد، وإلا حرفه الأول الملوّن */
const pic=p=>p.em?`<span class="av em" aria-hidden="true">${esc(p.em)}</span>`:av(p.name);

/* ---------- التنقل ---------- */
function go(v){
  if(!VIEWS.includes(v))v='sell';
  view=v;cartOpen=false;document.body.dataset.view=v;
  document.querySelectorAll('.view').forEach(s=>s.classList.toggle('on',s.id==='v-'+v));
  document.querySelectorAll('.nav .nb').forEach(b=>{if(b.dataset.a===v)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
  try{history.replaceState(null,'','#'+v)}catch(e){}
  renderAll();window.scrollTo(0,0);
  if(v==='sell'&&matchMedia('(min-width:900px)').matches)$('q').focus();
}

/* ---------- البيع ---------- */
function rList(){
  const qv=$('q').value.trim().toLowerCase();
  const list=S.p.filter(p=>!qv||p.name.toLowerCase().includes(qv)||(p.bc&&String(p.bc).includes(qv))).sort((a,b)=>(b.qty>0)-(a.qty>0));
  $('plist').innerHTML=list.length?list.map(p=>{
    const out=p.qty<=0,low=!out&&p.qty<=p.min,n=cart[p.id];
    return `<button class="pt ${out?'out':''}" data-act="add" data-a="${p.id}" ${out?'disabled':''}>
      ${pic(p)}<span class="nm">${esc(p.name)}</span><span class="pr">${fmt(p.price)}</span>
      <span class="st ${low?'low':''}">${out?'نفد من المخزون':(low?'قليل · ':'')+'المتبقي '+p.qty}</span>${n?`<span class="bd">${n}</span>`:''}</button>`}).join('')
    :`<div class="empty"><b>${S.p.length?'لا توجد نتيجة':'لا توجد منتجات بعد'}</b>${S.p.length?'جرّب اسماً آخر أو امسح الباركود.':'أضف أول منتج من تبويب «المنتجات» (أو «إضافة سريعة» للبيض والخبز) ثم ارجع هنا لتبيع.'}</div>`;
}
function cartCalc(){
  const ids=Object.keys(cart).map(Number).filter(id=>find(id));
  const sub=ids.reduce((s,id)=>s+find(id).price*cart[id],0);
  const disc=Math.min(Math.max(parseFloat($('disc').value)||0,0),sub);
  return {ids,sub,disc,total:sub-disc,count:ids.reduce((s,id)=>s+cart[id],0)};
}
function rCart(){
  const c=cartCalc();
  $('r-no').textContent='#'+S.n;
  $('cart').innerHTML=c.ids.length?c.ids.map(id=>{const p=find(id);return `<div class="cl"><span class="nm">${p.em?esc(p.em)+' ':''}${esc(p.name)}</span><span class="tt">${fmt(p.price*cart[id])}</span>
    <span class="sub">${fmt(p.price)} للقطعة</span>
    <span class="qty"><button data-act="dec" data-a="${id}" aria-label="إنقاص">−</button><input type="number" inputmode="numeric" min="1" value="${cart[id]}" data-chg="setc" data-a="${id}" aria-label="الكمية"><button data-act="inc" data-a="${id}" aria-label="زيادة">+</button></span></div>`}).join('')
    :'<div class="cart-empty">اضغط على منتج لإضافته إلى الفاتورة.</div>';
  $('r-sub').textContent=fmt(c.sub);$('r-tot').textContent=fmt(c.total);
  $('cb-n').textContent='عرض الفاتورة · '+c.count+' قطعة';$('cb-t').textContent=fmt(c.total);
  $('cartbar').hidden=!c.ids.length||cartOpen||view!=='sell';
  $('bdrop').hidden=!cartOpen;
  $('receipt').classList.toggle('open',cartOpen);
  $('custs').innerHTML=S.d.map(d=>`<option value="${esc(d.n)}">`).join('');
}
function addCart(id){
  const p=find(id);if(!p)return;
  if((cart[id]||0)>=p.qty)return note('لا توجد كمية أكثر في المخزون');
  cart[id]=(cart[id]||0)+1;rList();rCart();
}
function chg(id,d){
  const p=find(id);if(!p)return;const n=(cart[id]||0)+d;
  if(n<=0)delete cart[id];else if(n<=p.qty)cart[id]=n;else note('لا توجد كمية أكثر في المخزون');
  rList();rCart();
}
function byCode(c){
  c=String(c).trim();if(!c)return false;
  const p=S.p.find(x=>x.bc&&String(x.bc)===c);
  if(p){addCart(p.id);$('q').value='';rList();return true}
  note('لا يوجد منتج بهذا الباركود');return false;
}
function checkout(){
  const c=cartCalc();
  if(!c.ids.length)return note('الفاتورة فارغة');
  const cust=$('who').value.trim();
  if(payDebt&&!cust)return note('اكتب اسم الزبون للبيع بالدين');
  const lines=c.ids.map(id=>{const p=find(id);return {id,name:p.name,q:cart[id],pr:p.price,c:p.c||0}});
  const gross=lines.reduce((s,l)=>s+(l.pr-l.c)*l.q,0);
  lines.forEach(l=>{find(l.id).qty-=l.q});
  const inv={no:S.n++,ts:Date.now(),lines,sub:c.sub,disc:c.disc,total:c.total,profit:gross-c.disc,debt:payDebt,cust:cust||''};
  S.i.push(inv);
  S.s.push({t:new Date().toDateString(),ts:inv.ts,v:inv.total,g:inv.profit,no:inv.no});
  if(payDebt){const d=S.d.find(x=>x.n===cust);if(d)d.v+=inv.total;else S.d.push({n:cust,v:inv.total})}
  Object.keys(cart).forEach(k=>delete cart[k]);
  $('disc').value='';$('who').value='';payDebt=false;cartOpen=false;setPay();
  save();renderAll();showInv(inv.no,true);
}
function setPay(){
  document.querySelectorAll('[data-act=pay]').forEach(b=>b.setAttribute('aria-pressed',String((b.dataset.a==='debt')===payDebt)));
  $('whow').hidden=!payDebt;
}

/* ---------- المنتجات ---------- */
function rProd(){
  const qv=$('pq').value.trim().toLowerCase();
  const low=S.p.filter(p=>p.qty>0&&p.qty<=p.min),out=S.p.filter(p=>p.qty<=0);
  const val=S.p.reduce((a,p)=>a+p.qty*(p.c||0),0);
  $('p-tiles').innerHTML=`<div class="tile"><small>عدد المنتجات</small><b>${S.p.length}</b></div>
    <div class="tile"><small>قيمة المخزون (بسعر الشراء)</small><b>${fmt(val)}</b></div>
    <div class="tile ${low.length?'warn':''}"><small>قاربت على النفاد</small><b>${low.length}</b></div>
    <div class="tile ${out.length?'warn':''}"><small>نفدت</small><b>${out.length}</b></div>`;
  document.querySelectorAll('[data-act=pf]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.a===pf)));
  const list=S.p.filter(p=>(!qv||p.name.toLowerCase().includes(qv)||(p.bc&&String(p.bc).includes(qv)))&&(pf==='all'||(pf==='low'&&p.qty>0&&p.qty<=p.min)||(pf==='out'&&p.qty<=0)));
  $('stock').innerHTML=list.length?list.map(p=>`<div class="row prow">${pic(p)}<div class="n"><b>${esc(p.name)}</b>
    <small>${fmt(p.price)}${p.c?' · الشراء '+fmt(p.c):''}${p.bc?' · '+esc(p.bc):' · بدون باركود'}</small></div>
    <span class="tag ${p.qty<=p.min?'low':''}">${p.qty<=0?'نفد':p.qty+' في المخزون'}</span>
    <div class="acts"><button class="iconbtn" data-act="editp" data-a="${p.id}" aria-label="تعديل">${ic('edit')}</button>
    <button class="iconbtn" data-act="lbl" data-a="${p.id}" aria-label="طباعة ملصقات الباركود">${ic('bars')}</button>
    <button class="iconbtn d" data-act="delp" data-a="${p.id}" aria-label="حذف">${ic('trash')}</button></div></div>`).join('')
    :`<div class="empty"><b>${S.p.length?'لا توجد نتيجة':'لا توجد منتجات بعد'}</b>${S.p.length?'غيّر البحث أو التصفية.':'اضغط «منتج جديد» لتضيف أول منتج.'}</div>`;
}
function fld(id,label,val,attrs){return `<label class="field"><span>${label}</span><input id="${id}" value="${esc(val)}" ${attrs||''}></label>`}
function openProd(id){
  const p=id?find(id):Object.assign({name:'',price:'',c:'',qty:'',min:'',bc:'',em:''},openProd.pre||{});openProd.pre=null;
  dlg(dhead(id?'تعديل المنتج':'منتج جديد')+`<div class="db">
    <div class="emrow"><span class="av em big" id="f-emv" aria-hidden="true">${esc(p.em||'📦')}</span><div style="flex:1;min-width:0">${fld('f-name','اسم المنتج',p.name,'autocomplete="off" data-in="emguess"')}</div></div>
    <input type="hidden" id="f-em" value="${esc(p.em||'')}">
    <div class="field"><span>شكل المنتج (يظهر في خانته عند البيع)</span><div class="emgrid" id="f-emg">${EMOJIS.map(e=>`<button type="button" class="emb ${e===p.em?'on':''}" data-act="pickem" data-a="${e}" aria-label="${e}">${e}</button>`).join('')}</div></div>
    <div class="two">${fld('f-price','سعر البيع (دج)',p.price,'type="number" inputmode="decimal" min="0"')}${fld('f-cost','سعر الشراء (لحساب الربح)',p.c||'','type="number" inputmode="decimal" min="0"')}</div>
    <div class="two">${fld('f-qty','الكمية في المخزون',p.qty,'type="number" inputmode="numeric" min="0"')}${fld('f-min','نبّهني عند',p.min||'','type="number" inputmode="numeric" min="0" placeholder="مثال: 5"')}</div>
    <label class="field"><span>الباركود <small class="muted">(اختياري: اتركه فارغاً للبيض والخبز والخضر…)</small></span><div class="inrow"><input id="f-bc" value="${esc(p.bc||'')}" inputmode="numeric" autocomplete="off">
      <button class="btn out" data-act="scan" data-a="f-bc" aria-label="مسح">${ic('scan')}</button><button class="btn out" data-act="gen">توليد</button></div></label>
    <div class="df"><button class="btn" data-act="savep" data-a="${id||''}">حفظ</button><button class="btn out" data-act="closedlg">إلغاء</button></div></div>`);
  if(!id)setTimeout(()=>$('f-name').focus(),50);
}
function pickEm(e){
  const cur=$('f-em');cur.dataset.manual='1';cur.value=cur.value===e?'':e;
  $('f-emv').textContent=cur.value||'📦';
  document.querySelectorAll('#f-emg .emb').forEach(b=>b.classList.toggle('on',b.dataset.a===cur.value));
}
function guessInForm(){
  const cur=$('f-em');if(cur.dataset.manual==='1'||(cur.value&&cur.dataset.auto!=='1'))return;
  const g=guessEm($('f-name').value);cur.value=g;cur.dataset.auto=g?'1':'';
  $('f-emv').textContent=g||'📦';
  document.querySelectorAll('#f-emg .emb').forEach(b=>b.classList.toggle('on',!!g&&b.dataset.a===g));
}
function openQuick(){
  dlg(dhead('إضافة سريعة (بدون باركود)')+`<div class="db"><p class="muted sm" style="margin-top:0">اختر المنتج، ثم اكتب سعره وكميته فقط.</p>
    <div class="qgrid">${QUICK.map((q,i)=>`<button type="button" class="qb" data-act="quickpick" data-a="${i}"><span class="qe">${q[1]}</span><span>${esc(q[0])}</span></button>`).join('')}
    <button type="button" class="qb other" data-act="quickother"><span class="qe">➕</span><span>منتج آخر</span></button></div></div>`);
}
function quickPick(i){const q=QUICK[+i];if(!q)return;openProd.pre={name:q[0],em:q[1]};openProd();setTimeout(()=>$('f-price').focus(),60)}
function saveProd(id){
  const name=$('f-name').value.trim(),price=parseFloat($('f-price').value);
  if(!name||!(price>=0))return note('اكتب اسم المنتج وسعر البيع');
  const bc=$('f-bc').value.trim();
  if(bc&&S.p.some(p=>p.bc===bc&&p.id!==+id))return note('هذا الباركود مستعمل لمنتج آخر');
  const o={name,price,c:parseFloat($('f-cost').value)||0,qty:Math.max(0,parseInt($('f-qty').value)||0),min:parseInt($('f-min').value)||0,bc,em:$('f-em').value||guessEm(name)};
  if(id){Object.assign(find(+id),o)}else S.p.push(Object.assign({id:Date.now()},o));
  save();closeDlg();renderAll();note('تم حفظ المنتج');
}
function delProd(id){
  const p=find(id);if(!p||!confirm('حذف «'+p.name+'» من المنتجات؟ الفواتير القديمة تبقى كما هي.'))return;
  S.p=S.p.filter(x=>x.id!==id);delete cart[id];save();renderAll();
}
function openLabels(id){
  const p=find(id);if(!p)return;
  if(!p.bc){p.bc=genCode();save();rProd();note('تم توليد باركود للمنتج')}
  dlg(dhead('ملصقات الباركود')+`<div class="db"><b>${esc(p.name)}</b>
    <div class="paper" style="text-align:center"><div style="height:60px;direction:ltr">${code128(p.bc)}</div><div dir="ltr" style="font-size:13px;letter-spacing:2px">${esc(p.bc)}</div></div>
    <label class="field"><span>عدد الملصقات</span><input id="l-n" type="number" inputmode="numeric" min="1" max="120" value="12"></label>
    <label class="field" style="display:flex;gap:8px;align-items:center"><input id="l-p" type="checkbox" checked style="width:20px;min-height:20px"><span style="margin:0">اطبع السعر على الملصق</span></label>
    <div class="df"><button class="btn" data-act="printlbl" data-a="${p.id}">${ic('print')}طباعة</button><button class="btn out" data-act="closedlg">إغلاق</button></div>
    <p class="muted sm">تُطبع على ورقة A4، 3 ملصقات في كل صف. يمكنك لصقها على المنتجات ثم مسحها عند البيع.</p></div>`);
}
function printLabels(id){
  const p=find(id),n=Math.min(120,Math.max(1,parseInt($('l-n').value)||1)),pr=$('l-p').checked;
  if(!p||!p.bc)return;
  const one=`<div class="lbl"><div class="ln1">${esc(p.name)}</div>${code128(p.bc)}<div class="cd">${esc(p.bc)}</div>${pr?`<div class="pp">${fmt(p.price)}</div>`:''}</div>`;
  printHTML(`<div class="lbls">${one.repeat(n)}</div>`,'A4','8mm');
}

/* ---------- الفواتير ---------- */
function invHTML(v,layout){
  const c=S.cfg,a4=layout==='a4';
  const head=`<div class="ih"><b>${esc(shopName())}</b>${c.addr?`<div>${esc(c.addr)}</div>`:''}${c.phone?`<div dir="ltr">${esc(c.phone)}</div>`:''}</div>
   <div class="im"><span>فاتورة رقم ${v.no}</span><span>${dt(v.ts)}</span></div>${v.cust?`<div class="im"><span>الزبون: ${esc(v.cust)}</span>${v.debt?'<b>بالدين</b>':''}</div>`:(v.debt?'<div class="im"><b>بالدين</b></div>':'')}`;
  const rows=a4
    ?`<table><thead><tr><th>#</th><th>المنتج</th><th class="e">الكمية</th><th class="e">السعر</th><th class="e">المبلغ</th></tr></thead><tbody>${v.lines.map((l,i)=>`<tr><td>${i+1}</td><td>${esc(l.name)}</td><td class="e">${l.q}</td><td class="e">${fmt(l.pr)}</td><td class="e">${fmt(l.pr*l.q)}</td></tr>`).join('')}</tbody></table>`
    :`<table><thead><tr><th>المنتج</th><th class="e">المبلغ</th></tr></thead><tbody>${v.lines.map(l=>`<tr><td>${esc(l.name)}<div class="sub">${l.q} × ${fmt(l.pr)}</div></td><td class="e">${fmt(l.pr*l.q)}</td></tr>`).join('')}</tbody></table>`;
  const tot=`<div class="${a4?'box':''}">${v.disc?`<div class="tt"><span>المجموع</span><span>${fmt(v.sub)}</span></div><div class="tt"><span>التخفيض</span><span>− ${fmt(v.disc)}</span></div>`:''}<div class="tt g"><span>الصافي</span><span>${fmt(v.total)}</span></div></div>`;
  const foot=c.foot?`<div class="ft">${esc(c.foot)}</div>`:'';
  return `<div class="inv ${layout==='screen'?'screen':(a4?'a4':'t'+(layout==='58'?'58':'80'))}">${head}${rows}${tot}${foot}</div>`;
}
function invText(v){
  return [shopName(),'فاتورة رقم '+v.no,dt(v.ts),'----------'].concat(
    v.lines.map(l=>l.name+' × '+l.q+' = '+fmt(l.pr*l.q)),
    v.disc?['التخفيض: '+fmt(v.disc)]:[],['المجموع: '+fmt(v.total)],
    v.debt?['بالدين على: '+v.cust]:[],S.cfg.foot?['----------',S.cfg.foot]:[]).join('\n');
}
function showInv(no,fresh){
  const v=S.i.find(x=>x.no===no);if(!v)return;lastInv=v;
  dlg(dhead(fresh?'تم البيع ✓':'فاتورة رقم '+v.no)+`<div class="db"><div class="paper">${invHTML(v,'screen')}</div>
    <div class="df"><button class="btn" data-act="printinv" data-a="${v.no}">${ic('print')}طباعة</button><button class="btn out" data-act="shareinv" data-a="${v.no}">${ic('share')}مشاركة</button></div>
    <div class="df">${fresh?`<button class="btn gold" data-act="closedlg">فاتورة جديدة</button>`:`<button class="btn red" data-act="cancelinv" data-a="${v.no}">إلغاء الفاتورة</button><button class="btn out" data-act="closedlg">إغلاق</button>`}</div></div>`);
}
function printInv(no){
  const v=S.i.find(x=>x.no===no);if(!v)return;
  const p=S.cfg.paper;
  printHTML(invHTML(v,p==='A4'?'a4':p),p==='A4'?'A4':'auto',p==='A4'?'14mm':'3mm');
}
async function shareInv(no){
  const v=S.i.find(x=>x.no===no);if(!v)return;
  try{if(navigator.share){await navigator.share({text:invText(v)});return}}catch(e){if(e.name==='AbortError')return}
  copy(invText(v),'تم نسخ نص الفاتورة');
}
function cancelInv(no){
  const v=S.i.find(x=>x.no===no);
  if(!v||!confirm('إلغاء الفاتورة رقم '+no+'؟ ستعود الكميات إلى المخزون'+(v.debt?' ويُخصم المبلغ من دين الزبون':'')+'.'))return;
  v.lines.forEach(l=>{const p=find(l.id);if(p)p.qty+=l.q});
  if(v.debt){const d=S.d.find(x=>x.n===v.cust);if(d){d.v=Math.max(0,d.v-v.total);if(!d.v)S.d=S.d.filter(x=>x!==d)}}
  S.i=S.i.filter(x=>x!==v);S.s=S.s.filter(x=>x.no!==no);
  save();closeDlg();renderAll();note('تم إلغاء الفاتورة وإرجاع الكميات');
}
function rInv(){
  const qv=$('iq').value.trim().toLowerCase();
  const all=S.i.slice().reverse().filter(v=>!qv||String(v.no)===qv||('#'+v.no)===qv||(v.cust&&v.cust.toLowerCase().includes(qv)));
  if(!all.length){$('invs').innerHTML=`<div class="empty"><b>${S.i.length?'لا توجد نتيجة':'لا توجد فواتير بعد'}</b>${S.i.length?'جرّب رقماً أو اسم زبون آخر.':'تظهر هنا كل فاتورة بعد تأكيد البيع، ويمكنك إعادة طباعتها.'}</div>`;return}
  const list=all.slice(0,invLimit);let html='',cur='',today=dayKey(Date.now()),yest=dayKey(Date.now()-864e5);
  const tot={};all.forEach(v=>{const k=dayKey(v.ts);tot[k]=(tot[k]||0)+v.total});
  list.forEach(v=>{
    const k=dayKey(v.ts);
    if(k!==cur){cur=k;html+=`<div class="dayh"><span>${k===today?'اليوم':k===yest?'أمس':new Date(v.ts).toLocaleDateString('ar-DZ',{weekday:'long',day:'numeric',month:'long'})}</span><span>${fmt(tot[k])}</span></div>`}
    html+=`<button class="row click" data-act="showinv" data-a="${v.no}"><div class="n"><b>فاتورة #${v.no} ${v.debt?'<span class="tag debt">دين</span>':''}</b><small>${new Date(v.ts).toLocaleTimeString('ar-DZ',{timeStyle:'short'})} · ${v.lines.length} منتج${v.cust?' · '+esc(v.cust):''}</small></div><b>${fmt(v.total)}</b></button>`;
  });
  if(all.length>invLimit)html+=`<button class="btn out block" style="margin-top:10px" data-act="more">عرض المزيد</button>`;
  $('invs').innerHTML='<div class="list">'+html+'</div>';
}

/* ---------- الديون ---------- */
function rDebt(){
  const sum=S.d.reduce((s,d)=>s+d.v,0);
  const last=S.pl.slice(-5).reverse();
  $('debts').innerHTML=`<div class="tiles"><div class="tile"><small>الإجمالي عند الزبائن</small><b>${fmt(sum)}</b></div><div class="tile"><small>عدد الزبائن المدينين</small><b>${S.d.length}</b></div></div>`+
  (S.d.length?`<div class="list">${S.d.map((d,i)=>`<div class="row" style="flex-wrap:wrap"><div class="n"><b>${esc(d.n)}</b><small>عليه ${fmt(d.v)}</small></div>
    <div class="payrow"><input id="pay${i}" type="number" inputmode="decimal" min="0" placeholder="المبلغ" aria-label="مبلغ التسديد"><button class="btn sm" data-act="paydebt" data-a="${i}">تسديد</button><button class="btn out sm" data-act="payall" data-a="${i}">الكل</button></div></div>`).join('')}</div>`
   :`<div class="empty"><b>لا توجد ديون</b>تُسجَّل هنا عندما تختار «بالدين» عند تأكيد البيع.</div>`)+
  (last.length?`<h3 style="margin-top:20px">آخر التسديدات</h3><div class="list">${last.map(p=>`<div class="row"><div class="n"><b>${esc(p.n)}</b><small>${dt(p.ts)}</small></div><b>${fmt(p.v)}</b></div>`).join('')}</div>`:'');
}
function payDebtAt(i,all){
  const d=S.d[i];if(!d)return;
  const v=all?d.v:Math.min(parseFloat($('pay'+i).value)||0,d.v);
  if(!(v>0))return note('اكتب مبلغ التسديد');
  d.v-=v;S.pl.push({ts:Date.now(),n:d.n,v});
  if(d.v<=0)S.d.splice(i,1);
  save();renderAll();note('تم تسجيل التسديد');
}

/* ---------- التقارير ---------- */
function series(r){
  const now=new Date(),out=[];
  if(r==='6m'){for(let k=5;k>=0;k--){const d=new Date(now.getFullYear(),now.getMonth()-k,1);out.push({from:+d,to:+new Date(d.getFullYear(),d.getMonth()+1,1),label:d.toLocaleDateString('ar-DZ',{month:'short'}),full:d.toLocaleDateString('ar-DZ',{month:'long',year:'numeric'}),v:0,g:0,n:0})}}
  else{const n=r==='30'?30:7;for(let k=n-1;k>=0;k--){const d=new Date(now.getFullYear(),now.getMonth(),now.getDate()-k);out.push({from:+d,to:+new Date(d.getFullYear(),d.getMonth(),d.getDate()+1),label:n===7?d.toLocaleDateString('ar-DZ',{weekday:'short'}):String(d.getDate()),full:d.toLocaleDateString('ar-DZ',{weekday:'long',day:'numeric',month:'long'}),v:0,g:0,n:0})}}
  S.s.forEach(s=>{const t=saleTs(s),b=out.find(x=>t>=x.from&&t<x.to);if(b){b.v+=s.v;b.g+=s.g||0;b.n++}});
  return out;
}
const compact=n=>n>=1e6?+(n/1e6).toFixed(1)+' م':n>=1e3?+(n/1e3).toFixed(1)+' ألف':String(Math.round(n));
function niceMax(m){const p=Math.pow(10,Math.floor(Math.log10(m))),f=m/p;return (f<=1?1:f<=2?2:f<=5?5:10)*p}
function chartSVG(data){
  const W=Math.max(300,Math.min(760,($('reps').clientWidth||360)-30)),H=232,pT=12,pB=28,pR=50,pL=6,pw=W-pL-pR,ph=H-pT-pB,n=data.length,step=pw/n,bw=Math.min(step*.62,46),max=niceMax(Math.max(...data.map(d=>d.v),1));
  let g='';
  [0,.5,1].forEach(f=>{const y=pT+ph*(1-f);g+=`<line class="gl" x1="${pL}" x2="${W-pR}" y1="${y}" y2="${y}"/><text class="ax" x="${W-pR+8}" y="${y+4}" text-anchor="start">${compact(max*f)}</text>`});
  data.forEach((d,i)=>{
    const cx=pL+pw-(i+.5)*step,x=cx-bw/2,h=d.v/max*ph,y=pT+ph-h,r=Math.min(4,h/2);
    g+=`<g data-i="${i}"><rect class="hit" x="${cx-step/2}" y="${pT}" width="${step}" height="${ph+pB}"/>`;
    if(d.v>0)g+=`<path class="bar" d="M${x},${pT+ph}V${y+r}a${r},${r} 0 0 1 ${r},-${r}H${x+bw-r}a${r},${r} 0 0 1 ${r},${r}V${pT+ph}Z"/>`;
    if(n<=7||(n-1-i)%5===0||n===6)g+=`<text class="ax" x="${cx}" y="${H-8}" text-anchor="middle">${esc(d.label)}</text>`;
    g+='</g>';
  });
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="رسم بياني للمبيعات" style="direction:ltr">${g}</svg><div class="tip" hidden></div>`;
}
function rRep(){
  const data=series(range),from=data[0].from;
  const tv=data.reduce((a,d)=>a+d.v,0),tg=data.reduce((a,d)=>a+d.g,0),tn=data.reduce((a,d)=>a+d.n,0);
  const agg={};S.i.forEach(v=>{if(v.ts>=from)v.lines.forEach(l=>{const a=agg[l.name]||(agg[l.name]={name:l.name,q:0,v:0});a.q+=l.q;a.v+=l.pr*l.q})});
  const top=Object.values(agg).sort((a,b)=>b.v-a.v).slice(0,5),tmax=top.length?top[0].v:1;
  const val=S.p.reduce((a,p)=>a+p.qty*(p.c||0),0),retail=S.p.reduce((a,p)=>a+p.qty*p.price,0),low=S.p.filter(p=>p.qty<=p.min);
  const debt=S.d.reduce((s,d)=>s+d.v,0);
  const tbl=`<table class="tbl"><thead><tr><th>${range==='6m'?'الشهر':'اليوم'}</th><th>المبيعات</th><th>الربح</th><th>فواتير</th></tr></thead><tbody>${data.slice().reverse().map(d=>`<tr><td>${esc(d.full)}</td><td>${fmt(d.v)}</td><td>${fmt(d.g)}</td><td>${d.n}</td></tr>`).join('')}</tbody></table>`;
  $('reps').innerHTML=`<div class="inrow" style="justify-content:space-between;align-items:center;flex-wrap:wrap;margin-bottom:12px">
    <div class="seg" role="group" aria-label="الفترة"><button data-act="range" data-a="7" aria-pressed="${range==='7'}">7 أيام</button><button data-act="range" data-a="30" aria-pressed="${range==='30'}">30 يوماً</button><button data-act="range" data-a="6m" aria-pressed="${range==='6m'}">6 أشهر</button></div></div>
  <div class="tiles"><div class="tile"><small>المبيعات</small><b>${fmt(tv)}</b></div><div class="tile"><small>الربح</small><b>${fmt(tg)}</b></div><div class="tile"><small>عدد الفواتير</small><b>${tn}</b></div><div class="tile"><small>متوسط الفاتورة</small><b>${fmt(tn?Math.round(tv/tn):0)}</b></div></div>
  <div class="card"><div class="hd"><h3>المبيعات حسب ${range==='6m'?'الشهر':'اليوم'}</h3><button class="btn out sm" data-act="rtable">${repTable?'عرض الرسم':'عرض كجدول'}</button></div>
    ${repTable?tbl:`<div class="chart" id="chart">${chartSVG(data)}</div>`}</div>
  <div class="card"><div class="hd"><h3>الأكثر مبيعاً في هذه الفترة</h3></div>${top.length?top.map(t=>`<div class="tp"><span class="nm">${esc(t.name)}</span><span class="tr"><i style="width:${Math.max(3,t.v/tmax*100)}%"></i></span><b>${fmt(t.v)}</b></div>`).join(''):'<div class="cart-empty">تظهر هنا المنتجات الأكثر مبيعاً بعد أول فاتورة.</div>'}</div>
  <div class="tiles"><div class="tile"><small>قيمة المخزون بسعر الشراء</small><b>${fmt(val)}</b></div><div class="tile"><small>قيمته بسعر البيع</small><b>${fmt(retail)}</b></div><div class="tile ${debt?'warn':''}"><small>الديون عند الزبائن</small><b>${fmt(debt)}</b></div><div class="tile ${low.length?'warn':''}"><small>منتجات ناقصة</small><b>${low.length}</b></div></div>
  ${low.length?`<div class="card"><div class="hd"><h3>ينقص في المخزون</h3></div><div>${low.map(p=>`<span class="tag low" style="margin:2px">${esc(p.name)} · ${p.qty}</span>`).join(' ')}</div></div>`:''}
  <p class="muted sm">الربح يُحسب للمنتجات التي أدخلت لها سعر الشراء.</p>`;
  const ch=$('chart');
  if(ch){
    const tip=ch.querySelector('.tip');
    const show=e=>{const g=e.target.closest('[data-i]');if(!g){tip.hidden=true;return}
      const d=data[+g.dataset.i],gr=g.getBoundingClientRect(),cr=ch.getBoundingClientRect(),bar=g.querySelector('.bar'),br=(bar||g.querySelector('.hit')).getBoundingClientRect();
      tip.innerHTML=`<b>${esc(d.full)}</b><br>المبيعات: ${fmt(d.v)}<br>الربح: ${fmt(d.g)}<br>${d.n} فاتورة`;tip.hidden=false;
      let x=gr.left+gr.width/2-cr.left;x=Math.max(70,Math.min(cr.width-70,x));
      tip.style.left=x+'px';tip.style.top=Math.max(tip.offsetHeight+4,br.top-cr.top-6)+'px'};
    ch.onpointermove=show;ch.onpointerdown=show;ch.onpointerleave=()=>{tip.hidden=true};
  }
}

/* ---------- النسخ الاحتياطي ---------- */
function bkBanner(){
  const need=(S.s.length||S.p.length)&&Date.now()-(S.cfg.lb||0)>7*864e5;
  const h=need?`<div class="banner">${ic('down')}<span>${S.cfg.lb?'مرّ أكثر من أسبوع على آخر نسخة احتياطية.':'لم تحفظ نسخة احتياطية بعد.'} إن ضاع الهاتف أو مُسحت بيانات المتصفح تضيع بياناتك.</span><button class="btn sm" data-act="dlbk">احفظ نسخة</button></div>`:'';
  $('bk-sell').innerHTML=h;$('bk-rep').innerHTML=h;
}
function backupJSON(){return JSON.stringify(S)}
function bkName(){return 'daftar-mahal-'+dayKey(Date.now())+'.json'}
function downloadBackup(){
  const blob=new Blob([backupJSON()],{type:'application/json'}),a=document.createElement('a');
  a.href=URL.createObjectURL(blob);a.download=bkName();document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),5000);
  S.cfg.lb=Date.now();save();renderAll();note('تم حفظ النسخة الاحتياطية في الجهاز');
}
async function shareBackup(){
  try{
    const f=new File([backupJSON()],bkName(),{type:'application/json'});
    if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],title:'نسخة دفتر المحل'});S.cfg.lb=Date.now();save();renderAll();return}
  }catch(e){if(e.name==='AbortError')return}
  downloadBackup();
}
function applyImport(text){
  let d;try{d=JSON.parse(text)}catch(e){}
  if(!d||!Array.isArray(d.p)||!Array.isArray(d.d)||!Array.isArray(d.s)){note('الملف غير صالح. اختر نسخة احتياطية من دفتر المحل.');return}
  if(!confirm('سيتم استبدال بيانات هذا الجهاز ببيانات النسخة ('+d.p.length+' منتج، '+(d.i?d.i.length:d.s.length)+' عملية بيع). هل تريد المتابعة؟'))return;
  try{localStorage.setItem('dm_prev',JSON.stringify(S))}catch(e){}
  S=norm(d);save();Object.keys(cart).forEach(k=>delete cart[k]);renderAll();note('تم استيراد البيانات');
}
function importFile(inp){
  const f=inp.files&&inp.files[0];if(!f)return;
  const r=new FileReader();r.onload=()=>applyImport(String(r.result));r.readAsText(f);inp.value='';
}

/* ---------- الإعدادات ---------- */
let ip=null;
const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent),standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone;
function rSet(){
  const c=S.cfg;
  const el=document.activeElement;if(el&&$('sets').contains(el)&&el.matches('input,select'))return;
  $('sets').innerHTML=`
  <div class="card"><div class="hd"><h3>بيانات المحل (تظهر على الفاتورة)</h3></div>
    <label class="field"><span>اسم المحل</span><input data-in="cfg" data-a="shop" value="${esc(c.shop)}" autocomplete="off"></label>
    <div class="two"><label class="field"><span>الهاتف</span><input data-in="cfg" data-a="phone" value="${esc(c.phone)}" inputmode="tel" dir="ltr" style="text-align:end"></label>
    <label class="field"><span>العنوان</span><input data-in="cfg" data-a="addr" value="${esc(c.addr)}"></label></div>
    <label class="field"><span>عبارة أسفل الفاتورة</span><input data-in="cfg" data-a="foot" value="${esc(c.foot)}"></label>
    <div class="two"><label class="field"><span>ورق الطباعة</span><select data-chg="cfgsel" data-a="paper"><option value="80" ${c.paper==='80'?'selected':''}>طابعة وصلات 80 مم</option><option value="58" ${c.paper==='58'?'selected':''}>طابعة وصلات 58 مم</option><option value="A4" ${c.paper==='A4'?'selected':''}>ورقة A4</option></select></label>
    <label class="field"><span>المظهر</span><select data-chg="cfgsel" data-a="theme"><option value="auto" ${c.theme==='auto'?'selected':''}>حسب الجهاز</option><option value="light" ${c.theme==='light'?'selected':''}>فاتح</option><option value="dark" ${c.theme==='dark'?'selected':''}>داكن</option></select></label></div></div>

  <div class="card"><div class="hd"><h3>النسخ الاحتياطي</h3><span class="muted sm">${c.lb?'آخر نسخة: '+dt(c.lb):'لم تُحفظ نسخة بعد'}</span></div>
    <p class="muted sm" style="margin-top:0">بياناتك محفوظة في هذا الجهاز فقط. احفظ نسخة كل أسبوع وأرسلها إلى واتساب أو بريدك أو Google Drive. لنقل البيانات إلى جهاز آخر (هاتف ← حاسوب) احفظ نسخة هنا ثم استوردها هناك.</p>
    <div class="df"><button class="btn" data-act="dlbk">${ic('down')}حفظ نسخة في الجهاز</button><button class="btn out" data-act="shbk">${ic('share')}إرسال نسخة</button></div>
    <div class="df"><label class="btn out" style="cursor:pointer">${ic('up')}استيراد من ملف<input type="file" accept=".json,application/json" data-chg="impfile" hidden></label><button class="btn out" data-act="bktxt">نسخ/لصق كنص</button></div></div>

  <div class="card" id="inst-card" ${standalone?'hidden':''}><div class="hd"><h3>تثبيت التطبيق</h3></div>
    <p class="muted sm" style="margin-top:0">${isIOS?'في آيفون: افتح الصفحة في Safari، اضغط زر المشاركة ثم «إضافة إلى الشاشة الرئيسية».':'ثبّت التطبيق ليظهر كأيقونة على سطح المكتب أو الشاشة الرئيسية ويعمل بدون إنترنت.'}</p>
    <button class="btn" id="inst" data-act="install" ${ip?'':'hidden'}>${ic('down')}تثبيت التطبيق</button></div>

  <div class="card"><div class="hd"><h3>الحساب</h3><span class="muted sm">${AUTH?esc(AUTH.u):''}</span></div>
    <div class="df"><button class="btn out" data-act="chpw">${ic('lock')}تغيير كلمة المرور</button><button class="btn red" data-act="logout">${ic('logout')}تسجيل الخروج</button></div></div>

  <div class="card"><div class="hd"><h3>البيانات</h3></div>
    <button class="btn red" data-act="wipe">${ic('trash')}مسح كل البيانات</button>
    <p class="muted sm">دفتر المحل · الإصدار 2.0 · ${S.p.length} منتج · ${S.i.length} فاتورة</p></div>`;
}
function bkText(){
  dlg(dhead('نسخ احتياطي كنص')+`<div class="db"><p class="muted sm" style="margin-top:0">انسخ النص ثم الصقه في رسالة لنفسك. للاستعادة الصق النص هنا واضغط «استيراد».</p>
    <textarea id="bkt" rows="6" style="font:12px monospace;direction:ltr"></textarea>
    <div class="df"><button class="btn" data-act="cpbk">نسخ البيانات</button><button class="btn out" data-act="imptxt">استيراد</button></div></div>`);
}
function applyTheme(){
  const t=S.cfg.theme,r=document.documentElement;
  if(t==='auto')r.removeAttribute('data-theme');else r.setAttribute('data-theme',t);
  const dark=t==='dark'||(t==='auto'&&matchMedia('(prefers-color-scheme: dark)').matches);
  $('tc').content=dark?'#050A1C':'#0A1A4A';
}

/* ---------- طباعة ---------- */
function printHTML(html,size,margin){
  $('printarea').innerHTML=html;
  let st=$('pgst');if(!st){st=document.createElement('style');st.id='pgst';document.head.appendChild(st)}
  st.textContent='@page{'+(size==='auto'?'':'size:'+size+';')+'margin:'+margin+'}';
  closeDlg();document.body.classList.add('printing');
  setTimeout(()=>window.print(),80);
}
addEventListener('afterprint',()=>{document.body.classList.remove('printing');$('printarea').innerHTML=''});

/* ---------- الكاميرا والباركود ---------- */
let stream=null,scanTarget='sell';
async function scan(t){
  scanTarget=t||'sell';
  if(!('BarcodeDetector' in window)||!navigator.mediaDevices){note('المسح بالكاميرا غير مدعوم في هذا المتصفح. اكتب الباركود أو استعمل قارئ باركود USB.');return}
  try{
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});
    const v=$('camv');v.srcObject=stream;await v.play();$('cam').classList.add('on');
    const det=new BarcodeDetector();
    const loop=async()=>{if(!stream)return;try{const r=await det.detect(v);if(r.length){const c=r[0].rawValue;stopCam();if(scanTarget==='sell')byCode(c);else{const f=$(scanTarget);if(f)f.value=c}return}}catch(e){}setTimeout(loop,250)};
    loop();
  }catch(e){stopCam();note('تعذّر فتح الكاميرا. تأكد من السماح بها.')}
}
function stopCam(){if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;$('cam').classList.remove('on')}
/* قارئ باركود USB يكتب الأرقام بسرعة ثم Enter */
let buf='',bt=0;
addEventListener('keydown',e=>{
  if(view!=='sell'||$('dlg').open||document.body.classList.contains('locked'))return;
  const tg=e.target;if(tg&&tg.matches&&tg.matches('input,textarea,select')&&tg.id!=='q')return;
  if(tg&&tg.id==='q'&&e.key==='Enter'){e.preventDefault();const v=$('q').value.trim();if(v){if(S.p.some(x=>x.bc&&String(x.bc)===v))byCode(v);else{const l=S.p.filter(p=>p.qty>0&&p.name.toLowerCase().includes(v.toLowerCase()));if(l.length===1){addCart(l[0].id);$('q').value='';rList()}else note(l.length?'اختر المنتج من القائمة':'لا يوجد منتج بهذا الاسم أو الباركود')}}return}
  const now=Date.now();if(now-bt>80)buf='';bt=now;
  if(e.key==='Enter'){if(buf.length>=4){byCode(buf);e.preventDefault()}buf=''}else if(e.key.length===1)buf+=e.key;
});

/* ---------- أحداث ---------- */
const A={
  go:v=>go(v),
  add:id=>addCart(+id),inc:id=>chg(+id,1),dec:id=>chg(+id,-1),
  setc:(id,el)=>{const p=find(+id),n=parseInt(el.value)||0;if(n<=0)delete cart[id];else cart[id]=Math.min(n,p.qty);rList();rCart()},
  clear:()=>{Object.keys(cart).forEach(k=>delete cart[k]);rList();rCart()},
  cart:()=>{cartOpen=!cartOpen;rCart()},
  pay:v=>{payDebt=v==='debt';setPay();if(payDebt)$('who').focus()},
  checkout,scan:t=>scan(t),stopcam:stopCam,
  newp:()=>openProd(),quick:openQuick,quickpick:i=>quickPick(i),quickother:()=>openProd(),pickem:e=>pickEm(e),editp:id=>openProd(+id),savep:id=>saveProd(id),delp:id=>delProd(+id),gen:()=>{$('f-bc').value=genCode()},
  pf:v=>{pf=v;rProd()},lbl:id=>openLabels(+id),printlbl:id=>printLabels(+id),
  showinv:no=>showInv(+no),printinv:no=>printInv(+no),shareinv:no=>shareInv(+no),cancelinv:no=>cancelInv(+no),more:()=>{invLimit+=60;rInv()},
  paydebt:i=>payDebtAt(+i,false),payall:i=>payDebtAt(+i,true),
  range:r=>{range=r;rRep()},rtable:()=>{repTable=!repTable;rRep()},
  dlbk:downloadBackup,shbk:shareBackup,bktxt:bkText,cpbk:()=>{$('bkt').value=backupJSON();copy(backupJSON(),'تم نسخ البيانات')},imptxt:()=>{const t=$('bkt').value.trim();if(t){closeDlg();applyImport(t)}else note('الصق النص أولاً')},
  impfile:(a,el)=>importFile(el),
  cfgsel:(k,el)=>{S.cfg[k]=el.value;save();applyTheme()},
  install:async()=>{if(!ip)return;ip.prompt();await ip.userChoice;ip=null;rSet()},
  wipe:()=>{if(confirm('سيتم مسح كل المنتجات والفواتير والديون من هذا الجهاز. هل أنت متأكد؟')&&confirm('تأكيد أخير: لا يمكن التراجع إلا بنسخة احتياطية.')){try{localStorage.setItem('dm_prev',JSON.stringify(S))}catch(e){}S=norm({});save();renderAll();note('تم مسح البيانات')}},
  logout:()=>logout(),chpw:()=>openChpw(),savepw:()=>savePw(),
  closedlg:closeDlg
};
document.addEventListener('click',e=>{const t=e.target.closest('[data-act]');if(t&&A[t.dataset.act]){if(t.tagName==='LABEL')return;A[t.dataset.act](t.dataset.a,t,e)}});
document.addEventListener('change',e=>{const t=e.target.closest('[data-chg]');if(t&&A[t.dataset.chg])A[t.dataset.chg](t.dataset.a,t,e)});
document.addEventListener('input',e=>{
  const t=e.target.closest('[data-in]');if(!t)return;
  const k=t.dataset.in;
  if(k==='rl')rList();else if(k==='rp')rProd();else if(k==='ri'){invLimit=60;rInv()}else if(k==='rc')rCart();
  else if(k==='emguess')guessInForm();
  else if(k==='cfg'){S.cfg[t.dataset.a]=t.value;save();headerUpdate()}
});

/* ---------- عرض ---------- */
function headerUpdate(){
  const td=dayKey(Date.now()),sum=S.s.filter(s=>dayKey(saleTs(s))===td).reduce((a,s)=>a+s.v,0);
  $('today').textContent=fmt(sum);$('today2').textContent=fmt(sum);
  const tds=S.s.filter(s=>dayKey(saleTs(s))===td),hr=new Date().getHours();
  $('h-today').textContent=fmt(sum);$('h-n').textContent=tds.length;$('h-g').textContent=fmt(tds.reduce((a,s)=>a+(s.g||0),0));
  $('h-hello').textContent=(hr<12?'صباح الخير':hr<18?'نهارك سعيد':'مساء الخير')+'، أهلاً بك';
  $('h-date').textContent=new Date().toLocaleDateString('ar-DZ',{weekday:'long',day:'numeric',month:'long'});
  $('shopn').textContent=shopName();$('shopn2').textContent=shopName();
  document.title=shopName();
}
function renderAll(){
  headerUpdate();bkBanner();
  if(view==='sell'){rList();rCart()}
  else if(view==='prod')rProd();
  else if(view==='inv')rInv();
  else if(view==='debt')rDebt();
  else if(view==='rep')rRep();
  else if(view==='set')rSet();
  if(view!=='sell')$('cartbar').hidden=true;
}

addEventListener('beforeinstallprompt',e=>{e.preventDefault();ip=e;if(view==='set')rSet()});
addEventListener('appinstalled',()=>{ip=null;if(view==='set')rSet()});
addEventListener('hashchange',()=>{const v=location.hash.slice(1);if(VIEWS.includes(v)&&v!==view)go(v)});
addEventListener('resize',()=>{if(view==='rep')rRep()});
try{matchMedia('(prefers-color-scheme: dark)').addEventListener('change',applyTheme)}catch(e){}
if(navigator.storage&&navigator.storage.persist)navigator.storage.persist().catch(()=>{});
applyTheme();save();
go(VIEWS.includes(location.hash.slice(1))?location.hash.slice(1):'sell');

/* ---------- الدخول (قفل محلي على هذا الجهاز) ---------- */
const rnd=()=>Array.from(crypto.getRandomValues(new Uint8Array(12)),b=>b.toString(16).padStart(2,'0')).join('');
async function hashPw(pw,salt){
  const s=salt+'|'+pw;
  try{const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('')}
  catch(e){let h=5381;for(const c of s)h=((h<<5)+h+c.charCodeAt(0))|0;return 'f'+(h>>>0).toString(16)}
}
const isIn=()=>!!AUTH&&(sessionStorage.getItem(SK)==='1'||localStorage.getItem(SK)===AUTH.id);
function pwField(id,label,ph){return `<label class="field"><span>${label}</span><div class="pw">${ic('lock')}<input id="${id}" type="password" placeholder="${ph||''}" autocomplete="${id==='lg-p'&&AUTH?'current-password':'new-password'}"><button type="button" class="eye" data-act="eye" data-a="${id}" aria-label="إظهار أو إخفاء كلمة المرور">${ic('eye')}</button></div></label>`}
let forceNew=false;
function showLogin(){
  document.body.classList.add('locked');
  const setup=!AUTH||forceNew,L=$('login');L.hidden=false;
  L.innerHTML=`<div class="lg-art"><div class="lg-logo"><img src="icon-192.png" alt=""></div>
    <h1>دفتر المحل</h1><p>مبيعاتك ومخزونك وديونك في مكان واحد، حتى بدون إنترنت.</p>
    <ul class="lg-feat"><li>${ic('cart')}بيع سريع بالباركود</li><li>${ic('doc')}فواتير جاهزة للطباعة</li><li>${ic('chart')}تقارير الربح</li></ul></div>
  <div class="lg-card">${AUTH?`<div class="seg lg-tabs" role="group" aria-label="نوع الدخول"><button type="button" data-act="lgtab" data-a="old" aria-pressed="${!setup}">حسابي المسجّل</button><button type="button" data-act="lgtab" data-a="new" aria-pressed="${setup}">حساب جديد</button></div>`:''}
    <h2>${setup?'أنشئ حساباً جديداً':'مرحباً بعودتك'}</h2>
    <p class="muted">${setup?(AUTH?'سيحلّ هذا الحساب محل الحساب الحالي على هذا الجهاز.':'خطوة واحدة فقط: اختر اسماً وكلمة مرور تحمي بيانات محلك على هذا الجهاز.'):'سجّل دخولك لفتح دفتر محلك: '+esc(AUTH.u)}</p>
    <form id="lf" novalidate>
      ${setup?`<label class="field"><span>اسم المحل</span><div class="pw">${ic('store')}<input id="lg-s" value="${esc(S.cfg.shop)}" autocomplete="organization" placeholder="مثال: سوبيريت الأمل"></div></label>`:''}
      <label class="field"><span>اسم المستخدم</span><div class="pw">${ic('user')}<input id="lg-u" autocomplete="username" placeholder="${setup?'مثال: أحمد':''}" ${setup?'':`value="${esc(AUTH.u)}"`}></div></label>
      ${pwField('lg-p','كلمة المرور',setup?'4 أحرف أو أرقام على الأقل':'')}
      ${setup?pwField('lg-p2','تأكيد كلمة المرور'):''}
      ${setup&&AUTH?`<label class="chk"><input type="checkbox" id="lg-k" checked><span>احتفظ بمنتجات وفواتير وديون المحل الحالي في الحساب الجديد</span></label>`:''}
      <label class="chk"><input type="checkbox" id="lg-r" checked><span>أبقِني مسجّلاً على هذا الجهاز</span></label>
      <div class="lg-err" id="lg-e" role="alert"></div>
      <button class="btn gold block lg-go" type="submit">${setup?'إنشاء الحساب والدخول':'تسجيل الدخول'}</button>
      ${setup?'':`<button class="lg-link" type="button" data-act="forgot">نسيت كلمة المرور؟</button>`}
      ${setup&&AUTH?`<button class="lg-link" type="button" data-act="lgtab" data-a="old">العودة إلى حسابي المسجّل</button>`:''}
    </form></div>`;
  $('lf').addEventListener('submit',submitLogin);
  setTimeout(()=>$(setup?'lg-s':'lg-p').focus(),60);
}
function lgErr(m){const e=$('lg-e');e.textContent=m;const c=document.querySelector('.lg-card');c.classList.remove('shake');void c.offsetWidth;c.classList.add('shake')}
async function submitLogin(ev){
  ev.preventDefault();
  const u=$('lg-u').value.trim(),p=$('lg-p').value;
  if(!u)return lgErr('اكتب اسم المستخدم');
  if(!AUTH||forceNew){
    if(p.length<4)return lgErr('كلمة المرور قصيرة: 4 أحرف أو أرقام على الأقل');
    if(p!==$('lg-p2').value)return lgErr('كلمتا المرور غير متطابقتين');
    const had=!!AUTH,keep=!had||$('lg-k').checked;
    if(had&&!keep){
      if(!confirm('سيبدأ الحساب الجديد بمحل فارغ. تُحفظ بيانات الحساب السابق احتياطياً في الجهاز (يمكن استعادتها بنسخة احتياطية). هل تريد المتابعة؟'))return;
      try{localStorage.setItem('dm_prev',JSON.stringify(S))}catch(e){}
      S=norm({});
    }
    const salt=rnd();AUTH={id:rnd(),u,salt,h:await hashPw(p,salt)};
    localStorage.setItem(AK,JSON.stringify(AUTH));
    const s=$('lg-s').value.trim();if(s)S.cfg.shop=s;
    save();forceNew=false;
  }else{
    if(u.toLowerCase()!==AUTH.u.toLowerCase()||await hashPw(p,AUTH.salt)!==AUTH.h)return lgErr('اسم المستخدم أو كلمة المرور غير صحيحة');
  }
  if($('lg-r').checked){localStorage.setItem(SK,AUTH.id);sessionStorage.removeItem(SK)}else{sessionStorage.setItem(SK,'1');localStorage.removeItem(SK)}
  unlock();
}
function unlock(){
  forceNew=false;
  document.body.classList.remove('locked');$('login').hidden=true;$('login').innerHTML='';
  renderAll();note('أهلاً بك '+AUTH.u);
}
function logout(){localStorage.removeItem(SK);sessionStorage.removeItem(SK);closeDlg();forceNew=false;showLogin()}
function forgotPw(){
  if(!confirm('سيتم حذف كلمة المرور فقط، وتبقى منتجاتك وفواتيرك كما هي. ثم تنشئ حساباً جديداً. هل تريد المتابعة؟'))return;
  localStorage.removeItem(AK);localStorage.removeItem(SK);sessionStorage.removeItem(SK);AUTH=null;forceNew=false;showLogin();
}
function openChpw(){
  dlg(dhead('تغيير كلمة المرور')+`<div class="db">${fld('cp-o','كلمة المرور الحالية','','type="password" autocomplete="current-password"')}
    ${fld('cp-n','كلمة المرور الجديدة','','type="password" autocomplete="new-password"')}${fld('cp-n2','تأكيد الجديدة','','type="password" autocomplete="new-password"')}
    <div class="df"><button class="btn" data-act="savepw">حفظ</button><button class="btn out" data-act="closedlg">إلغاء</button></div></div>`);
}
async function savePw(){
  const o=$('cp-o').value,n=$('cp-n').value;
  if(await hashPw(o,AUTH.salt)!==AUTH.h)return note('كلمة المرور الحالية غير صحيحة');
  if(n.length<4)return note('الجديدة قصيرة: 4 أحرف على الأقل');
  if(n!==$('cp-n2').value)return note('كلمتا المرور غير متطابقتين');
  AUTH.salt=rnd();AUTH.h=await hashPw(n,AUTH.salt);localStorage.setItem(AK,JSON.stringify(AUTH));
  closeDlg();note('تم تغيير كلمة المرور');
}
A.eye=(id)=>{const i=$(id);i.type=i.type==='password'?'text':'password'};
A.forgot=forgotPw;
A.lgtab=t=>{forceNew=t==='new';showLogin()};
if(isIn()){document.body.classList.remove('locked');$('login').hidden=true}else showLogin();
if('serviceWorker' in navigator)addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
