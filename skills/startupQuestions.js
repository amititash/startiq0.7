const store = require('../store/store');
const axios = require('axios');
const logger = require('../utils/logger');
const questionElasticSearch = require('../utils/es_startupQuestions.js');

module.exports = function(controller) {
    controller.on('direct_message, message' , function(bot, message){
        if(!store.get(message.user)) {
            console.log("User not found in local storage.");
            return ;
        }
        if(message.intent === "startup_questions_intent") {


            let questionsMap = {};

            bot.createConversation(message, function(err, convo) {


                logger.log({
                    level : "info",
                    message : message.text,
                    metadata : {
                        convo : true,
                        userId : store.get(message.user)
                    }
                });



                convo.addQuestion({
                    text : "Okay. What is your question?"
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
                            let question = res.text;
                            let similarQuestionsString = "";
                            let nluUrl = `${process.env.NUMBER_CONVERTER_API_URL}/getTags?text=${question}`
                            try {
                                let tagsNluResponse = await axios.get(nluUrl);
                                let tags = tagsNluResponse.data.tags;
                                if(tags.length){
                                    //if we get tags then question is replaced by concat of tags, else remains same
                                    question = tags.join(' ');
                                }
                                let response = await questionElasticSearch.questionSearch(question);
                                response = response.slice(0,4);
                                response.forEach( (element,index) => {
                                    questionsMap[`${index+1}`] = element._source;
                                    similarQuestionsString += `${index+1}. ${element._source.Question}\n`
                                })
                                convo.setVar("similar_questions", similarQuestionsString);
                            }
                            catch(e) {
                                console.log(e);
                            }
                            convo.next();
                        }
                    }
                ],
                {},
                "default");

                convo.addMessage({
                    text : "We found following questions similar to yours."
                },"default");

                convo.addMessage({
                    text :"{{{vars.similar_questions}}}"
                },"default");

                convo.addQuestion({
                    text : "Which of these is most relevant?"
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
                            let num = res.text;
                            if(!questionsMap[num]){
                                bot.reply(message, {
                                    text : "Please choose a valid option."
                                });
                                convo.repeat();
                            }
                            else {
                                let answersString = "";
                                let count = 1;
                                console.log('sel question' , questionsMap[num] );
                                for(let key in questionsMap[num]){
                                    if(questionsMap[num].hasOwnProperty(key)){
                                        if(key !== "Question"){
                                            answersString += `${count++}. ${questionsMap[num][key]}\n`
                                        }
                                    }
                                }
                                convo.setVar("answers_string", answersString)
                            }
                            convo.next();
                        }
                    }
                ],
                {},
                "default");

                convo.addMessage({
                    text : "We have found following answers to your question."
                },"default");

                convo.addMessage({
                    text : "{{{vars.answers_string}}}"
                },"default");




                convo.addMessage({
                    text : "Okay. That's fine. You can always type `startiq questions` to get answers to your questions."
                },"early_exit_thread")

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
