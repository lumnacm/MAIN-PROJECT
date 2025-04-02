var express = require("express");
var userHelper = require("../helper/userHelper");
var chatHelper = require("../helper/chatHelper");
var adminHelper = require("../helper/adminHelper");
var router = express.Router();
var db = require("../config/connection");
const { default: axios } = require("axios");
var collections = require("../config/collections");
const psychiatristHelper = require("../helper/psychiatristHelper");
const ObjectId = require("mongodb").ObjectID;
var {server} = require('../app');
var socketIo = require('socket.io');

var io = socketIo(server);
const userMessage = [
  // Basic greetings
  ["hi", "hey", "hello"],
  // Basic inquiry
  ["how are you", "how's it going", "what's up"],
  // Anxiety-related queries
  ["i'm feeling anxious", "i feel nervous", "anxiety"],
  // Depression-related queries
  ["i'm depressed", "i feel sad", "feeling low"],
  // Sleep issues
  ["i can't sleep", "trouble sleeping", "insomnia"],
  // Overwhelm/Stress
  ["i feel overwhelmed", "i'm stressed", "overwhelmed"],
  // Panic attacks
  ["panic attack", "i'm having a panic attack", "panic"],
  // Loneliness
  ["i'm lonely", "i feel isolated", "feeling alone"],
  // Hopelessness
  ["i feel hopeless", "i feel despair", "no way out"],
  // Lack of motivation
  ["i have no motivation", "i feel unmotivated", "can't do anything"],
  // Anger management
  ["i feel angry", "i'm overwhelmed with anger", "anger issues"],
  // Seeking help
  ["should i seek help", "do i need a therapist", "is it time to talk to someone"],
  // Additional coping questions
  ["how do i manage my stress", "what can i do to reduce stress", "stress management"],
  ["what are some effective relaxation techniques", "suggest relaxation exercises", "relaxation techniques"],
  ["what are the signs of burnout", "am i burned out", "burnout symptoms"],
  ["how do i improve my sleep quality", "tips for better sleep", "sleep improvement"],
  ["how do i know if i need professional help", "should i seek professional help", "need therapy?"],
  ["what is mindfulness meditation", "tell me about mindfulness", "mindfulness benefits"],
  ["how can i build a support network", "tips for support system", "find support"],
  ["i feel overwhelmed by work and life", "too much pressure", "overwhelmed by responsibilities"]
];

const botReply = [
  // Basic greetings
  ["Hello!", "Hi!", "Hey there!"],
  // Basic inquiry response
  ["I'm here to help! How are you feeling today?"],
  // Anxiety response
  ["I'm sorry you're feeling anxious. Try taking deep, slow breaths and consider reaching out to someone you trust if your anxiety persists."],
  // Depression response
  ["It sounds like you're feeling really low. Remember, it's okay to seek help—talking to someone might make a difference."],
  // Sleep issues response
  ["Difficulty sleeping can be tough. Establish a calming bedtime routine and consider relaxation techniques. If it continues, please consult a professional."],
  // Overwhelm/Stress response
  ["Feeling overwhelmed can be challenging. Taking a break or practicing mindfulness might help. It could also be useful to talk to a supportive person."],
  // Panic attack response
  ["If you're experiencing a panic attack, try focusing on your breathing and use grounding techniques. If it worsens, please seek immediate help."],
  // Loneliness response
  ["Loneliness can be hard to handle. It might help to reach out to a friend or join a support group. Professional help is also available."],
  // Hopelessness response
  ["I'm really sorry you're feeling hopeless. It might be beneficial to talk to a trusted person or professional. If you're in crisis, please seek help immediately."],
  // Lack of motivation response
  ["A lack of motivation can be overwhelming. Starting with small tasks might help, and consider reaching out to someone for support."],
  // Anger management response
  ["Anger can be intense. Techniques like deep breathing, exercise, or speaking with a counselor may help you manage these feelings."],
  // Seeking help response
  ["It might be time to talk to a professional who can offer personalized advice and support for your mental health needs."],
  // Additional coping questions answers:
  ["Effective stress management can include exercise, meditation, and time management. Consider seeking professional help if stress becomes overwhelming."],
  ["Some effective relaxation techniques include deep breathing, progressive muscle relaxation, and mindfulness meditation. Regular practice can help reduce stress."],
  ["Burnout signs may include chronic fatigue, irritability, and reduced performance. If you notice these signs, consider self-care and professional advice."],
  ["Improving sleep quality often involves a consistent sleep schedule, a relaxing bedtime routine, and limiting screen time before bed. If problems persist, consult a professional."],
  ["If you experience prolonged sadness, anxiety, or overwhelming stress, it might be time to speak with a mental health professional for personalized guidance."],
  ["Mindfulness meditation is a practice that involves focusing on the present moment without judgment. It can help reduce stress and improve overall mental clarity."],
  ["Building a support network can involve joining community groups, seeking therapy, or connecting with friends and family who understand your experiences."],
  ["When work and life feel overwhelming, it can help to set priorities, delegate tasks, and take regular breaks. Professional guidance might also be beneficial."]
];

