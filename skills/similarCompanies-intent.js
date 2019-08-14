const store = require('../store/store');
const axios = require('axios');
const elasticSearchService =  require('../utils/elasticsearch');

module.exports = function(controller) {
    controller.on('direct_message, message', function(bot, message){

        if(!store.get(message.user)) {
            console.log("User not found in the local storage.");
            return ;
        }

        if(message.intent === "find_similar_companies_intent"){
            let attachment = [];
            bot.createConversation(message, function(err, convo){

                convo.addQuestion({
                    text : "Please enter the idea and I will find out companies working on similar idea."
                },
                [
                    {
                        pattern : bot.utterances.quit,
                        callback : function(res, convo){

                            convo.next();
                        }
                    },
                    {
                        default : true,
                        callback : async function(res, convo){
                            let url = `${process.env.BACKEND_API_URL}/api/v1/kos`;
                            bot.reply(message, {
                                text : "Hang on, I'll fetch the results."
                            })
                            let similarCompanies = [];
                            let similarCompaniesString = "";
                            try {
                                similarCompanies = await elasticSearchService.search(res.text);
                            }
                            catch(e){
                                console.log("error in elasticsearch", e);
                            }
                            if(!similarCompanies.length){
                                bot.reply(message, {
                                    text : "Looks like there is no company working on that idea."
                                })
                            }
                            else {
                                similarCompanies.forEach( (element,index) => {
                                    similarCompaniesString += `${index+1}. ${element._source.company_name}\n${element._source.domain}\n${element._source.description}\n`;
                                    attachment.push({
                                        "fallback": "Required plain-text summary of the attachment.",
                                        "color": "#36a64f",
                                        // "pretext": "Optional text that appears above the attachment block",
                                        "author_name": `${index+1}. ${element._source.company_name}`,
                                        "author_link": `http://${element._source.domain}`,
                                        "author_icon": "http://flickr.com/icons/bobby.jpg",
                                        "title": `${element._source.domain}`,
                                        "title_link": `http://${element._source.domain}`,
                                        "text": `${element._source.description}`,
                                        // "fields": [
                                        //     {
                                        //         "title": "Priority",
                                        //         "value": "High",
                                        //         "short": false
                                        //     }
                                        // ],
                                        "image_url": "http://my-website.com/path/to/image.jpg",
                                        "thumb_url": "http://example.com/path/to/thumb.png",
                                        "footer": "Slack API",
                                        "footer_icon": "https://platform.slack-edge.com/img/default_application_icon.png",
                                        // "ts": 123456789
                                    })
                                })
                                convo.setVar("similar_companies", similarCompaniesString);
                                convo.gotoThread("results_thread");
                            }
                            convo.next();
                        }
                    }
                ],
                {},
                "default")



                convo.addMessage({
                    text : "I found following companies working on similar idea.",
                    attachments : attachment
                },"results_thread");
                
                convo.activate();
            })
        }
    })
}