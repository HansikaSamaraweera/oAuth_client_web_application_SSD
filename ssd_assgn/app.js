const fs = require("fs");
const express = require("express");
const multer = require("multer");
const OAuth2Data = require("./credentials.json");
let name, pic;

//Google configurations
const { google } = require("googleapis");

//Github Configurations Using Node Passport
const GitHubStrategy = require('passport-github').Strategy;
const passport = require('passport');
const session = require('express-session');

const app = express();

/*Google Login, using oAuth Add files to drive, View files
*
*
*
* */
//Google client data
const CLIENT_ID = OAuth2Data.web.client_id;
const CLIENT_SECRET = OAuth2Data.web.client_secret;
const REDIRECT_URL = OAuth2Data.web.redirect_uris[0];

const oAuth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URL,
);
let authed = false;

const SCOPES =
    "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile ";


app.set("view engine", "ejs");

//Google
var Storage = multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, "./images");
    },
    filename: function (req, file, callback) {
        callback(null, file.fieldname + "_" + Date.now() + "_" + file.originalname);
    },
});

var upload = multer({
    storage: Storage,
}).single("file"); //Field name and max count


//google login
app.get("/google", (req, res) => {
    if (!authed) {

        var url = oAuth2Client.generateAuthUrl({
            access_type: "offline",
            scope: SCOPES,
        });
        console.log(url);
        res.render("index_google", { url: url });
    } else {
        var oauth2 = google.oauth2({
            auth: oAuth2Client,
            version: "v2",
        });
        oauth2.userinfo.get(function (err, response) {
            if (err) {
                console.log(err);
            } else {
                console.log(response.data);
                name = response.data.name
                pic = response.data.picture
                res.render("success.ejs", {
                    name: response.data.name,
                    pic: response.data.picture,
                    success:false
                });
            }
        });
    }
});

app.get('/',(req,res)=>{

    res.render("index.ejs");
})

app.get('/files', (req,res )=>{

    let x=[];
    drive.files();

    drive.files.list({}, (err, res1) => {
        if (err) throw err;
        const files = res1.data.files;
        //x[i]=files;

        let i=-1;
        if (files.length) {
            files.map((file) => {
                console.log(file);
                i=i+1;
                x[i]="https://drive.google.com/file/d/"+file.id
            });

            res.render("filesdisplay", {
                data: x,
            });

        } else {
            console.log('No files found');
        }
    });

    //res.send({files:x})

});

app.post("/upload", (req, res) => {
    upload(req, res, function (err) {
        if (err) {
            console.log(err);
            return res.end("Something went wrong");
        } else {
            console.log(req.file.path);
            const drive = google.drive({ version: "v3",auth:oAuth2Client  });
            const fileMetadata = {
                name: req.file.filename,
            };
            const media = {
                mimeType: req.file.mimetype,
                body: fs.createReadStream(req.file.path),
            };
            drive.files.create(
                {
                    resource: fileMetadata,
                    media: media,
                    fields: "id",
                },
                (err, file) => {
                    if (err) {
                        // Handle error
                        console.error(err);
                    } else {
                        fs.unlinkSync(req.file.path)
                        res.render("success",{name:name,pic:pic,success:true})
                    }

                }
            );
        }
    });
});

app.get('/logout1',(req,res) => {
    authed = false
    res.redirect('/')
})

app.get("/google/callback", function (req, res) {
    const code = req.query.code;
    if (code) {
        // Get an access token based on our OAuth code
        oAuth2Client.getToken(code, function (err, tokens) {
            if (err) {
                console.log("Error authenticating");
                console.log(err);
            } else {
                console.log("Successfully authenticated");
                console.log(tokens)
                oAuth2Client.setCredentials(tokens);


                authed = true;
                res.redirect("/google");
            }
        });
    }
});
/*Github Login and Sessions using Passport and session in node libraries
*
*
*
* */

//Github

app.use(
    session({
        secret: 'hello world',
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            secure: false,
            maxAge: 7 * 24 * 60 * 60 * 1000,//7 days session
        },
    })
);

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function (user, cb) {
    cb(null, user.id);
});

passport.deserializeUser(function (id, cb) {
    cb(null, id);
});

passport.use(
    new GitHubStrategy(
        {
            clientID: 'd8d5fa6fa3be09b403b1',
            clientSecret: '9c864090cfe903e734c9e9131577eee164d55cc3',
            callbackURL: 'http://127.0.0.1:5000/auth/github/callback',
        },
        function (accessToken, refreshToken, profile, cb) {
            console.log(profile)
            name=profile.username;
            pic=profile.photos[0].value
            console.log('checking')
            console.log(profile.photos[0].value)
            cb(null, profile);
        }
    )
);

const isAuth = (req, res, next) => {
    if (req.user) {
        next();
    } else {
        res.redirect('/login');
    }
};

app.get('/dashboard', isAuth, (req, res) => {
    console.log(req)
    //res.sendFile(__dirname + '/dashboard.html');
    res.render("dashboard",{name:name,pic:pic,success:true})
});

app.get('/login', (req, res) => {
    if (req.user) {
        return res.redirect('/dashboard');
    }
    //res.sendFile(__dirname + '/login.html');
    res.render("index.ejs");
});

app.get('/logout2', (req, res) => {
    req.logOut();
    res.redirect('/login');
});

//auth
app.get('/auth/github', passport.authenticate('github'));

app.get(
    '/auth/github/callback',
    passport.authenticate('github', { failureRedirect: '/login' }),
    function (req, res) {
        // Successful authentication, redirect home.
        res.redirect('/dashboard');
    }
);



app.listen(5000, () => {
    console.log("App is listening on Port 5000");
});