const fallbackReply = "I did not get that, please contact support.";

const AI_API_URL = "https://api.together.xyz/v1/completions";
 const AI_API_KEY = "f4a911ae033eb1b34093cc4d80e28881270d57f6626d605a0a1727fc169f95e9";
 
 async function getAIResponse(userInput, settings) {
   try {
     const response = await axios.post(
       AI_API_URL,
       {
         model: "mistralai/Mistral-7B-Instruct-v0.1",
         prompt: `${settings.prompt}\nUser: ${userInput}\nAI:`,
         max_tokens: 200,
       },
       {
         headers: { Authorization: `Bearer ${AI_API_KEY}` },
       }
     );
     return response.data.choices[0].text.trim();
   } catch (error) {
     console.error("AI response error:", error);
     return "I'm facing an issue understanding your request. Please try again later.";
   }
 }
 

const verifySignedIn = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.redirect("/signin");
  }
};

/* GET home page. */
router.get("/", async function (req, res, next) {
  let user = req.session.user;
  let psychiatrists = await userHelper.getAllpsychiatrists()
  let sessions = await userHelper.getAllSessions();

  res.render("users/home", { admin: false, psychiatrists, user, sessions });
});

router.post("/chatbot", async (req, res) => {
  try {
    const userInput = req.body.message?.toLowerCase() || "";
    if (!userInput) {
      return res.json({ reply: "Please enter a valid message." });
    }

    let reply = fallbackReply;
    console.log(userInput,"B444")

    // Check for predefined responses
    for (let i = 0; i < userMessage.length; i++) {
      if (userMessage[i].some(msg => userInput.includes(msg))) {
        reply = botReply[i][0];
        console.log( reply," reply----userInput.includes(msg)")
        break;
      }
    }

    // Handle room availability query
    if (userInput.includes("room availability")) {
      const { checkin, checkout, guests } = req.body; // Expecting data in request body
      if (!checkin || !checkout || !guests) {
        return res.json({ reply: "Please provide check-in date, check-out date, and number of guests." });
      }
      try {
        const response = await axios.get(
          `https://api.example.com/rooms?checkin=${checkin}&checkout=${checkout}&guests=${guests}`
        );
        reply = response.data.length ? `Available rooms: ${response.data.map(r => r.name).join(", ")}` : "No rooms available.";
      } catch (error) {
        console.error("Room availability error:", error);
        reply = "Error fetching room availability. Please try again later.";
      }
    }

    // If no predefined response, get AI-generated response
    if (reply === fallbackReply) {
      
      const settings = await adminHelper.getAIChatbotSettings();
      reply = await getAIResponse(userInput, settings);
      console.log( reply,"=== fallbackReply")
    }

    res.json({ reply });
  } catch (error) {
    console.error("Chatbot error:", error);
    res.status(500).json({ reply: "An error occurred. Please try again later." });
  }
});




router.get("/notifications", verifySignedIn, function (req, res) {
  let user = req.session.user;  // Get logged-in user from session

  // Use the user._id to fetch notifications for the logged-in user
  userHelper.getnotificationById(user._id).then((notifications) => {
    res.render("users/notifications", { admin: false, notifications, user });
  }).catch((err) => {
    console.error("Error fetching notifications:", err);
    res.status(500).send("Error fetching notifications");
  });
});

