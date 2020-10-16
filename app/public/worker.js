(async function ($) {
  'use strict';
  
  let keys = getKeys();
  let role = getRole();

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
  
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
  
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
  
  (async () => {
  
    if ('serviceWorker' in navigator) {
    
      console.log("Registering service-worker")
      await navigator.serviceWorker.register('/service-worker.js', {scope: "/"})
      console.log("Registered!")
      
      console.log("Wait until service worker is ready!")
      let reg = await navigator.serviceWorker.ready;
      console.log("Service Worker is ready!")
      
      let deferredPrompt;
      const addBtn = document.querySelector('.add-button');
      
      window.addEventListener('beforeinstallprompt', (e) => {
      
        e.preventDefault();
        deferredPrompt = e;
        addBtn.style.display = 'block';
      
        addBtn.addEventListener('click', (e) => {
      
          addBtn.style.display = 'none';
      
          deferredPrompt.prompt();
      
          deferredPrompt
            .userChoice
            .then((choiceResult) => {
              if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the A2HS prompt');
              } else {
                console.log('User dismissed the A2HS prompt');
              }
              deferredPrompt = null;
            });
            
        });
        
      });
      
      if('PushManager' in window){
      
        if(Notification.permission !== 'denied'){
        
          let subscription = await reg.pushManager.getSubscription();
          let isSubscribed = !(subscription === null);
          let reReg = false;
          
          if(role && role !== 'Master'){
          
            if(isSubscribed){
              subscription.unsubscribe();
            }
          
          } else {
          
            if(isSubscribed && !keys.subscription){
              subscription.unsubscribe();
              reReg = true;
            } else if(!isSubscribed) {
              reReg = true;
            }
            
            if(reReg){
            
              try {  
  
                const newSubscription = await reg.pushManager.subscribe({
                  userVisibleOnly: true,
                  applicationServerKey: urlBase64ToUint8Array(keys.pub_key),
                });
                
                $.ajax({
                  url:'/subscribe',
                  type:"POST",
                  data:JSON.stringify(newSubscription),
                  contentType:"application/json; charset=utf-8",
                  dataType:"json"
                });
              
              } catch(err) {
              
                console.log("Can not subscribe user!", err)
              
              }
              
            }
          
          }
        
        }
      
      } else {
        console.log('Push messaging is not supported');
      }
  
    } else {
      console.log('Service workers are not supported in this browser');
    }
  
  })().catch(err => {
    console.error(err);
  });

})(jQuery);