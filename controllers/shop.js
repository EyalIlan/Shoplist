const Product = require("../models/product");
const Order = require("../models/order");
const fs = require("fs");
const path = require("path");
const PDFdocument = require("pdfkit");
const stripe = require('stripe')('sk_test_51HlqG0L5XN9A2GRJ5F92ho9BR0OWzBojgzHjCEsZQHs3jhW3awRyKkEhHdc5IU96f1gtCrWHddGBQ0kyAqvdbhpn00AESPxIFQ')

const ITEM_PER_PAGE = 3

exports.getProducts = (req, res) => {
  const page = +req.query.page || 1;
  let totalItems;

  Product.find().countDocuments()
  .then(numberofProducts =>{
    totalItems = numberofProducts
    return Product.find()
    .skip((page-1)*ITEM_PER_PAGE)
    .limit(ITEM_PER_PAGE)
  })
  .then((products) => {
    // console.log(Math.ceil(totalItems/ITEM_PER_PAGE))
    res.render("shop/product-list.ejs", {
      pageTitle: "Products",
      prods: products,
      path: "/products",
      isAuthenticated: req.session.isLoggedIn,
      csrfToken: req.csrfToken(),
      currentPage: page,
      hasNextPage: ITEM_PER_PAGE * page < totalItems,
      hasPreviosPage: page > 1,
      nextPage: page + 1,
      PreviosPage: page - 1,
      lastPage: Math.ceil(totalItems/ITEM_PER_PAGE)
    })
  })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getIndex = (req, res,next) => {
  const page = +req.query.page || 1;
  let totalItems;

  Product.find().countDocuments()
  .then(numberofProducts =>{
    totalItems = numberofProducts
    return Product.find()
    .skip((page-1)*ITEM_PER_PAGE)
    .limit(ITEM_PER_PAGE)
  })
  .then((products) => {
    // console.log(Math.ceil(totalItems/ITEM_PER_PAGE))
    res.render("shop/index.ejs", {
      pageTitle: "Shop",
      prods: products,
      path: "/",
      isAuthenticated: req.session.isLoggedIn,
      csrfToken: req.csrfToken(),
      currentPage: page,
      hasNextPage: ITEM_PER_PAGE * page < totalItems,
      hasPreviosPage: page > 1,
      nextPage: page + 1,
      PreviosPage: page - 1,
      lastPage: Math.ceil(totalItems/ITEM_PER_PAGE)
    })
  })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getCart = (req, res) => {
  req.user
    .populate("cart.items.productId")
    .execPopulate()
    .then((user) => {
      const products = user.cart.items;
      res.render("shop/cart.ejs", {
        pageTitle: "Your Cart",
        path: "/cart",
        products: products,
      });
    });
};

exports.postOrder = (req, res) => {
  req.user
    .populate("cart.items.productId")
    .execPopulate()
    .then((user) => {
      const products = user.cart.items.map((i) => {
        return { quantity: i.quantity, product: { ...i.productId._doc } };
      });
      const order = new Order({
        user: {
          email: req.user.email,
          userId: req.user,
        },
        products: products,
      });
      order.save();
    })
    .then((result) => {
      return req.user.clearCart();
    })
    .then(() => {
      res.redirect("/orders");
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};


exports.getCheckoutSuccess = (req, res) => {
  req.user
    .populate("cart.items.productId")
    .execPopulate()
    .then((user) => {
      const products = user.cart.items.map((i) => {
        return { quantity: i.quantity, product: { ...i.productId._doc } };
      });
      const order = new Order({
        user: {
          email: req.user.email,
          userId: req.user,
        },
        products: products,
      });
      order.save();
    })
    .then((result) => {
      return req.user.clearCart();
    })
    .then(() => {
      res.redirect("/orders");
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getOrders = (req, res) => {
  Order.find({ "user.userId": req.user._id })
    .then((orders) => {
      console.log(orders);
      res.render("shop/orders.ejs", {
        pageTitle: "Your Orders",
        path: "/orders",
        orders: orders,
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getCheckout = (req, res) => {
  
  let products;
  let total = 0 
   req.user
  .populate("cart.items.productId")
  .execPopulate()
  .then((user) => {
    products = user.cart.items;
    total = 0;
    products.forEach(e =>{
      total += e.quantity * e.productId.price
    })
    return stripe.checkout.sessions.create({
      payment_method_types:['card'],
      line_items:products.map(p =>{
        return {
          name: p.productId.title,
          description:p.productId.description,
          amount:p.productId.price * 100,
          currency:'usd',
          quantity:p.quantity
        };
      }),
      success_url:req.protocol + '://' + req.get('host') + '/checkout/success',
      cancel_url:req.protocol + '://' + req.get('host') + '/checkout/cancel'
    })
  }).then(session =>{
    res.render("shop/checkout.ejs", {
      pageTitle: "Checkout",
      path: "/checkout",
      products: products,
      totalSum:total,
      sessionId:session.id
    });
  })
};

exports.getProduct = (req, res) => {
  const prodId = req.params.productId;
  Product.findById(prodId) //findById is a mongoose function
    .then((product) => {
      res.render("shop/product-detail", {
        pageTitle: "Product Detail",
        path: "/products",
        product: product,
      });
    });
};

exports.postCart = (req, res) => {
  const prodId = req.body.productId;
  Product.findById(prodId)
    .then((product) => {
      return req.user.addToCart(product);
    })
    .then((result) => {
      res.redirect("/cart");
    });
};

exports.postCartDeleteItem = (req, res, next) => {
  const prodId = req.body.productId;
  req.user
    .removeFromCart(prodId)
    .then((result) => {
      res.redirect("/cart");
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getInvoice = (req, res, next) => {
  const orderId = req.params.orderId;

  Order.findById(orderId)
    .then((order) => {
      if (!order) {
        return next(new Error("order not found"));
      }
      if (order.user.userId.toString() !== req.user._id.toString()) {
        return next(new Error("Unautorized"));
      }
      const invoiceName = "invoice-" + orderId + ".pdf";
      const invoicePath = path.join("data", "invoice", invoiceName);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        'inline; filename="' + invoiceName + '"'
      );

      const pdfDOC = new PDFdocument();
      pdfDOC.pipe(fs.createWriteStream(invoicePath));
      pdfDOC.pipe(res);

      pdfDOC.fontSize(26).text("Invoice", {
        underline: true,
      });
      pdfDOC.text("--------------------");
      let totalPrice = 0;
      order.products.forEach((prod) => {
        totalPrice = totalPrice + prod.quantity * prod.product.price;
        pdfDOC
          .fontSize(14)
          .text(
            prod.product.title +
              " - " +
              prod.quantity +
              " x " +
              "$" +
              prod.product.price
          );
      });
      pdfDOC.fontSize(26).text("--------------------");
      pdfDOC.fontSize(20).text("Total Price: $" + totalPrice);

      pdfDOC.end();

      // res.setHeader('Content-Type','application/pdf')
      // fs.readFile(invoiceParg,(err,data)=>{
      //   if(err){
      //     return next(err)
      //   }
      //   res.setHeader('Content-Type','application/pdf')
      //   res.setHeader('Content-Disposition','inline; filename="'+invoiceName+'"')
      //   res.send(data)
      // })
    })
    .catch((err) => next(err));
};
