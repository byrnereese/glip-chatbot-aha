import aha from './aha'

export const sendAuthorizationLink = async (group, bot) => {
  const authorizeUri = aha.authorizeUri(process.env.RINGCENTRAL_CHATBOT_SERVER + '/rc/oauth',
    { state: `${group.id}:${bot.id}` })
  await bot.sendMessage(group.id, {
    text: `Please [click here](${authorizeUri}) to authorize me to access your Aha data.`
  })
}
