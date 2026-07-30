import express from "express";// imports express for app initialization 
import { fileURLToPath } from "url";
import { dirname } from "path";
import path from "path";
import sanitizeHtml from "sanitize-html";// this line imports an external liberary which is curcial for security.
//It is used to clean html strings by stripping out potential malicious code.

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

const generateExcerpt = (htmlContent) => {// this function takes a block of html content and turns it into a short plain text preview.
// this is a reuseable funtion that expects a string of html data.
    const cleanText = sanitizeHtml(htmlContent, {// uses sanitize html liberary.
        allowedTags: [],// since the allowed tags and allowedAttributes is empty that means we are going very strict on the tags since nothing is 
        //allowed.Because nothing is allowed, it strips out absolutely every HTML tag, converting something like <p>Hello <b>World</b></p> into 
        // just Hello World.
        allowedAttributes: {}
    });
    return cleanText.substring(0, 120) + (cleanText.length > 120 ? "..." : "");//cleantext substring 120 grabs the first 120 characters of the 
    //newly cleaned html text + (cleanText.length > 120 ? "..." : ""): This uses a ternary operator (a shorthand if/else statement) 
    // to check if the original cleaned text was longer than 120 characters.
    // If it was: It appends an ellipsis (...) to the end to indicate there is more text.
    // If it wasn't: It appends an empty string "" (meaning it adds nothing)..
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
    
    const cleanContent = sanitizeHtml(content);// this cleans the content comming from the body.

    const newPost = {
        id: generateId(),//creates a newpost blog post interface with id,title,content,text,author and date.
        title,
        content: cleanContent,
        excerpt: generateExcerpt(cleanContent),
        author,
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
        const cleanContent = sanitizeHtml(content);
        posts[postIndex] = {
            ...posts[postIndex],
            title,
            content: cleanContent,
            excerpt: generateExcerpt(cleanContent),
            author,
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

export default app;// Export the app for Vercel serverless
