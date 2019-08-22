const logger = require('../utils/logger');
const axios = require('axios');

module.exports = function(controller){
    controller.middleware.receive.use( async function(bot, message, next){

        //checks the log to see if bot is in some convo
        let logData = [];
        try {
            logData = await axios.get(`${process.env.LOGGER_API_URL}/convoLog`);
            logData = logData.data;
        }
        catch(e){
            console.log("error in logger api", e);
        }



        if(logData.length && logData[0]["meta"]["convo"]){
            // if bot is in convo, all the interrupts are rendered inactive
            console.log("bot inside some convo");
            next();
        }
        else {
            //code reaches here only if bot not in convo.
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
        }
    })

    controller.middleware.receive.use( function(bot, message, next){
        logger.log({
            level : "info",
            message : message.text,
            metadata : {
                nature : "received_message",
                userId : message.user
            }
        })
        next();
    })


    controller.middleware.send.use(function(bot, message, next) {
        logger.log({
            level : "info",
            message : message.text,
            metadata : {
                nature : "sent_message",
                userId : message.to
            }
        })

        next();
    });
    

}