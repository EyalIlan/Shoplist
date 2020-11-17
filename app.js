const express = require("express");
const body = require("body-parser");
const multer = require('multer')
const path = require("path");
const mongoose = require("mongoose");
const session = require("express-session");

const User = require("./models/user");

const adminRouter = require("./routes/admin");
const shopRouter = require("./routes/shop");
const authRoute = require("./routes/auth");
const ErrorController = require("./controllers/error");

const MongoDBStore = require("connect-mongodb-session")(session);

const csrf = require('csurf')
const flash = require('connect-flash')

const app = express();

const fileStroge = multer.diskStorage({
  destination:(req,file,cb)=>{
    cb(null,'images')
  },
  filename:(req,file,cb) =>{
    cb(null, file.filename +'-'+ file.originalname);
  }
})


const fileFilter = (req,file,cb) =>{
  if(file.mimetype === 'image/png' || file.mimetype === 'image/jpg' || file.mimetype === 'image/jpeg'){
    cb(null,true)
  }else{ 
    cb(null,false)
  }
}


app.use(body.urlencoded({ extended: false }));
app.use(multer({storage:fileStroge,fileFilter:fileFilter}).single('image'))
app.use(express.static(path.join(__dirname, "public")));
app.use('/images',express.static(path.join(__dirname, "images")));

// ?retryWrites=true&w=majority
const MONGODB_URI =
  "mongodb+srv://EYAL:f4u47q46RKwGEDqA@cluster0.xc2gt.mongodb.net/shop";

const store = new MongoDBStore({
  uri: MONGODB_URI,
  collection: "sessions",
});
const csrfProtaction = csrf()


app.use(
  session({
    secret: "my secret",
    resave: false,
    saveUninitialized: false,
    store: store,
  })
);


app.use(csrfProtaction)
app.use(flash())

app.use((req,res,next)=>{
  res.locals.isAuthenticated = req.session.isLoggedIn
  res.locals.csrfToken = req.csrfToken()
  next()
})


app.use((req, res, next) => {
  if (!req.session.user) {
    return next();
  }
  User.findById(req.session.user._id)
    .then((user) => {
      if(!user){
       return next();
      }
      req.user = user;
      next();
    })
    .catch(err =>{
        next(new Error(err));
    });
});



app.set("view engine", "ejs");
app.set("views", "views");

app.use("/admin", adminRouter);
app.use(shopRouter);
app.use(authRoute);

// app.get('/500',ErrorController.get500)
app.use(ErrorController.getErrorPage);

app.use((error,req,res,next)=>{
  // console.log(req.session.isLoggedIn)  
  res.render('500',{
    pageTitle: "Server error Page",
    path: "/500",
    isAuthenticated:req.session.isLoggedIn
  })
})

mongoose
  .connect(MONGODB_URI)
  .then(result => {
    app.listen(3000, (req, res) => {
      console.log("Server Connected");
    });
  })
  .catch((err) => {
    console.log(err);
  });

//need to adujst cart page to show pretty the products
