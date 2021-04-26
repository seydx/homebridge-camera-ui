const app = require('../../server/app');
const config = require('../../services/config/config.service.js');
const lowdb = require('../../server/services/lowdb.service');

const supertest = require('supertest');
const request = supertest(app);

const masterCredentials = {
  name: 'master',
  password: 'master',
};

beforeAll(async () => {
  await lowdb.ensureDatabase();
  await lowdb.resetDatabase();
  await lowdb.prepareDatabase(config.plugin);
  lowdb.initTokensDatabase();
});

describe('GET /api/cameras', () => {
  it('should response with JSON array of all registered cameras', async () => {
    const auth = await request.post('/api/auth/login').send(masterCredentials);
    expect(auth.statusCode).toEqual(201);

    const response = await request.get('/api/cameras').auth(auth.body.access_token, { type: 'bearer' });
    expect(response.statusCode).toEqual(200);
    expect(Array.isArray(response.body.result)).toBe(true);
  });
});

describe('POST /api/cameras', () => {
  it('should fail if a required field is missing', async () => {
    const auth = await request.post('/api/auth/login').send(masterCredentials);
    expect(auth.statusCode).toEqual(201);

    const camera = {
      //"name": "Test Camera",
      videoConfig: {
        source: '-rtsp_transport udp -i rtsp://192.168.111.1/onvif1',
        socketPort: 8100,
      },
    };

    const response = await request.post('/api/cameras').auth(auth.body.access_token, { type: 'bearer' }).send(camera);
    expect(response.statusCode).toEqual(422);
  });

  it('should create a new camera', async () => {
    const auth = await request.post('/api/auth/login').send(masterCredentials);
    expect(auth.statusCode).toEqual(201);

    const camera = {
      name: 'Test Camera 2',
      videoConfig: {
        source: '-rtsp_transport udp -i rtsp://192.168.111.1/onvif1',
        socketPort: 8100,
      },
    };

    const response = await request.post('/api/cameras').auth(auth.body.access_token, { type: 'bearer' }).send(camera);
    expect(response.statusCode).toEqual(201);
  });

  it('should fail if a camera with same name exists', async () => {
    const auth = await request.post('/api/auth/login').send(masterCredentials);
    expect(auth.statusCode).toEqual(201);

    const camera = {
      name: 'Test Camera 2',
      videoConfig: {
        source: '-rtsp_transport udp -i rtsp://192.168.111.1/onvif1',
        socketPort: 8100,
      },
    };

    const response = await request.post('/api/cameras').auth(auth.body.access_token, { type: 'bearer' }).send(camera);
    expect(response.statusCode).toEqual(409);
  });
});

describe('GET /api/cameras/:name', () => {
  it('should fail if camera dont exists', async () => {
    const auth = await request.post('/api/auth/login').send(masterCredentials);
    expect(auth.statusCode).toEqual(201);

    const response = await request.get('/api/cameras/Fail Camera').auth(auth.body.access_token, { type: 'bearer' });
    expect(response.statusCode).toEqual(404);
  });

  it('should response with JSON object of the camera', async () => {
    const auth = await request.post('/api/auth/login').send(masterCredentials);
    expect(auth.statusCode).toEqual(201);

    const response = await request.get('/api/cameras/Test Camera 2').auth(auth.body.access_token, { type: 'bearer' });
    expect(response.statusCode).toEqual(200);
    expect(Object.keys(response.body).length).toBeTruthy();
  });
});

describe('PATCH /api/cameras/:name', () => {
  it('should fail if camera dont exists', async () => {
    const auth = await request.post('/api/auth/login').send(masterCredentials);
    expect(auth.statusCode).toEqual(201);

    const response = await request
      .patch('/api/cameras/Fail Camera')
      .auth(auth.body.access_token, { type: 'bearer' })
      .send({ manufacturer: 'camera.ui' });
    expect(response.statusCode).toEqual(404);
  });

  it('should fail if body is undefined', async () => {
    const auth = await request.post('/api/auth/login').send(masterCredentials);
    expect(auth.statusCode).toEqual(201);

    const response = await request.patch('/api/cameras/Test Camera').auth(auth.body.access_token, { type: 'bearer' });
    expect(response.statusCode).toEqual(400);
  });

  it('should response with no content if successfull', async () => {
    const auth = await request.post('/api/auth/login').send(masterCredentials);
    expect(auth.statusCode).toEqual(201);

    const response = await request
      .patch('/api/cameras/Test Camera 2')
      .auth(auth.body.access_token, { type: 'bearer' })
      .send({ manufacturer: 'camera.ui' });
    expect(response.statusCode).toEqual(204);
  });
});

describe('DELETE /api/cameras/:name', () => {
  it('should fail if camera dont exists', async () => {
    const auth = await request.post('/api/auth/login').send(masterCredentials);
    expect(auth.statusCode).toEqual(201);

    const response = await request.delete('/api/cameras/Fail Camera').auth(auth.body.access_token, { type: 'bearer' });
    expect(response.statusCode).toEqual(404);
  });

  it('should response with no content if successfull', async () => {
    const auth = await request.post('/api/auth/login').send(masterCredentials);
    expect(auth.statusCode).toEqual(201);

    const response = await request
      .delete('/api/cameras/Test Camera 2')
      .auth(auth.body.access_token, { type: 'bearer' });
    expect(response.statusCode).toEqual(204);
  });
});

describe('DELETE /api/cameras', () => {
  it('should response with no content if successfull', async () => {
    const auth = await request.post('/api/auth/login').send(masterCredentials);
    expect(auth.statusCode).toEqual(201);

    const response = await request.delete('/api/cameras').auth(auth.body.access_token, { type: 'bearer' });
    expect(response.statusCode).toEqual(204);
  });
});
