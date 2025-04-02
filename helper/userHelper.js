var db = require("../config/connection");
var collections = require("../config/collections");
const bcrypt = require("bcrypt");
const objectId = require("mongodb").ObjectID;
const Razorpay = require("razorpay");
const ObjectId = require('mongodb').ObjectId; // Required to convert string to ObjectId


var instance = new Razorpay({
  key_id: "rzp_test_8NokNgt8cA3Hdv",
  key_secret: "xPzG53EXxT8PKr34qT7CTFm9",
});

module.exports = {


  getAllregistrations: () => {
    return new Promise(async (resolve, reject) => {
      let registrations = await db
        .get()
        .collection(collections.REGISTRATION)
        .find()
        .toArray();
      resolve(registrations);
    });
  },
  getUserJournals:(userId) => {
    return new Promise(async (resolve, reject) => {
      try {
        // Fetch notifications based on userId (converted to ObjectId)
        const jrn = await db.get()
          .collection(collections.JOURNAL_COLLECTION)
          .find({ userId: userId }) // Filter by logged-in userId
          .toArray();

        resolve(jrn);
      } catch (error) {
        reject(error);
      }
    });
  },
  addJournal:(data,id,name)=>{
    return new Promise(async (resolve, reject) => {
      data.userId=id;
      data.username=name;
      data.createdAt= new Date(); 

      try {
        await db.get()
          .collection(collections.JOURNAL_COLLECTION)
          .insertOne(data);
        resolve(); // Resolve the promise on success
      } catch (error) {
        reject(error); // Reject the promise on error
      }
    });

  },
 

  getnotificationById: (userId) => {
    return new Promise(async (resolve, reject) => {
      try {
        // Fetch notifications based on userId (converted to ObjectId)
        const notifications = await db.get()
          .collection(collections.NOTIFICATIONS_COLLECTION)
          .find({ userId: ObjectId(userId) }) // Filter by logged-in userId
          .toArray();

        resolve(notifications);
      } catch (error) {
        reject(error);
      }
    });
  },
  getPublishedArticles: async () => {
    return await db.get().collection(collections.ARTICLES_COLLECTION).find({ 
      published:true}).toArray();
},
 checkAvailability:async function( secId, selecteddate,selectedtime) {
 
  const existingBooking =  await db
  .get()
  .collection(collections.ORDER_COLLECTION).findOne({
      "session._id": objectId( secId),
      "deliveryDetails.selecteddate": selecteddate,
      "deliveryDetails.time": selectedtime

  });
  // console.log("jjj-",existingBooking, selecteddate,selectedtime,"jjjjj")
  return !existingBooking; // Returns true if no matching order is found
},


  registration: (registrationData, callback) => {
    // Add createdAt field with the current timestamp
    if (registrationData.userId) {
      registrationData.userId = new ObjectId(registrationData.userId);
    }

    console.log(registrationData);
    db.get()
      .collection(collections.REGISTRATION)
      .insertOne(registrationData)
      .then((data) => {
        console.log(data);
        callback(data.ops[0]._id); // For MongoDB driver < v4.0
      })
      .catch((err) => {
        console.error('Error inserting room:', err);
      });
  },



  addFeedback: (feedback) => {
    return new Promise(async (resolve, reject) => {
      try {
        await db.get()
          .collection(collections.FEEDBACK_COLLECTION)
          .insertOne(feedback);
        resolve(); // Resolve the promise on success
      } catch (error) {
        reject(error); // Reject the promise on error
      }
    });
  },




  getFeedbackBySessionId: (sessionId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const feedbacks = await db.get()
          .collection(collections.FEEDBACK_COLLECTION)
          .find({ sessionId: ObjectId(sessionId) }) // Convert sessionId to ObjectId
          .toArray();

        resolve(feedbacks);
      } catch (error) {
        reject(error);
      }
    });
  },


  getBuilderById: (psychiatristId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const builder = await db.get()
          .collection(collections.BUILDER_COLLECTION)
          .findOne({ _id: ObjectId(psychiatristId) });
        resolve(builder);
      } catch (error) {
        reject(error);
      }
    });
  },





  getAllSessions: () => {
    return new Promise(async (resolve, reject) => {
      let sessions = await db
        .get()
        .collection(collections.SESSION_COLLECTION)
        .find()
        .toArray();
      resolve(sessions);
    });
  },


  ///////GET ALL session/////////////////////     

  getAllpsychiatrists: () => {
    return new Promise(async (resolve, reject) => {
      let psychiatrists = await db
        .get()
        .collection(collections.PSYCHIATRIST_COLLECTION)
        .find()
        .toArray();
      resolve(psychiatrists);
    });
  },

  getSessionById: (sessionId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const session = await db.get()
          .collection(collections.SESSION_COLLECTION)
          .findOne({ _id: ObjectId(sessionId) }); // Convert sessionId to ObjectId
        resolve(session);
      } catch (error) {
        reject(error);
      }
    });
  },

  // getAllsessions: (psychiatristId) => {
  //   return new Promise(async (resolve, reject) => {
  //     let sessions = await db
  //       .get()
  //       .collection(collections.SESSION_COLLECTION)
  //       .find({ psychiatristId: objectId(psychiatristId) }) // Filter by psychiatristId
  //       .toArray();
  //     resolve(sessions);
  //   });
  // },

  /////// session DETAILS/////////////////////                                            
  getsessionDetails: (sessionId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.SESSION_COLLECTION)
        .findOne({
          _id: objectId(sessionId)
        })
        .then((response) => {
          resolve(response);
        });
    });
  },

  getAllProducts: () => {
    return new Promise(async (resolve, reject) => {
      let products = await db
        .get()
        .collection(collections.PRODUCTS_COLLECTION)
        .find()
        .toArray();
      resolve(products);
    });
  },

  doSignup: (userData) => {
    return new Promise(async (resolve, reject) => {
      try {
        // Hash the password
        userData.Password = await bcrypt.hash(userData.Password, 10);

        // Set default values
        userData.isDisable = false;  // User is not disabled by default
        userData.createdAt = new Date();  // Set createdAt to the current date and time

        // Insert the user into the database
        db.get()
          .collection(collections.USERS_COLLECTION)
          .insertOne(userData)
          .then((data) => {
            // Resolve with the inserted user data
            resolve(data.ops[0]);
          })
          .catch((err) => {
            // Reject with any error during insertion
            reject(err);
          });
      } catch (err) {
        reject(err);  // Reject in case of any error during password hashing
      }
    });
  },

  doSignin: (userData) => {
    return new Promise(async (resolve, reject) => {
      let response = {};

      // Find user by email
      let user = await db
        .get()
        .collection(collections.USERS_COLLECTION)
        .findOne({ Email: userData.Email });

      // If user exists, check if the account is disabled
      if (user) {
        if (user.isDisable) {
          // If the account is disabled, return the msg from the user collection
          response.status = false;
          response.msg = user.msg || "Your account has been disabled.";
          return resolve(response);
        }

        // Compare passwords
        bcrypt.compare(userData.Password, user.Password).then((status) => {
          if (status) {
            console.log("Login Success");
            response.user = user;
            response.status = true;
            resolve(response);  // Successful login
          } else {
            console.log("Login Failed");
            resolve({ status: false });  // Invalid password
          }
        });
      } else {
        console.log("Login Failed");
        resolve({ status: false });  // User not found
      }
    });
  },

  getUserDetails: (userId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.USERS_COLLECTION)
        .findOne({ _id: objectId(userId) })
        .then((user) => {
          resolve(user);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },

  updateUserProfile: (userId, userDetails) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.USERS_COLLECTION)
        .updateOne(
          { _id: objectId(userId) },
          {
            $set: {
              Fname: userDetails.Fname,
              Lname: userDetails.Lname,
              Email: userDetails.Email,
              Phone: userDetails.Phone,
              Address: userDetails.Address,
              District: userDetails.District,
              Pincode: userDetails.Pincode,
            },
          }
        )
        .then((response) => {
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
  },


  getTotalAmount: (userId) => {
    return new Promise(async (resolve, reject) => {
      let total = await db
        .get()
        .collection(collections.CART_COLLECTION)
        .aggregate([
          {
            $match: { user: objectId(userId) },
          },
          {
            $unwind: "$products",
          },
          {
            $project: {
              item: "$products.item",
              quantity: "$products.quantity",
            },
          },
          {
            $lookup: {
              from: collections.PRODUCTS_COLLECTION,
              localField: "item",
              foreignField: "_id",
              as: "product",
            },
          },
          {
            $project: {
              item: 1,
              quantity: 1,
              product: { $arrayElemAt: ["$product", 0] },
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: { $multiply: ["$quantity", "$product.Price"] } },
            },
          },
        ])
        .toArray();
      console.log(total[0].total);
      resolve(total[0].total);
    });
  },




  getSessionDetails: (sessionId) => {
    return new Promise((resolve, reject) => {
      if (!ObjectId.isValid(sessionId)) {
        reject(new Error('Invalid session ID format'));
        return;
      }

      db.get()
        .collection(collections.SESSION_COLLECTION)
        .findOne({ _id: ObjectId(sessionId) })
        .then((session) => {
          if (!session) {
            reject(new Error('Session not found'));
          } else {
            // Assuming the session has a psychiatristId field
            resolve(session);
          }
        })
        .catch((err) => {
          reject(err);
        });
    });
  },




  placeOrder: (order, session, total, user) => {
    return new Promise(async (resolve, reject) => {
      try {
        console.log(order, session, total);
        let status = order["payment-method"] === "COD" ? "placed" : "pending";

        // Get the session document to check the current seat value
        // const sessionDoc = await db.get()
        //   .collection(collections.SESSION_COLLECTION)
        //   .findOne({ _id: objectId(session._id) });

        // Check if the session exists and the seat field is present
        // if (!sessionDoc || !sessionDoc.seat) {
        //   return reject(new Error("Session not found or seat field is missing."));
        // }

        // Convert seat from string to number and check availability
        // let seatCount = Number(sessionDoc.seat);
        // if (isNaN(seatCount) || seatCount <= 0) {
        //   return reject(new Error("Seat is not available."));
        // }

        // Create the order object
        let orderObject = {
          deliveryDetails: {
            Fname: order.Fname,
            Lname: order.Lname,
            Email: order.Email,
            Phone: order.Phone,
            Address: order.Address,
            District: order.District,
            State: order.State,
            Pincode: order.Pincode,
            selecteddate: order.selecteddate,
            time:order.time
          },
          userId: objectId(order.userId),
          user: user,
          paymentMethod: order["payment-method"],
          session: session,
          totalAmount: total,
          status: status,//placed
          date: new Date(),
          psychiatristId: session.psychiatristId, // Store the builder's ID
        };

        // Insert the order into the database
        const response = await db.get()
          .collection(collections.ORDER_COLLECTION)
          .insertOne(orderObject);

        // Decrement the seat count
        // seatCount -= 1; // Decrement the seat count

        // Convert back to string and update the session seat count
        // await db.get()
        //   .collection(collections.SESSION_COLLECTION)
        //   .updateOne(
        //     { _id: objectId(session._id) },
        //     { $set: { seat: seatCount.toString() } } // Convert number back to string
        //   );

        resolve(response.ops[0]._id);
      } catch (error) {
        console.error("Error placing order:", error);
        reject(error);
      }
    });
  },


  getUserOrder: (userId) => {
    return new Promise(async (resolve, reject) => {
      try {
        let orders = await db
          .get()
          .collection(collections.ORDER_COLLECTION)
          .find({ userId: ObjectId(userId) }) // Use 'userId' directly, not inside 'orderObject'
          .toArray();

        resolve(orders);
      } catch (error) {
        reject(error);
      }
    });
  },

  getOrderSessions: (orderId) => {
    return new Promise(async (resolve, reject) => {
      try {
        let sessions = await db
          .get()
          .collection(collections.ORDER_COLLECTION)
          .aggregate([
            {
              $match: { _id: objectId(orderId) }, // Match the order by its ID
            },
            {
              $project: {
                // Include session, user, and other relevant fields
                session: 1,
                user: 1,
                paymentMethod: 1,
                totalAmount: 1,
                status: 1,
                date: 1,
                deliveryDetails: 1, // Add deliveryDetails to the projection

              },
            },
          ])
          .toArray();

        resolve(sessions[0]); // Fetch the first (and likely only) order matching this ID
      } catch (error) {
        reject(error);
      }
    });
  },

  generateRazorpay: (orderId, totalPrice) => {
    return new Promise((resolve, reject) => {
      var options = {
        amount: totalPrice * 100, // amount in the smallest currency unit
        currency: "INR",
        receipt: "" + orderId,
      };
      instance.orders.create(options, function (err, order) {
        console.log("New Order : ", order);
        resolve(order);
      });
    });
  },


  getOrderDetails: (orderId) => {
    return new Promise(async (resolve, reject) => {
      try {
        let order = await db
          .get()
          .collection(collections.ORDER_COLLECTION)
          .findOne(
            { _id: objectId(orderId) },
            { projection: { user: 1, session: 1, deliveryDetails: 1, totalAmount: 1, paymentMethod: 1, status: 1, review: 1 } } // Select only needed fields
          );

        if (order) {
          resolve(order); // Return the full order details
        } else {
          resolve(null);
        }
      } catch (error) {
        reject(error);
      }
    });
  },

  verifyPayment: (details) => {
    return new Promise((resolve, reject) => {
      const crypto = require("crypto");
      let hmac = crypto.createHmac("sha256", "xPzG53EXxT8PKr34qT7CTFm9");

      hmac.update(
        details["payment[razorpay_order_id]"] +
        "|" +
        details["payment[razorpay_payment_id]"]
      );
      hmac = hmac.digest("hex");

      if (hmac == details["payment[razorpay_signature]"]) {
        resolve();
      } else {
        reject();
      }
    });
  },

  changePaymentStatus: (orderId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.ORDER_COLLECTION)
        .updateOne(
          { _id: objectId(orderId) },
          {
            $set: {
              "orderObject.status": "placed",
            },
          }
        )
        .then(() => {
          resolve();
        });
    });
  },

  cancelOrder: (orderId) => {
    return new Promise(async (resolve, reject) => {
      db.get()
        .collection(collections.ORDER_COLLECTION)
        .removeOne({ _id: objectId(orderId) })
        .then(() => {
          resolve();
        });
    });
  },

  searchProduct: (details) => {
    console.log(details);
    return new Promise(async (resolve, reject) => {
      db.get()
        .collection(collections.PRODUCTS_COLLECTION)
        .createIndex({ Name: "text" }).then(async () => {
          let result = await db
            .get()
            .collection(collections.PRODUCTS_COLLECTION)
            .find({
              $text: {
                $search: details.search,
              },
            })
            .toArray();
          resolve(result);
        })

    });
  },
  getUserAssessment:(userId)=>{
    return new Promise(async (resolve, reject) => {
      try {
       let result= db.get()
        .collection(collections.ASSESSMENT_COLLECTION)
        .find({userId:objectId(userId)})
        .toArray()
          
        resolve(result)

      }catch (error) {
        reject(error);
      }
    })

  },
  setAnswer:async (Id,answerObj)=>{
    console.log("answerObjanswerObj-",answerObj,"-answerObjanswerObj")
    let answers = [];
    Object.keys(answerObj).forEach(key => {
      // Use regex to extract the numeric index from keys like "answers[0]"
      const match = key.match(/^answers\[(\d+)\]$/);
      if (match) {
        const idx = parseInt(match[1], 10);
        answers[idx] = answerObj[key];
      }
    });
    try {
      const result = await db.get()
      .collection(collections.ASSESSMENT_COLLECTION)
      .updateOne(
        { _id: ObjectId(Id) },
        { $set: { answers: answers ,
          isAnswered:true} }
      );
    return result;
        }catch (err) {
          console.error("Error saving assessment:", err);
          throw err;
        }

  },
    getAssessmentsId: async(Id)=> {
  
      try {
        const result = await db.get().collection(collections.ASSESSMENT_COLLECTION).findOne({_id:objectId(Id)      });
        return result;
      } catch (err) {
        console.error("Error saving assessment:", err);
        throw err;
      }
    },


  getUserSessions: (userId) => {
    return new Promise(async (resolve, reject) => {
      try {
        let sessions = await db.get()
          .collection(collections.ORDER_COLLECTION)
          .aggregate([
            {
              $match: { userId: ObjectId(userId) }
            },
            {
              $lookup: {
                from: collections.PSYCHIATRIST_COLLECTION,
                localField: "psychiatristId",
                foreignField: "_id",
                as: "psychiatristDetails"
              }
            },
            {
              $unwind: {
                path: "$psychiatristDetails",
                preserveNullAndEmptyArrays: true
              }
            },
            {
              $project: {
                _id: 1,
                "session.date": 1,
                "session.doctor": 1,
                "session.wname": 1,
                "session.Price": 1,
                "session.format": 1,
                "session.baddress": 1,
                "session.desc": 1,
                "session.amenities": 1,
                "session.psychiatristId": 1,
                "psychiatristDetails.Name": 1,
                "deliveryDetails.selecteddate":1,
                "deliveryDetails.time":1,
                "status": 1,
                "review": 1,
                totalAmount: 1,
                status: 1,
                date: 1
              }
            }
          ])
          .toArray();
        resolve(sessions);
      } catch (error) {
        reject(error);
      }
    });
  },

};
