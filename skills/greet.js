const store = require('../store/store');

module.exports = function(controller){
    // controller.on('direct_message,message', function(bot, message){
    //     if(!store.get(message.user)) {
    //         console.log("User not found in local storage.");
    //         return ;
    //     }

    //     if(message.intent === "default_welcome_intent") {
    //         bot.createConversation(message, function(err, convo){
    //             convo.say({
    //                 text : "Hi there!  Welcome to StartiQ. I am a science-backed assistant to help you develop and research your business ideas super fast."
    //             })
    //             convo.say({
    //                 text : "You can add additional ideas by typing 'ideastorm' or develop one of your ideas further by typing 'deepdive'."
    //             })
    //             convo.activate();
    //         })
    //     }
    // })
}