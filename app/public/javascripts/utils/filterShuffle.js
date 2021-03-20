//Filter

let pageTitle = getTitle();

$('#dataFilter').on('click', function (e) {

  if($('.breadcrumbs-filter').css('margin-top') === '0px'){
    $('.breadcrumbs-filter').velocity({
      marginTop: -65
    });
  } else {
    $('.breadcrumbs-filter').velocity({
      marginTop: 0
    });
  }

});

$(window).on('click', e => {

  if($('.breadcrumbs-filter').css('margin-top') === '0px' && !$(e.target).closest('.breadcrumbs-filter').length && !$(e.target).closest('.daterangepicker').length)
    $('.breadcrumbs-filter').velocity({
      marginTop: -65
    });

});

const shuffle = new Shuffle($('#shuffledCards'), {
  itemSelector: pageTitle === 'Recordings' || pageTitle === 'Cameras'
    ? '.video-cards'
    : '.filter-cards',
  sizer: '.sizer-item'
});

let collectedItems = [];

$('.filter-all').on('click', function(e) {
  
  $('.dropdown-item').removeClass('filter-dropdown-active');
  
  shuffle.filter();

});

$('.dropdown-item').on('click', function(e) {

  e.stopPropagation()

  const selectedGrp = $(this).attr('data-group');
  
  if($(this).hasClass('filter-dropdown-active')){
  
    $(this).removeClass('filter-dropdown-active');
    $(this).addClass('filter-dropdown-notactive');
    collectedItems = collectedItems.filter(item => item && item != selectedGrp);
  
  } else {
  
    $(this).removeClass('filter-dropdown-notactive');
    $(this).addClass('filter-dropdown-active');
    if(!collectedItems.includes(selectedGrp))
       collectedItems.push(selectedGrp)
  
  }
  
  shuffle.filter(collectedItems);

});

if(pageTitle !== 'Cameras'){
  
  const ranges = {};
  
  ranges[window.i18next.t('datepicker.today')]      = [moment().startOf('day'), moment().endOf('day')];
  ranges[window.i18next.t('datepicker.yesterday')]  = [moment().subtract(1, 'days').startOf('day'), moment().subtract(1, 'days').endOf('day')];
  ranges[window.i18next.t('datepicker.last7days')]  = [moment().subtract(6, 'days').startOf('day'), moment()];
  ranges[window.i18next.t('datepicker.last30days')] = [moment().subtract(29, 'days').startOf('day'), moment()];
  /*ranges[window.i18next.t('datepicker.thismonth')]  = [moment().startOf('month'), moment().endOf('month')];
  ranges[window.i18next.t('datepicker.lastmonth')]  = [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')];*/
  
  $('input[name="daterange"]').daterangepicker({
      "showDropdowns": true,
      "minYear": 2020,
      "maxYear": 2025,
      "ranges": ranges,
      "timePicker": true,
      "timePicker24Hour": true,
      "locale": {
          "format": "DD.MM.YYYY",
          "separator": " - ",
          "applyLabel": window.i18next.t('datepicker.applyLabel'),
          "cancelLabel": window.i18next.t('datepicker.cancelLabel'),
          "fromLabel": window.i18next.t('datepicker.fromLabel'),
          "toLabel": window.i18next.t('datepicker.toLabel'),
          "customRangeLabel": window.i18next.t('datepicker.customRangeLabel'),
          "weekLabel": window.i18next.t('datepicker.weekLabel'),
          "daysOfWeek": [
              window.i18next.t('datepicker.monday_code'),
              window.i18next.t('datepicker.tuesday_code'),
              window.i18next.t('datepicker.wednesday_code'),
              window.i18next.t('datepicker.thursday_code'),
              window.i18next.t('datepicker.friday_code'),
              window.i18next.t('datepicker.saturday_code'),
              window.i18next.t('datepicker.sunday_code')
          ],
          "monthNames": [
              window.i18next.t('datepicker.january'),
              window.i18next.t('datepicker.february'),
              window.i18next.t('datepicker.march'),
              window.i18next.t('datepicker.april'),
              window.i18next.t('datepicker.may'),
              window.i18next.t('datepicker.june'),
              window.i18next.t('datepicker.july'),
              window.i18next.t('datepicker.august'),
              window.i18next.t('datepicker.september'),
              window.i18next.t('datepicker.october'),
              window.i18next.t('datepicker.november'),
              window.i18next.t('datepicker.december')
          ],
          "firstDay": 1
      },      
      "autoUpdateInput": false,      
      "opens": "left",
      "buttonClasses": "btn",
      "applyButtonClasses": "btn logout m-0 ml-1",
      "cancelClass": "btn btn-secondary m-0 ml-1"
  }, function(start, end, label) {
  
    $('.dropdown-item').removeClass('filter-dropdown-active');
  
    shuffle.filter(element => {
      
      let dateAttr = $(element).attr('data-date-created');
      let date = dateAttr.split(', ')[0];
      let time = dateAttr.split(', ')[1].split(':').slice(0, -1).join(':');
  
      let day = date.split('.')[0];
      let month = date.split('.')[1];
      let year = date.split('.')[2];
      
      let dateString = year + '-' + month + '-' + day;
      let finDate = moment(dateString + ' ' + time);
      
      let isBetween = finDate.isBetween(start, end);
  
      let title = $(element).attr('data-title');
      console.log(title + ' [' + finDate.format('lll') + '] is ' + (isBetween ? 'between ' : 'NOT between [') + start.format('lll') + '] and [' + end.format('lll') + ']')
      
      return isBetween;
    });
  
  });

}