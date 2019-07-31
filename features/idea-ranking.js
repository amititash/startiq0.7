const store = require('../store/store');
const axios = require('axios');
const { BotkitConversation } = require('botkit');

module.exports = function(controller) {

    const IDEARANKING_DIALOG_ID = "idearanking-dialog";

    let convo = new BotkitConversation(IDEARANKING_DIALOG_ID, controller);


    convo.addQuestion({
        text : `How would you like to rank your ideas ?(Please enter the corresponding number)\n1. By Fundability.\n2. By Freshness`
    },
    [
        {
            pattern : "1",
            type : 'string',
            handler : async (res, convo, bot) => {
                convo.gotoThread("sortby_fundability_thread");
            }
        },
        {
            pattern : "2",
            type : 'string',
            handler : async (res, convo, bot ) => {
                convo.gotoThread("sortby_freshness_thread");
            }
        },
        {
            default : true,
            type : 'string',
            handler : async (res, convo, bot) => {
                convo.repeat();
            }
        }
    ],
    {},
    "default");



    convo.before("sortby_fundability_thread", async (convo, bot) => {
        let slackUserId = convo.step.values.user;
        let url = `${process.env.BACKEND_API_URL}/api/v1/kos/sorted?emailId=${store.get(slackUserId)}&sortBy=fundability`;
        let ideas = [];
        try {
            let response = await axios.get(url);
            ideas = response.data;
        }
        catch(e){
            console.log(e);
            convo.gotoThread('error_thread');
        }
        let ideaString = ""
        ideas.forEach( (element,index) => {
            ideaString += `${index+1}. ${element.ideaDescription}\n`    
        });
        convo.setVar("ideasByFundability" , ideaString)
    })

    convo.addMessage({
        text : "Here are your ideas, sorted by Fundability\n{{vars.ideasByFundability}}",
        action : "end_thread"
    },"sortby_fundability_thread");





    convo.before("sortby_freshness_thread", async function(convo, bot) {
        let slackUserId = convo.step.values.user;
        let url = `${process.env.BACKEND_API_URL}/api/v1/kos/sorted?emailId=${store.get(slackUserId)}&sortBy=freshness`;
        let ideas = [];
        try {
            let response = await axios.get(url);
            ideas = response.data;
        }
        catch(e){
            console.log(e);
            convo.gotoThread('error_thread');
        }
        let ideaString = ""
        ideas.forEach( (element,index) => {
            ideaString += `${index+1}. ${element.ideaDescription}\n`    
        });
        convo.setVar("ideasByFreshness" , ideaString)
    })


    convo.addMessage({
        text : "Here are your ideas, sorted by Freshness:\n{{vars.ideasByFreshness}}",
        action : "end_thread"
    },"sortby_freshness_thread");




    convo.addMessage({
        text : "You can type 'ideastorm', 'deepdive', 'list' or 'rank ideas'"
    },"end_thread");
    
    convo.addMessage({
        text : "Some error occurred. Please try again."
    },"error_thread");


    controller.addDialog(convo);



    controller.on('message, direct_message , direct_mention', async (bot, message) => {
        if(message.text === "rank ideas") {
            if(!store.get(message.user)) {
                console.log("User not found in the local storage.");
                return ;
            }
            else {
                await bot.beginDialog(IDEARANKING_DIALOG_ID);
            }
        }
    });
    
}