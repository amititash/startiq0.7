module.exports = function(controller) {
    controller.hears(['test','poker'],'direct_message , interactive_message_callback', function(bot, message) {
        console.log("wow");
        const attachment = [
            {
                "text": "Choose a game to play",
                "fallback": "If you could read this message, you'd be choosing something fun to do right now.",
                "color": "#3AA3E3",
                "attachment_type": "default",
                "callback_id": "game_selection",
                "actions": [
                    {
                        "name": "games_list",
                        "text": "Pick a game...",
                        "type": "select",
                        "options": [
                            {
                                "text": "Hearts",
                                "value": "hearts"
                            },
                            {
                                "text": "Bridge",
                                "value": "bridge"
                            },
                            {
                                "text": "Checkers",
                                "value": "checkers"
                            },
                            {
                                "text": "Chess",
                                "value": "chess"
                            },
                            {
                                "text": "Poker",
                                "value": "poker"
                            },
                            {
                                "text": "Falken's Maze",
                                "value": "maze"
                            },
                            {
                                "text": "Global Thermonuclear War",
                                "value": "war"
                            }
                        ]
                    }
                ]
            }
        ]
        bot.startConversation(message, function(err, convo) {
            convo.ask({
                "text": "Would you like to play a game?",
        "response_type": "in_channel", attachments : attachment
            },
            function(res, convo) {
                convo.next();
            })
        })
       
        // bot.reply(message, {"text": "Would you like to play a game?",
        // "response_type": "in_channel", attachments : attachment});
    })
}