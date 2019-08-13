module.exports = function(controller) {

    controller.hears(['typing test'], 'direct_message, interactive_message_callback' , function(bot, message) {
        // bot.reply(message,{
        //     type : 'typing',
        //     as_user : true
        // })
        bot.replyWithTyping(message, 'Hello yourself');
    })
}