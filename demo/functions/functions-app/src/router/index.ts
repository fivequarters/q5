import express from 'express';

export const router = express.Router();

/* GET home page. */
router.get('/', (req, res) => {
  res.render('landing', {});
});

router.get('/playground', (req, res) => {
  res.render('playground', {});
});

router.get('/editor', (req, res) => {
  res.render('editor', {});
});

router.get('/webhooks', (req, res) => {
  res.render('webhooks', {});
});

router.get('/webhook', (req, res) => {
  res.render('webhooks', {});
});
