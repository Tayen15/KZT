const config = require('../config');
const { Events, ActivityType } = require('discord.js');
const adhan = require('namaz');
const moment = require('moment-timezone');

const date = new Date();
var coordinates = new adhan.Coordinates(-6.418145, 106.862089);
var params = adhan.CalculationMethod.Singapore();
var precisionOn = true;
params.madhab = adhan.Madhab.Hanafi;
var prayerTimes = new adhan.PrayerTimes(coordinates, date, params, precisionOn);

var fajrTime = moment(prayerTimes.fajr).tz('Asia/Jakarta').format('h:mm:ss A');
var maghribTime  = moment(prayerTimes.maghrib).tz('Asia/Jakarta').format('h:mm:ss A');

module.exports = {
    name: Events.ClientReady,   
    once: true,
    execute(client) {
        console.log('%s is online: %s servers, and %s members', client.user.username, client.guilds.cache.size, client.users.cache.size);

        const statusType = ActivityType.Listening;
        client.user.setPresence({
            activities: [
               { name: 'PANAS ANJING', type: statusType }
            ]
        });
    }
};
