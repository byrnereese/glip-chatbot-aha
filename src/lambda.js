const createApp = require('ringcentral-chatbot/dist/apps').default
const { createAsyncProxy } = require('ringcentral-chatbot/dist/lambda')
const serverlessHTTP = require('serverless-http')
const handle = require('./bot')

const app = createApp(handle)
module.exports.app = serverlessHTTP(app)
module.exports.proxy = createAsyncProxy('app')
