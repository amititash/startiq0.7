module.exports = function(controller){
    controller.on('direct_message, message', function(bot, message) {
        console.log(message.intent);
    })
}