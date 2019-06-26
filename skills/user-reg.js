
const store = require('../store/store');


module.exports = function(controller) {
    controller.on('direct_message', function(bot, message){
        console.log("triggered");
        if( !store.get(message.user) ){
            bot.createConversation(message, function(err, convo) {
                convo.ask({
                    text : "Hi ! I am the StartIQ bot. Kindly provide your e-mail id for registration purpose."
                },function(res, convo){
                    let email = res.text;
                    try {
                        email = email.slice(email.indexOf('|')+1).slice(0,-1);
                    }
                    catch(e) {
                        console.log("Error in converting email", e);
                    }
                    store.set(message.user, email);
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