(async function ($) {
  'use strict';
  
  $('[data-toggle="popover"]').popover();
  
  let cameras = getCameras();
  
  if (cameras) {
    for (const cam of Object.keys(cameras)) {
      let camm = cameras[cam];
      let camId = camm.name;
      let camName = camm.originName;
      let ping = camm.ping;
  
      if (ping) {
        $.post('/cameras', { name: camm.originName }).always(function (data, textStatus, jqXHR) {
          if (jqXHR.status === 200) {
            let img = data;
            let loader = '#' + camId + 'LDR';
            let placeholder = '#' + camId + 'Snap';
            $(loader).remove();
  
            $(placeholder).replaceWith(
              '<img class="card-img-top add-shadow camera-img h-100" onerror="this.onerror=null;this.src=\'/images/web/noimg.png\';" src="data:image/gif;base64,' +
                  img +
                  '" alt="Snapshot"/>'
            );
          }
        });
      } else {
        $.snack('error', camm.originName + ' offline!', 3000);
      }
    }
  }
  
  if (isPhone()) {
    let navFadeTimeout;
  
    $(window).on('load resize', (e) => {
      if (
        $(window).height() > $(window).width() &&
          $('#left-arrow, #right-arrow').css('display') == 'flex'
      ) {
        $('#left-arrow, #right-arrow').attr('style', 'display: none!important');
        clearTimeout(navFadeTimeout);
        navFadeTimeout = undefined;
      }
  
      if (
        $(window).height() <= 450 &&
          $(window).height() < $(window).width() &&
          $('#left-arrow, #right-arrow').css('display') == 'none'
      ) {
        $('#left-arrow, #right-arrow').attr('style', 'display: flex!important');
  
        if (!navFadeTimeout)
          navFadeTimeout = setTimeout(() => {
            $('#cameras').mouseleave();
          }, 3000);
      }
    });
  
    $('#cameras').hover(
      (ein) => {
        if (
          $('#left-arrow, #right-arrow').css('display') == 'none' &&
            $(window).height() <= 450
        ) {
          $('#left-arrow, #right-arrow').velocity({ opacity: 1, display: 'block' }, { duration: 200 }).then( () => {
            $('#left-arrow, #right-arrow').attr(
              'style',
              'display: flex!important'
            );
  
            if (!navFadeTimeout)
              navFadeTimeout = setTimeout(() => {
                $('#cameras').mouseleave();
              }, 3000);
          });
        }
      },
      (eout) => {
        if (
          $('#left-arrow, #right-arrow').css('display') == 'flex' &&
            $(window).height() <= 450
        ) {
          $('#left-arrow, #right-arrow').velocity({ opacity: 0, display: 'none' }, { duration: 200 }).then( () => {
            $('#left-arrow, #right-arrow').attr(
              'style',
              'display: none!important'
            );
  
            clearTimeout(navFadeTimeout);
            navFadeTimeout = undefined;
          });
        }
      }
    );
  }
  
})(jQuery);
