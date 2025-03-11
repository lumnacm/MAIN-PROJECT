var express = require("express");
var psychiatristHelper = require("../helper/psychiatristHelper");
var fs = require("fs");
const userHelper = require("../helper/userHelper");
const adminHelper = require("../helper/adminHelper");
var chatHelper = require("../helper/chatHelper")

var router = express.Router();
var db = require("../config/connection");
var collections = require("../config/collections");
const ObjectId = require("mongodb").ObjectID;


const verifySignedIn = (req, res, next) => {
  if (req.session.signedInPsychiatrist) {
    next();
  } else {
    res.redirect("/psychiatrist/signin");
  }
};

/* GET admins listing. */
router.get("/", verifySignedIn, function (req, res, next) {
  let psychiatrist = req.session.psychiatrist;
  res.render("psychiatrist/home", { psychiatrist: true, layout: "layout", psychiatrist });
});

router.get("/home-2", verifySignedIn, function (req, res, next) {
  let psychiatrist = req.session.psychiatrist;
  res.render("psychiatrist/home-2", { psychiatrist: true, layout: "layout", psychiatrist });
});


///////ALL notification/////////////////////                                         
router.get("/all-notifications", verifySignedIn, async function (req, res) {
  let psychiatrist = req.session.psychiatrist;

  // Ensure you have the psychiatrist's ID available
  let psychiatristId = psychiatrist._id; // Adjust based on how psychiatrist ID is stored in session

  // Pass psychiatristId to getAllOrders
  let orders = await psychiatristHelper.getAllOrders(psychiatristId);
  let notifications = await psychiatristHelper.getAllnotifications(psychiatristId)
  res.render("psychiatrist/all-notifications", { psychiatrist: true, layout: "layout", notifications, psychiatrist, orders });
});

///////ADD notification/////////////////////                                         
router.get("/add-notification", verifySignedIn, function (req, res) {
  let psychiatrist = req.session.psychiatrist;
  res.render("psychiatrist/all-notifications", { psychiatrist: true, layout: "layout", psychiatrist });
});

///////ADD notification/////////////////////                                         
router.post("/add-notification", function (req, res) {
  psychiatristHelper.addnotification(req.body, (id) => {
    res.redirect("/psychiatrist/all-notifications");
  });
});

router.get("/delete-notification/:id", verifySignedIn, function (req, res) {
  let notificationId = req.params.id;
  adminHelper.deletenotification(notificationId).then((response) => {
    res.redirect("/psychiatrist/all-notifications");
  });
});

///////EDIT notification/////////////////////                                         
router.get("/edit-notification/:id", verifySignedIn, async function (req, res) {
  let psychiatrist = req.session.psychiatrist;
  let notificationId = req.params.id;
  let notification = await psychiatristHelper.getnotificationDetails(notificationId);
  console.log(notification);
  res.render("psychiatrist/edit-notification", { psychiatrist: true, layout: "layout", notification, psychiatrist });
});

///////EDIT notification/////////////////////                                         
router.post("/edit-notification/:id", verifySignedIn, function (req, res) {
  let notificationId = req.params.id;
  psychiatristHelper.updatenotification(notificationId, req.body).then(() => {
    if (req.files) {
      let image = req.files.Image;
      if (image) {
        image.mv("./public/images/notification-images/" + notificationId + ".png");
      }
    }
    res.redirect("/psychiatrist/all-notifications");
  });
});

///////DELETE notification/////////////////////                                         
router.get("/delete-notification/:id", verifySignedIn, function (req, res) {
  let notificationId = req.params.id;
  psychiatristHelper.deletenotification(notificationId).then((response) => {
    res.redirect("/psychiatrist/all-notifications");
  });
});

///////DELETE ALL notification/////////////////////                                         
router.get("/delete-all-notifications", verifySignedIn, function (req, res) {
  psychiatristHelper.deleteAllnotifications().then(() => {
    res.redirect("/psychiatrist/all-notifications");
  });
});


