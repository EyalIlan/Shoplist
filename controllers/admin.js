const Mongodb = require("mongodb");
const Product = require("../models/product");
const user = require("../models/user");
const fileHelper = require('../util/file')

const {validationResult} = require('express-validator');

// const ObjectId = Mongodb.ObjectId;

exports.getAddProduct = (req, res) => {
  res.render("admin/edit-product", {
    pageTitle: "Add Product",
    path: "/admin/add-product",
    editing: false,
    hasError:false,
    errorMessage:null,
    ValidationError:[]
  });
};

exports.postAddProduct = (req, res,next) => {
  const title = req.body.title;
  const image = req.file;
  const price = req.body.price;
  const description = req.body.description;
  const error = validationResult(req)
  
  if(!image){
    return res.status(422).render("admin/edit-product", {//need to return to not get the setHeader error
      pageTitle: "Add Product",
      path: "/admin/edit-product",
      editing: false,
      hasError:true,
      product: {
        title:title,
        price:price,
        description:description,
      },
      errorMessage:'Attached file  must be a picture',
      ValidationError:[]
    })
  }
  const imageUrl = image.path;
  if(!error.isEmpty()){
    // console.log( '----------postAdd------------')
    // console.log( error.array())
    // console.log( '-----------------------------')
    return res.status(422).render("admin/edit-product", {//need to return to not get the setHeader error
      pageTitle: "Add Product",
      path: "/admin/edit-product",
      editing: false,
      hasError:true,
      product: {
        title:title,
        price:price,
        description:description,
        
      },
      errorMessage:error.array()[0].msg,
      ValidationError:error.array()
    })
  }
  const product = new Product({
    title:title,
    price: price,
    description: description,
    imageUrl: imageUrl,
    userId:req.user
  });
  product
    .save() //this save function provided by moongose
    .then((result) => {
      console.log("Created Product");
      res.redirect("/admin/products");
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error)
    });
};

exports.getEditProduct = (req, res,next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then((product) => {
      if (!Product) {
        res.redirect("/");
      }
      // console.log('aaaa')
      res.render("admin/edit-product", {
        pageTitle: "Add Product",
        path: "/admin/edit-product",
        editing: true,
        product: product,
        errorMessage:null,
        hasError:null,
        ValidationError:[]
      });
    })
    .catch((err) => {
      const error = new Error(err)
      error.httpStatusCode = 500;
      return next(error)
    });
};

exports.getProducts = (req, res,next) => {
  Product.find({userId:req.user._id})
    // .select('title price -_id')
    // .populate('userId','name')
    .then((products) => {
      res.render("admin/products", {
        pageTitle: "Admin Products",
        prods: products,
        path: "/admin/products"
      });
    })
    .catch((err) => {
      const error = new Error(err)
      error.httpStatusCode = 500;
      return next(error)
    });
};

exports.postEditProdduct = (req, res,next) => {
  const productId = req.body.prodId;
  const Title = req.body.title;
  const price = req.body.price;
  const image = req.file;
  const description = req.body.description;
  const error = validationResult(req)
  
  if(!error.isEmpty()){ 
    // console.log('PostEdit------'+ error.array())
    return res.status(422).render("admin/edit-product", {
      pageTitle: "edit Product",
      path: "/admin/edit-product",
      editing: true,
      hasError:true,
      product: {
        title:Title,
        price:price,
        description:description,
        _id:productId
      },
      errorMessage:error.array()[0].msg,
      ValidationError:error.array()
    })

  }
  Product.findById(productId)
  .then((product) => {
      if(product.userId.toString() !== req.user._id.toString()){ //if the user is not the one who created the product he cant update it
        return res.redirect('/')
      }
      product.title = Title;
      product.price = price;
      product.description = description;
      if(image){
        fileHelper.deleteFile(product.imageUrl)
        product.imageUrl = image.path;
      }
      return product 
      .save()
      .then((result) => {
        console.log("UPDATED PRODUCT!");
        res.redirect("/admin/products");
      }) 
    })
    .catch((err) => {
      const error = new Error(err)
      error.httpStatusCode = 500;
      return next(error)
    });
};

exports.deleteProduct = (req, res,next) => {
  const prodId = req.params.productId; // ID get correct to the function
  Product.findById(prodId)
  .then(product =>{
    if(!product){
      return next(new Error('Product not found'))
    }
    fileHelper.deleteFile(product.imageUrl)
    return Product.deleteOne({_id:prodId,userId:req.user._id})
  })
  .then(() => {

    console.log("DESTROY PRODUCT");
    res.status(200).json({message:'Deleting Success'});

  }).catch(err =>{
    res.status(500).json({message:'Deleting Failed'});
  })


  
};

