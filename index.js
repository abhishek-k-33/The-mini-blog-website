const express = require("express");// imports express for app initialization 
const path = require("path");

const app = express();// creates the web app
const port = 5000;//port on which server runs

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));//this is a middleware which is used to get involve static files in code.
// Parse URL-encoded bodies (as sent by HTML forms)
app.use(express.urlencoded({ extended: true }));//middleware. It is used to extract incoming data to the site.
// setting the extended:true allows us to send more complex datastructures over the web.

let posts = [];// In-memory "database"

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

app.get("/", (req, res) => {//this is the get rout to display all posts at the home page of the website.
    res.render("index.ejs", { posts: posts });//sends the data recived by the user to the ejs file.
});

app.get("/new", (req, res) => {// this shows form to create new post.
    res.render("new.ejs");
});

app.post("/posts", (req, res) => {// Create a new post
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
    posts.push(newPost);//pushes the current post into an already exisiting array for temporary storge.
    res.redirect("/");//after the post has been made the user will be redirected to the homepage.
});

app.get("/posts/:id", (req, res) => {// View a specific post
    const post = posts.find(p => p.id === req.params.id);// uses the builtin javascript array function.find to search through the post array.
    if (post) {
        res.render("post.ejs", { post: post });
    } else {
        res.status(404).send("Post not found");
    }
});

app.get("/edit/:id", (req, res) => {// GET /edit/:id: Show form to edit a post
    const post = posts.find(p => p.id === req.params.id);// compares the id of the current post to the user typed in id.
    if (post) {
        res.render("edit.ejs", { post: post });
    } else {
        res.status(404).send("Post not found");
    }
});

// POST /update/:id: Update an existing post
app.post("/update/:id", (req, res) => {
    const { title, content, author } = req.body;
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
        res.redirect(`/posts/${req.params.id}`);
    } else {
        res.status(404).send("Post not found");
    }
});

// POST /delete/:id: Delete a post
app.post("/delete/:id", (req, res) => {
    posts = posts.filter(p => p.id !== req.params.id);
    res.redirect("/");
});

// Only listen locally — on Vercel, the VERCEL env var is automatically set
if (!process.env.VERCEL) {
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
}

module.exports = app;// Export the app for Vercel serverless
