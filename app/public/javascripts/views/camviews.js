(async function ($) {
  'use strict';

  const timeout = (ms) => new Promise((res) => setTimeout(res, ms));
  
  const socket = io();
  
  let cameras = getCameras();
  let camviews = getSettings();
  let ssl = getSSL();
  
  let topNaviTimer = false;
  let enteredFS = false;
  let userActive = true;
  let touchtime = 0;
  let delay = 800;
  let openFullscreen;
  let closeFullscreen;
  let snapshotInterval;
  let player;
  let elem = document.getElementById('main'); 

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
  
  $('html, body').attr('style', 'position: relative; overflow-x: hidden; overflow-y: visible; height: 100vh; background: #000000!important');
  
  let hideShowButtons = '.camview-btn-back, .camview-btn-logout, .camview-btn-fullscreen, .camview-btn-save, .camview-area, .nameOverlay, .notOverlay, .ui-resizable-se, .ui-resizable-e, .ui-resizable-s, .ui-resizable-sw, .ui-resizable-w';
  
  setTimeout(function () {   
    $(hideShowButtons)
      .velocity({ opacity: 0, display: 'none' })
      .then(() => {
        $(hideShowButtons).attr('style', 'display: none !important; opacity: 0!important');
      });
  }, 1000);
  
  $(window).on('click', function (e) {
    if (
      e.target.id !== 'skipclick' &&
        e.target.id !== 'logoutBtn' &&
        e.target.id !== 'logout'
    ) {
      if (
        $(hideShowButtons).css('display') == 'none'
      ) {
        $(hideShowButtons)
          .velocity({ opacity: 0, display: 'none' })
          .then(function(){
            $(hideShowButtons).attr('style', 'display: block !important; opacity: 100!important');
          });
      } else {
        $(hideShowButtons)
          .velocity({ opacity: 0, display: 'none' })
          .then(function(){
            $(hideShowButtons).attr('style', 'display: none !important; opacity: 0!important');
          });
      }
    }
  });

  let windowHeight = isPhone() || isTablet() || (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/.test(navigator.userAgent)) || ((navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) ? (typeof window.outerHeight != 'undefined')?Math.max(window.outerHeight, $(window).height()):$(window).height() : $(window).height();
  let windowWidth = $(window).width();

  let items = $('.grid-stack-item').length;
  
  if(items){
  
    let mainGrid = $('.grid-stack');
    let isMobile = isPhone() || isTablet() || (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/.test(navigator.userAgent)) || ((navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
  
    let grid = GridStack.init({
      //alwaysShowResizeHandle: isMobile,
      alwaysShowResizeHandle: false,
      disableOneColumnMode: true,
      animate: true,
      margin: 2,
      row: 12,
      float: true,
      column: 12,
      resizable: {
        //autoHide: !isMobile,
        autoHide: false,
        handles: 'e, se, s, sw, w'
      },
      cellHeight: windowHeight/12               
    });
    
    let curGrid = windowWidth > 500 ? 6 : 12;  
    let i = 0;
    let idNr = 0;
    let curAmount = 0;
    
    let serializedData = [];
    
    /*  Layouts
    
    items 1: (layout-1)
    
    items 2: (layout-2)
    
    items >2 && windowWidth >500: (layout-x-501)
    
    items >2 && windowWidth <=500: (layout-x-500)
    
    */
    
    if(items < 2){
    
      const currentLayout = localStorage.getItem('layout-1')
        ? localStorage.getItem('layout-1')
        : null;
    
      if (currentLayout) {
        serializedData = JSON.parse(currentLayout);
      }
    
    } else if(items < 3){
    
      const currentLayout = localStorage.getItem('layout-2')
        ? localStorage.getItem('layout-2')
        : null;
    
      if (currentLayout) {
        serializedData = JSON.parse(currentLayout);
      }
    
    } else if(items > 2 && windowWidth > 500){
    
      const currentLayout = localStorage.getItem('layout-x-501')
        ? localStorage.getItem('layout-x-501')
        : null;
    
      if (currentLayout) {
        serializedData = JSON.parse(currentLayout);
      }
    
    } else {
        
      const currentLayout = localStorage.getItem('layout-x-500')
        ? localStorage.getItem('layout-x-500')
        : null;
    
      if (currentLayout) {
        serializedData = JSON.parse(currentLayout);
      }
            
    }
    
    let restoreCameras = function(){
    
      if(!($('.grid-stack-item-content').hasClass('overflow-hidden'))){
         
        $('.grid-stack-item-content').addClass('overflow-hidden');
         
        let cameras = Object.keys(camviews.cameras);
         
        let activeCameras = [];
         
        cameras.forEach(cam => {
          if(camviews.cameras[cam].active){
            camviews.cameras[cam].camName = cam.replace(/\s/g,'');
            activeCameras.push(camviews.cameras[cam]);
          }
        });
         
        $('.grid-stack-item-content').each((index,ele) => { 
         
          let active = activeCameras[index].active;
          let ping = activeCameras[index].ping;
          let livestream = activeCameras[index].livestream;
          let cam = activeCameras[index].camName;
          let camEntry = activeCameras[index].name;
             
          let lastNotification = getLastNotifications();
          let notification;
             
          for(const not in lastNotification)
            if(not.name === camEntry)
              notification = not;
                 
          let appendData;
             
          if(active){
             
            if(!ping){
               
              appendData = '<div class="nameOverlay mt-save">' + camEntry + '</div><svg class="bi bi-camera-video-off camview-offline-video" width="1em" height="1em" viewbox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M10.961 12.365a1.99 1.99 0 0 0 .522-1.103l3.11 1.382A1 1 0 0 0 16 11.731V4.269a1 1 0 0 0-1.406-.913l-3.111 1.382A2 2 0 0 0 9.5 3H4.272l.714 1H9.5a1 1 0 0 1 1 1v6a1 1 0 0 1-.144.518l.605.847zM1.428 4.18A.999.999 0 0 0 1 5v6a1 1 0 0 0 1 1h5.014l.714 1H2a2 2 0 0 1-2-2V5c0-.675.334-1.272.847-1.634l.58.814zM15 11.73l-3.5-1.555v-4.35L15 4.269v7.462zm-4.407 3.56l-10-14 .814-.58 10 14-.814.58z"></path></svg>';
                 
            } else {
               
              appendData = '<div class="liveSnap w-100 h-100" id="' + cam + '">' + 
                   (!livestream ? 
                     '<div class="lds-ring-cv" id="' + cam + 'LDR">'+
                   '  <div></div>'+
                   '  <div></div>'+
                   '  <div></div>'+
                   '  <div></div>'+
                   '</div>'+
                   '<div class="updateOverlay" id="' + cam + 'Timer"></div>'+
                   '<div class="nameOverlay mt-save">' + camEntry + '</div>'+
                   '<div class="w-100 h-100 fs-container" id="' + cam + 'Snap"></div>' : 
                     '<div class="lds-ring" id="' + cam + 'LDR">'+
                   '  <div></div>'+
                   '  <div></div>'+
                   '  <div></div>'+
                   '  <div></div>'+
                   '</div>'+
                   '<div class="notOverlay text-center">' + window.i18next.t('views.camviews.lastnotification') + ': ' + (notification?
                       '<a href=' + notification.storing ? '/notifications/' + notification.id + (notification.fileType === 'Video' ? '.mp4' : '.jpeg') : '/images/web/no_recordings.png' + ' id="' + cam + 'Not" data-rel="lightcase"' + notification.timestamp + '</a>' :
                       '<span id="' + cam + 'Not">' + window.i18next.t('views.camviews.nodata') + '</span>') + '</div>'+
                   '<div class="nameOverlay mt-save">' + camEntry + '</div>'+
                   '<canvas class="w-100 h-100 fs-container" id="' + cam + 'Stream"></canvas>'
                   ) + 
                 '</div>';
               
            }
               
            $(ele).append(appendData);
             
          }
         
        });
         
      }
    
    };
  
    let saveGrid = function() {
    
      serializedData = grid.save();
      
      if(items < 2){
      
        localStorage.setItem('layout-1', JSON.stringify(serializedData));
      
      } else if(items < 3){
      
        localStorage.setItem('layout-2', JSON.stringify(serializedData));
      
      } else if(items > 2 && windowWidth > 500){
      
        localStorage.setItem('layout-x-501', JSON.stringify(serializedData));
      
      } else {
          
        localStorage.setItem('layout-x-500', JSON.stringify(serializedData));
              
      }
      
    }; 
    
    if(serializedData.length === items){
    
      //console.log("ITEMS AMOUNT EQUAL, LOAD FROM STORAGE")
      
      grid.load(serializedData, true);  
      
      restoreCameras();         
    
    } else {
    
      //console.log("ITEMS AMOUNT NOT EQUAL! CREATE NEW GRID")
      
      $('.grid-stack-item').each(function(index,ele){
      
        if(items > 2 && windowWidth > 500){
          if(i >= 2){
            i = 0;
            curAmount = curAmount + 12/(items/2 + (items % 2 !== 0 ? 0.5 : 0));
          }
        }
          
        let x = items < 3 ? 0 : (windowWidth > 500 ? (!index || index %2 === 0 ? 0 : 6) : 0);
        let y = items < 2 ? 0 : items < 3 ? index*6 : (windowWidth > 500 ? curAmount : curAmount );
        let itemWidth = items < 3 ? 12 : (windowWidth > 500 ? 6 : 12);
        let itemHeight = items < 2 ? 12 : items < 3 ? 6 : (windowWidth > 500 ? (12/(items/2 + (items % 2 !== 0 ? 0.5 : 0))) : (12/(items + (items % 2 !== 0 ? 1 : 0))));
          
        serializedData.push({
          x: x,
          y: y,
          width: itemWidth,
          height: itemHeight,
          id: idNr.toString()
        });
          
        grid.update(ele,x,y,itemWidth,itemHeight);
          
        if(items > 2 && windowWidth <= 500)
          curAmount = curAmount + 12/(items + (items % 2 !== 0 ? 1 : 0) );
          
        if(items > 2 && windowWidth > 500)
          i++;
            
        idNr++;
    
      });            
    
    }
    
    $('.camview-btn-save').on('click', function(e){
      e.preventDefault();
      
      saveGrid();
      
      $(this).text(window.i18next.t('views.camviews.btn_positions_saved'));
      
      setTimeout(() => {
        $(this).text(window.i18next.t('views.camviews.btn_positions'));
      }, 3000);
      
    });
      
    $(window).on('resize', function(){
  
      //windowHeight = (typeof window.outerHeight != 'undefined')?Math.max(window.outerHeight, $(window).height()):$(window).height()
      windowHeight = isPhone() || isTablet() || (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/.test(navigator.userAgent)) || ((navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) ? (typeof window.outerHeight != 'undefined')?Math.max(window.outerHeight, $(window).height()):$(window).height() : $(window).height();
      windowWidth = $(window).width();
      
      grid.cellHeight(windowHeight/12, true);
      
      if(items > 2){
      
        if(windowWidth > 500){
        
          if(curGrid === 12){
          
            curGrid = 6;
            i = 0;
            curAmount = 0;
            let gridData = [];
            
            const currentLayout = localStorage.getItem('layout-x-501')
              ? localStorage.getItem('layout-x-501')
              : null;
          
            if (currentLayout) {
              gridData = JSON.parse(currentLayout);
            }
            
            if(gridData.length === items){
            
              //console.log("RESIZED TO >500 - DATA FOUND IN STORAGE! LOAD")
              grid.load(gridData, true); 
              
              restoreCameras();  
            
            } else {
            
              //console.log("RESIZED TO >500 - DATA NOT FOUND! CREATE NEW GRID")
              
              $('.grid-stack-item').each(function(index,ele){
    
                if(i >= 2){
                  i = 0;
                  curAmount = curAmount + 12/(items/2 + (items % 2 !== 0 ? 0.5 : 0));
                }
                
                let y = curAmount;
                
                let x = !index || index %2 === 0 ? 0 : 6;
                
                grid.update(ele,x,y,6,12/(items/2 + (items % 2 !== 0 ? 0.5 : 0)));
                
                i++;
                
              });
            
            }
          
          }
        
        } else {
        
          if(curGrid === 6){
          
            curGrid = 12;
            i = 0;
            curAmount = 0;
            let gridData = [];
            
            const currentLayout = localStorage.getItem('layout-x-500')
              ? localStorage.getItem('layout-x-500')
              : null;
          
            if (currentLayout) {
              gridData = JSON.parse(currentLayout);
            }
            
            if(gridData.length === items){
            
              //console.log("RESIZED TO <=500 - DATA FOUND IN STORAGE! LOAD")
              
              grid.load(gridData, true);  
            
              restoreCameras(); 
            
            } else {
            
              //console.log("RESIZED TO <=500 - DATA NOT FOUND! CREATE NEW GRID")
              
              $('.grid-stack-item').each(function(index,ele){  
                
                let y = curAmount;
                
                grid.update(ele,0,y,12,12/(items + (items % 2 !== 0 ? 1 : 0) ));
                
                curAmount = curAmount + 12/(items + (items % 2 !== 0 ? 1 : 0) );
                
              });
            
            }
            
          }
        
        }
      
      }
  
    });
  
  }
  
  $('#logoutBtn').click(function(){
    $('html, body').removeAttr('style');
  });

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') {
      userActive = true;
    } else {
      userActive = false;
    }
  });

  const getSnapshot = function (cam, camviews) {
    let loader = '#' + cam.name + 'LDR';
    cam.counter = 0;

    if (cam.snapshotInterval) clearInterval(cam.snapshotInterval);

    if (userActive) {
      if ($(loader).css('display') === 'none') {
        $(loader).velocity({ opacity: 1, display: 'block' });
      }

      $.post('/camviews', { name: cam.originName }).always(function (data, textStatus, jqXHR) {
        if (jqXHR.status === 200) {
          let img = data;
          let placeholder = '#' + cam.name;
          let snap = placeholder + 'Snap';
          let timer = placeholder + 'Timer';
          
          let isNotImg = $(snap).hasClass('fs-container');
          
          if(isNotImg){
          
            $(snap).remove();
  
            $(placeholder).append(
              '<img class="w-100 h-100" onerror="this.onerror=null;this.src=\'/images/web/noimg.png\';" src="data:image/png;base64,' +
                img +
                '" alt="Snapshot" id="' +
                cam.name +
                'Snap"/>'
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

          let refreshTimer = isNaN(parseInt(camviews.refreshTimer))
            ? false
            : parseInt(camviews.refreshTimer) * 1000;

          if (refreshTimer) {
            setTimeout(function () {
              getSnapshot(cam, camviews);
            }, refreshTimer);
          }
        } else {
          console.log(data);
        }
      });
    } else {
      setTimeout(function () {
        getSnapshot(cam, camviews);
      }, 5000);
    }
  };

  if (cameras) {
    for (const i in cameras) {
      let loader = '#' + cameras[i].name + 'LDR';

      await timeout(1000);
      
      if (cameras[i].ping && cameras[i].socketPort && cameras[i].source && $(loader).length) {
        
        let liveStream = false;
        
        for(const cam of Object.keys(camviews.cameras))
          if(cam === cameras[i].originName)
            liveStream = camviews.cameras[cam].livestream;
        
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
          getSnapshot(cameras[i], camviews);
        }
      } else {
      
        if(!cameras[i].ping)
          $.snack('error', cameras[i].originName + ' offline!', 3000);
      
      }
    }
  }

  $(window).click(function (e) {
    
    if(e.target.localName === 'img' || e.target.localName === 'canvas'){
      
      if (touchtime == 0) {
        
        touchtime = new Date().getTime();
        
      } else {
        
        if (((new Date().getTime()) - touchtime) < delay) {
          
          let video = $(e.target);
          let fullscreen = video.hasClass('camera-fs');
          let bg = $('.fs-bg');
          
          if(fullscreen){
  
            video.removeClass('camera-fs');
            bg.removeClass('fs-bg-on');
            $('html, body').removeAttr('style');
            
            $('.notOverlay, .updateOverlay, .nameOverlay, .ui-resizable-se, svg').velocity({ opacity: 1, display: 'block' });
        
          } else {

            video.addClass('camera-fs');
            bg.addClass('fs-bg-on');
            $('html, body').attr('style', 'overflow: hidden; background:#000000!important;');
            
            $('.notOverlay, .nameOverlay, .ui-resizable-se, svg').velocity({ opacity: 0, display: 'none' });
        
          }

          touchtime = 0;
          
        } else {
          
          touchtime = 0;
          
        }
        
      }
      
    }

  });

  openFullscreen = function () {
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else if (elem.mozRequestFullScreen) {
      /* Firefox */
      elem.mozRequestFullScreen();
    } else if (elem.webkitRequestFullscreen) {
      /* Chrome, Safari and Opera */
      elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) {
      /* IE/Edge */
      elem.msRequestFullscreen();
    }
  };

  closeFullscreen = function () {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.mozCancelFullScreen) {
      /* Firefox */
      document.mozCancelFullScreen();
    } else if (document.webkitExitFullscreen) {
      /* Chrome, Safari and Opera */
      document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
      /* IE/Edge */
      document.msExitFullscreen();
    }
  };

  $('.camview-btn-fullscreen').click(function (e) {
    e.preventDefault();

    if ($(this).text() == window.i18next.t('views.camviews.btn_fullscreen')) {
      openFullscreen();
    } else if ($(this).text() == window.i18next.t('views.camviews.btn_close')) {
      closeFullscreen();
    }
  });
  
  document.addEventListener('fullscreenchange', (event) => {
    if (document.fullscreenElement) {
      console.log(
        `Element: ${document.fullscreenElement.id} entered fullscreen mode.`
      );
      enteredFS = true;
      $('.camview-btn-fullscreen').text(window.i18next.t('views.camviews.btn_close'));
    } else {
      console.log('Leaving full-screen mode.');
      enteredFS = false;
      $('.camview-btn-fullscreen').text(window.i18next.t('views.camviews.btn_fullscreen'));
    }
  });
  
  $(document).on('keydown', function (e) {
    if (e.key === 'F11' || e.keyCode === 122) {
      e.preventDefault();
      !enteredFS ? openFullscreen() : closeFullscreen();
    } else if ((e.key === 'Escape' || e.keyCode === 27) && enteredFS) {
      e.preventDefault();
      closeFullscreen();
    }
  });

})(jQuery);
