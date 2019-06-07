/*

WHAT IS THIS?

This module demonstrates simple uses of Botkit's conversation system.

In this example, Botkit hears a keyword, then asks a question. Different paths
through the conversation are chosen based on the user's response.

*/
const ObjectID = require('mongodb').ObjectID ;

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
            convo.addQuestion({
                text : "Ok, next. (say 'cancel' when you want to stop)"
            },
            [
                {
                    pattern : "cancel",
                    callback : function(res, convo) {
                        convo.stop();
                        convo.next();
                    }
                },
                {
                    default : true,
                    callback : function(res, convo) {
                        controller.storage.users.save({ id : (new ObjectID()).toHexString(), idea : res.text , foo:'bar'}, function(err) {
                            if(err) {
                                console.log("some error occured while storing");
                            }
                            convo.gotoThread("idea_input_thread");
                            convo.next();
                        });
                    }
                }
            ],
            {},
            "idea_input_thread");

            convo.ask({
                text: 'Looks like you want to generate multiple ideas quickly, lets do it. Don’t worry about getting it perfect, we can improve the ideas later.',
            },
            function(res, convo) {
                controller.storage.users.save({ id : (new ObjectID()).toHexString(), idea : res.text , foo:'bar'}, function(err) {
                    if(err) {
                        console.log("some error occured while storing",err);
                    }
                    convo.gotoThread("idea_input_thread");
                    convo.next();
                });
                
            });

            convo.activate();
            
        });

    });

    controller.hears(['list'], 'direct_message,direct_mention', function(bot, message) {
        controller.storage.users.all( function(err, all_user_data) {
            let ideas = all_user_data;
            bot.createConversation(message, function(err, convo) {
                convo.say({
                    text: 'Here is the list of ideas in your binder. Click the idea you want to work on.',
                });
                ideas.forEach( idea => {
                    convo.say({
                        text : `${idea.idea}`
                    })
                })      
                convo.activate();
            });
        })
    });

    controller.hears(['deepdive'], 'direct_message,direct_mention', function(bot, message) {
        bot.createConversation(message, function(err, convo) {

            convo.addMessage({
                text : "{{vars.programs}}"
            },"chosen_programs_thread");

            convo.addQuestion({
                text : "Ok you chose {{vars.chosenProgram}}. What's the problem you are solving for them ?"
            },
            function(res, convo) {
                convo.next();
            },
            {},
            "chosen_programs_thread");

            convo.addQuestion({
                text : "What is the most innovative aspect of your idea?"
            },
            [
                {
                    pattern : ".*",
                    callback : function(res, convo) {
                        console.log("inside handler");
                        convo.next();
                    }
                },
                {
                    default : true,
                    callback : function(res, convo) {
                        convo.next();
                    }
                }
            ],
            {},
            "chosen_programs_thread");

            convo.addMessage({
                text : "It looks like there are several companies that develop software for entrepreneurs. Here are a few that I found with links to their website and a short description. Do any of these seem like competitors? If so, click on them to add them to your idea."
            },"chosen_programs_thread");

            convo.addMessage({
                text : "Startup.co, Techcrunch, Concept Feedback"
            },"chosen_programs_thread");

            convo.addQuestion({
                text : "Are there any other companies that might be competitors?"
            },function(res, convo) {
                convo.setVar("competitors",res.text);
                convo.next();
            },
            {},
            "chosen_programs_thread");

            convo.addQuestion({
                text : "What about a substitute product ?",
            },function(res, convo) {
                convo.setVar("substituteProduct",res.text);
                convo.next();
            },
            {},
            "chosen_programs_thread");

            convo.addQuestion({
                text : "How do you see your idea as better or more innovative than these companies?"
            },
            function(res, convo) {
                convo.setVar("howIdeaBetter",res.text);
                convo.next();
            },
            {},
            "chosen_programs_thread");

            convo.addMessage({
                text : "Great, let me see if I can dig a bit deeper into the idea."
            },"chosen_programs_thread");

            convo.addMessage({
                text : "Here are some analogous products but targeting different markets, are any of these relevant?"
            },"chosen_programs_thread");

            convo.addQuestion({
                text : "Dora Datafox"
            },
            function(res, convo){
                console.log("inside this now");
                convo.setVar("analogousProduct",res.text);
                convo.next();
            },
            {},          
            "chosen_programs_thread");

            convo.addMessage({
                text : "Based on the information you provided, it looks like your market segment includes the following categories. Check all that you think are relevant."
            },"chosen_programs_thread");

            convo.addQuestion({
                text : "SaaS, Chatbots, Machine Learning"
            },
            function(res,convo) {
                convo.setVar("categories", res.text);
                convo.next();
            },
            {},
            "chosen_programs_thread");

            convo.addMessage({
                text : "Based on financing data, this market has seen some financing activity. Startups in this space that have recently raised funding include:"
            },"chosen_programs_thread");

            convo.addMessage({
                text : "DataFox raised funding from Slack"
            },"chosen_programs_thread");

            convo.addQuestion({
                text : "Are there other target customers that I’ve missed ?"
            },
            [
                {
                    pattern : ".*",
                    callback : function(res,convo){
                        convo.setVar("programs", res.text);
                        convo.say({
                            text : "Noted"
                        })
                        convo.say({
                            text : "Let's pick the most important segment and see if we can dig a bit deeper into the problem you are solving for them.",
                            action : "chosen_programs_thread"
                        })
                        convo.next();
                    }
                }
            ],
            {},
            "missed_target_customer_thread");
            convo.addQuestion({
                text : "So who are your target customers ?"
            },
            [
                {
                    pattern : ".*",
                    callback : function(res, convo) {
                        convo.setVar("chosenProgram", res.text);
                        convo.transitionTo("missed_target_customer_thread", `Great. ${res.text} are a great target segment`);
                        convo.next();
                    }
                }
            ],
            {},
            "response_thread");
            convo.ask({
                    text: 'I’m here to help you develop your startup idea. What are you trying to build and for whom ?'
            },function(res, convo) {
                controller.storage.users.save({ id : (new ObjectID()).toHexString(), idea : res.text , foo:'bar'}, function(err) {
                    if(err) {
                        console.log("some error occured while storing");
                    }
                    convo.gotoThread("response_thread");
                    convo.next();
                }); 
                
            });
            convo.activate();
            
        });

    });
};
