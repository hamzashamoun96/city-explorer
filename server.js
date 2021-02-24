'use strict';


const express = require('express');
const server = express();
const dot = require('dotenv');
dot.config();
const pg = require('pg')

// const client = new pg.Client(process.env.DATABASE_URL)
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
client.connect();
const cors = require('cors');

server.use(cors());

const port = process.env.PORT || 4000;

const axios = require('axios')


const superAgent = require('superagent')


// Routes 

server.get('/location', locHandler)
server.get('/weather', wetherHandler)
server.get('/parks', parksHandler)
server.get('/movies', moviesHandler)
server.get('/yelp', yelpHandler)
server.get('*', errHandler)


// Handler Functions

// http://localhost:3500/location?city=amman
function locHandler(req, res) {

    const cityName = req.query.city
    let key = process.env.LOCATION_KEY;
    let url = `https://api.locationiq.com/v1/autocomplete.php?key=${key}&q=${cityName}`;
    let SQL = `SELECT * FROM locations;`;

    client.query(SQL)
        .then(result => {
            if (result.rows.filter(value => value.search_query === `${cityName}`).length > 0) {
                let SQL = `SELECT * FROM locations WHERE search_query='${cityName}';`
                client.query(SQL)
                    .then(result => {
                        let x = new LocationFromDB(cityName, result.rows[0])
                        res.send(x)
                    })
            } else {
                console.log("Adding To DataBase");

                superAgent.get(url)
                    .then(result => {
                        let x = new Location(cityName, result.body[0])
                        let cityname = x.search_query;
                        let format = x.formatted_query;
                        let lati = x.latitude;
                        let long = x.longitude;
                        let SQL = `INSERT INTO locations VALUES ($1,$2,$3,$4) RETURNING *;`;
                        let safeValues = [cityname,format,lati,long];
                        client.query(SQL,safeValues)
                        .then(()=>{
                            res.send(x)
                        })
                    })
            }
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
// http://localhost:2000/movies?search_query=london&formatted_query=London%2C%20London%2C%20England%2C%20SW1A%202DX%2C%20United%20Kingdom&latitude=51.50732190000000&longitude=51.50732190000000&page=1
function moviesHandler(req, res) {

    const cityName = req.query.search_query;
    let key = process.env.MOVIES_KEY;
    let url = `https://api.themoviedb.org/3/search/movie?api_key=${key}&query=${cityName}`

    superAgent.get(url)
        .then(moviesData => {
            let moviesObjArr = moviesData.body.results.map(value => {
                return new Movies(value)
            })
            res.send(moviesObjArr)
        })
}
// http://localhost:2000/yelp?search_query=seattle&formatted_query=Seattle%2C%20Seattle%2C%20Washington%2C%2098104%2C%20USA&latitude=47.6038321&longitude=-122.3300624&page=1
function yelpHandler(req, res) {
    let cityName = req.query.search_query;
    let page = req.query.page;
    const limitNum = 5;
    const start = ((page - 1) * limitNum + 1)
    let key = process.env.YELP_KEY;
    let url = `https://api.yelp.com/v3/businesses/search?location=${cityName}&limit=${limitNum}&offset=${start}`

    let yelpRest = axios.create({
        baseURL: "https://api.yelp.com/v3/",
        headers: {
            Authorization: `Bearer ${key}`,
            "Content-type": "application/json",
        },
    })
    yelpRest(url)
        .then(({ data }) => {
            let yelpObjArr = data.businesses.map(value => {
                return new Yelp(value)
            })
            res.send(yelpObjArr)
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

function LocationFromDB(city, data) {
    this.search_query = city;
    this.formatted_query = data.formatted_query;
    this.latitude = data.latitude;
    this.longitude = data.longitude;
}

function Weather(wetherData) {
    this.forecast = wetherData.weather.description;
    this.time = new Date(wetherData.datetime).toString().slice(0, 15);;
}
function Parks(parksData) {
    this.name = parksData.fullName;
    this.address = `${parksData.addresses[0].line1}" "${parksData.addresses[0].city}" "${parksData.addresses[0].stateCode}"  "${parksData.addresses[0].postalCode}`;
    this.fee = parksData.entranceFees[0].cost;
    this.description = parksData.description;
    this.url = parksData.url;
}
function Movies(movieData) {
    this.title = movieData.title;
    this.overview = movieData.overview;
    this.average_votes = movieData.vote_average;
    this.image_url = `https://image.tmdb.org/t/p/w500${movieData.poster_path}`;
    this.popularity = movieData.popularity;
    this.released_on = movieData.release_date;
}
function Yelp(yelpData) {
    this.name = yelpData.name;
    this.image_url = yelpData.image_url;
    this.price = yelpData.price;
    this.rating = yelpData.rating;
    this.url = yelpData.url;
}
server.listen(port, () => {
    console.log(`Server is listening on Port ${port}`)
})