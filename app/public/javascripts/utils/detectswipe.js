function detectswipe(el, func) {
  
  let swipe_det = new Object();
  
  swipe_det.sX = 0;
  swipe_det.sY = 0;
  swipe_det.eX = 0;
  swipe_det.eY = 0;

  let min_x = 80; //min x swipe for horizontal swipe
  let max_x = 90; //max x difference for vertical swipe
  let min_y = 80; //min y swipe for vertical swipe
  let max_y = 90; //max y difference for horizontal swipe
  let direc = '';
  let mousedown = false;
  
  let ele = $(el);
  let target;

  ele.on('touchstart mousedown', function (e) {  
    
    if(e.type === 'mousedown'){
      mousedown = true;
      swipe_det.sX = e.pageX;
      swipe_det.sY = e.pageY;
    } else {
      var t = e.touches[0];
      swipe_det.sX = t.screenX;
      swipe_det.sY = t.screenY;
    }

    target = $(e.target);
    
  });
  
  ele.on('touchmove mousemove', function (e) {
    
    if(e.type === 'mousemove'){
      if(mousedown){
        swipe_det.eX = e.pageX;
        swipe_det.eY = e.pageY;
      }
    } else {
      var t = e.touches[0];
      swipe_det.eX = t.screenX;
      swipe_det.eY = t.screenY;
    }
  
  });
  
  ele.on('touchend mouseup', function (e) {
    
    //horizontal detection
    if ((swipe_det.eX - min_x > swipe_det.sX ||
      swipe_det.eX + min_x < swipe_det.sX) &&
      swipe_det.eY < swipe_det.sY + max_y &&
      swipe_det.sY > swipe_det.eY - max_y &&
      swipe_det.eX > 0) {
      
      if (swipe_det.eX > swipe_det.sX) direc = 'right';
      else direc = 'left';
    
    }
    
    //vertical detection
    else if ((swipe_det.eY - min_y > swipe_det.sY ||
      swipe_det.eY + min_y < swipe_det.sY) &&
      swipe_det.eX < swipe_det.sX + max_x &&
      swipe_det.sX > swipe_det.eX - max_x &&
      swipe_det.eY > 0) {
      
      if (swipe_det.eY > swipe_det.sY) direc = 'down';
      else direc = 'up';
   
    }

    if (direc != '') {
      if (typeof func == 'function') func(ele, target, direc, e);
    }
    
    direc = '';
    swipe_det.sX = 0;
    swipe_det.sY = 0;
    swipe_det.eX = 0;
    swipe_det.eY = 0;
    
    if(e.type === 'mouseup')
      mousedown = false;
  
  });
  
}