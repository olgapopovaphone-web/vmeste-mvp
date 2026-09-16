(function(){
  var section=document.querySelector('[data-view="calendar"]');
  if(!section||section.dataset.monthOnlyMounted==='1')return;
  section.dataset.monthOnlyMounted='1';

  function forceMonth(){
    var month=document.querySelector('#calendar-modes [data-cal-mode="month"], .calendarModes [data-cal-mode="month"]');
    if(month&&!month.classList.contains('active'))month.click();
  }

  document.addEventListener('click',function(e){
    var calendarSwitch=e.target.closest&&e.target.closest('[data-my-events-mode="calendar"]');
    var eventsNav=e.target.closest&&e.target.closest('.nav[data-go="calendar"]');
    if(calendarSwitch||eventsNav)setTimeout(forceMonth,0);
  },true);

  new MutationObserver(function(){
    if(section.classList.contains('active')&&section.classList.contains('mode-calendar'))setTimeout(forceMonth,0);
  }).observe(section,{attributes:true,attributeFilter:['class']});

  forceMonth();
})();
