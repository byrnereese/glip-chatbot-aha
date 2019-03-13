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
    let token = service.data.token

    if (text === 'bind') {
	if (token) {
	    await bot.sendMessage(group.id, { text: `It appears you already have an active connection to Aha in this team.` })
	} else {
	    let ahaAuthUrl = ahaOAuth.authorizeUri( process.env.RINGCENTRAL_CHATBOT_SERVER + '/aha/oauth', { responseType: 'code', state: `${group.id}:${bot.id}:${userId}` } )
	    await bot.sendMessage(group.id, { text: `Let's [authorize me](${ahaAuthUrl}).` })
	}

    } else if (text === 'unbind') {
	if (token) {
	    // TODO - remove all tokens and subscriptions
	    await bot.sendMessage(group.id, { text: `TODO: remove all tokens and subscriptions` })
	} else {
	    await bot.sendMessage(group.id, { text: `It does not appear you have a current connection to Aha in this team.` })
	}
	
    } else if (text.startsWith("subscribe")) {
	// TODO - persist in database that this group is subscribed to a product id
	if (token) {
	    let found = text.match(/subscribe (.*)$/)
	    let productCode = found[1]
	    let aha = getAhaClient( token )
	    let server = process.env.RINGCENTRAL_CHATBOT_SERVER
	    let hookUrl = server + `/aha/webhook?group=${group.id}&bot=${bot.id}`
	    let resp = aha.product.get( productCode, function( err, data, response ) {
		bot.sendMessage(group.id, { text: `To receive updates in this Team from Aha:\n1. [Create a new Activity Webhook in Aha](https://ringcentral.aha.io/settings/projects/${found}/integrations/new)\n2. In the Hook URL field, enter: ${hookUrl}\n3. Select the activities you would like to subscribe to.` })
	    });
	} else {
	    await bot.sendMessage(group.id, { text: `It does not appear you have a current connection to Aha in this team.` })
	}

    } else if (text === "help") {
	await bot.sendMessage(group.id, { text: `Here are the commands I am able to respond to:\n* **bind** - connect to your Aha account\n* **unbind** - disconnect from your Aha account\n* **subscribe <product ID>** - pass in the three letter product id and get directions on how to start receiving notifications for changes in that product` })

    }
}

