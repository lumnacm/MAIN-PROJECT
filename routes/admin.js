var express = require("express");
var adminHelper = require("../helper/adminHelper");
var fs = require("fs");
const userHelper = require("../helper/userHelper");
var router = express.Router();
var db = require("../config/connection");
var collections = require("../config/collections");
const ObjectId = require("mongodb").ObjectID;
const path = require('path');


const verifySignedIn = (req, res, next) => {
  if (req.session.signedInAdmin) {
    next();
  } else {
    res.redirect("/admin/signin");
  }
};

/* GET admins listing. */
router.get("/", verifySignedIn, function (req, res, next) {
  let administator = req.session.admin;
  adminHelper.getAllProducts().then((products) => {
    res.render("admin/home", { admin: true, products, layout: "admin-layout", administator });
  });
});

router.get("/patient-sessions", verifySignedIn, async function (req, res) {
  let administator = req.session.admin;

  // Fetch all orders for the current psychiatrist
  let orders = await adminHelper.getAllOrder();

  // Group orders by userId to get a unique list of patients
 

  res.render("admin/patient-sessions", {
    admin: true, layout: "admin-layout",
    administator,
    orders
  });
});

router.get('/articles',verifySignedIn, async (req, res) => {
  let administator = req.session.admin;
  let articles = await adminHelper.getAllArticles();
  res.render('admin/articles', { articles ,admin: true, layout: "admin-layout",administator});
});

router.get('/article/add', (req, res) => {
  let administator = req.session.admin;
  res.render('admin/add-article',{admin: true, layout: "admin-layout",administator});
});

router.post('/article/add', async (req, res) => {
  let administator = req.session.admin;
  const { title, banner, author, content, status } = req.body;
  await adminHelper.addArticle(req.body,(Id, error)=>{
    if (error) {
      console.log("Error adding session:", error);
      res.status(500).send("Failed to add session");
    } else {
      let image = req.files.Image;
      image.mv("./public/images/article-images/" + Id + ".png", (err) => {
        if (!err) {
          res.redirect('/admin/articles');
        } else {
          console.log("Error saving session image:", err);
          res.status(500).send("Failed to save session image");
        }
      });
    }
  })
  
});

router.get('/article/edit/:id', async (req, res) => {
  let administator = req.session.admin;
  let article = await adminHelper.getArticleById(req.params.id);
  res.render('admin/edit-article', { article ,admin: true, layout: "admin-layout",administator});
});

router.post('/article/edit/:id', async (req, res) => {
  let administator = req.session.admin;
  await adminHelper.updateArticle(req.params.id, req.body).then(() => {
    if (req.files) {
      let image = req.files.Image;
      if (image) {
        image.mv("./public/images/article-images/" + req.params.id + ".png");
      }
    }
    res.redirect('/admin/articles');
  });
});

router.post('/article/publish/:id', async (req, res) => {
  console.log("JJJJJJJJ",req.body.status)
  await adminHelper.publishArticle(req.params.id,req.body.status);
  res.redirect('/admin/articles');
});

router.post('/article/unpublish/:id', async (req, res) => {
  console.log("UMMMMMMMMMMMMMMMMMMM",req.body.status)
  await adminHelper.unpublishArticle(req.params.id,req.body.status);
  res.redirect('/admin/articles');
});
router.post("/article/delete/:id", async (req, res) => {
  try {
    await adminHelper.deleteArticle(req.params.id);
    res.redirect("/admin/articles");
  } catch (err) {
    res.status(500).send("Error deleting article");
  }
});



router.get("/all-notifications", verifySignedIn, async function (req, res) {
  let administator = req.session.admin;
  let notifications = await adminHelper.getAllnotifications();
  res.render("admin/all-notifications", { admin: true, layout: "admin-layout", administator, notifications });
});

///////ADD reply/////////////////////                                         
router.get("/add-notification", verifySignedIn, async function (req, res) {
  let administator = req.session.admin;
  let users = await adminHelper.getAllUsers();
  res.render("admin/add-notification", { admin: true, layout: "admin-layout", administator, users });
});

