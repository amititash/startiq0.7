module.exports = function(controller) {

    controller.hears('block', 'direct_message, interactive_message_callback', function(bot, message) {
        const content = {
            // "text" : "wow",
            blocks: [
                {
                    
                    "type": "image",
                    "title": {
                        "type": "plain_text",
                        "text": "Example Image",
                        "emoji": true
                    },
                    "image_url": "https://api.slack.com/img/blocks/bkb_template_images/goldengate.png",
                    "alt_text": "Example Image"
                }
            ] // insert valid JSON following Block Kit specs
        };
        console.log(content);
        // bot.reply(message, content);
    })
}