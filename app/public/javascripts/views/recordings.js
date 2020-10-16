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
              
              $.snack('success', 'Recording ' + id + ' removed!', 3000);
  
              let recs = $('#recs').children();
  
              if (!recs.length) {
                $('#removeAllRecordings').remove();
                $('#recordings').append('<img class="container d-flex justify-content-center mw-470" src="/images/web/no_recordings.png" alt="' + window.i18next.t('views.recordings.no_recordings') + '" />');
              }
            });
          } else {
            console.log('Error');
            $.snack('error', 'An error occured!', 3000);
          }
        });
      
      }
      
    }
      
  });
   
  $('#recordings').on('click', '#removeAllRecordings', function (e) {
    let targets = $('#recs, #removeAllRecordings');
  
    $.post('/recordings', { all: true }).always(function (
      data,
      textStatus,
      jqXHR
    ) {
      if (jqXHR.status === 200) {
        $(targets).velocity({ opacity: 0, display: 'none' }).then( function () {
          targets.remove();
          
          $.snack('success', 'All Recordings removed!', 3000);
  
          if (!$('.mw-470').length)
            $('#recordings').append(
              '<img class="container d-flex justify-content-center mw-470" src="/images/web/no_recordings.png" alt="' + window.i18next.t('views.recordings.no_recordings') + '" />'
            );
        });
      } else {
        console.log('Error');
        $.snack('error', 'An error occured!', 3000);
      }
    });
  });
  
})(jQuery);
