(function(){
  if(window.openImageCropperV2)return;

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
  function dist(a,b){var x=a.x-b.x,y=a.y-b.y;return Math.sqrt(x*x+y*y)}
  function center(a,b){return{x:(a.x+b.x)/2,y:(a.y+b.y)/2}}

  async function openCropper(file,options){
    options=options||{};
    var img=await loadImage(file);
    var aspect=Number(options.aspect)||1;
    var outputWidth=Number(options.outputWidth)||900;
    var outputHeight=Number(options.outputHeight)||Math.round(outputWidth/aspect);
    var circle=!!options.circle;
    var title=options.title||'Настроить изображение';
    var maxZoom=Math.max(2,Number(options.maxZoom)||4);

    return new Promise(function(resolve,reject){
      document.querySelector('.imageCropOverlay')?.remove();
      var overlay=document.createElement('div');overlay.className='imageCropOverlay';
      overlay.innerHTML='<div class="imageCropSheet"><div class="imageCropHead"><div><span class="ey">ИЗОБРАЖЕНИЕ</span><h2>'+title+'</h2></div><button type="button" class="imageCropClose" aria-label="Закрыть">×</button></div><div class="imageCropStage'+(circle?' is-circle':'')+'"><img alt=""></div><p class="imageCropHint">Двигайте фото пальцем · двумя пальцами меняйте масштаб</p><div class="imageCropZoom"><button type="button" data-crop-minus aria-label="Уменьшить">−</button><input type="range" min="1" max="'+maxZoom+'" step="0.01" value="1" aria-label="Масштаб"><button type="button" data-crop-plus aria-label="Увеличить">＋</button></div><div class="imageCropActions"><button type="button" class="imageCropCancel">Отмена</button><button type="button" class="imageCropApply">Готово</button></div></div>';
      document.body.appendChild(overlay);
      var stage=overlay.querySelector('.imageCropStage'),pic=stage.querySelector('img'),range=overlay.querySelector('input[type="range"]');
      pic.src=img._cropObjectUrl;
      stage.style.aspectRatio=String(aspect);

      var zoom=1,offsetX=0,offsetY=0,baseScale=1,finished=false;
      var pointers=new Map(),dragPointer=null,lastPoint=null,pinchStart=null;

      function cleanup(){
        pointers.clear();
        if(img._cropObjectUrl){URL.revokeObjectURL(img._cropObjectUrl);img._cropObjectUrl=''}
        window.removeEventListener('resize',paint)
      }
      function metrics(){
        var w=stage.clientWidth,h=stage.clientHeight;
        baseScale=Math.max(w/img.naturalWidth,h/img.naturalHeight);
        var scale=baseScale*zoom,dw=img.naturalWidth*scale,dh=img.naturalHeight*scale;
        var maxX=Math.max(0,(dw-w)/2),maxY=Math.max(0,(dh-h)/2);
        offsetX=clamp(offsetX,-maxX,maxX);offsetY=clamp(offsetY,-maxY,maxY);
        return{w:w,h:h,scale:scale,dw:dw,dh:dh,maxX:maxX,maxY:maxY}
      }
      function paint(){
        if(!stage.isConnected)return;
        var m=metrics();
        pic.style.width=m.dw+'px';pic.style.height=m.dh+'px';
        pic.style.transform='translate(calc(-50% + '+offsetX+'px), calc(-50% + '+offsetY+'px))'
      }
      function setZoom(v,anchor){
        var old=zoom,newZoom=clamp(Number(v)||1,1,maxZoom);if(Math.abs(newZoom-old)<.0001)return;
        if(anchor){
          var r=stage.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
          var relX=anchor.x-cx-offsetX,relY=anchor.y-cy-offsetY,ratio=newZoom/old;
          offsetX-=relX*(ratio-1);offsetY-=relY*(ratio-1)
        }
        zoom=newZoom;range.value=String(zoom);paint()
      }
      function close(){if(finished)return;finished=true;cleanup();overlay.remove();resolve(null)}
      function points(){return Array.from(pointers.values())}
      function beginPinch(){
        var p=points();if(p.length<2){pinchStart=null;return}
        var a=p[0],b=p[1];pinchStart={distance:Math.max(1,dist(a,b)),zoom:zoom,center:center(a,b)};dragPointer=null;lastPoint=null;stage.classList.add('pinching')
      }

      pic.addEventListener('load',paint,{once:true});requestAnimationFrame(paint);
      range.oninput=function(){setZoom(range.value)};
      overlay.querySelector('[data-crop-minus]').onclick=function(){setZoom(zoom-.12)};
      overlay.querySelector('[data-crop-plus]').onclick=function(){setZoom(zoom+.12)};

      stage.addEventListener('pointerdown',function(e){
        e.preventDefault();stage.setPointerCapture?.(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
        if(pointers.size===1){dragPointer=e.pointerId;lastPoint={x:e.clientX,y:e.clientY};stage.classList.add('dragging')}
        else if(pointers.size===2)beginPinch()
      });
      stage.addEventListener('pointermove',function(e){
        if(!pointers.has(e.pointerId))return;e.preventDefault();pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
        if(pointers.size>=2){
          var p=points(),a=p[0],b=p[1];if(!pinchStart)beginPinch();
          var c=center(a,b),d=Math.max(1,dist(a,b));
          if(pinchStart){
            offsetX+=c.x-pinchStart.center.x;offsetY+=c.y-pinchStart.center.y;
            var target=pinchStart.zoom*(d/pinchStart.distance);
            pinchStart={distance:d,zoom:clamp(target,1,maxZoom),center:c};
            zoom=pinchStart.zoom;range.value=String(zoom);paint()
          }
          return
        }
        if(dragPointer===e.pointerId&&lastPoint){offsetX+=e.clientX-lastPoint.x;offsetY+=e.clientY-lastPoint.y;lastPoint={x:e.clientX,y:e.clientY};paint()}
      });
      function endPointer(e){
        pointers.delete(e.pointerId);
        if(pointers.size<2){pinchStart=null;stage.classList.remove('pinching')}
        if(pointers.size===1){var p=points()[0];dragPointer=Array.from(pointers.keys())[0];lastPoint={x:p.x,y:p.y};stage.classList.add('dragging')}
        else if(!pointers.size){dragPointer=null;lastPoint=null;stage.classList.remove('dragging')}
      }
      stage.addEventListener('pointerup',endPointer);stage.addEventListener('pointercancel',endPointer);stage.addEventListener('pointerleave',function(e){if(e.pointerType==='mouse')endPointer(e)});
      stage.addEventListener('wheel',function(e){e.preventDefault();setZoom(zoom+(e.deltaY<0?.08:-.08),{x:e.clientX,y:e.clientY})},{passive:false});

      overlay.querySelector('.imageCropClose').onclick=close;overlay.querySelector('.imageCropCancel').onclick=close;overlay.onclick=function(e){if(e.target===overlay)close()};
      overlay.querySelector('.imageCropApply').onclick=function(){
        try{
          var m=metrics(),left=(m.w-m.dw)/2+offsetX,top=(m.h-m.dh)/2+offsetY;
          var sx=clamp(-left/m.scale,0,img.naturalWidth),sy=clamp(-top/m.scale,0,img.naturalHeight);
          var sw=Math.min(m.w/m.scale,img.naturalWidth-sx),sh=Math.min(m.h/m.scale,img.naturalHeight-sy);
          var canvas=document.createElement('canvas');canvas.width=outputWidth;canvas.height=outputHeight;
          var ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(img,sx,sy,sw,sh,0,0,outputWidth,outputHeight);
          canvas.toBlob(function(blob){if(!blob){cleanup();return reject(new Error('Не удалось подготовить изображение'))}finished=true;cleanup();overlay.remove();resolve(blob)},'image/jpeg',options.quality||.88)
        }catch(err){cleanup();reject(err)}
      };
      window.addEventListener('resize',paint)
    })
  }

  window.openImageCropperV2=openCropper;
  window.openImageCropper=openCropper;
})();