(async function ($) {
  'use strict';

  let role = getRole();
  
  const viewport = $('meta[name="viewport"]');

  $('a[data-rel^=lightcase]').lightcase({
    onStart: {
      bar: function(){
        viewport.attr('content', 'width=device-width, initial-scale=1, viewport-fit=cover');
      }
    },
    onClose: {
      grault: function(){
        viewport.attr('content', 'width=device-width, initial-scale=1, user-scalable=no, maximum-scale=1, viewport-fit=cover');
      }
    }
  });
    
  $('#recs').on('click', function (e) {
      
    let target = $(e.target);
    let light = $(e.target).parents('.video-cards');
      
    if(target.length && target[0].className.includes('removeRecording')){
     
      e.preventDefault();
        
      if(light.length){
      
        let id = $(light).attr('data-target');
  
        $.post('/recordings', { id: id }).always(function (
          data,
          textStatus,
          jqXHR
        ) {
          if (jqXHR.status === 200) {
          
            shuffle.remove($(light));
          
            let removedInfo = window.i18next.t('views.recordings.rec_removed');
            removedInfo = removedInfo.replace('@', id);
            
            $.snack('success', removedInfo, 3000);

            setTimeout(()=>{
              if(!$('.shuffle-item').length){
                $('#removeAllRecordings').hide();   
                $('#recordings').append(
                  '<img class="container d-flex justify-content-center mw-470" src="/images/web/no_recordings.png" alt="' + window.i18next.t('views.recordings.no_recordings') + '" />'
                ); 
              }  
            }, 500);     

          } else {
            console.log('Error');
            $.snack('error', window.i18next.t('views.recordings.error'), 3000);
          }
        });
      
      }
      
    }
      
  });
   
  $('#removeAllRecordings').on('click', function (e) {
  
    let filteredItems = [];
    
    $('.shuffle-item--visible').each(function(){
      filteredItems.push($(this).attr('data-target'));
    });
    
    $.ajax({
      url: '/recordings',
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({ all: true, items: filteredItems }),
      success: function(data, textStatus, jqXHR){
        
        if($('.video-cards').length){
          
          shuffle.remove($('.video-cards'));
          
          $.snack('success', window.i18next.t('views.recordings.all_removed'), 3000);

          setTimeout(()=>{
            if(!$('.shuffle-item').length){
              $('#removeAllRecordings').hide();   
              $('#recordings').append(
                '<img class="container d-flex justify-content-center mw-470" src="/images/web/no_recordings.png" alt="' + window.i18next.t('views.recordings.no_recordings') + '" />'
              ); 
            }  
          }, 500);               
        
        }                  

      },
      error: function(jqXHR, textStatus, error){
      
        console.log(error);
        $.snack('error', window.i18next.t('views.recordings.error'), 3000);
     
      }
    });
 
  });
  
})(jQuery);
