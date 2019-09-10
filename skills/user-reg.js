const store = require('../store/store');
const axios = require('axios');
const userProfile = require('../utils/userProfile');
const logger = require('../utils/logger');

module.exports = function(controller) {
    controller.on('message,direct_message,custom_help_event,custom_greet_event', async function(bot, message){
        let userInfo = {};
        let skillMap = {};
        let connectionsMap = {};
        let slackInfo = {};
        if( !store.get(message.user) ){
            try {
                slackInfo = await userProfile.slackUserProfile(message.user);
                userInfo.username = (slackInfo.userRealName ? slackInfo.userRealName : slackInfo.userDisplayName );
                userInfo.email = slackInfo.userEmail;
                store.set(message.user, userInfo.email);
            }
            catch(e){
                console.log("error fetching slack data", e);
            }
            bot.createConversation(message, function(err, convo) {

                logger.log({
                    level : "info",
                    message : message.text,
                    metadata : {
                        convo : true,
                        userId : store.get(message.user)
                    }
                });


                convo.setVar("user_name", userInfo.username);
                convo.setVar("user_email", userInfo.email);


                convo.addMessage({
                    text : "Hi there! I'm StartIQ. I am here to help you develop your business ideas super fast with a little bit of machine learning. 🤖",
                },"default");

                convo.addMessage({
                    text : "Working with me is easy. Just type `ideastorm` to start brainstorming.",
                    action : "signup_thread"
                },"default");





                convo.beforeThread("signup_thread", async function(convo, next){
                    let mailUrl = `${process.env.NOTIFICATION_API_URL}/send-email`;
                    let mailData = {
                        to : [store.get(message.user)],
                        from : "engineering@startiq.org",
                        subject : "StartiQ",
                        body : `Hi ${userInfo.username}! Welcome to StartiQ. We are happy to have you on our platform`,
                        // templateId : "d-f8b5a2347aec48bebbb25cb224fd1e1f",
                        // dynamic_template_data : {
                        //     name : userInfo.username
                        // }
                    }
                    try {
                        await axios.post(mailUrl, mailData);
                    }
                    catch(e){
                        console.log("email not sent");
                        console.log(e.message);
                    }
                    next();
                })


                convo.addMessage({
                    text : "Or type `help` at any time to see more options.✏️",
                    action : "user_reg_complete_thread"
                },"signup_thread")



                convo.beforeThread("user_reg_complete_thread", async function(convo, next) {
                    let url = `${process.env.BACKEND_API_URL}/api/v1/users`;
                    let data = userInfo;
                    try {
                        await axios.post(url, data);
                    }
                    catch(e) {
                        console.log("user not saved" , e.message);
                    }
                    next();
                })



                convo.addMessage({
                    text : "No problem, You can complete your registration process later."
                },"early_exit_thread");


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
