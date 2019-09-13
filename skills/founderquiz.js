const store = require('../store/store');
const logger = require('../utils/logger');
const slackProfile = require('../utils/userProfile');
const axios = require('axios');

module.exports = function(controller){
    controller.on('direct_message,message', async function(bot, message){
        if(!store.get(message.user)) {
            console.log("User not found in local storage.");
            return ;
        }

        if(message.text === "founderquiz" || message.intent === "build_profile_intent") {
            let userName = "";
            let creativityScores = [];
            try {
                let slackInfo = await slackProfile.slackUserProfile(message.user);
                userName = slackInfo.userRealName || slackInfo.userDisplayName;
                userName = userName.slice(0,userName.indexOf(' '));
            }
            catch(e){
                console.log("error in slack user profile api", e);
            }
            bot.createConversation(message, function(err, convo){
                convo.addMessage({
                    text : `Hey ${userName}! Research shows that the best leaders know their strengths and weaknesses.💪`
                },"default");

                convo.addQuestion({
                    attachments:[
                        {
                            title :  "I have a lot of tools to help you understand yourself better as a founder. Are you ready to get started?",
                            callback_id: '123',
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
                            convo.gotoThread("exit_thread");
                            convo.next();
                        }
                    },
                    {
                        pattern: "yes",
                        callback: function(reply, convo) {
                            convo.gotoThread("self_assessment_thread");
                            convo.next();
                        }
                    },
                    {
                        pattern: "no",
                        callback: function(reply, convo) {
                            convo.gotoThread("exit_thread");
                            convo.next();
                        }
                    },
                    {
                        default: true,
                        callback: function(reply, convo) {
                            convo.repeat();
                            convo.next();
                        }
                    }
                ],
                {},
                "default");


                convo.addQuestion({
                    text : "Which of these self-assessments do you want to start with?\n1. Creative self-efficacy\n2. Mastery orientation\n3. Performance-approach orientation"
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
                        pattern : "1",
                        callback : function(res, convo) {
                            convo.gotoThread("creative_self_efficacy_thread");
                            convo.next();
                        }
                    },
                    {
                        pattern : "2",
                        callback : function(res, convo) {
                            convo.gotoThread("creative_self_efficacy_thread");
                            convo.next();
                        }
                    },
                    {
                        pattern : "3",
                        callback : function(res, convo) {
                            convo.gotoThread("creative_self_efficacy_thread");
                            convo.next();
                        }
                    },
                    {
                        default: true,
                        callback: function(reply, convo) {
                            convo.repeat();
                            convo.next();
                        }
                    }
                ],
                {},
                "self_assessment_thread");


                convo.addMessage({
                    text : "Awesome. I'm going to ask you about three statements, just tell me how true they are about you on a scale of 1 to 5.🔍"
                },"creative_self_efficacy_thread");

                convo.addQuestion({
                    attachments:[
                        {
                            title : `"I am good at coming up with new ideas."`,
                            callback_id: '123',
                            attachment_type: 'default',
                            actions: [
                                {
                                    "name":"1",
                                    "text": "1 (not true)",
                                    "value": "1",
                                    "type": "button",
                                },
                                {
                                    "name":"2",
                                    "text": "2",
                                    "value": "2",
                                    "type": "button",
                                },
                                {
                                    "name":"3",
                                    "text": "3",
                                    "value": "3",
                                    "type": "button",
                                },
                                {
                                    "name":"4",
                                    "text": "4",
                                    "value": "4",
                                    "type": "button",
                                },
                                {
                                    "name":"5",
                                    "text": "5 (very true)",
                                    "value": "5",
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
                            convo.gotoThread("exit_thread");
                            convo.next();
                        }
                    },
                    {
                        default : true,
                        callback : function(res, convo){
                            let score = parseInt(res.text);
                            if(isNaN(score) || score<1 || score > 5){
                                bot.reply(message, {
                                    text : "Please use the buttons below for replying to this question"
                                });
                                convo.repeat();
                            }
                            else {
                                convo.setVar("first_answer", res.text);
                                creativityScores.push(score);
                            }
                            convo.next();
                        }
                    }
                ],
                {},
                "creative_self_efficacy_thread");


                convo.addQuestion({
                    attachments:[
                        {
                            title : `"I have a lot of good ideas."`,
                            callback_id: '123',
                            attachment_type: 'default',
                            actions: [
                                {
                                    "name":"1",
                                    "text": "1 (not true)",
                                    "value": "1",
                                    "type": "button",
                                },
                                {
                                    "name":"2",
                                    "text": "2",
                                    "value": "2",
                                    "type": "button",
                                },
                                {
                                    "name":"3",
                                    "text": "3",
                                    "value": "3",
                                    "type": "button",
                                },
                                {
                                    "name":"4",
                                    "text": "4",
                                    "value": "4",
                                    "type": "button",
                                },
                                {
                                    "name":"5",
                                    "text": "5 (very true)",
                                    "value": "5",
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
                            convo.gotoThread("exit_thread");
                            convo.next();
                        }
                    },
                    {
                        default : true,
                        callback : function(res, convo){
                            let score = parseInt(res.text);
                            if(isNaN(score) || score<1 || score > 5){
                                bot.reply(message, {
                                    text : "Please use the buttons below for replying to this question"
                                });
                                convo.repeat();
                            }
                            else {
                                convo.setVar("first_answer", res.text);
                                creativityScores.push(score);
                            }
                            convo.next();
                        }
                    }
                ],
                {},
                "creative_self_efficacy_thread");




                convo.addQuestion({
                    attachments:[
                        {
                            title : `Ok, last one. :"I have a good imagination."🎯`,
                            callback_id: '123',
                            attachment_type: 'default',
                            actions: [
                                {
                                    "name":"1",
                                    "text": "1 (not true)",
                                    "value": "1",
                                    "type": "button",
                                },
                                {
                                    "name":"2",
                                    "text": "2",
                                    "value": "2",
                                    "type": "button",
                                },
                                {
                                    "name":"3",
                                    "text": "3",
                                    "value": "3",
                                    "type": "button",
                                },
                                {
                                    "name":"4",
                                    "text": "4",
                                    "value": "4",
                                    "type": "button",
                                },
                                {
                                    "name":"5",
                                    "text": "5 (very true)",
                                    "value": "5",
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
                            convo.gotoThread("exit_thread");
                            convo.next();
                        }
                    },
                    {
                        default : true,
                        callback : async function(res, convo){
                            let score = parseInt(res.text);
                            if(isNaN(score) || score<1 || score > 5){
                                bot.reply(message, {
                                    text : "Please use the buttons below for replying to this question"
                                });
                                convo.repeat();
                            }
                            else {
                                convo.setVar("first_answer", res.text);
                                creativityScores.push(score);
                                let url = `${process.env.BACKEND_API_URL}/api/v1/users/founderquiz/creativityScore`;
                                console.log(url);
                                let data = {
                                    creativityScores,
                                    emailId : store.get(message.user)
                                }
                                try {
                                    let response = await axios.post(url, data);

                                    console.log(response.data);
                                    let average = response.data.average;
                                    let popularAverage = 3.42;
                                    convo.setVar("average_creativity_score", average);
                                    let comment = `You are somewhat ${average >= popularAverage ? "above" : "below"} average. The best way to improve your self-efficacy is to practice generating ideas. Do you want to see some creativity tips?`;
                                    if(average < 2.25 ){
                                        // comment = ""
                                    }
                                    else if(average > 3.5){
                                        // comment = ""
                                    }
                                    else {
                                        // comment = ""
                                    }
                                    convo.setVar("creativity_comment", comment);
                                }
                                catch(e){
                                    console.log(e);
                                }
                            }
                            convo.next();
                        }
                    }
                ],
                {},
                "creative_self_efficacy_thread");


                convo.addQuestion({
                    attachments:[
                        {
                            title: "Your creative self-efficacy score is {{{vars.average_creativity_score}}}. The average person has a score of 3.42. {{{vars.creativity_comment}}}",
                            callback_id: '123',
                            attachment_type: 'default',
                            actions: [
                                {
                                    "name":"yes",
                                    "text": "Yup",
                                    "value": "yes",
                                    "type": "button",
                                },
                                {
                                    "name":"no",
                                    "text": "Not right now",
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
                            convo.gotoThread("exit_thread");
                            convo.next();
                        }
                    },
                    {
                        pattern : "no",
                        callback : function(res, convo) {
                            convo.gotoThread("restart_assessment_thread");
                            convo.next();
                        }
                    },
                    {
                        pattern : "yes",
                        callback : function(res, convo) {
                            convo.gotoThread("creativity_tips_thread")
                            convo.next();
                        }
                    },
                    {
                        default: true,
                        callback: function(reply, convo) {
                            convo.repeat();
                            convo.next();
                        }
                    }
                ],
                {},
                "creative_self_efficacy_thread");


                convo.addMessage({
                    text : "Here is a great link to the American Psychological Association' research-backed tips on boosting creativity: https://www.apa.org/gradpsych/2009/01/creativity",
                    action : "restart_assessment_thread"
                },"creativity_tips_thread");

                convo.addQuestion({
                    attachments:[
                        {
                            title : "Up for another quick assessment?",
                            callback_id: '123',
                            attachment_type: 'default',
                            actions: [
                                {
                                    "name":"yes",
                                    "text": "Oh yeah!",
                                    "value": "yes",
                                    "type": "button",
                                },
                                {
                                    "name":"no",
                                    "text": "Maybe later",
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
                            convo.gotoThread("exit_thread");
                            convo.next();
                        }
                    },
                    {
                        pattern : "no",
                        callback : function(res, convo) {
                            convo.gotoThread("exit_thread");
                            convo.next();
                        }
                    },
                    {
                        pattern : "yes",
                        callback : function(res, convo) {
                            creativityScores = [];
                            convo.gotoThread("self_assessment_thread");
                            convo.next();
                        }
                    },
                    {
                        default: true,
                        callback: function(reply, convo) {
                            convo.repeat();
                            convo.next();
                        }
                    }
                ],
                {},
                "restart_assessment_thread")


                convo.addMessage({
                    text : "Thanks for taking the founderquiz, this is a great first step in learning more about your founder superpowers. You can type `founderquiz` to take more diagnostics quizzes."
                },"exit_thread");





                convo.activate();
            })
        }
    })
}
