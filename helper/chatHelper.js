const db = require("../config/connection");
const collections = require("../config/collections");
const { ObjectId } = require("mongodb");

module.exports = {
  getAllMessages: async (userId, doctorId, orderId) => {
    try {
      let chatRoom = await db
        .get()
        .collection(collections.CHAT_COLLECTION)
        .findOne({ userId: ObjectId(userId), doctorId: ObjectId(doctorId), orderId: ObjectId(orderId) });

      if (!chatRoom) {
        const result = await db
          .get()
          .collection(collections.CHAT_COLLECTION)
          .insertOne({ userId: ObjectId(userId), doctorId: ObjectId(doctorId), orderId: ObjectId(orderId), messages: [] });
        chatRoom = { _id: result.insertedId, messages: [] };
      }
      return chatRoom;
    } catch (error) {
      throw error;
    }
  },

  sendMessage: async (chatRoomId, message) => {
    try {
      await db
        .get()
        .collection(collections.CHAT_COLLECTION)
        .updateOne(
          { _id: ObjectId(chatRoomId) },
          { $push: { messages: message } }
        );
      return { success: true, message: "Message sent successfully" };
    } catch (error) {
      throw error;
    }
  }
};
