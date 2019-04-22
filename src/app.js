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
    if (typeof groupId === "undefined" || typeof botId === "undefined") { 
	console.log( "Received a webhook but the group and bot IDs were empty. Something is wrong.")
	// TODO - communicate this to the user so they can fix. 
	res.send('<!doctype><html><body>OK</body></html>')
	return
    }
    let audit = req.body.audit
    console.log(`Received webhook from Aha (group: ${groupId}, bot: ${botId})...`)
    const bot = await Bot.findByPk(botId)
    if audit.description.includes('added custom field for') {
	audit.interesting = false
    }
    if (bot) {
	if (audit.interesting) { 
	    let changes = []
	    let seen_fields = []
	    for (var i in audit.changes) {
		let change = audit.changes[i]
		let ignore_fields = new RegExp('(Created by user|Rank|Assigned to user|Show feature remaining estimate|Reference num)')
		if (change.value == '' || // empty value
		    (ignore_fields.test(change.field_name) && audit.audit_action === "create") || // field to ignore
		    seen_fields.includes(change.field_name) // duplicate field
		   ) {
		    continue
		}
		let shortDesc = "Short"
		if (change.field_name == "Name" ||
		    change.field_name == "Description" ||
		    change.field_name.includes('Comment by')) {
		    shortDesc = "Long"
		}
		let change_value = ''
		if (audit.auditable_type === "note" || 
		    change.field_name.includes("Comment by")) {
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
		} else if (change_value.trim().length > 0) {
		    // ignore if the change has no description or value
		    changes.push( change_instruction )
		}
		seen_fields.push( change.field_name )
	    }
	    // do not post a message if there are no changes to post about
	    if (changes.length > 0) {
		if (audit.audit_action != "destroy") {
		    let attachement = [
			{
			    "type": "Card",
			    "color": "#00FF2A",
			    "title": `Aha ${audit.audit_action}`,
			    "text": `The following fields were modified ${audit.auditable_url}`,
			    "fields": changes,
			    "footnote": {
				"text": `Changes made by ${audit.user.name}`,
				"time": audit.created_at
			    }
			}
		    ];
		}
		await bot.sendMessage(groupId, {
		    "text": `${req.body.audit.user.name} ${req.body.audit.description}`,
		    "attachments": attachment 
		})
	    }
	}
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
