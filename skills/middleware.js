module.exports = function(controller){
    controller.middleware.receive.use( function(bot, message, next){

        const interrupt_intents = ["default_welcome_intent"];
        if(interrupt_intents.includes(message.intent)){
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



      

    // controller.middleware.ingest.use( function(bot, message, res, next){
    //     console.log(message.text);
    //     if(message.event.text.length > 250 ){
    //         console.log(message);
    //         console.log("************************************");
    //         controller.trigger('too_long_message_event', [bot, message.event]);
    //     }
    //     else {
    //         next();
    //     }
    //     console.log("woah");   
    //     next();
    // })
}