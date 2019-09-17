const axios = require('axios');
const store = require('../store/store');
const deepdive_replies = require(`../assets/deepdive/deepdive_replies${ Math.floor(Math.random()*2) + 1 }`);
const elasticSearchService =  require('../utils/elasticsearch');
const logger = require('../utils/logger');
const numeral = require('numeral');

const storeIdea = async (userEmailId, ideaObj) => {
    return new Promise( async(resolve, reject) => {
        let url = `${process.env.BACKEND_API_URL}/api/v1/kos`;
        let mailUrl = `${process.env.NOTIFICATION_API_URL}/send-email`;
        let response = null;
        let imageUrl = "";
        let snapshotResponse = null;
        ideaObj.ideaOwner = userEmailId;

        try {
            // ideaObj.totalAddressableMarket = Number(ideaObj.customerSize) * Number(ideaObj.pricePerUser) ;
            let data = ideaObj;
            console.log("data before saving", data);
            response = await axios.post(url,data);
            // snapshotResponse = await axios.get(`${process.env.SNAPSHOT_API_URL}?id=${response.data._id}`);
            // imageUrl = snapshotResponse.data.image;
            // for now imageUrl is following
            imageUrl = `https://startiq.org/get-report?ko=${response.data._id}`
            let mailData = {
                to : [userEmailId],
                from : "engineering@startiq.org",
                subject : "Deepdive Report",
                // body : `Here is the link to the report : ${imageUrl}`
                templateId : "d-f8b5a2347aec48bebbb25cb224fd1e1f",
                dynamic_template_data : {
                    "ideaName" : response.data.ideaDescription,
                    "reportUrl" : imageUrl
                }
            }
            await axios.post(mailUrl, mailData);
        }
        catch(e) {
            console.log("some error occurred",e);
            reject(e);
        }

        resolve({
            success : true,
            // imageUrl : imageUrl,
            koResponse : response.data
        });
    })
}


const fetchIdea = async (id) => {
    return new Promise( async (resolve, reject) => {
        let idea = {};
        let url = `${process.env.BACKEND_API_URL}/api/v1/kos/ko?id=${id}`;
        try {
            let response  = await axios.get(url);
            idea = response.data;
        }
        catch(e){
            console.log(e);
            reject(e);
        }
        resolve(idea);
    })
}