////////////////////PROFILE////////////////////////////////////
router.get("/profile", async function (req, res, next) {
  let psychiatrist = req.session.psychiatrist;
  res.render("psychiatrist/profile", { psychiatrist: true, layout: "layout", psychiatrist });
});


///////ALL workspace/////////////////////                                         
// router.get("/all-feedbacks", verifySignedIn, async function (req, res) {
//   let psychiatrist = req.session.psychiatrist;

//   const workspaceId = req.params.id;

//   console.log('workspace')

//   try {
//     const workspace = await userHelper.getWorkspaceById(workspaceId);
//     const feedbacks = await userHelper.getFeedbackByWorkspaceId(workspaceId); // Fetch feedbacks for the specific workspace
//     console.log('feedbacks', feedbacks)
//     res.render("psychiatrist/all-feedbacks", { psychiatrist: true, layout: "layout", workspace, feedbacks, psychiatrist });
//   } catch (error) {
//     console.error("Error fetching workspace:", error);
//     res.status(500).send("Server Error");
//   }

// });


router.get("/psychiatrist-feedback", async function (req, res) {
  let psychiatrist = req.session.psychiatrist; // Get the psychiatrist from session

  if (!psychiatrist) {
    return res.status(403).send("Psychiatrist not logged in");
  }

  try {
    // Fetch feedback for this psychiatrist
    const feedbacks = await psychiatristHelper.getFeedbackByPsychiatristId(psychiatrist._id);

    // Fetch workspace details for each feedback
    const feedbacksWithWorkspaces = await Promise.all(feedbacks.map(async feedback => {
      const workspace = await userHelper.getWorkspaceById(ObjectId(feedback.workspaceId)); // Convert workspaceId to ObjectId
      if (workspace) {
        feedback.workspaceName = workspace.name; // Attach workspace name to feedback
      }
      return feedback;
    }));

    // Render the feedback page with psychiatrist, feedbacks, and workspace data
    res.render("psychiatrist/all-feedbacks", {
      psychiatrist,  // Psychiatrist details
      feedbacks: feedbacksWithWorkspaces // Feedback with workspace details
    });
  } catch (error) {
    console.error("Error fetching feedback and workspaces:", error);
    res.status(500).send("Server Error");
  }
});
///manage-assessment

router.get("/manage-assessment", verifySignedIn, function (req, res) {
  let psychiatrist = req.session.psychiatrist;
  // psychiatristHelper.getAllsessions(req.session.psychiatrist._id).then((sessions) => {
    res.render("psychiatrist/manage-assessment", { psychiatrist: true, layout: "layout",  psychiatrist });
  // });
});
router.get("/set-assessment", verifySignedIn, async function (req, res) {
  let psychiatrist = req.session.psychiatrist;
  let psychiatristId = psychiatrist._id;

  // Fetch all orders for the current psychiatrist
  let orders = await psychiatristHelper.getAllOrders(psychiatristId);

  // Group orders by userId to get a unique list of patients
  let patients = {};
  orders.forEach(order => {
    if (!patients[order.user._id]) {
      patients[order.user._id] = order.user;
    }
  });

  res.render("psychiatrist/set-assessment", {
    psychiatrist: true,
    layout: "layout",
    patients: Object.values(patients),
    psychiatrist
  });
});

router.get("/assessment-result", verifySignedIn,async function (req, res) {
  let psychiatrist = req.session.psychiatrist;
  let psychiatristId = psychiatrist._id;

  // Fetch all orders for the current psychiatrist
  let ans= await psychiatristHelper.getAllAnsweredAssesement(psychiatristId);


  res.render("psychiatrist/assessment-result", {
    psychiatrist: true,
    layout: "layout",
    ans:ans,
    psychiatrist
  });
});

router.get('/view-assesment-result/:id',async (req, res) => {
  let psychiatrist = req.session.psychiatrist;
  let orderId=req.params.id;
  const assessment = await psychiatristHelper.getAssessments(orderId);
  res.render("psychiatrist/assessment-show", {
    psychiatrist: true,
    layout: "layout",
    psychiatrist,
    assessment,
    orderId
  });
});


