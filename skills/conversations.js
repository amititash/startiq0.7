/*

WHAT IS THIS?

This module demonstrates simple uses of Botkit's conversation system.

In this example, Botkit hears a keyword, then asks a question. Different paths
through the conversation are chosen based on the user's response.

*/

module.exports = function(controller) {

    controller.hears(['color'], 'direct_message,direct_mention', function(bot, message) {

        bot.startConversation(message, function(err, convo) {
            convo.say('This is an example of using convo.ask with a single callback.');

            convo.ask('What is your favorite color?', function(response, convo) {

                convo.say('Cool, I like ' + response.text + ' too!');
                convo.next();

            });
        });

    });


    controller.hears(['ideastorm'], 'direct_message,direct_mention', function(bot, message) {

        bot.createConversation(message, function(err, convo) {



            // create a path for when a user says YES
            convo.say({
                    text: 'Looks like you want to generate multiple ideas quickly, lets do it. Don’t worry about getting it perfect, we can improve the ideas later.',
            });

            convo.activate();
            // capture the results of the conversation and see what happened...
            convo.on('end', function(convo) {

                if (convo.successful()) {
                    // this still works to send individual replies...
                    bot.reply(message, 'Let us eat some!');

                    // and now deliver cheese via tcp/ip...
                }

            });
        });

    });

    controller.hears(['list'], 'direct_message,direct_mention', function(bot, message) {

        bot.createConversation(message, function(err, convo) {



            // create a path for when a user says YES
            convo.say({
                    text: 'Here is the list of ideas in your binder. Click the idea you want to work on.',
            });

            convo.activate();
            // capture the results of the conversation and see what happened...
            convo.on('end', function(convo) {

                if (convo.successful()) {
                    // this still works to send individual replies...
                    bot.reply(message, 'Let us eat some!');

                    // and now deliver cheese via tcp/ip...
                }

            });
        });

    });

    controller.hears(['deepdive'], 'direct_message,direct_mention', function(bot, message) {

        bot.createConversation(message, function(err, convo) {



            // create a path for when a user says YES
            convo.say({
                    text: 'Hi Im here to help you develop your startup idea. What are you trying to build and for whom?',
            });

            convo.activate();
            // capture the results of the conversation and see what happened...
            convo.on('end', function(convo) {

                if (convo.successful()) {
                    // this still works to send individual replies...
                    bot.reply(message, 'Let us eat some!');

                    // and now deliver cheese via tcp/ip...
                }

            });
        });

    });



};
