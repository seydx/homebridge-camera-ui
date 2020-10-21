(async function ($) {
  'use strict';
  
  let username = getUsername();
  
  const timeout = (ms) => new Promise((res) => setTimeout(res, ms));  
  
  let oldWidth = $('.page').width();
  let obj = $('.page');
  let lastIndexx = 0;
  let lastLeft = 0;
  
  $('.popover-dismiss').popover({
    trigger: 'hover'
  });
  
  $('#athome_endpoints').on('show.bs.collapse', function () {
    $('#athome_arrow').removeClass('fa-chevron-circle-down');
    $('#athome_arrow').addClass('fa-chevron-circle-up');
  });
  
  $('#athome_endpoints').on('hidden.bs.collapse', function () {
    $('#athome_arrow').removeClass('fa-chevron-circle-up');
    $('#athome_arrow').addClass('fa-chevron-circle-down');
  });
  
  $('.selectpicker').selectpicker({
    noneSelectedText : window.i18next.t('views.settings.views.general.nothing_selected'),
    countSelectedText: function(selected, all){
      if(selected && selected > 1){
        return selected.toString() + ' ' +  window.i18next.t('views.cameras.title');
      }
    }
  });
    
  //inital scroll
  let initScroll = $(window).scrollTop();
    
  $(window).on('scroll', function(){
    if (!$(document.activeElement).is('input, select, textarea'))
      initScroll = $(this).scrollTop();
  });
        
  $('input[type=text], input[type=password], textarea').blur(function() {
    setTimeout(function() {
      if (!$(document.activeElement).is('input[type="text"], input[type=password], textarea')) {
        $('html').velocity({
          scrollTop: initScroll
        }, 800);
      }
    }, 0);
    $(this).unbind('blur');
  });
    
  $('input[type="text"], input[type=password], textarea').on('click focus', function(e){
    
    $(this).bind('blur');
      
    let width = $(this).width(); 
    $('#popupTxt').val($(this).val());
    $('#popupTxt').off();
      
    if(width < 147){
        
      $(this).blur();
        
      let currentInput = $(this);
        
      $('#inputPopupLabel').text($(this).attr('data-name'));
      $('#inputPopup').modal({
        show: true,
        focus: true,
        keyboard: true
      });
        
      $('#popupTxt').on('change keyup', function(){
        currentInput.val($(this).val());
      });
        
      $('#popupTxt').focusout(function(){
        setTimeout(function() {
          if (!$(document.activeElement).is('input[type="text"], input[type=password], textarea')) {
            $('html').scrollTop(initScroll);
          }
        }, 0);
      });
  
    }
      
  });
    
  const toggleDarkSwitch = document.querySelector(
    '.darkmode-switch input[type="checkbox"]'
  );
  
  function switchTheme(e) {
    if (e.target.checked) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark'); //add this
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'light'); //add this
    }
  }
  
  toggleDarkSwitch.addEventListener('change', switchTheme, false);
  
  const currentTheme = localStorage.getItem('theme')
    ? localStorage.getItem('theme')
    : null;
  
  if (currentTheme === 'dark') {
    toggleDarkSwitch.checked = true;
  }
  
  const togglePinkSwitch = document.querySelector(
    'input[type="radio"].switch-pink'
  );
  const toggleBlueSwitch = document.querySelector(
    'input[type="radio"].switch-blue'
  );
  const toggleYellowSwitch = document.querySelector(
    'input[type="radio"].switch-yellow'
  );
  const toggleGreenSwitch = document.querySelector(
    'input[type="radio"].switch-green'
  );
  const toggleGraySwitch = document.querySelector(
    'input[type="radio"].switch-gray'
  );
  
  function switchToPinkTheme(e) {
    if (e.target.checked) {
      document.documentElement.removeAttribute('data-theme-color');
      localStorage.removeItem('theme-color'); //add this
  
      $('img').each(function () {
        let imgSrc = $(this).attr('src');
  
        if (imgSrc.includes('_blue')) {
          imgSrc = imgSrc.split('/');
          imgSrc = imgSrc[imgSrc.length - 1].split('_blue.png')[0];
        } else if (imgSrc.includes('_yellow')) {
          imgSrc = imgSrc.split('/');
          imgSrc = imgSrc[imgSrc.length - 1].split('_yellow.png')[0];
        } else if (imgSrc.includes('_green')) {
          imgSrc = imgSrc.split('/');
          imgSrc = imgSrc[imgSrc.length - 1].split('_green.png')[0];
        } else if (imgSrc.includes('_gray')) {
          imgSrc = imgSrc.split('/');
          imgSrc = imgSrc[imgSrc.length - 1].split('_gray.png')[0];
        } else {
          imgSrc = imgSrc.split('/');
          imgSrc = imgSrc[imgSrc.length - 1].split('.png')[0];
        }
  
        if (imgSrc.includes('logo_')) {
          let newSrc = '/images/web/' + imgSrc + '.png';
          $(this).attr('src', newSrc);
        }
      });
    }
  }
  
  togglePinkSwitch.addEventListener('change', switchToPinkTheme, false);
  
  function switchToBlueTheme(e) {
    if (e.target.checked) {
      document.documentElement.setAttribute('data-theme-color', 'blue');
      localStorage.setItem('theme-color', 'blue'); //add this
  
      $('img').each(function () {
        let imgSrc = $(this).attr('src');
  
        if (imgSrc.includes('_blue')) {
          imgSrc = imgSrc.split('/');
          imgSrc = imgSrc[imgSrc.length - 1].split('_blue.png')[0];
        } else if (imgSrc.includes('_yellow')) {
          imgSrc = imgSrc.split('/');
          imgSrc = imgSrc[imgSrc.length - 1].split('_yellow.png')[0];
        } else if (imgSrc.includes('_green')) {
          imgSrc = imgSrc.split('/');
          imgSrc = imgSrc[imgSrc.length - 1].split('_green.png')[0];
        } else if (imgSrc.includes('_gray')) {
          imgSrc = imgSrc.split('/');
          imgSrc = imgSrc[imgSrc.length - 1].split('_gray.png')[0];
        } else {
          imgSrc = imgSrc.split('/');
          imgSrc = imgSrc[imgSrc.length - 1].split('.png')[0];
        }
  
        if (imgSrc.includes('logo_')) {
          let newSrc = '/images/web/' + imgSrc + '_blue.png';
          $(this).attr('src', newSrc);
        }
      });
    }
  }
  
  toggleBlueSwitch.addEventListener('change', switchToBlueTheme, false);
  
  function switchToYellowTheme(e) {
    if (e.target.checked) {
      document.documentElement.setAttribute('data-theme-color', 'yellow');
      localStorage.setItem('theme-color', 'yellow'); //add this
  
      $('img').each(function () {
        let imgSrc = $(this).attr('src');
  
        if (imgSrc.includes('_blue')) {
          imgSrc = imgSrc.split('/');
          imgSrc = imgSrc[imgSrc.length - 1].split('_blue.png')[0];
        } else if (imgSrc.includes('_yellow')) {
          imgSrc = imgSrc.split('/');
          imgSrc = imgSrc[imgSrc.length - 1].split('_yellow.png')[0];
        } else if (imgSrc.includes('_green')) {
          imgSrc = imgSrc.split('/');
          imgSrc = imgSrc[imgSrc.length - 1].split('_green.png')[0];
        } else if (imgSrc.includes('_gray')) {
          imgSrc = imgSrc.split('/');
          imgSrc = imgSrc[imgSrc.length - 1].split('_gray.png')[0];
        } else {
          imgSrc = imgSrc.split('/');
          imgSrc = imgSrc[imgSrc.length - 1].split('.png')[0];
        }
  
        if (imgSrc.includes('logo_')) {
          let newSrc = '/images/web/' + imgSrc + '_yellow.png';
          $(this).attr('src', newSrc);
        }
      });
    }
  }
  
  toggleYellowSwitch.addEventListener('change', switchToYellowTheme, false);
  
  function switchToGreenTheme(e) {
    if (e.target.checked) {
      document.documentElement.setAttribute('data-theme-color', 'green');
      localStorage.setItem('theme-color', 'green'); //add this
  
      $('img').each(function () {
        let imgSrc = $(this).attr('src');
  
        if (imgSrc.includes('_blue')) {
          imgSrc = imgSrc.split('/');
          imgSrc = imgSrc[imgSrc.length - 1].split('_blue.png')[0];
        } else if (imgSrc.includes('_yellow')) {
          imgSrc = imgSrc.split('/');
          imgSrc = imgSrc[imgSrc.length - 1].split('_yellow.png')[0];
        } else if (imgSrc.includes('_green')) {
          imgSrc = imgSrc.split('/');
          imgSrc = imgSrc[imgSrc.length - 1].split('_green.png')[0];
        } else if (imgSrc.includes('_gray')) {
          imgSrc = imgSrc.split('/');
          imgSrc = imgSrc[imgSrc.length - 1].split('_gray.png')[0];
        } else {
          imgSrc = imgSrc.split('/');
          imgSrc = imgSrc[imgSrc.length - 1].split('.png')[0];
        }
  
        if (imgSrc.includes('logo_')) {
          let newSrc = '/images/web/' + imgSrc + '_green.png';
          $(this).attr('src', newSrc);
        }
      });
    }
  }
  
  toggleGreenSwitch.addEventListener('change', switchToGreenTheme, false);
  
  function switchToGrayTheme(e) {
    if (e.target.checked) {
      document.documentElement.setAttribute('data-theme-color', 'gray');
      localStorage.setItem('theme-color', 'gray'); //add this
  
      $('img').each(function () {
        let imgSrc = $(this).attr('src');
  
        if (imgSrc.includes('_blue')) {
          imgSrc = imgSrc.split('/');
          imgSrc = imgSrc[imgSrc.length - 1].split('_blue.png')[0];
        } else if (imgSrc.includes('_yellow')) {
          imgSrc = imgSrc.split('/');
          imgSrc = imgSrc[imgSrc.length - 1].split('_yellow.png')[0];
        } else if (imgSrc.includes('_green')) {
          imgSrc = imgSrc.split('/');
          imgSrc = imgSrc[imgSrc.length - 1].split('_green.png')[0];
        } else if (imgSrc.includes('_gray')) {
          imgSrc = imgSrc.split('/');
          imgSrc = imgSrc[imgSrc.length - 1].split('_gray.png')[0];
        } else {
          imgSrc = imgSrc.split('/');
          imgSrc = imgSrc[imgSrc.length - 1].split('.png')[0];
        }
  
        if (imgSrc.includes('logo_')) {
          let newSrc = '/images/web/' + imgSrc + '_gray.png'; 
          $(this).attr('src', newSrc);
        }
      });
    }
  }
  
  toggleGraySwitch.addEventListener('change', switchToGrayTheme, false);
  
  const currentColorTheme = localStorage.getItem('theme-color')
    ? localStorage.getItem('theme-color')
    : togglePinkSwitch.click();
  
  if (currentColorTheme === 'pink') {
    togglePinkSwitch.checked = true;
  } else if (currentColorTheme === 'blue') {
    toggleBlueSwitch.checked = true;
  } else if (currentColorTheme === 'yellow') {
    toggleYellowSwitch.checked = true;
  } else if (currentColorTheme === 'green') {
    toggleGreenSwitch.checked = true;
  } else if (currentColorTheme === 'gray') {
    toggleGraySwitch.checked = true;
  }
  
  $('.apply').click(function (e) {
    e.preventDefault();
  
    var form = $('#settingsForm')[0];
    var formData = new FormData();
  
    const file = $('#imageUpload')[0].files[0];
  
    formData.append('photo', file);
  
    $('#preloader')
      .velocity({opacity: 1, display: 'block'}, 250)
      .then(()=> {
        
        let formObj = JSON.stringify($('#settingsForm').serializeJSON());
        formData.append('data', formObj);
      
        $.ajax({
          url: '/settings',
          type: 'POST',
          processData: false,
          contentType: false,
          data: formData,
          complete: function (data, textStatus) {
            if (data.status == 400) {
              $.snack('error', 'Failed!', 3000);
              $('.bubble3').text(data.responseJSON.message);
              $('.bubble3').velocity({ opacity: 1, display: 'block' });
            }
      
            if (data.status === 202) {
              $.snack('success', 'Credentials changed!', 3000);
              window.location.replace('/logout');
              $(window).scrollTop(0);
              return;
            }
      
            if (data.status === 200) {
              $.snack('success', 'Settings saved!', 3000);
              window.location.reload(true);
              $(window).scrollTop(0);
              return;
            }
      
            $.snack('success', 'Settings saved!', 3000);
            $(window).scrollTop(0);
      
            $('.page').velocity(
              {
                left: 0,
              },
              100
            );
            $('.scrollitem').removeClass('active');
            let item = $('.scrollitem').get(0);
            $(item).addClass('active');
            $('#preloader').velocity({ opacity: 0, display: 'none' }, { delay: 500 });
          },
        });
        
      });
  
  });
    
  $('#resetSettings').click(function (e) {
      
    e.preventDefault();
      
    $('#confirmPopup').modal({
      show: true,
      focus: true,
      keyboard: false
    });

  });
    
  $('#confirmReset').click(function (e) {
      
    e.preventDefault();

    $('#preloader').velocity({ opacity: 1, display: 'block' });
  
    $.ajax({
      url: '/settings?reset=true',
      type: 'POST',
      complete: async function (data, textStatus) {
  
        if (data.status === 200) {
          
          await timeout(1000);
          window.location.replace('/logout');
            
        } else {
          
          $('#preloader').velocity({ opacity: 0, display: 'none' }, { delay: 500 });
          console.log('ERROR');
          
        }
          
      },
    });
  });
  
  $('#addUser').click(function (e) {
    let name = $('*[data-name="' + window.i18next.t('views.settings.views.profile.user_new_username') + '"]').val();
    let role = $('#userRoles option:selected').text();
    let pw = $('*[data-name="' + window.i18next.t('views.settings.views.profile.user_new_password') + '"]').val();   
    let index = $('.customUser').length;
    let adminUsername = $('#adminUsername').val();
    
    let validName = /^(?!.*\.\.)(?!.*\.$)[^\W][\w.]{0,15}$/.test(name);
    
    if (validName && name && !$('#' + name).length && pw && name !== username && name !== adminUsername) {
     
      let id = name.replace(/\s/g, '');
      
      $('#users').append(
        '<div class="customUser mb-5" id="' +
            id +
            '"><i class="fa fa-minus-circle text-color-pink mr-2 removeUser" data-target="' +
            id +
            '"></i><h4 class="text-color-pink d-inline">' +
            name +
            '</h4><div class="form-group mb-0 mt-4"><input class="form-control form-control" name="users[' + id + '][name]" type="hidden" value="' +
            name +
            '"/></div><div class="form-group mb-0 mt-2"><label>' + window.i18next.t('views.settings.views.profile.user_new_password') + '</label><input class="form-control form-control" value="' +
            pw +
            '" name="users[' + id + '][password]" readonly></div><div class="form-group mb-0 mt-2"><label data-i18n="views.settings.views.profile.user_new_role">' + window.i18next.t('views.settings.views.profile.user_new_role') + '</label><input class="form-control form-control" value="' +
            role +
            '" name="users[' + id + '][role]" readonly></div></div>'
      );
  
      $('#newUsername').val('');
    
    } else {
    
      $('#userName').popover('show');
    
    }
    
  });
  
  $('#users').on('click', '.removeUser', function (e) {
    let idUser = $(this).attr('data-target');
    $('#' + idUser).remove();
  });
  
  $('#addRoom').click(function (e) {
    let name = $('*[data-name="' + window.i18next.t('views.settings.views.general.rooms_name') +'"]').val();
    if (name && !$('#' + name).length) {
      let id = $('#roomName').val().replace(/\s/g, '');
  
      $('#rooms').append(
        '<li id="' +
            id +
            '" class="row m-0 p-0 justify-content-center break-text pt-1 pb-1"><div class="col-8">' +
            $('#roomName').val() +
            '<input class="form-control" type="hidden" name="general[rooms][]" value="' +
            $('#roomName').val() +
            '" /></div><div class="col-4 text-right text-color-pink"><i data-target="' +
            id +
            '" class="fa fa-minus-circle removeRoom"></i></div></li>'
      );
        
      $('#roomName').val('');
    }
  });
  
  $('#rooms').on('click', '.removeRoom', function (e) {
    let idRoom = $(this).attr('data-target');
    $('#' + idRoom).remove();
  });
  
  $('#profileImage').click(function (e) {
    $('#imageUpload').click();
  });
  
  function fasterPreview(uploader) {
    if (uploader.files && uploader.files[0]) {
      $('#profileImage').attr(
        'src',
        window.URL.createObjectURL(uploader.files[0])
      );
    }
  }
  
  $('#imageUpload').change(function () {
    fasterPreview(this);
  });
  
  $('.scrollitem').click(function (e) {
    e.preventDefault();
  
    $('.scrollitem').removeClass('active');
    $(this).addClass('active');
  
    let index = $(this).index();
    let width = index > lastIndexx ? -$('.page').width() : $('.page').width();
    let windowWidth = $(window).width();
  
    let difIndex = index - lastIndexx;
    width = difIndex * width;
  
    if (index > lastIndexx) {
      if (width > 0) {
        lastLeft -= width;
      } else {
        lastLeft += width;
      }
        
      let eleWidth = $(this).outerWidth() + 100;  
      let eLeft = $(this).offset().left;
      let pos = eLeft + eleWidth;

      if(pos > windowWidth){            
        let difEleToWindow = pos - windowWidth + $('.horizontal-btn-direction-settings').scrollLeft() + 6;            
        $('.horizontal-btn-direction-settings').velocity(
          {
            scrollLeft: difEleToWindow + 'px'
          },
          {
            duration: 500,
            easing: 'easeInOutCubic',
            queue: false
          }
        );         
      }
        
    } else {
      if (width > 0) {
        lastLeft += width;
      } else {
        lastLeft -= width;
      }
        
      let eLeft = $(this).offset().left - 100;
      let pos = eLeft;

      if(pos < 0){            
        let difEleToWindow = $('.horizontal-btn-direction-settings').scrollLeft() + pos - 6;
        $('.horizontal-btn-direction-settings').velocity(
          {
            scrollLeft: difEleToWindow + 'px'
          },
          {
            duration: 500,
            easing: 'easeInOutCubic',
            queue: false
          }
        );
      }
        
    }
  
    $(obj).velocity(
      {
        left: lastLeft
      },
      { 
        duration: 1000, 
        easing: 'easeInOutCubic',
        queue: false
      }
    );
  
    lastIndexx = index;
  
    $(window).scrollTop(0);
  });
  
  $(window).on('resize', function (event) {
    let newWidth = $('.page').width();
  
    if (newWidth != oldWidth) {
      let curLeft = lastIndexx * newWidth;
      let difWidth = oldWidth - newWidth; // + smaller >> -left / - bigger >> +left
      oldWidth = newWidth;
  
      let leftValue = parseInt(obj.css('left').replace('px', ''));
  
      if (leftValue != 0) {
        let oldValue = leftValue;
        leftValue = oldValue < 0 ? -curLeft : curLeft;
        lastLeft = oldValue < 0 ? -curLeft : curLeft;
      }
  
      $(obj).css('left', leftValue);
  
      $(window).scrollTop(0);
    }
  });
  
  let oldDif = 0;
  
  function myfunction(el, trgt, d) {
    let lastItem = obj.length - 1;
    let windowWidth = $(window).width();
      
    if (d == 'left') {
      if (lastItem !== lastIndexx) {
        $('.scrollitem').removeClass('active');
  
        let newVal = lastLeft - oldWidth;
        lastLeft = newVal;
        lastIndexx = Math.round(-(lastLeft / oldWidth));
  
        let id = $(obj[lastIndexx])[0].id;
  
        let idBefore = $(obj[lastIndexx - 1])[0];
        let idAfter = $(obj[lastIndexx + 1])[0];
  
        let url = 'a[href="#' + id + '"]';
        let linkActive = $(url);
  
        linkActive.addClass('active');
  
        let eleWidth = linkActive.outerWidth() + 25;  
        let eLeft = $(linkActive).offset().left;
        let pos = eLeft + eleWidth;

        if(pos > windowWidth){            
          let difEleToWindow = pos - windowWidth + $('.horizontal-btn-direction-settings').scrollLeft() + 6;      
          $('.horizontal-btn-direction-settings').velocity(
            {
              scrollLeft: difEleToWindow + 'px'
            },
            {
              duration: 500,
              queue: false
            }
          );
        }
  
        $(obj).velocity(
          {
            left: newVal,
          },
          {
            duration: 1000,
            easing: 'easeInOutCubic',
            queue: false,
            complete: function () {
              if ($(idBefore).length) $(idBefore).css('opacity', 100);
            },
          }
        );
  
        if ($(idBefore).length)
          $(idBefore).velocity(
            {
              opacity: 0
            },
            { duration: 500, queue: false }
          );
  
        $(window).scrollTop(0);
      }
    } else if (d == 'right') {
      if (lastIndexx !== 0) {
        $('.scrollitem').removeClass('active');
  
        let newVal = lastLeft + oldWidth;
        lastLeft = newVal;
        lastIndexx = Math.round(-(lastLeft / oldWidth));
  
        let id = $(obj[lastIndexx])[0].id;
        let url = 'a[href="#' + id + '"]';
        let linkActive = $(url);
  
        let idBefore = $(obj[lastIndexx - 1])[0];
        let idAfter = $(obj[lastIndexx + 1])[0];
  
        linkActive.addClass('active');
          
        let eleWidth = linkActive.outerWidth();  
        let eLeft = $(linkActive).offset().left - 25;
        let pos = eLeft;

        if(pos < 0){            
          let difEleToWindow = $('.horizontal-btn-direction-settings').scrollLeft() + pos - 6;            
          $('.horizontal-btn-direction-settings').velocity(
            {
              scrollLeft: difEleToWindow + 'px'
            },
            {
              duration: 500,
              easing: 'easeInOutCubic',
              queue: false
            }
          );
        }
  
        $(obj).velocity(
          {
            left: newVal
          },
          {
            duration: 1000,
            easing: 'easeInOutCubic',
            queue: false,
            complete: function () {
              if ($(idAfter).length) $(idAfter).css('opacity', 100);
            },
          }
        );
  
        if ($(idAfter).length)
          $(idAfter).velocity(
            {
              opacity: 0
            },
            { duration: 500, queue: false }
          );
  
        $(window).scrollTop(0);
      }
    }
  }
  
  detectswipe('#settings', myfunction);
  
})(jQuery);
