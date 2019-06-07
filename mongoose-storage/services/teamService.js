const Team = require('../schema/teamSchema');

let services = {};

services.get = function(id, cb) {
    return Team.findOne({
        id : id
    }).lean().exec(cb);
}

services.save = function(data, cb) {
    return Team.findOneAndUpdate({
        id : data.id
    }, data, {
        upsert : true,
        new : true
    }).lean().exec(cb);
}

services.all = function(cb) {
    return Team.find({}).lean().exec(cb);
}

services.find = function(data, cb, options) {
    return Team.find(data ,null, options).lean().exec(cb);
}

module.exports = services;