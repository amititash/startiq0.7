const store = require('../store/store');

module.exports = function(controller) {
    controller.on('direct_message, message' , function(bot, message){
        if(!store.get(message.user)) {
            console.log("User not found in local storage.");
            return ;
        }
        if(message.intent === "menu_intent") {
            bot.createConversation(message, function(err, convo) {
                convo.say({
                    text : "You can add additional ideas by typing 'ideastorm' or develop one of your ideas further by 'deepdive'."
                })
                convo.activate();
            })
        }
    })
}