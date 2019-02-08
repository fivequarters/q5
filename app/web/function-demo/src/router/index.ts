import express from 'express';

export const router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {
  res.render('landing', {});
});

router.get('/playground', function(req, res) {
  res.render('playground', {});
});

router.get('/editor', function(req, res) {
  res.render('editor', {});
});

router.get('/webhooks', function(req, res) {
  res.render('webhooks', {});
});

router.get('/webhook', function(req, res) {
  res.render('webhooks', {});
});
