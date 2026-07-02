// GET /api/pictograms — shared pictogram library for parent UI.
const express = require('express');
const { requireParent } = require('../middleware/auth');
const { listPictogramsForApi } = require('../../config/pictogram-library');

const router = express.Router();
router.use(requireParent);

router.get('/', (req, res) => {
  res.json(listPictogramsForApi());
});

module.exports = router;
