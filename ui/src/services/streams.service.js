//TODO: REWRITE THIS PART

import JSMpeg from 'jsmpeg-fast-player';
import JSMpegWritableSource from '@/common/jsmpeg-source.js';
import app from '@/main';

let players = [];

const loadStream = (camera) => {
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

const startStream = (camera, cameraStatus) => {
  camera.status = cameraStatus.data.status === 'ONLINE';

  let statusIndicator = document.querySelector(`[data-stream-status="${camera.name}"]`);
  let spinner = document.querySelector(`[data-stream-spinner="${camera.name}"]`);
  let offlineIcon = document.querySelector(`[data-stream-offline="${camera.name}"]`);

  if (camera.status) {
    if (statusIndicator) {
      statusIndicator.classList.remove('text-danger');
      statusIndicator.classList.add('text-success');
    }

    const player = new JSMpeg.Player(null, {
      source: JSMpegWritableSource,
      canvas: document.querySelector(`[data-stream-box="${camera.name}"]`),
      audio: true,
      disableWebAssembly: true,
      pauseWhenHidden: false,
      videoBufferSize: 1024 * 1024,
      onSourcePaused: () => {
        loadStream({ name: camera.name });
      },
      onSourceEstablished: () => {
        let spinner = document.querySelector(`[data-stream-spinner="${camera.name}"]`);
        if (spinner) {
          spinner.classList.remove('d-block');
          spinner.classList.add('d-none');
        }
      },
    });

    player.volume = 1;
    player.name = camera.name;

    players.push(player);
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
  }
};

const stopStream = (camera) => {
  if (camera) {
    const player = players.find((player) => player && player.name === camera.name);
    if (player) {
      player.destroy();
      players = players.filter((player) => player.name !== camera.name);
    }
  }
};

const pauseStream = (cameraName) => {
  const player = players.find((player) => player && player.name === cameraName);
  if (player) {
    player.source.pause(true);
  }
};

const writeStream = (cameraName, buffer) => {
  const player = players.find((player) => player && player.name === cameraName);
  if (player) {
    player.source.write({ feed: cameraName, buffer: buffer });
  }
};

export { loadStream, pauseStream, startStream, stopStream, writeStream };
