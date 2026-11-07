const router = require('express').Router();
const c = require('../controllers/user.controller');
const auth = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { profileSchema } = require('../validators/schemas');

router.use(auth);
router.get('/profile', c.getProfile);
router.put('/profile', validate(profileSchema), c.updateProfile);

module.exports = router;
