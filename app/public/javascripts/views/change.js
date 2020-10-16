(async function ($) {
  'use strict';
    
  const timeout = ms => new Promise(res => setTimeout(res, ms));
  
  function login_() {
    /*==================================================================
        [ Focus input ]*/
  
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
  
  $('#login-btn').click(function(e) {
      
    e.preventDefault();
    
    let mobile = isPhone();
    let username = $('#username').val();
    let username_new = $('#username_new').val();
    let password = $('#password').val();
    let password_new = $('#password_new').val();
      
    $.post('/change', { mobile: mobile, username: username, username_new: username_new, password: password, password_new: password_new})
    .always(function(data, textStatus, jqXHR) { 
    
      $('#login-btn').val(window.i18next.t('views.change.loading') + '...'); 
      
      if (jqXHR.status === 200) {
        
        if(mobile){
          
          loader(jqXHR.responseJSON.photo, jqXHR.responseJSON.username, jqXHR.responseJSON.role, '/dashboard'); 
       
        } else {
        
          window.location.replace('/dashboard');
        
        }
      
      } else { 
      
        $('#login-btn').val(window.i18next.t('views.change.save_signin'));
        
        if($('.bubble').length){
          $('.bubble').text(data.responseJSON.message);  
          $('.bubble').velocity({ opacity: 1, display: 'block' }); 
        } else {
          $('.bubble2').text(data.responseJSON.message);  
          $('.bubble2').velocity({ opacity: 1, display: 'block' }); 
        }
     
      } 
      
    });
      
  });
  
  async function loader(imgdest, name, role, dest){
    
    $('#userpic, #userpic-black, #usertitle, #usertitle-black, #userrole, #userrole-black')
      .velocity({ opacity: 0, display: 'block' }, 250)
      .then( () => {
        $('#userpic-black').attr('src', imgdest);
        $('#usertitle-black').text(name);
        $('#userrole-black').text(role);
        $('#userpic-black, #usertitle-black, #userrole-black')
        .velocity({ opacity: 1, display: 'block' }, 250);   
      });
      
    $('#login-desk')
    .velocity({ opacity: 0, display: 'none' }, 500)
    .then( async () => {
      
      $('#login-desk').remove();
      
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
