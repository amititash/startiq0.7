const store = require('../store/store');
const axios = require('axios');

module.exports = function(controller) {
    controller.on('direct_message', function(bot, message){
        let userInfo = {};
        if( !store.get(message.user) ){
            bot.createConversation(message, function(err, convo) {
                
                convo.say({
                    text : "Hi there !  Welcome to StartiQ. I am a science-backed assistant to help you develop and research your business ideas."
                })
                convo.ask({
                    text : "Let's begin by signing you up for a free account. What is your email address ?"
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

                //Currently we save the user into db only after flow wholly complete. But we store user's mail locally at 
                //the moment he enters his email id. So next time he won't be prompted for sign up until local storage cleared.

                convo.ask({
                    text : "Great. What is your first name and last name?"
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
                        callback : async function(res, convo) {
                            let name = res.text;
                            convo.setVar("username", name.split(' ')[0]);
                            userInfo.username = name;
                            let mailUrl = `${process.env.NOTIFICATION_API_URL}/send-email`;
                            let mailData = {
                                to : [store.get(message.user)],
                                from : "engineering@startiq.org",
                                subject : "StartiQ",
                                body : `Hi ${name}! Welcome to StartiQ. We are happy to have you on our platform`
                            }
                            try {
                                await axios.post(mailUrl, mailData);
                            }
                            catch(e){
                                console.log("email not sent");
                                console.log(e.message);
                            }
                            convo.next();
                        }
                    }
                ]);
                
                

                convo.say({
                    text : "Fantastic, {{vars.username}}! I've sent you a confirmation email. Just click on the link inside it and your account will be ready to go. "
                });

                convo.say({
                    text : "Your account is live. Let's do it!"
                });
                
                convo.ask({
                    text : "We can begin by developing a quick assessment of you as an entrepreneur or jump right into generating ideas.",
                    attachments:[
                        {
                            title: `What would you prefer ?`,
                            callback_id: 'ideate_or_build_profile',
                            attachment_type: 'default',
                            actions: [
                                {
                                    "name":"build profile",
                                    "text": "Build Profile",
                                    "value": "build_profile",
                                    "type": "button",
                                },
                                {
                                    "name" : "ideate",
                                    "text": "Ideate",
                                    "value": "ideate",
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
                            convo.next();
                        }
                    },
                    {
                        pattern : "build_profile",
                        callback : function(res, convo) {
                            convo.gotoThread("build_profile_thread");
                            convo.next();   
                        }
                    },
                    {
                        pattern : "ideate",
                        callback :function(res, convo) {
                            convo.gotoThread("build_profile_thread");
                            convo.next();
                        }
                    },
                    {
                        default : true,
                        callback : function(res, convo) {

                            convo.repeat();
                            convo.next();
                            // let skillset = res.text;
                            // userInfo.bio = skillset;

                            // //Now we have complete data, so save it. 
                            // let url = `${process.env.BACKEND_API_URL}/api/v1/users`;
                            // axios.post(url, userInfo)
                            //     .then ( response => {
                            //         console.log("User details saved" , response.data);
                                    
                            //         convo.gotoThread("save_responses_thread");
                            //         convo.next()
                            //     })
                            //     .catch( error => {
                            //         console.log("Error occurred in saving user details", error);
                            //         throw error;
                            //     })
                        }
                    }
                ]);
                

                convo.addMessage({
                    text : "Ok, we'll work on your profile. A lot of what will make your business successful is what you bring to the table. Research shows that three factors matter most."
                },"build_profile_thread");

                convo.addMessage({
                    text : "Lets begin with your goals. Which of the following statements best describe your intended business?"
                },"build_profile_thread");
                
                convo.addQuestion({
                    text : "I want to build:\n1. A sustainable business that supports me and my family($100k to 1m revenue).\n2. A company that can reach a $20 to $50 million dollar evaluation.\n3. A large enterprise valued at more that $50m (yes, that included unicorns with $1b plus valuations)."
                },
                [
                    {
                        pattern : bot.utterances.quit,
                        callback : function(res, convo) {
                            convo.next();
                        }
                    },
                    {
                        pattern : "1",
                        callback : function(res, convo) {

                            convo.next();
                        }
                    },
                    {
                        pattern : "2",
                        callback : function(res, convo) {

                            convo.next();
                        }
                    },
                    {
                        pattern : "3",
                        callback : function(res, convo) {

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
                "build_profile_thread");


                convo.addQuestion({
                    text : "Your skills matter too. Here are three common profiles of people who build tech startups.",
                    attachments:[
                        {
                            title: ` Do any of these sound like you? If not, type more for a few additional profiles.`,
                            callback_id: 'common_profiles',
                            attachment_type: 'default',
                            actions: [
                                {
                                    "name":"full stack developer",
                                    "text": "Full Stack Developer",
                                    "value": "full_stack_developer",
                                    "type": "button",
                                },
                                {
                                    "name" : "marketing maven",
                                    "text": "Marketing Maven",
                                    "value": "marketing_maven",
                                    "type": "button",
                                },
                                {
                                    "name" : "the manager",
                                    "text": "The Manager",
                                    "value": "the_manager",
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

                            convo.next();
                        }
                    },
                    {
                        pattern : "full_stack_developer",
                        callback : function(res, convo) {

                            convo.next();
                        }
                    },
                    {
                        pattern : "marketing_maven",
                        callback : function(res, convo) {

                            convo.next();
                        }
                    },
                    {
                        pattern : "the_manager",
                        callback : function(res, convo) {

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
                "build_profile_thread");


                convo.addQuestion({
                    text : "Awesome. Let's dig a bit deeper into your skills. Which of these technologies do you know?\n1. Full Stack Developer\n2. Data Scientist\n3. Manager\n4. Designer\n5. Marketing maven"
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
                            convo.next();
                        }
                    }
                ],
                {},
                "build_profile_thread");

                convo.addMessage({
                    text : "That is all for now. If you want more tool to help you understand yourself better as a founder, just type founderquiz in the prompt."
                },"build_profile_thread");
                

                convo.activate();
            })
        }
    })
}