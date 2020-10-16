(async function ($) {
  'use strict';
  
  const timeout = (ms) => new Promise((res) => setTimeout(res, ms));
 
  let cameras = getCameras();
  let dashboard = getSettings();
  let ssl = getSSL();  
  let userActive = true;
  let snapshotInterval;
  let player;
    
  $('.fs-arrow-db').on('click', function(e){
    
    let bg = $('.fs-bg');
      
    let videoCard = $(this).parents('.video-cards');
    let card = $(this).next();
    let video = $(card).find('.card-img-bottom');
      
    let fullscreen = video.hasClass('camera-fs');
        
    if(fullscreen){
        
      videoCard.attr('data-aos', 'fade-up');
      $('.fs-arrow-db').removeAttr('style').removeClass('fa-compress-alt').addClass('fa-expand-alt');
      video.addClass('db-img-bottom');
      video.removeClass('camera-fs');
      bg.removeClass('fs-bg-on');
      $('html, body').removeAttr('style');
        
    } else {
        
      videoCard.removeAttr('data-aos');
      $('.fs-arrow-db').attr('style', 'top: calc(env(safe-area-inset-top, -17px ) + 17px) !important; position: fixed!important; right: 15px;').removeClass('fa-expand-alt').addClass('fa-compress-alt');
      video.removeClass('db-img-bottom');
      video.addClass('camera-fs');
      bg.addClass('fs-bg-on');
      $('html, body').attr('style', 'overflow: hidden; background:#000000!important;');
           
    }
    
  });
  
  // Init AOS
  function aos_init() {
    AOS.init({
      duration: 1000,
      once: true,
    });
  }
  
  aos_init();
  
  $(window).scroll(function () {
    if ($(document).scrollTop() > 50) {
      let imgSrc;
      const currentColorTheme = localStorage.getItem('theme-color')
        ? localStorage.getItem('theme-color')
        : null;
  
      if (currentColorTheme) {
        imgSrc =
            '/images/web/logo_transparent-256_' + currentColorTheme + '.png';
      } else {
        imgSrc = '/images/web/logo_transparent-256.png';
      }
  
      if (isPhone() && window.location.pathname.includes('dashboard')) {
        $('nav').addClass('small-nav-desk');
        $('#contentText').replaceWith(
          '<div id="contentImg"><img src="' +
              imgSrc +
              '" width="45" height="45" alt="Logo"><a class="nav-header-title2" href="/dashboard" target="_self">Dashboard</a></div>'
        );
      }
    } else {
      if (isPhone() && window.location.pathname.includes('dashboard')) {
        let username = getUsername();
  
        $('nav').removeClass('small-nav-desk');
        $('#contentImg').replaceWith(
          '<div id="contentText">' + window.i18next.t('views.dashboard.hello') + ' <b class="text-color-pink">' +
              username +
              '</b><p class="header-undertitle">' + window.i18next.t('views.dashboard.undertitle') + '</p></div>'
        );
      }
    }
  });
  
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') {
      userActive = true;
    } else {
      userActive = false;
    }
  });

  const getSnapshot = function (cam, dashboard) {
    
    let loader = '#' + cam.name + 'LDR';
    cam.counter = 0;

    if (cam.snapshotInterval) clearInterval(cam.snapshotInterval);

    if (userActive) {
      if ($(loader).css('display') === 'none') {
        $(loader).velocity({ opacity: 1, display: 'block' });
      }

      $.post('/dashboard', { name: cam.originName }).always(function (data, textStatus, jqXHR) {
        if (jqXHR.status === 200) {
          let img = data;
          let placeholder = '#' + cam.name;
          let snap = placeholder + 'Snap';
          let timer = placeholder + 'Timer';

          let isNotImg = $(snap).hasClass('fs-container');
          
          if(isNotImg){
          
            $(snap).remove();
  
            $(placeholder).append(
              '<img class="card-img-bottom db-img-bottom" onerror="this.onerror=null;this.src=\'/images/web/noimg.png\';" src="data:image/png;base64,' +
                  img +
                  '" alt="Snapshot" id="' +
                  cam.name +
                  'Snap" />'
              );
          
          } else {
          
            $(snap).attr('src', ('data:image/png;base64,' + img));
          
          }

          $(loader).velocity({ opacity: 0, display: 'none' });
          $(timer).text('Now');

          cam.snapshotInterval = setInterval(function () {
            ++cam.counter;
            $(timer).text(cam.counter + 's');
          }, 1000);

          let refreshTimer = isNaN(parseInt(dashboard.refreshTimer))
            ? false
            : parseInt(dashboard.refreshTimer) * 1000;

          if (refreshTimer) {
            setTimeout(function () {
              getSnapshot(cam, dashboard);
            }, refreshTimer);
          }
        } else {
          console.log(data)                   
        }
      });
        
    } else {
      
      setTimeout(function () {
        getSnapshot(cam, dashboard);
      }, 5000);
        
    }
      
  };

  if (cameras) {
    
    for (const i in cameras) {
      
      let loader = '#' + cameras[i].name + 'LDR';

      await timeout(1000);
        
      if (cameras[i].ping && $(loader).length) {
          
        let liveStream = false;
          
        for(const cam of Object.keys(dashboard.cameras))
          if(cam === cameras[i].originName)
            liveStream = dashboard.cameras[cam].livestream;
          
        if(liveStream){
            
          let object = document.getElementById(cameras[i].name + 'Stream');
          let url =
              (ssl ? 'wss://' : 'ws://') +
              document.location.hostname +
              ':' +
              cameras[i].socketPort +
              '/';
              
          player = new JSMpeg.Player(url, { canvas: object, pauseWhenHidden: false });
          
          player.volume = 0;
          $(loader).velocity({ opacity: 0, display: 'none' });
            
        } else {
          getSnapshot(cameras[i], dashboard);
        }
      } else {
      
         if(!cameras[i].ping)
           $.snack('error', cameras[i].originName + ' offline!', 3000)
      
      }
    }
  }
  
})(jQuery);
