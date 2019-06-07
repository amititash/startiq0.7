const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const UserSchema = new Schema({
    idea : { type : String },
    id : { type : String}
})


module.exports = mongoose.model("User", UserSchema);
