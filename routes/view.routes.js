import express from 'express';
const router = express.Router();

router.get('/guide', (req, res) => {
    res.render(guide)
});


export default router;
