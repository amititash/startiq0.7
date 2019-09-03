const store = require('../store/store');
const logger = require('../utils/logger');

module.exports = function(controller) {
    controller.on('direct_message, message' , function(bot, message){
        if(!store.get(message.user)) {
            console.log("User not found in local storage.");
            return ;
        }
        if(message.intent === "menu_intent") {
            bot.createConversation(message, function(err, convo) {


                logger.log({
                    level : "info",
                    message : message.text,
                    metadata : {
                        convo : true,
                        userId : store.get(message.user)
                    }
                });
                
                convo.say({
                    text : "You can add additional ideas by typing 'ideastorm' or develop one of your ideas further by typing 'deepdive'."
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