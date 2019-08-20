const store = require('../store/store');
const axios = require('axios');


const ideastorm_replies = require(`../assets/ideastorm_replies${Math.floor(Math.random()*1)+1}`);


const storeKo = (url, data) => {
    return new Promise( async (resolve, reject) => {
        let savedKo = {};
        try {
            let response = await axios.post(url, data);
            savedKo = response.data;
        }
        catch(e){
            console.log(e);
            reject(e);
        }
        resolve(savedKo);        
    })
}

module.exports = function(controller) {
    controller.on('direct_message , direct_mention', function(bot, message) {

        if(!store.get(message.user)) {
            console.log("User not found in local storage.");
            return ;
        }

        if(message.intent === "ideastorm_intent"){

            if(ideastorm_replies.flag === "one_by_one") {
                
                bot.createConversation(message, function(err, convo) {

                    convo.setVar("ideastorm_reply", ideastorm_replies["bot_replies"][Math.floor(Math.random()*4)]["statement"])
    
                    convo.addQuestion({
                        text : "{{{vars.ideastorm_reply}}}"
                    },
                    [
                        {
                            pattern : bot.utterances.quit,
                            callback : function(res, convo) {
                                console.log("cancelled");
                                convo.say({
                                    text : "Ok, that's fine. You can always add an additional idea by typing 'ideabolt' (one idea) or 'ideastorm' (many ideas) or develop one of your ideas further by typing 'deepdive'."
                                })
                                convo.next();
                            }
                        },
                        {
                            default : true,
                            callback : async function(res, convo) {
                                if(res.text.length < 140){
                                    bot.reply(message, "An idea description should contain a minimum of 140 characters. If you want to stop entering ideas, type 'cancel'.")
                                    convo.repeat();
                                    return ;
                                }
                                let url = `${process.env.BACKEND_API_URL}/api/v1/kos`;
                                let data = {
                                    ideaOwner : store.get(message.user),
                                    ideaDescription : res.text,
                                    ideaName : res.text.slice(0,200)
                                }
                                console.log(url);
                                try {
                                    let savedKo = await storeKo(url, data);
                                    console.log("data was saved successfully");
                                }
                                catch(e){
                                    console.log(e);
                                    convo.setVar("ideastorm_reply", ideastorm_replies["bot_replies"][Math.floor(Math.random()*4)]["statement"])
                                }
                                convo.setVar("ideastorm_reply", ideastorm_replies["bot_replies"][Math.floor(Math.random()*4)]["statement"])
                                convo.gotoThread("idea_input_thread");
                                convo.next();
                            }
                        }
                    ],
                    {},
                    "idea_input_thread");


                    convo.say({
                        text : "The first step in generating an 'amazing' idea is generating 'many' ideas."
                    });


                    convo.say({
                        text : "A good idea description isn't too long or too short. It should be between 140 to 256 characters. It describes what your business does, for what customer, why and how your product or service benefits that customer in a way that matters."
                    })

        
                    convo.ask({
                        text: "Type your first idea below. Go ahead. Our algorithms :robot_face: will do some quick research for each one in the background. Once you are done generating ideas, type 'deepdive' and pick one idea to develop further. Let's start.\nIf you want to stop, please type 'cancel'.",
                    },
                    [
                        {
                            pattern : bot.utterances.quit,
                            callback : function( res, convo) {
                                convo.sayFirst({
                                    text : "Ok, that's fine. You can always add an additional idea by typing 'ideabolt' (one idea) or 'ideastorm' (many ideas) or develop one of your ideas further by typing 'deepdive'."
                                })
                                convo.next();
                            }
                        },
                        {
                            default : true,
                            callback : async function(res, convo) {
                                if(res.text.length < 140){
                                    bot.reply(message, "An idea description should contain a minimum of 140 characters. If you want to stop entering ideas, type 'cancel'.")
                                    convo.repeat();
                                    return ;
                                }
                                let url = `${process.env.BACKEND_API_URL}/api/v1/kos`;
                                let data = {
                                    ideaOwner : store.get(message.user),
                                    ideaDescription : res.text,
                                    ideaName : res.text.slice(0,200),
                                }
                                console.log(url, data);
                                try {
                                    const savedKo = await storeKo(url, data);
                                    console.log("data was saved successfully");
                                }
                                catch(e){
                                    console.log("some error occurred");
                                }
                                convo.setVar("ideastorm_reply", ideastorm_replies["bot_replies"][Math.floor(Math.random()*4)]["statement"])
                                convo.gotoThread("idea_input_thread");
                                convo.next();
                            }   
                        }
                    ]);
                    convo.activate();
                });
            }
        }
    })
}