(function(){
  var section=document.querySelector('[data-view="communities"]');
  if(!section||section.dataset.peopleInviteAppMounted==='1')return;
  section.dataset.peopleInviteAppMounted='1';
  var root=section.querySelector('#social-hub-root');
  var search=section.querySelector('#social-hub-search');
  if(!root||!search)return;
  var APP_URL='https://vmeste-app-omega.vercel.app';

  function peopleActive(){
    var tab=section.querySelector('[data-social-tab="people"]');
    return !!(tab&&tab.classList.contains('active'));
  }

  function enhanceEmptySearch(){
    if(!peopleActive())return;
    var q=(search.value||'').trim();
    if(q.length<2)return;
    var list=root.querySelector('.peopleV2SearchList');
    if(!list||list.querySelector('.peopleV2Card')||list.querySelector('[data-people-invite-app]'))return;
    var empty=list.querySelector('.peopleV2Empty');
    if(!empty)return;
    empty.innerHTML='<strong>Не нашли человека?</strong><span>Возможно, его ещё нет во «Вместе».</span><button type="button" data-people-invite-app>Пригласить в Вместе</button><small data-people-invite-status hidden></small>';
    var button=empty.querySelector('[data-people-invite-app]');
    var status=empty.querySelector('[data-people-invite-status]');
    button.onclick=async function(){
      var shareData={title:'Вместе',text:'Присоединяйся ко мне во «Вместе» — здесь встречаются события и люди.',url:APP_URL};
      if(navigator.share){
        try{await navigator.share(shareData);return}catch(e){if(e&&e.name==='AbortError')return}
      }
      try{
        await navigator.clipboard.writeText(APP_URL);
        status.hidden=false;status.textContent='Ссылка скопирована';
        button.textContent='Скопировано ✓';
      }catch(e){
        status.hidden=false;status.textContent=APP_URL;
      }
    };
  }

  new MutationObserver(function(){setTimeout(enhanceEmptySearch,0)}).observe(root,{childList:true,subtree:true});
  search.addEventListener('input',function(){setTimeout(enhanceEmptySearch,320)},true);
  document.addEventListener('click',function(e){
    if(e.target.closest&&e.target.closest('[data-social-tab="people"]'))setTimeout(enhanceEmptySearch,80);
  },true);
  enhanceEmptySearch();
})();