///////ALL session/////////////////////                                         
router.get("/all-sessions", verifySignedIn, function (req, res) {
  let psychiatrist = req.session.psychiatrist;
  psychiatristHelper.getAllsessions(req.session.psychiatrist._id).then((sessions) => {
    res.render("psychiatrist/all-sessions", { psychiatrist: true, layout: "layout", sessions, psychiatrist });
  });
});

///////ADD session/////////////////////                                         
router.get("/add-session", verifySignedIn, function (req, res) {
  let psychiatrist = req.session.psychiatrist;
  res.render("psychiatrist/add-session", { psychiatrist: true, layout: "layout", psychiatrist });
});

///////ADD session/////////////////////                                         
router.post("/add-session", function (req, res) {
  // Ensure the psychiatrist is signed in and their ID is available
  if (req.session.signedInPsychiatrist && req.session.psychiatrist && req.session.psychiatrist._id) {
    const psychiatristId = req.session.psychiatrist._id; // Get the psychiatrist's ID from the session

    // Pass the psychiatristId to the addsession function
    psychiatristHelper.addsession(req.body, psychiatristId, (sessionId, error) => {
      if (error) {
        console.log("Error adding session:", error);
        res.status(500).send("Failed to add session");
      } else {
        let image = req.files.Image;
        image.mv("./public/images/session-images/" + sessionId + ".png", (err) => {
          if (!err) {
            res.redirect("/psychiatrist/all-sessions");
          } else {
            console.log("Error saving session image:", err);
            res.status(500).send("Failed to save session image");
          }
        });
      }
    });
  } else {
    // If the psychiatrist is not signed in, redirect to the sign-in page
    res.redirect("/psychiatrist/signin");
  }
});


///////EDIT workspace/////////////////////                                         
router.get("/edit-workspace/:id", verifySignedIn, async function (req, res) {
  let psychiatrist = req.session.psychiatrist;
  let workspaceId = req.params.id;
  let workspace = await psychiatristHelper.getworkspaceDetails(workspaceId);
  console.log(workspace);
  res.render("psychiatrist/edit-workspace", { psychiatrist: true, layout: "layout", workspace, psychiatrist });
});

///////EDIT workspace/////////////////////                                         
router.post("/edit-workspace/:id", verifySignedIn, function (req, res) {
  let workspaceId = req.params.id;
  psychiatristHelper.updateworkspace(workspaceId, req.body).then(() => {
    if (req.files) {
      let image = req.files.Image;
      if (image) {
        image.mv("./public/images/workspace-images/" + workspaceId + ".png");
      }
    }
    res.redirect("/psychiatrist/all-workspaces");
  });
});

///////DELETE workspace/////////////////////                                         
router.get("/delete-workspace/:id", verifySignedIn, function (req, res) {
  let workspaceId = req.params.id;
  psychiatristHelper.deleteworkspace(workspaceId).then((response) => {
    fs.unlinkSync("./public/images/workspace-images/" + workspaceId + ".png");
    res.redirect("/psychiatrist/all-workspaces");
  });
});

///////DELETE ALL workspace/////////////////////                                         
router.get("/delete-all-workspaces", verifySignedIn, function (req, res) {
  psychiatristHelper.deleteAllworkspaces().then(() => {
    res.redirect("/psychiatrist/all-workspaces");
  });
});


router.get("/all-users", verifySignedIn, async function (req, res) {
  let psychiatrist = req.session.psychiatrist;

  // Ensure you have the psychiatrist's ID available
  let psychiatristId = psychiatrist._id; // Adjust based on how psychiatrist ID is stored in session

  // Pass psychiatristId to getAllOrders
  let orders = await psychiatristHelper.getAllOrders(psychiatristId);

  res.render("psychiatrist/all-users", {
    psychiatrist: true,
    layout: "layout",
    orders,
    psychiatrist
  });
});

