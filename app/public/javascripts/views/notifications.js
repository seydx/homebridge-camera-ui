(async function ($) {
  'use strict';

  let prev;
  let role = getRole();
  const viewport = $('meta[name="viewport"]');

  if(role && role === 'Master'){
    $('.notification-deck').hover(
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
  
  $('#notifications').on('click', '#removeAllNotifications', function (e) {
    
    let allBoxes = $('.filterBtn:checkbox');
    let room = [];
    
    allBoxes.each(function () {
      if(this.checked)
        room.push(this.value);
    });
    
    $.ajax({
      url: '/notifications',
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({ all: true, room: room }),
      success: function(data, textStatus, jqXHR){
      
        let newTarget = $('.notification-deck');
        let found = false;        
        
        newTarget.each(function(){
          if($(this).css('display') !== 'none'){
            found = true;
            $(this).remove();                   
          }            
        });
        
        if(found){
          $.snack('success', window.i18next.t('views.notifications.all_removed'), 3000);
          $('#removeAllNotifications').remove();   
          $('.nots-container').append(
            '<img class="container d-flex justify-content-center mw-470" src="/images/web/no_notifications.png" alt="' + window.i18next.t('views.notifications.no_notifications') + '" />'
          );              
        } 

      },
      error: function(jqXHR, textStatus, error){
      
        console.log(error);
        $.snack('error', window.i18next.t('views.notifications.error'), 3000);
     
      }
    });
    
  });
    
  $('#notifications').on('click', function (e) {
      
    let target = $(e.target);
    let light = $(e.target).parents('.notification-deck');
    
    if(target.length && (target[0].className === 'notification-deck-remove' || target[0].className.includes('removeNotification') || target[0].className.includes('notification-deck-remove'))){
      
      e.preventDefault();
        
      if(light.length){
      
        let id = $(light).attr('data-target');
        $(light).attr('data-removed-manual', '1');
          
        $.post('/notifications', { id: id }).always(function (
          data,
          textStatus,
          jqXHR
        ) {
          if (jqXHR.status === 200) {
            $(light)
              .velocity({ opacity: 0, display: 'none' }, { duration: 500 })
              .then( function () {
                $(light).remove();
                
                let removedInfo = window.i18next.t('views.notifications.not_removed');
                removedInfo = removedInfo.replace('@', id);
              
                $.snack('success', removedInfo, 3000);
  
                let notifications = $('#nots').children();
  
                if (!notifications.length) {
                  $('#removeAllNotifications').remove();
                  $('.nots-container').append(
                    '<img class="container d-flex justify-content-center mw-470" src="/images/web/no_notifications.png" alt="' + window.i18next.t('views.notifications.no_notifications') + '" />'
                  );
                }
              });
          } else {
            console.log('Error');
            $.snack('error', window.i18next.t('views.notifications.error'), 3000);
          }
        });
      
      }
      
    } else {
      
      if(light.length){
  
        let href = $(light).attr('href');
  
        lightcase.start({
          href: href,
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
  
        e.preventDefault();
  
      }
    }
      
  });
    
  function myfunction(el, trgt, d) {
  
    if (d == 'left') {
      
      let target = trgt.parents('.notification-deck').children('.notification-deck-remove');
          
      if(prev)
        prev.velocity(
          {
            right: -100,
          },
          {
            duration: 500,
            easing: 'easeInOutCubic',
            queue: false
          }
        );
            
      prev = target;
          
      target.velocity(
        {
          right: 0,
        },
        {
          duration: 500,
          easing: 'easeInOutCubic',
          queue: false
        }
      );
        
    }
      
  }
  
  if(role && role === 'Master')
    detectswipe('#nots', myfunction);
    
  $(window).on('click', function(e){
  
    let target = $(e.target).parents('.notification-deck');
  
    if(!target.length && prev)
      prev.velocity(
        {
          right: -100,
        },
        {
          duration: 500,
          easing: 'easeInOutCubic',
          queue: false
        }
      );
  
  });

})(jQuery);
