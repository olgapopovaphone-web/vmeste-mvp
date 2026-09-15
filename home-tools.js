(function(){
  ['/home-discovery.css?v=20260915-2','/place-detail.css?v=20260915-2','/my-events.css?v=20260915-2'].forEach(function(href){var l=document.createElement('link');l.rel='stylesheet';l.href=href;document.head.appendChild(l)});
  var eventsNav=document.querySelector('.nav[data-go="calendar"]');if(eventsNav){var label=eventsNav.querySelector('span');if(label)label.textContent='События';eventsNav.childNodes.forEach(function(n){if(n.nodeType===3&&n.textContent.trim())n.textContent='▤'})}
  import('/home-core.js?v=20260915-2');
  import('/calendar-reminders.js?v=20260915-2');
  import('/my-events.js?v=20260915-1');
  import('/place-detail.js?v=20260915-2').then(function(){return import('/home-discovery.js?v=20260915-2')});
})();