router.get("/about", async function (req, res) {
  res.render("users/about", { admin: false, });
})


router.get("/contact", async function (req, res) {
  res.render("users/contact", { admin: false, });
})

router.get("/service", async function (req, res) {
  res.render("users/service", { admin: false, });
})


router.post("/add-feedback", async function (req, res) {
  let user = req.session.user; // Ensure the user is logged in and the session is set
  let feedbackText = req.body.text; // Get feedback text from form input
  let username = req.body.username; // Get username from form input
  let sessionId = req.body.sessionId; // Get session ID from form input
  let builderId = req.body.builderId; // Get builder ID from form input

  if (!user) {
    return res.status(403).send("User not logged in");
  }

  try {
    const feedback = {
      userId: ObjectId(user._id), // Convert user ID to ObjectId
      sessionId: ObjectId(sessionId), // Convert session ID to ObjectId
      builderId: ObjectId(builderId), // Convert builder ID to ObjectId
      text: feedbackText,
      username: username,
      createdAt: new Date() // Store the timestamp
    };

    await userHelper.addFeedback(feedback);
    res.redirect("/single-session/" + sessionId); // Redirect back to the session page
  } catch (error) {
    console.error("Error adding feedback:", error);
    res.status(500).send("Server Error");
  }
});



router.get("/single-session/:id", async function (req, res) {
  let user = req.session.user;
  const sessionId = req.params.id;

  try {
    const session = await userHelper.getSessionById(sessionId);

    if (!session) {
      return res.status(404).send("Session not found");
    }
    // const feedbacks = await userHelper.getFeedbackBySessionId(sessionId); // Fetch feedbacks for the specific session

    res.render("users/single-session", {
      admin: false,
      user,
      session,
      // feedbacks
    });
  } catch (error) {
    console.error("Error fetching session:", error);
    res.status(500).send("Server Error");
  }
});




////////////////////PROFILE////////////////////////////////////
router.get("/profile", async function (req, res, next) {
  let user = req.session.user;
  res.render("users/profile", { admin: false, user });
});

////////////////////USER TYPE////////////////////////////////////
router.get("/usertype", async function (req, res, next) {
  res.render("users/usertype", { admin: false, layout: 'empty' });
});





router.get("/signup", function (req, res) {
  if (req.session.signedIn) {
    res.redirect("/");
  } else {
    res.render("users/signup", { admin: false, layout: 'empty' });
  }
});

router.post("/signup", async function (req, res) {
  const { Fname, Email, Phone, Address, Pincode, District, Password } = req.body;
  let errors = {};

  // Check if email already exists
  const existingEmail = await db.get()
    .collection(collections.USERS_COLLECTION)
    .findOne({ Email });

  if (existingEmail) {
    errors.email = "This email is already registered.";
  }

  if (!Email || !/^\S+@\S+\.\S+$/.test(Email)) {
    errors.email = 'Please enter a valid email address.';
  }

  // Validate phone number length and uniqueness

  if (!Phone) {
    errors.phone = "Please enter your phone number.";
  } else if (!/^\d{10}$/.test(Phone)) {
    errors.phone = "Phone number must be exactly 10 digits.";
  } else {
    const existingPhone = await db.get()
      .collection(collections.USERS_COLLECTION)
      .findOne({ Phone });

    if (existingPhone) {
      errors.phone = "This phone number is already registered.";
    }
  }
  // Validate Pincode
  // if (!Pincode) {
  //   errors.pincode = "Please enter your pincode.";
  // } else if (!/^\d{6}$/.test(Pincode)) {
  //   errors.pincode = "Pincode must be exactly 6 digits.";
  // }

  if (!Fname) errors.fname = "Please enter your first name.";
  if (!Email) errors.email = "Please enter your email.";
  // if (!Address) errors.address = "Please enter your address.";
  // if (!District) errors.district = "Please enter your city.";

  // Password validation
  if (!Password) {
    errors.password = "Please enter a password.";
  } else {
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])[A-Za-z\d\W_]{8,}$/;
    if (!strongPasswordRegex.test(Password)) {
      errors.password = "Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character.";
    }
  }

  if (Object.keys(errors).length > 0) {
    return res.render("users/signup", {
      admin: false,
      layout: 'empty',
      errors,
      Fname,
      Email,
      Phone,
      // Address,
      // Pincode,
      // District,
      Password
    });
  }

  // Proceed with signup
  userHelper.doSignup(req.body).then((response) => {
    req.session.signedIn = true;
    req.session.user = response;
    res.redirect("/");
  }).catch((err) => {
    console.error("Signup error:", err);
    res.status(500).send("An error occurred during signup.");
  });
});


