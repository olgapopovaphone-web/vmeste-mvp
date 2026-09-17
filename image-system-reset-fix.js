(function(){
  function bind(){var form=document.getElementById('event-form');if(!form||form.dataset.imageResetFix==='1')return;form.dataset.imageResetFix='1';form.addEventListener('reset',function(){setTimeout(function(){var b=form.querySelector('[data-event-cover-remove]');if(b)b.click()},0)})}
  bind();setTimeout(bind,120);setTimeout(bind,700)
})();