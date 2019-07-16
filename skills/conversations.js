const axios = require('axios');


const store = require('../store/store');
var request = require("request");
const deepdive_replies = require(`../assets/deepdive/deepdive_replies${ Math.floor(Math.random()*2) + 1 }`);
const all_reply_set = [];


/**
 * all_reply_set is 2-d array.
 * Each array of all_reply_set is set of responses and is intended for a single user. 
 */
for(let i = 1;i<3;i++) {
    all_reply_set.push(require(`../assets/ideastorm_replies${i}`))
}

console.log(all_reply_set);

//Randomly choose one set(array) of responses.
const ideastorm_replies = all_reply_set[Math.floor(Math.random()*2)]; 

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


                //Here, we are randomly choosing a particular response from the chosen set of response.
                convo.setVar("ideastorm_reply", ideastorm_replies[Math.floor(Math.random()*3)]["statement"])


                convo.addQuestion({
                    // text : "Ok, next. (say 'cancel' when you want to stop)"
                    text : "{{vars.ideastorm_reply}}"
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

                                    //Here, we are randomly choosing a particular response from the chosen set of response.
                                    convo.setVar("ideastorm_reply", ideastorm_replies[Math.floor(Math.random()*3)]["statement"])

                                    convo.next();
                                })
                                .catch( e => {
                                    console.log("some error occurred");
                                    convo.gotoThread("idea_input_thread");

                                    //Here, we are randomly choosing a particular response from the chosen set of response.
                                    convo.setVar("ideastorm_reply", ideastorm_replies[Math.floor(Math.random()*3)]["statement"])
                                    
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
                            if(idea.details.length === 1) {
                                convo.say({
                                    text : `${idea.details[0].answer}\n***************************************************************`
                                })
                            }
                            else {
                                convo.say({
                                    text : `${JSON.stringify(idea.details,null,2)}\n***************************************************************`
                                })
                            }
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
                    text : "Thanks ! Your responses have been saved"
                },"save_responses_thread");

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
                    text : `${deepdive_replies["most_innovative_aspect"]["question"]}`
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
                            /************************ */
                            
                            //This callback is executed on any answer except a quitting answer like 'cancel', 'quit' etc.
                            // This should be a suitable place to make async api calls.
                            // res.text contains user's answer to the above question "What is the most innovative...?"
                            // In general, we can make api calls after convo.ask or convo.addQuestion. 
                            // Another place to make async calls is the before hook of a thread. 

                            /************************ */
                            responses.push({
                                question :  "What is the most innovative aspect of your idea?",
                                answer : res.text
                            })
                            convo.next();
                        }
                    },
                ],
                {},
                "chosen_programs_thread");
    
                convo.addMessage({
                    text : `${deepdive_replies["similar_companies_exist"]["question"]}`
                },"chosen_programs_thread");
    
                convo.addMessage({
                    text : `${deepdive_replies["similar_companies_found"]["question"]}`
                },"chosen_programs_thread");
    
                convo.addQuestion({
                    text : `${deepdive_replies["any_other_competitors"]["question"]}`
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
                    text : `${deepdive_replies["substitute_products"]["question"]}`
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
                    text : `${deepdive_replies["how_idea_better"]["question"]}`
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
                    text : `${deepdive_replies["dig_deeper_into_idea"]["question"]}`
                },"chosen_programs_thread");
    
                convo.addMessage({
                    text : `${deepdive_replies["analogous_products"]["question"]}`
                },"chosen_programs_thread");
    
                convo.addQuestion({
                    text : `${deepdive_replies["analogous_products_response"]["question"]}`
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
                            convo.setVar("analogousProduct",res.text);
                            convo.next();
                        }
                    }
                ],
                {},          
                "chosen_programs_thread");
    
                convo.addMessage({
                    text : `${deepdive_replies["market_segment_categories"]["question"]}`
                },"chosen_programs_thread");
                
    
                convo.addQuestion({
                    text : "{{vars.startuptag}}"
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
                    text : `${deepdive_replies["financing_activity"]["question"]}`
                },"chosen_programs_thread");
    
                convo.addMessage({
                    text : `${deepdive_replies["recently_funded_startups"]["question"]}`,
                    action : "save_responses_thread"
                },"chosen_programs_thread");

                
    
                convo.addQuestion({
                    text : `${deepdive_replies["missed_target_customers"]["question"]}`
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
                                text : `${deepdive_replies["pick_most_important_segment"]["question"]}`,
                                action : "chosen_programs_thread"
                            })
                            convo.next();
                        }
                    }
                ],
                {},
                "missed_target_customer_thread");



                convo.addQuestion({
                    text : `${deepdive_replies["who_are_target_customers"]["question"]}`
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
                        text: `${deepdive_replies["what_is_the_idea"]["question"]}`
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
                            /**
                             * 
                             * sending the user input for tagging 
                             */
                            

                            var options = { method: 'GET',
                            url: `http://localhost:5000/predict?idea=${res.text}`,
                            headers: 
                            { 
                                'cache-control': 'no-cache',
                                accept: 'application/json',
                                'content-type': 'application/json' } };

                            request(options, function (error, response, body) {
                            if (error) {
                                console.log(error);
                                convo.say({
                                    text : "Some error occurred in processing the idea."
                                })
                                convo.gotoThread('response_thread');
                                convo.next();
                            }
                            else {
                                var result = JSON.parse(body);
                                // console.log(result.data);
                                convo.setVar("startuptag",result["PRED"][0]["topic"]);
                                convo.gotoThread('response_thread');
                                convo.next();
                            }

                            });

                            
                        }
                    }
                ]
                );
                convo.activate();
                
            });
        }
    });


};
