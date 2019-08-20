const store = require('../store/store');
const axios = require('axios');
const userProfile = require('../utils/userProfile');

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
                convo.setVar("user_name", userInfo.username);
                convo.setVar("user_email", userInfo.email);
                
                
                convo.addMessage({
                    text : "Hi there! I'm StartIQ. I am here to help you develop your business ideas super fast with a little bit of machine learning. 🤖",
                },"default");

                convo.addMessage({
                    text : "Working with me is easy. Just type 'ideastorm' to start brainstorming.",
                    action : "signup_thread"
                },"default");

                



                convo.beforeThread("signup_thread", async function(convo, next){
                    let mailUrl = `${process.env.NOTIFICATION_API_URL}/send-email`;
                    let mailData = {
                        to : [store.get(message.user)],
                        from : "engineering@startiq.org",
                        subject : "StartiQ",
                        body : `Hi ${userInfo.username}! Welcome to StartiQ. We are happy to have you on our platform`
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
                    text : "Or type 'help' at any time to see more options.✏️",
                    action : "user_reg_complete_thread"
                },"signup_thread")
                


                convo.beforeThread("user_reg_complete_thread", async function(convo, next) {
                    console.log(userInfo);
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
                    text : "Cool! there are three ways in which you can do ideation\n1. say “deepdive” for a 10 minute session. deep analysis of your startup idea  using AI\n2. say “ideabolt” for a quick review of your idea using AI\n3. say “ideastorm” for rapidly listing a bunch of ideas which you can revisit later"
                },"generate_ideas_thread");

                

                convo.addMessage({
                    text : "No problem, You can complete your registration process later."
                },"early_exit_thread");
                

              


                
                convo.activate();
            })
        }
    })
}