router.get("/all-transactions", verifySignedIn, async function (req, res) {
  let psychiatrist = req.session.psychiatrist;

  // Ensure you have the psychiatrist's ID available
  let psychiatristId = psychiatrist._id; // Adjust based on how psychiatrist ID is stored in session

  // Pass psychiatristId to getAllOrders
  let orders = await psychiatristHelper.getAllOrders(psychiatristId);

  res.render("psychiatrist/all-transactions", {
    psychiatrist: true,
    layout: "layout",
    orders,
    psychiatrist
  });
});

router.get("/pending-approval", function (req, res) {
  if (!req.session.signedInPsychiatrist || req.session.psychiatrist.approved) {
    res.redirect("/psychiatrist");
  } else {
    res.render("psychiatrist/pending-approval", {
      psychiatrist: true, layout: "empty",
    });
  }
});


router.get("/signup", function (req, res) {
  if (req.session.signedInPsychiatrist) {
    res.redirect("/psychiatrist");
  } else {
    res.render("psychiatrist/signup", {
      psychiatrist: true, layout: "empty",
      signUpErr: req.session.signUpErr,
    });
  }
});

router.post("/signup", async function (req, res) {
  const { Name, Email, Phone, Address, District, Pincode, Password, Qualication, Experience, Specialisation } = req.body;
  let errors = {};

  // Field validations
  if (!Name) errors.Name = "Please enter your company name.";
  if (!Email) errors.email = "Please enter your email.";
  if (!Phone) errors.phone = "Please enter your phone number.";
  if (!Address) errors.address = "Please enter your address.";
  if (!District) errors.district = "Please enter your district.";
  if (!Pincode) errors.pincode = "Please enter your pincode.";
  if (!Password) errors.password = "Please enter a password.";

  if (!Qualication) errors.qualication = "Please enter your qualication.";
  if (!Experience) errors.experience = "Please enter your experience.";
  if (!Specialisation) errors.specialisation = "Please enter your specialisation.";


  // Check if email or company name already exists
  const existingEmail = await db.get()
    .collection(collections.PSYCHIATRIST_COLLECTION)
    .findOne({ Email });
  if (existingEmail) errors.email = "This email is already registered.";

  if (!Email || !/^\S+@\S+\.\S+$/.test(Email)) {
    errors.email = 'Please enter a valid email address.';
  }

  // Validate Pincode and Phone
  if (!/^\d{6}$/.test(Pincode)) errors.pincode = "Pincode must be exactly 6 digits.";
  if (!/^\d{10}$/.test(Phone)) errors.phone = "Phone number must be exactly 10 digits.";
  const existingPhone = await db.get()
    .collection(collections.PSYCHIATRIST_COLLECTION)
    .findOne({ Phone });
  if (existingPhone) errors.phone = "This phone number is already registered.";

  // If there are validation errors, re-render the form
  if (Object.keys(errors).length > 0) {
    return res.render("psychiatrist/signup", {
      psychiatrist: true,
      layout: 'empty',
      errors,
      Name,
      Email,
      Phone,
      Address,
      District,
      Pincode,
      Password,
      Qualication,
      Experience,
      Specialisation
    });
  }

  psychiatristHelper.dosignup(req.body).then((response) => {
    if (!response) {
      req.session.signUpErr = "Invalid Admin Code";
      return res.redirect("/psychiatrist/signup");
    }

    // Extract the id properly, assuming it's part of an object (like MongoDB ObjectId)
    const id = response._id ? response._id.toString() : response.toString();

    // Ensure the images directory exists
    const imageDir = "./public/images/psychiatrist-images/";
    if (!fs.existsSync(imageDir)) {
      fs.mkdirSync(imageDir, { recursive: true });
    }

    // Handle image upload
    if (req.files && req.files.Image) {
      let image = req.files.Image;
      let imagePath = imageDir + id + ".png";  // Use the extracted id here

      console.log("Saving image to:", imagePath);  // Log the correct image path

      image.mv(imagePath, (err) => {
        if (!err) {
          // On successful image upload, redirect to pending approval
          req.session.signedInPsychiatrist = true;
          req.session.psychiatrist = response;
          res.redirect("/psychiatrist/pending-approval");
        } else {
          console.log("Error saving image:", err);  // Log any errors
          res.status(500).send("Error uploading image");
        }
      });
    } else {
      // No image uploaded, proceed without it
      req.session.signedInPsychiatrist = true;
      req.session.psychiatrist = response;
      res.redirect("/psychiatrist/pending-approval");
    }
  }).catch((err) => {
    console.log("Error during signup:", err);
    res.status(500).send("Error during signup");
  });
}),


  router.get("/signin", function (req, res) {
    if (req.session.signedInPsychiatrist) {
      res.redirect("/psychiatrist");
    } else {
      res.render("psychiatrist/signin", {
        psychiatrist: true, layout: "empty",
        signInErr: req.session.signInErr,
      });
      req.session.signInErr = null;
    }
  });

