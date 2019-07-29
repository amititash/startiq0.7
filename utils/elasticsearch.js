const elasticsearch = require('elasticsearch');

const client = new elasticsearch.Client({
    host : `${process.env.ELASTIC_CLOUD_URL}`
});

let search = function(keyword) {
    return new Promise( async (resolve, reject) => {
        let response = [];
        let esResult = {};
        let query = {
            index : 'companies',
            body : {
                "query": {
                    "more_like_this" : {
                        "fields" : ["description"],
                        "like" : `${keyword}`,
                        "min_term_freq" : 1,
                        "max_query_terms" : 12
                    }
                }
            },
            size : 10
        }
        try {
            esResult = await client.search(query);
        }
        catch(e) {
            console.log(e);
            reject(e);
        }
        if(esResult.hits) {
            response = esResult.hits.hits || [];
        }
        resolve(response);
    })
}


module.exports = { search }