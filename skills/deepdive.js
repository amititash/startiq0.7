const axios = require('axios');
const store = require('../store/store');
const deepdive_replies = require(`../assets/deepdive/deepdive_replies${ Math.floor(Math.random()*2) + 1 }`);
const elasticSearchService =  require('../utils/elasticsearch');
const cardFormatter = require('../utils/cardFormatter');



const storeIdea = async (userEmailId, ideaObj) => {
    return new Promise( async(resolve, reject) => {
        let url = `${process.env.BACKEND_API_URL}/api/v1/kos`;
        let mailUrl = `${process.env.NOTIFICATION_API_URL}/send-email`;
        let response = null;
        let imageUrl = "";
        let snapshotResponse = null;
        // ideaObj.ideaName = ideaObj.ideaDescription.slice(0,200);
        ideaObj.ideaOwner = userEmailId;

        
        
        try {
            ideaObj.predictedRevenue = Number(ideaObj.totalNumberOfUsers) * Number(ideaObj.pricePerUser) * Number(ideaObj.userPercentage)/100 ; 
            let data = ideaObj;
            response = await axios.post(url,data);
            snapshotResponse = await axios.get(`${process.env.SNAPSHOT_API_URL}?id=${response.data._id}`);
            imageUrl = snapshotResponse.data.image;
            let mailData = {
                to : [userEmailId],
                from : "engineering@startiq.org",
                subject : "Test",
                body : `Here is the link to the report : ${imageUrl}`
            }
            await axios.post(mailUrl, mailData);

        }
        catch(e) {
            console.log("some error occurred",e);
            reject(e);
        }
        
        resolve({
            success : true,
            imageUrl : imageUrl,
            koResponse : response.data
        });
    })
}



