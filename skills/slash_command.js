module.exports = function(controller){
    controller.on('slash_command', function(bot, message){
        switch ( message.command) {
            case '/greet' : 
                console.log("greet you");
                bot.reply(message, `Hi ${message.text}`);
                break;
            case '/farewell' : 
                console.log("farewell");
                bot.reply(message, `Nice chatting with you ${message.text}`);
                break;
        }
    })
}

