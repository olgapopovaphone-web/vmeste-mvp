(function(){
  if(window.LyaDefaultCovers)return;
  var eventPool=[1,2,9,10],communityPool=[3,4,5,6,7,8];
  function hash(value){var s=String(value||'ЛЯ'),h=2166136261;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
  function url(n){return '/default-covers/'+String(n).padStart(2,'0')+'.svg'}
  function byWords(text,map){var s=String(text||'').toLowerCase();for(var key in map){if(key.split('|').some(function(w){return s.indexOf(w)>=0}))return map[key]}return null}
  function event(key,text){
    var exact=byWords(text,{'вечерин|party|крыше|rooftop':1,'пикник|picnic|парк':2,'концерт|музык|music|джаз|jazz':9,'ужин|ресторан|еда|гастро|dinner|food':10});
    return url(exact||eventPool[hash(key||text)%eventPool.length])
  }
  function community(key,text){
    var exact=byWords(text,{'гончар|керами|pottery':3,'книг|book|чита':4,'йог|pilates|пилатес|спорт|yoga':5,'спа|spa|wellness':6,'маркет|рынок|market|дизайн':7,'фото|photo|travel|путеше':8});
    return url(exact||communityPool[hash(key||text)%communityPool.length])
  }
  window.LyaDefaultCovers={event:event,community:community,url:url,eventPool:eventPool.slice(),communityPool:communityPool.slice()};
})();