router.post("/signin", function (req, res) {
  const { Email, Password } = req.body;

  // Validate Email and Password
  if (!Email || !Password) {
    req.session.signInErr = "Please fill all fields.";
    return res.redirect("/psychiatrist/signin");
  }

  psychiatristHelper.doSignin(req.body)
    .then((response) => {
      if (response.status === true) {
        req.session.signedInPsychiatrist = true;
        req.session.psychiatrist = response.psychiatrist;
        res.redirect("/psychiatrist");
      } else if (response.status === "pending") {
        req.session.signInErr = "This user is not approved by admin, please wait.";
        res.redirect("/psychiatrist/signin");
      } else if (response.status === "rejected") {
        req.session.signInErr = "This user is rejected by admin.";
        res.redirect("/psychiatrist/signin");
      } else {
        req.session.signInErr = "Invalid Email/Password";
        res.redirect("/psychiatrist/signin");
      }
    })
    .catch((error) => {
      console.error(error);
      req.session.signInErr = "An error occurred. Please try again.";
      res.redirect("/psychiatrist/signin");
    });
});





router.get("/signout", function (req, res) {
  req.session.signedInPsychiatrist = false;
  req.session.psychiatrist = null;
  res.redirect("/psychiatrist");
});

////////////////////PROFILE////////////////////////////////////
router.get("/profile", async function (req, res, next) {
  let psychiatrist = req.session.psychiatrist;
  res.render("psychiatrist/profile", { psychiatrist: true, layout: "layout", psychiatrist });
});

router.get("/edit-profile/:id", verifySignedIn, async function (req, res) {
  let psychiatrist = req.session.psychiatrist;
  let psychiatristId = req.session.psychiatrist._id;
  let psychiatristProfile = await psychiatristHelper.getPsychiatristDetails(psychiatristId);
  res.render("psychiatrist/edit-profile", { psychiatrist: true, psychiatristProfile, psychiatrist });
});


