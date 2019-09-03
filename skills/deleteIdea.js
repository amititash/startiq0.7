const store = require('../store/store');
const axios = require('axios');
const logger = require('../utils/logger');


const deleteIdea = (id) => {
    return new Promise( async(resolve, reject) => {
        let url = `${process.env.BACKEND_API_URL}/api/v1/kos?id=${id}`; 
        let idea = {};
        try{
            let response  = await axios.delete(url);
            idea = response.data;
            resolve(idea);
        }
        catch(e){
            console.log(e);
            reject(e);
        }
    })
};


const deleteAllIdeas = (userEmailId) => {
    return new Promise( async (resolve, reject) => {
        let url = `${process.env.BACKEND_API_URL}/api/v1/kos/all?emailId=${userEmailId}`;
        try {
            let response = await axios.delete(url);
            resolve(response);
        }
        catch(e){
            console.log(e);
            reject(e);
        }
    })
}



module.exports = function(controller) {
    controller.on('direct_message, message', async function(bot, message){

        if(!store.get(message.user)) {
            console.log("User not found in the local storage.");
            return ;
        }

        if(message.text === "delete idea" || message.intent === "delete_idea_intent"){
            let ideas = [];
            let attachments = []
            let url = `${process.env.BACKEND_API_URL}/api/v1/kos?emailId=${store.get(message.user)}`;
            try {
                let response = await axios.get(url);
                ideas = response.data;
            }
            catch(e){
                console.log(e);
                return;
            }
            ideas.forEach( (element,index) => {
                attachments.push({
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
            bot.createConversation(message, function(err, convo){

                logger.log({
                    level : "info",
                    message : message.text,
                    metadata : {
                        convo : true,
                        userId : store.get(message.user)
                    }
                });

                if(!ideas.length){
                    convo.addMessage({
                        action : "no_existing_ideas_thread"
                    },"default");
                }

                convo.addQuestion({
                    attachments:[
                        {
                            title: 'Would you like to delete all ideas or a single idea?',
                            callback_id: '123',
                            attachment_type: 'default',
                            actions: [
                                {
                                    "name":"all",
                                    "text": "All ideas",
                                    "value": "all ideas",
                                    "type": "button",
                                },
                                {
                                    "name":"single",
                                    "text": "Single idea",
                                    "value": "single idea",
                                    "type": "button",
                                }
                            ]
                        }
                    ]
                },[
                    {
                        pattern: "single idea",
                        callback: function(reply, convo) {
                            convo.gotoThread("delete_single_idea_thread")
                            convo.next();
                        }
                    },
                    {
                        pattern: "all ideas",
                        callback: async function(reply, convo) {
                            let userEmailId = store.get(message.user);
                            try{
                                let response = await deleteAllIdeas(userEmailId);
                                console.log("del success");
                                bot.reply(message, {
                                    text : "Idea(s) successfully deleted."
                                })
                            }
                            catch(e){
                                console.log(e);
                            }
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
                "default");

                convo.addMessage({
                    text : "Here are all the ideas in your binder."
                },"delete_single_idea_thread");


                convo.addMessage({
                    attachments : attachments
                },"delete_single_idea_thread")

                convo.addQuestion({
                    text : "Type the number of the idea that you want to delete."
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
                            let number = res.text;
                            let chosenIdeaArray = ideas.filter( (idea) => idea.serial == number );
                            if(!chosenIdeaArray.length){
                                bot.reply(message, "Please enter a valid response.");
                                convo.repeat();
                                return;
                            }
                            let currentIdeaId = chosenIdeaArray[0]._id;
                            try {
                                let deletedIdea = await deleteIdea(currentIdeaId);
                                console.log("deleted idea", deletedIdea);
                                convo.gotoThread("successfully_deleted_thread");
                            }
                            catch(e){
                                convo.gotoThread("error_thread");
                            }
                            convo.next();
                        }
                    }
                ],
                {},
                "delete_single_idea_thread")


                convo.addMessage({
                    text : "You have no ideas in your binder."
                },"no_existing_ideas_thread");


                convo.addMessage({
                    text : "Oops! Something went wrong."
                },"error_thread");


                convo.addMessage({
                    text : "Ok, that's fine. You can always add an additional idea by typing 'ideabolt' (one idea) or 'ideastorm' (many ideas) or develop one of your ideas further by typing 'deepdive'."
                },"early_exit_thread");

                convo.addMessage({
                    text : "Idea(s) successfully deleted."
                },"successfully_deleted_thread");


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