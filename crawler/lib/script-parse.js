const fs = require("fs");
const async = require("async");
const request = require("request");
const fountain = require('fountain-js');
const cheerio = require('cheerio');
const util = require("util");
const FuzzySet = require("fuzzyset.js");
  
var lineLength = 80;

var cornellURLObj = {};
var cornellCharacterObj = {};

var imsdbCharacterObj = {};
var manualCharacterObj = {};


var movieObj = require(`${__dirname}/../../data/js/movieObj`);
//var movieObj = {};
var characterObj = {};

//function main (callback){

  async.series({
    getIMDBCharacters: (cb) => {

      console.log("Create IMDB Character Object: ");

      fs.readFile(`${__dirname}/../../data/characters.tsv`, "utf8", (err, data) => {

        var rows = data.split("\n").slice(1);

        async.forEachSeries(rows, (row, cb1) => {

          if(row.length > 0){
            var parts = row.split("\t");

            var movieIMDB = parts[0];
            var actorIMDB = parts[1];
            var characterName = parts[2];

            if(typeof characterObj[movieIMDB] === "undefined"){
              characterObj[movieIMDB] = {
                charActorImdb: {},
                imdbDialogue: {}
              }
            }

            var charNames = characterName.split("/");

            if(typeof charNames === "string"){
              charNames = [charNames];
            }

            var cleanCharNames = [];
            for(var x in charNames){

              var charName = charNames[x]

              if(charName.trim().length > 0){
                
                var firstNonWSChar = charName.trim().slice(0, 1);

                charName = charName.slice(charName.indexOf(firstNonWSChar));

                var asString = "(as ";
                if(charName.indexOf(asString) !== -1){
                  charName = charName.slice(0, charName.indexOf(asString));
                }

                var reversed = charName.split("").reverse().join("");
                var lastWS = reversed.indexOf(reversed.trim().slice(0,1));
                reversed = reversed.slice(lastWS);
                charName = reversed.split("").reverse().join("");

                cleanCharNames.push(charName);
                characterObj[movieIMDB].charActorImdb[charName.toLowerCase()] = actorIMDB;

              }
            }

            characterObj[movieIMDB].imdbDialogue[actorIMDB] = {
              names: cleanCharNames,
              lineIndex: [],
              numberOfLines: [],
              numberOfWords: []
            }

          }
          async.setImmediate(() => { cb1(); });

        }, () => {
          console.log(characterObj)
          fs.writeFile(`${__dirname}/../../data/js/characterObj.js`, `module.exports = ${util.inspect(characterObj, false, null)}`);
          cb();
        });

      });

    },
    cornellScripts: (cb) => {

      console.log("Create Cornell Character Object: ");
      
      fs.readFile(`${__dirname}/../data/cornell movie-dialogs corpus/raw_script_urls.txt`, 'utf8', (err, data) => {
        
        var rows = data.split('\n');

        async.forEach(rows, (row, cb1) => {

          if(row.length > 0){
            var parts = row.split("+++$+++ ");
            for(var p in parts){
              if(parts[p].slice(-1) === " ") {
                parts[p] = parts[p].slice(0, -1)
              }
            }

            var cornellId = parts[0];
            var url = parts[2];

            var cornellURL = url.trim().toLowerCase();
            cornellURLObj[cornellURL] = cornellId;

          }
          async.setImmediate(() => { cb1(); });

        }, () => {

          fs.writeFile(`${__dirname}/../../data/js/cornellURLObj.js`, `module.exports = ${util.inspect(cornellURLObj, false, null)}`);
          cb();
        })
      })
    
    }, 
    getCornellCharacters: (cb) => {

      console.log("Calculate Cornell Character Dialogue: ");
      
      fs.readFile(`${__dirname}/../data/cornell movie-dialogs corpus/movie_lines.txt`, 'utf8', (err, data) => {
        
        var rows = data.split('\n');

        var prevFilm = null;
        var index = 0;

        async.forEachSeries(rows, (row, cb1) => {

          if(row.length > 0){
            var parts = row.split("+++$+++ ");
            for(var p in parts){
              if(parts[p].slice(-1) === " ") {
                parts[p] = parts[p].slice(0, -1)
              }
            }

            var cornellCharId = parts[1];
            var cornellMovieId = parts[2];
            var cornellCharName = parts[3];
            var lineText = parts[4];

            if (prevFilm !== cornellMovieId){
              prevFilm = cornellMovieId;
              index = 0;
            }

            if(typeof cornellCharacterObj[cornellMovieId] === "undefined") {
              cornellCharacterObj[cornellMovieId] = {
                characters: {} 
              }
            }
           
            if(typeof cornellCharacterObj[cornellMovieId].characters[cornellCharId] === "undefined"){
              cornellCharacterObj[cornellMovieId].characters[cornellCharId] = {
                name: cornellCharName,
                lineIndex: [],
                numberOfLines: [],
                numberOfWords: []
              }
            }
            cornellCharacterObj[cornellMovieId].characters[cornellCharId].lineIndex.push(index)
            cornellCharacterObj[cornellMovieId].characters[cornellCharId].numberOfLines.push(Math.ceil(lineText.length / lineLength));
            cornellCharacterObj[cornellMovieId].characters[cornellCharId].numberOfWords.push(lineText.split(/[\s]+/g).length)
            index++;
          }
          async.setImmediate(() => { cb1(); });

        }, () => {
          fs.writeFile(`${__dirname}/../../data/js/cornellCharacterObj.js`, `module.exports = ${util.inspect(cornellCharacterObj, false, null)}`);
          cb();
        })
      })
    
    },
    getMatchedMovies: (cb) => {

      console.log("Create Movie Object: ");
      
      fs.readFile(`${__dirname}/../../data/full-imdb-list.tsv`, "utf8", (error, data) => {  
     
        async.forEachSeries(data.split("\n").slice(1), (row, cb1) => {

          if(row.length > 0){
            var parts = row.split("\t");

            var scrape_id = parts[0];
            var title = parts[1];
            var source = parts[2];
            var year = parts[3];
            var link = parts[4];
            var imdb_match = parts[6];
            var fuzzy_match = parts[7];
            var ignoreScript = parts[9].trim();

            var movieIMDB = fuzzy_match;

            if(typeof movieIMDB === "undefined" || movieIMDB.length === 0){
              movieIMDB = imdb_match;
            } 

            if(typeof movieIMDB !== "undefined"){
              movieIMDB = movieIMDB.trim();
              if(movieIMDB !== "NULL" && movieIMDB.length > 0 
                && movieIMDB !== "imdb_match"
                && ([1, "1"].indexOf(ignoreScript) === -1)){
                  movieObj[scrape_id] = {
                    scrape_id: scrape_id,
                    title: title, 
                    source: source.toLowerCase().trim(),  
                    year: year,  
                    link: link,  
                    imdb_match: movieIMDB
                  }

                  if(typeof cornellURLObj[link.toLowerCase()] !== "undefined"){
                    movieObj[scrape_id].cornellId = cornellURLObj[link.trim().toLowerCase()];
                  }

                  if(movieObj[scrape_id].source === "imsdb"){

                    var fileName = link.replace("film_20100519/all_imsdb_05_19_10/", "")
                    fileName = fileName.replace(".html", ".chars");

                    movieObj[scrape_id].imsdbCharsFile = fileName;
                  }
              }
            }
          }

          async.setImmediate(() => { cb1(); });

        }, () => {

          //fs.writeFile(`${__dirname}/../../data/js/movieObj.js`, `module.exports = ${util.inspect(movieObj, false, null)}`);
          cb();
        });

      });
    
    },
    getIMSDBCharacters: (cb) => {

      console.log("Create IMSDB Character Object: ");
      
      async.forEachSeries(Object.keys(movieObj), (scrape_id, cb1) => {


        var movie = movieObj[scrape_id];

        if(typeof movie.imsdbCharsFile !== "undefined"){

          imsdbCharacterObj[scrape_id] = {
            charFile: movie.imsdbCharsFile,
            characters: {}
          };

          fs.readFile(`${__dirname}/../data/film_20100519/output_chars/${movie.imsdbCharsFile}`, "utf8", (err, data) => {

            if(err){
                
              fs.readFile(`${__dirname}/../data/${movie.link}`, "utf8", (err1, data1) => {

                if(err1){

                 async.setImmediate(() => { cb1(); });

                } else {

                  var $ = cheerio.load(data1); 
                  fs.writeFile(`${__dirname}/../../data/script_downloads/text/scrape-${scrape_id}.txt`, $(".scrtext pre").text());
                  movie.source = "manual";
                  async.setImmediate(() => { cb1(); });
                }
              })
            } else {
              var rows = data.split("\n");

              var charName;

              async.forEachSeries(rows, (row, cb2) => {

                if(row.length > 0){
                  var isCharacter = (row.match(/[0-9]+\:/) !== null);
                  if(isCharacter){
                    var name = row.split("\t")[0];
                    charName = name;
                    imsdbCharacterObj[scrape_id].characters[name] = {
                      name: name,
                      lineIndex: [],
                      numberOfLines: [],
                      numberOfWords: []
                    }
                  } else {

                    var parts = row.split("\t");

                    var lineIndex = parts[0];
                    var lineText = parts[1];
                    var numLines = 1;
                    var numWords = 0;

                    if(typeof parts[1] !== "undefined"){
                      numLines = Math.ceil(lineText.length / lineLength)
                      numWords = lineText.split(/[\s]+/g).length
                    }

                    imsdbCharacterObj[scrape_id].characters[charName].lineIndex.push(parseInt(lineIndex));
                    imsdbCharacterObj[scrape_id].characters[charName].numberOfLines.push(numLines);
                    imsdbCharacterObj[scrape_id].characters[charName].numberOfWords.push(numWords);
                    
                  }
                }
                async.setImmediate(() => { cb2() });

              }, () => {
                async.setImmediate(() => { cb1(); });
              });

            }


          });

        } else {
          async.setImmediate(() => { cb1(); });
        }
      }, () => {

        fs.writeFile(`${__dirname}/../../data/js/imsdbCharacterObj.js`, `module.exports = ${util.inspect(imsdbCharacterObj, false, null)}`);
        cb();
      });

    },
    manualScripts: (cb) => {

      console.log("Create Manual Scrape Character Object: ");
      
      var index = 0;
      fs.readdir(`${__dirname}/../../data/script_downloads/text/`, (err, fileNames) => {

        /*fixed 3834, 4159,5236, 5344,5531,5533, 6026, 4002. 5344, 5350, 5479, 2049,
              5042, 2124, 2309, 2986, 4080, 5032, 2750, 2233, 1696, 1695, 3802, 2961, 5269,
              3018, 5026, 4849, 4419, 1550, 1950, 2125, 2310, 3253, 1809, 2234, 4182, 1698,
              1697, 3389, 1832, 1994, 4359, 3187, 4393, 3038, 5353, 2385, 5300, 1569, 5352,
              5531, 4723, 5343, 5525, 5023, 5129, 4568, 4633, 3930, 5528, 8653, 5207, 6596,
              1104, 2784, 5526, 646, 1571, 5521, 5528, 5534, 3437, 3433, 3427, 3201, 6026, 8652
              5518, 7438
          needs overriding in character match"
            5527,
          

        */

        /* 

          bad html: 8656, 8658, 8659, 5527, 4900, 5065, 5200, 4380, 5152,4095, 2491,5000, 5168, 5019

          bad pdf: 7919, 7120, 8010, 8026, 6007, 6956, 7989, 6835, 4004, 8081, 6202, 
                  [6737, 8118, 6385, 5222  trial version?], 4004, 4682, 4683, 4719

          revisit: 5023, [4982, 4509, 5099, 5138, 4877 > .match(/[A-Z|0-9| ]+:/g)], 4116
            4140, 4884, 6157

          something not right... 3241, 2907, 4917, 5299, 3064, 3065, 2072, 4917, 7663, 4461
          4650, 4927, 4984, 5061, 5096, 5148, 5149, 5834, 6333, 6535, 8318

          one MEGA line: 6536, 6539, 6540, 6549, 6550, 6552, 6554, 6555, 6574, 6576, 
            6585, 6587, 6601, 6605, 6607, 6610, 6611, 6612, 6613, 6622, 6637, 6667, 6673,
            6674, 6691, 6701, 6703, 6707, 6709, 6710, 6716, 6723, 6724, 6726, 6727, 6731,
            6737, 6742, 6747, 6750, 6798, 6811, 6815, 6825, 6832, 6837, 6838, 6844, 6845,
            6847, 6848, 6855, 6858, 6916, 6922, 6924, 6928, 6930, 6931, 6936, 6942, 6956,
            6958, 6966, 6979, 6990, 7009, 7014, 7018, 7019, 7021, 7029, 7050, 7058, 7067,
            7075, 7080, 7090, 7096, 7097, 7119, 7120, 7124, 7126, 7128, 7129, 7133, 7134,
            7135, 7136, 7137, 7143, 7148, 7149, 7153, 7154, 7167, 7176, 7177, 7206, 7212,
            7214, 7216, 7219, 7227, 7235, 7247, 7295, 7308, 7323, 7328, 7329, 7342, 7352,
            7368, 7396, 7397, 7411, 7418, 7419, 7424, 7426, 7427, 7429, 7440, 7453, 7454,
            7474, 7499, 7503, 7508, 7511, 7526, 7530, 7533, 7549, 7552, 7561, 7566, 7570,
            7629, 7630, 7648, 7656, 7681, 7687, 7698, 7730, 7733, 7742, 7763, 7770, 7796,
            7800, 7804, 7821, 7859, 7870, 7878, 7882, 7890, 7891, 7898, 7904, 7906, 7919,
            7921, 7926, 7931, 7934, 7935, 7941, 7991, 8000, 8007, 8020, 8029, 8030, 8073,
            8073, 8075, 8080, 8103, 8118, 8156, 8158, 8165, 8170, 8198, 8230, 8251, 8266,
            8274, 8277, 8287, 8301, 8308, 8357, 8395, 8397, 8405, 8415, 8426, 8427, 8446,
            8484, 8493, 8516, 8522, 8526, 8556, 8559, 8562, 8628, 8645, 8650, 8672, 8681,
            8730, 8786, 8826, 8845, 8871, 8879, 8887, 8910, 8916, 8957, 8968, 8970, 
          8973, 8976, 8977, 8978, 8992, 9000, 9013, 9021, 9091, 9214, 9234, 9245
  
          fail: 5188, 4582 5299, 4212, 4330, 4424, 4523, 4951, 5261, 6251, 6537, 6595, 6752,
            6835, 6846, 6851, 6918, 7032, 7034, 7072, 7073, 7074, 7079, 7081, 7084, 7084, 7089,
            7102, 7105, 7107, 7112, 7127, 7132, 7145, 7147, 7166, 7175, 7179, 7180, 7182, 7199,
            7205, 7209, 7210, 7215, 7217, 7218, 7228, 7249, 7252, 7254, 7261, 7324, 7333, 7334,
            7341, 7343, 7353, 7357, 7369, 7376, 7382, 7383, 7398, 7420, 7423, 7441, 7449, 7459,
            7461, 7500, 7512, 7519, 7521, 7523, 7548, 7556, 7579, 7582, 7593, 7602, 7604,
            7607, 7608, 7609, 7615, 7622, 7624, 7636, 7646, 7647, 7651, 7655, 7658, 7659,
            7663, 7670, 7678, 7768, 7774, 7775, 7780, 7785, 7786, 7798, 7808, 7814,
            7818, 7828, 7850, 7875, 7876, 7877, 7899, 7902, 7917, 7920, 7940, 7981,
            8008, 8010, 8011, 8016, 8025, 8026, 8031, 8045, 8054, 8055, 8058, 8063,
            8070, 8071, 8074, 8081, 8095, 8104, 8106, 8110, 8115, 8117, 8120, 8122,
            8137, 8155, 8161, 8162, 8164, 8171, 8189, 8192, 8193, 8195, 8203, 8205,
            8209, 8216, 8218, 8219, 8220, 8240, 8241, 8253, 8265, 8268, 8269, 8276, 8279
            8288, 8291, 8292, 8294, 8295, 8296, 8299, 8300, 8303, 8309, 8310, 8322, 8352
            8360, 8361, 8393, 8404, 8411, 8412, 8413, 8417, 8422, 8434, 8435, 8445, 8450,
            8452, 8453, 8467, 8479, 8480, 8488, 8491, 8495, 8502, 8503, 8506, 8507, 8509,
            8510, 8512, 8513, 8514, 8517, 8524, 8525, 8530, 8532, 8543, 8547, 8551, 8564,
            8572, 8573, 8575, 8587, 8594, 8597, 8602, 8604, 8618, 8620, 8683, 8699, 8728,
            8733, 8753, 8754, 8765, 8770, 8813, 8819, 8830, 8834, 8835, 8844, 8848, 8849, 
            8867, 8881, 8922, 8926, 8958, 8972, 8980, 8991, 9002, 9029, 9042, 9056, 9063,
          9098, 9108, 9110, 9126, 9145, 9150, 9151, 9171, 9175, 9194, 9195, 9239

          OCR...(not sure) 1507, 3220, 3221, 3222, 3784, 3791, 3807, 3814, 3847, 3847, 3870, 3889,
            3898, 3899, 3902, 3911, 3913, 3919, 3922, 3924, 3925, 3953, 3954, 3968, 3970, 3972, 3980,
            3981, 3982, 3984, 3985, 4012, 4015, 4019, 4020, 4027, 4030, 4031, 4038, 4042, 4050, 4051,
            4054, 4087, 4101, 4109, 4115, 4117, 4118, 4119, 4124, 4135, 4138, 4139, 4150, 4153, 
            4158, 4160, 4183, 4189, 4190, 4202, 4225, 4227, 4241, 4251, 4252, 4267, 4270, 4274,
            4286, 4287, 4296, 4303, 4306, 4351, 4353, 4362, 4365, 4366, 4367, 4373, 4379, 4395,
            4397, 4403, 4404, 4407, 4408, 4424, 4454, 4466, 4467, 4468, 4488, 4498, 4499, 4500,
            4517, 4524, 4528, 4531, 4532, 4535, 4538, 4539, 4540, 4546, 4549, 4588, 4597, 4600,
            4603, 4604, 4605, 4607, 4608, 4630, 4632, 4639, 4648, 4649, 4651, 4660, 4661, 4679,
            4694, 4717, 4720, 4733, 4744, 4757, 4761, 4762, 4774, 4777, 4778, 4810, 4811, 4816,
            4840, 4841, 4842, 4851, 4874, 4875, 4876, 4879, 4885, 4886, 4887, 4892, 4902, 4904,
            4905, 4907, 4908, 4923, 4928, 4945, 4948, 4959, 4961, 4995, 4998, 4999, 5001, 5014,
            5017, 5052, 5055, 5058, 5106, 5111, 5133, 5134, 5144, 5163, 5169, 5173, 5178, 5180,
            5205, 5214, 5217, 5222, 5242, 5248, 5250, 5256, 5315, 5328, 5332, 5335, 5338, 5341,
            5360, 5471, 5518, 5532, 5803, 5820, 5821, 5835, 5916, 5917, 5935, 6000, 6006, 6007,
            6038, 6088, 6099, 6100, 6101, 6106, 6108, 6109, 6112, 6113, 6116, 6119, 6121, 6122,
            6128, 6136, 6139, 6140, 6148, 6149, 6154, 6155, 6157, 6163, 6165, 6168, 6170, 6170,
            6175, 6186, 6190, 6193, 6196, 6202, 6203, 6208, 6213, 6227, 6234, 6237, 6239, 6246,
            6252, 6253, 6254, 6255, 6256, 6257, 6275, 6277, 6278, 6279, 6299, 6301, 6302, 6315,
            6364, 6371, 6372, 6385, 6411, 6412, 6414, 6416, 6418, 6420, 6433, 6435, 6443, 6454,
            6455, 6456, 6458, 6464, 6486, 6495, 6499, 6509, 6510, 6511, 6512, 6515, 6517, 6518,
          6529, 6531, 

        */  

        var megaLine = [ 6536, 6539, 6540, 6549, 6550, 6552, 6554, 6555, 6574, 6576, 
            6585, 6587, 6601, 6605, 6607, 6610, 6611, 6612, 6613, 6622, 6637, 6667, 6673,
            6674, 6691, 6701, 6703, 6707, 6709, 6710, 6716, 6723, 6724, 6726, 6727, 6731,
            6737, 6742, 6747, 6750, 6798, 6811, 6815, 6825, 6832, 6837, 6838, 6844, 6845,
            6847, 6848, 6855, 6858, 6916, 6922, 6924, 6928, 6930, 6931, 6936, 6942, 6956,
            6958, 6966, 6979, 6990, 7009, 7014, 7018, 7019, 7021, 7029, 7050, 7058, 7067,
            7075, 7080, 7090, 7096, 7097, 7119, 7120, 7124, 7126, 7128, 7129, 7133, 7134,
            7135, 7136, 7137, 7143, 7148, 7149, 7153, 7154, 7167, 7176, 7177, 7206, 7212,
            7214, 7216, 7219, 7227, 7235, 7247, 7295, 7308, 7323, 7328, 7329, 7342, 7352,
            7368, 7396, 7397, 7411, 7418, 7419, 7424, 7426, 7427, 7429, 7440, 7453, 7454,
            7474, 7499, 7503, 7508, 7511, 7526, 7530, 7533, 7549, 7552, 7561, 7566, 7570,
            7629, 7630, 7648, 7656, 7681, 7687, 7698, 7730, 7733, 7742, 7763, 7770, 7796,
            7800, 7804, 7821, 7859, 7870, 7878, 7882, 7890, 7891, 7898, 7904, 7906, 7919,
            7921, 7926, 7931, 7934, 7935, 7941, 7991, 8000, 8007, 8020, 8029, 8030, 8073,
            8073, 8075, 8080, 8103, 8118, 8156, 8158, 8165, 8170, 8198, 8230, 8251, 8266,
            8274, 8277, 8287, 8301, 8308, 8357, 8395, 8397, 8405, 8415, 8426, 8427, 8446,
            8484, 8493, 8516, 8522, 8526, 8556, 8559, 8562, 8628, 8645, 8650, 8672, 8681,
            8730, 8786, 8826, 8845, 8871, 8879, 8887, 8910, 8916, 8957, 8968, 8970, 
          8973, 8976, 8977, 8978, 8992, 9000, 9013, 9021, 9091, 9214, 9234, 9245 ];

        //fileNames = [9254]
    
        async.forEachSeries(fileNames, (fileName, cb1) => {

          fileName = fileName.toString();

          console.log("-------------------")
          console.log(`${index}/${fileNames.length}`)
          index++;
          //console.log(`Parse manual script: ${fileName}`)
          if(fileName === ".DS_Store") {
            async.setImmediate(() => { cb1(); });
          } else {
            var scrapeId = fileName.replace("scrape-", "").replace(".txt", "");

            var movie = movieObj[scrapeId];
            console.log(`Scrape id: ${scrapeId}`)
            console.log(movie)

            if(typeof movie !== "undefined"){

              if(["manual", "scriptdrive"].indexOf(movie.source) !== -1){

                var characters = {};
                var cleanCharacters = {};

                fs.readFile(`${__dirname}/../../data/script_downloads/text/scrape-${scrapeId}.txt`, "utf8", (err1, data) => {
                  if(err1){ 
                    async.setImmediate(() => { cb1(); });
                  } else {
                    data = data.replace(/cut[\s]*to[\:|\s]*/gi, ""); 
                    data = data.replace(/continued/gi, " ");
                    //data = data.replace(/[\s]+/gi, "\s");

                    data = data.split("\n").map((row) => {

                      var returnRow = false;
                      if(row.match(/[a-z|A-Z|0-9]+/g) !== null){
                        returnRow = true;
                      }

                      if(returnRow){
                        if(!isNaN(parseInt(row.replace(/[^a-z|A-Z|0-9]*/g, "")))){
                          returnRow = false;
                        }
                      }
                      return (returnRow? row.replace(/\(([^)]+)\)/g, ""): "");

                    }).join("\n");

                    if(["8653"].indexOf(scrapeId) !== -1) {
                      data = data.replace(/Â/g, "");
                    }

                    if(["6596"].indexOf(scrapeId) !== -1){
                       data = data.split("\n").filter((row, i) => { return i % 5 === 0 }).join("\n")
                    }
                    if(["3834", "4908"].indexOf(scrapeId) !== -1){ //too many blank lines WORKS
                      data = data.replace(/\n\n/g, "\n")
                    }

                    if(["6157", "6531"].indexOf(scrapeId) !== -1 
                      //|| megaLine.indexOf(parseInt(scrapeId)) !== -1
                      ){
                      var tempRows = data.replace(/[\f|\r|\n]*/g, "").split("")

                      data = tempRows.map((letter, i) => {
                        if(letter.match(/[a-z|A-Z|0-9]/) !== null){
                          if(i > 0){
                            if(letter.toUpperCase() === letter &&
                              tempRows[i-1].toLowerCase() ===  tempRows[i-1]){
                              letter = `\n${letter}`
                            }
                          }
                        }
                        return letter
                      }).join("")

                    }

                    if(["6531", "7438"].indexOf(scrapeId) !== -1
                      //|| megaLine.indexOf(parseInt(scrapeId)) !== -1
                      ){
                      var lastLineWasCapital = false;
                      data = data.split("\n").map((row, i) => {
                        if(row.trim().length > 0){
                          if(!lastLineWasCapital){
                            if(row.toUpperCase() === row) {
                              row = `\n\n${row}`
                              lastLineWasCapital = true
                            }
                          } else {
                            if(row.toUpperCase() !== row){
                              row = `\n${row}`
                              lastLineWasCapital = false;
                            }
                          }

                          if(row.endsWith(".")){
                            row = `${row}.`
                          }
                        }
                        return row;
                      }).join(" ")
                    }


                    if(["5526"].indexOf(scrapeId) !== -1){
                      var tempRows = data.split("\n");
                      data = tempRows.map((row, i) => {
                        
                        if(row.endsWith(":")){
                          row = `\n${row.toUpperCase()}`;
                        } else {
                          row = row.toLowerCase();
                        }
                        return row;
                      }).join("\n");

                    }

                    if(["5525", "5023", "5129", "5207", "1104", "2784", "5527", 
                      "646", "1571", "5521", "5528", "5534", "3437", "3427", "3201",
                      "6026", "6024", "9254"].indexOf(scrapeId) !== -1){

                      var tempRows = data.replace(/\:/g, ":\n").split("\n");
                      data = tempRows.map((row, i) => {
                        
                        if(row.endsWith(":")){
                          row = `\n${row.toUpperCase()}`;
                        }
                        return row;
                      }).join("\n");
                    }

                    if(['4159', "5236", "6026", "1550", "1950", "2125", "2310", "3253", "2234", "1994",
                      "4359", "3187", "4393", "3038", "6596"].indexOf(scrapeId) !== -1 ){ // no blank lines
                          var tempRows = data.split("\n")
                          data = tempRows.map((row, i) => {
                            if(row === row.toUpperCase()){
                              row = `\n${row}`
                            } else if (row.trim().replace(/\([^)]\)/g, "").length === 0){
                              row = `\n${row}\n`
                            }

                            return row;
                          }).join("\n")
                    }

                    var isCommaSeparatedName = false;


                    if(["5344", "5531", "5533", "6026", "4002", "1695", "3802", "2961", "1809", "2385",
                    "5300", "1569", "5343", "5525", "5528"].indexOf(scrapeId) !== -1){//comma separatedName
                      //isCommaSeparatedName = true;
                     
                      data = data.replace(/\: /g, "\:\n").split("\n").map((row, i) => {
                        if(row === row.toUpperCase()){
                          row = `\n${row}`
                        } 

                        if(row.indexOf(": ") !== -1){
                          row = `\n${row.slice(0, row.indexOf(": ")).toUpperCase()}${row.slice(row.indexOf(": ")).toLowerCase()}`;
                        }
                        if(row.trim().endsWith(":")){
                          row = row.toUpperCase();
                        }
                        //row = row.replace(/\: /g, "\:\n")
                        
                        return row;
                      }).join("\n")
                      //}).join("\n\n").replace(/\n\n\n/g, "\n\n")

                    }
                    if(["5346"].indexOf(scrapeId) !== -1){//comma separatedName
                      isCommaSeparatedName = true;
                      data = data.replace(/ - /g, "\:\n")
                    }   

                    if(["5352", "5531", "4723"].indexOf(scrapeId) !== -1){ //character name on own line with blank line before
                      var tempRows = data.split("\n");
                      data = tempRows.map((row, i) => {
                        if(i > 0 && i < tempRows.length -1){
                          if(tempRows[i-1].trim().length === 0){
                            if(!row.startsWith("[") 
                              || !row.endsWith(":") ){
                              row = row.toUpperCase();
                            } 
                          }
                        }
                        return row;
                      }).join("\n");
                    }

                    if(["3389", "5353"].indexOf(scrapeId) !== -1){ // character name on own line with blank line before and after, but not capitalised
                      var tempRows = data.split("\n");
                      data = tempRows.map((row, i) => {

                        row = row.replace(/:/g, "").toLowerCase();
                        if(i > 0 && i < tempRows.length -1){
                          var prevRow = tempRows[i -1];
                          var nextRow = tempRows[i + 1];

                          if(row.trim().length > 0){
                            var lastChar = row.trim().slice(-1);
                            var endsInPunctuation = lastChar.match(/[0-9|.|!|?|,|;]$/)
                            if(prevRow.trim().length === 0 
                              && nextRow.trim().length === 0
                               && endsInPunctuation === null){
                              row = `${row.toUpperCase()}:`;
                            } 

                          }
                          return row
                        }
                        
                      }).join("\n");
                    } 

                    if(["4568", "4633", "3930", "8653"].indexOf(scrapeId) !== -1){
                      data = data.split("\n").map((row) => {
                        if(row.trim().length > 0){
                          if(row.indexOf(row.trim(0,1)) > 40){
                             row = `\n${row}`
                          } else {
                            row = `${row}\n`
                          }

                          if(row.toUpperCase() === row){
                            row = `\n${row}`
                          }
                        }
                       // return row.replace(":", ":\n");
                       return row;
                      }).join("");
                    }

                    if(["5350", "1832", "6157"].indexOf(scrapeId) !== -1){ //character on same row, capitalised, no space
                      isCommaSeparatedName = true;

                      var data = data.split("\n").
                        map((row) => { 
                          //var regex = /[A-Z|0-9|\s|!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]+/

                          var name = "";
                          var endIndex = 0;
                          for(var x = 0; x < row.length; x++){
                            endIndex = x;
                            if(row[x].toUpperCase() === row[x] ){
                              name += row[x];
                            } 

                            if(typeof row[x + 1] !== "undefined" && row[x + 1]){
                              if(row[x + 1].match(/[A-Z|a-z]/)){
                                if(row[x + 1].toLowerCase() === row[x + 1]){
                                  name = name.slice(0, -1)
                                  break;
                                }
                              }
                            }

                          }

                          if(name.length > 0){
                            return `\n${name}:\n${row.slice(endIndex )}`
                          } else {
                            return row;
                          }
                         
                          //return row.replace(regex, (capitals) => { return `${capitals}:\n`});
                        }).join("\n")

                    }

                    if(["5479", "5042", "4080", "2750", "5269", "3018"].indexOf(scrapeId) !== -1){ //character on same row separates with ":  "
                      isCommaSeparatedName = true;
                      data = data.split("\n").map((row) => {
                       
                        return row.replace(":", ":\n");
                      }).join("\n\n");
                    }

                    if(["5360"].indexOf(scrapeId) !== -1){ //ends with":  "
                      data = data.split("\n").map((row) => {
                        
                        if(row.endsWith(":")){
                          return row.toUpperCase();
                        } else {
                          return row;
                        }
                        
                      }).join("\n");
                    }

                    if(["2049", "2124", "2309", "2986", "2233", "4849", "4419", "4549", 
                        "4605", "4639", "4660", "4694", "4710", "4744", "4811", "4874",
                        "4908", "5163", "6037", "6279"
                        ].indexOf(scrapeId) !== -1) { //standard formatting, but without blank line before character
                      
                      isCommaSeparatedName = true;
                      tempRows = data.split("\n");
                      data = tempRows.map((row, i) => {
                        if(row.trim().length > 0 && row === row.toUpperCase() && isNaN(parseInt(row.trim()))){

                          if(["2124"].indexOf(scrapeId) !== -1){
                            if(row.indexOf("\t") === -1){

                              row = `\n${row}:`;
                            }
                          } else {

                             row = `\n${row}:`;
                          }

                        }
                        return row;
                      }).join("\n");
                    }
                    
                    // if(["4908"].indexOf(scrapeId) !== -1) {
                    //     data = data.replace(/\:\n/g, ":\n\n")
                    // }

                    if(["5032"].indexOf(scrapeId) !== -1){ //nameNotCapitalised
                      isCommaSeparatedName = true;
                      var tempRows = data.split("\n");
                      data = tempRows.map((row, i) => {
                        if(i > 0){
                          if(tempRows[i - 1].trim().length === 0){
                            row = `${row.toUpperCase()}:`;
                          } 
                        }
                        return row
                      }).join("\n");
                    }

                    var numberedLines = false;
                    if(["1696", "5026", "1698", "4182", "1697"].indexOf(scrapeId) !== -1){ // line number at beginning of line
                      isCommaSeparatedName = true;
                      numberedLines = true;
                      var tempRows = data.split("\n")
                      data = tempRows.map((row, i) => {
                        if(row === row.toUpperCase() && row.trim().length > 0){
                          var indexOfTab = row.indexOf("\t");
                          var lineNum = row.slice(0, indexOfTab).trim();
                          
                          var parsedLineNum = lineNum.replace(/[^0-9]/g, "");
                          
                          var tempRow = row.replace(new RegExp(parsedLineNum, 'g'), "");
                          var reversed = tempRow.split("").reverse().join("");
                          var lastWS = reversed.indexOf(reversed.trim().slice(0,1));
                          reversed = reversed.slice(lastWS);
                          tempRow = reversed.split("").reverse().join("");

                          if(row.indexOf("\t\t") === 0 || scrapeId === "5026"){
                            if(row.endsWith(":")){
                              tempRow = tempRow.replace(":", "").toLowerCase();
                            } else {
                              tempRow = `\n${tempRow}:`; 
                            }
                          } else {
                            tempRow = tempRow.replace(":", "").toLowerCase();
                          }
                          row = tempRow;
                        }
                          
                        return row
                      }).join("\n");
                    }

                    if(isCommaSeparatedName && !numberedLines){
                      var tempRows = data.split("\n");

                      var data = tempRows.map((row, i) => {

                        if(i < tempRows.length - 1){
                          if(row.trim().length > 0 && tempRows[i + 1].trim().length > 0){
                            
                            if(row.replace(/\(([^)]+)\)/g, "").trim().length > 0){

                              var firstNonWSChar = row.trim().slice(0,1);
                              var nextnonWSChar = tempRows[i + 1].trim().slice(0,1);

                              var firstNonCharIndex = row.indexOf(firstNonWSChar);
                              var nextNonCharIndex = tempRows[i + 1].indexOf(nextnonWSChar);

                              if(firstNonCharIndex !== nextNonCharIndex){
                                row = `${row}\n`;
                              }
                            }
                          }
                        }

                        return row;
                      }).join("\n");

                   }

                    var rows = data.split("\n");
                    var currentChar;
                    var isTalking = false;
                    var dialogueIndex = 0;
                    var numLines = 0;
                    var numWords = 0;
                    var rowNumber = -1;

                    var spaceAfterCharName = false;
                    var prevLineWasCharName = false;
                    var prevLineWasSpace = false;

                    async.series({
                      checkRowLength: (checkCB) => {
                        if(rows.length < 200){
                          fs.exists(`${__dirname}/../../data/script_downloads/pdf/scrape-${scrapeId}.pdf`,function(exists){
                            //console.log(`${scrapeId}:\t has pdf ${exists}`)
                            if(exists){
                              //console.log(scrapeId)
                            }

                            checkCB();
                          });

                        } else {
                          checkCB();
                        }

                      },
                      parseRows: (checkCB) => {
                        async.series({
                          iterateLines: (cb2) => {

                            async.forEachSeries(rows, (row, cb3) => {

                              rowNumber++;
                              var numSpaces = 0;

                              if(["5344"].indexOf(scrapeId) !== -1){
                                if(row.indexOf("===") !== -1){
                                  row = "";
                                  rows[rowNumber] = "";
                                }
                              }


                              //deal with blank line
                              if(row.trim().length === 0){ 
                                //console.log("====================");
                                if(currentChar){
                                  // console.log(currentChar)
                                  // console.log(numLines)
                                  // console.log(isTalking)
                                  // console.log("")
                                  if(numLines > 0){
                                    if(isTalking){
                                      characters[currentChar].lineIndex.push(dialogueIndex);
                                      characters[currentChar].numberOfLines.push(numLines);
                                      characters[currentChar].numberOfWords.push(numWords);
                                      characters[currentChar].scriptLineNumber.push(rowNumber);

                                      isTalking = false;
                                    }
                                  } 
                                  
                                  //isTalking = false;
                                }

                                if (prevLineWasCharName) {
                                  spaceAfterCharName = true;
                                }

                                prevLineWasSpace = true;
                                async.setImmediate(() => { cb3(); });
                                  
                              //text
                              } else {

                                var isCharacter = false;

                                if(["5305", "5362", "5523"].indexOf(scrapeId) !== -1 || isCommaSeparatedName){ //text seperated with 1 line
                                    if(rowNumber > 0){
                                      if(rows[rowNumber - 1].trim().length === 0){
                                        row = row.toUpperCase();

                                      } else {
                                        if(isCommaSeparatedName) {
                                          if(!row.endsWith(":")){
                                            row = row.toLowerCase();
                                          } else {
                                            row = row.toUpperCase();
                                          }
                                        } 
                                      }

                                      rows[rowNumber] = row;
                                    }
                                }

                                if(row === row.toUpperCase()){
                                  isCharacter = true;
                                } else {
                                  isCharacter = false;
                                }
                                
                               
                                if(isCharacter) {
                              
                                  var charName = row.toUpperCase()
                                                    .replace(/\(([^)]+)\)/g, "")
                                                    .replace(/\[([^)]+)\]/g, "")
                                                    .replace(/[\s]+/g, " ")
                                                    .replace(/\"/g, "\'\'")
                                                    .replace(/ \' /g, "\'")
                                                    .replace(/[\'S ]*[RECORDED ]*[COM ]*VOICE/g, "")
                                                    .replace(/[ON|OFF|INTO|FROM] [THE]*[TELEVISION|TV|PHONE|SCREEN|RADIO]+/g, "")
                                                    .replace(/[PHONE|RADIO] FILTER/g, "")
                                                    .replace(/V[.|\s|\t|/]+[O|0][.|\s|\t|/]*[.]*/g, "")
                                                    .replace(/[O|0][.|\s|\t|/]+[S|C][.|\s|\t|/]*[.]*/g, "")
                                                    .replace(/P[.|\s|\t]*A[.|\s|\t]*/g, "")
                                                    .replace(/CONTINUED/g, "")
                                                    .replace(/CONT[\'|’]D/g, "")
                                                    .replace(/CONT[.]*/g, "")
                                                    .replace(/OVER/g, "")
                                                    .replace(/\\/g, "");

                                  var povMatch = charName.toUpperCase().match(/[\'S]* P[.]*O[.]*V[.|\s|\b]*/g);
                                  var textMatch = charName.toUpperCase().match(/[A-Z]/g);

                                  if(isCommaSeparatedName){
                                    commaSeparatedCondition = charName.endsWith(":");
                                  }

                                  if(["6038"].indexOf(scrapeId) !== -1){
                                    charName = charName.replace(/[^A-Z|\s]*/g, "")
                                  }

                                  charName = charName.replace(/\:/g, "");
                                  charName = charName.replace(/[^a-z|A-Z|0-9|\s|\#]*/g, "")
                                  charName = charName.replace(/[\s]+/g, " ");

                                  var reversed = charName.split("").reverse().join("");
                                  var lastWS = reversed.indexOf(reversed.trim().slice(0,1));
                                  reversed = reversed.slice(lastWS);
                                  charName = reversed.split("").reverse().join("");

                                  var firstNonCharIndex = charName.indexOf(charName.trim().slice(0,1));
                                  charName = charName.slice(firstNonCharIndex);

                                  var commaSeparatedCondition = true;

                                  if (!( charName.startsWith("INTERIOR")
                                    || charName.startsWith("EXTERIOR")
                                    || charName.startsWith("REVISED")
                                    || charName.startsWith("FADE IN")
                                    || charName.startsWith("FADE OUT")
                                    || charName.startsWith("FLASH TO")
                                    || charName.startsWith("BACK T")
                                    || charName.startsWith("FX ")
                                    || charName.startsWith("ANGLE")
                                    || charName.startsWith("CLOSE ")
                                    || charName.startsWith("THE CAMERA ")
                                    || charName.endsWith(" DAY")
                                    || charName.endsWith(" NIGHT")
                                    || charName.endsWith(" LATER")
                                    || charName.endsWith(" SPEAKS")
                                    || charName.indexOf("FLASHBACK") !== -1
                                    || charName.indexOf("CLOSEUP") !== -1
                                    || charName.indexOf("CONTINUED") !== -1
                                    || charName.indexOf("- LATER") !== -1
                                    || charName.indexOf("- DAY") !== -1
                                    || charName.indexOf("- NIGHT") !== -1
                                    || charName.indexOf("CREDITS") !== -1
                                    || charName.indexOf("INT ") !== -1
                                    || charName.indexOf("EXT ") !== -1
                                    || charName.indexOf("ENT ") !== -1
                                    || charName.indexOf("INT.") !== -1
                                    || charName.indexOf("EXT.") !== -1
                                    || charName.indexOf("ENT.") !== -1
                                    || charName.indexOf("CLOSE O") !== -1
                                    || charName.indexOf("CUT TO") !== -1
                                    || charName.indexOf("CLOSE -") !== -1
                                    || charName.indexOf("CLOSE UP") !== -1
                                    || charName.indexOf("DISSOLVE") !== -1
                                    || charName.indexOf("SHOT") !== -1
                                    || charName.indexOf("ANGLE ON") !== -1
                                    || charName.indexOf("TEXTDECORATION") !== -1
                                    || charName.indexOf("CDATA") !== -1
                                    || charName.indexOf("FONT") !== -1
                                    || charName.indexOf("SPECIAL THANKS") !== -1
                                    || charName.indexOf("RELEASE DATE") !== -1
                                    || charName.indexOf("RUNNING TIME") !== -1
                                    || charName === "INT"
                                    || charName === "EXT"
                                    || charName === "I"
                                    || povMatch !== null
                                    || textMatch === null
                                    ) && prevLineWasSpace && charName.trim().length > 0 && commaSeparatedCondition) {

                                    currentChar = charName;

                                    if(typeof characters[charName] === "undefined"){
                                      characters[charName] = {
                                        name: charName,
                                        lineIndex: [],
                                        numberOfLines: [],
                                        numberOfWords: [],
                                        scriptLineNumber: []
                                      };
                                    }

                                    prevLineWasCharName = true;
                                    isTalking = true;
                                    numLines = 0;
                                    numWords = 0;
                                    dialogueIndex++;

                                    //console.log(charName)
                                  } else {

                                    prevLineWasCharName = false;
                                    isTalking = false;
                                  }

                                } else {
                                  if(prevLineWasCharName || prevLineWasSpace || isTalking ){
                                    numLines += Math.ceil(row.length / 80);
                                    numWords += row.split(/[\s]+/g).length;
                                    //console.log(numWords)
                                  }
                                }

                                prevLineWasSpace = false;
                                async.setImmediate(() => { cb3(); });

                              } 
                              
                            }, () => {
                              cb2();
                            });
                          },
                          removeFalsePositives: (cb2) => {

                            //console.log(`${Object.keys(characters).length} unclean characters`)
                            async.forEachSeries(Object.keys(characters), (charName, cb3) => {

                              var character = characters[charName];
                              var useCharacter = false;

                              if (character.numberOfLines.length > 0){
                                if((character.numberOfLines.length !== 1 && character.numberOfLines.indexOf(0) === -1) || scrapeId === "4908"){
                                  cleanCharacters[charName] = characters[charName];
                                }   
                              }

                              async.setImmediate(() => { cb3() });
                            }, () => {

                               // console.log(rows.join("\n"))
                               // console.log(movie)
                               // console.log(`${rows.length} lines`)
                               // console.log(Object.keys(cleanCharacters).sort())
                               // console.log(`${Object.keys(cleanCharacters).length} clean characters`)
                              cb2();
                            })

                          },
                          done: () => {

                            if(Object.keys(cleanCharacters).length > 0) {
                              manualCharacterObj[scrapeId] = cleanCharacters;
                            }
                            async.setImmediate(() => { checkCB(); });
                          }
                        });
                      }, 
                      done: () => {
                         async.setImmediate(() => { cb1(); });
                      }
                    })
                   
                  }
                });

              } else {
                async.setImmediate(() => { cb1(); });
              }

            } else {
              async.setImmediate(() => { cb1(); });
            }

          }
          
        }, () => {

          //console.log(util.inspect(manualCharacterObj, false, null))
          fs.writeFile(`${__dirname}/../../data/js/manualCharacterObj.js`, `module.exports = ${util.inspect(manualCharacterObj, false, null)}`);
          
          cb();
        });

      });

    }, 
    done: () => {

      console.log("Finished: script-parse.js")
     // callback();
    }
  });
    
//}

//main(() => { console.log("BLAH") });

//module.exports = main;