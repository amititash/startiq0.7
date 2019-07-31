const {BotkitConversation} = require('botkit');
module.exports = function(controller) {
    let dialogid = "abcd";
    let convo = new BotkitConversation(dialogid, controller);


    convo.addQuestion(  async (line, vars)=> {
        return { text : "Placeholding text"};
    },
    [
        {
            pattern  :"yes",
            type : 'string', 
            handler : async (res, bot, convo) => {
                console.log("exec")
            }
        }
    ],
    {},
    "default");



    controller.addDialog(convo);

    controller.hears(['really'], 'message, direct_message', async (bot, message) => {
        await bot.beginDialog(dialogid);
    })
}