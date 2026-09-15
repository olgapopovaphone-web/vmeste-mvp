(function(){
  ['/home-discovery.css?v=20260915-2','/place-detail.css?v=20260915-2','/my-events.css?v=20260915-2'].forEach(function(href){var l=document.createElement('link');l.rel='stylesheet';l.href=href;document.head.appendChild(l)});

  function compactHeader(view,eyText){
    var top=document.querySelector('[data-view="'+view+'"] .top');if(!top)return;
    var ey=top.querySelector('.ey'),title=top.querySelector('h1'),text=top.querySelector('p');
    if(ey){ey.hidden=false;if(eyText)ey.textContent=eyText}
    if(title)title.hidden=true;
    if(text)text.hidden=true;
  }
  function simplifyTabHeaders(){
    compactHeader('home','ВМЕСТЕ · АФИША');
    compactHeader('create','СОЗДАТЬ');
    var eventsSection=document.querySelector('[data-view="calendar"]');
    compactHeader('calendar',eventsSection&&eventsSection.classList.contains('mode-calendar')?'КАЛЕНДАРЬ':'МОИ СОБЫТИЯ');
  }

  var eventsNav=document.querySelector('.nav[data-go="calendar"]');if(eventsNav){var label=eventsNav.querySelector('span');if(label)label.textContent='События';eventsNav.childNodes.forEach(function(n){if(n.nodeType===3&&n.textContent.trim())n.textContent='▤'})}
  simplifyTabHeaders();
  document.addEventListener('click',function(e){var mode=e.target.closest&&e.target.closest('[data-my-events-mode]');if(mode)setTimeout(simplifyTabHeaders,0)},true);

  import('/home-core.js?v=20260915-2');
  import('/calendar-reminders.js?v=20260915-2');
  import('/my-events.js?v=20260915-1').then(function(){simplifyTabHeaders()});
  import('/place-detail.js?v=20260915-2').then(function(){return import('/home-discovery.js?v=20260915-2')});
})();
