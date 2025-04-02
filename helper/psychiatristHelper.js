var db = require("../config/connection");
var collections = require("../config/collections");
var bcrypt = require("bcrypt");
const objectId = require("mongodb").ObjectID;

module.exports = {


  getPsychiatristDetails: (psychiatristId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.PSYCHIATRIST_COLLECTION)
        .findOne({ _id: objectId(psychiatristId) })
        .then((psychiatrist) => {
          resolve(psychiatrist);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  getAllUserwithJournal: async () => {
    try {
      const usersWithJournals = await db.get()
        .collection(collections.JOURNAL_COLLECTION)
        .aggregate([
          {
            $group: {
              _id: "$userId", // Group by userId
              username: { $first: "$username" } // Pick first username
            }
          },
          {
            $project: {
              _id: 0, 
              userId: "$_id", // Rename _id to userId
              username: 1
            }
          }
        ])
        .toArray();
  
      return usersWithJournals;
    } catch (error) {
      console.error("Error fetching users with journals:", error);
      throw error;
    }
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
  
  getAllPatients:(Id)=>{
    return new Promise(async (resolve, reject) => {
      let users = await db
        .get()
        .collection(collections.USERS_COLLECTION)
        .find() // Filter by psychiatristId
        .toArray();
      resolve(users);
    });

  },


  updatePsychiatristProfile: (psychiatristId, psychiatristDetails) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.PSYCHIATRIST_COLLECTION)
        .updateOne(
          { _id: objectId(psychiatristId) },
          {
            $set: {
              Name: psychiatristDetails.Name,
              Email: psychiatristDetails.Email,
              Phone: psychiatristDetails.Phone,
              Address: psychiatristDetails.Address,
              District: psychiatristDetails.District,
              Pincode: psychiatristDetails.Pincode,

              Specialisation: psychiatristDetails.Specialisation,
              Experience: psychiatristDetails.Experience,
              Qualication: psychiatristDetails.Qualication,

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
    getAllUsers: () => {
      return new Promise(async (resolve, reject) => {
        try {
          const users = await db
            .get()
            .collection(collections.USERS_COLLECTION)
            .find()
            .sort({ createdAt: -1 })  // Sort by createdAt in descending order
            .toArray();
  
          resolve(users);
        } catch (err) {
          reject(err);  // Handle any error during fetching
        }
      });
    },

  //assessment
  saveAssessment: async (data,psychiatristId,user)=> {
    data.createdAt = new Date();
    data.psychiatristId= objectId(psychiatristId);
    data.userId=user.userId;
    data.isAnswered=false;
    try {
      const upt= await db.get().collection(collections.ORDER_COLLECTION).updateOne(
        { _id: objectId(data.orderId) },
          {
            $set: {
              isAssesment:true
            },
          }
      );
      const result = await db.get().collection(collections.ASSESSMENT_COLLECTION).insertOne(data);
      // Attach the insertedId to the data object
      data._id = result.insertedId;
      return data;
    } catch (err) {
      console.error("Error saving assessment:", err);
      throw err;
    }
  },
  getUserIdByOrderId:async (id)=>{
    const result = await db.get().collection(collections.ORDER_COLLECTION).findOne({_id:objectId(id)     });
    return result;
  },
  getAssessmentsOrder:async(orderId)=>{
    try {
      const result = await db.get().collection(collections.ASSESSMENT_COLLECTION).findOne({orderId:orderId    });
      return result;
    } catch (err) {
      console.error("showrrrrr:", err);
      throw err;
    }

  },
  getAssessments: async (Id)=> {
   
    try {
      const result = await db.get().collection(collections.ASSESSMENT_COLLECTION).findOne({_id:objectId(Id)      });
      return result;
    } catch (err) {
      console.error("Error saving assessment:", err);
      throw err;
    }
  },
  getResult:async( Id)=>{
    try {
      const result = await db.get()
        .collection(collections.ASSESSMENT_COLLECTION)
        .findOne({ _id: objectId(Id) });
        
      if (result && result.questions && Array.isArray(result.questions)) {
        result.questions.forEach((question, index) => {
          // Check if there's an answer for this question.
          if (result.answers && result.answers[index] !== undefined) {
            const answerIndex = parseInt(result.answers[index], 10);
            // Ensure that the options array exists and the answer index is valid.
            if (Array.isArray(question.options) && question.options[answerIndex] !== undefined) {
              question.userAnswer = question.options[answerIndex];
            } else {
              question.userAnswer = "No answer provided";
            }
          } else {
            question.userAnswer = "No answer provided";
          }
        });
      }
      return result;
    } catch (err) {
      console.error("Error retrieving assessment:", err);
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
  getAllAnsweredAssesement: async (Id) => {
    try {
      const result = await db.get().collection(collections.ASSESSMENT_COLLECTION).aggregate([
        {
          $match: {
            psychiatristId: objectId(Id),
            isAnswered: true
          }
        },
        {
          $lookup: {
            from: collections.USERS_COLLECTION, // Replace with your actual user collection name
            localField: "userId",
            foreignField: "_id",
            as: "userDetails"
          }
        },
        {
          $unwind: "$userDetails" // Convert array to object
        },
        {
          $project: {
            _id: 1,
            assessmentTitle: 1,
            questions: 1,
            answers: 1,
            orderId: 1,
            createdAt: 1,
            psychiatristId: 1,
            userId: 1,
            "userDetails.Fname": 1,
            "userDetails.Lname": 1,
            "userDetails.Email": 1,
            "userDetails.Phone": 1
          }
        }
      ]).toArray();
   console.log(result)
      return result;
    } catch (err) {
      console.error("Error fetching answered assessments:", err);
      throw err;
    }
  },  
  updateAssessment:async (id, updatedData)=> {
    try {
      
      const collection =  db.get().collection(collections.ASSESSMENT_COLLECTION)
      // Update the document with new data.
      const result = await collection.updateOne(
        { _id: ObjectId(id) },
        { $set: updatedData }
      );
      return result;
    } catch (err) {
      console.error("Error updating assessment:", err);
      throw err;
    }
  },

  ///////ADD notification/////////////////////                                         
  addnotification: (notification, callback) => {
    // Convert psychiatristId and userId to ObjectId if they are provided in the notification
    if (notification.psychiatristId) {
      notification.psychiatristId = objectId(notification.psychiatristId); // Convert psychiatristId to objectId
    }

    if (notification.userId) {
      notification.userId = objectId(notification.userId); // Convert userId to ObjectId
    }

    notification.createdAt = new Date(); // Set createdAt as the current date and time

    console.log(notification);  // Log notification to check the changes

    db.get()
      .collection(collections.NOTIFICATIONS_COLLECTION)
      .insertOne(notification)
      .then((data) => {
        console.log(data);  // Log the inserted data for debugging
        callback(data.ops[0]._id);  // Return the _id of the inserted notification
      })
      .catch((err) => {
        console.error("Error inserting notification:", err);
        callback(null, err);  // Pass error back to callback
      });
  },

  ///////GET ALL notification/////////////////////   

  getAllnotifications: (psychiatristId) => {
    return new Promise(async (resolve, reject) => {
      try {
        // Fetch notifications by psychiatristId and populate user details
        let notifications = await db
          .get()
          .collection(collections.NOTIFICATIONS_COLLECTION)
          .aggregate([
            // Match notifications by psychiatristId
            {
              $match: { "psychiatristId": objectId(psychiatristId) }
            },
            // Lookup user details based on userId
            {
              $lookup: {
                from: collections.USERS_COLLECTION, // Assuming your users collection is named 'USERS_COLLECTION'
                localField: "userId", // Field in notifications collection
                foreignField: "_id", // Field in users collection
                as: "userDetails" // Name of the array where the user details will be stored
              }
            },
            // Unwind the userDetails array to get a single document (since $lookup returns an array)
            {
              $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true }
            }
          ])
          .toArray();

          notifications = notifications.map(notification => ({
            ...notification,
            userFname: notification.userDetails ? notification.userDetails.Fname : 'Unknown',  // Fname of user or 'Unknown' if no user found
          }));
 console.log("nott",notifications,"^^^")  

        resolve(notifications);
      } catch (error) {
        reject(error);
      }
    });
  },

  getAllUsersFromOrders: async (psychiatristId) => {
    try {
        let users = await db
            .get()
            .collection(collections.ORDER_COLLECTION)
            .aggregate([
                {
                    $match: { psychiatristId: objectId(psychiatristId) } // Filter by psychiatrist ID
                },
                {
                    $group: {
                        _id: "$userId",  // Group by userId
                        userId: { $first: "$userId" },  // Keep userId
                        user: { $first: "$user" }  // Keep first user details
                    }
                }
            ])
            .toArray();
        
        return users;
    } catch (error) {
        console.error("Error fetching users from orders:", error);
        throw error;
    }
},



  ///////ADD notification DETAILS/////////////////////                                            
  getnotificationDetails: (notificationId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.NOTIFICATION_COLLECTION)
        .findOne({
          _id: objectId(notificationId)
        })
        .then((response) => {
          resolve(response);
        });
    });
  },

  ///////DELETE notification/////////////////////                                            
  deletenotification: (notificationId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.NOTIFICATION_COLLECTION)
        .removeOne({
          _id: objectId(notificationId)
        })
        .then((response) => {
          console.log(response);
          resolve(response);
        });
    });
  },

  ///////UPDATE notification/////////////////////                                            
  updatenotification: (notificationId, notificationDetails) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.NOTIFICATIONS_COLLECTION)
        .updateOne(
          {
            _id: objectId(notificationId)
          },
          {
            $set: {
              Name: notificationDetails.Name,
              Category: notificationDetails.Category,
              Price: notificationDetails.Price,
              Description: notificationDetails.Description,
            },
          }
        )
        .then((response) => {
          resolve();
        });
    });
  },


  ///////DELETE ALL notification/////////////////////                                            
  deleteAllnotifications: () => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.NOTIFICATION_COLLECTION)
        .remove({})
        .then(() => {
          resolve();
        });
    });
  },

  getAllFeedbacks: async (staffId) => {
    console.log(staffId)
    return  await db.get().collection(collections.FEEDBACK_COLLECTION).aggregate([
      {
          $lookup: {
              from: collections.USERS_COLLECTION,
              localField: "userId", //feed
              foreignField: "_id",
              as: "user"
          }
      },
      { $unwind: "$user" },
      {
          $match: { "psychiatristId": objectId(staffId) }
      },
      {
          $project: {
              _id: 1,
              orderId: 1,
              "user.Fname":1,
              "user.Lname":1,
              userId: 1,
              feedbackText: 1,
              sessionName: 1,
              createdAt: 1
          }
      }
  ]).toArray();

}, 

  getFeedbackByPsychiatristId: (psychiatristId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const feedbacks = await db.get()
          .collection(collections.FEEDBACK_COLLECTION)
          .find({ psychiatristId: objectId(psychiatristId) }) // Convert psychiatristId to ObjectId
          .toArray();
        resolve(feedbacks);
      } catch (error) {
        reject(error);
      }
    });
  },

  ///////ADD session/////////////////////                                         
  addsession: (session, psychiatristId, callback) => {
    if (!psychiatristId || !objectId.isValid(psychiatristId)) {
      return callback(null, new Error("Invalid or missing psychiatristId"));
    }

    session.Price = parseInt(session.Price);
    session.psychiatristId = objectId(psychiatristId); // Associate session with the psychiatrist

    db.get()
      .collection(collections.SESSION_COLLECTION)
      .insertOne(session)
      .then((data) => {
        callback(data.ops[0]._id); // Return the inserted session ID
      })
      .catch((error) => {
        callback(null, error);
      });
  },


  ///////GET ALL session/////////////////////                                            
  getAllsessions: (psychiatristId) => {
    return new Promise(async (resolve, reject) => {
      let sessions = await db
        .get()
        .collection(collections.SESSION_COLLECTION)
        .find({ psychiatristId: objectId(psychiatristId) }) // Filter by psychiatristId
        .toArray();
      resolve(sessions);
    });
  },
  getAllGroupsessions: (psychiatristId) => {
    return new Promise(async (resolve, reject) => {
      let sessions = await db
        .get()
        .collection(collections.GROUPSESSION_COLLECTION)
        .find({  }) // Filter by psychiatristId
        .toArray();
      resolve(sessions);
    });
  },

  ///////ADD session DETAILS/////////////////////                                            
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

  ///////DELETE session/////////////////////                                            
  deletesession: (sessionId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.SESSION_COLLECTION)
        .removeOne({
          _id: objectId(sessionId)
        })
        .then((response) => {
          console.log(response);
          resolve(response);
        });
    });
  },

  ///////UPDATE session/////////////////////                                            
  updatesession: (sessionId, sessionDetails) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.SESSION_COLLECTION)
        .updateOne(
          {
            _id: objectId(sessionId)
          },
          {
            $set: {
              wname: sessionDetails.wname,
              seat: sessionDetails.seat,
              Price: sessionDetails.Price,
              format: sessionDetails.format,
              desc: sessionDetails.desc,
              baddress: sessionDetails.baddress,

            },
          }
        )
        .then((response) => {
          resolve();
        });
    });
  },


  ///////DELETE ALL session/////////////////////                                            
  deleteAllsessions: () => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.SESSION_COLLECTION)
        .remove({})
        .then(() => {
          resolve();
        });
    });
  },


  addProduct: (product, callback) => {
    console.log(product);
    product.Price = parseInt(product.Price);
    db.get()
      .collection(collections.PRODUCTS_COLLECTION)
      .insertOne(product)
      .then((data) => {
        console.log(data);
        callback(data.ops[0]._id);
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

  dosignup: (psychiatristData) => {
    return new Promise(async (resolve, reject) => {
      try {
        psychiatristData.Password = await bcrypt.hash(psychiatristData.Password, 10);
        psychiatristData.approved = false; // Set approved to false initially
        const data = await db.get().collection(collections.PSYCHIATRIST_COLLECTION).insertOne(psychiatristData);
        resolve(data.ops[0]);
      } catch (error) {
        reject(error);
      }
    });
  },


  doSignin: (psychiatristData) => {
    return new Promise(async (resolve, reject) => {
      let response = {};
      let psychiatrist = await db
        .get()
        .collection(collections.PSYCHIATRIST_COLLECTION)
        .findOne({ Email: psychiatristData.Email });
      if (psychiatrist) {
        if (psychiatrist.rejected) {
          console.log("User is rejected");
          resolve({ status: "rejected" });
        } else {
          bcrypt.compare(psychiatristData.Password, psychiatrist.Password).then((status) => {
            if (status) {
              if (psychiatrist.approved) {
                console.log("Login Success");
                response.psychiatrist = psychiatrist;
                response.status = true;
              } else {
                console.log("User not approved");
                response.status = "pending";
              }
              resolve(response);
            } else {
              console.log("Login Failed - Incorrect Password");
              resolve({ status: false });
            }
          });
        }
      } else {
        console.log("Login Failed - Email not found");
        resolve({ status: false });
      }
    });
  },


  getProductDetails: (productId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.PRODUCTS_COLLECTION)
        .findOne({ _id: objectId(productId) })
        .then((response) => {
          resolve(response);
        });
    });
  },

  deleteSession: (Id) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.SESSION_COLLECTION)
        .removeOne({ _id: objectId(Id) })
        .then((response) => {
          console.log(response);
          resolve(response);
        });
    });
  },

  updateProduct: (productId, productDetails) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.PRODUCTS_COLLECTION)
        .updateOne(
          { _id: objectId(productId) },
          {
            $set: {
              Name: productDetails.Name,
              Category: productDetails.Category,
              Price: productDetails.Price,
              Description: productDetails.Description,
            },
          }
        )
        .then((response) => {
          resolve();
        });
    });
  },

  deleteAllProducts: () => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.PRODUCTS_COLLECTION)
        .remove({})
        .then(() => {
          resolve();
        });
    });
  },

  getAllUsers: () => {
    return new Promise(async (resolve, reject) => {
      let users = await db
        .get()
        .collection(collections.USERS_COLLECTION)
        .find()
        .toArray();
      resolve(users);
    });
  },

  removeUser: (userId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.USERS_COLLECTION)
        .removeOne({ _id: objectId(userId) })
        .then(() => {
          resolve();
        });
    });
  },

  removeAllUsers: () => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.USERS_COLLECTION)
        .remove({})
        .then(() => {
          resolve();
        });
    });
  },

  getAllOrders: (psychiatristId) => {
    return new Promise(async (resolve, reject) => {
      try {
        let orders = await db
          .get()
          .collection(collections.ORDER_COLLECTION)
          .find({ "psychiatristId": objectId(psychiatristId) }) // Filter by psychiatrist ID
          .sort({ createdAt: -1 })  // Sort by createdAt in descending order
          .toArray();
        resolve(orders);
      } catch (error) {
        reject(error);
      }
    });
  },

  getOrdersByUserId: (psychiatristId, userId) => {
    return new Promise(async (resolve, reject) => {
      try {
        let orders = await db.get()
          .collection(collections.ORDER_COLLECTION)
          .find({ "psychiatristId": objectId(psychiatristId), "userId": objectId(userId) })
          .toArray();
        resolve(orders);
      } catch (error) {
        reject(error);
      }
    });
  },

  getUserDataByUserId: (userId) => {
    return new Promise(async (resolve, reject) => {
      try {
        let user = await db.get()
          .collection(collections.USERS_COLLECTION)
          .findOne({ "_id": objectId(userId) });
        resolve(user);
      } catch (error) {
        reject(error);
      }
    });
  },

  getDoctorDataByUserId: (userId) => {
    return new Promise(async (resolve, reject) => {
      try {
        let user = await db.get()
          .collection(collections.PSYCHIATRIST_COLLECTION)
          .findOne({ "_id": objectId(userId) });
        resolve(user);
      } catch (error) {
        reject(error);
      }
    });
  },

  changeTime: (time, orderId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.ORDER_COLLECTION)
        .updateOne(
          { _id: objectId(orderId) },
          {
            $set: {
              "status":  "Accepted",
              "deliveryDetails.time": time
            },
          }
        )
        .then(() => {
          resolve();
        });
    });
  },

  changeStatus: (status, orderId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.ORDER_COLLECTION)
        .updateOne(
          { _id: objectId(orderId) },
          {
            $set: {
              "status": status,
            },
          }
        )
        .then(() => {
          resolve();
        });
    });
  },

  cancelOrder: async (orderId) => {
    return new Promise(async (resolve, reject) => {
      try {
        // Fetch the order to get the associated session ID
        const order = await db.get()
          .collection(collections.ORDER_COLLECTION)
          .findOne({ _id: objectId(orderId) });

        if (!order) {
          return reject(new Error("Order not found."));
        }

        const sessionId = order.session._id; // Get the session ID from the order

        // Remove the order from the database
        await db.get()
          .collection(collections.ORDER_COLLECTION)
          .deleteOne({ _id: objectId(orderId) });

          resolve();

        // Get the current seat count from the session
        // const sessionDoc = await db.get()
        //   .collection(collections.SESSION_COLLECTION)
        //   .findOne({ _id: objectId(sessionId) });

        // Check if the seat field exists and is a string

      } catch (error) {
        console.error("Error canceling order:", error);
        reject(error);
      }
    });
  },


  cancelAllOrders: () => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.ORDER_COLLECTION)
        .remove({})
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

  addReview: (orderId, review) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.ORDER_COLLECTION)
        .updateOne(
          { _id: objectId(orderId) },
          { $set: { review: review } }
        )
        .then(() => {
          resolve();
        })
        .catch((error) => {
          reject(error);
        });
    });
  }
};
