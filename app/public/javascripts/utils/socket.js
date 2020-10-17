(async function ($) {
  'use strict';

  const timeout = (ms) => new Promise((res) => setTimeout(res, ms)); 
  
  const role = getRole() || false; 
  const username = getUsername();
  const camNames = getCamNames();
  
  let title = getTitle();
  let hideBannerTimeout;
  let hideBannerTimer;
  let banner;
  let bannerActive;
  let blinker;
  let reset;
  
  //connect socket
  const socket = io({
    transports: ['websocket'], 
    upgrade: false
  });
  
  //reconnect
  socket.on('reconnect_attempt', () => {
    socket.io.opts.transports = ['websocket'];
  });

  socket.on('connect', () => {
    
    //save session
    socket.emit('session', {
      username: getUsername(),
      currentUrl: window.location.pathname
    });
    
    //save url for rejoin
    $('a').on('click', function(e) {
       
      let targetUrl = $(this).attr('href');
       
      if(targetUrl){    
         
        let urls = ['/dashboard', '/cameras', '/notifications', '/recordings', '/settings', '/camviews'];
        
        let validUrls = camNames.map(name => {
          return ('/camera/' + name);
        }).concat(urls);
        
        let valid = validUrls.some(site => (targetUrl.includes(site) || targetUrl.includes('#back')) );
          
        if(valid){
         
          socket.emit('session', {
            username: getUsername(),
            currentUrl: window.location.pathname,
            targetUrl: targetUrl,
            back: targetUrl.includes('#back') ? true : false
          });
         
        }
         
      }
        
    });
    
  });
    
  //auto logout
  socket.on('logout_user', user => {  
    if(username && username === user)
      window.location.replace('/logout');       
  });
  
  //if(role && role === 'Master'){

  socket.on('notification', notification => {
      
    if($('#soundFx').length && role && role === 'Master')
      $('#soundFx')[0].play();        
        
    if($('.notOverlay').length){
     
      if(blinker)
        clearInterval(blinker);
            
      if(reset)
        clearTimeout(reset);
       
      let id = '#' + notification.name.replace(/\s/g,'') + 'Not';
          
      $(id).text(notification.timestamp);
          
      function blink(){
          
        $(id).velocity({ opacity: 0, display: 'none' }, { duration: 500 });
        $(id).velocity({ opacity: 1, display: 'block' }, { duration: 500 });
          
      }
          
      blinker = setInterval(blink, 1000);
          
      reset = setTimeout(function(){
        if(blinker)
          clearInterval(blinker);
      }, 3000);
          
    }
              
    if($('#nb-dialog-container').length && role && role === 'Master'){
      
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
      
      banner = $('#nb-dialog-container');
      bannerActive = banner.css('top') !== '-150px';
      let bannerUrl = notification.storing ? '/files/' + notification.id + (notification.fileType === 'Video' ? '.mp4' : '.jpeg') : '/images/web/no_recordings.png';
      hideBannerTimer = isNaN(parseInt(notification.hideBanner)) ? false : parseInt(notification.hideBanner);
        
      if(hideBannerTimeout)
        clearTimeout(hideBannerTimeout);
        
      let time = notification.time.split(', ')[1].split(':');
      time = time[0] + ':' + time[1];
        
      if(bannerActive){
        
        $(banner).velocity(
          {
            top: -150,
          },
          { duration: 500, easing: 'easeInOutCubic' }
        );
          
        // CHANGE CONTENT HERE
          
        banner.attr('href', bannerUrl);
        $('.nb-right').text(time);
        $('#nbcontenttitle').text(notification.originName);
        if(notification.type === 'motion'){
          $('#nbcontent').text(window.i18next.t('banner.motion_info') + ' - ' + notification.time);
        } else {
          $('#nbcontent').text(window.i18next.t('banner.doorbell_info') + ' - ' + notification.time);
        }
          
        $(banner).velocity(
          {
            top: 0,
          },
          { duration: 500, easing: 'easeInOutCubic' }
        );
          
        if(hideBannerTimer){
          hideBannerTimeout = setTimeout(function(){
            $(banner).velocity(
              {
                top: -150,
              },
              { duration: 500, easing: 'easeInOutCubic' }
            );
          }, hideBannerTimer * 1000);
        }
         
      } else {
        
        banner.attr('href', bannerUrl);
        $('.nb-right').text(time);  
        $('#nbcontenttitle').text(notification.originName);
        if(notification.type === 'motion'){
          $('#nbcontent').text(window.i18next.t('banner.motion_info') + ' - ' + notification.time);
        } else {
          $('#nbcontent').text(window.i18next.t('banner.doorbell_info') + ' - ' + notification.time);
        }
            
        $(banner).velocity(
          {
            top: 0,
          },
          { duration: 500, easing: 'easeInOutCubic' }
        );
          
        if(hideBannerTimer){
          hideBannerTimeout = setTimeout(function(){
            $(banner).velocity(
              {
                top: -150,
              },
              { duration: 500, easing: 'easeInOutCubic' }
            );
          }, hideBannerTimer * 1000);
        }
        
      }
      
    }
      
    if($('.notbadge').length){
      
      $('.notbadge').each(function(){
           
        let badgeSize = $(this).text();
        badgeSize = parseInt(badgeSize);
        badgeSize++;
           
        $(this).text(badgeSize);
             
      });
         
    }
      
    if(title === 'Notifications'){
         
      let url_path = notification.storing ? '/files/' + notification.id + (notification.fileType === 'Video' ? '.mp4' : '.jpeg') : '#';
      let img_url_path = notification.storing ? '/files/' + notification.id + (notification.fileType === 'Video' ? '@2.jpeg' : '.jpeg') : '/images/web/logo_transparent-256.png';
            
      if($('.mw-470').length){
        $('.mw-470').remove();
      }
         
      $('form').prepend('<a class="col-12 notification-deck position-relative ' + notification.room.replace(/\s/g,'') + '" href="' + url_path + '" data-filterable="yes" data-target="' + notification.id + '" data-rel="lightcase" style="opacity: 0; display: none!important">' + (isMobile() === false ? '<i class="removeNotification fa fa-times-circle text-color-pink notification-remove" style="display: none;"></i>' : '<div class="notification-deck-remove">X</div>') + '<div class="row justify-content-center"><div class="col-9"><h3 class="m-0 notification-title">' + notification.originName + ' (' + notification.room + ')' + '</h3><p class="m-0 notification-text"> <b class="text-color-pink">' + window.i18next.t('views.notifications.movement') + ': </b><span>' + notification.time + '</span></p></div><div class="col-3 text-right"><img class="notification-img" onerror="this.onerror=null;this.src=\'/images/web/noimg.png\';" src="' + img_url_path + '" width="45" height="45" alt="' + window.i18next.t('views.notifications.img_notification') + '"/></div></div></a>');
             
      $('[data-target="' + notification.id + '"]')
        .velocity({ opacity: 1, display: 'block' }, 500);  
            
      if(!($('#removeAllNotifications').length) && role && role === 'Master'){
        $('.nots-container').append('<div class="remover d-flex justify-content-center" style="opacity: 0; display: none;"><div class="btn logout" id="removeAllNotifications">' + window.i18next.t('views.notifications.btn_removeall') + '</div></div>');
        $('.remover').velocity({ opacity: 1, display: 'block' }, 500);  
      }
        
      if(role && role === 'Master'){
        $('.notification-deck').hover(
          function () {
            let removeBtn = $(this).children()[0];
            $(removeBtn).velocity({ opacity: 1, display: 'block' });
          },
          function () {
            let removeBtn = $(this).children()[0];
            $(removeBtn).velocity({ opacity: 0, display: 'none' });
          }
        );
      }
                                     
    }
    
  }); //socket on notification end
    
  socket.on('notification_remove', id => {
    
    if($('.notbadge').length){
         
      $('.notbadge').each(function(){
           
        if(id === 'all'){
           
          $(this).text(0);
             
        } else {
             
          let badgeSize = $(this).text();
          badgeSize = parseInt(badgeSize);
          badgeSize--;
           
          $(this).text(badgeSize);
            
        }
             
      });
      
    }
      
    if(title === 'Notifications'){
          
      if($('[data-target="' + id + '"]').length){
          
        let not = $('[data-target="' + id + '"]');
          
        if(!not.attr('data-removed-manual')){
            
          $('[data-target="' + id + '"]').velocity({ opacity: 0, display: 'none' }, { duration: 500 }).then( function(){ 
            $(this).remove(); 
                
            if (!notifications.length) {
              $('#removeAllNotifications').remove();
              $('.nots-container').append(
                '<img class="container d-flex justify-content-center mw-470" src="/images/web/no_notifications.png" alt="' + window.i18next.t('views.notifications.no_notifications') + '" />'
              );
            }
                
          });
          
        }
        
        
      }  
      
    }
         
  });  //socket on notification_remove end
  
  //}
  
  //notification banner
  $(window).on('click', function(){
    if($('#nb-dialog-container').length && $('#nb-dialog-container').css('top') !== '-150px'){
      $('#nb-dialog-container').velocity({top: -150},{ duration: 500, easing: 'easeInOutCubic' });
      if(hideBannerTimeout)
        clearTimeout(hideBannerTimeout);
    }
  });
  
  $(window).on('mouseenter', function(e){
    let target = $(e.target);
    let enterBanner = target.parents('#nb-dialog-container');      
    let enterBannerActive = $('#nb-dialog-container').length ? $('#nb-dialog-container').css('top') !== '-150px' : false;
   
    if(enterBanner.length){
      clearTimeout(hideBannerTimeout);
      hideBannerTimeout = false;
    } else {
      if(enterBannerActive && hideBannerTimer && !hideBannerTimeout){
        hideBannerTimeout = setTimeout(function(){
          $('#nb-dialog-container').velocity(
            {
              top: -150,
            },
            { duration: 500, easing: 'easeInOutCubic' }
          );
        }, hideBannerTimer * 1000);
      }
    }
  });

  function hideBanner(el, trgt, d, event) {    
    if (d == 'up') {
      let target = trgt.parents('#nb-dialog-container');      
      $(target).velocity(
        {
          top: -150,
        },
        { duration: 500, easing: 'easeInOutCubic' }
      );
    }
  }
  
  if($('#nb-dialog-container').length)  
    detectswipe('#nb-dialog-container', hideBanner);
    
  $('#nb-dialog-container').on('touchmove',function(e){
    e.preventDefault();
  });
  
})(jQuery);