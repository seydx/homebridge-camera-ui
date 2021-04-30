import JSMpeg from '@cycjimmy/jsmpeg-player';
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

    let ssl = document.location.protocol === 'https:';
    let wsProtocol = ssl ? 'wss://' : 'ws://';
    let url = `${wsProtocol + document.location.hostname}:${camera.videoConfig.socketPort}`;

    console.log(`${camera.name}: Starting stream ${url}`);

    const player = new JSMpeg.VideoElement(
      `[data-stream-wrapper="${camera.name}"]`,
      url,
      {
        canvas: document.querySelector(`[data-stream-box="${camera.name}"]`),
        hooks: {
          load: () => {
            let spinner = document.querySelector(`[data-stream-spinner="${camera.name}"]`);
            if (spinner) {
              spinner.classList.remove('d-block');
              spinner.classList.add('d-none');
            }
          },
        },
      },
      {
        audio: true,
        disableWebAssembly: true,
        pauseWhenHidden: false,
        videoBufferSize: 1024 * 1024,
      }
    );

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
      console.log(`${player.name}: Stopping live stream..`);
      player.destroy();
      players = players.filter((player) => player.name !== camera.name);
    }
  }
};

export { loadStream, startStream, stopStream };
