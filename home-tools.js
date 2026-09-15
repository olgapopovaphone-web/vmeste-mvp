(function(){
  const bellSvg='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path><path d="M10 21h4"></path></svg>';
  const heartSvg='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8z"></path></svg>';
  const compareSvg='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 7h11"></path><path d="m16 4 3 3-3 3"></path><path d="M16 17H5"></path><path d="m8 14-3 3 3 3"></path></svg>';
  let notificationCount=0;

  function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':'&quot;',"'":'&#39;'}[c]))}
  function formatDate(v){try{return new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Moscow'}).format(new Date(v))}catch{return ''}}
  function toolButton(cls,label,svg){return `<button class="homeToolButton ${cls}" type="button" aria-label="${label}" title="${label}">${svg}<span class="homeToolBadge" hidden></span></button>`}

  function bindHomeActions(wrap){
    if(!wrap||wrap.dataset.bound==='1')return;
    const n=wrap.querySelector('.homeNotifications');if(n)n.onclick=openNotifications;
    const l=wrap.querySelector('.homeLiked');if(l)l.onclick=openLiked;
    const c=wrap.querySelector('.homeCompare');if(c)c.onclick=openCompare;
    wrap.dataset.bound='1';
  }

  function mountHomeTools(){
    const home=document.querySelector('[data-view="home"]');
    const top=home?.querySelector('.top');
    const avatar=top?.querySelector('.avatar.js-profile');
    if(!top||!avatar)return;
    let wrap=top.querySelector('.homeTopActions');
    if(!wrap){
      wrap=document.createElement('div');wrap.className='homeTopActions';
      wrap.innerHTML=toolButton('homeNotifications','Оповещения',bellSvg)+toolButton('homeLiked','Понравилось',heartSvg)+toolButton('homeCompare','Сравнение',compareSvg);
      avatar.before(wrap);wrap.appendChild(avatar);
    }
    bindHomeActions(wrap);
    refreshBadges();
  }

  function setBadge(selector,value){
    const badge=document.querySelector(selector+' .homeToolBadge');if(!badge)return;
    const n=Number(value)||0;
    const hidden=n<=0;
    const text=n>99?'99+':String(n);
    if(badge.hidden!==hidden)badge.hidden=hidden;
    if(badge.textContent!==text)badge.textContent=text;
  }
  function refreshBadges(){
    setBadge('.homeNotifications',notificationCount);
    try{setBadge('.homeLiked',typeof afishaLiked!=='undefined'?afishaLiked.size:0)}catch{setBadge('.homeLiked',0)}
    try{setBadge('.homeCompare',typeof afishaCompared!=='undefined'?afishaCompared.size:0)}catch{setBadge('.homeCompare',0)}
  }

  function closeSheet(){document.querySelector('.homeToolsOverlay')?.remove()}
  function sheet(title,body){
    closeSheet();const overlay=document.createElement('div');overlay.className='homeToolsOverlay';
    overlay.innerHTML=`<div class="homeToolsSheet"><div class="homeToolsHead"><h2>${esc(title)}</h2><button class="homeToolsClose" aria-label="Закрыть">×</button></div><div class="homeToolsBody">${body}</div></div>`;
    document.body.appendChild(overlay);overlay.querySelector('.homeToolsClose').onclick=closeSheet;overlay.onclick=e=>{if(e.target===overlay)closeSheet()};return overlay;
  }
  function needLogin(){openView('login')}

  async function fetchNotifications(){
    if(!account){notificationCount=0;refreshBadges();return []}
    try{const data=await api('list_events');const pending=(data.invited_events||[]).filter(e=>e.invitation_status==='pending');notificationCount=pending.length;refreshBadges();return pending}catch{notificationCount=0;refreshBadges();return []}
  }
  async function openNotifications(){
    if(!account){needLogin();return}
    const overlay=sheet('Оповещения','<div class="homeToolsEmpty">Загружаю…</div>');
    const body=overlay.querySelector('.homeToolsBody');const items=await fetchNotifications();
    if(!document.body.contains(overlay))return;
    if(!items.length){body.innerHTML='<div class="homeToolsEmpty">Новых уведомлений пока нет.</div>';return}
    body.innerHTML=items.map(e=>`<article class="homeNotification"><small>ПРИГЛАШЕНИЕ</small><h3>${esc(e.title)}</h3><p>${esc(formatDate(e.starts_at))}${e.location_name?' · '+esc(e.location_name):''}</p><div class="homeNotificationActions"><button class="smallPrimary notifAnswer" data-id="${esc(e.invitation_id)}" data-response="accepted">Принять приглашение</button><button class="repeat notifAnswer" data-id="${esc(e.invitation_id)}" data-response="declined">Отклонить</button></div></article>`).join('');
    body.querySelectorAll('.notifAnswer').forEach(btn=>btn.onclick=async()=>{btn.disabled=true;try{await respondInvitation(btn.dataset.id,btn.dataset.response);await openNotifications()}catch(err){alert(err.message);btn.disabled=false}});
  }

  async function openLiked(){
    if(!account){needLogin();return}
    try{if(typeof loadAfisha==='function'&&(!afishaEvents||!afishaEvents.length))await loadAfisha()}catch{}
    let items=[];try{items=afishaEvents.filter(e=>afishaLiked.has(e.id))}catch{}
    const overlay=sheet('Понравилось',items.length?'': '<div class="homeToolsEmpty">Здесь появятся мероприятия, которым вы поставили ♥.</div>');
    if(!items.length)return;
    const body=overlay.querySelector('.homeToolsBody');
    body.innerHTML=`<div class="homeLikedList">${items.map(e=>`<article class="homeLikedItem"><small>${esc(formatDate(e.starts_at))}</small><h3>${esc(e.title)}</h3><p>${esc(e.venue||'Место уточняется')}</p><div class="homeLikedActions"><button class="primaryMini likedCollect" data-id="${esc(e.id)}">Собрать компанию</button><button class="likedRemove" data-id="${esc(e.id)}">Убрать ♥</button></div></article>`).join('')}</div>`;
    body.querySelectorAll('.likedCollect').forEach(b=>b.onclick=()=>{closeSheet();collectCompany(b.dataset.id)});
    body.querySelectorAll('.likedRemove').forEach(b=>b.onclick=async()=>{b.disabled=true;await toggleAfisha('like',b.dataset.id);refreshBadges();openLiked()});
  }

  function openCompare(){
    if(!account){needLogin();return}
    let n=0;try{n=afishaCompared.size}catch{}
    if(!n){if(typeof afToast==='function')afToast('Добавьте мероприятия в сравнение');return}
    if(typeof openAfishaComparison==='function')openAfishaComparison();
  }

  mountHomeTools();
  setTimeout(async()=>{mountHomeTools();await fetchNotifications();refreshBadges()},600);
  setInterval(()=>{if(account)fetchNotifications();else{notificationCount=0;refreshBadges()}},30000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&account)fetchNotifications()});
})();

(function(){
  if(document.querySelector('script[data-calendar-reminders]'))return;
  const script=document.createElement('script');
  script.src='/calendar-reminders.js?v=20260915-1';
  script.dataset.calendarReminders='1';
  document.head.appendChild(script);
})();
