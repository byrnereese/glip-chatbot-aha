const serverlessHTTP = require('serverless-http')
const { createAsyncProxy } = require('ringcentral-chatbot/dist/lambda')
const createApp = require('ringcentral-chatbot/dist/apps').default

const app = require('./app').default
//import app from './app'
//const handle = require('./bot')
//const app = createApp(handle)

module.exports.app = serverlessHTTP(app)
module.exports.proxy = createAsyncProxy('app')
