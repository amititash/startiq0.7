const store = require('../store/store');

module.exports = function(controller) {
    controller.on('direct_message, direct_mention', function(bot, message) {


        if(message.text === 'Hi'|| message.text === 'hi' || message.text === "hello" || message.text === "Hello" || message.text === "Hey" || message.text === "hey" ){
            if(!store.get(message.user)) {
                console.log("User not found in the local storage.");
                return ;
            }

            bot.createConversation(message, function(err, convo) {
                convo.addMessage({
                    text : "Hi ! I am the StartIQ bot. You can say 'ideastorm' , 'deepdive', or 'rank ideas' "
                })
                convo.activate();
            })



        }
    })
}