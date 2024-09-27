import express from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ejs from 'ejs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import fs from 'fs'; // Import fs to check for the uploads directory
import User from './db/users.js';
import viewRoutes from './routes/view.routes.js';

const app = express();
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

app.set("view engine", "ejs");
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);

        // Check for file extension
        if (ext !== ".png" && ext !== ".jpg") {
            return cb(new Error('Only .png and .jpg files are allowed!'));
        }

        // If valid, create the filename
        const fileName = Date.now() + ext;
        cb(null, fileName);
    }
});

const upload = multer({ storage });

app.use('/', viewRoutes);

mongoose.connect('mongodb://127.0.0.1:27017/test')
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.error("MongoDB connection error:", err));

app.get("/", (req, res) => {
    res.render('index');
});

app.post('/newGuide', upload.array('velgFil'), async (req, res) => {
    console.log(req.body);
    console.log(req.files);
    res.json({ message: 'Guide created', data: req.body });
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    console.log(email);
    res.redirect('/');
});

app.get('/signup', (req, res) => {
    res.render('signup');
});

app.post('/signup', async (req, res) => {
    const { email, username, password, cPassword } = req.body;
    const newUser = new User({
        username: username,
        email: email,
        password: password
    });
    await newUser.save();
    res.redirect('login');
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
