(function(){
  function clean(){
    var control=document.getElementById('calendar-reminder-control');
    if(control)control.remove();
    document.querySelectorAll('.calendarReminderNote').forEach(function(note){
      note.textContent=note.textContent.replace('«Вместе»','«ЛЯ»');
    });
  }
  clean();
  setTimeout(clean,120);
  setTimeout(clean,900);
  new MutationObserver(function(){setTimeout(clean,0)}).observe(document.body,{childList:true,subtree:true});
})();
