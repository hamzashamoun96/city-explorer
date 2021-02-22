'use strict';

const express = require('express');
const server = express();

const dot = require('dotenv');
dot.config();

const cors = require('cors');

server.use(cors());
const PORT = process.env.PORT || 4000;

const superAgent = require('superagent')


// Routes 

server.get('/location', locHandler)
server.get('/weather', wetherHandler)
server.get('/parks', parksHandler)
server.get('*', errHandler)


// Handler Functions

// http://localhost:3500/location?city=amman
function locHandler(req, res) {

    const cityName = req.query.city;
    let key = process.env.LOCATION_KEY;
    let url = `https://api.locationiq.com/v1/autocomplete.php?key=${key}&q=${cityName}`

    superAgent.get(url)
        .then(locData => {
            const locObj = new Location(cityName, locData.body[0]);
            res.send(locObj);
        })
}

// http://localhost:3500/weather?search_query=amman&formatted_query=Amman%2C%20Amman%2C%2011181%2C%20Jordan&latitude=31.9515694&longitude=35.9239625&page=1
function wetherHandler(req, res) {

    const cityName = req.query.search_query;
    let key = process.env.WEATHER_KEY;
    let url = `https://api.weatherbit.io/v2.0/forecast/daily?city=${cityName}&key=${key}`;

    superAgent.get(url)
        .then(wethData => {
            let wethObjArr = wethData.body.data.map(value => {
                return new Weather(value)
            })
            res.send(wethObjArr);
        })
}

// http://localhost:3500/parks?search_query=amman&formatted_query=Amman%2C%20Amman%2C%2011181%2C%20Jordan&latitude=31.9515694&longitude=35.9239625&page=1
function parksHandler(req, res) {

    const cityName = req.query.search_query;
    let key = process.env.PARKS_KEY;
    let url = `https://developer.nps.gov/api/v1/parks?q=${cityName}&api_key=${key}`

    superAgent.get(url)
        .then(parksData => {
            let parksObjArr = parksData.body.data.map(value => {
                return new Parks(value)
            })
            res.send(parksObjArr);
        })
}



function errHandler(req, res) {
    let errObj = {
        status: 500,
        responseText: "Sorry, something went wrong"
    }
    res.send(errObj);
}


// Constructors

function Location(cityName, locData) {
    this.search_query = cityName;
    this.formatted_query = locData.display_name;
    this.latitude = locData.lat;
    this.longitude = locData.lon;
}
function Weather(wetherData) {
    this.forecast = wetherData.weather.description;
    this.time = new Date(wetherData.datetime).toString().slice(0,15);;
}
function Parks(parksData) {
    this.name = parksData.fullName;
    this.address = `${parksData.addresses[0].line1}" "${parksData.addresses[0].city}" "${parksData.addresses[0].stateCode}"  "${parksData.addresses[0].postalCode}`;
    this.fee = parksData.entranceFees[0].cost;
    this.description = parksData.description;
    this.url = parksData.url;
}

server.listen(PORT, () => {
    console.log(`Server is listening on Port ${PORT}`)
})