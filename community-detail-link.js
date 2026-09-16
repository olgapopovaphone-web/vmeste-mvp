(function(){
  var GROUPS_KEY='vmeste_groups_proto_v1';
  function groups(){try{var a=JSON.parse(localStorage.getItem(GROUPS_KEY)||'[]');return Array.isArray(a)?a:[]}catch(e){return[]}}
  function groupFromCard(card){
    var title=card&&card.querySelector('h3');if(!title)return null;
    var name=title.textContent.trim();return groups().find(function(x){return String(x.name||'').trim()===name})||null;
  }
  async function openCard(card,e){
    var g=groupFromCard(card);if(!g)return;
    if(e){e.preventDefault();e.stopPropagation()}
    try{
      if(typeof window.openCommunityDetail!=='function')await import('/community-detail.js?v=20260916-2');
      if(typeof window.openCommunityDetail==='function')window.openCommunityDetail(g.id);
    }catch(err){console.error('Community detail load failed',err)}
  }
  document.addEventListener('click',function(e){
    var card=e.target.closest&&e.target.closest('.socialCommunityCard');
    if(!card||!card.closest('[data-view="communities"]'))return;
    openCard(card,e);
  },true);
  document.addEventListener('keydown',function(e){
    if(e.key!=='Enter'&&e.key!==' ')return;
    var card=e.target.closest&&e.target.closest('.socialCommunityCard');
    if(!card||!card.closest('[data-view="communities"]'))return;
    openCard(card,e);
  },true);
})();