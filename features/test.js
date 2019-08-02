const {BotkitConversation} = require('botkit');
module.exports = function(controller) {
    let dialogid = "dialog-1";
    let convo = new BotkitConversation(dialogid, controller);
    convo.addQuestion({
        blocks : [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": "Pick an item from the dropdown list"
                },
                "accessory": {
                    "type": "static_select",
                    "placeholder": {
                        "type": "plain_text",
                        "text": "Select an item",
                        "emoji": true
                    },
                    "options": [
                        {
                            "text": {
                                "type": "plain_text",
                                "text": "Choice 1",
                                "emoji": true
                            },
                            "value": "value-0"
                        },
                        {
                            "text": {
                                "type": "plain_text",
                                "text": "Choice 2",
                                "emoji": true
                            },
                            "value": "value-1"
                        },
                        {
                            "text": {
                                "type": "plain_text",
                                "text": "Choice 3",
                                "emoji": true
                            },
                            "value": "value-2"
                        }
                    ]
                }
            }
        ]
    },
    [
        {
            default : true,
            type : 'string',
            handler : async(res, convo, bot) => {
                console.log(res);
                await bot.say("oohoho");
            }
        }
    ]);
    controller.addDialog(convo);
    controller.hears(['test'], 'message, direct_message, interactive_message, interactive_message_callback, block_actions, direct_mention', async (bot, message) => {
        await bot.beginDialog(dialogid);
    })
}