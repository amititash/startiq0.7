const axios = require('axios');
const store = require('../store/store');
const deepdive_replies = require(`../assets/deepdive/deepdive_replies${ Math.floor(Math.random()*2) + 1 }`);

/*

WHAT IS THIS?

This module demonstrates simple uses of Botkit's conversation system.

In this example, Botkit hears a keyword, then asks a question. Different paths
through the conversation are chosen based on the user's response.

*/

module.exports = function(controller) {

    let customer_segment = "";

    controller.middleware.receive.use(function( bot, message, next) {
        if(message.type === "interactive_message_callback") {
            customer_segment = message.text;
            message.customer_segment = customer_segment;
        }
        next();
    })

    controller.on('direct_message,direct_mention, interactive_message_callback', async function(bot, message) {
        if(!store.get(message.user)){
            console.log("user not found");
            return ;
        }

        if(message.text === 'deepdive') {
   
            // What if deepdive cancelled on very first step so that no idea itself ?
            let existingIdeas = [];
            let existingIdeasIndex = 1;
            let ideaMap = {};
            let attachment = [];
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
                    text : "Some error occurred"
                },"error_thread");

                convo.addMessage({
                    text : "No response saved. You can type 'ideastorm' to record multiple ideas or 'deepdive' to pick an idea and work on it."
                },"early_exit_thread");



                convo.addMessage({
                    text : ""
                },"save_responses_thread");

           

                convo.addQuestion({
                    text : "What's the problem you are solving for them ?"
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
                "chosen_customer_segment_thread");
    
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
                "chosen_customer_segment_thread");
    
                convo.addMessage({
                    text : "It looks like there are several companies that develop software for {{vars.target_customer_segment}}. Here are a few that I found with links to their website and a short description. Do any of these seem like competitors? If so, click on them to add them to your idea."
                },"chosen_customer_segment_thread");
    
                convo.addMessage({
                    text : `${deepdive_replies["similar_companies_found"]["question"]}`
                },"chosen_customer_segment_thread");
    
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
                "chosen_customer_segment_thread");
    
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
                "chosen_customer_segment_thread");
    
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
                "chosen_customer_segment_thread");
    
                convo.addMessage({
                    text : `${deepdive_replies["dig_deeper_into_idea"]["question"]}`
                },"chosen_customer_segment_thread");
    
                convo.addMessage({
                    text : `${deepdive_replies["analogous_products"]["question"]}`
                },"chosen_customer_segment_thread");
    
                convo.addQuestion({
                    text : `${deepdive_replies["analogous_products_response"]["question"]}`,
                    attachments:[
                        {
                            title: `Do you agree ?`,
                            callback_id: 'analogous_products',
                            attachment_type: 'default',
                            actions: [
                                {
                                    "name":"yes",
                                    "text": "Yes",
                                    "value": "yes",
                                    "type": "button",
                                },
                                {
                                    "name":"no",
                                    "text": "No",
                                    "value": "no",
                                    "type": "button",
                                }
                            ]
                        }
                    ]
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
                        pattern : bot.utterances.yes,
                        callback : function(res, convo){
                            convo.setVar("analogous_products", "Dora Datafox");
                            convo.gotoThread("chosen_analogous_products_thread");
                            convo.next();
                        }
                    },
                    {
                        pattern : bot.utterances.no,
                        callback : function(res, convo){
                            convo.gotoThread("suggest_analogous_products_thread");
                            convo.next();
                        }
                    },
                    {
                        default : true,
                        callback : function(res, convo){
                            convo.repeat();
                            convo.next();
                        }
                    }
                ],
                {},          
                "chosen_customer_segment_thread");




                convo.addQuestion({
                    text : "Can you suggest some names then ?"
                },
                [
                    {
                        pattern : bot.utterances.cancel,
                        callback : function(res, convo) {
                            convo.gotoThread("save_responses_thread");
                            convo.next();
                        }
                    },
                    {
                        default : true,
                        callback : function(res, convo) {
                            convo.setVar("analogous_products", res.text);
                            convo.sayFirst("Noted");
                            convo.gotoThread("chosen_analogous_products_thread");
                            convo.next();
                        }
                    }
                ],
                {},
                "suggest_analogous_products_thread");


            
    
                convo.addMessage({
                    text : `${deepdive_replies["market_segment_categories"]["question"]}`
                },"chosen_analogous_products_thread");
                
    
                // convo.addQuestion({
                //     text : "{{vars.idea_categories}}"
                // },
                // [
                //     {
                //         pattern : bot.utterances.quit,
                //         callback : function(res, convo) {
                //             convo.gotoThread("save_responses_thread");
                //             convo.next();
                //         }
                //     },
                //     {
                //         default : true,
                //         callback : function(res,convo) {
                //             convo.setVar("categories", res.text);
                //             convo.next();
                //         }
                //     }
                // ],
                // {},
                // "chosen_analogous_products_thread");


                convo.addMessage({
                    text : "{{vars.idea_categories}}"
                }, "chosen_analogous_products_thread");
    
                convo.addMessage({
                    text : `${deepdive_replies["financing_activity"]["question"]}`
                },"chosen_analogous_products_thread");
    
                convo.addMessage({
                    text : `${deepdive_replies["recently_funded_startups"]["question"]}`,
                },"chosen_analogous_products_thread");


                convo.addQuestion({
                    text : "Do you want the results to be mailed to you and your mentor ?"
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
                        pattern : bot.utterances.yes,
                        callback : function(res, convo) {
                            // email sending logic here.
                            convo.transitionTo("save_responses_thread", "I have sent the email. Thank you. You may try typing 'ideastorm' or 'rank ideas' ");
                            convo.next();
                        }
                    },
                    {
                        pattern : bot.utterances.no,
                        callback : function(res, convo) {
                            convo.transitionTo("save_responses_thread", "You may try typing 'ideastorm' or 'rank ideas'.");
                            convo.next();
                        }
                    },
                    {
                        default : true,
                        callback : function(res, convo) {
                            convo.repeat();
                            convo.next();
                        }
                    }
                ],
                {},
                "chosen_analogous_products_thread")


                convo.beforeThread("choose_customer_segment_thread", function(convo, next){
                    let targetCustomers = ideaObj.targetCustomers;
                    let dropDownMenu = {
                        text : "Please choose the most important segment from this list.",
                        fallback : "fallback text",
                        color : "#3AA3E3",
                        attachment_type : "default",
                        callback_id : "target_customer_selection",
                        actions : [
                            {
                                "name" : "customers_list",
                                "text" : "Pick a target customer",
                                "type" : "select",
                                "options" : []
                            }
                        ]
                    };
                    targetCustomers.forEach( targetCustomer => {
                        dropDownMenu.actions[0].options.push({
                            text : `${targetCustomer}`,
                            value : `${targetCustomer}`
                        })
                    });
                    attachment.push(dropDownMenu);
                    next();     
                })

                convo.addQuestion({
                    "response_type": "in_channel",
                    attachments : attachment,
                },
                [
                    {
                        pattern : bot.utterances.quit,
                        callback : function ( res, convo ) {
                            convo.gotoThread("save_responses_thread");
                            convo.next();
                        }
                    },
                    {
                        default : true,
                        callback : function(res, convo) {
                            convo.setVar("target_customer_segment",customer_segment);
                            convo.transitionTo("chosen_customer_segment_thread",`Okay. You chose ${customer_segment}.`);
                            convo.next();
                        }
                    }
                ],
                {},
                "choose_customer_segment_thread");

                convo.addQuestion({
                    text : `Please enter comma separated list of target customers.`
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
                            let missed_target_customers = [];
                            try {
                                missed_target_customers = res.text.split(',');
                                ideaObj.targetCustomers = ideaObj.targetCustomers.concat(missed_target_customers);
                                console.log(ideaObj.targetCustomers);
                            }
                            catch(e) {
                                console.log(e);
                                convo.repeat();
                            }
                            convo.say({
                                text : "Noted"
                            })
                            convo.next();
                            convo.gotoThread("choose_customer_segment_thread");
                            convo.next();
                        }
                    }
                ],
                {},
                "missed_customer_segment_thread");


                convo.beforeThread("response_thread", async function(convo, next) {
                    let ideaDescription = "";
                    let ideaCategories = [];
                    try {
                        ideaDescription = ideaObj.ideaDescription;
                        let url = `${process.env.CLASSIFIER_API_URL}/categories?idea=${ideaDescription}`
                        let response = await axios.get(url);
                        ideaCategories = response.data["PRED"].slice(0,5);
                    }
                    catch(e) {
                        console.log(e);
                        convo.gotoThread("error_thread");
                    }
                    let ideaCategoriesString = "";
                    ideaCategories.forEach( category => {
                        ideaCategoriesString += `${category.topic}\n`;
                    })
                    console.log(ideaCategoriesString);
                    convo.setVar("idea_categories", ideaCategoriesString);


                    
                    next();
                })


                convo.addQuestion({

                    //First question asking the user for target customers.
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
                            let targetCustomers = [];
                            try {
                                targetCustomers = res.text.split(',');
                            }
                            catch (e) {
                                console.log(e);
                                convo.repeat();
                            }
                            ideaObj.targetCustomers = targetCustomers;
                            convo.say(`Great. ${res.text} are a great target segment`)
                            convo.next();
                        }
                    }
                ],
                {},
                "response_thread");
                
                convo.addQuestion({
                    attachments:[
                        {
                            title: `${deepdive_replies["missed_target_customers"]["question"]}`,
                            callback_id: 'missed_target_customers',
                            attachment_type: 'default',
                            actions: [
                                {
                                    "name":"yes",
                                    "text": "Yes",
                                    "value": "yes",
                                    "type": "button",
                                },
                                {
                                    "name":"no",
                                    "text": "No",
                                    "value": "no",
                                    "type": "button",
                                }
                            ]
                        }
                    ]
                },
                [
                    {
                        pattern : bot.utterances.yes,
                        callback : function(res, convo) {
                            convo.gotoThread("missed_customer_segment_thread");
                            convo.next();
                        }
                    },
                    {
                        pattern : bot.utterances.no,
                        callback : function(res, convo) {
                            convo.gotoThread("choose_customer_segment_thread");
                            convo.next();
                        }
                    },
                    {
                        default : true,
                        callback : function(res, convo) {
                            convo.repeat();
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
                    [
                        {
                            pattern : bot.utterances.quit,
                            callback : function(res, convo) {
                                convo.gotoThread("early_exit_thread");
                                convo.next();
                            }
                        },
                        {
                            default : true,
                            callback : function(res, convo) {
                                let chosenIdeaIndex = res.text;
                                //existingIdeaIndex is equal to the last number, i.e it corresponds to working on a new idea.
                                if(chosenIdeaIndex < existingIdeasIndex && chosenIdeaIndex > 0) { 
                                    //user choses to work on pre-existing idea.
                                    ideaObj.ideaDescription = existingIdeas[chosenIdeaIndex-1].ideaDescription;
                                    convo.transitionTo("response_thread",`You chose to work on this idea : ${ideaMap[chosenIdeaIndex]}`);
                                }
                                else if(chosenIdeaIndex > existingIdeasIndex) {
                                    console.log("out of range");
                                    convo.transitionTo("default", "Please enter a valid response");
                                }
                                convo.next();
                            }
                        }
                    ],
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
                            convo.gotoThread("early_exit_thread");
                            convo.next();
                        }
                    },
                    {
                        default : true,
                        callback : function(res, convo) {
                            ideaObj.ideaDescription = res.text;
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