router.get("/signin", function (req, res) {
  if (req.session.signedIn) {
    res.redirect("/");
  } else {
    res.render("users/signin", {
      admin: false,
      layout: 'empty',
      signInErr: req.session.signInErr,
    });
    req.session.signInErr = null;
  }
});


router.post("/signin", function (req, res) {
  const { Email, Password } = req.body;

  if (!Email || !Password) {
    req.session.signInErr = "Please fill in all fields.";
    return res.render("users/signin", {
      admin: false,
      layout: 'empty',
      signInErr: req.session.signInErr,
      email: Email,
      password: Password,
    });
  }

  userHelper.doSignin(req.body).then((response) => {
    if (response.status) {
      req.session.signedIn = true;
      req.session.user = response.user;
      res.redirect("/");
    } else {
      // If the user is disabled, display the message
      req.session.signInErr = response.msg || "Invalid Email/Password";
      res.render("users/signin", {
        admin: false,
        layout: 'empty',
        signInErr: req.session.signInErr,
        email: Email
      });
    }
  });
});




router.get("/signout", function (req, res) {
  req.session.signedIn = false;
  req.session.user = null;
  res.redirect("/");
});

router.get("/edit-profile/:id", verifySignedIn, async function (req, res) {
  let user = req.session.user;
  let userId = req.session.user._id;
  let userProfile = await userHelper.getUserDetails(userId);
  res.render("users/edit-profile", { admin: false, userProfile, user });
});

router.post("/edit-profile/:id", verifySignedIn, async function (req, res) {
  try {
    const { Fname, Lname, Email, Phone, Address, District, Pincode } = req.body;
    let errors = {};

    // Validate first name
    if (!Fname || Fname.trim().length === 0) {
      errors.fname = 'Please enter your first name.';
    }

    if (!District || District.trim().length === 0) {
      errors.district = 'Please enter your first name.';
    }

    // Validate last name
    if (!Lname || Lname.trim().length === 0) {
      errors.lname = 'Please enter your last name.';
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

    if (!Fname) errors.fname = "Please enter your first name.";
    if (!Lname) errors.lname = "Please enter your last name.";
    if (!Email) errors.email = "Please enter your email.";
    if (!Address) errors.address = "Please enter your address.";
    if (!District) errors.district = "Please enter your district.";

    // Validate other fields as needed...

    // If there are validation errors, re-render the form with error messages
    if (Object.keys(errors).length > 0) {
      let userProfile = await userHelper.getUserDetails(req.params.id);
      return res.render("users/edit-profile", {
        admin: false,
        userProfile,
        user: req.session.user,
        errors,
        Fname,
        Lname,
        Email,
        Phone,
        Address,
        District,
        Pincode,
      });
    }

    // Update the user profile
    await userHelper.updateUserProfile(req.params.id, req.body);

    // Fetch the updated user profile and update the session
    let updatedUserProfile = await userHelper.getUserDetails(req.params.id);
    req.session.user = updatedUserProfile;

    // Redirect to the profile page
    res.redirect("/profile");
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).send("An error occurred while updating the profile.");
  }
});


router.get("/requested", function (req, res) {
  let user = req.session.user;

  userHelper.getAllregistrations().then((registrations) => {
    res.render("users/requested", { admin: false, layout: "layout", registrations, user });
  });
});

