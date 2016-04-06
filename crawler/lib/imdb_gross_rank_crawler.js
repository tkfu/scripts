const fs = require("fs");
const async = require("async");
const request = require("request");
const jsdom = require("jsdom").jsdom;
const cheerio = require('cheerio');
const fountain = require('fountain-js');
const util = require("util");
const FuzzySet = require("fuzzyset.js");
const movies = require(`${__dirname}/../data/large output/links`);

var revenues = {};

var imdbIDs = [];
var titles = [];
var titleObj = {};
var imdbObj = {};
var imdbTitleDictionary = FuzzySet();

var imsdbCorpus = [];
var cornellCorpus = [];
var manualCrawl = [];

var totalMatched = [];
var missingIDs = [];

var matchedSources = "Year\tIMDB ID\tIMDB Title\tMatched Title\tConfidence\tSource\n";
var allTitles = "Title\tSource\tLink\n"

var confidence = 0.8;

async.series({
  // getGrossRank: (cb) => {
  //   fs.readFile(`${__dirname}/../data/gross_rank.csv`, 'utf8', (err, data) => {
  //     var rows = data.split("\n")
  //     async.forEachSeries(rows.slice(1, 1001), (row, cb1) => {

  //       if(row.length > 0){
  //         var parts = JSON.parse(`[${row}]`);
  //         imdbIDs.push(parts[2]);
  //         titles.push(parts[1]);
  //         titleObj[parts[1].toLowerCase()] = {formatted: parts[1], imdbID: parts[2]};
  //         imdbObj[parts[2]] = parts[1];
  //         imdbTitleDictionary.add(parts[1].toLowerCase());
  //         revenues[parts[2]] = {
  //           "year": parts[0],
  //           "title": parts[1],
  //           "imdb_id": parts[2],
  //           "gross_inflation": parts[3],
  //           "rank_unadjusted_inflation": parts[4]
  //         }   
  //       } 

  //       async.setImmediate(() => { cb1(); });
        
  //     }, () => {
  //       console.log(`IMDB top films:\t${rows.length}`);
  //       cb();
  //     });
  //   });
  // },
  cornellCorpus: (cb) => {
    fs.readFile(`${__dirname}/../data/cornell movie-dialogs corpus/raw_script_urls.txt`, 'utf8', (err, data) => {
      var rows = data.split("\n");
      var nonMatched = "";

      async.forEachSeries(rows, (row, cb1) => {
        if(row.length > 0){
          var parts = row.split("+++$+++ ");
          var title = parts[1].slice(0, -1);

          allTitles += `${title}\tCornell\t${parts[2]}\n`;
          // var matchedTitle = imdbTitleDictionary.get(title.toLowerCase());
          
          // if(matchedTitle){
          //   if(matchedTitle[0][0] > confidence){

          //     var formatedTitle = matchedTitle[0][1];
          //     var imdbID = titleObj[formatedTitle].imdbID;

          //     if(imdbIDs.indexOf(imdbID) !== -1 && totalMatched.indexOf(imdbID) === -1){
          //       cornellCorpus.push(imdbID);
          //       totalMatched.push(imdbID);
          //       matchedSources += `${revenues[imdbID].year}\t${imdbID}\t${imdbObj[imdbID]}\t${title}\t${matchedTitle[0][0]}\tCornell\n`;
          //     }
          //   } else {
          //     nonMatched += `${title}\n`
          //   }
          // } 
        }

        async.setImmediate(() => { cb1(); }); 
      }, () => {
        // fs.writeFile(`${__dirname}/../../data/missing-cornell-films.tsv`, nonMatched);
        // console.log(`cornell films:\t${rows.length}`);
        // console.log(`cornell matched:\t${cornellCorpus.length}`);
        cb();
      });
    });
  },
  imsdbCorpus: (cb) => {

    var imdsbDirectory = `${__dirname}/../data/film_20100519/all_imsdb_05_19_10`
    fs.readdir(imdsbDirectory, (err, fileNames) => {
      
      async.forEach(fileNames, (fileName, cb1) => {
       fs.readFile(`${imdsbDirectory}/${fileName}`, 'utf8', (err, data) => {
          var $ = cheerio.load(data);
          var titleText = $("title").text();
          var ismdbIndex = titleText.toLowerCase().indexOf("script at imsdb")
          var title = titleText.slice(0, ismdbIndex)


          allTitles += `${title}\tIMSDB\tfilm_20100519/all_imsdb_05_19_10/${fileName}\n`;

          // var matchedTitle = imdbTitleDictionary.get(title.toLowerCase());
          
          // if(matchedTitle){
          //   if(matchedTitle[0][0] > confidence){

          //     var formatedTitle = matchedTitle[0][1];
          //     var imdbID = titleObj[formatedTitle].imdbID;

          //     if(imdbIDs.indexOf(imdbID) !== -1 && totalMatched.indexOf(imdbID) === -1){
          //       imsdbCorpus.push(imdbID);
          //       totalMatched.push(imdbID)
          //       matchedSources += `${revenues[imdbID].year}\t${imdbID}\t${imdbObj[imdbID]}\t${title}\t${matchedTitle[0][0]}\tIMSDB\n`;
          //     }
          //   }
          // }

          async.setImmediate(() => { cb1(); }); 
          
       });
      }, () => {

        console.log(`IMSDB films:\t${fileNames.length}`);
        console.log(`IMSDB matched:\t${imsdbCorpus.length}`);
        cb();
      })

    })
  },
 
  manualCrawl: (cb) => {
    console.log(movies)
    var multipleLinks = 0;
    async.forEachSeries(Object.keys(movies), (movieKey, cb1) => {

      var title = movieKey;
      var movie = movies[movieKey];

      async.forEachSeries(movie.urls, (url, cb2) => {
        if(url.indexOf("sellingyourscreenplay") === -1){
         allTitles += `${title}\tManual\t${url} \n`;
        }
        async.setImmediate(() => { cb2(); });
      }, () => {
        async.setImmediate(() => { cb1(); });
      })
     

      // var matchedTitle = imdbTitleDictionary.get(title.toLowerCase());
      
      // if(matchedTitle){
      //   if(matchedTitle[0][0] > confidence){
      //     var formatedTitle = matchedTitle[0][1];
      //     var imdbID = titleObj[formatedTitle].imdbID;

      //     if(totalMatched.indexOf(imdbID) === -1){

      //       manualCrawl.push(imdbID);
      //       totalMatched.push(imdbID);
      //       matchedSources += `${revenues[imdbID].year}\t${imdbID}\t${imdbObj[imdbID]}\t${title}\t${matchedTitle[0][0]}\tManual\n`;
      //     }

      //   }
      // }
      

      // async.setImmediate(() => { cb1(); }); 
    }, () => {
      // console.log(`manual crawl films:\t${Object.keys(movies).length}`);
      // console.log(`manual matched:\t${manualCrawl.length}`);
      cb();
    });
  },
  done: () => {
    
    // console.log(`total matched:\t${totalMatched.length}`);
    // var rows = "imdbID\tTitle\n";

    // async.forEachSeries(Object.keys(imdbObj), (imdbID, cb1) => {
    //   if(totalMatched.indexOf(imdbID) === -1 && missingIDs.indexOf(imdbID) === -1){
    //     missingIDs.push(imdbID);
    //     rows += `${imdbID}\t${imdbObj[imdbID]}\n`;
    //     matchedSources += `${revenues[imdbID].year}\t${imdbID}\t${imdbObj[imdbID]}\t \t \n`;
    //   }
    //   async.setImmediate(() => { cb1(); }); 
    // }, () => {
      
    fs.writeFile(`${__dirname}/../../data/all-titles.tsv`, allTitles);
      
    //   console.log(`total missing:\t${missingIDs.length}`)
      
    // });

  }

})
