const store = require('../store/store');
const axios = require('axios');
module.exports = function(controller) {

    controller.on('direct_message, direct_mention', async function(bot, message) {
        if(!store.get(message.user)) {
            console.log("User not found in the local storage.");
            return ;
        }


        if(message.text === "list") {
            let url = `${process.env.BACKEND_API_URL}/api/v1/kos?emailId=${store.get(message.user)}`;
            axios.get(url)
                .then ( response => {
                    let ideas = response.data;
                    bot.createConversation( message, function(err, convo) {
                        if(!ideas.length){
                            convo.say({
                                text : "You don't have any ideas in your binder."
                            })
                        }
                        else {
                            convo.say({
                                text : 'Following are the ideas in your binder.'
                            })
                            ideas.forEach( idea => {
                                convo.say({
                                    text : idea.ideaName
                                })
                            })
                        }
                        convo.activate();
                    })
                })
                .catch( e => {
                    bot.reply(message, "Some error occurred");
                    console.log(e);
                })
        }
    })
    
}