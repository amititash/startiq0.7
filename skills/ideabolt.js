const store = require('../store/store');
const axios = require('axios');

module.exports = function(controller) {

    controller.on('direct_message, direct_mention', function(bot, message) {
        if(!store.get(message.user)) {
            console.log("User not found in the local storage.");
            return ;
        }
        if(message.intent === 'rank_idea_intent') {
            let idea = "";
            let imageUrl = "";
            bot.createConversation(message, function(err, convo) {
                convo.addQuestion({
                    text : "Please enter your idea."
                },
                [
                    {
                        default : true,
                        callback : function(res, convo) {
                            idea = res.text;
                            convo.transitionTo("results_thread","Please wait while I am fetching the results of the analysis");
                            convo.next();
                        }
                    }
                ],
                {},
                "default");

                convo.beforeThread("results_thread", async function(convo, next) {
                    let url = `${process.env.BACKEND_API_URL}/api/v1/kos`;
                    let data = {
                        ideaOwner : store.get(message.user),
                        ideaDescription : idea,
                        ideaName : idea.slice(0,200)
                    }
                    let analysis_result = {};
                    console.log(data);
                    try {
                        let response = await axios.post(url,data);
                        analysis_result = response.data;
                        let snapshotResponse = await axios.get(`${process.env.SNAPSHOT_API_URL}?id=${analysis_result._id}`);
                        imageUrl = snapshotResponse.data.image;
                        bot.reply(message, {
                            attachments : [
                                {
                                    "type": "image",
                                    "title": {
                                        "type": "plain_text",
                                        "text": "image1",
                                        "emoji": true
                                    },
                                    "image_url": imageUrl,
                                    "alt_text": "image1"
                                }
                            ]  
                        })
                    }   
                    catch(e) {
                        console.log(e.message);
                        convo.gotoThread("error_thread");
                    }
                    console.log(analysis_result);
                    let ideaCategories1 = [];
                    ideaCategories1 = analysis_result.ideaCategories;
                    let ideaCategories2 = [];
                    ideaCategories2 = analysis_result.newCategories;
                    let ideaCategories3 = [];
                    ideaCategories3 = analysis_result.userCategories;
                    ideaCategories1String = "";
                    ideaCategories2String = "";
                    ideaCategories3String = "";

                    ideaCategories1.forEach( (element,index) => {
                        ideaCategories1String += `${index+1}. ${element}\n`
                    })
                    ideaCategories2.forEach( (element,index) => {
                        ideaCategories2String += `${index+1}. ${element}\n`
                    })
                    ideaCategories3.forEach( (element,index) => {
                        ideaCategories3String += `${index+1}. ${element}\n`
                    })

                    let startupSkills = [];
                    let startupSkillsString = "";
                    startupSkills = analysis_result.startupSkills;
                    startupSkills.forEach( (element,index) => {
                        startupSkillsString += `${index+1}. ${element}\n`
                    })

                    convo.setVar("startup_skills", startupSkillsString);
                    convo.setVar("startup_size", analysis_result.startupSize[0]);

                    convo.setVar("freshness", analysis_result.freshness*100);
                    convo.setVar("fundability", Math.round((analysis_result.fundability*100).toFixed(0)));
                    convo.setVar("idea_categories_1", ideaCategories1String);
                    convo.setVar("idea_categories_2", ideaCategories2String);
                    convo.setVar("idea_categories_3", ideaCategories3String);
                    next();
                })

                convo.addMessage({
                    text : "Freshness : {{vars.freshness}}%\
                    Fundability : {{vars.fundability}}%"
                },"results_thread");

                // convo.addMessage({
                //     text : "Categories 1\n{{vars.idea_categories_1}}\n"
                // },"results_thread");
                

                convo.addMessage({
                    text : "Categories :\n{{vars.idea_categories_2}}\n"
                },"results_thread");

                // convo.addMessage({
                //     text : "Categories 2\n{{vars.idea_categories_3}}\n"
                // },"results_thread");

                convo.addMessage({
                    text : "Startup Skills:\n{{vars.startup_skills}}"
                },"results_thread");

                convo.addMessage({
                    text : "Startup Size: {{vars.startup_size}}"
                },"results_thread");

                // convo.addMessage({
                //     attachments : [
                //         {
                //             "type": "image",
                //             "title": {
                //                 "type": "plain_text",
                //                 "text": "image1",
                //                 "emoji": true
                //             },
                //             "image_url": imageUrl,
                //             "alt_text": "image1"
                //         }
                //     ]
                // },"results_thread");


                convo.addMessage({
                    text : "Some error occurred"
                },"error_thread");

                convo.activate();

            })
        }
        
    })
}