(function(){
  if(window.__vmesteImageUploadBridgeV2)return;window.__vmesteImageUploadBridgeV2=true;

  function config(input){
    if(input.matches('#profile-avatar-input')||input.dataset.imageRole==='avatar')return{aspect:1,outputWidth:960,outputHeight:960,circle:true,title:'Фото профиля',quality:.9,maxZoom:5};
    if(input.matches('#event-cover-input,#event-edit-cover-input,#event-create-cover-input')||input.dataset.imageRole==='event-cover')return{aspect:4/3,outputWidth:1600,outputHeight:1200,title:'Обложка события',quality:.9,maxZoom:5};
    if(input.matches('#community-cover,.communityCreateCoverInput,[data-community-cover-input]')||input.dataset.imageRole==='community-cover')return{aspect:4/3,outputWidth:1600,outputHeight:1200,title:'Обложка сообщества',quality:.9,maxZoom:5};
    if(input.dataset.imageRole==='cover'){
      var aspect=Number(input.dataset.imageAspect)||4/3;
      var outW=Number(input.dataset.imageWidth)||1600,outH=Number(input.dataset.imageHeight)||Math.round(outW/aspect);
      return{aspect:aspect,outputWidth:outW,outputHeight:outH,title:input.dataset.imageTitle||'Настроить обложку',quality:.9,maxZoom:5}
    }
    return null
  }

  async function ensureCropper(){
    if(window.openImageCropper)return true;
    try{await import('/image-cropper.js?v=20260925-2')}catch(e){}
    return !!window.openImageCropper
  }

  document.addEventListener('change',async function(e){
    var input=e.target;if(!input||input.type!=='file'||input.dataset.imageCropReady==='1')return;
    var opts=config(input);if(!opts)return;
    var file=input.files&&input.files[0];if(!file||!file.type||!file.type.startsWith('image/'))return;
    e.preventDefault();e.stopImmediatePropagation();
    if(!await ensureCropper()){input.dataset.imageCropReady='1';input.dispatchEvent(new Event('change',{bubbles:true}));setTimeout(function(){delete input.dataset.imageCropReady},0);return}
    try{
      var blob=await window.openImageCropper(file,opts);
      if(!blob){input.value='';return}
      var cropped=new File([blob],file.name.replace(/\.[^.]+$/, '')+'-crop.jpg',{type:'image/jpeg',lastModified:Date.now()});
      var dt=new DataTransfer();dt.items.add(cropped);input.files=dt.files;
      input.dataset.imageCropReady='1';input.dispatchEvent(new Event('change',{bubbles:true}));setTimeout(function(){delete input.dataset.imageCropReady},0)
    }catch(err){console.error('Image crop failed',err);input.value=''}
  },true);
})();