router.post("/edit-profile/:id", verifySignedIn, async function (req, res) {
  try {
    const { Name, Email, Phone, Address, District, Pincode, Qualication, Experience, Specialisation } = req.body;
    let errors = {};

    // Validate first name
    if (!Name || Name.trim().length === 0) {
      errors.name = 'Please enter your  name.';
    }

    if (!Qualication || Qualication.trim().length === 0) {
      errors.qualication = 'Please enter your  qualication.';
    }
    if (!Experience || Experience.trim().length === 0) {
      errors.experience = 'Please enter your  experience.';
    }
    if (!Specialisation || Specialisation.trim().length === 0) {
      errors.specialisation = 'Please enter your  specialisation.';
    }

    if (!District || District.trim().length === 0) {
      errors.district = 'Please enter your district.';
    }



    // Validate email format
    if (!Email || !/^\S+@\S+\.\S+$/.test(Email)) {
      errors.email = 'Please enter a valid email address.';
    }

    // Validate phone number
    if (!Phone) {
      errors.phone = "Please enter your phone number.";
    } else if (!/^\d{10}$/.test(Phone)) {
      errors.phone = "Phone number must be exactly 10 digits.";
    }


    // Validate pincode
    if (!Pincode) {
      errors.pincode = "Please enter your pincode.";
    } else if (!/^\d{6}$/.test(Pincode)) {
      errors.pincode = "Pincode must be exactly 6 digits.";
    }

    if (!Name) errors.name = "Please enter your first name.";
    if (!Email) errors.email = "Please enter your email.";
    if (!Address) errors.address = "Please enter your address.";
    if (!District) errors.district = "Please enter your district.";

    // Validate other fields as needed...

    // If there are validation errors, re-render the form with error messages
    if (Object.keys(errors).length > 0) {
      let psychiatristProfile = await psychiatristHelper.getPsychiatristDetails(req.params.id);
      return res.render("psychiatrist/edit-profile", {
        admin: false,
        psychiatristProfile,
        psychiatrist: req.session.psychiatrist,
        errors,
        Name,
        Email,
        Phone,
        Address,
        District,
        Pincode,
        Specialisation,
        Experience,
        Qualication,
      });
    }

    // Update the psychiatrist profile
    await psychiatristHelper.updatePsychiatristProfile(req.params.id, req.body);

    // Fetch the updated psychiatrist profile and update the session
    let updatedPsychiatristProfile = await psychiatristHelper.getPsychiatristDetails(req.params.id);
    req.session.psychiatrist = updatedPsychiatristProfile;

    // Redirect to the profile page
    res.redirect("/psychiatrist/profile");
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).send("An error occurred while updating the profile.");
  }
});


router.get("/add-product", verifySignedIn, function (req, res) {
  let psychiatrist = req.session.psychiatrist;
  res.render("psychiatrist/add-product", { psychiatrist: true, layout: "layout", workspace });
});

router.post("/add-product", function (req, res) {
  psychiatristHelper.addProduct(req.body, (id) => {
    let image = req.files.Image;
    image.mv("./public/images/product-images/" + id + ".png", (err, done) => {
      if (!err) {
        res.redirect("/psychiatrist/add-product");
      } else {
        console.log(err);
      }
    });
  });
});

router.get("/edit-product/:id", verifySignedIn, async function (req, res) {
  let psychiatrist = req.session.psychiatrist;
  let productId = req.params.id;
  let product = await psychiatristHelper.getProductDetails(productId);
  console.log(product);
  res.render("psychiatrist/edit-product", { psychiatrist: true, layout: "layout", product, workspace });
});

router.post("/edit-product/:id", verifySignedIn, function (req, res) {
  let productId = req.params.id;
  psychiatristHelper.updateProduct(productId, req.body).then(() => {
    if (req.files) {
      let image = req.files.Image;
      if (image) {
        image.mv("./public/images/product-images/" + productId + ".png");
      }
    }
    res.redirect("/psychiatrist/all-products");
  });
});

router.get("/delete-product/:id", verifySignedIn, function (req, res) {
  let productId = req.params.id;
  psychiatristHelper.deleteProduct(productId).then((response) => {
    fs.unlinkSync("./public/images/product-images/" + productId + ".png");
    res.redirect("/psychiatrist/all-products");
  });
});

router.get("/delete-all-products", verifySignedIn, function (req, res) {
  psychiatristHelper.deleteAllProducts().then(() => {
    res.redirect("/psychiatrist/all-products");
  });
});

router.get("/all-users", verifySignedIn, function (req, res) {
  let psychiatrist = req.session.psychiatrist;
  psychiatristHelper.getAllUsers().then((users) => {
    res.render("psychiatrist/users/all-users", { psychiatrist: true, layout: "layout", workspace, users });
  });
});

