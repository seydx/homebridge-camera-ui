import { TYPE } from 'vue-toastification';

const ToastDefaults = {
  position: 'bottom-right',
  timeout: 3000,
  closeOnClick: true,
  pauseOnFocusLoss: true,
  pauseOnHover: true,
  draggable: true,
  draggablePercent: 0.6,
  showCloseButtonOnHover: false,
  hideProgressBar: false,
  closeButton: 'button',
  icon: true,
  rtl: false,
};

const ToastBannerDefaults = {
  position: 'top-center',
  timeout: 5000,
  pauseOnFocusLoss: true,
  pauseOnHover: true,
  draggable: true,
  draggablePercent: 0.6,
  showCloseButtonOnHover: false,
  hideProgressBar: true,
  closeButton: false,
  icon: false,
  rtl: false,
  closeOnClick: false,
};

export default {
  transition: 'Vue-Toastification__bounce',
  maxToasts: 1,
  newestOnTop: true,
  toastDefaults: {
    [TYPE.DEFAULT]: ToastDefaults,
    [TYPE.ERROR]: ToastDefaults,
    [TYPE.INFO]: ToastBannerDefaults,
    [TYPE.SUCCESS]: ToastDefaults,
    [TYPE.WARNING]: ToastDefaults,
  },
};
