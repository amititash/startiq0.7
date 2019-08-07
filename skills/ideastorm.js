const store = require('../store/store');
const axios = require('axios');


const ideastorm_replies = require(`../assets/ideastorm_replies${Math.floor(Math.random()*1)+1}`)

module.exports = function(controller) {
    controller.on('direct_message , direct_mention', function(bot, message) {

        if(!store.get(message.user)) {
            console.log("User not found in local storage.");
            return ;
        }

        if(message.intent === "ideastorm_intent"){

            if(ideastorm_replies.flag === "one_by_one") {
                
                bot.createConversation(message, function(err, convo) {

                    convo.setVar("ideastorm_reply", ideastorm_replies["bot_replies"][Math.floor(Math.random()*1)]["statement"])
    
                    convo.addQuestion({
                        text : "{{{vars.ideastorm_reply}}}"
                    },
                    [
                        {
                            pattern : bot.utterances.quit,
                            callback : function(res, convo) {
                                convo.say({
                                    text : "Ok, that's perfectly fine. You can always add an additional idea by typing 'ideabolt' (one) or 'ideastorm' (many) or develop one of your ideas further by 'deepdive'."
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
                                    ideaName : res.text.slice(0,200)
                                }
                                console.log(url);
                                axios.post(url,data)
                                    .then( response => {
                                        console.log("data was saved successfully");
                                        convo.gotoThread("idea_input_thread");
    
                                        //Here, we are randomly choosing a particular response from the chosen set of response.
                                        convo.setVar("ideastorm_reply", ideastorm_replies["bot_replies"][Math.floor(Math.random()*1)]["statement"])
    
                                        convo.next();
                                    })
                                    .catch( e => {
                                        console.log("some error occurred");
                                        convo.gotoThread("idea_input_thread");
    
                                        //Here, we are randomly choosing a particular response from the chosen set of response.
                                        convo.setVar("ideastorm_reply", ideastorm_replies["bot_replies"][Math.floor(Math.random()*1)]["statement"])
                                        
                                        convo.next(e);
                                    })
                            }
                        }
                    ],
                    {},
                    "idea_input_thread");


                    convo.say({
                        text : "The first step in generating an 'amazing' idea is generating 'many' ideas."
                    });


                    convo.say({
                        text : "A good idea isn't too long or too short. It describes what your business does, for what customer, why and how your product or service benefits that customer in a way that matters."
                    })
        
                    convo.ask({
                        text: "Type your first idea below. Go ahead. Our algorithms :robot_face: will do some quick research for each one in the background. Once you are done generating ideas, type 'deepdive' and pick one idea to develop further. Let's start.",
                    },
                    [
                        {
                            pattern : bot.utterances.quit,
                            callback : function( res, convo) {
                                convo.sayFirst({
                                    text : "Ok, that's perfectly fine. You can always add an additional idea by typing 'ideabolt' (one) or 'ideastorm' (many) or develop one of your ideas further by 'deepdive'."
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
                                console.log(url, data);
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
        }
    })
}