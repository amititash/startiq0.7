const store = require('../store/store');

module.exports = function(controller) {
    controller.on('direct_message, message', function(bot, message){
        if(!store.get(message.user)) {
            console.log("User not found in local storage.");
            return ;
        }
        if(message.intent === "thank_intent"){
            bot.createConversation(message, function(err, convo){

                logger.log({
                    level : "info",
                    message : message.text,
                    metadata : {
                        convo : true,
                        userId : store.get(message.user)
                    }
                });


                convo.say({
                    text : "You are welcome."
                })


                convo.on('end', function(convo){
                    logger.log({
                        level : "info",
                        message : message.text,
                        metadata : {
                            convo : false,
                            userId : store.get(message.user)
                        }
                    });
                })

                
                convo.activate();
            })
        }
    })
}