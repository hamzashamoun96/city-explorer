'use strict';

const express = require('express');
const server = express();

const dot = require('dotenv');
dot.config();

const cors = require('cors');

server.use(cors());
const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
    console.log(`Server is listening on Port ${PORT}`)
})

server.get('/location', (req, res) => {
    const locData = require('./data/location.json')
    const locObj = new Location(locData);
    res.send(locObj);
})

server.get('/weather', (req, res) => {
    const wetherData = require('./data/weather.json');
    let objectArr = [];
    wetherData.data.forEach(value => {
        const wetherObj = new Weather(value)
        objectArr.push(wetherObj)
    })
    res.send(objectArr);
    // res.send(objectArr);
})

server.get('*', (req, res) => {
    let errObj = {
        status : 500 ,
        responseText : "Sorry, something went wrong"
    }
    res.send(errObj);
})

function Location(locData) {
    this.search_query = 'Lynnwood';
    this.formatted_query = locData[0].display_name;
    this.latitude = locData[0].lat;
    this.longitude = locData[0].lon;
}
function Weather(wetherData) {
    this.forecast = wetherData.weather.description;
    this.time = wetherData.valid_date;
}