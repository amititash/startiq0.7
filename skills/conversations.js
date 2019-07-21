const axios = require('axios');


const store = require('../store/store');
var request = require("request");
const deepdive_replies = require(`../assets/deepdive/deepdive_replies${ Math.floor(Math.random()*2) + 1 }`);
const ideastorm_replies = require(`../assets/ideastorm_replies${Math.floor(Math.random()*1)+1}`)


/**
 * ideastorm_reply_set is 2-d array.
 * Each array of ideastorm_reply_set is set of responses and is intended for a single user. 
 */
// for(let i = 1;i<3;i++) {
//     ideastorm_reply_set.push(require(`../assets/ideastorm_replies${i}`))
// }

// console.log(ideastorm_reply_set);

//Randomly choose one set(array) of responses.
// const ideastorm_replies = ideastorm_reply_set[Math.floor(Math.random()*2)]; 

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


    controller.on('direct_message,direct_mention', async function(bot, message) {
        if(!store.get(message.user)){
            console.log("user not found");
            return ;
        }

        if(message.text === "ideastorm"){

            
            if(ideastorm_replies.flag === "one_by_one") {

                
                bot.createConversation(message, function(err, convo) {

    

                    //Here, we are randomly choosing a particular response from the chosen set of response.
                    convo.setVar("ideastorm_reply", ideastorm_replies["bot_replies"][Math.floor(Math.random()*3)]["statement"])
    
    
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
                        // !!!!!!!!!!!!!!!!! optimize . 2 ways : bulk insert, rabbitmq . 
                        {
                            default : true,
                            callback : function(res, convo) {
                                let url = `${process.env.BACKEND_API_URL}/api/v1/kos`;
                                let data = {
                                    ideaOwner : store.get(message.user),
                                    ideaDescription : res.text,
                                    ideaName : res.text.slice(0,200)
                                }
                                console.log(url);
                                axios.post(url,data)
                                    .then( response => {
                                        console.log("data was saved successfully");
                                        convo.gotoThread("idea_input_thread");
    
                                        //Here, we are randomly choosing a particular response from the chosen set of response.
                                        convo.setVar("ideastorm_reply", ideastorm_replies["bot_replies"][Math.floor(Math.random()*3)]["statement"])
    
                                        convo.next();
                                    })
                                    .catch( e => {
                                        console.log("some error occurred");
                                        convo.gotoThread("idea_input_thread");
    
                                        //Here, we are randomly choosing a particular response from the chosen set of response.
                                        convo.setVar("ideastorm_reply", ideastorm_replies["bot_replies"][Math.floor(Math.random()*3)]["statement"])
                                        
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
                            ideaOwner : store.get(message.user),
                            ideaDescription : res.text,
                            ideaName : res.text.slice(0,200),
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
            
            if(ideastorm_replies.flag === "five_ideas_at_once") {
                let ideas = [];
                let count = 5;
                bot.createConversation(message, function(error, convo) {

                    convo.addMessage({
                        text : "Please enter any 5 ideas that you want to record one by one.",
                        action : "idea_store_thread"
                    })

                    convo.addQuestion({
                        text : "",
                    },
                    function(res, convo) {
                        ideas.push(res.text);
                        count--;

                        if(count === 0) {
                            convo.gotoThread("save_responses_thread");
                        }
                        else {
                            convo.transitionTo("idea_store_thread","Okay, enter next one.");
                        }
                        convo.next();
                    },
                    {},
                    "idea_store_thread");



                    convo.addMessage({
                        text : "Your responses have been saved."
                    },"save_responses_thread")



                    convo.beforeThread("save_responses_thread", function(convo,next) {
                        ideas.forEach( idea => {
                            let data = {
                                ideaOwner : store.get(message.user),
                                ideaDescription : idea,
                                ideaName : idea.slice(0,200)
                            }
                            let url = `${process.env.BACKEND_API_URL}/api/v1/kos`;
                            
                            axios.post(url, data)
                                .then ( response => {
                                    console.log("Ideas saved successfully", response.data);      
                                })
                                .catch ( error => {
                                    console.log("Some error occurred in storing ideas", error);
                                })
                        })
                        next();
                    })
                    convo.activate();
                })
            }
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
                            ideas.forEach( idea => {
                                convo.say({
                                    text : idea.ideaName
                                })
                            })
                        }
                        convo.activate();
                    })
                })
                .catch( e => {
                    bot.reply(message, "Some error occurred");
                    console.log(e);
                })
        }


        if(message.text === 'deepdive') {
            // What if deepdive cancelled on very first step so that no idea itself ?
            let existingIdeas = [];
            let existingIdeasIndex = 1;
            let ideaMap = {};
            try {
                let ideas = await axios.get(`${process.env.BACKEND_API_URL}/api/v1/kos?emailId=${store.get(message.user)}`);
                existingIdeas = ideas.data;
            }
            catch(error) {
                console.log(error);
            }
            let existingIdeasString = "";
            if(existingIdeas.length > 0) {
                existingIdeas.forEach( (idea) => {
                    ideaMap[`${existingIdeasIndex}`] = idea.ideaName;
                    existingIdeasString += `${existingIdeasIndex++}. ${idea.ideaName}\n` 
                })
            }
            let ideaObj = {};
            bot.createConversation(message, function(err, convo) {

                convo.beforeThread('save_responses_thread', function(convo, next) {
                    let url = `${process.env.BACKEND_API_URL}/api/v1/kos`;
                    let data = ideaObj;
                    ideaObj.ideaName = ideaObj.ideaDescription.slice(0,200);
                    ideaObj.ideaOwner = store.get(message.user);
                    console.log("data to save", data);
                    axios.post(url,data)
                        .then( response => {
                            console.log(response.data);
                            console.log("data was saved successfully");
                        })
                        .catch( e => {
                            console.log("some error occurred",e);
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
                            let problems_solved = [res.text];
                            ideaObj.problems_solved = problems_solved;
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
                            let most_innovative_aspect = res.text;
                            ideaObj.newCapabilities = [most_innovative_aspect];
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
                            let competitors = res.text;
                            ideaObj.competitors = [competitors];
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
                            let substitute_products = res.text;
                            ideaObj.substitute_products = [substitute_products];
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
                            let competitiveDifferentiation = res.text;
                            ideaObj.competitiveDifferentiation = [competitiveDifferentiation]
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
                            let missed_target_customers = res.text;
                            ideaObj.missed_target_customers = missed_target_customers;
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
                            let targetCustomers = res.text;
                            ideaObj.targetCustomers = [targetCustomers];
                            convo.setVar("chosenProgram", res.text);
                            convo.transitionTo("missed_target_customer_thread", `Great. ${res.text} are a great target segment`);
                            convo.next();
                        }
                    }
                ],
                {},
                "response_thread");

                

                if(existingIdeas.length > 0) {
                    convo.addQuestion({
                        text : `You have following ideas in your binder. Choose the number corresponding to the idea you want to work upon.\n${existingIdeasString}\n${existingIdeasIndex}. I want to work on a new idea.`
                    },
                    function(res, convo) {
                        let chosenIdeaIndex = res.text;
                        //existingIdeaIndex is equal to the last number, i.e it corresponds to working on a new idea.
                        if(chosenIdeaIndex != existingIdeasIndex) { 
                            //user choses to work on pre-existing idea.
                            ideaObj.ideaDescription = existingIdeas[chosenIdeaIndex-1].ideaDescription;
                            convo.transitionTo("response_thread",`You chose to work on this idea : ${ideaMap[chosenIdeaIndex]}`);
                        }
                        convo.next();
                    },
                    {},
                    "default")
                }
            

                convo.addQuestion({
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
                            
                            ideaObj.ideaDescription = res.text;
                            /**
                             * 
                             * sending the user input for tagging 
                             */
                            

                            // var options = { method: 'GET',
                            // url: `http://localhost:5000/predict?idea=${res.text}`,
                            // headers: 
                            // { 
                            //     'cache-control': 'no-cache',
                            //     accept: 'application/json',
                            //     'content-type': 'application/json' } };

                            // request(options, function (error, response, body) {
                            // if (error) {
                            //     console.log(error);
                            //     convo.say({
                            //         text : "Some error occurred in processing the idea."
                            //     })
                            //     convo.gotoThread('response_thread');
                            //     convo.next();
                            // }
                            // else {
                            //     var result = JSON.parse(body);
                            //     // console.log(result.data);
                            //     convo.setVar("startuptag",result["PRED"][0]["topic"]);
                            //     convo.gotoThread('response_thread');
                            //     convo.next();
                            // }

                            // });
                            convo.gotoThread("response_thread");
                            convo.next();
                        }
                    }
                ],
                {},
                "default"
                );
                convo.activate();
                
            });
        }
    });


};
