
// Made by Krishnan Navadia
// Copyright 2019

var express            = require("express"),
	ejs            = require("ejs"),
	mongoose       = require("mongoose"),
	bodyParser     = require("body-parser"),
	cookieParser   = require("cookie-parser"),
	csrf           = require('csurf'),
	session        = require("express-session"),
	passport       = require("passport"),
	flash          = require("connect-flash"),
	passport       =  require("passport"),
	MongoStore     = require("connect-mongo")(session)


var app     = express();
app.set("view engine", "ejs");

require("./config/passport");
app.use(bodyParser.json());
mongoose.connect("mongodb://localhost/shopping", {useNewUrlParser: true, useUnifiedTopology: true});
var csrfProtection = csrf();
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(session({
	secret: 'mysupersecret', 
	resave: false, 
	saveUninitialized: false,
	store: new MongoStore({ mongooseConnection: mongoose.connection }),
	cookie: {maxAge: 180 * 60 * 1000 } // 3 hours
}));
app.use(csrfProtection);
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
app.use(function(req,res,next){
	res.locals.login = req.isAuthenticated();
	res.locals.session = req.session;
	next();
});


//var product = require("./seed/product-seeder");

// Product Schema
var Product = require("./product");
// User Schema
var User    = require("./views/user/user");
//Cart Schema
var Cart    = require("./cart");



app.get("/", function(req,res){
	Product.find({}, function(err, foundProduct){
		if(err){
			console.log(err);
		}
		else{
			res.render("homepage", {product: foundProduct});
		}
	});
});

app.post("/", function(req,res){
	var name = req.body.name;
	var image = req.body.image;
	var description = req.body.description;
	var price = req.body.price;

	var newProduct = {name: name, image: image, description: description, price: price};

	Product.create(newProduct, function(err, newlyCreated){
		if(err){
			console.log(err);
		}
		else{
			res.redirect("/");
		}
	});
});


app.get("/new",isLoggedIn, function(req,res, next){
	res.render("new");
});

app.get('/add-to-cart/:id', function(req, res, next) {
    var productId = req.params.id;
    var cart = new Cart(req.session.cart ? req.session.cart : {});

    Product.findById(productId, function(err, product) {
       if (err) {
           return res.redirect('/');
       }
        cart.add(product, product.id);
        req.session.cart = cart;
        console.log(req.session.cart);
        res.redirect('/');
    });
});

app.get('/shopping-cart', function(req, res, next) {
   if (!req.session.cart) {
       return res.render('shopping-cart', {products: null});
   } 
    var cart = new Cart(req.session.cart);
    res.render('shopping-cart', {products: cart.generateArray(), totalPrice: cart.totalPrice});
});


app.get("/checkout",isLoggedIn, function(req, res, next){
	if (!req.session.cart) {
       return res.render('shopping-cart', {products: null});
   } 
   else{
 	  	var cart = new Cart(req.session.cart);		
 	  	var errMsg = req.flash("error")[0];
   		res.render("checkout", {total: cart.totalPrice, errMsg: errMsg});
   }
	
});

app.get("/user/profile", isLoggedIn, function(req, res, next){
	res.render("profile");
});

app.get("/user", notLoggedIn, function(req,res,next){
	next();
});


app.get("/user/register", function(req, res, next){
	var messages = req.flash("error");
	res.render("user/register", {csrfToken: req.csrfToken(), messages: messages, hasErrors: messages.length > 0});
});

app.post("/user/register", passport.authenticate('local.register', {
	successRedirect: "/user/profile",
	failureRedirect: "/user/register",
	failureFlash: true
	
}));	


app.get("/user/login", function(req, res, next){
	var messages = req.flash("error");
	res.render("user/login", {csrfToken: req.csrfToken(), messages: messages, hasErrors: messages.length > 0});
});

app.post("/user/login", passport.authenticate('local.login', {
	successRedirect: "/user/profile",
	failureRedirect: "/user/register",
	failureFlash: true
	
}));	

function isLoggedIn(req, res, next){
	if(req.isAuthenticated()){
		return next();
	}
	res.redirect("/user/login");
}
function notLoggedIn(req, res, next){
	if(!req.isAuthenticated()){
		return next();
	}
	res.redirect("/");
}

app.get("/user/logout", function(req, res, next){
	req.logout();
	res.redirect("/");
});
app.listen(3000, process.env.IP, process.env.PORT, function(){
	console.log("Server is Listening!");
});
