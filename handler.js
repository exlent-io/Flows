const AWS = require('aws-sdk')
AWS.config.update({
  region: process.env.region,
  accessKeyId: process.env.accessKeyId,
  secretAccessKey: process.env.secretAccessKey
});

const dynamodb = new AWS.DynamoDB();
const router = {}

import axios from 'axios'

async function getSession(body) {
  
  return await axios.post('https://auth.exlent.io/api/auth/get_session', {'session': body.session})
  .catch(err=> {
    return err.response
  })
}

const handler = async (event) => {
  // TODO implement
  if (event.httpMethod != "POST") {
      return { statusCode: 404, body: 'POST only' }
  }
  if (!router.hasOwnProperty(event.path)) {
      return { statusCode: 404, body: 'Endpoint not found' }
  }
  
  const bd = JSON.parse(event.body)
  
  if (!bd.hasOwnProperty('session')) {
      return { statusCode: 400, body: 'missing key: session'}
  }
  const auth = await getSession(bd)
  
  if (auth.status != 200) {
      return { statusCode: 401, body: '' }
  }
  return router[event.path](bd)
  

};

router['/create-flow'] = function(event) {
  const response = {
    statusCode: 200,
    body: JSON.stringify(event),
  };
  return response;
};

router['/get-flows'] = function(event) {
  const response = {
    statusCode: 200,
    body: JSON.stringify(event),
  };
  return response;
};

router['/update-flow'] = function(event) {
  const response = {
    statusCode: 200,
    body: JSON.stringify(event),
  };
  return response;
};

router['/delete-flow'] = function(event) {
  const response = {
    statusCode: 200,
    body: JSON.stringify(event),
  };
  return response;
};

exports.handler = handler