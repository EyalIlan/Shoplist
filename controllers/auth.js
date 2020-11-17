const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const sendgridTransport = require("nodemailer-sendgrid-transport");
const { validationResult } = require("express-validator/check");

const User = require("../models/user");

const transport = nodemailer.createTransport(
  sendgridTransport({
    auth: {
      api_key:
        "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",
    },
  })
);

exports.getLogin = (req, res,next) => {
  let message = req.flash("error");
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render("auth/login.ejs", {
    pageTitle: "Login",
    path: "/login",
    errorMessage: message,
    oldInput: {
      email: "",
      password: "",
    },
    ValidationError: [],
  });
};

exports.postLogin = (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  const error = validationResult(req); // validation errors
  if (!error.isEmpty()) {
    return res.status(422).render("auth/login.ejs", {
      pageTitle: "Login",
      path: "/login",
      errorMessage: error.array()[0].msg,
      oldInput: {
        email: email,
        password: password,
      },
      ValidationError: error.array(),
    });
  }
  User.findOne({ email: email })
    .then((user) => {
      if (!user) {
        return res.status(422).render("auth/login.ejs", {
          pageTitle: "Login",
          path: "/login",
          errorMessage: "Invalid email or password",
          oldInput: {
            email: email,
            password: password,
          },
          ValidationError: [],
        });
      }
      bcrypt
        .compare(password, user.password)
        .then((doMatch) => {
          if (doMatch) {
            req.session.isLoggedIn = true;
            req.session.user = user;
            return req.session.save((err) => {
              res.redirect("/");
            });
          }
           return res.status(422).render("auth/login.ejs", {
            pageTitle: "Login",
            path: "/login",
            errorMessage: "Invalid email or password",
            oldInput: {
              email: email,
              password: password,
            },
            ValidationError: [],
          });
        })
        .catch((err) => {
          console.log(err);
          redirect("/login");
        });
    })
    .catch((err) => {
      const error = new Error(err)
      error.httpStatusCode = 500;
      return next(error)
    });
};

exports.postLogout = (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
};

exports.getSignup = (req, res, next) => {
  let error = req.flash("error");

  if (error.length > 0) {
    error = error[0];
  } else {
    error = null;
  }
  res.render("auth/signup", {
    path: "/signup",
    pageTitle: "Signup",
    errorMessage: error,
    oldInput: {
      email: "",
      password: "",
      confirmPassowrd: "",
    },
    ValidationError: [],
  });
};

exports.postSignup = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const error = validationResult(req);
  if (!error.isEmpty()) {
    console.log(error)
    return res.status(422).render("auth/signup", {
      path: "/signup",
      pageTitle: "Signup",
      errorMessage: error.array()[0].msg,
      oldInput: {
        email: email,
        password: password,
        confirmPassowrd: req.body.confirmPassowrd,
      },
      ValidationError: error.array(),
    });
  }
  bcrypt
    .hash(password, 12)
    .then((hashedPassword) => {
      const user = new User({
        email: email,
        password: hashedPassword,
        cart: { items: [] },
      });
      return user.save();
    })
    .then((result) => {
      res.redirect("/login");
      return transport
        .sendMail({
          to: email,
          from: "eyal444555@gmail.com",
          subject: "Signup succeeded!",
          html: "<h1>You successfully signed up! </h1>",
        })
        .catch((err) => console.log(err));
    })
    .catch((err) => {
      const error = new Error(err)
      error.httpStatusCode = 500;
      return next(error)
    });
};

exports.postLogout = (req, res, next) => {
  req.session.destroy((err) => {
    console.log(err);
    res.redirect("/");
  });
};

// exports.getReset = (req, res) => {
//   let message = req.flash("error");
//   if (message.length > 0) {
//     message = message[0];
//   } else {
//     message = null;
//   }

//   res.render("auth/reset.ejs", {
//     pageTitle: "Reset Password",
//     path: "/reset-password",
//     errorMessage: message,
//   });
// };

// exports.postReset = (req, res, next) => {
//   crypto.randomBytes(32, (err, buffer) => {
//     if (err) {
//       console.log(err);
//       return res.redirect("/reset");
//     }
//     const token = buffer.toString("hex");
//     User.findOne({ email: req.body.email })
//       .then((user) => {
//         if (!user) {
//           req.flash("error", "No account with that email found");
//           return res.redirect("/reset");
//         }
//         user.resetToken = token;
//         user.resetTokenExpiration = Date.now() + 3600000;
//         return user.save();
//       })
//       .then((result) => {
//         res.redirect("/");
//         transport.sendMail({
//           to: req.body.email,
//           from: "test@testgmail.com",
//           subject: "Password reset",
//           html: `
//           <p> you requested a password reset </p>
//           <p> Click this <a href="http://localhost:3000/reset/${token}">Link</a> to set a new password. </p>
//         `,
//         });
//       })
//       .catch((err) => {
//         const error = new Error(err)
//         error.httpStatusCode = 500;
//         return next(error)
//       });
//   });
// };

exports.getNewpassword = (req, res) => {
  const Token = req.params.token; // the user token input
  User.findOne({ resetToken: Token, resetTokenExpiration: { $gt: Date.now() } }) //check if a user exists with the token and it's not expired
    .then((user) => {
      let message = req.flash("error");
      if (message.length > 0) {
        message = message[0];
      } else {
        message = null;
      }
      res.render("auth/new-password.ejs", {
        pageTitle: "New Password",
        path: "/new-password",
        errorMessage: message,
        userId: user._id.toString(),
        passwordToken: Token,
      });
    })
    .catch((err) => {
      const error = new Error(err)
      error.httpStatusCode = 500;
      return next(error)
    });
};

exports.postNewPassword = (req, res) => {
  const newPassword = req.body.password;
  const userId = req.body.userId;
  const passwordToken = req.body.passwordToken;
  let resetUser;

  User.findOne({
    resetToken: passwordToken,
    resetTokenExpiration: { $gt: Date.now() },
    _id: userId,
  })
    .then((user) => {
      resetUser = user;
      return bcrypt.hash(12, newPassword);
    })
    .then((hashedPassword) => {
      resetUser.password = hashedPassword;
      resetUser.resetToken = undefined;
      resetUser.resetTokenExpiration = undefined;
      return resetUser.save();
    })
    .then((result) => {
      res.redirect("/login");
    })
    .catch((err) => {
      const error = new Error(err)
      error.httpStatusCode = 500;
      return next(error)
    });
};

//Mail program dosent work!!
