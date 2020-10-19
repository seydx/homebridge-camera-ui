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

  if(role && role === 'Master'){
    $('.video-cards').hover(
      function () {
        let removeBtn = $(this).children()[0];
        $(removeBtn).velocity({ opacity: 1, display: 'block' },0);
      },
      function () {
        let removeBtn = $(this).children()[0];
        $(removeBtn).velocity({ opacity: 0, display: 'none' },0);
      }
    );
  }
    
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
            $(light).velocity({ opacity: 0, display: 'none' }).then( function () {
              $(light).remove();
              
              let removedInfo = window.i18next.t('views.recordings.rec_removed');
              removedInfo = removedInfo.replace('@', id);
              
              $.snack('success', removedInfo, 3000);
  
              let recs = $('#recs').children();
  
              if (!recs.length) {
                $('#removeAllRecordings').remove();
                $('#recordings').append('<img class="container d-flex justify-content-center mw-470" src="/images/web/no_recordings.png" alt="' + window.i18next.t('views.recordings.no_recordings') + '" />');
              }
            });
          } else {
            console.log('Error');
            $.snack('error', window.i18next.t('views.recordings.error'), 3000);
          }
        });
      
      }
      
    }
      
  });
   
  $('#recordings').on('click', '#removeAllRecordings', function (e) {
    
    let allBoxes = $('.filterBtn:checkbox');
    let room = [];
    
    allBoxes.each(function () {
      if(this.checked)
        room.push(this.value);
    });
    
    $.ajax({
      url: '/recordings',
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({ all: true, room: room }),
      success: function(data, textStatus, jqXHR){
        
        let newTarget = $('.video-cards');
        let found = false;        
        
        newTarget.each(function(){
          if($(this).css('display') !== 'none'){
            found = true;
            $(this).remove();                   
          }            
        });
        
        if(found){
          $.snack('success', window.i18next.t('views.recordings.all_removed'), 3000);
          $('#removeAllRecordings').remove();   
          $('#recordings').append(
            '<img class="container d-flex justify-content-center mw-470" src="/images/web/no_recordings.png" alt="' + window.i18next.t('views.recordings.no_recordings') + '" />'
          );                
        }                    

      },
      error: function(jqXHR, textStatus, error){
      
        console.log(error);
        $.snack('error', window.i18next.t('views.recordings.error'), 3000);
     
      }
    });
 
  });
  
})(jQuery);