///////ADD session/////////////////////                                         
router.get("/registration", verifySignedIn, async (req, res) => {
  try {
    const userId = req.session.user._id; // Assuming `user._id` is stored in the session
    const registration = await db.get()
      .collection(collections.REGISTRATION)
      .findOne({ userId: new ObjectId(userId) }); // Find the user's registration data

    if (registration && registration.status === "submitted") {
      // Redirect to `/requested` if status is pending
      return res.redirect("/requested");
    }

    // If no pending status, render the registration page
    res.render("users/registration", { admin: false, layout: "layout", user: req.session.user });
  } catch (error) {
    console.error("Error fetching registration status:", error);
    res.status(500).send("Something went wrong. Please try again.");
  }
});


router.post("/registration", function (req, res) {
  userHelper.registration(req.body, (id) => {
    res.redirect("/requested");
  });
});







router.get('/place-order/:id', verifySignedIn, async (req, res) => {
  const sessionId = req.params.id;

  // Validate the session ID
  if (!ObjectId.isValid(sessionId)) {
    return res.status(400).send('Invalid session ID format');
  }

  let user = req.session.user;

  // Fetch the product details by ID
  let session = await userHelper.getSessionDetails(sessionId);

  // If no session is found, handle the error
  if (!session) {
    return res.status(404).send('Session not found');
  }

  // Render the place-order page with session details
  res.render('users/place-order', { user, session });
});

router.post('/place-order', async (req, res) => {
  let user = req.session.user;
  let sessionId = req.body.sessionId;

  // Fetch session details
  let session = await userHelper.getSessionDetails(sessionId);
  let totalPrice = session.Price; // Get the price from the session

  // Call placeOrder function
  userHelper.placeOrder(req.body, session, totalPrice, user)
    .then((orderId) => {
      if (req.body["payment-method"] === "COD") {
        res.json({ codSuccess: true });
      } else {
        userHelper.generateRazorpay(orderId, totalPrice).then((response) => {
          res.json(response);
        });
      }
    })
    .catch((err) => {
      console.error("Error placing order:", err);
      res.status(500).send("Internal Server Error");
    });
});



router.post("/verify-payment", async (req, res) => {
  console.log(req.body);
  userHelper
    .verifyPayment(req.body)
    .then(() => {
      userHelper.changePaymentStatus(req.body["order[receipt]"]).then(() => {
        res.json({ status: true });
      });
    })
    .catch((err) => {
      res.json({ status: false, errMsg: "Payment Failed" });
    });
});

router.get("/order-placed", verifySignedIn, async (req, res) => {
  let user = req.session.user;
  let userId = req.session.user._id;
  // le = await userHelper.g(userId);
  res.render("users/order-placed", { admin: false, user });
});

router.get("/orders", verifySignedIn, async function (req, res) {
  let user = req.session.user;
  let userId = req.session.user._id;
  // Fetch user orders
  let orders = await userHelper.getUserOrder(userId);
  res.render("users/orders", { admin: false, user, orders });
});

router.get("/view-ordered-sessions/:id", verifySignedIn, async function (req, res) {
  let user = req.session.user;
  let orderId = req.params.id;

  // Log the orderId to see if it's correctly retrieved
  console.log("Retrieved Order ID:", orderId);

  // Check if orderId is valid
  if (!ObjectId.isValid(orderId)) {
    console.error('Invalid Order ID format:', orderId);  // Log the invalid ID
    return res.status(400).send('Invalid Order ID');
  }

  try {
    let sessions = await userHelper.getOrderSessions(orderId);
    res.render("users/order-sessions", {
      admin: false,
      user,
      sessions,
    });
  } catch (err) {
    console.error('Error fetching ordered sessions:', err);
    res.status(500).send('Internal Server Error');
  }
});



router.get("/cancel-order/:id", verifySignedIn, function (req, res) {
  let orderId = req.params.id;
  userHelper.cancelOrder(orderId).then(() => {
    res.redirect("/orders");
  });
});
router.get("/all-notifications/:id", verifySignedIn, function (req, res) {
  let orderId = req.params.id;
  let user = req.session.user;
  
  userHelper.getnotificationById(orderId).then((notifications) => {
    res.render("users/notifications", { admin: false, user ,notifications});
  });
});


