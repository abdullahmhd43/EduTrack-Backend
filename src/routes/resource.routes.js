const express = require('express');
const auth = require('../middleware/auth');
const controllerFor = require('../controllers/resource.controller');

/** Mounts GET/POST on "/", GET/PUT/DELETE on "/:id" for one resource. All routes require a JWT. */
module.exports = (res) => {
  const router = express.Router();
  const c = controllerFor(res);
  router.use(auth);
  router.route('/').get(c.list).post(c.create);
  router.route('/:id').get(c.get).put(c.update).delete(c.remove);
  return router;
};
