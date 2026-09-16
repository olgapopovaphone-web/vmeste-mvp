(function(){
  var section=document.querySelector('[data-view="communities"]');
  if(!section||section.dataset.communitiesV2Mounted==='1')return;
  section.dataset.communitiesV2Mounted='1';

  var root=section.querySelector('#social-hub-root');
  var search=section.querySelector('#social-hub-search');
  if(!root||!search)return;

  var GROUPS_KEY='vmeste_groups_proto_v1';
  var INVITES_KEY='vmeste_community_invites_proto_v1';
  var rendering=false;
  var searchTimer=null;

  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function read(key,fallback){try{var v=JSON.parse(localStorage.getItem(key)||'');return v||fallback}catch(e){return fallback}}
  function write(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch(e){}}
  function groups(){var a=read(GROUPS_KEY,[]);return Array.isArray(a)?a:[]}
  function invites(){var a=read(INVITES_KEY,[]);return Array.isArray(a)?a:[]}
  function active(){var tab=section.querySelector('[data-social-tab="communities"]');return !!(section.classList.contains('active')&&tab&&tab.classList.contains('active'))}
  function memberWord(n){var m=Math.abs(n)%100,d=m%10;if(m>10&&m<20)return'участников';if(d===1)return'участник';if(d>1&&d<5)return'участника';return'участников'}
  function countText(g){var n=Number(g.member_count||1);return n+' '+memberWord(n)}
  function image(g,cls){if(g.cover_url)return '<div class="'+cls+' has-photo" style="background-image:url(\''+esc(g.cover_url)+'\')"></div>';return '<div class="'+cls+'">'+esc((g.name||'?').trim().slice(0,1).toUpperCase())+'</div>'}

  function inviteCard(g){
    return '<article class="communityV2Invite" data-community-invite-card="'+esc(g.id)+'">'+image(g,'communityV2InviteImage')+'<div class="communityV2InviteBody"><div class="communityV2InviteCount">'+esc(countText(g))+'</div><h3>'+esc(g.name||'Сообщество')+'</h3><p>'+esc(g.description||'Сообщество во «Вместе»')+'</p><button type="button" class="communityV2Join" data-community-v2-join="'+esc(g.id)+'">Вступить</button></div></article>';
  }
  function mineCard(g){
    return '<button type="button" class="communityV2MineCard" data-community-v2-open="'+esc(g.id)+'">'+image(g,'communityV2MineImage')+'<span class="communityV2MineShade"></span><span class="communityV2MineCopy"><strong>'+esc(g.name||'Сообщество')+'</strong><small>'+esc(g.description||countText(g))+'</small><em>'+esc(countText(g))+'</em></span></button>';
  }

  function render(){
    if(!active())return;
    rendering=true;
    search.placeholder='Найти в моих сообществах';
    var q=(search.value||'').trim().toLowerCase();
    var mine=groups();
    if(q){
      var found=mine.filter(function(g){return String(g.name||'').toLowerCase().includes(q)||String(g.description||'').toLowerCase().includes(q)});
      root.innerHTML='<div class="communityV2" data-community-v2-root><div class="communityV2SearchResults">'+(found.length?found.map(mineCard).join(''):'<div class="communityV2Empty">В ваших сообществах ничего не найдено.</div>')+'</div></div>';
      bind();rendering=false;return;
    }
    var pending=invites();
    var h='<div class="communityV2" data-community-v2-root>';
    if(pending.length){
      h+='<section class="communityV2Section"><div class="communityV2Head"><h2>Вы приглашены</h2>'+(pending.length>3?'<button type="button" class="communityV2All" data-community-v2-all="invites">Смотреть все ›</button>':'')+'</div><div class="communityV2InviteRow">'+pending.slice(0,3).map(inviteCard).join('')+'</div></section>';
    }
    if(mine.length){
      h+='<section class="communityV2Section"><div class="communityV2Head"><h2>Мои сообщества</h2>'+(mine.length>6?'<button type="button" class="communityV2All" data-community-v2-all="mine">Смотреть все ›</button>':'')+'</div><div class="communityV2MineGrid">'+mine.slice(0,6).map(mineCard).join('')+'</div></section>';
    }else if(!pending.length){
      h+='<div class="communityV2Empty">У вас пока нет сообществ.</div>';
    }
    h+='</div>';
    root.innerHTML=h;bind();rendering=false;
  }

  function openCommunity(id){if(typeof window.openCommunityDetail==='function')window.openCommunityDetail(id)}
  function join(id){
    var pending=invites(),g=pending.find(function(x){return x.id===id});if(!g)return;
    var mine=groups();if(!mine.some(function(x){return x.id===id}))mine.unshift(Object.assign({},g,{member_count:Number(g.member_count||1)+1}));
    write(GROUPS_KEY,mine);write(INVITES_KEY,pending.filter(function(x){return x.id!==id}));render();
  }
  function previewInvite(g){
    document.querySelector('.communityV2PreviewOverlay')?.remove();
    var o=document.createElement('div');o.className='communityV2PreviewOverlay';
    o.innerHTML='<div class="communityV2Preview"><div class="communityV2PreviewHero '+(g.cover_url?'has-photo':'')+'" '+(g.cover_url?'style="background-image:url(\''+esc(g.cover_url)+'\')"':'')+'><button type="button" class="communityV2PreviewClose">×</button></div><div class="communityV2PreviewBody"><h2>'+esc(g.name||'Сообщество')+'</h2><p>'+esc(g.description||'Сообщество во «Вместе»')+'</p><small>'+esc(countText(g))+'</small><button type="button" class="communityV2PreviewJoin">Вступить</button></div></div>';
    document.body.appendChild(o);o.querySelector('.communityV2PreviewClose').onclick=function(){o.remove()};o.onclick=function(e){if(e.target===o)o.remove()};o.querySelector('.communityV2PreviewJoin').onclick=function(){join(g.id);o.remove()};
  }
  function openAll(kind){
    document.querySelector('.communityV2SheetOverlay')?.remove();var items=kind==='invites'?invites():groups();
    var o=document.createElement('div');o.className='communityV2SheetOverlay';
    o.innerHTML='<div class="communityV2Sheet"><div class="communityV2SheetHead"><h2>'+(kind==='invites'?'Вы приглашены':'Мои сообщества')+'</h2><button type="button">×</button></div><div class="'+(kind==='invites'?'communityV2InviteRow communityV2InviteRowAll':'communityV2MineGrid communityV2MineGridAll')+'">'+items.map(kind==='invites'?inviteCard:mineCard).join('')+'</div></div>';
    document.body.appendChild(o);o.querySelector('.communityV2SheetHead button').onclick=function(){o.remove()};o.onclick=function(e){if(e.target===o)o.remove()};
    o.querySelectorAll('[data-community-v2-open]').forEach(function(b){b.onclick=function(){o.remove();openCommunity(b.dataset.communityV2Open)}});
    o.querySelectorAll('[data-community-v2-join]').forEach(function(b){b.onclick=function(e){e.stopPropagation();join(b.dataset.communityV2Join);o.remove()}});
    o.querySelectorAll('[data-community-invite-card]').forEach(function(c){c.onclick=function(e){if(e.target.closest('[data-community-v2-join]'))return;var g=invites().find(function(x){return x.id===c.dataset.communityInviteCard});if(g){o.remove();previewInvite(g)}}});
  }

  function bind(){
    root.querySelectorAll('[data-community-v2-open]').forEach(function(b){b.onclick=function(){openCommunity(b.dataset.communityV2Open)}});
    root.querySelectorAll('[data-community-v2-join]').forEach(function(b){b.onclick=function(e){e.stopPropagation();join(b.dataset.communityV2Join)}});
    root.querySelectorAll('[data-community-invite-card]').forEach(function(c){c.onclick=function(e){if(e.target.closest('[data-community-v2-join]'))return;var g=invites().find(function(x){return x.id===c.dataset.communityInviteCard});if(g)previewInvite(g)}});
    root.querySelectorAll('[data-community-v2-all]').forEach(function(b){b.onclick=function(){openAll(b.dataset.communityV2All)}});
  }

  document.addEventListener('click',function(e){
    var tab=e.target.closest&&e.target.closest('[data-social-tab="communities"]');if(tab)setTimeout(render,0);
    var nav=e.target.closest&&e.target.closest('.nav[data-go="communities"]');if(nav)setTimeout(function(){if(active())render()},30);
  },true);
  search.addEventListener('input',function(){if(!active())return;clearTimeout(searchTimer);searchTimer=setTimeout(render,80)},true);
  window.addEventListener('storage',function(e){if((e.key===GROUPS_KEY||e.key===INVITES_KEY)&&active())render()});
  var observer=new MutationObserver(function(){if(rendering||!active())return;if(!root.querySelector('[data-community-v2-root]'))setTimeout(function(){if(active()&&!root.querySelector('[data-community-v2-root]'))render()},0)});observer.observe(root,{childList:true,subtree:false});
  setTimeout(function(){if(active())render()},400);
})();
