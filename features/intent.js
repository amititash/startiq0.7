const dialogflowMiddleware = require('../utils/dialogflow');


module.exports = function(controller) {
    controller.on('direct_message, message', async(bot, message) => {
        if(message.intent === "default_welcome_intent") {
            console.log("exec");
            await bot.say("Welcome intent!");   
        }
    })
}