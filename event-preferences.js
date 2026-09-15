const PREF_API='https://nmeoakrpafxhpdrplsuo.supabase.co/functions/v1/vmeste-preferences-api';

async function prefRaw(action,payload={},retry=true){
  const headers={'Content-Type':'application/json'};
  if(session?.access_token)headers.Authorization='Bearer '+session.access_token;
  const r=await fetch(PREF_API,{method:'POST',headers,body:JSON.stringify({action,...payload})});
  let data={};try{data=await r.json()}catch{data={error:'Некорректный ответ сервера'}}
  if(r.status===401&&retry&&await refreshSession())return prefRaw(action,payload,false);
  if(!r.ok)throw new Error(data.error||'Ошибка запроса');
  return data;
}

const baseRenderEventDetail=renderEventDetail;
renderEventDetail=function(data){
  baseRenderEventDetail(data);
  injectEventPreferences(data.event.id);
};

async function injectEventPreferences(eventId){
  const title=document.querySelector('.eventDetailTitle');
  if(!title)return;
  const bar=document.createElement('div');
  bar.className='eventPrefBar';
  bar.innerHTML='<button id="event-like" class="eventPrefButton">♡ Нравится</button><button id="event-compare" class="eventPrefButton">⇄ Сравнить</button><button id="event-open-compare" class="eventCompareOpen" hidden></button>';
  title.insertAdjacentElement('afterend',bar);
  const like=bar.querySelector('#event-like');
  const compare=bar.querySelector('#event-compare');
  const open=bar.querySelector('#event-open-compare');
  try{
    const state=await prefRaw('state',{event_id:eventId});
    applyPrefState(state,like,compare,open);
  }catch(err){bar.title=err.message}
  like.onclick=async()=>{
    like.disabled=true;
    try{const r=await prefRaw('toggle_like',{event_id:eventId});like.classList.toggle('active',r.liked);like.textContent=r.liked?'♥ Нравится':'♡ Нравится'}catch(err){alert(err.message)}finally{like.disabled=false}
  };
  compare.onclick=async()=>{
    compare.disabled=true;
    try{const r=await prefRaw('toggle_compare',{event_id:eventId});compare.classList.toggle('active',r.compared);compare.textContent=r.compared?'✓ В сравнении':'⇄ Сравнить';updateCompareOpen(open,r.compare_count)}catch(err){alert(err.message)}finally{compare.disabled=false}
  };
  open.onclick=()=>openComparison();
}

function applyPrefState(state,like,compare,open){
  like.classList.toggle('active',state.liked);like.textContent=state.liked?'♥ Нравится':'♡ Нравится';
  compare.classList.toggle('active',state.compared);compare.textContent=state.compared?'✓ В сравнении':'⇄ Сравнить';
  updateCompareOpen(open,state.compare_count||0);
}
function updateCompareOpen(button,count){
  button.hidden=count<2;
  button.textContent=count>=2?`Сравнить выбранные · ${count}`:'';
}
function compareStatusLabel(s){return s==='creator'?'Организатор':s==='going'?'Я иду':s==='declined'?'Не смогу':'—'}
function compareWhen(v){return new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Moscow'}).format(new Date(v))}

async function openComparison(){
  closeComparison();
  const overlay=document.createElement('div');overlay.id='event-compare-overlay';overlay.className='compareOverlay';
  overlay.innerHTML='<div class="compareSheet"><div class="compareHeader"><div><span class="ey">СРАВНЕНИЕ</span><h2>Выбранные события</h2></div><button id="compare-close">×</button></div><div id="compare-body"><p class="muted">Загружаю…</p></div></div>';
  document.body.appendChild(overlay);
  overlay.querySelector('#compare-close').onclick=closeComparison;
  overlay.onclick=e=>{if(e.target===overlay)closeComparison()};
  await renderComparison();
}
function closeComparison(){document.querySelector('#event-compare-overlay')?.remove()}

async function renderComparison(){
  const root=document.querySelector('#compare-body');if(!root)return;
  try{
    const data=await prefRaw('compare_list');const events=data.events||[];
    if(events.length<2){root.innerHTML='<p class="muted">Для сравнения выберите минимум два события.</p>';return}
    root.innerHTML=`<div class="compareScroller"><div class="compareGrid" style="--cols:${events.length}">
      <div class="compareLabel"></div>${events.map(e=>`<div class="compareEventHead">${e.cover_url?`<img src="${eventEsc(e.cover_url)}" alt="">`:'<div class="compareCoverPlaceholder">В</div>'}<h3>${eventEsc(e.title)}</h3><button class="compareRemove" data-remove-compare="${eventEsc(e.id)}">Убрать</button></div>`).join('')}
      <div class="compareLabel">Когда</div>${events.map(e=>`<div>${eventEsc(compareWhen(e.starts_at))}</div>`).join('')}
      <div class="compareLabel">Где</div>${events.map(e=>`<div>${eventEsc(e.location_name||'Не указано')}</div>`).join('')}
      <div class="compareLabel">Организатор</div>${events.map(e=>`<div>${eventEsc(e.creator_name)}</div>`).join('')}
      <div class="compareLabel">Пойдут</div>${events.map(e=>`<div>${e.participant_counts?.going||0}</div>`).join('')}
      <div class="compareLabel">Мой статус</div>${events.map(e=>`<div>${eventEsc(compareStatusLabel(e.my_status))}</div>`).join('')}
      <div class="compareLabel">Источник</div>${events.map(e=>`<div>${e.source_url?`<a href="${eventEsc(e.source_url)}" target="_blank" rel="noopener">Открыть ↗</a>`:'—'}</div>`).join('')}
    </div></div>`;
    root.querySelectorAll('[data-remove-compare]').forEach(btn=>btn.onclick=async()=>{try{await prefRaw('toggle_compare',{event_id:btn.dataset.removeCompare});await renderComparison();if(activeEventId)injectPreferenceRefresh(activeEventId)}catch(err){alert(err.message)}});
  }catch(err){root.innerHTML=`<div class="status error">${eventEsc(err.message)}</div>`}
}
async function injectPreferenceRefresh(eventId){
  const like=document.querySelector('#event-like'),compare=document.querySelector('#event-compare'),open=document.querySelector('#event-open-compare');
  if(!like||!compare||!open)return;
  try{applyPrefState(await prefRaw('state',{event_id:eventId}),like,compare,open)}catch{}
}
