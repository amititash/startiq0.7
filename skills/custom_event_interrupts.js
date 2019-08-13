const store = require('../store/store');

module.exports = function(controller) {
    controller.on('custom_help_event', function(bot, message){
        if(!store.get(message.user)) {
            console.log("User not found in local storage.");
            return ;
        }
        bot.createConversation(message, function(err, convo){
            convo.say({
                text : "You can add an additional idea by typing 'ideabolt' (one idea) or 'ideastorm' (many ideas) or develop one of your ideas further by typing 'deepdive'."
            })
            convo.activate();
        })
        
    })


    controller.on('custom_greet_event', function(bot, message){
        if(!store.get(message.user)) {
            console.log("User not found in local storage.");
            return ;
        }
        bot.createConversation(message, function(err, convo){
            convo.say({
                text : "Hi there!  Welcome to StartiQ. I am a science-backed assistant to help you develop and research your business ideas super fast."
            })
            convo.say({
                text : "You can add an additional idea by typing 'ideabolt' (one idea) or 'ideastorm' (many ideas) or develop one of your ideas further by typing 'deepdive'."
            })
            convo.activate();
        })
    })

    controller.on('too_long_message_event', function(bot, message){
        bot.createConversation(message, function(err, convo){
            bot.reply(message, {
                text : "Your idea exceeds the maximum length. Please re-enter."
            })
            convo.activate();
        })
    })



}