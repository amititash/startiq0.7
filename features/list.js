const store = require('../store/store');
const axios = require('axios');


module.exports = function(controller) {

    controller.on('message, direct_message, direct_mention', async (bot, message) => {
        if(!store.get(message.user)) {
            console.log("User not found in the local storage.");
            return ;
        }

        if(message.text === "list") {
            let ideas = [];
            let url = `${process.env.BACKEND_API_URL}/api/v1/kos?emailId=${store.get(message.user)}`;
            try {
                let response = await axios.get(url);
                ideas = response.data;
            }
            catch(e) {
                console.log(e);
            }
            if(!ideas.length) {
                await bot.reply(message, "You don't have any ideas in your binder.")
            }
            else {
                await bot.reply(message, "You have following ideas in your binder.");
                let ideasString = "";
                ideas.forEach( async (idea) => {
                    ideasString += `${idea.ideaDescription}\n`
                })
                await bot.reply(message, ideasString);
            }
        }
    })
    
}