import express from 'express';
import bodyParser from 'body-parser';  
import dotenv from 'dotenv';
import ejs from 'ejs';
import path from 'path';
import { fileURLToPath } from 'url';

import viewRoutes from './routes/view.routes.js';

const app = express();
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.set("view engine", "ejs");

app.use(express.static(path.join(__dirname, 'public')));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/views', viewRoutes);

app.get("/", (req, res) => {
    res.render('index');
});

app.get('/guide', (req, res) => {
    res.render('guide')
});

app.get('/login', (req, res) => {
    res.render('login')
});

app.post('/login', (req, res) =>{
    console.log("log lig lag")

    const {email, password} = req.body;

    console.log(email)
    res.redirect('/')
})

app.get('/signup', (req, res) => {
    res.render('signup')
});

app.post('/signup', (req, res) =>{
    console.log("log lig lag")

    const {email, username, password, cPassword} = req.body;

    console.log(cPassword)
    res.redirect('login')
})

const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
