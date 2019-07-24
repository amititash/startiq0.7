const axios = require('axios');
const store = require('../store/store');


const ideastorm_replies = require(`../assets/ideastorm_replies${Math.floor(Math.random()*1)+1}`)

module.exports = function(controller) {
    controller.on('direct_message , direct_mention', function(bot, message) {

        if(!store.get(message.user)) {
            console.log("User not found in local storage.");
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
                            pattern : bot.utterances.quit,
                            callback : function(res, convo) {
                                convo.say({
                                    text : "Your responses were saved. You can type 'ideastorm' to record multiple ideas or 'deepdive' to pick an idea and work on it."
                                })
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
                    [
                        {
                            pattern : bot.utterances.quit,
                            callback : function( res, convo) {
                                convo.say({
                                    text : "No responses were saved. You can type 'ideastorm' to record multiple ideas or 'deepdive' to pick an idea and work on it."
                                })
                                convo.next();
                            }
                        },
                        {
                            default : true,
                            callback : function(res, convo) {
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
                            }   
                        }
                    ]);
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
                                ideas.push(res.text);
                                count--;
                                if(count === 0) {
                                    convo.gotoThread("save_responses_thread");
                                }
                                else {
                                    convo.transitionTo("idea_store_thread","Okay, enter next one.");
                                }
                                convo.next();
                            }
                        }
                    ],
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
    })   
}