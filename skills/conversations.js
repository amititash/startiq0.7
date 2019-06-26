const axios = require('axios');


const store = require('../store/store');


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


    controller.on('direct_message,direct_mention', function(bot, message) {
        if(!store.get(message.user)){
            console.log("user not found");
            return ;
        }

        if(message.text === "ideastorm"){
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
                            console.log("default triggered");
                            let url = `${process.env.BACKEND_API_URL}/api/v1/kos`;
                            let data = {
                                type : "idea",
                                title : "Idea",
                                owner : store.get(message.user),
                                details : [
                                    {
                                        question : "What is your idea ?",
                                        answer : res.text
                                    }
                                ]
                            }
                            console.log(url);
                            axios.post(url,data)
                                .then( response => {
                                    console.log("data was saved successfully");
                                    convo.gotoThread("idea_input_thread");
                                    convo.next();
                                })
                                .catch( e => {
                                    console.log("some error occurred");
                                    convo.gotoThread("idea_input_thread");
                                    convo.next(e);
                                })
                        }
                    }
                ],
                {},
                "idea_input_thread");
    
                convo.ask({
                    text: 'Looks like you want to generate multiple ideas quickly, lets do it. Don’t worry about getting it perfect, we can improve the ideas later.',
                },
                function(res, convo) {
                    let url = `${process.env.BACKEND_API_URL}/api/v1/kos`;
                            let data = {
                                type : "idea",
                                title : "Idea",
                                owner : store.get(message.user),
                                details : [
                                    {
                                        question : "What is your idea ?",
                                        answer : res.text
                                    }
                                ]
                            }
                            console.log(url);
                            axios.post(url,data)
                                .then( response => {
                                    console.log("data was saved successfully");
                                    convo.gotoThread("idea_input_thread");
                                    convo.next();
                                })
                                .catch( e => {
                                    console.log("some error occurred");
                                    convo.gotoThread("idea_input_thread");
                                    convo.next(e);
                                })
                    
                });
    
                convo.activate();
                
            });
        }


        if(message.text === "list") {
            let url = `${process.env.BACKEND_API_URL}/api/v1/kos?emailId=${store.get(message.user)}`;
            axios.get(url)
                .then ( response => {
                    let ideas = response.data;
                    bot.createConversation( message, function(err, convo) {
                        if(!ideas.length){
                            convo.say({
                                text : "You don't have any ideas in your binder."
                            })
                        }
                        else {
                            convo.say({
                                text : 'Following are the ideas in your binder.'
                            })
                        }
                        ideas.forEach( idea => {
                            convo.say({
                                text : `${JSON.stringify(idea.details,null,2)}`
                            })
                        })
                        convo.activate();
                    })
                })
                .catch( e => {
                    bot.reply(message, "Some error occurred");
                    console.log(e);
                })
            
        }


        if(message.text === 'deepdive') {
            
            let responses = [];
            bot.createConversation(message, function(err, convo) {

                convo.beforeThread('save_responses_thread', function(convo, next) {
                    console.log("saved responses");
                    let url = `${process.env.BACKEND_API_URL}/api/v1/kos`;
                    let data = {
                        type : "deepdive",
                        title : "Idea",
                        owner : store.get(message.user),
                        details : responses
                    }
                    console.log(url);
                    axios.post(url,data)
                        .then( response => {
                            console.log("data was saved successfully");
                        })
                        .catch( e => {
                            console.log("some error occurred");
                        })
                    next();
                })


                convo.addMessage({
                    text : "{{vars.programs}}"
                },"chosen_programs_thread");
    
                convo.addQuestion({
                    text : "Ok you chose {{vars.chosenProgram}}. What's the problem you are solving for them ?"
                },
                [
                    {
                        pattern : bot.utterances.quit,
                        callback : function(res, convo) {
                            convo.gotoThread("save_responses_thread");
                            convo.next();
                        }  
                    },
                    {
                        default : true,
                        callback : function(res, convo) {
                            responses.push({
                                question :  "What's the problem you are solving for them ?",
                                answer : res.text
                            })
                            convo.next();
                        }
                    }
                ],
                {},
                "chosen_programs_thread");
    
                convo.addQuestion({
                    text : "What is the most innovative aspect of your idea?"
                },
                [
                    {
                        pattern : bot.utterances.quit,
                        callback : function(res, convo) {
                            convo.gotoThread("save_responses_thread");
                            convo.next();
                        }  
                    },
                    {
                        default : true,
                        callback : function(res, convo) {
                            responses.push({
                                question :  "What is the most innovative aspect of your idea?",
                                answer : res.text
                            })
                            console.log("inside handler");
                            convo.next();
                        }
                    },
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
                },
                [
                    {
                        pattern : bot.utterances.quit,
                        callback : function(res, convo) {
                            convo.gotoThread("save_responses_thread");
                            convo.next();
                        }
                    },
                    {
                        default : true,
                        callback : function(res, convo) {
                            responses.push({
                                question : "Are there any other companies that might be competitors?",
                                answer : res.text
                            })
                            convo.setVar("competitors",res.text);
                            convo.next();
                        }
                    }
                ]
                ,
                {},
                "chosen_programs_thread");
    
                convo.addQuestion({
                    text : "What about a substitute product ?",
                },
                [
                    {
                        pattern : bot.utterances.quit,
                        callback : function(res, convo) {
                            convo.gotoThread("save_responses_thread");
                            convo.next();
                        }
                    },
                    {
                        default : true,
                        callback : function(res, convo) {
                            responses.push({
                                question : "What about a substitute product ?",
                                answer : res.text
                            })
                            convo.setVar("substituteProduct",res.text);
                            convo.next();
                        }
                    }
                ],
                {},
                "chosen_programs_thread");
    
                convo.addQuestion({
                    text : "How do you see your idea as better or more innovative than these companies?"
                },
                [
                    {
                        pattern : bot.utterances.quit,
                        callback : function(res, convo) {
                            convo.gotoThread("save_responses_thread");
                            convo.next();
                        }
                    },
                    {
                        default : true,
                        callback : function(res, convo) {
                            responses.push({
                                question : "How do you see your idea as better or more innovative than these companies?",
                                answer : res.text
                            })
                            convo.setVar("howIdeaBetter",res.text);
                            convo.next();
                        }
                    }
                ]
                ,
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
                [
                    {
                        pattern : bot.utterances.quit,
                        callback : function(res, convo) {
                            convo.gotoThread("save_responses_thread");
                            convo.next();
                        }
                    },
                    {
                        default : true,
                        callback : function(res, convo){
                            responses.push({
                                question : "Here are some analogous products but targeting different markets, are any of these relevant?. Dora Datafox",
                                answer : res.text
                            })
                            console.log("inside this now");
                            convo.setVar("analogousProduct",res.text);
                            convo.next();
                        }
                    }
                ],
                {},          
                "chosen_programs_thread");
    
                convo.addMessage({
                    text : "Based on the information you provided, it looks like your market segment includes the following categories. Check all that you think are relevant."
                },"chosen_programs_thread");
    
                convo.addQuestion({
                    text : "SaaS, Chatbots, Machine Learning"
                },
                [
                    {
                        pattern : bot.utterances.quit,
                        callback : function(res, convo) {
                            convo.gotoThread("save_responses_thread");
                            convo.next();
                        }
                    },
                    {
                        default : true,
                        callback : function(res,convo) {
                            responses.push({
                                question : "Based on the information you provided, it looks like your market segment includes the following categories. Check all that you think are relevant. SaaS, Chatbots, Machine Learning",
                                answer : res.text
                            })
                            convo.setVar("categories", res.text);
                            convo.next();
                        }
                    }
                ],
                {},
                "chosen_programs_thread");
    
                convo.addMessage({
                    text : "Based on financing data, this market has seen some financing activity. Startups in this space that have recently raised funding include:"
                },"chosen_programs_thread");
    
                convo.addMessage({
                    text : "DataFox raised funding from Slack",
                    action : "save_responses_thread"
                },"chosen_programs_thread");

                convo.addMessage({
                    text : "Thanks ! Your responses have been saved"
                },"save_responses_thread");
    
                convo.addQuestion({
                    text : "Are there other target customers that I’ve missed ?"
                },
                [
                    {
                        pattern : bot.utterances.quit,
                        callback : function(res, convo) {
                            convo.gotoThread("save_responses_thread");
                            convo.next();
                        }
                    },
                    {
                        default : true,
                        callback : function(res,convo){
                            responses.push({
                                question : "Are there other target customers that I’ve missed ?",
                                answer : res.text
                            })
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
                        pattern : bot.utterances.quit,
                        callback : function(res, convo) {
                            convo.gotoThread("save_responses_thread");
                            convo.next();
                        }
                    },
                    {
                        default : true,
                        callback : function(res, convo) {
                            responses.push({
                                question : "So who are your target customers ?",
                                answer : res.text
                            })
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
                },
                [
                    {
                        pattern : bot.utterances.quit,
                        callback : function(res, convo) {
                            convo.gotoThread("save_responses_thread");
                            convo.next();
                        }
                    },
                    {
                        default : true,
                        callback : function(res, convo) {
                            responses.push({
                                question : 'I’m here to help you develop your startup idea. What are you trying to build and for whom ?',
                                answer : res.text
                            })
                            convo.gotoThread('response_thread');
                            convo.next();
                            
                            
                        }
                    }
                ]
                );
                convo.activate();
                
            });
        }
    });


};