module.exports = function(controller) {
    controller.on('direct_message,direct_mention, interactive_message_callback', async function(bot, message) {

        if(!store.get(message.user)){
            console.log("user not found");
            return ;
        }


        if(message.text === "deepdive" || message.intent === "deepdive_intent" ) {
            logger.log({
                level : "info",
                message : "[deepdive_intent] triggerred successfully",
                metadata : {
                    userId : store.get(message.user)
                }
            });
            let existingIdeasCount = 0;
            let customerSizeEstimate = 0;
            let ideas = [];
            let elasticSearchChosenCompaniesCount = 0;
            let ideaCategoriesMap = {};
            let targetCustomersMap = {};
            let similarCompaniesMap = {};
            let employeeSalaryMap = {};
            let totalEmployeesSalary = 0;
            let otherCostsMap = {};
            let ideaObj = {};
            let chosenCompanies = [];  // chosen from results of es.
            let chosenCompaniesMap = {};
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
            let ideaByKeywordAttachment = {
                attachments : []
            }
            try {
                let ideas = await axios.get(`${process.env.BACKEND_API_URL}/api/v1/kos/count?emailId=${store.get(message.user)}`);
                existingIdeasCount = ideas.data.koCount
            }
            catch(error) {
                console.log(error);
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

                if(!existingIdeasCount){
                    // if no idea present, create a new idea
                    convo.say({
                        text : "Looks like you don’t have any ideas in your binder yet.",
                        action : "new_idea_thread"
                    })

                }

                if(existingIdeasCount > 0) {



                    convo.addQuestion({
                        text : `It looks like you have ${existingIdeasCount} ideas in your binder. `,
                        attachments:[
                            {
                                title : "Want to generate a new idea?",
                                callback_id: '123',
                                attachment_type: 'default',
                                actions: [
                                    {
                                        "name":"yes",
                                        "text": "Yes",
                                        "value": "yes",
                                        "type": "button",
                                    },
                                    {
                                        "name":"no",
                                        "text": "No",
                                        "value": "no",
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
                                convo.gotoThread("exit_without_idea_thread");
                                convo.next();
                            }
                        },
                        {
                            pattern : "yes",
                            callback : function(res, convo) {
                                convo.gotoThread("new_idea_thread");
                                convo.next();
                            }
                        },
                        {
                            pattern : "no",
                            callback : function(res, convo) {
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
                        },
                    ],
                    {},
                    "default")



                    convo.addQuestion({
                        // text : `\n1. Fundability (our estimate of how fundable the idea is based on the recent deal flow)\n2. Freshness (whether the idea you are describing looks like other 'hot' ideas out there)\n3. By when you entered it\n4. I want to enter a new idea\nChoose one or type 'search' to find an idea using keywords. ✏️`,
                        attachments:[
                            {
                                title: 'How would you like me to sort your ideas?',
                                callback_id: '123',
                                attachment_type: 'default',
                                actions: [
                                    {
                                        "name":"sort_criteria",
                                        "text": "Fundability",
                                        "value": "fundability",
                                        "type": "button",
                                    },
                                    {
                                        "name":"sort_criteria",
                                        "text": "Freshness",
                                        "value": "freshness",
                                        "type": "button",
                                    },
                                    {
                                        "name":"sort_criteria",
                                        "text": "Last one",
                                        "value": "last one",
                                        "type": "button",
                                    },
                                    {
                                        "name":"sort_criteria",
                                        "text": "Search ideas",
                                        "value": "search ideas",
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
                                convo.gotoThread("exit_without_idea_thread");
                                convo.next();
                            }
                        },
                        {
                            pattern : "fundability",
                            callback : function(res, convo) {
                                convo.gotoThread("rank_by_fundability_thread");
                                convo.next();
                            }
                        },
                        {
                            pattern : "freshness",
                            callback : function(res, convo) {
                                convo.gotoThread("rank_by_freshness_thread");
                                convo.next();
                            }
                        },
                        {
                            pattern : "last one",
                            callback : function(res, convo) {
                                convo.gotoThread("rank_by_recent_thread");
                                convo.next();
                            }
                        },
                        {
                            pattern : "4",
                            callback : function(res, convo) {
                                convo.gotoThread("new_idea_thread");
                                convo.next();
                            }
                        },
                        {
                            pattern : "search ideas",
                            callback : function(res, convo) {
                                convo.gotoThread("ideas_by_keyword_thread");
                                convo.next();
                            }
                        },
                        {
                            default : true,
                            callback : function(res, convo) {
                                bot.reply(message, {
                                    text : "Please use the buttons below for replying to this question"
                                });
                                convo.repeat();
                                convo.next();
                            }
                        }
                    ],
                    {},
                    "default")
                }

                convo.beforeThread("rank_by_fundability_thread", async function(convo, next) {
                    let url = `${process.env.BACKEND_API_URL}/api/v1/kos/numbered?emailId=${store.get(message.user)}&sortBy=fundability`;
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
                        ideaString += `${index+1}. (${(Math.round(element.fundability*100)).toFixed(0)}%) ${element.ideaDescription} \n`;
                        let unscaledFundability = (Math.round(element.fundability*100)).toFixed(0);
                        let fundabilityStars = "";
                        if(unscaledFundability < 20) {
                            fundabilityStars = "⭐"
                        }
                        if(unscaledFundability >=20 && unscaledFundability <40){
                            fundabilityStars = "⭐⭐"
                        }
                        if(unscaledFundability >=40 && unscaledFundability <60){
                            fundabilityStars = "⭐⭐⭐"
                        }
                        if(unscaledFundability >=60 && unscaledFundability <80){
                            fundabilityStars = "⭐⭐⭐⭐"
                        }
                        if(unscaledFundability >=80 && unscaledFundability <100){
                            fundabilityStars = "⭐⭐⭐⭐⭐"
                        }
                        ideaByFundabilityAttachment.attachments.push({
                            "fallback": "Required plain-text summary of the attachment.",
                            "color": "#36a64f",
                            "author_name": `${index+1}. ${element.ideaDescription}`,
                            "author_icon": "http://flickr.com/icons/bobby.jpg",
                            "fields": [
                                {
                                    "title": "Fundability:",
                                    "value": `${(Math.round(element.fundability*100)).toFixed(0)}%\n${fundabilityStars}`,
                                    "short": false
                                }
                            ],
                            "image_url": "http://my-website.com/path/to/image.jpg",
                            "thumb_url": "http://example.com/path/to/thumb.png",
                            "footer": "StartIQ API",
                            "footer_icon": "https://platform.slack-edge.com/img/default_application_icon.png",
                        })
                    });
                    convo.setVar("ideasByFundability" , ideaString)
                    next();
                })


                convo.addQuestion({
                    text : "Here are your top ideas by fundability. Type the number of the idea you want to develop further.\n",
                    attachments : ideaByFundabilityAttachment.attachments
                },
                [
                    {
                        pattern : bot.utterances.quit,
                        callback : function(res, convo) {
                            convo.gotoThread("exit_without_idea_thread");
                            convo.next();
                        }
                    },
                    {
                        default : true,
                        callback : async function(res, convo) {
                            let number = res.text;
                            let chosenIdeaArray = ideas.filter( (idea) => idea.serial == number );
                            if(!chosenIdeaArray.length){
                                bot.reply(message, "Please enter a valid response.");
                                convo.repeat();
                                return;
                            }
                            let currentIdeaId = chosenIdeaArray[0]._id;
                            let selectedIdea = await fetchIdea(currentIdeaId);
                            ideaObj = {
                                ...selectedIdea
                            }
                            ideaObj.ideaName = ideaObj.ideaDescription.slice(0,200);
                            convo.transitionTo("idea_selected_thread",`You chose "${ideaObj.ideaDescription}"\n`);
                            convo.next();
                        }
                    }
                ],
                {},
                "rank_by_fundability_thread");



                convo.beforeThread("rank_by_freshness_thread", async function(convo, next) {
                    let url = `${process.env.BACKEND_API_URL}/api/v1/kos/numbered?emailId=${store.get(message.user)}&sortBy=freshness`;
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
                        ideaString += `${index+1}. (${element.freshness.toFixed(2)}) ${element.ideaDescription} \n`
                        ideaByFreshnessAttachment.attachments.push({
                            "fallback": "Required plain-text summary of the attachment.",
                            "color": "#36a64f",
                            "author_name": `${index+1}. ${element.ideaDescription}`,
                            "author_icon": "http://flickr.com/icons/bobby.jpg",
                            "fields": [
                                {
                                    "title": "Freshness:",
                                    "value": `${element.freshness.toFixed(2)}`,
                                    "short": false
                                }
                            ],
                            "image_url": "http://my-website.com/path/to/image.jpg",
                            "thumb_url": "http://example.com/path/to/thumb.png",
                            "footer": "StartIQ API",
                            "footer_icon": "https://platform.slack-edge.com/img/default_application_icon.png",
                        })
                    });
                    convo.setVar("ideasByFreshness" , ideaString)
                    next();
                })



                convo.addQuestion({
                    text : "Here are your top ideas by freshness. Type the number of the idea you want to develop further.",
                    attachments : ideaByFreshnessAttachment.attachments
                },
                [
                    {
                        pattern : bot.utterances.quit,
                        callback : function(res, convo) {
                            convo.gotoThread("exit_without_idea_thread");
                            convo.next();
                        }
                    },
                    {
                        default : true,
                        callback : async function(res, convo) {
                            let number = res.text;
                            let chosenIdeaArray = ideas.filter( (idea) => idea.serial == number );
                            if(!chosenIdeaArray.length){
                                bot.reply(message, "Please enter a valid response.");
                                convo.repeat();
                                return;
                            }
                            let currentIdeaId = chosenIdeaArray[0]._id;
                            let selectedIdea = await fetchIdea(currentIdeaId);
                            ideaObj = {
                                ...selectedIdea
                            }
                            ideaObj.ideaName = ideaObj.ideaDescription.slice(0,200);
                            convo.transitionTo("idea_selected_thread",`You chose "${ideaObj.ideaDescription}"\n`);
                            convo.next();
                        }
                    }
                ],
                {},
                "rank_by_freshness_thread");




                convo.beforeThread("rank_by_recent_thread", async function(convo, next) {
                    let url = `${process.env.BACKEND_API_URL}/api/v1/kos/numbered?emailId=${store.get(message.user)}&sortBy=recent`;
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
                        ideaString += `${index+1}. ${element.ideaDescription}\n`;
                        ideaByMostRecentAttachment.attachments.push({
                            "fallback": "Required plain-text summary of the attachment.",
                            "color": "#36a64f",
                            "author_name": `${index+1}. ${element.ideaDescription}`,
                            "author_icon": "http://flickr.com/icons/bobby.jpg",
                            "image_url": "http://my-website.com/path/to/image.jpg",
                            "thumb_url": "http://example.com/path/to/thumb.png",
                            "footer": "StartIQ API",
                            "footer_icon": "https://platform.slack-edge.com/img/default_application_icon.png",
                        })
                    });
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
                            convo.gotoThread("exit_without_idea_thread");
                            convo.next();
                        }
                    },
                    {
                        default : true,
                        callback : async function(res, convo) {
                            let number = res.text;
                            let chosenIdeaArray = ideas.filter( (idea) => idea.serial == number );
                            if(!chosenIdeaArray.length){
                                bot.reply(message, "Please enter a valid response.");
                                convo.repeat();
                                return;
                            }
                            let currentIdeaId = chosenIdeaArray[0]._id;
                            let selectedIdea = await fetchIdea(currentIdeaId);
                            ideaObj = {
                                ...selectedIdea
                            }
                            ideaObj.ideaName = ideaObj.ideaDescription.slice(0,200);
                            convo.transitionTo("idea_selected_thread",`You chose "${ideaObj.ideaDescription}"\n`);
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
                            convo.gotoThread("exit_without_idea_thread");
                            convo.next();
                        }
                    },
                    {
                        default : true,
                        callback : async function(res, convo){
                            let keyword = res.text;
                            let url = `${process.env.BACKEND_API_URL}/api/v1/kos?emailId=${store.get(message.user)}&keyword=${keyword}`;
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
                                    // ideaByKeywordMap[`${index+1}`] = element.ideaDescription;
                                    ideaString += `${index+1}. ${element.ideaDescription}\n`
                                    ideaByKeywordAttachment.attachments.push({
                                        "fallback": "Required plain-text summary of the attachment.",
                                        "color": "#36a64f",
                                        "author_name": `${index+1}. ${element.ideaDescription}`,
                                        "author_icon": "http://flickr.com/icons/bobby.jpg",
                                        "image_url": "http://my-website.com/path/to/image.jpg",
                                        "thumb_url": "http://example.com/path/to/thumb.png",
                                        "footer": "StartIQ API",
                                        "footer_icon": "https://platform.slack-edge.com/img/default_application_icon.png",
                                    })
                                });
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
                            convo.gotoThread("exit_without_idea_thread");
                            convo.next();
                        }
                    },
                    {
                        default : true,
                        callback : async function(res, convo) {
                            let number = res.text;
                            let chosenIdeaArray = ideas.filter( (idea) => idea.serial == number );
                            if(!chosenIdeaArray.length){
                                bot.reply(message, "Please enter a valid response.");
                                convo.repeat();
                                return;
                            }
                            let currentIdeaId = chosenIdeaArray[0]._id;
                            let selectedIdea = await fetchIdea(currentIdeaId);
                            ideaObj = {
                                ...selectedIdea
                            }
                            ideaObj.ideaName = ideaObj.ideaDescription.slice(0,200);
                            convo.transitionTo("idea_selected_thread",`You chose "${ideaObj.ideaDescription}"\n`);
                            convo.next();
                        }
                    }
                ],
                {},
                "ideas_by_keyword_thread");



                convo.addQuestion({
                    text: `Let’s start by entering a new idea. What are you trying to build and for whom?`
                },
                [
                    {
                        pattern : bot.utterances.quit,
                        callback : function(res, convo) {
                            convo.gotoThread("exit_without_idea_thread");
                            convo.next();
                        }
                    },
                    {
                        default : true,
                        callback : function(res, convo) {
                            if(res.text.length< 75){
                                bot.reply(message, {
                                    text : "The description should have atleast 75 characters. Please re-enter."
                                })
                                convo.repeat();
                                return ;
                            }
                            ideaObj.ideaDescription = res.text;
                            ideaObj.ideaName = res.text.slice(0,200);
                            convo.gotoThread("idea_selected_thread");
                            convo.next();
                        }
                    }
                ],
                {},
                "new_idea_thread"
                );




                /**
                 * Now we have the idea
                 */




                convo.beforeThread("idea_selected_thread", async function(convo, next) {
                    // for fetching idea categories from classifier
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
                    convo.setVar("idea_categories", ideaCategoriesString);


                    next();
                })


                convo.addQuestion({
                    text : "What is your product's name?\nOne or two words is good."
                },
                [
                    {
                        pattern : bot.utterances.quit,
                        callback : function(res, convo) {
                            convo.gotoThread("exit_without_idea_thread");
                            convo.next();
                        }
                    },
                    {
                        default : true,
                        callback : function(res, convo){
                            ideaObj.ideaName = res.text;
                            convo.setVar("idea_short_name", res.text);

                            // convo.gotoThread("deepdive_completed_thread");
                            // convo.gotoThread("chosen_offering_type_thread");
                            // convo.gotoThread("determine_startup_costs_thread");


                            convo.gotoThread("choose_idea_categories_thread");
                            convo.next();
                        }
                    }
                ],
                {},
                "idea_selected_thread");

                convo.addMessage({
                    text : "{{{vars.idea_short_name}}} looks like it belongs to one of the following categories. Do any of these seem right? Enter the numbers below and separate each number by a comma (eg. '1,2,4')."
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
                            convo.setVar("user_categories", chosenCategories.join('\n'))

                            logger.log({
                                level : "info",
                                message : JSON.stringify(chosenCategories,null,2),
                                metadata : {
                                    userId : store.get(message.user)
                                }
                            });
                            convo.gotoThread("choose_similar_companies_thread");
                            convo.next();
                        }
                    }
                ],
                {},
                "choose_idea_categories_thread");




                convo.beforeThread("choose_similar_companies_thread", async function(convo, next){
                    let similarCompaniesString = "";
                    try {
                        similarCompanies = await elasticSearchService.search(ideaObj.ideaDescription);
                        similarCompanies.forEach( (element,index) => {
                            similarCompaniesMap[`${index+1}`] = element._source.company_name
                            similarCompaniesString += `${index+1}. ${element._source.company_name}\n${element._source.domain}\n${element._source.description}\n`;
                            let companyDescription = element._source.description;
                            companyDescription = companyDescription.slice(0,200);
                            if(companyDescription.slice(-1) !== " "){
                                let lastWhitespaceIndex = companyDescription.lastIndexOf(' ');
                                companyDescription = companyDescription.slice(0, lastWhitespaceIndex);
                            }
                            companyDescription += "...";
                            companyDescription = companyDescription.toLowerCase();
                            companyDescription = companyDescription.charAt(0).toUpperCase() + companyDescription.slice(1);
                            similarCompaniesAttachment.attachments.push({
                                "fallback": "Required plain-text summary of the attachment.",
                                "color": "#36a64f",
                                "author_name": `${index+1}. ${element._source.company_name}`,
                                "author_link": `http://${element._source.domain}`,
                                "author_icon": "http://flickr.com/icons/bobby.jpg",
                                // "title": `${element._source.company_name}`,
                                // "title_link": `http://${element._source.domain}`,
                                "text": `${companyDescription}`,
                                "image_url": "http://my-website.com/path/to/image.jpg",
                                "thumb_url": "http://example.com/path/to/thumb.png",
                                "footer": "StartIQ API",
                                "footer_icon": "https://platform.slack-edge.com/img/default_application_icon.png",
                            })
                        })
                    }
                    catch(e) {
                        console.log("Error in elasticsearch", e)
                    }

                    logger.log({
                        level : "info",
                        message : JSON.stringify(similarCompaniesAttachment.attachments,null,2),
                        metadata : {
                            userId : store.get(message.user)
                        }
                    });

                    if(!similarCompanies.length){
                        similarCompaniesString = "No similar companies found."
                        convo.setVar("similar_companies", similarCompaniesString);
                        convo.transitionTo("add_missed_similar_companies_thread", "I did not find any similar companies.")
                    }
                    else {
                        convo.setVar("similar_companies", similarCompaniesString);
                    }

                    next();
                })





                convo.addMessage({
                    text : "Have you thought about possible competitors? Here are a few suggestions of similar companies."
                },"choose_similar_companies_thread");

                convo.addMessage({
                    attachments : similarCompaniesAttachment.attachments
                },"choose_similar_companies_thread");

                convo.addQuestion({
                    text : "What do you think? Enter the numbers, separated by commas, corresponding to any similar companies."
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
                                    elasticSearchChosenCompaniesCount++;
                                }
                            })
                            convo.next();
                        }
                    }
                ],
                {},
                "choose_similar_companies_thread");


                convo.addMessage({
                    text : "Glad to see that I know what I'm doing. 😇",
                    action : "add_missed_similar_companies_thread"
                },"choose_similar_companies_thread");



                convo.addQuestion({
                    attachments:[
                        {
                            title: 'Any companies I missed?',
                            callback_id: '123',
                            attachment_type: 'default',
                            actions: [
                                {
                                    "name":"yes",
                                    "text": "Yes",
                                    "value": "yes",
                                    "type": "button",
                                },
                                {
                                    "name":"no",
                                    "text": "No",
                                    "value": "no",
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
                        pattern : "no",
                        callback : function(res, convo) {
                            convo.gotoThread("choose_top_competitor_thread");
                            convo.next();
                        }
                    },
                    {
                        pattern : "yes",
                        callback : function(res, convo){
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

                convo.addQuestion({
                    text : "Tell me who they are and I'll keep track of them. If you have multiple additional competitors, separate their names with commas."
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
                            let companies = res.text.split(',');
                            companies.forEach( company => {
                                chosenCompanies.push(company);
                            })
                            convo.gotoThread("choose_top_competitor_thread");
                            convo.next();
                        }
                    }
                ],
                {},
                "add_missed_similar_companies_thread")


                convo.beforeThread("choose_top_competitor_thread", function(convo, next) {
                    console.log("finally chosen companies", chosenCompanies);
                    ideaObj.competitors = chosenCompanies;
                    let chosenCompaniesString = "";
                    chosenCompanies.forEach( (company , index) => {
                        chosenCompaniesMap[`${index+1}`] = company;
                        chosenCompaniesString += `${index+1}. ${company}\n`
                    })
                    if(chosenCompanies.length <= 1 ){
                        convo.setVar("top_competitor", chosenCompanies[0])
                        convo.setVar("finally_chosen_competitors", chosenCompanies[0]);
                        ideaObj.top_competitor = chosenCompaniesMap[0];
                        convo.gotoThread("chosen_top_competitor_thread");
                    }
                    else {
                        convo.setVar("finally_chosen_competitors", chosenCompaniesString);
                    }
                    next();
                })

                convo.addMessage({
                    text : "Great. Here are all the similar companies we have listed for you."
                },"choose_top_competitor_thread")

                convo.addMessage({
                    text : "{{{vars.finally_chosen_competitors}}}"
                },"choose_top_competitor_thread")



                convo.addQuestion({
                    text : "Ok. Which one is your top competitor?"
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
                                if( Number(res.text) > elasticSearchChosenCompaniesCount ){
                                    //chosen company is from es results. so no need to ask description
                                    console.log("Top competitor : ", chosenCompaniesMap[`${res.text}`]);
                                    convo.setVar("top_competitor", chosenCompaniesMap[`${res.text}`])
                                    ideaObj.top_competitor = chosenCompaniesMap[`${res.text}`];
                                    convo.gotoThread("ask_top_competitor_description_thread");
                                    return ;
                                }
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


                // convo.beforeThread("ask_top_competitor_description_thread", function(convo, next){

                //     next();
                // })

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
                            if(res.text.length< 75){
                                bot.reply(message, {
                                    text : "The description should have atleast 75 characters. Please re-enter."
                                })
                                convo.repeat();
                                return ;
                            }
                            ideaObj.topCompetitorUserDescription = res.text;
                            convo.gotoThread("chosen_top_competitor_thread");
                            convo.next();
                        }
                    }
                ],
                {},
                "ask_top_competitor_description_thread")


                convo.addMessage({
                    text : "Great, got it! I'll keep track of these and send updates."
                },"chosen_top_competitor_thread")

                convo.addMessage({
                    text : "Now let's pivot to customers.",
                    action : "choose_customer_segment_thread"
                },"chosen_top_competitor_thread");

                convo.beforeThread("choose_customer_segment_thread", async function(convo, next){
                    let idea = ideaObj.ideaDescription;
                    let businessProbability = 0;
                    let url = `${process.env.CLASSIFIER_API_URL}/ideaType?idea=${idea}`;
                    console.log(url);
                    try{
                        let response = await axios.get(url);
                        businessProbability = response.data["PRED"][0]["pred"]
                    }
                    catch(e){
                        console.log("errr in idea classifier", e);
                    }
                    let ideaType = (businessProbability > 0.5 ? "business" : "individual consumer");
                    ideaObj.targetSegment = ideaType;
                    convo.setVar("chosen_customer_segment", ideaType )
                    next();
                })

                convo.addQuestion({
                    text : "It looks like you are serving a {{{vars.chosen_customer_segment}}}.",
                    attachments:[
                        {
                            title: 'Is that correct?',
                            callback_id: '123',
                            attachment_type: 'default',
                            actions: [
                                {
                                    "name":"yes",
                                    "text": "Yes",
                                    "value": "yes",
                                    "type": "button",
                                },
                                {
                                    "name":"no",
                                    "text": "No",
                                    "value": "no",
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
                        pattern : "no",
                        callback : function(res, convo) {
                            convo.gotoThread("modify_customer_segment_thread");
                            convo.next();
                        }
                    },
                    {
                        pattern : "yes",
                        callback : function(res, convo){
                            convo.gotoThread("choose_offering_type_thread");
                            convo.next();
                        }
                    },
                    {
                        default : true,
                        callback : function(res, convo){
                            bot.reply(message, {
                                text : "Please use the buttons below for replying to this question"
                            })
                            convo.repeat();
                            convo.next();
                        }
                    }
                ],
                {},
                "choose_customer_segment_thread");


                convo.addQuestion({
                    attachments:[
                        {
                            title: `Which type of customers do you serve?`,
                            callback_id: 'customer_segment',
                            attachment_type: 'default',
                            actions: [
                                {
                                    "name":"type_of_customer",
                                    "text": "Business",
                                    "value": "business",
                                    "type": "button",
                                },
                                {
                                    "name" : "type_of_customer",
                                    "text": "Individual Consumer",
                                    "value": "individual consumer",
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
                            ideaObj.targetSegment = res.text;
                            convo.gotoThread("choose_offering_type_thread");
                            convo.next();
                        }
                    },
                    {
                        pattern : "individual consumer",
                        callback : function(res, convo) {
                            console.log("Chosen customer segment: ",res.text);
                            convo.setVar("chosen_customer_segment", "individual consumer");
                            ideaObj.targetSegment = res.text;
                            convo.gotoThread("choose_offering_type_thread");
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
                "modify_customer_segment_thread");


                convo.beforeThread("choose_offering_type_thread", async function(convo, next){
                    let idea = ideaObj.ideaDescription;
                    let productProbability = 0;
                    let url = `${process.env.CLASSIFIER_API_URL}/offering-type?idea=${idea}`;
                    console.log(url);
                    try{
                        let response = await axios.get(url);
                        productProbability = response.data["PRED"][0]["pred"]
                    }
                    catch(e){
                        console.log("errr in idea classifier", e);
                    }
                    let offeringType = (productProbability > 0.5 ? "product" : "service");
                    ideaObj.offeringType = offeringType
                    convo.setVar("offering_type", offeringType )
                    next();
                })


                convo.addQuestion({
                    text : "Looks like this is a {{{vars.offering_type}}}.",
                    attachments:[
                        {
                            title: 'Is that correct?',
                            callback_id: '123',
                            attachment_type: 'default',
                            actions: [
                                {
                                    "name":"yes",
                                    "text": "Yes",
                                    "value": "yes",
                                    "type": "button",
                                },
                                {
                                    "name":"no",
                                    "text": "No",
                                    "value": "no",
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
                        pattern : "no",
                        callback : function(res, convo) {
                            convo.gotoThread("modify_offering_type_thread");
                            convo.next();
                        }
                    },
                    {
                        pattern : "yes",
                        callback : function(res, convo){
                            convo.gotoThread("chosen_offering_type_thread");
                            convo.next();
                        }
                    },
                    {
                        default : true,
                        callback : function(res, convo){
                            bot.reply(message, {
                                text : "Please use the buttons below for replying to this question"
                            })
                            convo.repeat();
                            convo.next();
                        }
                    }
                ],
                {},
                "choose_offering_type_thread");


                convo.addQuestion({
                    attachments:[
                        {
                            title: `What are you selling?`,
                            callback_id: 'customer_segment',
                            attachment_type: 'default',
                            actions: [
                                {
                                    "name":"offering_type",
                                    "text": "Product",
                                    "value": "product",
                                    "type": "button",
                                },
                                {
                                    "name" : "offering_type",
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
                            console.log("Chosen offering type ", res.text);
                            convo.setVar("offering_type", res.text);
                            ideaObj.offeringType = res.text;
                            convo.gotoThread("chosen_offering_type_thread");
                            convo.next();
                        }
                    },
                    {
                        pattern : "service",
                        callback : function(res, convo) {
                            console.log("Chosen offering type ", res.text);
                            convo.setVar("offering_type", res.text);
                            ideaObj.offeringType = res.text;
                            convo.gotoThread("chosen_offering_type_thread");
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
                "modify_offering_type_thread");



                convo.beforeThread("chosen_offering_type_thread", async function(convo, next){
                    let targetCustomers = [];
                    let ideaDescription = ideaObj.ideaDescription;
                    let url = `${process.env.CLASSIFIER_API_URL}/targetCustomer?idea=${ideaDescription}`
                    try {
                        let response = await axios.get(url);
                        targetCustomers = response.data["PRED"].slice(0,10);
                        console.log(targetCustomers)
                    }
                    catch(e){
                        console.log(e);
                        throw e;
                    }
                    let targetCustomersString = "";
                    targetCustomers.forEach( (element,index) => {
                        let targetCustomer = element.topic;
                        targetCustomer = targetCustomer.charAt(0).toUpperCase() + targetCustomer.slice(1);
                        targetCustomersMap[`${index+1}`] = targetCustomer;
                        targetCustomersString += `${index+1}. ${targetCustomer}\n`;
                    })
                    convo.setVar("target_customer_string", targetCustomersString);
                    next();
                })

                convo.addMessage({
                    text : "Got it! You are selling your {{{vars.offering_type}}} to a {{{vars.chosen_customer_segment}}}."
                },"chosen_offering_type_thread")

                convo.addMessage({
                    text : "Are any of these your target customers?"
                },"chosen_offering_type_thread")

                convo.addQuestion({
                    text : "{{{vars.target_customer_string}}}\n11. None of these"
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
                            let chosenNumber = res.text;
                            if(chosenNumber == 11) {
                                convo.gotoThread("choose_target_customer_thread");
                                convo.next();
                            }
                            else if(targetCustomersMap[`${res.text}`]){
                                convo.setVar("target_customer", targetCustomersMap[`${res.text}`]);
                                ideaObj.targetCustomer = targetCustomersMap[`${res.text}`];
                                convo.gotoThread("chosen_target_customer_thread");
                            }
                            else {
                                bot.reply(message, {
                                    text : "Just choose one of these customer segments, even though there might be more."
                                })
                                convo.repeat();
                            }
                            convo.next();
                        }
                    }
                ],
                {},
                "chosen_offering_type_thread")


                convo.addQuestion({
                    text : "Okay. Please enter the target customer."
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
                        callback : function(res, convo){
                            convo.setVar("target_customer", res.text);
                            ideaObj.targetCustomer = res.text;
                            convo.gotoThread("chosen_target_customer_thread")
                            convo.next();
                        }
                    }

                ],
                {},
                "choose_target_customer_thread");

                convo.beforeThread("chosen_target_customer_thread", async function(convo, next){
                    let targetCustomer = ideaObj.targetCustomer;
                    targetCustomer = targetCustomer.toLowerCase();
                    let url = `${process.env.NUMBER_CONVERTER_API_URL}/customerSizeEstimate?targetCustomer=${targetCustomer}`
                    console.log(url);
                    try{
                        let response = await axios.get(url);
                        console.log("xx", response.data);
                        if(response.data.exists){
                            // if customer exists confirm if estimate correct
                            customerSizeEstimate = response.data.customerSizeEstimate;
                            convo.setVar("customer_size_estimate", numeral(customerSizeEstimate).format('0,0'));
                        }
                        else {
                            // if customer doesn't exist, directly ask for estimated size
                            convo.gotoThread("modify_customer_size_estimate_thread");
                        }
                    }
                    catch(e){
                        console.log(e);
                    }
                    next();
                })

                convo.addQuestion({
                    text : "Approximately {{{vars.customer_size_estimate}}} {{{vars.target_customer}}} could potentially buy your product.",
                    attachments : [
                        {
                            title: 'Does that seem correct?',
                            callback_id: '123',
                            attachment_type: 'default',
                            actions: [
                                {
                                    "name":"yes",
                                    "text": "Yes",
                                    "value": "yes",
                                    "type": "button",
                                },
                                {
                                    "name":"no",
                                    "text": "No",
                                    "value": "no",
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
                        pattern : bot.utterances.yes,
                        callback : function(res, convo){
                            ideaObj.customerSize = customerSizeEstimate;
                            convo.setVar("customer_size", numeral(ideaObj.customerSize).format('0,0'));
                            convo.gotoThread("chosen_customer_size_thread")
                            convo.next();
                        }
                    },
                    {
                        pattern : bot.utterances.no,
                        callback : function(res, convo){
                            convo.gotoThread("modify_customer_size_estimate_thread");
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
                    },
                ],
                {},
                "chosen_target_customer_thread");


                convo.addQuestion({
                    text : "How many {{{vars.target_customer}}} could potentially buy your product?"
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
                            let numberString = res.text;
                            let number = "";
                            try {
                                let response = await axios.get(`${process.env.NUMBER_CONVERTER_API_URL}/convert?text=${numberString}`)
                                number = response.data.value
                            }
                            catch(e){
                                console.log(e);
                                return ;
                            }
                            ideaObj.customerSize = number;
                            convo.setVar("customer_size", numeral(number).format('0,0'));
                            convo.gotoThread("chosen_customer_size_thread");
                            convo.next();
                        }
                    }
                ],
                {},
                "modify_customer_size_estimate_thread");

                convo.addQuestion({
                    text : "How much do you think {{{vars.target_customer}}} are willing to pay per year in USD for your product?"
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
                            let numberString = res.text;
                            let number = "";
                            try {
                                let response = await axios.get(`${process.env.NUMBER_CONVERTER_API_URL}/convert?text=${numberString}`);
                                number = response.data.value;
                            }
                            catch(e){
                                console.log(e);
                                return ;
                            }
                            ideaObj.pricePerUser = number;
                            let totalAddressableMarket = 0;
                            try{
                                totalAddressableMarket = Number(ideaObj.customerSize) * Number(ideaObj.pricePerUser);
                                ideaObj.totalAddressableMarket = Number(ideaObj.customerSize) * Number(ideaObj.pricePerUser) ;
                            }
                            catch(e){
                                console.log("enter a numeric value for the number of users and price per user");
                            }
                            convo.setVar("total_addressable_market", numeral(totalAddressableMarket).format('0,0'));
                            convo.next();
                        }
                    }
                ],
                {},
                "chosen_customer_size_thread")


                convo.addMessage({
                    text : "Based on these assumptions your total addressable market has {{{vars.customer_size}}} {{{vars.target_customer}}}. If this is right, the maximum revenue entire market can generate is ${{{vars.total_addressable_market}}} per year.",
                    action : "determine_startup_costs_thread"
                },"chosen_customer_size_thread");


                //
                // convo.addMessage({
                //     text : "OK. Let me ask you a few questions about your strategy."
                // },"chosen_customer_size_thread")
                //
                // convo.addQuestion({
                //     text : 'Which one of these best describes how you plan to position your startup in the market?',
                //     attachments:[
                //         {
                //             title: "Differentiation - Your product will be different and more attractive than those of your competitors\nCost leadership - Reduce your operating costs and charge average prices OR reduce prices to increase market share.\nFocus - Provide a specialized product to serve a segment of the market that other competitors ignore.",
                //             callback_id: 'startup_position_in_market',
                //             attachment_type: 'default',
                //             actions: [
                //                 {
                //                     "name":"startup position",
                //                     "text": "Differentiation",
                //                     "value": "differentiation",
                //                     "type": "button",
                //                 },
                //                 {
                //                     "name":"startup position",
                //                     "text": "Cost leadership",
                //                     "value": "cost leadership",
                //                     "type": "button",
                //                 },
                //                 {
                //                     "name":"startup position",
                //                     "text": "Focus",
                //                     "value": "focus",
                //                     "type": "button",
                //                 }
                //             ]
                //         }
                //     ]
                // },[
                //     {
                //         pattern : bot.utterances.quit,
                //         callback : function(res, convo) {
                //             convo.gotoThread("early_exit_thread");
                //             convo.next();
                //         }
                //     },
                //     {
                //         default : true,
                //         callback : function(res, convo) {
                //             let positionDescription = "";
                //             switch(res.text) {
                //                 case "differentiation" :
                //                     positionDescription = "Your product will be different and more attractive than those of your competitors"
                //                     break;
                //                 case "cost leadership" :
                //                     positionDescription = "Reduce your operating costs and charge average prices OR reduce prices to increase market share."
                //                     break;
                //                 case "focus" :
                //                     positionDescription = "Provide a specialized product to serve a segment of the market that other competitors ignore."
                //                     break;
                //                 default :
                //                     bot.reply(message, {
                //                         text : "Please use the buttons below for replying to this question"
                //                     })
                //                     convo.repeat();
                //                     return ;
                //             }
                //             convo.setVar("startup_position_in_market", positionDescription);
                //             ideaObj.startupPositionInMarket = res.text;
                //             convo.gotoThread("determine_startup_costs_thread")
                //             convo.next();
                //         }
                //     }
                // ],
                // {},
                // "chosen_customer_size_thread");

                convo.beforeThread("determine_startup_costs_thread", function(convo, next){
                    let employeeSalaryString = "";
                    let count = 1;
                    const salaries = require('../assets/salary/salary');
                    for(let key in salaries) {
                        if(salaries.hasOwnProperty(key)){
                            employeeSalaryMap[count] = salaries[key]["totalCost"];
                            employeeSalaryString += `${count++}. ${key} : $${numeral(salaries[key]["totalCost"]).format('0,0.00')}\n`
                        }
                    }
                    let otherCostsString = "";
                    count = 1;
                    const otherCosts = require('../assets/otherCosts/otherCosts');
                    for (let key in otherCosts) {
                        if(otherCosts.hasOwnProperty(key)){
                            otherCostsMap[count] = otherCosts[key];
                            otherCostsString += `${count++}. ${key} : $${numeral(otherCosts[key]).format('0,0')}\n`
                        }
                    }
                    console.log(otherCostsMap);
                    convo.setVar("employee_salary_string", employeeSalaryString);
                    convo.setVar("other_costs_string", otherCostsString);
                    next();
                })

                convo.addMessage({
                    text : "Finally, let's see if we can get a workable estimate for the cost of starting up."
                },"determine_startup_costs_thread");

                convo.addMessage({
                    text : "Do you anticipate hiring for any of these roles?"
                },"determine_startup_costs_thread")


                convo.addQuestion({
                    text : "{{{vars.employee_salary_string}}}\nEnter the numbers corresponding to the team members you wish to have."
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
                        callback : function(res, convo){
                            let chosenEmployees = [];
                            let numString = res.text.replace(/ /g, '');
                            let chosenNumbers = numString.split(',');
                            chosenNumbers.forEach( number => {
                                if(employeeSalaryMap[`${number}`]) {
                                    chosenEmployees.push(employeeSalaryMap[`${number}`]);
                                }
                            });
                            console.log("Categories chosen: ", chosenEmployees);
                            if(!chosenEmployees.length){
                                bot.reply(message, {
                                    text : "Please choose atleast one team member."
                                });
                                convo.repeat();
                                convo.next();
                                return ;
                            }
                            let overallEmployeesCost = 0;
                            overallEmployeesCost = chosenEmployees.reduce( (sum , current) => sum + current ,0);
                            totalEmployeesSalary = overallEmployeesCost;
                            convo.setVar("overall_employees_cost", numeral(overallEmployeesCost.toFixed(2)).format('0,0.00'));
                            // let totalCost = 0;
                            // chosenEmployees.forEach( element => {
                            //     totalCost += element
                            // })
                            // convo.setVar("user_categories", chosenCategories.join('\n'))
                            convo.next();
                        }
                    }
                ],
                {},
                "determine_startup_costs_thread")

                convo.addMessage({
                    text : "If you hire these people your costs are going to be about ${{{vars.overall_employees_cost}}}."
                },"determine_startup_costs_thread")

                convo.addMessage({
                    // text : "Startups have other costs too. Here are some others: \n1. Rent and utilities\n2. Software\n3. Machinery\n4. Legal fees\n5. Advertising\n6. Interest\n7. Insurance and license"
                    text : "How about these other costs?"
                },"determine_startup_costs_thread")



                convo.addMessage({
                    text : "{{{vars.other_costs_string}}}"
                },"determine_startup_costs_thread");


                convo.addQuestion({
                    text : "Which of these apply to you?"
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
                            let chosenOtherCosts = [];
                            let numString = res.text.replace(/ /g, '');
                            let chosenNumbers = numString.split(',');

                            chosenNumbers.forEach( number => {
                                if(otherCostsMap[`${number}`]) {
                                    chosenOtherCosts.push(otherCostsMap[`${number}`]);
                                }
                            })
                            console.log("Map elements chosen: ", chosenOtherCosts);
                            if(!chosenOtherCosts.length){
                                bot.reply(message, {
                                    text : "Please choose atleast one."
                                });
                                convo.repeat();
                                convo.next();
                                return ;
                            }

                            let totalOtherCosts = 0;
                            totalOtherCosts = chosenOtherCosts.reduce( (sum , current) => sum + current ,0);
                            let annualBurn = totalOtherCosts + totalEmployeesSalary;
                            ideaObj.annualBurn = annualBurn;
                            convo.setVar("annual_burn", numeral(annualBurn.toFixed(2)).format('0,0.00'));
                            convo.next();
                        }
                    }
                ],
                {},
                "determine_startup_costs_thread")


                convo.addMessage({
                    text : "Based on our calculations, you should expect your annual costs to be approximately ${{{vars.annual_burn}}}. Obviously, the costs can be higher or lower. But this is a good place to start."
                },"determine_startup_costs_thread");



                convo.addMessage({
                    text : "All done for now. Hang on, while I analyze your responses and create a report for you...",
                    action : "deepdive_completed_thread"
                },"determine_startup_costs_thread");


                convo.beforeThread("deepdive_completed_thread", async function(convo, next){
                    let userEmailId = store.get(message.user);
                    try {
                        let response = await storeIdea(userEmailId, ideaObj);
                        // bot.reply(message, {
                        //     attachments : [
                        //         {
                        //             "type": "image",
                        //             "title": {
                        //                 "type": "plain_text",
                        //                 "text": "image1",
                        //                 "emoji": true
                        //             },
                        //             "image_url": response.imageUrl,
                        //             "alt_text": "image1"
                        //         }
                        //     ]
                        // })
                        let ideaFreshness = "";
                        switch(response.koResponse.freshness_criteria){
                            case "very_new_idea" :
                                ideaFreshness = "Very new idea, Are you sure you are not entering too early into the market?"
                                break;
                            case "moderately_new_idea" :
                                ideaFreshness = "This is fairly new, but probably not much competition yet. So perhaps a good time."
                                break;
                            case "old_idea" :
                                ideaFreshness = "Looks like an old idea. This has been done before. Please check the competitive landscape and be very sure of your moat."
                                break;
                        }
                        // let scaledFundability = (((Math.round(response.koResponse.fundability) - 0.33 )/0.33)*100).toFixed(0);
                        let scaledFundability = Math.round((response.koResponse.fundability-0.33)/0.33*100).toFixed(0);
                        let unscaledFundability = (Math.round(response.koResponse.fundability*100)).toFixed(0);
                        let fundabilityStars = "";
                        if(unscaledFundability < 20) {
                            fundabilityStars = "⭐"
                        }
                        if(unscaledFundability >=20 && unscaledFundability <40){
                            fundabilityStars = "⭐⭐"
                        }
                        if(unscaledFundability >=40 && unscaledFundability <60){
                            fundabilityStars = "⭐⭐⭐"
                        }
                        if(unscaledFundability >=60 && unscaledFundability <80){
                            fundabilityStars = "⭐⭐⭐⭐"
                        }
                        if(unscaledFundability >=80 && unscaledFundability <100){
                            fundabilityStars = "⭐⭐⭐⭐⭐"
                        }
                        if(scaledFundability <= 0){
                            convo.setVar("fundability", "It looks like your idea is highly unlikely to be funded.")
                        }
                        else{
                            convo.setVar("fundability", scaledFundability);
                        }
                        console.log("star rating", fundabilityStars);
                        convo.setVar("startup_skills", response.koResponse.requiredSkills.join(','));
                        // convo.setVar("fundability", scaledFundability);
                        convo.setVar("fundability_stars", fundabilityStars);
                        convo.setVar("freshness" , ideaFreshness);
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
                            "author_link": "http://flickr.com/bobby/",
                            "author_icon": "http://flickr.com/icons/bobby.jpg",
                            "title": "{{{vars.idea_description}}}",
                            "title_link": "https://api.slack.com/",
                            "fields": [
                                //  {
                                //     "title": "Problem Solved",
                                //     "value": "{{{vars.problem_solved}}}",
                                //     "short": false
                                // },
                                {
                                    "title": "Freshness",
                                    "value": "{{{vars.freshness}}}",
                                    "short": false
                                },
                                {
                                    "title": "Fundability",
                                    "value": "{{{vars.fundability}}}\n{{{vars.fundability_stars}}}",
                                    "short": false
                                },
                                {
                                    "title": "Likelihood of big competitor",
                                    "value": "Small",
                                    "short": false
                                },
                                {
                                    "title": "Skills Required",
                                    "value": "{{{vars.startup_skills}}}",
                                    "short": false
                                }
                                ,
                                // {
                                //     "title": "User Categories",
                                //     "value": "{{{vars.user_categories}}}",
                                //     "short": false
                                // }
                                ,
                                {
                                    "title": "Idea Category",
                                    "value": "{{{vars.user_categories}}}",
                                    "short": false
                                }
                                ,
                                {
                                    "title": "Total Addressable Market",
                                    "value": "${{{vars.total_addressable_market}}}",
                                    "short": false
                                }
                                ,
                                {
                                    "title": "Most similar companies",
                                    "value": "{{{vars.finally_chosen_competitors}}}",
                                    "short": false
                                }
                            ],
                            "image_url": "http://my-website.com/path/to/image.jpg",
                            "thumb_url": "http://example.com/path/to/thumb.png",
                            "footer": "StartIQ API",
                            "footer_icon": "https://platform.slack-edge.com/img/default_application_icon.png",
                        }
                    ]
                },"deepdive_completed_thread");


                convo.addMessage({
                    text : "All done. We've mailed you a link to the report. Keep checking back on the link because as we get information related to your idea, we'll update you!"
                },"deepdive_completed_thread");


                convo.beforeThread("early_exit_thread", function(convo, next){

                    next();
                })


                convo.addMessage({
                    text : "Ok, that's fine. You can always add additional ideas by typing ideastorm` or develop one of your ideas further by typing `deepdive`."
                },"exit_without_idea_thread");


                convo.addQuestion({
                    attachments:[
                        {
                            title: 'Would you like to save the current idea?',
                            callback_id: '123',
                            attachment_type: 'default',
                            actions: [
                                {
                                    "name":"yes",
                                    "text": "Yes",
                                    "value": "yes",
                                    "type": "button",
                                },
                                {
                                    "name":"no",
                                    "text": "No",
                                    "value": "no",
                                    "type": "button",
                                }
                            ]
                        }
                    ]
                },
                [
                    {
                        pattern: "yes",
                        callback: async function(reply, convo) {
                            let userEmailId = store.get(message.user);
                            try {
                                let response = await storeIdea(userEmailId, ideaObj);
                            }
                            catch(e){
                                console.log(e);
                            }
                            convo.next();
                        }
                    },
                    {
                        pattern: "no",
                        callback: function(reply, convo) {
                            convo.next();
                        }
                    },
                    {
                        default: true,
                        callback: function(reply, convo) {
                            convo.repeat();
                            convo.next();
                        }
                    }
                ],
                {},
                "early_exit_thread")

                convo.addMessage({
                    text : "Ok, that's fine. You can always add additional ideas by typing `ideastorm` or develop one of your ideas further by typing `deepdive`."
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
