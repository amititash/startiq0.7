const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const TeamSchema = new Schema({
    id : { type : String },
    createdBy : { type : String },
    url : { type : String },
    name : { type : String },
    bot : {
        token : { type : String },
        user_id : { type : String },
        createdBy : { type : String },
        app_token : { type : String },
        name : { type : String },
    }
})


module.exports = mongoose.model("Team", TeamSchema);
