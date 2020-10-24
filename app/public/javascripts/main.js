(async function ($) {
  'use strict';
  
  const timeout = (ms) => new Promise((res) => setTimeout(res, ms)); 

  let theme = getTheme();
  
  //Toaster
  $.toastDefaults = {
    position: 'bottom-center',
    dismissible: true,
    stackable: true,
    pauseDelayOnHover: true, 
    style: {
      toast: 'bg-secondary text-light mb-save text-center',
      info: 'bg-color-pink text-light mb-save text-center',
      success: 'bg-success text-light mb-save text-center',
      warning: 'bg-warning text-dark mb-save text-center',
      error: 'bg-danger text-light mb-save text-center'
    }
  };
  
  //Go back
  $('.go-back-page').on('click', function(e){ 
    e.preventDefault(); 
    
    if($('#preloader').length)
      $('#preloader').velocity({ opacity: 1, display: 'block' }, 250 );
    
    window.history.length > 2 ? setTimeout(function(){ window.history.go(-1); }, 500) : window.location.replace('/dashboard');
  
  });
  
  // Preloader
  if ($('#preloader').length) {
    $('#preloader')
      .velocity({ opacity: 0, display: 'none' }, { delay: 100 })
      .then(() => {
        $('body').removeClass('overflow-hidden');
      });
  }
  
  //Back to top
  if($('.back-to-top').length){
    let scrolled = false;
    $(window).scroll(function () {
      if ($(this).scrollTop() > 50) {
        if(!scrolled){
          $('.back-to-top').velocity({ opacity: 1, display: 'block' });
          scrolled = true;
        }
      } else {
        if(scrolled){
          $('.back-to-top').velocity({ opacity: 0, display: 'none' });
          scrolled = false;
        }
      }
    });
  }
  
  $('.back-to-top').click(function () {
    $('html, body').velocity(
      {
        scrollTop: 0,
      },
      1500,
      'easeInOutExpo'
    );
    return false;
  });
  
  //logout, navi toggle
  $(window).click(function(e){
    if(e.target && e.target.id === 'logoutBtn'){
      $('#main, #footer').velocity({ opacity: 0, display: 'none' }, 500)
        .then( async () => {
          $('#main, #footer').remove();
          $('#loading').velocity({ opacity: 1, display: 'block' }, 500)
            .then( async () => {
              await timeout(1500);
              $('#loading').velocity({ opacity: 0, display: 'none' }, 500)
                .then( () => {
                  $('#loading').remove();
                  window.location.replace('/logout');
                });
            });
        });
    } 
    if(e.target && e.target.id === 'togglebutton'){
      if ($('body').hasClass('overflow-hidden')) {
        $('body').removeClass('overflow-hidden');
        $('body').addClass('overflow-auto');
      } else {
        $('body').removeClass('overflow-auto');
        $('body').addClass('overflow-hidden');
      }
    
      if ($('.mobile-nav-overly').hasClass('hidebg')) {
        $('.mobile-nav-overly').removeClass('hidebg');
        $('.mobile-nav-overly').addClass('showbg');
        $('.mobile-nav-overly').velocity({ opacity: 1, display: 'block' }, 100);
      } else {
        $('.mobile-nav-overly').removeClass('showbg');
        $('.mobile-nav-overly').addClass('hidebg');
        $('.mobile-nav-overly').velocity({ opacity: 0, display: 'none' }, 100);
      }
    
      if ($('#navbarNavCustom').hasClass('hidenavi')) {
        $('#navbarNavCustom').removeClass('hidenavi');
        $('#navbarNavCustom').addClass('shownavi');
        $('#navbarNavCustom').velocity({ opacity: 1, display: 'block' }, 100);
      } else {
        $('#navbarNavCustom').removeClass('shownavi');
        $('#navbarNavCustom').addClass('hidenavi');
        $('#navbarNavCustom').velocity({ opacity: 0, display: 'none' }, 100);
      }
    }
    var container = $(
      '#navbarNavCustom, #togglebutton, .navbar-nav, .nav-item, .nav-link'
    );
  
    if (!container.is(e.target) && container.has(e.target).length === 0) {
      if ($('body').hasClass('overflow-hidden')) {
        $('body').removeClass('overflow-hidden');
      }
  
      if ($('.mobile-nav-overly').hasClass('showbg')) {
        $('.mobile-nav-overly').removeClass('showbg');
        $('.mobile-nav-overly').addClass('hidebg');
        $('.mobile-nav-overly').velocity({ opacity: 0, display: 'none' }, 100);
      }
  
      if ($('#navbarNavCustom').hasClass('shownavi')) {
        $('#navbarNavCustom').removeClass('shownavi');
        $('#navbarNavCustom').addClass('hidenavi');
        $('#navbarNavCustom').velocity({ opacity: 0, display: 'none' }, 100);
      }
    }
  });
  
  //stick footer on display
  if($('#footer').length){
    let sticked = false;
    $(window).on('load resize scroll', function() {
      let footer = $('#footer');
      let footer2 = $('#footer2');  
      if(safeAreaInsets.bottom)
        $('.snapLine').css('bottom', safeAreaInsets.bottom + 10);
      if ($('.snapLine').visible()) {
        if(!sticked){
          sticked = true;
          $('#footer2').velocity({ opacity: 1, display: 'block' }, 0);
          $('#footer').velocity({ opacity: 0, display: 'block' }, 0);
        }
      } else {
        if(sticked){
          sticked = false;
          $('#footer').velocity({ opacity: 1, display: 'block' }, 0);
          $('#footer2').velocity({ opacity: 0, display: 'block' }, 0);
        }
      }
    });
  }
  
  //smooth page transition 
  $('.smoothLink').click(function(e){  
    e.preventDefault();
    let targetUrl = $(this).attr('href');
    $('#main, #footer, #footer2, .back-to-top')
      .velocity({ opacity: 0, display: 'none' },0).then(async () => {
        $('#main, #footer, #footer2, .back-to-top').remove();
        $('#preloader').velocity({ opacity: 1, display: 'block' }, { duration: 250 });
        await timeout(250);
        window.location.replace(targetUrl);
      });
  });
  
  //adjust bg color
  if ($('#login-desk').length || $('nav').length) {
    $('html').addClass('bg-color-dwhite');
    $('body').addClass('bg-color-dwhite');
  } else {
    $('html').addClass('bg-color-white');
    $('body').addClass('bg-color-white');
  }
  
  if(!theme){
  
    //Restore theme if saved in localStorage
    const currentTheme = localStorage.getItem('theme')
      ? localStorage.getItem('theme')
      : null;
  
    if (currentTheme) {
      document.documentElement.setAttribute('data-theme', currentTheme);
    }
  
    const currentColorTheme = localStorage.getItem('theme-color')
      ? localStorage.getItem('theme-color')
      : null;
  
    if (currentColorTheme) {
      document.documentElement.setAttribute(
        'data-theme-color',
        currentColorTheme
      );
  
      $('img').each(function () {
        let imgSrc = $(this).attr('src');
        imgSrc = imgSrc.split('/');
        imgSrc = imgSrc[imgSrc.length - 1].split('.png')[0];
        if (
          imgSrc.includes('logo_') &&
          !imgSrc.includes('_blue') &&
          !imgSrc.includes('_yellow') &&
          !imgSrc.includes('_green') &&
          !imgSrc.includes('_gray')
        ) {
          let newSrc = '/images/web/' + imgSrc + '_' + currentColorTheme + '.png';  
          $(this).attr('src', newSrc);
        }
      });
    }
  
  } else {
  
    let themeColor = theme.split('-')[1];
    themeColor = themeColor === 'pink' ? false : themeColor;
    
    if(themeColor){
      $('img').each(function () {
        let imgSrc = $(this).attr('src');
        imgSrc = imgSrc.split('/');
        imgSrc = imgSrc[imgSrc.length - 1].split('.png')[0];
        if (
          imgSrc.includes('logo_') &&
          !imgSrc.includes('_blue') &&
          !imgSrc.includes('_yellow') &&
          !imgSrc.includes('_green') &&
          !imgSrc.includes('_gray')
        ) {
          let newSrc = '/images/web/' + imgSrc + '_' + themeColor + '.png';  
          $(this).attr('src', newSrc);
        }
      });
    }
  
  }
  
})(jQuery);    
