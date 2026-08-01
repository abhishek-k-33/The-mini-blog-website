const express = require("express");// imports express for app initialization 
const path = require("path");
const fs = require("fs");// imports the file system module so we can read/write files

const app = express();// creates the web app
const port = 5000;//port on which server runs

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));//this is a middleware which is used to get involve static files in code.
// Parse URL-encoded bodies (as sent by HTML forms)
app.use(express.urlencoded({ extended: true }));//middleware. It is used to extract incoming data to the site.
// setting the extended:true allows us to send more complex datastructures over the web.

// --- DATA PERSISTENCE ---
// On Vercel: uses Upstash Redis (a cloud database) so posts survive across serverless invocations.
// Locally: uses a JSON file so posts survive server restarts.

let redis = null;
if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    const { Redis } = require("@upstash/redis");
    redis = new Redis({
        url: process.env.KV_REST_API_URL,
        token: process.env.KV_REST_API_TOKEN,
    });
}

const DATA_FILE = path.join(__dirname, "data.json");

// Reads all posts. Uses Redis on Vercel, file locally.
const readPosts = async () => {
    if (redis) {
        try {
            const posts = await redis.get("posts");
            return posts || [];
        } catch (err) {
            console.error("Error reading from Redis:", err);
            return [];
        }
    }
    // Local fallback: read from JSON file
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = fs.readFileSync(DATA_FILE, "utf-8");
            return JSON.parse(data);
        }
    } catch (err) {
        console.error("Error reading posts file:", err);
    }
    return [];
};

// Writes all posts. Uses Redis on Vercel, file locally.
const writePosts = async (posts) => {
    if (redis) {
        try {
            await redis.set("posts", posts);
        } catch (err) {
            console.error("Error writing to Redis:", err);
        }
        return;
    }
    // Local fallback: write to JSON file
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(posts, null, 2), "utf-8");
    } catch (err) {
        console.error("Error writing posts file:", err);
    }
};

const generateId = () => {//this fuction generates unique ids for the users.
    return Math.random().toString(36).substr(2, 9);// first math.random generates a number. Then tostring(36) converts
    // the number into a unique string that looks like "0.l5z2bq7x".Then subrtr extracts the first values of the number.
};

// Simple sanitizer that strips HTML tags without needing external ESM-only libraries.
// This replaces sanitize-html which depends on htmlparser2 (ESM-only, breaks on Vercel).
const simpleSanitize = (str) => {
    if (!str) return "";
    return str
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

const stripTags = (html) => {
    if (!html) return "";
    return html.replace(/<[^>]*>/g, "");
};

const generateExcerpt = (content) => {// this function takes a block of content and turns it into a short plain text preview.
    const cleanText = stripTags(content);
    return cleanText.substring(0, 120) + (cleanText.length > 120 ? "..." : "");//grabs the first 120 characters
};

// --- ROUTES ---

app.get("/", async (req, res) => {//this is the get rout to display all posts at the home page of the website.
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    const posts = await readPosts();// reads all posts from the database
    res.render("index.ejs", { posts: posts });//sends the data recived by the user to the ejs file.
});

app.get("/new", (req, res) => {// this shows form to create new post.
    res.render("new.ejs");
});

app.post("/posts", async (req, res) => {// Create a new post
    const { title, content, author } = req.body;// this collects the title,content and author out of the body of the html.
    
    const cleanContent = simpleSanitize(content);// this cleans the content comming from the body.

    const newPost = {
        id: generateId(),//creates a newpost blog post interface with id,title,content,text,author and date.
        title: simpleSanitize(title),
        content: cleanContent,
        excerpt: generateExcerpt(content),
        author: simpleSanitize(author),
        date: new Date().toLocaleDateString()
    };
    const posts = await readPosts();// reads existing posts from the database
    posts.push(newPost);//pushes the current post into the array.
    await writePosts(posts);// saves the updated array to the database so it persists.
    res.redirect("/");//after the post has been made the user will be redirected to the homepage.
});

app.get("/posts/:id", async (req, res) => {// View a specific post
    const posts = await readPosts();// reads all posts from the database
    const post = posts.find(p => p.id === req.params.id);// uses the builtin javascript array function.find to search through the post array.
    if (post) {
        res.render("post.ejs", { post: post });
    } else {
        res.status(404).send("Post not found");
    }
});

app.get("/edit/:id", async (req, res) => {// GET /edit/:id: Show form to edit a post
    const posts = await readPosts();// reads all posts from the database
    const post = posts.find(p => p.id === req.params.id);// compares the id of the current post to the user typed in id.
    if (post) {
        res.render("edit.ejs", { post: post });
    } else {
        res.status(404).send("Post not found");
    }
});

// POST /update/:id: Update an existing post
app.post("/update/:id", async (req, res) => {
    const { title, content, author } = req.body;
    const posts = await readPosts();// reads all posts from the database
    const postIndex = posts.findIndex(p => p.id === req.params.id);
    
    if (postIndex !== -1) {
        const cleanContent = simpleSanitize(content);
        posts[postIndex] = {
            ...posts[postIndex],
            title: simpleSanitize(title),
            content: cleanContent,
            excerpt: generateExcerpt(content),
            author: simpleSanitize(author),
            // Keep original date, or update it
        };
        await writePosts(posts);// saves the updated array to the database
        res.redirect(`/posts/${req.params.id}`);
    } else {
        res.status(404).send("Post not found");
    }
});

// POST /delete/:id: Delete a post
app.post("/delete/:id", async (req, res) => {
    let posts = await readPosts();// reads all posts from the database
    posts = posts.filter(p => p.id !== req.params.id);
    await writePosts(posts);// saves the updated array to the database
    res.redirect("/");
});

// Only listen locally — on Vercel, the VERCEL env var is automatically set
if (!process.env.VERCEL) {
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
}

module.exports = app;// Export the app for Vercel serverless
