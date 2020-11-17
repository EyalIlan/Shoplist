exports.getErrorPage = (req, res) => {
  res.render("page404", {
    pageTitle: "Error Page",
    path: "/page404",
    isAuthenticated: req.session.isLoggedIn
  });
};

exports.get500 = (req,res) =>{
  res.render('500',{
    pageTitle: "Server error Page",
    path: "/500",
    isAuthenticated: req.session.isLoggedIn
  })
}