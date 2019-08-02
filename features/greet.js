const store = require('../store/store');
const { BotkitConversation } = require('botkit');

module.exports = function(controller) {
    // const GREET_DIALOG_ID = 'greet-dialog';

    // let convo = new BotkitConversation(GREET_DIALOG_ID,controller);

    // convo.say({
    //     text : "Hi ! I am the StartIQ bot. You can say 'ideastorm' , 'deepdive', or 'rank ideas'"
    // })

    // controller.addDialog(convo);
    // controller.on('direct_message, direct_mention', async (bot, message) => {

    //     if(message.text === 'Hi'|| message.text === 'hi' || message.text === "hello" || message.text === "Hello" || message.text === "Hey" || message.text === "hey" ){
    //         if(!store.get(message.user)) {
    //             console.log("User not found in the local storage.");
    //             return ;
    //         }

    //         else {
    //             await bot.beginDialog(GREET_DIALOG_ID);
    //         }
    //     }
    // })
}