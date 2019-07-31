const axios = require('axios');
const store = require('../store/store');
const { Botkit, BotkitConversation } = require('botkit');
const ideastorm_replies = require(`../assets/ideastorm/ideastorm_replies${Math.floor(Math.random()*1)+3}`)

module.exports = function(controller) {
    let ideas = [];
    let count = 0;


    const IDEASTORM_DIALOG1_ID = 'ideastorm-dialog1';

    let convo1 = new BotkitConversation(IDEASTORM_DIALOG1_ID, controller);
    
    convo1.before('default', async(convo, bot) => {
        convo.setVar("ideastorm_reply", ideastorm_replies["bot_replies"][Math.floor(Math.random()*3)]["statement"])     
    })

    convo1.before('idea_input_thread', async(convo, bot) => {
        convo.setVar("ideastorm_reply", ideastorm_replies["bot_replies"][Math.floor(Math.random()*3)]["statement"])     
    })
    
    convo1.addQuestion({
        text : "{{vars.ideastorm_reply}}Okay"
    },
    [
        {
            pattern : "cancel",
            type : "string",
            handler : async (res, convo, bot) => {
                await bot.say({
                    text : "Your responses were saved. You can type 'ideastorm' to record multiple ideas or 'deepdive' to pick an idea and work on it."
                })
            }
        },
        {
            default : true,
            type : "string",
            handler : async (res, convo, bot) => {
                let url = `${process.env.BACKEND_API_URL}/api/v1/kos`;
                let slackUserId = convo.step.values.user;
                let data = {
                    ideaOwner : store.get(slackUserId),
                    ideaDescription : res,
                    ideaName : res.slice(0,200)
                }
                try {
                    let response = await axios.post(url, data);
                    console.log("data was saved successfully");
                    convo.setVar("ideastorm_reply", ideastorm_replies["bot_replies"][Math.floor(Math.random()*3)]["statement"])
                    convo.gotoThread("idea_input_thread");
                }
                catch(e){
                    console.log("some error occurred");
                    convo.setVar("ideastorm_reply", ideastorm_replies["bot_replies"][Math.floor(Math.random()*3)]["statement"])
                    convo.gotoThread("idea_input_thread");
                }
            }
        }
    ],
    {},
    "idea_input_thread");


    convo1.ask({
        text: 'Looks like you want to generate multiple ideas quickly, lets do it. Don’t worry about getting it perfect, we can improve the ideas later.',
    },
    [
        {
            pattern : "cancel",
            type : "string",
            handler : async ( res, convo, bot) => {
                await bot.say({
                    text : "No responses were saved. You can type 'ideastorm' to record multiple ideas or 'deepdive' to pick an idea and work on it."
                })
            }
        },
        {
            default : true,
            type : "string",
            handler : async (res, convo, bot) => {
                let url = `${process.env.BACKEND_API_URL}/api/v1/kos`;
                let slackUserId = convo.step.values.user;
                let data = {
                    ideaOwner : store.get(slackUserId),
                    ideaDescription : res,
                    ideaName : res.slice(0,200),
                }
                console.log(url);
                try {
                    let response = await axios.post(url, data);
                    convo.gotoThread("idea_input_thread");
                }
                catch(e) {
                    console.log("some error occurred",e.message);
                    convo.gotoThread("idea_input_thread");  
                }
            }   
        }
    ]);

    controller.addDialog(convo1);

    const IDEASTORM_DIALOG2_ID = 'ideastorm-dialog2';

    let convo2 = new BotkitConversation(IDEASTORM_DIALOG2_ID,controller);


    convo2.addMessage({
        text : "Please enter any 5 ideas that you want to record one by one.",
        action : "idea_store_thread"
    })

    convo2.addQuestion({
        text : " ",
    },
    [
        {
            pattern : "cancel",
            type : 'string',
            handler : async (res, convo, bot) => {
                convo.gotoThread("save_responses_thread");
            }
        },
        {
            default : true,
            type : 'string',
            handler : async (res, convo, bot) => {
                ideas.push(res);
                console.log("XXXX", ideas);
                count--;
                if(count === 0) {
                    convo.gotoThread("save_responses_thread");
                }
                else {
                    await bot.say('Okay, enter next one.');
                    convo.gotoThread("idea_store_thread");
                }
            }
        }
    ],
    {},
    "idea_store_thread");


    convo2.before("save_responses_thread", async (convo, bot) => {
        let slackUserId = convo.step.values.user;
        ideas.forEach( async (idea) => {
            let data = {
                ideaOwner : store.get(slackUserId),
                ideaDescription : idea,
                ideaName : idea.slice(0,200)
            }
            let url = `${process.env.BACKEND_API_URL}/api/v1/kos`;
            try {
                let response = await axios.post(url, data);
                console.log("Ideas saved successfully", response.data);      
            }
            catch(error) {
                console.log("Some error occurred in storing ideas", error);
            }
        })
    })



    convo2.addMessage({
        text : "Your responses have been saved."
    },"save_responses_thread")
    

    controller.addDialog(convo2);


    

    controller.on('message, direct_message, direct_mention', async (bot, message) => {

        if(!store.get(message.user)) {
            console.log("User not found in local storage.");
            return ;
        }

        if(message.text === "ideastorm") {
            if(ideastorm_replies.flag === "one_by_one") {
                await bot.beginDialog(IDEASTORM_DIALOG1_ID);
            }
            else if(ideastorm_replies.flag === "five_ideas_at_once") {
                console.log("yeah")
                ideas = [];
                count = 5;

                await bot.beginDialog(IDEASTORM_DIALOG2_ID);
            }
        }
    })
}