router.post("/search", verifySignedIn, async function (req, res) {
  let user = req.session.user;
  let userId = req.session.user._id;
  // le = await userHelper.g(userId);
  userHelper.searchProduct(req.body).then((response) => {
    res.render("users/search-result", { admin: false, user, response });
  });
});
router.get('/take-assesment/:id',verifySignedIn,async (req, res) => {
  let user = req.session.user;
  let userId = req.session.user._id;
  let Id=req.params.id;
  const assessment = await userHelper.getAssessmentsId(Id);
  res.render("users/take-assessment", {
    admin: false, user, 
    assessment,
    userId
  });
});
router.post('/take-assesment/:id',verifySignedIn,async (req, res) => {
  let user = req.session.user;
  let userId = req.session.user._id;
  let Id=req.params.id;
  console.log("***********^^",req.body)
  const assessment = await userHelper.setAnswer(Id,req.body);
  res.render("users/take-success", {
    admin: false, user, 
    assessment,
    userId
  });
});
router.get("/my-sessions", verifySignedIn, async function (req, res) {
  let user = req.session.user;
  let userId = user._id;

  try {
    let sessions = await userHelper.getUserSessions(userId);
    res.render("users/my-sessions", { admin: false, user, sessions });
  } catch (error) {
    console.error("Error fetching user sessions:", error);
    res.status(500).send("Server Error");
  }
});
router.get("/my-assessment", verifySignedIn, async function (req, res) {
  let user = req.session.user;
  let userId = user._id;

  try {
    let sessions = await userHelper.getUserAssessment(userId);
    res.render("users/my-assessment", { admin: false, user, sessions });
  } catch (error) {
    console.error("Error fetching user sessions:", error);
    res.status(500).send("Server Error");
  }
});
router.get('/health-library', async (req, res) => {
  let user = req.session.user;
  let articles = await userHelper.getPublishedArticles();
  res.render('users/health-library', {admin: false, user, articles });
});
router.get('/my-journal',verifySignedIn, async (req, res) => {
  let user = req.session.user;
  let userId = user._id;
  let jrns = await userHelper.getUserJournals(userId);
  console.log("resjjjjj",jrns)

  res.render('users/my-journal', {admin: false, user, jrns });
});
router.post("/add-journal", verifySignedIn, function (req, res) {
  console.log("reshhhhhhhhhhhhhhhhhhhhhhhhhhh",req.body)
  let user = req.session.user;
  let userId = user._id;
  let userName= user.Fname + user.Lname;
  userHelper.addJournal(req.body,userId,userName).then(() => {
    res.send({status:true});
  });
});


router.get("/check-availability", async (req, res) => {
  try {
      const { secId, selecteddate,selectedtime } = req.query;

      if (!secId || !selecteddate) {
          return res.status(400).json({ error: "Missing secId or selecteddate" });
      }


      const isAvailable = await userHelper.checkAvailability(secId, selecteddate,selectedtime);

      if (isAvailable) {
          return res.json({ available: true, message: "Room is available" });
      } else {
          return res.json({ available: false, message: "Room is not available" });
      }
  } catch (error) {
      console.error("Error checking room availability:", error);
      res.status(500).json({ error: "Internal server error" });
  }
});


router.get("/my-dashboard", verifySignedIn, async function (req, res) {
  let user = req.session.user;
  let userId = user._id;

  try {
      let assessment = await userHelper.getUserAssessment(userId);
      let sessions = await userHelper.getUserSessions(userId);

      // Calculate total assessment score (Assuming each assessment has a score field)
      let totalScore = assessment.reduce((sum, a) => sum + (a.score || 0), 0);

      // Count pending assessments (assuming pending status is 'pending')
      let pendingAssessments = assessment.filter(a => a.status === "pending").length;

      res.render("users/my-dashboard", { 
          admin: false, 
          user, 
          sessions, 
          assessment, 
          totalScore, 
          pendingAssessments 
      });

  } catch (error) {
      console.error("Error fetching user sessions:", error);
      res.status(500).send("Server Error");
  }
});

