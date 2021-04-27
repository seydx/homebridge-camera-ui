import { io } from 'socket.io-client';

export default io(
  process.env.NODE_ENV === 'development' ? `http://${window.location.hostname}:3600` : window.location.host,
  {
    autoConnect: false,
  }
);