router.get("/remove-user/:id", verifySignedIn, function (req, res) {
  let userId = req.params.id;
  psychiatristHelper.removeUser(userId).then(() => {
    res.redirect("/psychiatrist/all-users");
  });
});

router.get("/remove-all-users", verifySignedIn, function (req, res) {
  psychiatristHelper.removeAllUsers().then(() => {
    res.redirect("/psychiatrist/all-users");
  });
});

router.get("/all-orders", verifySignedIn, async function (req, res) {
  let psychiatrist = req.session.psychiatrist;

  // Ensure you have the psychiatrist's ID available
  let psychiatristId = psychiatrist._id; // Adjust based on how psychiatrist ID is stored in session

  // Pass psychiatristId to getAllOrders
  let orders = await psychiatristHelper.getAllOrders(psychiatristId);

  res.render("psychiatrist/all-orders", {
    psychiatrist: true,
    layout: "layout",
    orders,
    psychiatrist
  });
});

router.get(
  "/view-ordered-products/:id",
  verifySignedIn,
  async function (req, res) {
    let psychiatrist = req.session.psychiatrist;
    let orderId = req.params.id;

    let order = await userHelper.getOrderDetails(orderId);
    console.log("Order Details:", order);

    res.render("psychiatrist/order-products", {
      psychiatrist: true,
      layout: "layout",
      order, 
      psychiatrist
    });
  }
);



router.get("/change-status/", verifySignedIn, function (req, res) {
  let status = req.query.status;
  let orderId = req.query.orderId;
  psychiatristHelper.changeStatus(status, orderId).then(() => {
    res.redirect("/psychiatrist/all-orders");
  });
});
router.post("/reschedule/:orderId", verifySignedIn, function (req, res) {
  console.log("reshhhhhhhhhhhhhhhhhhhhhhhhhhh")
  let time = req.body.orderTime;
  let orderId = req.params.orderId;
  psychiatristHelper.changeTime(time, orderId).then(() => {
    res.send({status:true});
  });
});

router.get("/cancel-order/:id", verifySignedIn, function (req, res) {
  let orderId = req.params.id;
  psychiatristHelper.cancelOrder(orderId).then(() => {
    res.redirect("/psychiatrist/all-orders");
  });
});

router.get("/cancel-all-orders", verifySignedIn, function (req, res) {
  psychiatristHelper.cancelAllOrders().then(() => {
    res.redirect("/psychiatrist/all-orders");
  });
});

router.post("/search", verifySignedIn, function (req, res) {
  let psychiatrist = req.session.psychiatrist;
  psychiatristHelper.searchProduct(req.body).then((response) => {
    res.render("psychiatrist/search-result", { psychiatrist: true, layout: "layout", workspace, response });
  });
});

router.post('/add-review/:id', verifySignedIn, async function (req, res) {
  let orderId = req.params.id;
  let review = req.body.review;

  try {
    await psychiatristHelper.addReview(orderId, review);
    res.json({ success: true });
  } catch (error) {
    console.error('Error adding review:', error);
    res.json({ success: false });
  }
});

router.get("/view-patient-sessions/:userId", verifySignedIn, async function (req, res) {
  let psychiatrist = req.session.psychiatrist;
  let userId = req.params.userId;

  try {
    const user = await psychiatristHelper.getUserDataByUserId(userId);

    // Fetch all orders for the current psychiatrist and the specified user
    let orders = await psychiatristHelper.getOrdersByUserId(psychiatrist._id, userId);

    res.render("psychiatrist/view-patient-sessions", {
      psychiatrist: true,
      layout: "layout",
      orders,
      user,
      psychiatrist
    });
  } catch (error) {
    console.error("Error fetching patient sessions:", error);
    res.status(500).send("Server Error");
  }

});
router.get("/patient-sessions", verifySignedIn, async function (req, res) {
  let psychiatrist = req.session.psychiatrist;
  let psychiatristId = psychiatrist._id;

  // Fetch all orders for the current psychiatrist
  let orders = await psychiatristHelper.getAllOrders(psychiatristId);

  // Group orders by userId to get a unique list of patients
  let patients = {};
  orders.forEach(order => {
    if (!patients[order.user._id]) {
      patients[order.user._id] = order.user;
    }
  });

  res.render("psychiatrist/patient-sessions", {
    psychiatrist: true,
    layout: "layout",
    patients: Object.values(patients),
    psychiatrist
  });
});

