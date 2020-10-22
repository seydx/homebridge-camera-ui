(async function ($) {
  'use strict';
  
  let mainTitle = getTitle(); 
  let found = false;
  let cardsTimer;
  
  let title = getTitle();
  if(title === 'Cameras'){
    title = window.i18next.t('views.cameras.title');
  } else if(title === 'Notifications'){
    title = window.i18next.t('views.notifications.title');
  } else if(title === 'Recordings'){
    title = window.i18next.t('views.recordings.title');
  }

  let sections = $('[data-filterable="yes"]');
  
  function jsUcfirst(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
  
  $('#filterControls').on('change', ':checkbox', function () {
    
    if(sections.length !== $('[data-filterable="yes"]').length)
      sections = $('[data-filterable="yes"]');
      
    sections.fadeOut(); 
  
    let breadTitle = '';
    let allBoxes = $('.filterBtn:checkbox');
  
    let clickedCheckboxName = this.value;
    let clickedCheckboxStatus = this.checked;
  
    let allCheckBox = null;
  
    let boxStates = [];
  
    allBoxes.each(function () {
      if (
        clickedCheckboxName == 'all' &&
          clickedCheckboxStatus &&
          this.value !== clickedCheckboxName
      ) {
        $(this).prop('checked', false);
      } else if (clickedCheckboxName !== 'all' && clickedCheckboxStatus) {
        if (this.value == 'all') {
          $(this).prop('checked', false);
          allCheckBox = $(this);
        }
  
        if (this.value !== 'all' && this.checked) boxStates.push(this.checked);
      }
    });
  
    if (allBoxes.length - 1 == boxStates.length) {
      $('.filterBtn:checkbox[value=all]').prop('checked', true);
  
      allBoxes.each(function () {
        if (this.value !== 'all') $(this).prop('checked', false);
      });
    }
  
    allBoxes.each(function () {
      let curVal = this.value;
      let checked = false;
  
      if (this.value !== 'all') {
        if (this.checked) {
          if (breadTitle === '') {
            breadTitle = jsUcfirst(this.value);
          } else {
            breadTitle += ', ' + jsUcfirst(this.value);
          }
          setTimeout(() => {
          
            if($('.' + this.value).length){
            
              found = true;
            
              if ($('.' + this.value).css('display') == 'none')
                $('.' + this.value).fadeIn();
              
            }
          }, 500);
        } else {
        
          let checked = false;
        
          allBoxes.each(function () {
          
            if(this.checked)
              checked = true;
            
          });
          
          if(!checked){
            breadTitle = window.i18next.t('breadcrumb.all') + ' ' + title;
            $('.filterBtn:checkbox[value=all]').prop('checked', true).change();
          }
        
        }
        
      } else {
        
        if (this.checked) {
        
          breadTitle = window.i18next.t('breadcrumb.all') + ' ' + title;
          
          setTimeout(() => {
          
            if(mainTitle === 'Recordings')
              if($('.video-cards').length)
                found = true;
                
            if(mainTitle === 'Notifications')
              if($('.notification-deck').length)
                found = true;
          
            if (sections.css('display') == 'none'){
              sections.fadeIn();
            }
            
          }, 500);
          
        }
        
      }
  
      $('#breadTitle').text(breadTitle);
      
    });
    
    if(cardsTimer)
      clearTimeout(cardsTimer);
    
    cardsTimer = setTimeout(function(){
    
      if(found){
      
        if(mainTitle === 'Recordings'){
        
          found = false;
        
          if(!($('#removeAllRecordings').length))
            $('#removeContainer').append(
              '<div class="btn logout" id="removeAllRecordings">' + window.i18next.t('views.recordings.btn_removeall') + '</div>'
            );
        
          if($('.mw-470').length){
            $('.mw-470').remove();
          }
        
        }
        
        if(mainTitle === 'Notifications'){
        
          found = false;
        
          if(!($('#removeAllNotifications').length))
            $('#removeContainer').append(
              '<div class="btn logout" id="removeAllNotifications">' + window.i18next.t('views.notifications.btn_removeall') + '</div>'
            );
        
          if($('.mw-470').length){
            $('.mw-470').remove();
          }
        
        }
      
      } else {
      
        if(mainTitle === 'Recordings'){
        
          if($('#removeAllRecordings').length)
            $('#removeAllRecordings').remove();
        
          if(!($('.mw-470').length))
            $('#recordings').append(
              '<img class="container d-flex justify-content-center mw-470" src="/images/web/no_recordings.png" alt="' + window.i18next.t('views.recordings.no_recordings') + '" />'
            );
        
        
        }
        
        if(mainTitle === 'Notifications'){
        
          if($('#removeAllNotifications').length)
            $('#removeAllNotifications').remove();
        
          if(!($('.mw-470').length))
            $('.nots-container').append(
              '<img class="container d-flex justify-content-center mw-470" src="/images/web/no_notifications.png" alt="' + window.i18next.t('views.notifications.no_notifications') + '" />'
            );  
        
        }
      
      }
    
    }, 550);   
    
  }); 
  
})(jQuery);
