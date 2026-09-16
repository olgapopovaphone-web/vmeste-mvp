(function(){
  var GROUPS_KEY='vmeste_groups_proto_v1';
  function groups(){try{var a=JSON.parse(localStorage.getItem(GROUPS_KEY)||'[]');return Array.isArray(a)?a:[]}catch(e){return[]}}
  document.addEventListener('click',function(e){
    var card=e.target.closest&&e.target.closest('.socialCommunityCard');
    if(!card||!card.closest('[data-view="communities"]'))return;
    var title=card.querySelector('h3');if(!title)return;
    var name=title.textContent.trim();var g=groups().find(function(x){return String(x.name||'').trim()===name});
    if(g&&typeof window.openCommunityDetail==='function'){e.preventDefault();window.openCommunityDetail(g.id)}
  },true);
})();
