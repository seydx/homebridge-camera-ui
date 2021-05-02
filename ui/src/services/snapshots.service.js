import app from '@/main';

const loadSnapshot = (camera) => {
  let spinner = document.querySelector(`[data-stream-spinner="${camera.name}"]`);
  let offlineIcon = document.querySelector(`[data-stream-offline="${camera.name}"]`);

  if (offlineIcon) {
    offlineIcon.classList.remove('d-block');
    offlineIcon.classList.add('d-none');
  }

  if (spinner) {
    spinner.classList.remove('d-none');
    spinner.classList.add('d-block');
  }
};

const fetchSnapshot = (camera, cameraStatus, snapshot) => {
  camera.status = cameraStatus.data.status === 'ONLINE';

  let statusIndicator = document.querySelector(`[data-stream-status="${camera.name}"]`);
  let spinner = document.querySelector(`[data-stream-spinner="${camera.name}"]`);
  let offlineIcon = document.querySelector(`[data-stream-offline="${camera.name}"]`);

  if (camera.status) {
    if (statusIndicator) {
      statusIndicator.classList.remove('text-danger');
      statusIndicator.classList.add('text-success');
    }

    const img = document.createElement('img');
    let imgBuffer = 'data:image/png;base64,';

    if (!snapshot.data || (snapshot.data && snapshot.data === '')) {
      img.classList.add('object-fit-none');
      imgBuffer = require('../assets/img/no_img_white.png');
    } else {
      imgBuffer += snapshot.data;
    }

    img.classList.add('toggleArea');
    img.setAttribute('src', imgBuffer);
    img.setAttribute('alt', 'Snapshot');
    img.dataset.streamBox = camera.name;

    if (spinner) {
      spinner.classList.remove('d-block');
      spinner.classList.add('d-none');
    }

    const target = document.querySelector(`[data-stream-box="${camera.name}"]`);

    if (target) {
      for (const value of target.classList) img.classList.add(value);
      target.replaceWith(img);
    }
  } else {
    app.$toast.error(`${camera.name}: ${app.$t('offline')}`);

    if (statusIndicator) {
      statusIndicator.classList.remove('text-success');
      statusIndicator.classList.add('text-danger');
    }

    if (spinner) {
      spinner.classList.remove('d-block');
      spinner.classList.add('d-none');
    }

    if (offlineIcon) {
      offlineIcon.classList.remove('d-none');
      offlineIcon.classList.add('d-block');
    }

    const canvas = document.createElement('canvas');
    canvas.classList.add('toggleArea');
    canvas.dataset.streamBox = camera.name;

    const target = document.querySelector(`[data-stream-box="${camera.name}"]`);

    if (target) {
      for (const value of target.classList) canvas.classList.add(value);
      target.replaceWith(canvas);
    }
  }
};

export { fetchSnapshot, loadSnapshot };
