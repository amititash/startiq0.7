
const store = require('../store/store');


module.exports = function(controller) {
    controller.on('direct_message', function(bot, message){
        console.log("triggered");
        if( !store.get(message.user) ){
            bot.createConversation(message, function(err, convo) {
                convo.ask({
                    text : "Hi ! I am the StartIQ bot. Kindly provide your e-mail id for registration purpose."
                },function(res, convo){
                    store.set(message.user, res.text);
                    convo.say({
                        text : "Thanks!"
                    })
                    convo.next();
                })
                convo.activate();
            })
        }
    })
}