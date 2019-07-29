const store = require('../store/store');
const axios = require('axios');


module.exports = function(controller) {
    controller.on('direct_message , direct_mention', function(bot, message) {

        if(message.text === "rank ideas") {


            if(!store.get(message.user)) {
                console.log("User not found in the local storage.");
                return ;
            }

            

            bot.createConversation(message, function(err, convo) {


                convo.addQuestion({
                    text : `How would you like to rank your ideas ?(Please enter the corresponding number)\n1. By Fundability.\n2. By Freshness`
                },
                [
                    {
                        pattern : "1",
                        callback : function(res, convo) {
                            convo.gotoThread("sortby_fundability_thread");
                            convo.next();
                        }
                    },
                    {
                        pattern : "2",
                        callback : function(res, convo) {
                            convo.gotoThread("sortby_freshness_thread");
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
                "default");


                convo.beforeThread("sortby_fundability_thread", async function(convo, next) {
                    let url = `${process.env.BACKEND_API_URL}/api/v1/kos/sorted?emailId=${store.get(message.user)}&sortBy=fundability`;
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
                    next();
                })


                convo.addMessage({
                    text : "Here are your ideas, sorted by Fundability\n{{vars.ideasByFundability}}",
                    action : "end_thread"
                },"sortby_fundability_thread");


                convo.beforeThread("sortby_freshness_thread", async function(convo, next) {
                    let url = `${process.env.BACKEND_API_URL}/api/v1/kos/sorted?emailId=${store.get(message.user)}&sortBy=freshness`;
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
                    next();
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
             
                convo.activate();
            })
        }
    })
}