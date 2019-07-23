module.exports = function(controller) {
    controller.hears(['war'], 'direct_message, interactive_message_callback' , function(bot , message) {
        console.log("XXXXXXXX",(message.type));
    } )
}