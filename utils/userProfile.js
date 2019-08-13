const axios = require('axios');

const slackUserProfile = async (userid) => {
    return new Promise( async (resolve, reject) => {
        let userEmail = "";
        try {
            let response = await axios.get(`https://slack.com/api/users.profile.get?token=xoxp-339576418113-553885412929-714012742629-c26b6506eb089f708f845e5178aed588&user=${userid}`)
            userEmail = response.data.profile.email;
            userRealName = response.data.profile.real_name;
            userDisplayName = response.data.profile.display_name;
        }
        catch(e){
            console.log(e.message);
            reject(e);
        }
        resolve({
            userEmail,
            userRealName,
            userDisplayName
        });
    })
}

module.exports = {
    slackUserProfile
}


// slackUserProfile('UG9S1C4TB')
//     .then ( res => {
//         console.log(res);
//     })
//     .catch( err => {
//         console.log(err);
//     })
