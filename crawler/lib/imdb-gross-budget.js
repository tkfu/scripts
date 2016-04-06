const fs = require("fs");
const async = require("async");
const request = require("request");
const jsdom = require("jsdom").jsdom;
const fountain = require('fountain-js');
const cheerio = require('cheerio');
const util = require("util");

const movieObj = require(`${__dirname}/../../data/js/movieObj`);

var gross_budget_data = "imdb \tbudget \tgross \n";

var imdbMovieTitles = {};

var crawledIMDBIds = [];
var uncrawledIMDBIds = [];

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
      console.log(movieIMDB)
      console.log(imdbMovieTitles[movieIMDB])
      console.log(`${index}/${uncrawledIMDBIds.length}`);

      request(`http://www.imdb.com/title/${movieIMDB}/business`, (err, resp, body) => {
        
        var $ = cheerio.load(body);
        index++;



        var text = $("#tn15content").text().replace(/\)/g, "\)\n").split("\n")
        					.filter((row) => { return row.trim() !== ""})

        var titles = []
        
        $("#tn15content h5").each((i, title) => { 
        	titles.push($(title).text()); 
        }) ;

       	var hasBudget = (titles.indexOf("Budget") !== -1);
       	var hasGross = (titles.indexOf("Gross") !== -1);

       	var finalBudgetValue = "-";
       	var finalGrossValue = "-"

       	var budgetValues = [];

       	if(hasBudget){
       		var searchEnd = text.length
       	
       		var titleIndex = titles.indexOf("Budget")
       		var nextTitle = titles[titleIndex + 1];

       		if(typeof nextTitle !== "undefined"){
       			searchEnd = text.indexOf(nextTitle);
       		}
       		budgetValues = text.slice(text.indexOf("Budget") + 1, searchEnd)
       													.filter((row) => { return row.startsWith("$")})
       													.sort((a, b) => { return parseInt(b.replace(/[^0-9]/g, "")) - parseInt(a.replace(/[^0-9]/g, "")) });		
       		
       		if(budgetValues.length > 0){
       			finalBudgetValue = budgetValues[0].replace(/\([^\)]*\)/g, "")
       		}
       	}


       	var grossValues = [];

       	if(hasGross){

       		var searchEnd = text.length
       	
       		var titleIndex = titles.indexOf("Gross")
       		var nextTitle = titles[titleIndex + 1];

       		if(typeof nextTitle !== "undefined"){
       			searchEnd = text.indexOf(nextTitle);
       		}

       		grossValues = text.slice(text.indexOf("Gross") + 1, searchEnd)
       													.filter((row) => { return row.startsWith("$") && row.endsWith("(USA)")})
       													.sort((a, b) => { return parseInt(b.replace(/[^0-9]/g, "")) - parseInt(a.replace(/[^0-9]/g, "")) });		
        	
        	if(grossValues.length > 0){
        		finalGrossValue = grossValues[0].replace(/\([^\)]*\)/g, "")
        	}
        }


        
        gross_budget_data += `${movieIMDB} \t${finalBudgetValue} \t${finalGrossValue} \n`
        fs.writeFile(`${__dirname}/../../data/imdb-gross-budget.tsv`, gross_budget_data);

        async.setImmediate(() => { cb1(); });
      });

    }, () => {
      fs.writeFile(`${__dirname}/../../data/imdb-gross-budget.tsv`, gross_budget_data);
      async.setImmediate(() => { cb(); });

    });

  },
  done: () => {
    console.log("Finished: imdb-gross-budget.js")
    //callback();
  }
});



