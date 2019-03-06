import AhaOAuthClient from 'aha-io-oauth'
import Aha from 'aha-io'

export const getAhaClient = function( token ) {
    return new Aha({
	token: token,
	subdomain: process.env.AHA_SUBDOMAIN
    });
}

export const ahaOAuth = new AhaOAuthClient(
    process.env.AHA_CLIENT_ID,
    process.env.AHA_CLIENT_SECRET,
    process.env.AHA_SUBDOMAIN
)

