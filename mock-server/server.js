const path = require('path');
const jsonServer = require('json-server');
const middleware = require('./middleware');

const server = jsonServer.create();
const router = jsonServer.router(path.join(__dirname, 'db.json'));
const defaults = jsonServer.defaults({ noCors: false });

server.use(defaults);
server.use(middleware);
server.use(router);

server.listen(3000, () => {
  console.log('Mock server running at http://localhost:3000');
  console.log('Simulate errors: GET /api/services?simulate=500 or ?simulate=404 or ?simulate=reset');
});
