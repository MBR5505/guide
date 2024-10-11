import express from "express";
import multer from "multer";
import mongoose from "mongoose";
import dotenv from "dotenv";
import ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcrypt";
import fs from "fs";
import jwt from "jsonwebtoken"; // Add JWT
import cookieParser from "cookie-parser"; // To handle cookies

import User from "./db/users.js";
import Guide from "./db/newGuide.js";

import viewRoutes from "./routes/view.routes.js";

const app = express();
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // Use cookie-parser to handle cookies

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


app.use(async (req, res, next) => {
  const token = req.cookies.jwt;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (user) {
        res.locals.user = user; // Attach the full user object to res.locals for all views
      } else {
        res.locals.user = null; // In case user is not found
      }
    } catch (err) {
      console.error("JWT verification error:", err);
      res.locals.user = null; // In case of JWT error
    }
  } else {
    res.locals.user = null; // No token, no user
  }
  next();
});




const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir); 
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const fileName = Date.now() + "-" + file.originalname; // Include original filename for uniqueness
    cb(null, fileName);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== ".png" && ext !== ".jpg" && ext !== ".jpeg") {
      return cb(new Error("Only .png, .jpg, and .jpeg files are allowed!"));
    }
    cb(null, true); // Accept the file
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
});

// Example of file upload usage in route
app.post(
  "/upload",
  upload.fields([
    { name: "velgFil1", maxCount: 1 },
    { name: "velgFil2", maxCount: 1 },
    { name: "velgFil3", maxCount: 1 },
  ]),
  (req, res) => {
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).send("No files were uploaded.");
    }
    res.send("Files uploaded successfully!");
  }
);


app.post("/updateProfile", upload.single("velgFil"), async (req, res) => {
  try {
    const token = req.cookies.token;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!req.file) {
      return res.status(400).send("No files were uploaded."); // Return early if no file is present
    }

    const newImagePath = `/uploads/${req.file.filename}`;
    user.avatar = newImagePath; 
    await user.save();

    res.redirect("/profile"); // Only send this response if everything is successful
  } catch (err) {
    console.error("Error uploading profile picture:", err);
    res.status(500).send("Error uploading profile picture");
  }
});



app.use("/", viewRoutes);

mongoose
  .connect("mongodb://127.0.0.1:27017/test")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

const createToken = (user) => {
  return jwt.sign(
    { id: user._id, username: user.username },
    process.env.JWT_SECRET,
    {
      expiresIn: "1d",
    }
  );
};

// Middleware to check for authentication
// Middleware to check for authentication and decode the token
const authMiddleware = (req, res, next) => {
  const token = req.cookies.jwt;
  if (!token) {
    return res.redirect("/login");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Store the decoded token (which contains the user id or username) in req.user
    next();
  } catch (err) {
    return res.redirect("/login");
  }
};

app.get("/profile", authMiddleware, async (req, res) => {
  try {
    const username = req.user.username;
    
    const guides = await Guide.find({ forfatter: username });

    res.render("profile", { guides, username });
  } catch (err) {
    console.error("Error fetching profile:", err);
    res.status(500).send("Server Error");
  }
});

app.post("/delete-guide/:id", authMiddleware, async (req, res) => {
  try {
    const guideId = req.params.id;

    // Find the guide and delete its associated images from the uploads directory
    const guide = await Guide.findById(guideId);
    if (guide && guide.imgFile.length) {
      guide.imgFile.forEach((imgPath) => {
        const filePath = path.join(__dirname, "uploads", path.basename(imgPath));
        fs.unlink(filePath, (err) => {
          if (err) console.error("Error deleting file:", err);
        });
      });
    }

    await Guide.findByIdAndDelete(guideId);

    res.redirect("/profile");
  } catch (err) {
    console.error("Error deleting guide:", err);
    res.status(500).send("Error deleting guide");
  }
});



app.get('/edit-guide/:id', async (req, res) => {
  const guideId = req.params.id;
  const guide = await Guide.findById(guideId);
  if (!guide) {
      return res.status(404).send('Guide not found');
  }
  res.render('editGuide', { guide });
});


app.get('/alleGuides', authMiddleware, async (req, res) => {
  try {
      const guides = await Guide.find(); // Replace with your method of fetching guides
      res.render('alleGuides', { guides }); // Pass guides to the EJS template
  } catch (err) {
      console.error(err);
      res.status(500).send('Server Error');
  }
});


