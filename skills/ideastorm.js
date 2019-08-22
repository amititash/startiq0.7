const store = require('../store/store');
const axios = require('axios');
const logger = require('../utils/logger');


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
            let ideaCount = 0;
            if(ideastorm_replies.flag === "one_by_one") {
                
                bot.createConversation(message, function(err, convo) {

                    logger.info(message.text,{
                        userid : message.user,
                        convo : true
                    });

                    convo.setVar("ideastorm_reply", ideastorm_replies["bot_replies"][Math.floor(Math.random()*4)]["statement"])
                    convo.setVar("idea_count", 0);

                    convo.say({
                        text : "Alright, let's start!"
                    });

                    convo.say({
                        text : "Research shows that to generate a great idea you should brainstorm as many ideas as possible."
                    });

                    convo.say({
                        text : "A good idea isn't too long or too short. But it should, at least, tell us who your customer is, what you will do for them, and how you will get paid."
                    });

                    convo.say({
                        text: "Type your first idea below. Go ahead. Our algorithms :robot_face: will do some quick research for each one in the background. Once you are done generating ideas, type 'deepdive' and pick one idea to develop further.",
                    });

                    convo.say({
                        text : "Let's go.✏️"
                    });

                    convo.ask({
                        text: "If you want to stop, please type 'cancel' at any time.",
                    },
                    [
                        {
                            pattern : bot.utterances.quit,
                            callback : function( res, convo) {
                                convo.gotoThread("exit_thread");
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
                                ideaCount ++;
                                convo.setVar("ideastorm_reply", ideastorm_replies["bot_replies"][Math.floor(Math.random()*4)]["statement"])
                                convo.gotoThread("idea_input_thread");
                                convo.next();
                            }   
                        }
                    ]);



                    convo.addQuestion({
                        text : "{{{vars.ideastorm_reply}}}"
                    },
                    [
                        {
                            pattern : bot.utterances.quit,
                            callback : function(res, convo) {
                                convo.gotoThread("exit_thread");
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
                                ideaCount++;
                                convo.setVar("ideastorm_reply", ideastorm_replies["bot_replies"][Math.floor(Math.random()*4)]["statement"])
                                convo.gotoThread("idea_input_thread");
                                convo.next();
                            }
                        }
                    ],
                    {},
                    "idea_input_thread");

                    convo.beforeThread("exit_thread", function(convo, next){
                        convo.setVar("idea_count", ideaCount);
                        next();
                    })


                    convo.addMessage({
                        text : "You came up with {{{vars.idea_count}}} ideas in this session! The average person comes up with 6.3 ideas."
                    },"exit_thread");


                    convo.addMessage({
                        text : "If you want to do a deep dive on one of your ideas type 'deepdive' 💦."
                    },"exit_thread");


                    convo.on('end', function(convo){
                        console.log("doomsday");
                        logger.info(message.text,{
                            userid : message.user,
                            convo : false
                        });
                    })


                    convo.activate();
                });
            }
        }
    })
}