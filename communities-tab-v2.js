(function(){
  var section=document.querySelector('[data-view="communities"]');
  if(!section||section.dataset.communitiesV2Mounted==='1')return;
  section.dataset.communitiesV2Mounted='1';

  var root=section.querySelector('#social-hub-root');
  var search=section.querySelector('#social-hub-search');
  if(!root||!search)return;

  var GROUPS_KEY='vmeste_groups_proto_v1';
  var API='https://nmeoakrpafxhpdrplsuo.supabase.co/functions/v1/vmeste-circle-api';
  var mine=[],pending=[],discover=[],rendering=false,searchTimer=null,loaded=false;

  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function session(){try{return JSON.parse(localStorage.getItem('vmeste_session_v1')||'null')}catch(e){return null}}
  async function call(action,payload,retry){
    var s=session();if(!s||!s.access_token)throw new Error('LOGIN');
    var opts={method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.assign({action:action},payload||{}))};
    var r=window.lyaAuthedFetch?await window.lyaAuthedFetch(API,opts,retry!==false):await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+s.access_token},body:opts.body});
    var d={};try{d=await r.json()}catch(e){d={error:'Некорректный ответ сервера'}}
    if(!r.ok)throw new Error(d.error||'Ошибка запроса');
    return d
  }
  function cache(){
    try{localStorage.setItem(GROUPS_KEY,JSON.stringify(mine))}catch(e){}
  }
  function active(){var tab=section.querySelector('[data-social-tab="communities"]');return !!(section.classList.contains('active')&&tab&&tab.classList.contains('active'))}
  function memberWord(n){var m=Math.abs(n)%100,d=m%10;if(m>10&&m<20)return'участников';if(d===1)return'участник';if(d>1&&d<5)return'участника';return'участников'}
  function countText(g){var n=Number(g.member_count||1);return n+' '+memberWord(n)}
  function image(g,cls){if(g.cover_url)return '<div class="'+cls+' has-photo" style="background-image:url(\''+esc(String(g.cover_url).replace(/'/g,'%27'))+'\')"></div>';return '<div class="'+cls+'">'+esc((g.name||'?').trim().slice(0,1).toUpperCase())+'</div>'}
  function inviteCard(x){var g=x.community||x;return '<article class="communityV2Invite" data-community-invite-card="'+esc(g.id)+'" data-invitation-id="'+esc(x.invitation_id||g._server_invitation_id||'')+'">'+image(g,'communityV2InviteImage')+'<div class="communityV2InviteBody"><div class="communityV2InviteCount">'+esc(countText(g))+'</div><h3>'+esc(g.name||'Сообщество')+'</h3><p>'+esc(g.description||'Сообщество в ЛЯ')+'</p><div class="communityV2InviteActions"><button type="button" class="communityV2Join" data-community-v2-join="'+esc(g.id)+'">Вступить</button><button type="button" class="communityV2Decline" data-community-v2-decline="'+esc(g.id)+'">Отклонить</button></div></div></article>'}
  function mineCard(g){return '<button type="button" class="communityV2MineCard" data-community-v2-open="'+esc(g.id)+'">'+image(g,'communityV2MineImage')+'<span class="communityV2MineShade"></span><span class="communityV2MineCopy"><strong>'+esc(g.name||'Сообщество')+'</strong><small>'+esc(g.description||countText(g))+'</small><em>'+esc(countText(g))+'</em></span></button>'}
  function discoverCard(g){return '<article class="communityV2Invite" data-community-discover-card="'+esc(g.id)+'">'+image(g,'communityV2InviteImage')+'<div class="communityV2InviteBody"><div class="communityV2InviteCount">'+esc(countText(g))+'</div><h3>'+esc(g.name||'Сообщество')+'</h3><p>'+esc(g.description||'Открытое сообщество')+'</p><div class="communityV2InviteActions"><button type="button" class="communityV2Join" data-community-public-join="'+esc(g.id)+'">Вступить</button></div></div></article>'}

  async function sync(force){
    var s=session();
    if(!s||!s.access_token){mine=[];pending=[];discover=[];loaded=true;if(active())render();return}
    if(active()&&!loaded)root.innerHTML='<div class="communityV2Empty">Загружаю сообщества…</div>';
    try{
      var q=(search.value||'').trim();
      var all=await Promise.all([
        call('list_my_communities',{},true),
        call('list_community_invitations',{},true),
        call('discover_communities',{query:q},true)
      ]);
      mine=all[0].communities||[];
      pending=all[1].invitations||[];
      discover=all[2].communities||[];
      cache();loaded=true;
      if(active())render()
    }catch(e){
      loaded=true;
      if(active())root.innerHTML='<div class="communityV2Empty">'+esc(e.message==='LOGIN'?'Войдите, чтобы увидеть сообщества.':e.message)+'</div>'
    }
  }

  function render(){
    if(!active())return;rendering=true;search.placeholder='Найти сообщество';
    var q=(search.value||'').trim().toLowerCase();
    var my=mine,disc=discover,inv=pending;
    if(q){
      var match=function(g){return String(g.name||'').toLowerCase().includes(q)||String(g.description||'').toLowerCase().includes(q)};
      my=my.filter(match);disc=disc.filter(match);inv=inv.filter(function(x){return match(x.community||{})})
    }
    var h='<div class="communityV2" data-community-v2-root>';
    if(inv.length)h+='<section class="communityV2Section"><div class="communityV2Head"><h2>Вы приглашены</h2></div><div class="communityV2InviteRow">'+inv.slice(0,6).map(inviteCard).join('')+'</div></section>';
    if(my.length)h+='<section class="communityV2Section"><div class="communityV2Head"><h2>Мои сообщества</h2></div><div class="communityV2MineGrid">'+my.map(mineCard).join('')+'</div></section>';
    if(disc.length)h+='<section class="communityV2Section"><div class="communityV2Head"><h2>Открытые сообщества</h2></div><div class="communityV2InviteRow">'+disc.slice(0,6).map(discoverCard).join('')+'</div></section>';
    if(!inv.length&&!my.length&&!disc.length)h+='<div class="communityV2Empty">'+(q?'Ничего не нашли.':'У вас пока нет сообществ.')+'</div>';
    h+='</div>';root.innerHTML=h;bind();rendering=false
  }

  function openCommunity(id){if(typeof window.openCommunityDetail==='function')window.openCommunityDetail(id)}
  async function answerInvite(card,response,openAfter){
    var invitationId=card&&card.dataset.invitationId;if(!invitationId)return;
    try{
      await call('respond_community_invite',{invitation_id:invitationId,response:response},true);
      await sync(true);
      document.dispatchEvent(new CustomEvent('vmeste-community-invites-changed'));
      if(response==='accepted'&&openAfter){var g=mine.find(function(x){return String(x.id)===String(card.dataset.communityInviteCard)});if(g)openCommunity(g.id)}
    }catch(e){alert(e.message)}
  }
  async function joinOpen(id){
    try{await call('join_community',{community_id:id},true);await sync(true);var g=mine.find(function(x){return String(x.id)===String(id)});if(g)openCommunity(g.id)}catch(e){alert(e.message)}
  }
  function bind(){
    root.querySelectorAll('[data-community-v2-open]').forEach(function(b){b.onclick=function(){openCommunity(b.dataset.communityV2Open)}});
    root.querySelectorAll('[data-community-invite-card]').forEach(function(card){
      var j=card.querySelector('[data-community-v2-join]'),d=card.querySelector('[data-community-v2-decline]');
      if(j)j.onclick=function(e){e.stopPropagation();answerInvite(card,'accepted',true)};
      if(d)d.onclick=function(e){e.stopPropagation();answerInvite(card,'declined',false)};
      card.onclick=function(e){if(e.target.closest('button'))return;openCommunity(card.dataset.communityInviteCard)}
    });
    root.querySelectorAll('[data-community-public-join]').forEach(function(b){b.onclick=function(){b.disabled=true;joinOpen(b.dataset.communityPublicJoin).finally(function(){b.disabled=false})}});
  }

  document.addEventListener('click',function(e){
    var tab=e.target.closest&&e.target.closest('[data-social-tab="communities"]');
    if(tab)setTimeout(function(){sync(true)},0);
    var nav=e.target.closest&&e.target.closest('.nav[data-go="communities"]');
    if(nav)setTimeout(function(){if(active())sync(true)},30)
  },true);
  search.addEventListener('input',function(){if(!active())return;clearTimeout(searchTimer);searchTimer=setTimeout(function(){sync(true)},260)},true);
  document.addEventListener('vmeste-community-changed',function(){loaded=false;sync(true)});
  document.addEventListener('vmeste-community-invites-changed',function(){loaded=false;sync(true)});
  var observer=new MutationObserver(function(){if(rendering||!active())return;if(!root.querySelector('[data-community-v2-root]'))setTimeout(function(){if(active())render()},0)});observer.observe(root,{childList:true,subtree:false});
  setTimeout(function(){sync(true)},400);
})();