///////ADD notification/////////////////////                                         
router.post("/add-notification", function (req, res) {
  adminHelper.addnotification(req.body, (id) => {
    res.redirect("/admin/all-notifications");
  });
});

router.get("/delete-notification/:id", verifySignedIn, function (req, res) {
  let notificationId = req.params.id;
  adminHelper.deletenotification(notificationId).then((response) => {
    res.redirect("/admin/all-notifications");
  });
});

///////ALL psychiatrist/////////////////////                                         
router.get("/all-psychiatrists", verifySignedIn, function (req, res) {
  let administator = req.session.admin;
  adminHelper.getAllpsychiatrists().then((psychiatrists) => {
    res.render("admin/psychiatrists/all-psychiatrists", { admin: true, layout: "admin-layout", psychiatrists, administator });
  });
});

router.post("/approve-psychiatrist/:id", verifySignedIn, async function (req, res) {
  await db.get().collection(collections.PSYCHIATRIST_COLLECTION).updateOne(
    { _id: ObjectId(req.params.id) },
    { $set: { approved: true } }
  );
  res.redirect("/admin/all-psychiatrists");
});

router.get("/admin-profile",verifySignedIn, async function (req, res, next) {
  let administator = req.session.admin;
  let adm= db.get().collection(collections.ADMIN_COLLECTION).findOne({_id:ObjectId(administator._id)
  })

  res.render("admin/profile", { admin: true,layout:"admin-layout", administator,adm });
});

router.get("/edit-profile",verifySignedIn, async function (req, res, next) {
  let administator = req.session.admin;
  let adm= db.get().collection(collections.ADMIN_COLLECTION).findOne({_id:ObjectId(administator._id)
  })

  res.render("admin/edit-profile", { admin: true,layout:"admin-layout", administator,adm });
});
router.post("/edit-profile",verifySignedIn, async function (req, res, next) {
  let administator = req.session.admin;
  await db.get().collection(collections.ADMIN_COLLECTION).updateOne(
    { _id: ObjectId(administator._id) },
    { $set: { Name: req.body.Name, Email:req.body.Email } }
  );


  res.redirect("/admin/admin-profile")
});


router.post("/reject-psychiatrist/:id", function (req, res) {
  const psychiatristId = req.params.id;
  db.get()
    .collection(collections.PSYCHIATRIST_COLLECTION)
    .updateOne({ _id: ObjectId(psychiatristId) }, { $set: { approved: false, rejected: true } })
    .then(() => {
      res.redirect("/admin/all-psychiatrists");
    })
    .catch((err) => {
      console.error(err);
      res.redirect("/admin/all-psychiatrists");
    });
});



router.post("/delete-psychiatrist/:id", verifySignedIn, async function (req, res) {
  console.log("delllll",req.params.id)
 await db.get().collection(collections.PSYCHIATRIST_COLLECTION).deleteOne({ _id: ObjectId(req.params.id) });
  res.redirect("/admin/all-psychiatrists");
});

///////ADD psychiatrist/////////////////////                                         
router.get("/add-psychiatrist", verifySignedIn, function (req, res) {
  let administator = req.session.admin;
  res.render("admin/psychiatrists/add-psychiatrist", { admin: true, layout: "admin-layout", administator });
});

///////ADD psychiatrist/////////////////////                                         
router.post("/add-psychiatrist", function (req, res) {
  adminHelper.addpsychiatrist(req.body, (id) => {
    res.redirect("/admin/psychiatrists/all-psychiatrists");
  });
});

///////EDIT psychiatrist/////////////////////                                         
router.get("/edit-psychiatrist/:id", verifySignedIn, async function (req, res) {
  let administator = req.session.admin;
  let psychiatristId = req.params.id;
  let psychiatrist = await adminHelper.getpsychiatristDetails(psychiatristId);
  console.log(psychiatrist);
  res.render("admin/psychiatrists/edit-psychiatrist", { admin: true, layout: "admin-layout", psychiatrist, administator });
});

