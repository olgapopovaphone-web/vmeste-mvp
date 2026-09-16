(function(){
  if(window.openImageCropper)return;

  function loadImage(file){
    return new Promise(function(resolve,reject){
      if(!file||!file.type||!file.type.startsWith('image/')){reject(new Error('Выберите изображение'));return}
      var url=URL.createObjectURL(file),img=new Image();
      img.onload=function(){img._cropObjectUrl=url;resolve(img)};
      img.onerror=function(){URL.revokeObjectURL(url);reject(new Error('Не удалось прочитать изображение'))};
      img.src=url;
    });
  }

  function clamp(v,min,max){return Math.max(min,Math.min(max,v))}

  window.openImageCropper=async function(file,options){
    options=options||{};
    var img=await loadImage(file);
    var aspect=Number(options.aspect)||1;
    var outputWidth=Number(options.outputWidth)||900;
    var outputHeight=Number(options.outputHeight)||Math.round(outputWidth/aspect);
    var circle=!!options.circle;
    var title=options.title||'Настроить изображение';

    return new Promise(function(resolve,reject){
      document.querySelector('.imageCropOverlay')?.remove();
      var overlay=document.createElement('div');overlay.className='imageCropOverlay';
      overlay.innerHTML='<div class="imageCropSheet"><div class="imageCropHead"><div><span class="ey">ИЗОБРАЖЕНИЕ</span><h2>'+title+'</h2></div><button type="button" class="imageCropClose" aria-label="Закрыть">×</button></div><div class="imageCropStage'+(circle?' is-circle':'')+'"><img alt=""></div><p class="imageCropHint">Перетащите изображение, чтобы выбрать кадр</p><div class="imageCropZoom"><button type="button" data-crop-minus aria-label="Уменьшить">−</button><input type="range" min="1" max="3" step="0.01" value="1" aria-label="Масштаб"><button type="button" data-crop-plus aria-label="Увеличить">＋</button></div><div class="imageCropActions"><button type="button" class="imageCropCancel">Отмена</button><button type="button" class="imageCropApply">Готово</button></div></div>';
      document.body.appendChild(overlay);
      var stage=overlay.querySelector('.imageCropStage'),pic=stage.querySelector('img'),range=overlay.querySelector('input[type="range"]');
      pic.src=img._cropObjectUrl;
      stage.style.aspectRatio=String(aspect);
      var zoom=1,offsetX=0,offsetY=0,baseScale=1,drag=false,lastX=0,lastY=0,finished=false;

      function cleanup(){if(img._cropObjectUrl){URL.revokeObjectURL(img._cropObjectUrl);img._cropObjectUrl=''}}
      function metrics(){
        var w=stage.clientWidth,h=stage.clientHeight;
        baseScale=Math.max(w/img.naturalWidth,h/img.naturalHeight);
        var scale=baseScale*zoom,dw=img.naturalWidth*scale,dh=img.naturalHeight*scale;
        var maxX=Math.max(0,(dw-w)/2),maxY=Math.max(0,(dh-h)/2);
        offsetX=clamp(offsetX,-maxX,maxX);offsetY=clamp(offsetY,-maxY,maxY);
        return{w:w,h:h,scale:scale,dw:dw,dh:dh,maxX:maxX,maxY:maxY};
      }
      function paint(){
        if(!stage.isConnected)return;
        var m=metrics();
        pic.style.width=m.dw+'px';pic.style.height=m.dh+'px';
        pic.style.transform='translate(calc(-50% + '+offsetX+'px), calc(-50% + '+offsetY+'px))';
      }
      function setZoom(v){zoom=clamp(Number(v)||1,1,3);range.value=String(zoom);paint()}
      function close(){
        if(finished)return;finished=true;cleanup();overlay.remove();resolve(null);
      }

      pic.addEventListener('load',paint,{once:true});
      requestAnimationFrame(paint);
      range.oninput=function(){setZoom(range.value)};
      overlay.querySelector('[data-crop-minus]').onclick=function(){setZoom(zoom-.12)};
      overlay.querySelector('[data-crop-plus]').onclick=function(){setZoom(zoom+.12)};

      stage.addEventListener('pointerdown',function(e){drag=true;lastX=e.clientX;lastY=e.clientY;stage.setPointerCapture?.(e.pointerId);stage.classList.add('dragging')});
      stage.addEventListener('pointermove',function(e){if(!drag)return;offsetX+=e.clientX-lastX;offsetY+=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;paint()});
      function endDrag(){drag=false;stage.classList.remove('dragging')}
      stage.addEventListener('pointerup',endDrag);stage.addEventListener('pointercancel',endDrag);
      stage.addEventListener('wheel',function(e){e.preventDefault();setZoom(zoom+(e.deltaY<0?.08:-.08))},{passive:false});

      overlay.querySelector('.imageCropClose').onclick=close;
      overlay.querySelector('.imageCropCancel').onclick=close;
      overlay.onclick=function(e){if(e.target===overlay)close()};
      overlay.querySelector('.imageCropApply').onclick=function(){
        try{
          var m=metrics();
          var left=(m.w-m.dw)/2+offsetX,top=(m.h-m.dh)/2+offsetY;
          var sx=clamp(-left/m.scale,0,img.naturalWidth),sy=clamp(-top/m.scale,0,img.naturalHeight);
          var sw=Math.min(m.w/m.scale,img.naturalWidth-sx),sh=Math.min(m.h/m.scale,img.naturalHeight-sy);
          var canvas=document.createElement('canvas');canvas.width=outputWidth;canvas.height=outputHeight;
          var ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(img,sx,sy,sw,sh,0,0,outputWidth,outputHeight);
          canvas.toBlob(function(blob){
            if(!blob){cleanup();return reject(new Error('Не удалось подготовить изображение'))}
            finished=true;cleanup();overlay.remove();resolve(blob)
          },'image/jpeg',options.quality||.88);
        }catch(err){cleanup();reject(err)}
      };
      window.addEventListener('resize',paint,{once:true});
    });
  };
})();