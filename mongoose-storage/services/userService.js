const User = require('../schema/userSchema');

let services = {};

services.get = function(id, cb) {
    return User.findOne({
        id : id
    }).lean().exec(cb);
}

services.save = function(data, cb) {
    return User.findOneAndUpdate({
        id : data.id
    }, data, {
        upsert : true,
        new : true
    }).lean().exec(cb);
}

services.all = function(cb) {
    return User.find({}).lean().exec(cb);
}

services.find = function(data, cb, options) {
    return User.find(data ,null, options).lean().exec(cb);
}

module.exports = services;