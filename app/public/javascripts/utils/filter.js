(async function ($) {
  'use strict';

  const sections = $('[data-filterable="yes"]');
  
  function jsUcfirst(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
  
  $('#filterControls').on('change', ':checkbox', function () {
    sections.velocity({ opacity: 0, display: 'none' });
  
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
  
      if (this.value !== 'all') {
        if (this.checked) {
          if (breadTitle === '') {
            breadTitle = jsUcfirst(this.value);
          } else {
            breadTitle += ', ' + jsUcfirst(this.value);
          }
          setTimeout(() => {
            if ($('.' + this.value).css('display') == 'none')
              $('.' + this.value).velocity({ opacity: 1, display: 'block' });
          }, 500);
        }
      } else {
        if (this.checked) {
          let title = getTitle();
          if(title === 'Cameras'){
            title = window.i18next.t('views.cameras.title');
          } else if(title === 'Notifications'){
            title = window.i18next.t('views.notifications.title');
          } else if(title === 'Recordings'){
            title = window.i18next.t('views.recordings.title');
          }
          breadTitle = title = window.i18next.t('breadcrumb.all') + ' ' + title;
          setTimeout(() => {
            if (sections.css('display') == 'none') sections.velocity({ opacity: 1, display: 'block' });
          }, 500);
        }
      }
  
      $('#breadTitle').text(breadTitle);
    });
  });
  
})(jQuery);
