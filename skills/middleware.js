const fs = require('fs');
const logger = require('../utils/logger');

module.exports = function(controller){
    controller.middleware.receive.use( function(bot, message, next){
        const interrupt_intents = ["default_welcome_intent"];
        if(interrupt_intents.includes(message.intent) ){
            let custom_event = "";
            switch(message.intent){
                case "help_intent" :
                    custom_event = "custom_help_event";
                    break;
                case "default_welcome_intent":
                    custom_event = "custom_greet_event";
                    break;
                default:
                    custom_event = "direct_message"
            }

            controller.trigger(custom_event, [bot, message.event]);
        }

        else{
            next();
        }
    })

    controller.middleware.receive.use( function(bot, message, next){
        console.log(message);
        logger.info(message.text,{
            nature : "received_message",
            userId : message.user
        });
        next();
    })


    controller.middleware.send.use(function(bot, message, next) {
        logger.info(message.text, {
            nature : "sent_message",
            userId : message.to
        })
        next();
    });
    

}