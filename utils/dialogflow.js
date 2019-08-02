require('dotenv').config();

const options = {
    projectId : process.env.dialogflow
}

const dialogflowMiddleware = require('botkit-middleware-dialogflow-v2')(options);


module.exports  = dialogflowMiddleware;