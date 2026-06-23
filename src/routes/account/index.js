'use strict';

/**
 * Account settings routes (mounted at /api/account).
 */

const express = require('express');
const router = express.Router();

router.use('/', require('./export'));
router.use('/', require('./password'));
router.use('/', require('./notifications'));
router.use('/', require('./lifecycle'));
router.use('/', require('./identity'));

module.exports = router;
