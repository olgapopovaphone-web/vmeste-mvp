(function(){
  if(window.LyaDefaultCovers)return;
  var eventPool=[1,2,9,10],communityPool=[3,4,5,6,7,8],sprite='';
  function hash(value){var s=String(value||'ЛЯ'),h=2166136261;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
  function byWords(text,map){var s=String(text||'').toLowerCase();for(var key in map){if(key.split('|').some(function(w){return s.indexOf(w)>=0}))return map[key]}return null}
  function style(n){n=Math.max(1,Math.min(10,Number(n)||1));var col=(n-1)%5,row=Math.floor((n-1)/5);return{index:n,image:sprite?'url("'+sprite+'")':'none',size:'500% 200%',position:(col*25)+'% '+(row*100)+'%',repeat:'no-repeat'}}
  function event(key,text){var exact=byWords(text,{'вечерин|party|крыше|rooftop':1,'пикник|picnic|парк':2,'концерт|музык|music|джаз|jazz':9,'ужин|ресторан|еда|гастро|dinner|food':10});return style(exact||eventPool[hash(key||text)%eventPool.length])}
  function community(key,text){var exact=byWords(text,{'гончар|керами|pottery':3,'книг|book|чита':4,'йог|pilates|пилатес|спорт|yoga':5,'спа|spa|wellness':6,'маркет|рынок|market|дизайн':7,'фото|photo|travel|путеше':8});return style(exact||communityPool[hash(key||text)%communityPool.length])}
  function apply(el,s){if(!el||!s||!sprite)return false;el.style.backgroundImage=s.image;el.style.backgroundSize=s.size;el.style.backgroundPosition=s.position;el.style.backgroundRepeat=s.repeat;return true}
  window.LyaDefaultCovers={event:event,community:community,style:style,apply:apply,ready:function(){return !!sprite}};
  fetch('/default-covers-sprite.b64?v=20260918-2',{cache:'force-cache'}).then(function(r){if(!r.ok)throw new Error('default covers');return r.text()}).then(function(t){t=String(t||'').trim();if(!t)return;sprite='data:image/webp;base64,'+t;window.dispatchEvent(new CustomEvent('lya:default-covers-ready'))}).catch(function(){});
})();