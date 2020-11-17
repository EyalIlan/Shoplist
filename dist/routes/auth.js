const express = require("express");
const authController = require("../controllers/auth");
const { check, body } = require("express-validator/check");
const User = require("../models/user");

const router = express.Router();

router.get("/login", authController.getLogin);

router.post(
  "/login",
  [
    body("email")
    .isEmail()
    .withMessage("User not exists")
    .normalizeEmail(),

    body("password", "password has to be valid")
      .isLength({ min: 5 })
      .isAlphanumeric()
      .trim()
  ],
  authController.postLogin
);

router.post("/logout", authController.postLogout);

router.get("/signup", authController.getSignup);

router.post(
  "/signup",
  [
    check("email")
      .isEmail()
      .withMessage("Please enter a valid email")
      .normalizeEmail()
      .custom((value, { reg }) => {
        return User.findOne({ email: value }).then((userDOC) => {
          if (userDOC) {
            return Promise.reject("Email Already exists");
          }
        });
      }),
    body("password", "please enter a password with least 5 charcters long")
      .isLength({ min: 5 })
      .isAlphanumeric()
      .trim(),

    body("confirmPassword").custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Passwords have to match");
      }
      return true;
    }),
  ],
  authController.postSignup
);

// router.get("/reset", authController.getReset);

// router.post("/reset", authController.postReset);

router.get("/reset/:token", authController.getNewpassword);

router.post("/new-password", authController.postNewPassword);

module.exports = router;
