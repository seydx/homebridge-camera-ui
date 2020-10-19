(async function ($) {
  'use strict';

  const timeout = (ms) => new Promise((res) => setTimeout(res, ms));
  let ssl = getSSL();
  let ping = getPing();  
  let object = document.getElementById(camId);
  let url = (ssl ? 'wss://' : 'ws://') + document.location.hostname + ':' + port + '/';
  let loader = '#' + camId + 'LDR';

  if(ping && port){
    await timeout(1000);
    let player = new JSMpeg.Player(url, { canvas: object });
    $(loader).velocity({ opacity: 0, display: 'none' });
  } else {
    $.snack('error', title + ' ' + window.i18next.t('views.camera.offline'), 3000);
  }
    
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
  
  $('[data-toggle="popover"]').popover();
    
  $('.fs-arrow').on('click', function(){
    
    let video = $('canvas');
    let bg = $('.fs-bg');
      
    if(video.length){
      
      let fullscreen = video.hasClass('camera-fs');
        
      if(fullscreen){
        
        $('.fs-arrow').removeAttr('style').removeClass('fa-compress-alt').addClass('fa-expand-alt');
        video.removeClass('camera-fs');
        bg.removeClass('fs-bg-on');
        $('html, body').removeAttr('style');
        
      } else {
          
        $('.fs-arrow').attr('style', 'top: calc(env(safe-area-inset-top, -17px ) + 17px) !important;').removeClass('fa-expand-alt').addClass('fa-compress-alt');
        video.addClass('camera-fs');
        bg.addClass('fs-bg-on');
        $('html, body').attr('style', 'overflow: hidden; background:#000000!important;');
        
      }
      
    }
    
  });
    
  if (isPhone()) {
    var p;
  
    $(window).scroll(function () {
      if ($(document).scrollTop() > 50) {
        $('nav, .navbar-toggler').removeClass('transparent');
  
        if (!$('#phoneLogo').length) {
          p = $('#back').detach();
          $('#contentImg').append(
            '<img src="/images/web/logo_transparent-256.png" width="45" height="45" alt="" id="phoneLogo" /><a class="nav-header-title2" href="/dashboard" target="_self"  id="phoneTitle">' + getTitle() + '</a>'
          );
        }
      } else {
        $('nav, .navbar-toggler').addClass('transparent');
  
        if ($('#phoneLogo').length) {
          p.appendTo('#contentImg');
          $('#phoneLogo, #phoneTitle').remove();
        }
      }
    });
  }
  
})(jQuery);
