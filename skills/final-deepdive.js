const axios = require('axios');
const store = require('../store/store');
const deepdive_replies = require(`../assets/deepdive/deepdive_replies${ Math.floor(Math.random()*2) + 1 }`);
const elasticSearchService =  require('../utils/elasticsearch');


module.exports = function(controller) {
    controller.on('direct_message,direct_mention, interactive_message_callback', async function(bot, message) {

        if(!store.get(message.user)){
            console.log("user not found");
            return ;
        }


        if(message.text === "deepdive") {
            let existingIdeas = [];
            let existingIdeasIndex = 1;
            let ideaByFundabilityMap = {};
            let ideaByFreshnessMap = {};
            let ideaByRecentMap = {};
            let attachment = [];
            let ideaCategoriesMap = {};
            let similarCompaniesMap = {};
            let competitors = [];
            let ideaObj = {};
            let chosenCompanies = [];  // chosen from results of es. 
            let chosenCompaniesMap = {};
            let similarCompanyCountDown = 2;
            try {
                let ideas = await axios.get(`${process.env.BACKEND_API_URL}/api/v1/kos?emailId=${store.get(message.user)}`);
                existingIdeas = ideas.data;
            }
            catch(error) {
                console.log(error);
            }
            console.log(existingIdeas);


            bot.createConversation(message, function(err, convo) {

                if(existingIdeas.length > 0) {
                    convo.addQuestion({
                        text : `It looks like you have ${existingIdeas.length} ideas in your binder. How would you like me to organize your ideas ?\n1. Fundability (our estimate of how fundable the idea is based based on the recent dealflow)\n2. Freshness(whether the idea you are describing looks like other 'hot' ideas out there)\n3. Most recently entered`
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
                        ideaString += `${index+1}. ${element.ideaDescription}\n`    
                    });
                    console.log("Idea by fundability map", ideaByFundabilityMap);
                    convo.setVar("ideasByFundability" , ideaString)
                    next();
                })


                convo.addQuestion({
                    text : "Here are top ideas by fundability score.Type the number of the idea you want to develop further.\n{{vars.ideasByFundability}}\n",
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
                            }
                            console.log(chosenIdea);
                            ideaObj.ideaDescription = chosenIdea;
                            ideaObj.ideaName = chosenIdea.slice(0,200);
                            console.log(ideaObj);
                            convo.transitionTo("idea_selected_thread",`You chose "${chosenIdea}"\n  `);
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
                        ideaString += `${index+1}. ${element.ideaDescription}\n`    
                    });
                    console.log("Idea by freshness map", ideaByFreshnessMap);
                    convo.setVar("ideasByFreshness" , ideaString)
                    next();
                })



                convo.addQuestion({
                    text : "Here are top ideas by freshness score.Type the number of the idea you want to develop further.\n{{vars.ideasByFreshness}}\n",
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
                            }
                            console.log(chosenIdea);
                            ideaObj.ideaDescription = chosenIdea;
                            ideaObj.ideaName = chosenIdea.slice(0,200);
                            console.log(ideaObj);
                            convo.transitionTo("idea_selected_thread",`You chose "${chosenIdea}"\n  `);
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
                        ideaString += `${index+1}. ${element.ideaDescription}\n`    
                    });
                    console.log("idea by recent map", ideaByRecentMap);
                    convo.setVar("most_recent_ideas" , ideaString)
                    next();
                })



                convo.addQuestion({
                    text : "Here are your most recent ideas. Type the number of the idea you want to develop further.\n{{vars.most_recent_ideas}}",
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
                            }
                            console.log(chosenIdea);
                            ideaObj.ideaDescription = chosenIdea;
                            ideaObj.ideaName = chosenIdea.slice(0,200);
                            console.log(ideaObj);
                            convo.transitionTo("idea_selected_thread",`You chose "${chosenIdea}"\n  `);
                            convo.next();
                        }
                    }
                ],
                {},
                "rank_by_recent_thread");



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
                        ideaCategories = response.data["PRED"].slice(0,5);
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
                    text : "Lets begin by giving your product or service a name you can remember?"
                },"idea_selected_thread");

                convo.addQuestion({
                    text : "Just enter a one or two word name for your idea..."
                },
                [
                    {
                        default : true,
                        callback : function(res, convo){
                            ideaObj.shortName = res.text;
                            convo.gotoThread("choose_idea_categories_thread");
                            convo.next();
                        }
                    }
                ],
                {},
                "idea_selected_thread");

                convo.addMessage({
                    text : "Ok, great. Based  on how you described the idea it looks like your product fits one of these product catergories. If any of these are relevant, enter them below and separate each number by a comma(eg. '1,2,4')"
                },"choose_idea_categories_thread");

                convo.addQuestion({
                    text : "{{vars.idea_categories}}"
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
                            convo.next();
                        }
                    }
                ],
                {},
                "choose_idea_categories_thread");



                convo.addQuestion({
                    text : "A well thought-out business idea answers five big questions well. We'll help you answer them and provide some data-driven insights to help you along. Lets start.",
                    attachments:[
                        {
                            title: ` Are you selling a...`,
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
                            title: `Which type of customer do you serve?`,
                            callback_id: 'customer_segment',
                            attachment_type: 'default',
                            actions: [
                                {
                                    "name":"business",
                                    "text": "Business(i.e., B2B)",
                                    "value": "business",
                                    "type": "button",
                                },
                                {
                                    "name" : "individual customer",
                                    "text": "Individual Customer",
                                    "value": "individual_customer",
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
                            convo.setVar("chosen_customer_segment", res.text);
                            ideaObj.chosenCustomerSegment = res.text;
                            convo.next();
                        }
                    },
                    {
                        pattern : "individual_customer",
                        callback : function(res, convo) {
                            console.log("Chosen customer segment: ",res.text);
                            convo.setVar("chosen_customer_segment", res.text);
                            ideaObj.chosenCustomerSegment = res.text;
                            convo.next();
                        }
                    },
                    {
                        pattern : "government",
                        callback : function(res, convo) {
                            console.log("Chosen customer segment: ",res.text);
                            convo.setVar("chosen_customer_segment", res.text);
                            ideaObj.chosenCustomerSegment = res.text;
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
                "choose_idea_categories_thread");


                convo.addQuestion({
                    text : "Got it! You are selling to a {{vars.chosen_customer_segment}}. Can you describe the industry or segment that this {{vars.chosen_customer_segment}} is in? (e.g. Private schools 'sell' to parents, but children 'use' the service.)"
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
                    text : "Who are the end users of your product ?"
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
                    text : "What problem are you solving for this customer? Try to be concrete about it? (see here for example of a strong problem statement)"
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
                            ideaObj.problemBeingSolved = problem;
                            let similarCompaniesString = "";
                            try {
                                similarCompanies = await elasticSearchService.search(problem);
                                similarCompanies.forEach( (element,index) => {
                                    similarCompaniesMap[`${index+1}`] = element._source.company_name
                                    similarCompaniesString += `${index+1}. ${element._source.company_name}\n`;
                                })
                            }
                            catch(e) {
                                console.log("Error in elasticsearch", e)
                            }
                            if(similarCompaniesString === "") {
                                similarCompaniesString = "No similar companies found."
                            }
                            console.log(similarCompaniesString);
                            convo.setVar("similar_companies", similarCompaniesString);
                            convo.gotoThread("choose_similar_companies_thread");
                            convo.next();
                        }
                    }     
                ],
                {},
                "choose_idea_categories_thread");


                convo.addQuestion({
                    text : "Fantastic! I did a few searches and found some companies that describe themselves in a way similar to you...\n{{vars.similar_companies}}\nCheck these out...do any look like they may be competing for the same customers or dollars? Remember they don't have to have the same solution as you to be a competitor, they just have to solve the same or similar problem for your target customer."
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
                            convo.transitionTo("add_missed_similar_companies","Looks like you chose several companies from this list as competitors. Which ones did we miss ? Enter the URL and we will try to dig up some more info for you.");
                            convo.next();
                        }
                    }  
                ],
                {},
                "choose_similar_companies_thread");


                convo.addQuestion({
                    text : ""
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

                            chosenCompanies.push(res.text);
                            console.log("Similar companies chosen: ",chosenCompanies);
                            if(similarCompanyCountDown){
                                similarCompanyCountDown --;
                                convo.repeat();
                            }
                            else {
                                convo.gotoThread("choose_top_competitor_thread");
                            }
                            convo.next();
                        }
                    }
                ],
                {},
                "add_missed_similar_companies");


                convo.beforeThread("choose_top_competitor_thread", function(convo, next) {
                    console.log("finally chosen companies", chosenCompanies);
                    ideaObj.chosenCompanies = chosenCompanies;
                    chosenCompanies.forEach( (company , index) => {
                        chosenCompaniesMap[`${index+1}`] = company;
                    })
                    next();
                })


                convo.addQuestion({
                    text : "OK. Which one of these is your top competitor?"
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
                                convo.repeat();
                            }
                            convo.next();
                        }
                    }
                ],
                {},
                "choose_top_competitor_thread");


                convo.addQuestion({
                    text : "How are you different from {{vars.top_competitor}} ? "
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
                            ideaObj.howDifferentFromTopComp = res.text;
                            convo.next();
                        }
                    }   
                ],
                {},
                "chosen_top_competitor_thread");

                convo.addMessage({
                    text : "OK, we are almost done. Two more questions."
                },"chosen_top_competitor_thread");


                convo.addQuestion({
                    text : "What do you have(skills, data, or something else) that will allow you to offer a higher quality product or one at lower cost than others ?"
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
                            ideaObj.howOfferBetterQualityProd = res.text;
                            convo.next();
                        }
                    }
                ],
                {},
                "chosen_top_competitor_thread");

                convo.addQuestion({
                    text : "Fantastic! Final question is about your business model. How will you make money ?"
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
                            ideaObj.revenueModel = res.text;
                            convo.gotoThread("deepdive_completed_thread");
                            convo.next();
                        }
                    }
                ],
                {},
                "chosen_top_competitor_thread")


                convo.beforeThread("deepdive_completed_thread", async function(convo, next){
                    let url = `${process.env.BACKEND_API_URL}/api/v1/kos`;
                    let data = ideaObj;
                    ideaObj.ideaName = ideaObj.ideaDescription.slice(0,200);
                    ideaObj.ideaOwner = store.get(message.user);
                    let mailUrl = `${process.env.NOTIFICATION_API_URL}/send-email`;
                    let mailData = {
                        to : [store.get(message.user)],
                        from : "engineering@startiq.org",
                        subject : "Test",
                        body : JSON.stringify(data)
                    
                    }
                    console.log("data to save", data);
                    try {
                        let response = await axios.post(url,data);
                        let mailResponse = await axios.post(mailUrl, mailData);
                    }
                    catch(e) {
                        console.log("some error occurred",e);
                    }
                    console.log("data was saved successfully");
                    next();
                })
                

                convo.addMessage({
                    text : "Fantastic. All done. We've mailed you a link to the report. Keep checking back on the link because as we get information related to your idea, we'll update you!"
                },"deepdive_completed_thread");


                convo.addMessage({
                    text : "Ok, thats perfectly fine. You can always add an additional idea by typing 'ideastorm' or develop one of your ideas further by 'deepdive'."
                },"early_exit_thread");

                convo.activate();

            })
        }
    })
}