import createApp from 'ringcentral-chatbot/dist/apps'
import { Service, Bot } from 'ringcentral-chatbot/dist/models'

import { handle } from './bot'
import { ahaOAuth } from './aha'
import { sendAuthorizationLink } from './util'
import { AllHtmlEntities } from 'html-entities'
import turnDownService from 'turndown'

const app = createApp(handle)
const entities = new AllHtmlEntities()
const turnDown = new turnDownService()

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

app.post('/aha/webhook', async (req, res) => {
    const { groupId, botId } = req.query
    let audit = req.body.audit
    console.log(`Received webhook from Aha (group: ${groupId}, bot: ${botId})...`)
    console.log("Changes: ", audit.changes )
    const bot = await Bot.findByPk(botId)
    let changes = []
    let seen_fields = []
    for (var i in audit.changes) {
	let change = audit.changes[i]
	console.log("Adding change to list: ", change)
	let ignore_fields = new RegExp('(Created by user|Rank|Assigned to user|Show feature remaining estimate|Reference num)')
	if (change.value == '' || // empty value
	    (ignore_fields.test(change.field_name) && audit.audit_action === "create") || // field to ignore
	    seen_fields.includes(change.field_name) // duplicate field
	   ) {
	    continue
	}
	let shortDesc = "Short"
	switch(change.field_name) {
	case "Name":
	case "Description":
	    shortDesc = "Long"
	    break
	}
	let change_value = ''
	if (audit.auditable_type === "note") {
	    change_value = turnDown.turndown(change.value.toString())
	} else {
	    change_value = entities.decode(change.value.toString())
	}
	let change_instruction = {
		"title": change.field_name,
		"value": change_value,
	    "style": shortDesc
	}
	if (change.field_name === "Name") {
	    changes.splice( 0, 0, change_instruction )
	} else {
	    changes.push( change_instruction )
	}
	seen_fields.push( change.field_name )
    }
    console.log( req.body )
    if (audit.interesting) { 
	await bot.sendMessage(groupId, {
	    "text": `${req.body.audit.user.name} ${req.body.audit.description}`,
	    "attachments": [
		{
		    "type": "Card",
		    "color": "#00FF2A",
		    //	"fallback": "Some fallback text",
		    //	"intro": "The following fields were modified in Aha:",
		    //	"author": {
		    //	    "name": "Byrne Reese"
		    //	    ,"uri": "https://example.com/author_link"
		    //	    ,"iconUri": "https://example.com/author_icon.png"
		    //	},
		    "title": `Aha ${audit.audit_action}`,
		    "text": `The following fields were modified ${audit.auditable_url}`,
		    "fields": changes,
		    "footnote": {
			"text": `Changes made by ${audit.user.name}`,
			"time": audit.created_at
		    }
		}
	    ]
	})
    }
    res.send('<!doctype><html><body>OK</body></html>')
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
