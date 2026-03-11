const express = require('express');
const router = express.Router();
const addressController = require('../controllers/address.controller');
const auth = require('../middleware/auth');

router.use(auth.verifyToken, auth.requireRole(['customer']));

router.get('/', addressController.list);
router.get('/:id', addressController.get);
router.post('/', addressController.create);
router.put('/:id', addressController.update);
router.delete('/:id', addressController.remove);
router.put('/:id/default', addressController.setDefault);

module.exports = router;
