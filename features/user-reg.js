const store = require('../store/store');
const axios = require('axios');
const { Botkit, BotkitConversation } = require('botkit');


module.exports = function(controller) {


    let userInfo = {};

    const USER_REG_DIALOG_ID = 'user-reg-dialog';

    let convo = new BotkitConversation(USER_REG_DIALOG_ID, controller);

    

    convo.ask({
        text : "Hi ! I am the StartIQ bot. Kindly provide your e-mail id for registration purpose."
    },
    [
        {
            pattern : "cancel",
            type : 'string',
            handler : async (res, convo, bot) => {
                convo.gotoThread("unsuccessfull_registration_thread");
            }
        },
        {
            default : true,
            type : 'string',
            handler : async (res, convo, bot) => {
                let email = res;
                try {
                    email = email.slice(email.indexOf('|')+1).slice(0,-1);
                }
                catch(e) {
                    console.log("Error in converting email", e);
                }
                userInfo.email = email;
                let slackUserId = convo.step.values.user;
                store.set(slackUserId, userInfo.email);
            }
        }
    ]);


    convo.ask({
        text : "Thank you. May I know your name please ?"
    },
    [
        {
            pattern : "cancel",
            type : 'string',
            handler : async (res, convo, bot) => {
                convo.gotoThread("successfull_registration_thread");
            }
        },
        {
            default : true,
            type : 'string',
            handler : async (res, convo, bot) => {
                let name = res;
                convo.setVar("username", name);
                userInfo.username = name;
            }
        }
    ]);



    convo.ask({
        text : "Which university are you enrolled in ?"
    },
    [
        {
            pattern : "cancel",
            type : 'string',
            handler : async (res, convo, bot) => {
                convo.gotoThread("successfull_registration_thread");
            }
        },
        {
            default : true,
            type : 'string',
            handler : async (res, convo, bot) => {
                let organisation = res;
                userInfo.organisation = organisation
            }
        }
    ]);



    convo.ask({
        text : "What is your core skillset (business, tech etc.)?  "
    },
    [
        {
            pattern : "cancel",
            handler : async (res, convo, bot) => {
                convo.gotoThread("successfull_registration_thread");
            }
        },
        {
            default : true,
            type : 'string',
            handler : async (res, convo, bot) => {
                let skillset = res;
                userInfo.bio = skillset;

                //Now we have complete data, so save it. 
                let url = `${process.env.BACKEND_API_URL}/api/v1/users`;
                axios.post(url, userInfo)
                    .then ( response => {
                        console.log("User details saved" , response.data);
                        convo.gotoThread("successfull_registration_thread");
                    })
                    .catch( error => {
                        console.log("Error occurred in saving user details", error);
                        throw error;
                    })
            }
        }
    ]);


    convo.addMessage({
        text : "Incomplete registration. Please complete the registration process."
    },"unsuccessfull_registration_thread");




    convo.addMessage({
        text : "Hello. Welcome to the platform. Now you many proceed by typing 'ideastorm' for recording multiple ideas, or you may type 'deepdive' for exploring a particular idea or 'rank ideas' to list ideas by ranking."
    },"successfull_registration_thread");
    

    
    controller.addDialog(convo);

  
    controller.on('message, direct_message', async (bot, message)=> {
        if(!store.get(message.user)) {
            await bot.beginDialog(USER_REG_DIALOG_ID);   
        }
    })
}