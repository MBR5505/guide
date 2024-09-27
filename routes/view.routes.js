import express from 'express';
const router = express.Router();

router.get('/guide', (req, res) => {
    res.render('guide')
});

router.get('/newGuide', (req, res) =>{
    res.render('newGuide')
})



export default router;
