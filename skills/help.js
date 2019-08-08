const store = require('../store/store');

module.exports = function(controller) {
    controller.on('direct_message, message', function(bot, message){
        if(!store.get(message.user)) {
            console.log("User not found in local storage.");
            return ;
        }
        if(message.intent === "help_intent"){
            bot.createConversation(message, function(err, convo){
                convo.say({
                    text : "You can add an additional idea by typing 'ideabolt' (one idea) or 'ideastorm' (many ideas) or develop one of your ideas further by typing 'deepdive'."
                })
                convo.activate();
            })
        }
    })
}