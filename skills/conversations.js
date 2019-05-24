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
        let ideas = [
            "A  mobile application that allows passengers and drivers to find each other and exchange payments for rides.",
            "Develop a platform where individuals can auction their goods to the highest bidder.",
            "I want to develop software to help early-stage entrepreneurs effortlessly receive data-driven advice about their startup ideas so that they can build valuable companies that solve real problems for customers."
        ]
        let index = 0;
        

        bot.createConversation(message, function(err, convo) {

            convo.setVar("ideas", ideas[index % 3]);

            convo.addQuestion({
                text : "{{vars.ideas}}"
            },
            [
                {
                    pattern : "ok next",
                    callback : function(res, convo) {
                        index++;
                        if(index > 2) {
                            convo.stop();
                        }
                        convo.gotoThread("idea_thread");
                        convo.next();
                    }
                }   
            ],
            {},
            "idea_thread");

            convo.beforeThread("idea_thread", function(convo, next) {
                convo.setVar("ideas", ideas[index % 3]);
                next();
            })

            convo.ask({
                    text: 'Looks like you want to generate multiple ideas quickly, lets do it. Don’t worry about getting it perfect, we can improve the ideas later.',
                    action : "idea_thread"
            });

            convo.activate();
            
        });

    });

    controller.hears(['list'], 'direct_message,direct_mention', function(bot, message) {

        bot.createConversation(message, function(err, convo) {



            // create a path for when a user says YES
            convo.say({
                text: 'Here is the list of ideas in your binder. Click the idea you want to work on.',
            });

            convo.addMessage({
                text : "1. A mobile application that allows passengers and drivers to find each other and exchange payments for rides.  (5% complete)"
            })
            convo.addMessage({
                text : "2. Develop a platform where individuals can auction their goods to the highest bidder. (5% complete)"
            })
            convo.addMessage({
                text : "3. I want to develop software to help early-stage entrepreneurs effortlessly receive data-driven advice about their startup ideas so that they can build valuable companies that solve real problems for customers. (80% done)"
            })
            convo.activate();
        });

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
                convo.gotoThread("response_thread");
                convo.next();
            });
            
            



            convo.activate();
            
        });

    });



};