///////EDIT psychiatrist/////////////////////                                         
router.post("/edit-psychiatrist/:id", verifySignedIn, function (req, res) {
  let psychiatristId = req.params.id;
  adminHelper.updatepsychiatrist(psychiatristId, req.body).then(() => {
    res.redirect("/admin/psychiatrists/all-psychiatrists");
  });
});

///////DELETE psychiatrist/////////////////////                                         
// router.get("/delete-psychiatrist/:id", verifySignedIn, function (req, res) {
//   let psychiatristId = req.params.id;
//   adminHelper.deletepsychiatrist(psychiatristId).then((response) => {
//     res.redirect("/admin/all-psychiatrists");
//   });
// });

///////DELETE ALL psychiatrist/////////////////////                                         
router.get("/delete-all-psychiatrists", verifySignedIn, function (req, res) {
  adminHelper.deleteAllpsychiatrists().then(() => {
    res.redirect("/admin/psychiatrist/all-psychiatrists");
  });
});



router.get("/signup", function (req, res) {
  if (req.session.signedInAdmin) {
    res.redirect("/admin");
  } else {
    res.render("admin/signup", {
      admin: true, layout: "admin-empty",
      signUpErr: req.session.signUpErr,
    });
  }
});

router.post("/signup", function (req, res) {
  adminHelper.doSignup(req.body).then((response) => {
    console.log(response);
    if (response.status == false) {
      req.session.signUpErr = "Invalid Admin Code";
      res.redirect("/admin/signup");
    } else {
      req.session.signedInAdmin = true;
      req.session.admin = response;
      res.redirect("/admin");
    }
  });
});

router.get("/signin", function (req, res) {
  if (req.session.signedInAdmin) {
    res.redirect("/admin");
  } else {
    res.render("admin/signin", {
      admin: true, layout: "admin-empty",
      signInErr: req.session.signInErr,
    });
    req.session.signInErr = null;
  }
});

router.post("/signin", function (req, res) {
  adminHelper.doSignin(req.body).then((response) => {
    if (response.status) {
      req.session.signedInAdmin = true;
      req.session.admin = response.admin;
      res.redirect("/admin");
    } else {
      req.session.signInErr = "Invalid Email/Password";
      res.redirect("/admin/signin");
    }
  });
});

router.get("/signout", function (req, res) {
  req.session.signedInAdmin = false;
  req.session.admin = null;
  res.redirect("/admin");
});

router.post("/feedback/delete/:id", verifySignedIn, async function (req, res) {
  await db.get().collection(collections.FEEDBACK_COLLECTION).deleteOne({ _id: ObjectId(req.params.id) });
  res.redirect("/admin/feedback");
});



router.post("/complaints/delete/:id", verifySignedIn, async function (req, res) {
  await db.get().collection(collections.CMP_COLLECTION).deleteOne({ _id: ObjectId(req.params.id) });
  res.redirect("/admin/complaints");
});




router.get("/all-users", verifySignedIn, function (req, res) {
  let administator = req.session.admin;
  adminHelper.getAllUsers().then((users) => {
    res.render("admin/users/all-users", { admin: true, layout: "admin-layout", administator, users });
  });
});

router.post("/block-user/:id", (req, res) => {
  const userId = req.params.id;
  const { reason } = req.body;

  // Update the user in the database to set isDisable to true and add the reason
  db.get()
    .collection(collections.USERS_COLLECTION)
    .updateOne(
      { _id: new ObjectId(userId) },
      { $set: { isDisable: true, blockReason: reason } }
    )
    .then(() => res.json({ success: true }))
    .catch(err => {
      console.error('Error blocking user:', err);
      res.json({ success: false });
    });
});



router.get("/remove-all-users", verifySignedIn, function (req, res) {
  adminHelper.removeAllUsers().then(() => {
    res.redirect("/admin/all-users");
  });
});

