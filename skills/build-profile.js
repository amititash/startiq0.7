const store = require('../store/store');

module.exports = function(controller) {
    controller.on('direct_message, message', function(bot, message) {
        if(!store.get(message.user)){
            console.log("user not found");
            return ;
        }
        if(message.intent === "build_profile_intent"){
            let userInfo = {};
            let skillMap = {};
            let connectionsMap = {};

            bot.createConversation(message, function(err, convo) {

                logger.log({
                    level : "info",
                    message : message.text,
                    metadata : {
                        convo : true,
                        userId : store.get(message.user)
                    }
                });

                convo.ask({
                    text : "We can begin by developing a quick assessment of you as an entrepreneur or jump right into generating ideas.",
                    attachments:[
                        {
                            title: `What would you prefer?`,
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
                            convo.gotoThread("early_exit_thread");
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
                        }
                    }
                ]);
                

                convo.addMessage({
                    text : "Ok, we'll work on your profile. A lot of what will make your business successful is what you bring to the table. Research shows that three factors matter most."
                },"build_profile_thread");

                convo.addMessage({
                    text : "Let's begin with your goals. Which of the following statements best describes your intended business?"
                },"build_profile_thread");
                
                convo.addQuestion({
                    text : "I want to build:\n1. A sustainable business that supports me and my family ($100k to 1m revenue).\n2. A business that can reach a $20 to $50 million dollar valuation.\n3. A large business valued at more than $50M (yes, that includes unicorns with $1B plus valuations)."
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
                        pattern : "1",
                        callback : function(res, convo) {
                            userInfo.founderGoal = "A sustainable business that supports me and my family ($100k to 1m revenue)" 
                            convo.next();
                        }
                    },
                    {
                        pattern : "2",
                        callback : function(res, convo) {
                            userInfo.founderGoal = "A business that can reach a $20 to $50 million dollar valuation."
                            convo.next();
                        }
                    },
                    {
                        pattern : "3",
                        callback : function(res, convo) {
                            userInfo.founderGoal = "A large business valued at more than $50M (yes, that includes unicorns with $1B plus valuations)."
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
                            title: ` Do any of these descriptions sound like you? If not, type more for a few additional profiles.`,
                            callback_id: 'common_profiles',
                            attachment_type: 'default',
                            actions: [
                                {
                                    "name":"full stack developer",
                                    "text": "Full-Stack developer",
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
                            convo.gotoThread("early_exit_thread");
                            convo.next();
                        }
                    },
                    {
                        pattern : "full_stack_developer",
                        callback : function(res, convo) {
                            userInfo.founderRole = res.text;
                            convo.gotoThread("full_stack_developer_thread");
                            convo.next();
                        }
                    },
                    {
                        pattern : "marketing_maven",
                        callback : function(res, convo) {
                            userInfo.founderRole = res.text;
                            convo.gotoThread("marketing_maven_thread");
                            convo.next();
                        }
                    },
                    {
                        pattern : "the_manager",
                        callback : function(res, convo) {
                            userInfo.founderRole = res.text;
                            convo.gotoThread("manager_thread");
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


                convo.beforeThread("full_stack_developer_thread", function(convo, next){
                    skillMap["1"] = "Javascript, Node etc.";
                    skillMap["2"] = "Ruby etc.";
                    skillMap["3"] = "C++ etc."
                    next(); 
                })


                convo.addQuestion({
                    text : "Awesome. :+1: Let's dig a bit deeper into your skills. Which of these do you know?\n1. Javascript, Node etc.\n2. Ruby etc.\n3. C++ etc."
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
                            let numbers = res.text.split(',');
                            let founderSkills = [];
                            numbers.forEach( number => {
                                if(skillMap[`${number}`]){
                                    founderSkills.push(skillMap[`${number}`]);
                                }
                            }) 
                            userInfo.founderSkills = founderSkills;
                            convo.gotoThread("connections_thread");
                            convo.next();
                        }
                    }
                ],
                {},
                "full_stack_developer_thread");


                convo.beforeThread("manager_thread", function(convo, next){
                    skillMap["1"] = "team management";
                    skillMap["2"] = "project management";
                    skillMap["3"] = "pitch decks and customer interfacing";
                    skillMap["4"] = "hiring";
                    next(); 
                })

                convo.addQuestion({
                    text : "Awesome. :+1: Let's dig a bit deeper into your skills. Which of these do you know?\n1. team management\n2. project management\n3. pitch decks and customer interfacing\n4. hiring"
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
                            let numbers = res.text.split(',');
                            let founderSkills = [];
                            numbers.forEach( number => {
                                if(skillMap[`${number}`]){
                                    founderSkills.push(skillMap[`${number}`]);
                                }
                            }) 
                            userInfo.founderSkills = founderSkills;
                            convo.gotoThread("connections_thread");
                            convo.next();
                        }
                    }
                ],
                {},
                "manager_thread");


                convo.beforeThread("marketing_maven_thread", function(convo, next){
                    skillMap["1"] = "SEO and Digital advertising";
                    skillMap["2"] = "B2B and SaaS relationships";
                    skillMap["3"] = "Sales team handling and experience";
                    skillMap["4"] = "Consumer Internet marketing";
                    next(); 
                })


                convo.addQuestion({
                    text : "Awesome. :+1: Let's dig a bit deeper into your skills. Which of these do you know?\n1. SEO and Digital advertising\n2. B2B and SaaS relationships\n3. Sales team handling and experience\n4. Consumer Internet marketing\n"
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
                            let numbers = res.text.split(',');
                            let founderSkills = [];
                            numbers.forEach( number => {
                                if(skillMap[`${number}`]){
                                    founderSkills.push(skillMap[`${number}`]);
                                }
                            }) 
                            userInfo.founderSkills = founderSkills;
                            convo.gotoThread("connections_thread");
                            convo.next();
                        }
                    }
                ],
                {},
                "marketing_maven_thread");


                convo.beforeThread("connections_thread", function(convo, next) {
                    connectionsMap["1"] = "Full-Stack Developer";
                    connectionsMap["2"] = "Data scientist";
                    connectionsMap["3"] = "Manager";
                    connectionsMap["4"] = "Designer";
                    connectionsMap["5"] = "Marketing maven";
                    next();
                })


                convo.addQuestion({
                    text : "OK, great. Can you provide a link to your LinkedIn profile?"
                },
                [
                    {
                        pattern : bot.utterances.quit,
                        callback : function(res, conv) {
                            convo.gotoThread("early_exit_thread");
                            convo.next();
                        }
                    },
                    {
                        default : true,
                        callback : function(res, convo) {
                            userInfo.bio = res.text;
                            convo.next();
                        }
                    }
                ],
                {},
                "connections_thread");


                convo.addQuestion({
                    text : "Finally, do you know any people that fit the following description? Just type the numbers associated with their roles separated by commas.\n1. Full-Stack developer\n2. Data scientist\n3. Manager\n4. Designer\n5. Marketing maven"
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
                            let numbers = res.text.split(',');
                            let founderConnections = [];
                            numbers.forEach( number => {
                                if(connectionsMap[`${number}`]) {
                                    founderConnections.push(connectionsMap[`${number}`])
                                }
                            })
                            userInfo.founderConnections = founderConnections;
                            convo.gotoThread("user_reg_complete_thread");
                            convo.next();
                        }
                    }
                ],
                {},
                "connections_thread");


                convo.beforeThread("user_reg_complete_thread", async function(convo, next) {
                    console.log(userInfo);
                    let url = `${process.env.BACKEND_API_URL}/api/v1/users`;
                    let data = userInfo;
                    // try {
                    //     await axios.post(url, data);
                    // }
                    // catch(e) {  
                    //     console.log("user not saved" , e.message);
                    // }
                    next(); 
                })

                convo.addMessage({
                    text : "No problem, you can complete your registration process later."
                },"early_exit_thread");

                convo.addMessage({
                    text : "That is all for now. I have a good sense of your skills. If you want more tools to help you understand yourself better as a founder, just type 'founder'. Otherwise, you can start developing ideas by typing 'ideastorm' in the prompt."
                },"user_reg_complete_thread");


                convo.on('end', function(convo){
                    logger.log({
                        level : "info",
                        message : message.text,
                        metadata : {
                            convo : false,
                            userId : store.get(message.user)
                        }
                    });
                })
                

                convo.activate();
            })
        }
    })
}