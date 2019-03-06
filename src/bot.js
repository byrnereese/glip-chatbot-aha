import { Service } from 'ringcentral-chatbot/dist/models'
import { ahaOAuth, getAhaClient } from './aha'

export const handle = async event => {
    console.log(event.type, 'event')
    switch (event.type) {
    case 'Message4Bot':
	await handleMessage4Bot(event)
	break
    case 'BotJoinGroup': // bot user joined a new group
	const { bot, groupId } = event
	await bot.sendMessage(groupId, { text: `Hello, I am ![:Person](${bot.id}).` })
	break
    default:
	break
    }
}

const handleMessage4Bot = async event => {
    const { group, bot, text, userId } = event
    const service = await Service.findOne({ where: {
	name: 'Aha', botId: bot.id, groupId: group.id
    } })
    if (text === 'ping') {
	await bot.sendMessage(group.id, { text: 'pong' })
    } else if (text === 'bind') {
	let ahaAuthUrl = ahaOAuth.authorizeUri( process.env.RINGCENTRAL_CHATBOT_SERVER + '/aha/oauth', { responseType: 'code', state: `${group.id}:${bot.id}:${userId}` } )
	await bot.sendMessage(group.id, { text: `Let's [authorize me](${ahaAuthUrl}).` })
    } else if (text.startsWith("feature")) {
	let found = text.match(/feature (.*)$/)
	let featureId = found[1]
	let token = service.data.token
	let aha = getAhaClient( token )
	let resp = aha.feature.get( featureId, function( err, data, response ) {
	    bot.sendMessage(group.id, { text: `Feature you queried: ${data.feature.name}` })
	});
    }
}