router.get('/assessment/:id', (req, res) => {
  let psychiatrist = req.session.psychiatrist;
  let orderId=req.params.id;
  res.render("psychiatrist/assessment", {
    psychiatrist: true,
    layout: "layout",
    psychiatrist,
    orderId
  });
});
router.get('/assessment-show/:id',async (req, res) => {
  let psychiatrist = req.session.psychiatrist;
  let orderId=req.params.id;
  const assessment = await psychiatristHelper.getAssessments(orderId);
  res.render("psychiatrist/assessment-show", {
    psychiatrist: true,
    layout: "layout",
    psychiatrist,
    assessment,
    orderId
  });
});
router.get('/assessment/edit/:id',async (req, res) => {
  let psychiatrist = req.session.psychiatrist;
  let orderId=req.params.id;
  const assessment = await psychiatristHelper.getAssessmentsId(orderId);
  res.render("psychiatrist/edit-assessment", {
    psychiatrist: true,
    layout: "layout",
    psychiatrist,
    assessment,
    orderId
  });
});
router.post('/assessment/edit/:id', async (req, res) => {
  try {
    const id = req.params.id;
    // Updated data from the submitted form.
    // Note: Depending on your form structure, you might need to massage the data.
    const updatedData = req.body;
    
    const result = await updateAssessment(id, updatedData);
    if (result.modifiedCount > 0) {
      // Redirect to assessments list or display a success message.
      res.redirect('/assessments');
    } else {
      res.send("No changes were made.");
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating assessment.");
  }
});


router.post('/assessment', async (req, res) => {
  let psychiatrist = req.session.psychiatrist;
  let psychiatristId = psychiatrist._id;
  let orderId=req.body.orderId;
  let user= await psychiatristHelper.getUserIdByOrderId(orderId);
  try {
    const assessmentData = req.body;
    console.log('Received assessment data:', assessmentData);

    // Save the assessment data to MongoDB using the helper function
    const savedAssessment = await psychiatristHelper.saveAssessment(assessmentData,psychiatristId,user);
    res.json({ success: true, message: 'Assessment saved successfully!', data: savedAssessment });
  } catch (error) {
    console.error('Error saving assessment:', error);
    res.status(500).json({ success: false, message: 'Error saving assessment' });
  }
});


router.get("/list-patient-assesment/:userId", verifySignedIn, async function (req, res) {
  let psychiatrist = req.session.psychiatrist;
  let userId = req.params.userId;

  try {
    const user = await psychiatristHelper.getUserDataByUserId(userId);

    // Fetch all orders for the current psychiatrist and the specified user
    let orders = await psychiatristHelper.getOrdersByUserId(psychiatrist._id, userId);

    res.render("psychiatrist/list-patient-assesment", {
      psychiatrist: true,
      layout: "layout",
      orders,
      user,
      psychiatrist
    });
  } catch (error) {
    console.error("Error fetching patient sessions:", error);
    res.status(500).send("Server Error");
  }
});

router.get('/chat/:userId/:psychiatristId/:orderId', verifySignedIn, async function (req, res) {
  let psychiatrist = req.session.psychiatrist;
  let userId = req.params.userId;
  let psychiatristId = req.params.psychiatristId;
  let orderID = req.params.orderId;

  let otherUser = await psychiatristHelper.getUserDataByUserId(userId);
  let messages = await chatHelper.getAllMessages(userId, psychiatristId,orderID);

  res.render('chat', {
    layout: 'layout',
    messages,
    otherUser:otherUser,
    user:psychiatrist,
    isPsychiatrist:true
  });
});

module.exports = router;