router.get("/all-orders", verifySignedIn, async function (req, res) {
  let administator = req.session.admin;
  let { fromDate, toDate } = req.query; // Get fromDate and toDate from the query parameters

  try {
    let orders = await adminHelper.getAllOrders(fromDate, toDate); // Pass the date range to the function

    res.render("admin/finance", {
      admin: true,
      layout: "admin-layout",
      administator,
      orders,     // Render the filtered orders
      fromDate,   // Pass back toDate and fromDate to display on the form
      toDate
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).send("Server Error");
  }
});


router.get(
  "/view-ordered-products/:id",
  verifySignedIn,
  async function (req, res) {
    let administator = req.session.admin;
    let orderId = req.params.id;
    let products = await userHelper.getOrderProducts(orderId);
    res.render("admin/order-products", {
      admin: true, layout: "admin-layout",
      administator,
      products,
    });
  }
);

router.get("/change-status/", verifySignedIn, function (req, res) {
  let status = req.query.status;
  let orderId = req.query.orderId;
  adminHelper.changeStatus(status, orderId).then(() => {
    res.redirect("/admin/all-orders");
  });
});

router.get("/cancel-order/:id", verifySignedIn, function (req, res) {
  let orderId = req.params.id;
  adminHelper.cancelOrder(orderId).then(() => {
    res.redirect("/admin/all-orders");
  });
});

router.get("/cancel-all-orders", verifySignedIn, function (req, res) {
  adminHelper.cancelAllOrders().then(() => {
    res.redirect("/admin/all-orders");
  });
});

router.post("/search", verifySignedIn, function (req, res) {
  let administator = req.session.admin;
  adminHelper.searchProduct(req.body).then((response) => {
    res.render("admin/search-result", { admin: true, layout: "admin-layout", administator, response });
  });
});
// AI Chatbot settings page
router.get('/ai-chatbot-settings', verifySignedIn, async (req, res) => {
  let administator = req.session.admin;
  const settings = await adminHelper.getAIChatbotSettings();
  res.render('admin/ai-chatbot-settings', { admin: true, layout: 'admin-layout', administator, settings });
});


router.get('/reports', verifySignedIn, async (req, res) => {
  let administator = req.session.admin;
  res.render('admin/reports', { admin: true, layout: 'admin-layout', administator });
});

router.get("/placed-report",verifySignedIn, async (req, res) => {
 
  let administator = req.session.admin;
 let { fromDate, toDate } = req.query;
 let orders = await adminHelper.getOrderByStatus("placed", fromDate, toDate);
 res.render("admin/report-view", { admin: true, layout: "admin-layout",fromDate, toDate, administator, orders, title: "Placed Order Report" });
});

router.get("/accepted-report",verifySignedIn, async (req, res) => {
 
  let administator = req.session.admin;
 let { fromDate, toDate } = req.query;
 let orders = await adminHelper.getOrderByStatus("Accepted", fromDate, toDate);
 res.render("admin/report-view", { admin: true, layout: "admin-layout",fromDate, toDate, administator, orders, title: "Accepted Order Report" });
});

router.get("/rejected-report",verifySignedIn, async (req, res) => {
 
  let administator = req.session.admin;
 let { fromDate, toDate } = req.query;
 let orders = await adminHelper.getOrderByStatus("Rejected", fromDate, toDate);
 res.render("admin/report-view", { admin: true, layout: "admin-layout", fromDate, toDate,administator, orders, title: "Rejected Order Report" });
});

router.get("/order-report",verifySignedIn, async (req, res) => {
 
  let administator = req.session.admin;
 let { fromDate, toDate } = req.query;
 let orders = await adminHelper.getOrdersByStatus( fromDate, toDate);
 res.render("admin/report-view", { admin: true, layout: "admin-layout",fromDate, toDate, administator, orders, title: "Order Report" });
}); 
router.get('/complaints', verifySignedIn, async (req, res) => {
  let administator = req.session.admin;
  let cmp= await adminHelper.getAllComplaints();
  res.render('admin/complaints', { admin: true, layout: 'admin-layout', administator,cmp });
});



// Update AI Chatbot settings
router.post('/ai-chatbot-settings', verifySignedIn, async (req, res) => {
  try {
    const { prompt } = req.body;
    await adminHelper.updateAIChatbotSettings({ prompt });
    res.redirect('/admin/ai-chatbot-settings');
  } catch (error) {
    console.error('Error updating AI chatbot settings:', error);
    res.status(500).send('Internal Server Error');
  }
});



module.exports = router;
