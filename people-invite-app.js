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

  async function shareInvite(button,status){
    var shareData={title:'ЛЯ',text:'Присоединяйся ко мне в «ЛЯ» — здесь встречаются события и люди.',url:APP_URL};
    if(status){status.hidden=true;status.textContent=''}
    if(navigator.share){
      try{await navigator.share(shareData);return}catch(e){if(e&&e.name==='AbortError')return}
    }
    try{
      await navigator.clipboard.writeText(APP_URL);
      if(status){status.hidden=false;status.textContent='Ссылка скопирована'}
      if(button){
        var original=button.dataset.originalLabel||button.textContent;
        button.dataset.originalLabel=original;
        button.textContent='Скопировано ✓';
        setTimeout(function(){if(document.body.contains(button))button.textContent=original},1800);
      }
    }catch(e){
      if(status){status.hidden=false;status.textContent=APP_URL}
    }
  }

  var searchWrap=search.closest('.socialHubSearch')||search.parentElement;
  var inviteBar=document.createElement('div');
  inviteBar.className='peopleInviteBar';
  inviteBar.innerHTML='<button type="button" class="peopleInviteDirect" data-people-invite-direct><span aria-hidden="true">＋</span>Пригласить человека</button><small class="peopleInviteDirectStatus" data-people-invite-direct-status hidden></small>';
  if(searchWrap&&searchWrap.parentNode)searchWrap.parentNode.insertBefore(inviteBar,searchWrap.nextSibling);
  var directButton=inviteBar.querySelector('[data-people-invite-direct]');
  var directStatus=inviteBar.querySelector('[data-people-invite-direct-status]');
  directButton.onclick=function(){shareInvite(directButton,directStatus)};

  function syncInviteBar(){
    inviteBar.hidden=!peopleActive();
    if(inviteBar.hidden&&directStatus){directStatus.hidden=true;directStatus.textContent=''}
  }

  function enhanceEmptySearch(){
    syncInviteBar();
    if(!peopleActive())return;
    var q=(search.value||'').trim();
    if(q.length<2)return;
    var list=root.querySelector('.peopleV2SearchList');
    if(!list||list.querySelector('.peopleV2Card')||list.querySelector('[data-people-invite-app]'))return;
    var empty=list.querySelector('.peopleV2Empty');
    if(!empty)return;
    empty.innerHTML='<strong>Не нашли человека?</strong><span>Возможно, его ещё нет в «ЛЯ».</span><button type="button" data-people-invite-app>Пригласить в ЛЯ</button><small data-people-invite-status hidden></small>';
    var button=empty.querySelector('[data-people-invite-app]');
    var status=empty.querySelector('[data-people-invite-status]');
    button.onclick=function(){shareInvite(button,status)};
  }

  new MutationObserver(function(){setTimeout(enhanceEmptySearch,0)}).observe(root,{childList:true,subtree:true});
  search.addEventListener('input',function(){setTimeout(enhanceEmptySearch,320)},true);
  document.addEventListener('click',function(e){
    if(e.target.closest&&e.target.closest('[data-social-tab]'))setTimeout(function(){syncInviteBar();enhanceEmptySearch()},80);
    if(e.target.closest&&e.target.closest('.nav[data-go="communities"]'))setTimeout(syncInviteBar,100);
  },true);
  syncInviteBar();
  enhanceEmptySearch();
})();
