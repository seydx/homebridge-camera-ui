(async function ($) {
  'use strict';
    
  const timeout = ms => new Promise(res => setTimeout(res, ms));
  
  function login_() {
    /*==================================================================
        [ Focus input ]*/
  
    $('.popover-dismiss').popover({
      trigger: 'focus',
    });
  
    $('.input100').each(function () {
      $(this).on('blur', function () {
        if ($(this).val().trim() != '') {
          $(this).addClass('has-val');
        } else {
          $(this).removeClass('has-val');
        }
      });
    });
  
    $('.input200').each(function () {
      $(this).on('blur', function () {
        if ($(this).val().trim() != '') {
          $(this).addClass('has-val');
        } else {
          $(this).removeClass('has-val');
        }
      });
    });
  
    /*==================================================================
        [ Show pass ]*/
    var showPass = 0;
    $('.btn-show-pass').on('click', function () {
      if (showPass == 0) {
        $(this).next('input').attr('type', 'text');
        $(this).find('i').removeClass('fa-eye');
        $(this).find('i').addClass('fa-eye-slash');
        showPass = 1;
      } else {
        $(this).next('input').attr('type', 'password');
        $(this).find('i').addClass('fa-eye');
        $(this).find('i').removeClass('fa-eye-slash');
        showPass = 0;
      }
    });
  }
  
  login_();
  
  /*==================================================================
      [ Login for smartphones ]*/
  
  $(window).click(function (e) {
      
    let button = e.target.id;
  
    if (button === 'continue-btn') {
      //continue to sign in
  
      let currentcontent = $('#landing');
      append_login(button, currentcontent);
        
    } else if (
      button === 'back-btn' ||
        button === 'back-btn-a' ||
        button === 'back-btn-svg'
    ) {
      //back to landing
  
      let currentcontent = $('#login');
      append_landing(currentcontent);
        
    } else if(button === 'login-btn'){
      
      e.preventDefault();
      
      let mobile = isPhone();
      let username = $('#username').val();
      let password = $('#password').val();
        
      $.post('/', { mobile: mobile, username: username, password: password})
        .always(function(data, textStatus, jqXHR) { 
      
          $('#login-btn').val(window.i18next.t('views.login.loading') + '...'); 
        
          if (jqXHR.status === 200) {
          
            if(mobile){
            
              loader(jqXHR.responseJSON.photo, jqXHR.responseJSON.username, jqXHR.responseJSON.role, '/dashboard'); 
         
            } else {
          
              window.location.replace('/dashboard');
          
            }
        
          } else if(jqXHR.status === 201) {
        
            if(mobile){
            
              loader(jqXHR.responseJSON.photo, jqXHR.responseJSON.username, jqXHR.responseJSON.role, '/change'); 
         
            } else {
          
              window.location.replace('/change');
          
            }
        
          }else { 
        
            $('#login-btn').val(window.i18next.t('views.login.signin'));

            if($('.bubble').length){
          
              $('.bubble').text(data.responseJSON.message);  
              $('.bubble').velocity({ opacity: 1, display: 'block' }); 
          
            } else {
          
              $('.bubble2').text(data.responseJSON.message);  
              $('.bubble2').velocity({ opacity: 1, display: 'block' }); 
          
            }
       
          } 
        
        });
       
    }
      
  });
  
  function append_landing(currentcontent) {
      
    currentcontent.velocity({ opacity: 0, display: 'none' }).then( () => {
        
      currentcontent = currentcontent.detach();
  
      let body = $(
        '<div class="container h-100 d-flex justify-content-center align-content-center bg-color-white" id="landing" style="opacity: 0;">  ' +
            '       <div class="login-phone">  ' +
            '           <div class="row h-80 d-flex justify-content-center align-content-center"><img class="d-block" src="/images/web/logo_transparent-512.png" alt="Camera UI Logo" /></div>  ' +
            '           <div class="row h-20 d-flex justify-content-center align-content-center"> ' +
            '               <input class="blob" id="continue-btn" type="submit" value="' + window.i18next.t('views.login.go') + '" />  ' +
            '           </div>  ' +
            '       </div>  ' +
            '</div>'
      );
  
      $('main').append(body);
      
      $('#landing').velocity({ opacity: 1, display: 'block' }, 500);
  
      login_();
    });
  }
  
  function append_login(button, currentcontent) {
      
    currentcontent.velocity({ opacity: 0, display: 'none' }).then( () => {
        
      currentcontent = currentcontent.detach();
  
      let body = $(
        '<div class="d-flex h-100 w-100" id="login" style="opacity: 0;">' +
            '       <div class="container-fluid">  ' +
            '           <div class="row login-phone-header d-flex justify-content-center align-content-center">  ' +
            '               <div class="row w-100 mt-save">  ' +
            '                   <div class="col"><a href="#back" id="back-btn-a" class="backarrow" target="_self" style="display: block"><svg  id="back-btn-svg" class="bi bi-caret-left-fill" width="1em" height="1em" viewbox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path id="back-btn" d="M3.86 8.753l5.482 4.796c.646.566 1.658.106 1.658-.753V3.204a1 1 0 0 0-1.659-.753l-5.48 4.796a1 1 0 0 0 0 1.506z"></path></svg></a></div>  ' +
            '                   <div  ' +
            '                       class="col p-0">  ' +
            '                       <div class="row w-100 m-0 d-flex justify-content-center align-content-center">  ' +
            '                           <div class="w-100 d-flex justify-content-center"><img id="userpic" src="/images/user/anonym.png" alt="User" /></div>  ' +
            '                           <div class="w-100 text-center mt-3">  ' +
            '                               <h3 class="profile-title" id="usertitle">' + window.i18next.t('views.login.anonym') + '</h3>  ' +
            '                               <p class="profile-role" id="userrole">' + window.i18next.t('views.login.guest') + '</p>  ' +
            '                           </div>  ' +
            '                       </div>  ' +
            '               </div>  ' +
            '               <div class="col d-flex justify-content-end"></div>  ' +
            '           </div>  ' +
            '       </div>  ' +
            '       <div class="row login-phone-body d-flex justify-content-center align-content-center">  ' +
            '           <div class="login100-form">  ' +
            '               <form method="post" id="login-post">  ' +
            '                   <div class="container-login-inputs">  ' +
            '                       <div class="bubble" style="display:none"></div>' +
            '                       <div class="wrap-input100"><input class="input100" id="username" type="text" name="username" autocomplete="username" /><span class="focus-input100" data-placeholder="' + window.i18next.t('views.login.username') + '"></span></div>  ' +
            '                       <div class="wrap-input100-pw" data-validate="Enter password"><span class="btn-show-pass"><i class="fas fa-eye"></i></span><input class="input100" id="password" type="password" name="password" autocomplete="current-password" /><span class="focus-input100" data-placeholder="' + window.i18next.t('views.login.password') + '"></span></div>  ' +
            '                       <a class="forgotpw popover-dismiss" tabindex="0" data-toggle="popover" data-placement="bottom" data-trigger="focus" data-content="' + window.i18next.t('views.login.forgotpw_info') + '">' + window.i18next.t('views.login.forgotpw') + '</a>  ' +
            '                   </div>  ' +
            '                   <div class="container-login100-form-btn text-center">  ' +
            '                       <div class="wrap-login100-form-btn d-flex justify-content-center align-content-center"><input id="login-btn" class="login100-form-btn2" type="submit" value="' + window.i18next.t('views.login.signin') + '" /></div>  ' +
            '                   </div>  ' +
            '               </form>  ' +
            '           </div>  ' +
            '       </div>  ' +
            '   </div>  ' +
            '</div>'
      );
  
      $('main').append(body);
      
      $('#login').velocity({ opacity: 1, display: 'block' }, 500);
        
      login_();
  
    });
  }
  
  async function loader(imgdest, name, role, dest){
    
    $('#userpic, #userpic-black, #usertitle, #usertitle-black, #userrole, #userrole-black')
      .velocity({ opacity: 0, display: 'block' }, 250)
      .then( () => {
        $('#userpic').attr('src', imgdest);
        $('#userpic-black').attr('src', imgdest);
        $('#usertitle').text(name);
        $('#usertitle-black').text(name);
        $('#userrole').text(role);
        $('#userrole-black').text(role);
        $('#userpic, #userpic-black, #usertitle, #usertitle-black, #userrole, #userrole-black')
          .velocity({ opacity: 1, display: 'block' }, 250);   
      });
      
    await timeout(1500);
      
    $('#login')
      .velocity({ opacity: 0, display: 'none' }, 500)
      .then( async () => {
      
        $('#login').remove();
      
        $('#loading')
          .velocity({ opacity: 1, display: 'block' }, 500)
          .then( async () => {
         
            await timeout(1500);
          
            $('#loading')
              .velocity({ opacity: 0, display: 'none' }, 500)
              .then( () => {
          
                $('#loading').remove();
            
                window.location.replace(dest);
          
              });
  
          });
      
      });
      
  }
  
})(jQuery);