app.post("/guide/edit/:id", authMiddleware, upload.fields([
  { name: "velgFil1", maxCount: 1 },
  { name: "velgFil2", maxCount: 1 },
  { name: "velgFil3", maxCount: 1 },
]), async (req, res) => {
  try {
      const guideId = req.params.id;
      const { tittel, tag, newSectionCount } = req.body;

      const overskrifts = [];
      const beskrivelses = [];
      const imgFiles = [];

      const sectionCount = parseInt(newSectionCount, 10);
      const existingGuide = await Guide.findById(guideId);

      for (let i = 1; i <= sectionCount; i++) {
          overskrifts.push(req.body[`overskrift${i}`]);
          beskrivelses.push(req.body[`beskrivelse${i}`]);

          if (req.files[`velgFil${i}`]) {
              // Delete old file if a new one is uploaded
              if (existingGuide.imgFile[i - 1]) {
                  const oldFilePath = path.join(__dirname, 'uploads', existingGuide.imgFile[i - 1].split('/').pop());
                  fs.unlink(oldFilePath, (err) => {
                      if (err) console.error("Error deleting old file:", err);
                  });
              }
              imgFiles.push(`/uploads/${req.files[`velgFil${i}`][0].filename}`);
          } else {
              imgFiles.push(existingGuide.imgFile[i - 1] || null);
          }
      }

      await Guide.findByIdAndUpdate(guideId, {
          tittel,
          tag,
          overskrift: overskrifts,
          beskrivelse: beskrivelses,
          imgFile: imgFiles
      });

      res.redirect(`/profile`);
  } catch (err) {
      console.error(err);
      res.status(500).send("Error updating guide");
  }
});




app.get("/guide", authMiddleware, (req, res) => {
  res.render("guide");
});

app.get("/newGuide", authMiddleware, (req, res) => {
  res.render("newGuide");
});

// Route for creating a new guide with multiple file uploads
app.post("/newGuide", authMiddleware, upload.fields([
    { name: "velgFil1", maxCount: 1 },
    { name: "velgFil2", maxCount: 1 },
    { name: "velgFil3", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const username = req.user.username;
      const { tittel, tag, newSectionCount } = req.body;

      const overskrifts = [];
      const beskrivelses = [];
      const imgFiles = [];

      const sectionCount = parseInt(newSectionCount, 10);

      for (let i = 1; i <= sectionCount; i++) {
        overskrifts.push(req.body[`overskrift${i}`]);
        beskrivelses.push(req.body[`beskrivelse${i}`]);
        if (req.files[`velgFil${i}`]) {
          imgFiles.push(`/uploads/${req.files[`velgFil${i}`][0].filename}`);
        }
      }

      const newGuide = new Guide({
        forfatter: username,
        tittel,
        tag,
        overskrift: overskrifts,
        beskrivelse: beskrivelses,
        imgFile: imgFiles,
      });

      const savedGuide = await newGuide.save();
      res
        .status(201)
        .json({ message: "Guide created successfully", guide: savedGuide });
        
    } catch (error) {
      res
        .status(500)
        .json({ message: "Failed to create guide", error: error.message });
    }
  }
);

app.get("/guide/:id", async (req, res) => {
  try {
      const guideId = req.params.id;
      const guide = await Guide.findById(guideId);
      if (!guide) {
          return res.status(404).send("Guide not found");
      }

      // Fetch user based on the author of the guide
      const user = await User.findOne({ username: guide.forfatter });

      // Render the guide view, passing the guide and user
      res.render("guide", { guide, user: user || null });
  } catch (err) {
      console.error(err);
      res.status(500).send("Server error");
  }
});





app.post("/index", (req, res) => {
  const searchQuery = req.body.searchQuery.trim();

  if (searchQuery === "Linux" || searchQuery === "VM" || searchQuery === "Annet") {
      res.redirect(`/guides/${searchQuery}`);
  } else {
      res.redirect('/'); 
  }
});

app.get('/guides/:tag', async (req, res) => {
  const tag = req.params.tag;

  try {
      const guides = await Guide.find({ tag: tag });
      // Assuming req.user contains the logged-in user (if using something like Passport.js)
      res.render('guides', { guides: guides, tag: tag, user: req.user || null });
  } catch (err) {
      console.error(err);
      res.status(500).send("Server Error");
  }
});




app.get("/", async (req, res) => {
  try {
    const token = req.cookies.jwt; // <-- Corrected from 'token' to 'jwt'
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    res.render("index", { user });
  } catch (err) {
    res.render("index", { user: null });
  }
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).send("Invalid email or password");
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).send("Invalid email or password");
    }

    const token = createToken(user);
    const cookieOptions = rememberMe
      ? { maxAge: 15 * 24 * 60 * 60 * 1000 }
      : {};

    res.cookie("jwt", token, cookieOptions);
    res.redirect("/");
  } catch (err) {
    res.status(500).send("Error with login");
  }
});

app.get("/signup", (req, res) => {
  res.render("signup");
});

app.post("/signup", async (req, res) => {
  try {
    const { email, username, password, cPassword } = req.body;

    if (password !== cPassword) {
      return res.status(400).send("Passwords do not match");
    }

    const salt = await bcrypt.genSalt(parseInt(process.env.SALT_ROUNDS, 10));
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
    });

    await newUser.save();
    res.redirect("/login");
  } catch (err) {
    console.error("Error during signup:", err);
    res.status(500).send("Error signing up");
  }
});

app.get("/logout", (req, res) => {
  res.clearCookie("jwt"); // Clear the JWT cookie
  res.redirect("/login"); // Redirect to the login page
});

const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
