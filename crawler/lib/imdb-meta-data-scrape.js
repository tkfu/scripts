const fs = require("fs");
const async = require("async");
const request = require("request");
const jsdom = require("jsdom").jsdom;
const fountain = require('fountain-js');
const cheerio = require('cheerio');
const util = require("util");

const movieObj = require(`${__dirname}/../../data/js/movieObj`);

var metaData = "imdb \tyear \trelease_date \tpg_rating \trun_time \timdb_rating_value \timdb_rating_count\n";
var directorData = "movie_imdb \tdirector_imdb \tname \n";

var imdbMovieTitles = {};

var crawledIMDBIds = [];
var uncrawledIMDBIds = [];

var imdbMovieWriter = {};

async.series({
  getScrapedMapping: (cb) => {
    async.forEachSeries(Object.keys(movieObj), (scrape_id, cb1) => {

      var movie = movieObj[scrape_id];
      imdbMovieTitles[movie.imdb_match] = movie.title;
      
      async.setImmediate(() => { cb1() });

    }, () => {
      cb();
    })

  },
  getUncrawledMovieIds: (cb) => {

    async.forEachSeries(Object.keys(movieObj), (scrape_id, cb1) => { 

      var imdbID = movieObj[scrape_id].imdb_match;

      if(uncrawledIMDBIds.indexOf(imdbID) === -1){
        uncrawledIMDBIds.push(imdbID)
      }
      async.setImmediate(() => { cb1(); })

    }, () => {
      cb();
    });
  },
  iterateMovies: (cb) => {
     
    var index = 1;
    async.forEachSeries(uncrawledIMDBIds, (movieIMDB, cb1) => {

      console.log("--------------------")
      console.log(imdbMovieTitles[movieIMDB])
      console.log(`${index}/${uncrawledIMDBIds.length}`);

      request(`http://www.imdb.com/title/${movieIMDB}`, (err, resp, body) => {
        
        var $ = cheerio.load(body);
        index++;

        var imdb = movieIMDB;
        var year = $("#titleYear").text().replace(/[\(|\)]/g, "").trim();
        var release_date = $("[itemprop=datePublished]").first().attr("content");
        var pg_rating = $("[itemprop=contentRating]").first().attr("content");
        var run_time = $("[itemprop=duration][datetime]").first().text().trim();
        var imdb_rating_value = $("[itemprop=ratingValue]").first().text().trim();
        var imdb_rating_count = $("[itemprop=ratingCount]").first().text().trim(); 
        var budget = $("#titleDetails > div:nth-child(11)").contents().filter(function() {
				    return this.nodeType == 3;
				}).text().trim().replace(/\,/g, ""); 
        var gross = $("#titleDetails > div:nth-child(13)").contents().filter(function() {
				    return this.nodeType == 3;
				}).text().trim().replace(/\,/g, "");

        metaData += `${imdb} \t${year} \t${release_date} \t${pg_rating} \t${run_time} \t${imdb_rating_value} \t${imdb_rating_count}\n`;
        
        fs.writeFile(`${__dirname}/../../data/imdb-meta-data.tsv`, metaData);
        
        async.setImmediate(() => { cb1(); });


        // async.forEachSeries($("[itemprop=director]"), (item, cb2) => {
        // 	var a = $(item).find("a");

        // 	var directorLink = $(a).attr("href");
        //   var director_imdb = directorLink.slice(directorLink.indexOf("name/") + 5, directorLink.indexOf("?ref"));

        // 	var directorName = $(a).text();

        // 	directorData += `${imdb} \t${director_imdb} \t${directorName} \n`

        // 	fs.writeFile(`${__dirname}/../../data/directors.tsv`, directorData);
        // 	async.setImmediate(() => { cb2(); });

        // }, () => {

        // 	async.setImmediate(() => { cb1(); });

        // });

        
      });

    }, () => {
      //fs.writeFile(`${__dirname}/../../data/imdb-meta-data.tsv`, metaData);
      async.setImmediate(() => { cb(); });

    });

  },
  done: () => {
    console.log("Finished: imdb-meta-data-scrape.js")
  }
});



