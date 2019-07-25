const store = require('../store/store');
const axios = require('axios');


module.exports = function(controller) {
    controller.on('direct_message', function(bot, message){
        let userInfo = {};
        if( !store.get(message.user) ){
            bot.createConversation(message, function(err, convo) {
                
                convo.ask({
                    text : "Hi ! I am the StartIQ bot. Kindly provide your e-mail id for registration purpose."
                },
                [
                    {
                        pattern : bot.utterances.quit,
                        callback : function(res, convo) {
                            bot.reply(message, "Incomplete registration. Please register yourself to use the platform.");
                            convo.stop();
                            convo.next();
                        }
                    },
                    {
                        default : true,
                        callback : function(res, convo) {
                            let email = res.text;
                            try {
                                email = email.slice(email.indexOf('|')+1).slice(0,-1);
                            }
                            catch(e) {
                                console.log("Error in converting email", e);
                            }
                            userInfo.email = email;
                            store.set(message.user, userInfo.email);
                            convo.next();
                        }
                    }
                ]);


                convo.ask({
                    text : "Thank you. May I know your name please ?"
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
                            let name = res.text;
                            convo.setVar("username", name);
                            userInfo.username = name;
                            convo.next();
                        }
                    }
                ]);
                
                

                convo.ask({
                    text : "Which university are you enrolled in ?"
                },
                [
                    {
                        pattern : bot.utterances.quit,
                        callback : function(res, convo) {
                            convo.next();
                        }
                    },
                    {
                        default : true,
                        callback : function(res, convo) {
                            let organisation = res.text;
                            userInfo.organisation = organisation
                            convo.next();
                        }
                    }
                ]);
                

                convo.ask({
                    text : "What is your core skillset (business, tech etc.)?  "
                },
                [
                    {
                        pattern : bot.utterances.quit,
                        callback : function(res, convo) {

                            convo.next();
                        }
                    },
                    {
                        default : true,
                        callback : function(res, convo) {
                            let skillset = res.text;
                            userInfo.bio = skillset;

                            //Now we have complete data, so save it. 
                            let url = `${process.env.BACKEND_API_URL}/api/v1/users`;
                            axios.post(url, userInfo)
                                .then ( response => {
                                    console.log("User details saved" , response.data);
                                    
                                    convo.gotoThread("save_responses_thread");
                                    convo.next()
                                })
                                .catch( error => {
                                    console.log("Error occurred in saving user details", error);
                                    throw error;
                                })
                        }
                    }
                ]);
                

                convo.addMessage({
                    text : "Hello {{vars.username}}. Welcome to the platform. Now you many proceed by typing 'ideastorm' for recording multiple ideas, or you may type 'deepdive' for exploring a particular idea or 'rank ideas' to list ideas by ranking."
                },"save_responses_thread");

                convo.activate();
            })
        }
    })
}


