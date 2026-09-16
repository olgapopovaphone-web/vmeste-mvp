(function(){
  var section=document.querySelector('[data-view="communities"]');
  if(!section||section.dataset.socialCleanupMounted==='1')return;
  section.dataset.socialCleanupMounted='1';

  function accountAvatar(){
    try{return account&&account.profile&&account.profile.avatar_url||null}catch(e){return null}
  }
  function accountLetter(){
    try{var n=(account&&account.profile&&account.profile.display_name)||(account&&account.user&&account.user.email)||'В';return String(n).trim().slice(0,1).toUpperCase()||'В'}catch(e){return'В'}
  }
  function cleanAvatar(){
    var avatar=section.querySelector('.socialHubTop .avatar');if(!avatar)return;
    var url=accountAvatar();
    if(url){avatar.classList.add('avatarHasPhoto');avatar.style.backgroundImage='url("'+String(url).replace(/"/g,'%22')+'")';avatar.textContent=''}
    else{avatar.classList.remove('avatarHasPhoto');avatar.style.backgroundImage='';avatar.textContent=accountLetter()}
  }
  function cleanPeople(){
    section.querySelectorAll('.socialHubSectionHead h2').forEach(function(title){
      if(title.textContent.trim()==='Мой круг'){
        var block=title.closest('.socialHubSection');
        if(block)block.classList.add('socialCircleAcceptedSection');
      }
    });
  }
  function normalizeCommunities(){
    var communitiesTab=section.querySelector('[data-social-tab="communities"].active');
    if(!communitiesTab)return;
    var mine=section.querySelector('[data-community-mode="mine"]');
    if(mine&&!mine.classList.contains('active'))mine.click();
  }
  function clean(){cleanPeople();cleanAvatar();normalizeCommunities()}

  document.addEventListener('click',function(e){
    var create=e.target.closest&&e.target.closest('.nav[data-go="create"]');
    if(!create||!section.classList.contains('active'))return;
    var communitiesTab=section.querySelector('[data-social-tab="communities"].active');
    if(!communitiesTab)return;
    var communityCreate=section.querySelector('[data-social-create]');
    if(!communityCreate)return;
    e.preventDefault();e.stopImmediatePropagation();communityCreate.click();
  },true);

  var root=section.querySelector('#social-hub-root');
  if(root)new MutationObserver(function(){clean()}).observe(root,{childList:true,subtree:true});
  document.addEventListener('vmeste-circle-changed',function(){setTimeout(clean,0)});
  document.addEventListener('visibilitychange',function(){if(!document.hidden)setTimeout(clean,0)});
  clean();setTimeout(clean,400);setTimeout(clean,1200);
})();
