(function(){
  ['/home-discovery.css?v=20260915-2','/place-detail.css?v=20260915-2'].forEach(function(href){var l=document.createElement('link');l.rel='stylesheet';l.href=href;document.head.appendChild(l)});
  import('/home-core.js?v=20260915-2');
  import('/calendar-reminders.js?v=20260915-2');
  import('/place-detail.js?v=20260915-2').then(function(){return import('/home-discovery.js?v=20260915-2')});
})();
