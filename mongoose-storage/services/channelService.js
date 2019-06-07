const Channel = require('../schema/channelSchema');

let services = {};

services.get = function(id, cb) {
    return Channel.findOne({
        id : id
    }).lean().exec(cb);
}

services.save = function(data, cb) {
    return Channel.findOneAndUpdate({
        id : data.id
    }, data, {
        upsert : true,
        new : true
    }).lean().exec(cb);
}

services.all = function(cb) {
    return Channel.find({}).lean().exec(cb);
}

services.find = function(data, cb, options) {
    return Channel.find(data ,null, options).lean().exec(cb);
}

module.exports = services;