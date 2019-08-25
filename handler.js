const AWS = require('aws-sdk')
AWS.config.update({
  region: process.env.region,
  accessKeyId: process.env.accessKeyId,
  secretAccessKey: process.env.secretAccessKey
});

let ddb = null
const tableName = 'exlentflow'
const router = {}

import axios from 'axios'
const uuidv4 = require('uuid/v4')

async function getSession(body) {

  return await axios.post('https://auth.exlent.io/api/auth/get_session', { 'session': body.session })
    .catch(err => {
      return err.response
    })
}

const handler = async (event) => {
  // TODO implement
  if (event.httpMethod == "OPTIONS") {
    return {
      statusCode: 200, headers: {
        "access-control-allow-headers": "*",
        "access-control-allow-methods": "DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT",
        "access-control-allow-origin": event.headers.origin
      }
    }
  }
  const response = await doHandle(event)
  if (response.headers == null) {
    response.headers = {}
  }
  if (response.headers['access-control-allow-origin'] == null) {
    response.headers["access-control-allow-origin"] = event.headers.origin
  }
  return response
}

async function doHandle(event) {
  if (event.httpMethod != "POST") {
    return { statusCode: 404, body: 'POST only' }
  }
  if (!router.hasOwnProperty(event.path)) {
    return { statusCode: 404, body: 'Endpoint not found' }
  }

  const bd = JSON.parse(event.body)

  if (!bd.hasOwnProperty('session')) {
    return { statusCode: 400, body: 'missing key: session' }
  }
  const auth = await getSession(bd)

  if (auth.status != 200) {
    return { statusCode: 401, body: '' }
  }
  ddb = new AWS.DynamoDB.DocumentClient()

  bd.auth = auth.data
  try {
    return await router[event.path](bd)
  } catch(e) {
    console.log(e)
    return { statusCode: 500, body: e.toString()}
  }
};

router['/create-flow'] = async function (event) {
  if (event.n == null) {
    return { statusCode: 400, body: 'missing key' }
  }

  const flowid = uuidv4().replace(/-/g, '')
  try {
    const r = await ddb.put({
      TableName: tableName,
      Item: {
        'gid': event.auth.gid,
        'flowid': flowid,
        // name
        'n': event.n
        // do not put empty array or empty string with doc lib or exception occurs
        // data source
        // 'ds': [],
        // template
        // 'tp': []
      }
    }).promise()
    return { statusCode: 200, body: JSON.stringify({ 'flowid': flowid }) }
  } catch (error) {
    return { statusCode: 500, body: `write ddb err: ${error.stack}` }
  }
};

router['/list-flows'] = async function (event) {
  let r = null
  try {
    r = await ddb.query({
      TableName: tableName,
      KeyConditionExpression: "gid = :gid",
      ExpressionAttributeValues: {
        ":gid": event.auth.gid
      }
    }).promise()
    return { statusCode: 200, body: JSON.stringify(r) }
  } catch (error) {
    return { statusCode: 500, body: `query ddb err: ${error.stack}` }
  }
};


router['/get-flow'] = async function (event) {
  if (event.n == null) {
    return { statusCode: 400, body: 'missing key' }
  }

  let r = null
  try {
    r = await ddb.get({
      TableName: tableName,
      Key: {
        "gid": gid,
        "n": event.n
      }
    }).promise()
    return { statusCode: 200, body: JSON.stringify(r) }
  } catch (error) {
    return { statusCode: 500, body: `query ddb err: ${error.stack}` }
  }
};

router['/update-flow'] = async function (event) {
  for (const key of ['flow']) {
    if (event[key] == null) {
      return { statusCode: 400, body: 'missing key' }
    }
  }
  const flow = event.flow
  for (const key of ['n', 'gid', 'flowid']) {
    if (flow[key] == null) {
      return { statusCode: 400, body: 'invalid flow' }
    }
  }
  if (flow.gid !== event.auth.gid) {
    return { statusCode: 401, body: 'invalid gid' }
  }
  const setExp = []
  const rmExp = []
  const expAttr = {}
  for (const key of ['ds', 'tp', 'gdrive']) {
    if (flow[key] != null) {
      setExp.push(`${key} = :${key}`)
      expAttr[`:${key}`] = flow[key]
    } else {
      rmExp.push(`${key}`)
    }
  }
  console.log("5")
  let exp = ""
  if (setExp.length > 0) {
    exp += `set ${setExp.join(', ')}`
  }
  if (rmExp.length > 0) {
    exp += ` remove${rmExp.join(', ')}`
  }
  console.log("6")
  const params = {
    TableName: tableName,
    Key: {
      "gid": event.auth.gid,
      "flowid": flow.flowid
    },
    UpdateExpression: exp,
    ExpressionAttributeValues: expAttr,
    ReturnValues: "UPDATED_NEW"
  };

  console.log("Updating the item...");
  try {
    const r = await ddb.update(params).promise()
    return { statusCode: 200, body: JSON.stringify(r) }
  } catch (error) {
    return { statusCode: 500, body: `query ddb err: ${error.stack}` }
  }
};

router['/delete-flow'] = async function (event) {
  const response = {
    statusCode: 200,
    body: JSON.stringify(event),
  };
  return response;
};

exports.handler = handler