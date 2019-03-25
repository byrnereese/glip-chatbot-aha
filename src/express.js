import axios from 'axios'

import app from './app'

let PORT = process.env.RINGCENTRAL_CHATBOT_SERVER
if (process.env.PORT) { 
    PORT = process.env.PORT
}

app.listen( PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})

setInterval(() => {
  axios.put(`${process.env.RINGCENTRAL_CHATBOT_SERVER}/admin/maintain`, undefined, { auth: {
    username: process.env.RINGCENTRAL_CHATBOT_ADMIN_USERNAME,
    password: process.env.RINGCENTRAL_CHATBOT_ADMIN_PASSWORD
  } })
  axios.put(`${process.env.RINGCENTRAL_CHATBOT_SERVER}/ringcentral/refresh-tokens`)
}, 86400000)
