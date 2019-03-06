import createApp from 'ringcentral-chatbot/dist/apps'
import { Service, Bot } from 'ringcentral-chatbot/dist/models'

import { handle } from './bot'
import { ahaOAuth } from './aha'
import { sendAuthorizationLink } from './util'

const app = createApp(handle)

app.get('/aha/oauth', async (req, res) => {
    const { code, state } = req.query
    const [groupId, botId, userId] = state.split(':')

    // This is where we do our Aha auth magic. 
    await ahaOAuth.authorize({ code: code, redirectUri: process.env.RINGCENTRAL_CHATBOT_SERVER + '/aha/oauth' })

    const token = ahaOAuth.token()
    
    // Bearer token in hand. Now let's stash it.
    const query = { name: 'Aha', groupId, botId }
    const data = { id: userId, token }
    const service = await Service.findOne({ where: query })
    if (service) {
	await service.update({ data })
    } else {
	await Service.create({ ...query, data })
    }

    const bot = await Bot.findByPk(botId)
    // Test to see if token works
    //const r = await rc.get('/restapi/v1.0/account/~/extension/~')
    // Send user confirmation message
    await bot.sendMessage(groupId, { text: `I have been authorized to fetch data from Aha` })
    res.send('<!doctype><html><body><script>close()</script></body></html>')
})

/*
app.put('/aha/refresh-tokens', async (req, res) => {
    const services = await Service.findAll()
    for (const service of services) {
	aha.token(service.data.token)
	try {
	    await rc.refresh()
	} catch (e) {
	    console.error(e)
	    if (e.data && /\btoken\b/i.test(e.data.message)) { // refresh token expired
		const bot = await Bot.findByPk(service.botId)
		await bot.sendMessage(service.groupId, { text: 'Authorization expired' })
		await sendAuthorizationLink({ id: service.groupId }, bot)
		await service.destroy()
	    }
	    continue
	}
	const token = rc.token()
	await service.update({
	    data: {
		id: token.owner_id, token
	    }
	})
    }
    res.send('')
})
*/

export default app
