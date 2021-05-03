class JSMpegWritableSource {
  // eslint-disable-next-line no-unused-vars
  constructor(url, options) {
    this.destination = null;

    this.completed = false;
    this.established = false;
    this.progress = 0;

    // Streaming is obiously true when using a stream
    this.streaming = true;
    this.started = false;

    this.onEstablishedCallback = options.onSourceEstablished;
  }

  connect(destination) {
    this.destination = destination;
  }

  start() {
    this.established = true;
    this.completed = true;
    this.progress = 1;
  }

  resume() {
    // eslint-disable-line class-methods-use-this
  }

  destroy() {
    this.started = false;
  }

  write(data) {
    const isFirstChunk = !this.started;
    this.started = true;

    if (isFirstChunk && this.onEstablishedCallback) {
      this.onEstablishedCallback(this);
    }

    this.destination.write(data);
  }
}

export default JSMpegWritableSource;
