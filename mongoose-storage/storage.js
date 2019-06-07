const mongoose = require('mongoose');

const teamService = require('./services/teamService');
const channelService = require('./services/channelService');
const userService = require('./services/userService');

module.exports = function(config) {
    if (!config || !config.mongoUri) {
        throw new Error('Need to provide mongo address.');
    }

    mongoose.connect(config.mongoUri, { useNewUrlParser : true });

    var storage = {
        teams : teamService,
        channels : channelService,
        users : userService
    };


    console.log(storage);
    return storage;

}