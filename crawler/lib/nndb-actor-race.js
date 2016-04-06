const fs = require("fs");
const async = require("async");
const request = require("request");
const cheerio = require('cheerio');
const moment = require("moment");

var start = moment();

async.forEach([1,2], (index, cb) => {

	var actorsList = [];
	var actorCount = 1;
	
	var crawledIMDB = [];

	async.series({
		getCrawledList: (cb1) => {
			fs.readFile(`${__dirname}/../../data/nndb-actor-${index}.tsv`, "utf8", (err, data) => {
				var lines = data.split("\n").slice(1);

				async.forEachSeries(lines, (line, cb2) => {
					
					if(line.length > 0){
						var parts = line.split("\t");
						var imdb = parts[0];
						crawledIMDB.push(imdb);
					}
					async.setImmediate(() => { cb2(); });

				}, () => {
					async.setImmediate(() => { cb1(); });
				})
			});
		},
		readActorFiles: (cb1) => {

			fs.readFile(`${__dirname}/../../data/actors-part-${index}.tsv`, "utf8", (err, data) => {

				actorsList = data.split("\n").slice(1);
				async.setImmediate(() => { cb1(); });
			});

		}, crawlNNDB: (cb1) => {

			async.forEachSeries(actorsList, (actor, cb2) => {

				if(actor.length > 0){
					var parts = actor.split("\t");

					var IMDB = parts[0];	

					if(crawledIMDB.indexOf(IMDB) === -1){
						var name = parts[1];
						var gender = parts[2];
						var birthdate = parts[3];

						var nndbId = "-";
						var nndbName = "-";
						var nndbRace = "-";
						var nndbGender = "-";
						var nndbBirthdate = "-";
						var nndbNationality = "-";

						console.log("-------------------------------");
						console.log(`time elapsed: ${moment().diff(start, "minutes")} minutes`)
						console.log(`actors-part-${index}.tsv`);
						console.log(`${actorCount}/${actorsList.length - crawledIMDB.length} actors`);
						console.log(`Searching: ${name}`);
						actorCount++;

						var searchURL = `http://search.nndb.com/search/nndb.cgi?nndb=1&omenu=unspecified&query=${name.replace(/[^a-z|A-Z|\s]/g, "")}`;
						console.log(searchURL)

						request(searchURL, (err, resp, body) => {
							if(err){
								async.setImmediate(() => { cb2(); });
							} else {

								var $ = cheerio.load(body); 
								//var actorLink = $("body > center > font > p:nth-child(1) > table > tbody > tr:nth-child(2) > td:nth-child(1) > font > a");
								//console.log(body)


								var actorListTable = $("td:contains('NAME')").closest("table");
								var actorLink = $(actorListTable).find("tr:nth-of-type(2) td:nth-of-type(1) a")[0];

								var href = $(actorLink).attr("href");

								if(body.indexOf("No names match your query") !== -1 || typeof href === "undefined") {

									console.log("not found");

									fs.appendFile(`${__dirname}/../../data/nndb-actor-${index}.tsv`, `${actor}\t-\t-\t-\t-\t-\t-\n`, (err1) => {
									  async.setImmediate(() => { cb2(); });
									});
									
								} else {
									nndbId = href.replace("http://www.nndb.com/people/", "");
									var nndbName = $(actorLink).text()
									console.log(href);
									request(href, (err1, resp1, body1) => {
										if(err1){
											console.log("not found");

											fs.appendFile(`${__dirname}/../../data/nndb-actor-${index}.tsv`, `${actor}\t-\t-\t-\t-\t-\t-\n`, (err1) => {
											  async.setImmediate(() => { cb2(); });
											});
										

										} else {

											var $1 = cheerio.load(body1); 
											var raceNode = $1("b:contains('Race')");
											if(raceNode.length > 0){
												nndbRace = raceNode[0].nextSibling.nodeValue;
											}

											var nndbGenderNode = $1("b:contains('Gender')");
											if(nndbGenderNode.length > 0){
												nndbGender = nndbGenderNode[0].nextSibling.nodeValue;
											}

											var nndbBirthDateNode = $1("b:contains('Born')");
											if(nndbBirthDateNode.length > 0){
												var dateParts = $(nndbBirthDateNode[0]).nextUntil("b");
												var dateArray = []
												dateParts.each((i, a) => {
													dateArray.push($(a).text())
												})
												nndbBirthdate = dateArray.join("-")
											}

											var nndbNationalityNode = $1("b:contains('Nationality')");
											if(nndbNationalityNode.length > 0){
												nndbNationality = nndbNationalityNode[0].nextSibling.nodeValue;
											}

											console.log(`${nndbId}\t${nndbName}\t${nndbRace}\t${nndbGender}\t${nndbBirthdate}\t${nndbNationality}`);
										
											fs.appendFile(`${__dirname}/../../data/nndb-actor-${index}.tsv`, 
												`${actor}\t${nndbId}\t${nndbName}\t${nndbRace}\t${nndbGender}\t${nndbBirthdate}\t${nndbNationality}\n`, 
												(err1) => {
											  	async.setImmediate(() => { cb2(); });
											});

										}
									});

								}		
							}
						});

					} else {
						async.setImmediate(() => { cb2(); });
					}

				} else {
					async.setImmediate(() => { cb2(); });
				}

			}, () => {

				async.setImmediate(() => { cb1(); });
			});

		},  done: () => {

			console.log(`Finished actor-part-${index}.tsv`);
			async.setImmediate(() => { cb(); });

		}	
	});

}, () => {
	console.log("DONE")
});