router.get("/feedback", verifySignedIn, async function (req, res) {
  let user = req.session.user;
  let userId = user._id;

  try {
    let sessions = await userHelper.getUserSessions(userId);
    res.render("users/feedback", { admin: false, user, sessions });
  } catch (error) {
    console.error("Error fetching user sessions:", error);
    res.status(500).send("Server Error");
  }
});

router.get("/complaint", verifySignedIn, async function (req, res) {
  let user = req.session.user;
  let userId = user._id;

  try {
    let sessions = await userHelper.getUserSessions(userId);
    res.render("users/complaint", { admin: false, user, sessions });
  } catch (error) {
    console.error("Error fetching user sessions:", error);
    res.status(500).send("Server Error");
  }
});

router.post("/feedback/submit", async (req, res) => {
  let user = req.session.user;
  let userId = user._id;
  console.log("feedddddd")
  try {
      const { psychiatristId, sessionName, feedbackText } = req.body;
      console.log("feedddddd", psychiatristId,"user:::", userId)
      if (!psychiatristId || !userId || !feedbackText) {
          return res.status(400).json({ error: "All fields are required." });
      }

      const feedback = {
          psychiatristId: new ObjectId(psychiatristId),
          userId: new ObjectId(userId),
          sessionName,
          feedbackText,
          createdAt: new Date()
      };

      await db.get().collection(collections.FEEDBACK_COLLECTION).insertOne(feedback);
      res.json({ success: true, message: "Feedback submitted successfully." });
  } catch (error) {
      console.error("Error submitting feedback:", error);
      res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/complaint/submit", async (req, res) => {
  let user = req.session.user;
  let userId = user._id;
  let username= user.Lname + user.Fname;
  console.log("feedddddd",req.body)
  try {
      const { psychiatristId, sessionName, complaints, subject} = req.body;
      console.log("feedddddd", psychiatristId,"user:::", userId)
      if (!psychiatristId || !userId || !complaints) {
          return res.status(400).json({ error: "All fields are required." });
      }

      const feedback = {
          psychiatristId: new ObjectId(psychiatristId),
          userId: new ObjectId(userId),
          sessionName,
          complaints,
          username:username,
          subject,
          createdAt: new Date(),
          
      };

      await db.get().collection(collections.CMP_COLLECTION).insertOne(feedback);
      res.json({ success: true, message: "submitted successfully." });
  } catch (error) {
      console.error("Error submitting feedback:", error);
      res.status(500).json({ error: "Internal Server Error" });
  }
});



router.get('/chat/:userId/:psychiatristId/:orderId', verifySignedIn, async function (req, res) {
  let userId = req.params.userId;
  let psychiatristId = req.params.psychiatristId;
  let orderId = req.params.orderId;

  let otherUser = await psychiatristHelper.getPsychiatristDetails(psychiatristId);
  let messages = await chatHelper.getAllMessages(userId, psychiatristId, orderId);

  res.render('chat', {
    layout: 'layout',
    messages,
    otherUser: otherUser,
    user: req.session.user,
    isPsychiatrist: false
  });
});


router.post('/chat/send-message', async function (req, res) {
  const { chatRoomId, message, sendBy, isPsychiatrist } = req.body;
  const isPsychiatristBool = isPsychiatrist === true || isPsychiatrist === "true";

  let userName = '';
  if (isPsychiatristBool) {
    const response = await psychiatristHelper.getPsychiatristDetails(sendBy);
    userName = response.Name;
  } else {
    const response = await psychiatristHelper.getUserDataByUserId(sendBy);
    userName = response.Fname + " " + response.Lname;
  }
  try {
    var messageContent = {
      chatRoomId,
      message,
      sendBy,
      sendByName: userName,
      createdAt: new Date()
    };
    await chatHelper.sendMessage(chatRoomId, messageContent, sendBy);
    io.to(chatRoomId).emit('receive message', messageContent);
    res.status(200).send("Message sent successfully");
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).send("Failed to send message");
  }
});


module.exports = router;