module.exports = function(controller) {
    controller.on('direct_message,direct_mention, interactive_message_callback', async function(bot, message) {

        if(!store.get(message.user)){
            console.log("user not found");
            return ;
        }


        if(message.intent === "deepdive_intent") {
            let existingIdeas = [];
            let existingIdeasMap = {};
            let ideaByFundabilityMap = {};
            let ideaByFreshnessMap = {};
            let ideaByRecentMap = {};
            let ideaByKeywordMap = {};
            let attachment = [];
            let ideaCategoriesMap = {};
            let similarCompaniesMap = {};
            let competitors = [];
            let ideaObj = {};
            let chosenCompanies = [];  // chosen from results of es. 
            let chosenCompaniesMap = {};
            let similarCompanyCountDown = 1;
            let imageUrl = "";
            let similarCompaniesAttachment = {
                attachments : []
            }
            let ideaByFundabilityAttachment = {
                attachments : []
            }
            let ideaByFreshnessAttachment = {
                attachments : []
            }
            let ideaByMostRecentAttachment = {
                attachments : []
            }
            let allIdeasAttachment = {
                attachments : []
            }
            let ideaByKeywordAttachment = {
                attachments : []
            }

            try {
                let ideas = await axios.get(`${process.env.BACKEND_API_URL}/api/v1/kos?emailId=${store.get(message.user)}`);
                existingIdeas = ideas.data;
            }
            catch(error) {
                console.log(error);
            }


            bot.createConversation(message, function(err, convo) {

                if(existingIdeas.length > 0) {
                    convo.addQuestion({
                        text : `It looks like you have ${existingIdeas.length} ideas in your binder. How would you like me to display your ideas?\n1. Fundability (our estimate of how fundable the idea is based on the recent deal flow)\n2. Freshness (whether the idea you are describing looks like other 'hot' ideas out there)\n3. Most recently entered idea\n4. Product/service category\n5. Search by term`
                    },
                    [
                        {
                            pattern : bot.utterances.quit,
                            callback : function(res, convo) {
                                convo.gotoThread("early_exit_thread");
                                convo.next();
                            }
                        },
                        {
                            pattern : "1",
                            callback : function(res, convo) {
                                convo.gotoThread("rank_by_fundability_thread");
                                convo.next();
                            }
                        },
                        {
                            pattern : "2",
                            callback : function(res, convo) {
                                convo.gotoThread("rank_by_freshness_thread");
                                convo.next();
                            }
                        },
                        {
                            pattern : "3",
                            callback : function(res, convo) {
                                convo.gotoThread("rank_by_recent_thread");
                                convo.next();
                            }
                        },
                        {
                            pattern : "4",
                            callback : function(res, convo) {
                                convo.gotoThread("all_ideas_thread");
                                convo.next();
                            }
                        },
                        {
                            pattern : "5",
                            callback : function(res, convo) {
                                convo.gotoThread("ideas_by_keyword_thread");
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
                    "default")
                }

                convo.beforeThread("all_ideas_thread", function(convo, next) {
                    let ideas = existingIdeas;
                    let ideaString = "";
                    ideas.forEach( (element,index) => {
                        existingIdeasMap[`${index+1}`] = element.ideaDescription;
                        ideaString += `${index+1}. ${element.ideaDescription}\n` ;
                        allIdeasAttachment.attachments.push({
                            "fallback": "Required plain-text summary of the attachment.",
                            "color": "#36a64f",
                            // "pretext": "Here are the top ideas by fundability. Type the number of the idea you want to develop further.",
                            "author_name": `${index+1}. ${element.ideaName}`,
                            // "author_link": "http://flickr.com/bobby/",
                            "author_icon": "http://flickr.com/icons/bobby.jpg",
                            "title": `${element.ideaDescription}`,
                            // "title_link": "https://api.slack.com/",
                            // "text": "Optional text that appears within the attachment",
                            // "fields": [
                            //     {
                            //         "title": "Fundability:",
                            //         "value": `${(Math.round(element.fundability*100)).toFixed(0)}%`,
                            //         "short": false
                            //     }
                            // ],
                            "image_url": "http://my-website.com/path/to/image.jpg",
                            "thumb_url": "http://example.com/path/to/thumb.png",
                            "footer": "StartIQ API",
                            "footer_icon": "https://platform.slack-edge.com/img/default_application_icon.png",
                            // "ts": 123456789
                        })   
                    });
                    convo.setVar("all_existing_ideas", ideaString);
                    next();
                });

                convo.addQuestion({
                    text : "Here are all your ideas. Type the number of the idea you want to develop further.",
                    attachments : allIdeasAttachment.attachments
                },
                [
                    {
                        pattern : bot.utterances.quit,
                        callback : function(res, convo) {
                            convo.gotoThread("early_exit_thread");  
                            convo.next();
                        }
                    },
                    {
                        default : true,
                        callback : function(res, convo) {
                            let number = res.text;
                            let chosenIdea = "";
                            console.log(chosenIdea);
                            if(existingIdeasMap[`${number}`]) {
                                chosenIdea = existingIdeasMap[`${number}`];
                                ideaObj.ideaDescription = chosenIdea;
                                ideaObj.ideaName = chosenIdea.slice(0,200);
                                convo.transitionTo("idea_selected_thread",`You chose "${chosenIdea}"\n  `);
                            }
                            else {
                                bot.reply(message, "Please enter a valid response.");
                                convo.repeat();
                            }
                            convo.next();
                        }
                    } 
                ],
                {},
                "all_ideas_thread")


                


                convo.beforeThread("rank_by_fundability_thread", async function(convo, next) {
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
                        ideaByFundabilityMap[`${index+1}`] = element.ideaDescription;
                        ideaString += `${index+1}. (${(Math.round(element.fundability*100)).toFixed(0)}%) ${element.ideaDescription} \n`;
                        ideaByFundabilityAttachment.attachments.push({
                            "fallback": "Required plain-text summary of the attachment.",
                            "color": "#36a64f",
                            // "pretext": "Here are the top ideas by fundability. Type the number of the idea you want to develop further.",
                            "author_name": `${index+1}. ${element.ideaName}`,
                            // "author_link": "http://flickr.com/bobby/",
                            "author_icon": "http://flickr.com/icons/bobby.jpg",
                            "title": `${element.ideaDescription}`,
                            // "title_link": "https://api.slack.com/",
                            // "text": "Optional text that appears within the attachment",
                            "fields": [
                                {
                                    "title": "Fundability:",
                                    "value": `${(Math.round(element.fundability*100)).toFixed(0)}%`,
                                    "short": false
                                }
                            ],
                            "image_url": "http://my-website.com/path/to/image.jpg",
                            "thumb_url": "http://example.com/path/to/thumb.png",
                            "footer": "StartIQ API",
                            "footer_icon": "https://platform.slack-edge.com/img/default_application_icon.png",
                            // "ts": 123456789
                        })
                    });
                    console.log("Idea by fundability map", ideaByFundabilityMap);
                    convo.setVar("ideasByFundability" , ideaString)
                    next();
                })


                convo.addQuestion({
                    text : "Here are the top ideas by fundability. Type the number of the idea you want to develop further.\n",
                    attachments : ideaByFundabilityAttachment.attachments
                },
                [
                    {
                        pattern : bot.utterances.quit,
                        callback : function(res, convo) {
                            convo.gotoThread("early_exit_thread");
                            convo.next();
                        }
                    },
                    {
                        default : true,
                        callback : function(res, convo) {
                            let number = res.text;
                            let chosenIdea = "";
                            if(ideaByFundabilityMap[`${number}`]){
                                chosenIdea = ideaByFundabilityMap[`${number}`]
                                console.log(chosenIdea);
                                ideaObj.ideaDescription = chosenIdea;
                                ideaObj.ideaName = chosenIdea.slice(0,200);
                                convo.transitionTo("idea_selected_thread",`You chose "${chosenIdea}"\n  `);
                            }
                            else {
                                bot.reply(message, "Please enter a valid response.");
                                convo.repeat();
                            }
                            convo.next();
                        }
                    }   
                ],
                {},
                "rank_by_fundability_thread");



                convo.beforeThread("rank_by_freshness_thread", async function(convo, next) {
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
                        ideaByFreshnessMap[`${index+1}`] = element.ideaDescription;
                        ideaString += `${index+1}. (${element.freshness.toFixed(2)}) ${element.ideaDescription} \n`  
                        ideaByFreshnessAttachment.attachments.push({
                            "fallback": "Required plain-text summary of the attachment.",
                            "color": "#36a64f",
                            // "pretext": "Here are the top ideas by fundability. Type the number of the idea you want to develop further.",
                            "author_name": `${index+1}. ${element.ideaName}`,
                            // "author_link": "http://flickr.com/bobby/",
                            "author_icon": "http://flickr.com/icons/bobby.jpg",
                            "title": `${element.ideaDescription}`,
                            // "title_link": "https://api.slack.com/",
                            // "text": "Optional text that appears within the attachment",
                            "fields": [
                                {
                                    "title": "Freshness:",
                                    "value": `${element.freshness_criteria}`,
                                    "short": false
                                }
                            ],
                            "image_url": "http://my-website.com/path/to/image.jpg",
                            "thumb_url": "http://example.com/path/to/thumb.png",
                            "footer": "StartIQ API",
                            "footer_icon": "https://platform.slack-edge.com/img/default_application_icon.png",
                            // "ts": 123456789
                        })  
                    });
                    console.log("Idea by freshness map", ideaByFreshnessMap);
                    convo.setVar("ideasByFreshness" , ideaString)
                    next();
                })



                convo.addQuestion({
                    text : "Here are the top ideas by freshness. Type the number of the idea you want to develop further.",
                    attachments : ideaByFreshnessAttachment.attachments
                },
                [
                    {
                        pattern : bot.utterances.quit,
                        callback : function(res, convo) {
                            convo.gotoThread("early_exit_thread");
                            convo.next();
                        }
                    },
                    {
                        default : true,
                        callback : function(res, convo) {
                            let number = res.text;
                            let chosenIdea = "";
                            if(ideaByFreshnessMap[`${number}`]){
                                chosenIdea = ideaByFreshnessMap[`${number}`]
                                console.log(chosenIdea);
                                ideaObj.ideaDescription = chosenIdea;
                                ideaObj.ideaName = chosenIdea.slice(0,200);
                                console.log(ideaObj);
                                convo.transitionTo("idea_selected_thread",`You chose "${chosenIdea}"\n  `);
                            }
                            else {
                                bot.reply(message, "Please enter a valid response.");
                                convo.repeat();
                            }
                            convo.next();
                        }
                    }   
                ],
                {},
                "rank_by_freshness_thread");




                convo.beforeThread("rank_by_recent_thread", async function(convo, next) {
                    let url = `${process.env.BACKEND_API_URL}/api/v1/kos/sorted?emailId=${store.get(message.user)}&sortBy=recent`;
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
                        ideaByRecentMap[`${index+1}`] = element.ideaDescription;
                        ideaString += `${index+1}. ${element.ideaDescription}\n`;
                        ideaByMostRecentAttachment.attachments.push({
                            "fallback": "Required plain-text summary of the attachment.",
                            "color": "#36a64f",
                            // "pretext": "Here are the top ideas by fundability. Type the number of the idea you want to develop further.",
                            "author_name": `${index+1}. ${element.ideaName}`,
                            // "author_link": "http://flickr.com/bobby/",
                            "author_icon": "http://flickr.com/icons/bobby.jpg",
                            "title": `${element.ideaDescription}`,
                            // "title_link": "https://api.slack.com/",
                            // "text": "Optional text that appears within the attachment",
                            // "fields": [
                            //     {
                            //         "title": "Fundability:",
                            //         "value": `${(Math.round(element.fundability*100)).toFixed(0)}%`,
                            //         "short": false
                            //     }
                            // ],
                            "image_url": "http://my-website.com/path/to/image.jpg",
                            "thumb_url": "http://example.com/path/to/thumb.png",
                            "footer": "StartIQ API",
                            "footer_icon": "https://platform.slack-edge.com/img/default_application_icon.png",
                            // "ts": 123456789
                        })
                    });
                    console.log("idea by recent map", ideaByRecentMap);
                    convo.setVar("most_recent_ideas" , ideaString)
                    next();
                })



                convo.addQuestion({
                    text : "Here are your most recent ideas. Type the number of the idea you want to develop further.",
                    attachments : ideaByMostRecentAttachment.attachments
                },
                [
                    {
                        pattern : bot.utterances.quit,
                        callback : function(res, convo) {
                            convo.gotoThread("early_exit_thread");
                            convo.next();
                        }
                    },
                    {
                        default : true,
                        callback : function(res, convo) {
                            let number = res.text;
                            let chosenIdea = "";
                            if(ideaByRecentMap[`${number}`]){
                                chosenIdea = ideaByRecentMap[`${number}`]
                                console.log(chosenIdea);
                                ideaObj.ideaDescription = chosenIdea;
                                ideaObj.ideaName = chosenIdea.slice(0,200);
                                console.log(ideaObj);
                                convo.transitionTo("idea_selected_thread",`You chose "${chosenIdea}"\n  `);
                            }
                            else {
                                bot.reply(message, "Please enter a valid response.");
                                convo.repeat(); 
                            }
                            convo.next();
                        }
                    }
                ],
                {},
                "rank_by_recent_thread");

                convo.addQuestion({
                    text : "Please enter keywords for your idea."
                },
                [
                    {
                        pattern : bot.utterances.quit,
                        callback : function(res, conv) {
                            console.log("here");
                            convo.gotoThread("early_exit_thread");
                            console.log("there");
                            convo.next();
                        }
                    },
                    {
                        default : true,
                        callback : async function(res, convo){
                            let keyword = res.text;
                            let url = `${process.env.BACKEND_API_URL}/api/v1/kos?emailId=${store.get(message.user)}&keyword=${keyword}`;
                            let ideas = [];
                            try {
                                let response = await axios.get(url);
                                ideas = response.data;
                            }
                            catch(e){
                                console.log(e);
                                convo.gotoThread('error_thread');
                            }
                            if(!ideas.length){
                                bot.reply(message, "No idea found in your binder. Try searching with a different keyword.")
                                convo.repeat();
                            }
                            else {
                                let ideaString = ""
                                ideas.forEach( (element,index) => {
                                    ideaByKeywordMap[`${index+1}`] = element.ideaDescription;
                                    ideaString += `${index+1}. ${element.ideaDescription}\n`    
                                    ideaByKeywordAttachment.attachments.push({
                                        "fallback": "Required plain-text summary of the attachment.",
                                        "color": "#36a64f",
                                        // "pretext": "Here are the top ideas by fundability. Type the number of the idea you want to develop further.",
                                        "author_name": `${index+1}. ${element.ideaName}`,
                                        // "author_link": "http://flickr.com/bobby/",
                                        "author_icon": "http://flickr.com/icons/bobby.jpg",
                                        "title": `${element.ideaDescription}`,
                                        // "title_link": "https://api.slack.com/",
                                        // "text": "Optional text that appears within the attachment",
                                        // "fields": [
                                        //     {
                                        //         "title": "Fundability:",
                                        //         "value": `${(Math.round(element.fundability*100)).toFixed(0)}%`,
                                        //         "short": false
                                        //     }
                                        // ],
                                        "image_url": "http://my-website.com/path/to/image.jpg",
                                        "thumb_url": "http://example.com/path/to/thumb.png",
                                        "footer": "StartIQ API",
                                        "footer_icon": "https://platform.slack-edge.com/img/default_application_icon.png",
                                        // "ts": 123456789
                                    })
                                });
                                console.log("Idea by keyword search map", ideaByKeywordMap);
                                convo.setVar("ideasByKeyword" , ideaString)
                            }   
                            convo.next();
                        }
                    }
                ],
                {},
                "ideas_by_keyword_thread");




                convo.addQuestion({
                    text : "Here are the ideas that matched your search. Type the number of the idea you want to develop further.",
                    attachments : ideaByKeywordAttachment.attachments
                },
                [
                    {
                        pattern : bot.utterances.quit,
                        callback : function(res, convo) {
                            convo.gotoThread("early_exit_thread");
                            convo.next();
                        }
                    },
                    {
                        default : true,
                        callback : function(res, convo) {
                            let number = res.text;
                            let chosenIdea = "";
                            if(ideaByKeywordMap[`${number}`]){
                                chosenIdea = ideaByKeywordMap[`${number}`]
                                console.log(chosenIdea);
                                ideaObj.ideaDescription = chosenIdea;
                                ideaObj.ideaName = chosenIdea.slice(0,200);
                                console.log(ideaObj);
                                convo.transitionTo("idea_selected_thread",`You chose "${chosenIdea}"\n  `);
                            }
                            else {
                                bot.reply(message, "Please enter a valid response.");
                                convo.repeat(); 
                            }
                            convo.next();
                        }
                    }
                ],
                {},
                "ideas_by_keyword_thread");



                convo.addQuestion({
                    text: `${deepdive_replies["what_is_the_idea"]["question"]}`
                },
                [
                    {
                        pattern : bot.utterances.quit,
                        callback : function(res, convo) {
                            convo.gotoThread("early_exit_thread");
                            convo.next();
                        }
                    },
                    {
                        default : true,
                        callback : function(res, convo) {
                            ideaObj.ideaDescription = res.text;
                            ideaObj.ideaName = res.text.slice(0,200);
                            convo.gotoThread("idea_selected_thread");
                            convo.next();
                        }
                    }
                ],
                {},
                "default"
                );
                



                /**
                 * Now we have the idea
                 */




                convo.beforeThread("idea_selected_thread", async function(convo, next) {
                    let ideaDescription = "";
                    let ideaCategories = [];
                    try {
                        ideaDescription = ideaObj.ideaDescription;
                        let url = `${process.env.CLASSIFIER_API_URL}/categories?idea=${ideaDescription}`
                        let response = await axios.get(url);
                        ideaCategories = response.data["PRED"].slice(0,10);
                    }
                    catch(e) {
                        console.log(e);
                        convo.gotoThread("error_thread");
                    }
                    let ideaCategoriesString = "";
                    ideaCategories.forEach( (category,index) => {
                        ideaCategoriesMap[`${index+1}`] = category.topic;
                        ideaCategoriesString += `${index+1}. ${category.topic}\n`;
                    })
                    console.log(ideaCategoriesMap,ideaCategoriesString);
                    convo.setVar("idea_categories", ideaCategoriesString);


                    next();
                })

                convo.addMessage({
                    text : "Let's begin by giving your product or service a name you can remember?"
                },"idea_selected_thread");

                convo.addQuestion({
                    text : "Just enter a one or two-word name for your idea..."
                },
                [
                    {
                        default : true,
                        callback : function(res, convo){
                            ideaObj.ideaName = res.text;
                            convo.gotoThread("choose_idea_categories_thread");
                            convo.next();
                        }
                    }
                ],
                {},
                "idea_selected_thread");

                convo.addMessage({
                    text : "Ok, great. Based on how you described the idea it looks like your product fits one of these product categories. If any of these are relevant, enter them below and separate each number by a comma(eg. '1,2,4')"
                },"choose_idea_categories_thread");

                convo.addQuestion({
                    text : "{{{vars.idea_categories}}}"
                },
                [
                    {
                        pattern : bot.utterances.quit,
                        callback : function(res, convo) {
                            convo.gotoThread("early_exit_thread");
                            convo.next();
                        }
                    },
                    {
                        default : true,
                        callback : function(res, convo) {
                            let chosenCategories = [];
                            let numString = res.text.replace(/ /g, '');
                            let chosenNumbers = numString.split(',');
                            chosenNumbers.forEach( number => {
                                if(ideaCategoriesMap[`${number}`]) {
                                    chosenCategories.push(ideaCategoriesMap[`${number}`]);
                                }
                            })
                            console.log("Categories chosen: ", chosenCategories);
                            convo.setVar("user_categories", chosenCategories.join(','))
                            convo.next();
                        }
                    }
                ],
                {},
                "choose_idea_categories_thread");



                convo.addQuestion({
                    text : "A well-thought-out business idea answers five big questions well. We'll help you answer them and provide some data-driven insights to help you along. Let's start.",
                    attachments:[
                        {
                            title: `Are you selling a...`,
                            callback_id: 'product_or_service',
                            attachment_type: 'default',
                            actions: [
                                {
                                    "name":"product",
                                    "text": "Product",
                                    "value": "product",
                                    "type": "button",
                                },
                                {
                                    "name" : "service",
                                    "text": "Service",
                                    "value": "service",
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
                            convo.gotoThread("early_exit_thread");
                            convo.next();
                        }
                    },
                    {
                        pattern : "product",
                        callback : function(res,cov){
                            console.log("execcccc");
                            console.log("Selling a: ", res.text);
                            ideaObj.sellingTo = res.text;
                            convo.next();
                        }
                    },
                    {
                        pattern : "service",
                        callback : function(res, convo) {
                            console.log("Selling a: ",res.text);
                            ideaObj.sellingTo = res.text;
                            convo.next();
                        }
                    },
                    {
                        default : true,
                        callback : function(res, convo) {
                            bot.reply(message, {
                                text : "Please use the buttons below for replying to this question"
                            })
                            convo.repeat();
                            convo.next();
                        }
                    }
                ],
                {},
                "choose_idea_categories_thread");


                convo.addQuestion({
                    text : "Most businesses serve one of these customer segments.",
                    attachments:[
                        {
                            title: `Which type of customers do you serve?`,
                            callback_id: 'customer_segment',
                            attachment_type: 'default',
                            actions: [
                                {
                                    "name":"business",
                                    "text": "Business (i.e., B2B)",
                                    "value": "business",
                                    "type": "button",
                                },
                                {
                                    "name" : "individual customer",
                                    "text": "Individual Customer",
                                    "value": "individual customer",
                                    "type": "button",
                                },
                                {
                                    "name" : "government",
                                    "text": "Government",
                                    "value": "government",
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
                            convo.gotoThread("early_exit_thread");
                            convo.next();
                        }
                    },
                    {
                        pattern : "business",
                        callback : function(res,cov){
                            console.log("Chosen customer segment: ", res.text);
                            convo.setVar("chosen_customer_segment", "business");
                            ideaObj.chosenCustomerSegment = res.text;
                            convo.next();
                        }
                    },
                    {
                        pattern : "individual customer",
                        callback : function(res, convo) {
                            console.log("Chosen customer segment: ",res.text);
                            convo.setVar("chosen_customer_segment", "individual customer");
                            ideaObj.chosenCustomerSegment = res.text;
                            convo.next();
                        }
                    },
                    {
                        pattern : "government",
                        callback : function(res, convo) {
                            console.log("Chosen customer segment: ",res.text);
                            convo.setVar("chosen_customer_segment", "government");
                            ideaObj.chosenCustomerSegment = res.text;
                            convo.next();
                        }
                    },
                    {
                        default : true,
                        callback : function(res, convo) {
                            bot.reply(message, {
                                text : "Please use the buttons below for replying to this question"
                            })
                            convo.repeat();
                            convo.next();
                        }
                    }
                ],
                {},
                "choose_idea_categories_thread");


                convo.addQuestion({
                    text : "Got it! You are selling to a {{{vars.chosen_customer_segment}}}. Can you describe the industry or segment that this {{{vars.chosen_customer_segment}}} is in? (e.g. Private schools 'sell' to parents, but children 'use' the service.)"
                },
                [
                    {
                        pattern : bot.utterances.quit,
                        callback : function(res, convo) {
                            convo.gotoThread("early_exit_thread");
                            convo.next();
                        }
                    },
                    {
                        default : true,
                        callback : function(res, convo) {
                            convo.setVar("industry_of_chosen_segment", res.text);
                            ideaObj.industry_of_chosen_segment = res.text;
                            console.log("Industry of chosen segment: ", res.text);
                            convo.next();
                        }
                    }
                ],
                {},
                "choose_idea_categories_thread");

                convo.addQuestion({
                    text : "Who are the end-users of your product?"
                },
                [
                    {
                        pattern : bot.utterances.quit,
                        callback : function(res, convo) {
                            convo.gotoThread("early_exit_thread");
                            convo.next();
                        }
                    },
                    {
                        default : true,
                        callback : function(res, convo) {
                            convo.setVar("product_end_users", res.text);
                            ideaObj.product_end_users = res.text;
                            console.log("End user: ",res.text);
                            convo.next();
                        }
                    }  
                ],
                {},
                "choose_idea_categories_thread");

                convo.addQuestion({
                    text : "What problem are you solving for this customer? Try to be concrete about it? (see here for an example of a strong problem statement)"
                },
                [
                    {
                        pattern : bot.utterances.quit,
                        callback : function(res, convo) {
                            convo.gotoThread("early_exit_thread");
                            convo.next();
                        }
                    },
                    {
                        default : true,
                        callback : async function(res, convo) {
                            let similarCompanies = [];
                            let problem = res.text || "";
                            ideaObj.problemsSolved = problem;
                            convo.setVar("problem_solved", problem);
                            let similarCompaniesString = "";
                            // let similarCompaniesAttachment = {
                            //     attachments : []
                            // };
                            try {
                                similarCompanies = await elasticSearchService.search(problem);
                                similarCompaniesAttachment1 = cardFormatter.cardFormatter(similarCompanies); 
                                similarCompanies.forEach( (element,index) => {
                                    similarCompaniesMap[`${index+1}`] = element._source.company_name
                                    similarCompaniesString += `${index+1}. ${element._source.company_name}\n${element._source.domain}\n${element._source.description}\n`;
                                    similarCompaniesAttachment.attachments.push({
                                        "fallback": "Required plain-text summary of the attachment.",
                                        "color": "#36a64f",
                                        // "pretext": "Optional text that appears above the attachment block",
                                        "author_name": `${index+1}. ${element._source.company_name}`,
                                        "author_link": `http://${element._source.domain}`,
                                        "author_icon": "http://flickr.com/icons/bobby.jpg",
                                        "title": `${element._source.company_name}`,
                                        "title_link": `http://${element._source.domain}`,
                                        "text": `${element._source.description.slice(0,200)}`,
                                        // "fields": [
                                        //     {
                                        //         "title": "Priority",
                                        //         "value": "High",
                                        //         "short": false
                                        //     }
                                        // ],
                                        "image_url": "http://my-website.com/path/to/image.jpg",
                                        "thumb_url": "http://example.com/path/to/thumb.png",
                                        "footer": "StartIQ API",
                                        "footer_icon": "https://platform.slack-edge.com/img/default_application_icon.png",
                                        // "ts": 123456789
                                    })
                                })
                            }
                            catch(e) {
                                console.log("Error in elasticsearch", e)
                            }
                            if(!similarCompanies.length){
                                similarCompaniesString = "No similar companies found."
                                convo.setVar("similar_companies", similarCompaniesString);
                                convo.transitionTo("add_missed_similar_companies_thread", "I did not find any similar companies. Did I miss any company? Please enter the name of the companies. If there are multiple, enter a comma-separated list. Please enter a comma-separated list of corresponding numbers.")
                            }
                            else {
                                convo.setVar("similar_companies", similarCompaniesString);
                                convo.gotoThread("choose_similar_companies_thread");
                            }
                            
                            convo.next();
                        }
                    }     
                ],
                {},
                "choose_idea_categories_thread");

                convo.addMessage({
                    text : "Fantastic! I did a few searches and found some companies that describe themselves in a way similar to you..."
                },"choose_similar_companies_thread");

                convo.addMessage({
                    attachments : similarCompaniesAttachment.attachments
                },"choose_similar_companies_thread");

                convo.addQuestion({
                    // attachments : similarCompaniesAttachment.attachments
                    text : "Check these out...do any look like they may be competing for the same customers or dollars? Remember they don't have to have the same solution as you to be a competitor, they just have to solve the same or similar problem for your target customer. Please enter a comma-separated list of corresponding numbers."
                },
                [
                    {
                        pattern : bot.utterances.quit,
                        callback : function(res, convo) {
                            convo.gotoThread("early_exit_thread");
                            convo.next();
                        }
                    },
                    {
                        default : true,
                        callback : function(res, convo) {
                            chosenCompanies = [];
                            let numString = res.text.replace(/ /g, '');
                            let chosenNumbers = numString.split(',');
                            chosenNumbers.forEach( number => {
                                if(similarCompaniesMap[`${number}`]) {
                                    chosenCompanies.push(similarCompaniesMap[`${number}`]);
                                }
                            })
                            console.log(chosenCompanies);
                            convo.gotoThread("add_missed_similar_companies_thread");
                            convo.next();
                        }
                    }  
                ],
                {},
                "choose_similar_companies_thread");


                convo.addQuestion({
                    text : "Looks like you chose some companies from the list. Did I miss any company? Please enter the name of the companies. If there are multiple, enter a comma-separated list."
                },
                [
                    {
                        pattern : bot.utterances.quit,
                        callback : function(res, convo) {
                            convo.gotoThread("early_exit_thread");
                            convo.next();
                        }
                    },
                    {
                        pattern : "no",
                        callback : function(res, convo) {
                            convo.gotoThread("choose_top_competitor_thread");
                            convo.next();
                        }
                    },
                    {
                        default : true,
                        callback : function(res, convo) {
                            let companies = res.text.split(',');
                            companies.forEach( company => {
                                chosenCompanies.push(company);
                            })
                            console.log("final companies chosen: ",chosenCompanies);
                            convo.gotoThread("choose_top_competitor_thread");
                            convo.next();
                        }
                    }
                ],
                {},
                "add_missed_similar_companies_thread");


                convo.beforeThread("choose_top_competitor_thread", function(convo, next) {
                    console.log("finally chosen companies", chosenCompanies);
                    ideaObj.competitors = chosenCompanies;
                    let chosenCompaniesString = "";
                    chosenCompanies.forEach( (company , index) => {
                        chosenCompaniesMap[`${index+1}`] = company;
                        chosenCompaniesString += `${index+1}. ${company}\n`
                    })
                    convo.setVar("finally_chosen_competitors", chosenCompaniesString);
                    next();
                })


                convo.addQuestion({
                    text : "Ok. Which one of these is your top competitor?\n{{{vars.finally_chosen_competitors}}}"
                },
                [
                    {
                        pattern : bot.utterances.quit,
                        callback : function(res, convo) {
                            convo.gotoThread("early_exit_thread");
                            convo.next();
                        }
                    },
                    {
                        default : true,
                        callback : function(res, convo) {
                            if(chosenCompaniesMap[`${res.text}`]){
                                console.log("Top competitor : ", chosenCompaniesMap[`${res.text}`]);
                                convo.setVar("top_competitor", chosenCompaniesMap[`${res.text}`])
                                ideaObj.top_competitor = chosenCompaniesMap[`${res.text}`];
                                convo.gotoThread("chosen_top_competitor_thread");
                            }
                            else {
                                bot.reply(message, "Please choose a valid response.");
                                convo.repeat();
                            }
                            convo.next();
                        }
                    }
                ],
                {},
                "choose_top_competitor_thread");


                convo.addQuestion({
                    text : "What does {{{vars.top_competitor}}} do? For instance Uber's description on crunchbase is 'Uber develops, markets, and operates a ride-sharing mobile application that allows consumers to submit a trip request.' Provide something similar for {{{vars.top_competitor}}}."
                },
                [
                    {
                        pattern : bot.utterances.quit,
                        callback : function(res, convo) {
                            convo.gotoThread("early_exit_thread");
                            convo.next();
                        }
                    },
                    {
                        default : true,
                        callback : function(res, convo) {
                            if(res.text.length< 140){
                                bot.reply(message, {
                                    text : "The description should have atleast 140 characters. Please re-enter."
                                })
                                convo.repeat();
                            }
                            ideaObj.topCompetitorUserDescription = res.text;
                            convo.next();
                        }
                    }   
                ],
                {},
                "chosen_top_competitor_thread");

                convo.addMessage({
                    text : "OK, we are almost done. The last set of questions to calculate how much your revenue will be."
                },"chosen_top_competitor_thread");


                convo.addQuestion({
                    text : "What is the total number of potential users who can use your product or service?"
                },
                [
                    {
                        pattern : bot.utterances.quit,
                        callback : function(res, convo) {
                            convo.gotoThread("early_exit_thread");
                            convo.next();
                        }
                    },
                    {
                        default : true,
                        callback : function(res, convo) {
                            ideaObj.totalNumberOfUsers = res.text;
                            convo.next();
                        }
                    }
                ],
                {},
                "chosen_top_competitor_thread");

                convo.addQuestion({
                    text : "Fantastic! What will be the price per user in dollars?"
                },
                [
                    {
                        pattern : bot.utterances.quit,
                        callback : function(res, convo) {
                            convo.gotoThread("early_exit_thread");
                            convo.next();
                        }
                    },
                    {
                        default : true,
                        callback : function(res, convo) {
                            ideaObj.pricePerUser = res.text;
                            convo.next();
                        }
                    }
                ],
                {},
                "chosen_top_competitor_thread")


                convo.addQuestion({
                    text : "What is the percentage of users you will address in an year (approx)?"
                },
                [
                    {
                        pattern : bot.utterances.quit,
                        callback : function(res, convo){
                            convo.gotoThread("early_exit_thread");
                            convo.next();
                        }
                    },
                    {
                        default : true,
                        callback : function(res, convo){
                            ideaObj.userPercentage = res.text;
                            let predictedRevenue = Number(ideaObj.totalNumberOfUsers) * Number(ideaObj.pricePerUser) * Number(ideaObj.userPercentage)/100 ; 
                            convo.setVar("predicted_revenue", predictedRevenue);
                            convo.next();
                        }
                    }
                ],
                {},
                "chosen_top_competitor_thread");

                convo.addMessage({
                    text : "Your potential annual revenue is ${{{vars.predicted_revenue}}}"
                },"chosen_top_competitor_thread");

                convo.addMessage({
                    text : "Hang on a sec, while I analyze your responses using my AI powers...",
                    action : "deepdive_completed_thread"
                },"chosen_top_competitor_thread");


                convo.beforeThread("deepdive_completed_thread", async function(convo, next){
                    let userEmailId = store.get(message.user);
                    try {
                        let response = await storeIdea(userEmailId, ideaObj);
                        bot.reply(message, {
                            attachments : [
                                {
                                    "type": "image",
                                    "title": {
                                        "type": "plain_text",
                                        "text": "image1",
                                        "emoji": true
                                    },
                                    "image_url": response.imageUrl,
                                    "alt_text": "image1"
                                }
                            ]  
                        })
                        console.log("xxxxxxxxxxxx", response)
                        convo.setVar("startup_skills", response.koResponse.startupSkills.join(','))
                        convo.setVar("fundability", Math.round((response.koResponse.fundability*100).toFixed(0)))
                        convo.setVar("freshness" , response.koResponse.freshness_criteria);
                        convo.setVar("idea_name", response.koResponse.ideaName);
                        convo.setVar("idea_description", response.koResponse.ideaDescription);
                    }
                    catch(e) {
                        console.log("some error occurred",e);
                    }
                    next();
                })


                convo.addMessage({
                    "attachments": [
                        {
                            "fallback": "Required plain-text summary of the attachment.",
                            "color": "#36a64f",
                            "pretext": "StartIQ Analysis of your idea",
                            // "author_name": "{{{vars.idea_name}}}",
                            "author_link": "http://flickr.com/bobby/",
                            "author_icon": "http://flickr.com/icons/bobby.jpg",
                            "title": "{{{vars.idea_description}}}",
                            "title_link": "https://api.slack.com/",
                            // "text": "idea desc lorem ipsum upsu sdl sdlkfj sdlfkj idea desc lorem ipsum upsu sdl sdlkfj sdlfkj",
                            "fields": [
                                 {
                                    "title": "Problem Solved",
                                    "value": "{{{vars.problem_solved}}}",
                                    "short": false
                                },
                                {
                                    "title": "Freshness",
                                    "value": "{{{vars.freshness}}}",
                                    "short": false
                                },
                                {
                                    "title": "Fundability probability",
                                    "value": "{{{vars.fundability}}}%",
                                    "short": false
                                },
                                {
                                    "title": "Competition",
                                    "value": "Small",
                                    "short": false
                                },
                                {
                                    "title": "Skills Required",
                                    "value": "{{{vars.startup_skills}}}",
                                    "short": false
                                }
                                ,
                                {
                                    "title": "User Categories",
                                    "value": "{{{vars.user_categories}}}",
                                    "short": false
                                }
                                ,
                                {
                                    "title": "Idea Category",
                                    "value": "{{{vars.idea_categories}}}",
                                    "short": false
                                }
                                ,
                                {
                                    "title": "Predicted Revenue",
                                    "value": "{{{vars.predicted_revenue}}}",
                                    "short": false
                                }
                                ,
                                {
                                    "title": "Top Competitors",
                                    "value": "{{{vars.finally_chosen_competitors}}}",
                                    "short": false
                                }
                            ],
                            "image_url": "http://my-website.com/path/to/image.jpg",
                            "thumb_url": "http://example.com/path/to/thumb.png",
                            "footer": "StartIQ API",
                            "footer_icon": "https://platform.slack-edge.com/img/default_application_icon.png",
                            // "ts": 123456789
                        }
                    ]
                },"deepdive_completed_thread");
                

                convo.addMessage({
                    text : "All done. We've mailed you a link to the report. Keep checking back on the link because as we get information related to your idea, we'll update you!"
                },"deepdive_completed_thread");


                convo.addMessage({
                    text : "Ok, that's fine. You can always add an additional idea by typing 'ideabolt' (one idea) or 'ideastorm' (many ideas) or develop one of your ideas further by typing 'deepdive'."
                },"early_exit_thread");

                convo.activate();

            })
        }
    })
}