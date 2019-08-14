const store = require('../store/store');
const axios = require('axios');

module.exports = function(controller) {
    controller.on('direct_message, message', function(bot, message){

        if(!store.get(message.user)) {
            console.log("User not found in the local storage.");
            return ;
        }

        if(message.intent === "calculate_freshness_intent"){
            let attachment = [];
            bot.createConversation(message, function(err, convo){

                convo.addQuestion({
                    text : "Please enter the idea and I will find out the freshness score."
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
                        callback : async function(res, convo){
                            let url = `${process.env.BACKEND_API_URL}/api/v1/kos`;
                            let koData = {
                                ideaOwner : store.get(message.user),
                                ideaDescription : res.text,
                                ideaName : res.text.slice(0,200)
                            }
                            try {
                                let response = await axios.post(url, koData);
                                let createdKo = response.data;
                                attachment.push({
                                    
                                    "fallback": "Required plain-text summary of the attachment.",
                                    "color": "#36a64f",
                                    // "pretext": "Here are the top ideas by fundability. Type the number of the idea you want to develop further.",
                                    "author_name": `${createdKo.ideaDescription}`,
                                    // "author_link": "http://flickr.com/bobby/",
                                    "author_icon": "http://flickr.com/icons/bobby.jpg",
                                    // "title": `${createdKo.ideaDescription}`,
                                    // "title_link": "https://api.slack.com/",
                                    // "text": "Optional text that appears within the attachment",
                                    "fields": [
                                        {
                                            "title": "Freshness:",
                                            "value": `${createdKo.freshness_criteria}`,
                                            "short": false
                                        }
                                    ],
                                    "image_url": "http://my-website.com/path/to/image.jpg",
                                    "thumb_url": "http://example.com/path/to/thumb.png",
                                    "footer": "Slack API",
                                    "footer_icon": "https://platform.slack-edge.com/img/default_application_icon.png",
                                    // "ts": 123456789
                                    
                                })
                                convo.setVar("fundability_score", createdKo.fundability);
                            }
                            catch(e){
                                console.log("some error occurred", e);
                            }
                            convo.gotoThread("result_thread");
                            convo.next();
                        }
                    }
                ],
                {},
                "default");

                convo.addMessage({
                    attachments : attachment
                },"result_thread");


                convo.addMessage({
                    text : "Ok, that's fine. You can always add an additional idea by typing 'ideabolt' (one idea) or 'ideastorm' (many ideas) or develop one of your ideas further by typing 'deepdive'."
                },"early_exit_thread");
                
                convo.activate();
            })
        }
    })
}