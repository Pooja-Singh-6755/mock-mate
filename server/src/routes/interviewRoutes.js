const express = require('express');
const router = express.Router();
const { getInterview } = require('../controllers/interviewController');


router.get('/:interviewId' , getInterview);

module.exports = router;
