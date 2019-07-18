const store = require('../store/store');
const axios = require('axios');


module.exports = function(controller) {
    controller.on('direct_message', function(bot, message){
        console.log("triggered");
        let userInfo = {};
        if( !store.get(message.user) ){
            bot.createConversation(message, function(err, convo) {
                convo.ask({
                    text : "Hi ! I am the StartIQ bot. Kindly provide your e-mail id for registration purpose."
                },function(res, convo){
                    let email = res.text;
                    try {
                        email = email.slice(email.indexOf('|')+1).slice(0,-1);
                    }
                    catch(e) {
                        console.log("Error in converting email", e);
                    }
                    userInfo.email = email;
                    convo.next();
                })

                convo.ask({
                    text : "Thank you. May I know your name please ?"
                }, function(res, convo){
                    let name = res.text;
                    convo.setVar("username", name);
                    userInfo.username = name;
                    convo.next();
                })

                convo.ask({
                    text : "Which university are you enrolled in ?"
                }, function(res, convo) {
                    let organisation = res.text;
                    userInfo.organisation = organisation
                    convo.next();
                })

                convo.ask({
                    text : "What is your core skillset (business, tech etc.)?  "
                }, function(res, convo) {
                    let skillset = res.text;
                    userInfo.bio = skillset;

                    //Now we have complete data, so save it. 
                    let url = `${process.env.BACKEND_API_URL}/api/v1/users`;
                    axios.post(url, userInfo)
                        .then ( response => {
                            console.log("User details saved" , response.data);
                            store.set(message.user, userInfo.email);
                            convo.gotoThread("save_responses_thread");
                            convo.next()
                        })
                        .catch( error => {
                            console.log("Error occurred in saving user details", error);
                            throw error;
                        })
                })

                convo.addMessage({
                    text : "Thanks {{vars.username}} for providing the details. Now you many proceed by typing 'ideastorm' for recording multiple ideas, or you may type 'deepdive' for exploring a particular idea."
                },"save_responses_thread");

                convo.activate();
            })
        }
    })
}




// quick check if bio complete . beginning of every convo
// you can say ideastorm / deepdive . 




// deepdive list ideas by no. and display in detail

// either preexisting or a new one -> only then first question. 








