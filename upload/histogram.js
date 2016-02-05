var percentFormat = d3.format(".0%");

function generateMovieData (callback) {

  var data = [];

  for(var m in moviesObj){
    var movie = moviesObj[m];

    movie.males = 0;
    movie.females = 0;
    movie.questions = 0;
    movie.male_words = 0;
    movie.female_words = 0;
    movie.question_words = 0;
    movie.total_words = 0;

    for(var c in movie.characters){
      var char_id = movie.characters[c];
      var character = characters[char_id];
      var char_words = character_words[char_id];

      //movie.total_words += char_words;
      if(character.gender === "m"){
        movie.males++;
        movie.male_words += char_words;

      } else if (character.gender === "f"){
        movie.females++;
        movie.female_words += char_words;

      } else {
        movie.questions++;
        movie.question_words += char_words;

      }
    }

    movie.total_words = movie.female_words +  movie.male_words;

    data.push(movie);
  }

  callback(data)
}

function drawHistogram(){

  generateMovieData((movieData) => {

    var values = [];

    for(var d in movieData){
      if(movieData[d].total_words > 0){
        values.push(movieData[d].female_words / movieData[d].total_words);
      }
    }

    // A formatter for counts.
    var formatCount = d3.format(".0%");
  //
    var margin = {top: 10, right: 30, bottom: 30, left: 50},
        width = 700 - margin.left - margin.right,
        height = 450 - margin.top - margin.bottom;

    var x = d3.scale.linear()
        .domain([0, 1])
        .range([0, width]);
        console.log(movieData);

    // var interpolateScale = d3.interpolate("#0091E6", "#ff1b84");
    // var rangeColors = d3.range(.2,1.2,0.2).map(function(d){
    //   console.log(d);
    //   return interpolateScale(d);
    // });
    // console.log(rangeColors);
    // var colorScale = d3.scale.threshold().domain([0.2,0.4,0.6,0.8,1.1]).range(rangeColors);
    // console.log(colorScale(1));

    var interpolateOne = d3.interpolate("#0091E6","#ddd");
    var interpolateTwo = d3.interpolate("#ddd","#ff1b84");

    var colorScale = d3.scale.threshold().domain([0.2,0.4,0.6,0.8,1.1]).range(["#0091E6",interpolateOne(0.5),"#ddd",interpolateTwo(0.5), "#ff1b84"]);
    console.log(colorScale(1));
    var bucketScale = d3.scale.threshold().domain([0.2,0.4,0.6,0.8,1.1]).range(["bucket-a","bucket-b","bucket-c","bucket-d","bucket-e"]);

  //   // Generate a histogram using twenty uniformly-spaced bins.
  //   var data = d3.layout.histogram()
  //       .bins(x.ticks(5))
  //       (values);
  //   //
    var bucketData = [];
    var bucketSize = 20;
    var bucketIndexes = {};
  //   console.log(movieData);
  //
    for(var d in movieData){

      var point = movieData[d];

      if(point.total_words > 0){

        point.female_percent = point.female_words / point.total_words;
        point.x = point.female_percent;

        point.bucket = x(Math.floor(point.female_percent * bucketSize) / bucketSize)

        if(typeof bucketIndexes[point.bucket] === "undefined"){
          bucketIndexes[point.bucket] = 0;
        }
        bucketIndexes[point.bucket]++;
        point.bucketNumber = bucketScale(point.female_percent);
        point.y = bucketIndexes[point.bucket];
        bucketData.push(point)
      }
    }

    var bucketDataNest = d3.nest().key(function(d) {
      return d.bucketNumber
    })
    .sortKeys(d3.ascending)
    .entries(bucketData);

    var histogramChartBuckets = d3.select(".histogram-two").append("div").attr("class","histogram-two-data")
      .selectAll("div")
      .data(bucketDataNest)
      .enter()
      .append("div")
      .attr("class",function(d){
        return "histogram-two-bucket " + d.values[0].bucketNumber;
      });

    var histogramChartData = histogramChartBuckets
      .selectAll("div")
      .data(function(d){
        return d.values;
      })
      .enter()
      .append("div")
      .attr("class",function(d){
        return "histogram-two-line " + bucketScale(d.female_percent);
      })
      .style("background-color",function(d){
        return colorScale(d.female_percent);
      })
      ;

    d3.select(".bucket-a")
      .append("p")
      .attr("class","axis-label tk-futura-pt")
      .html("90%+<br>Male")
      ;

    d3.select(".bucket-a")
      .append("p")
      .attr("class","axis-count tk-futura-pt")
      .style("color",function(d){
        return d3.rgb(colorScale.range()[0]).darker(1.5);
      })
      .html(d3.selectAll(".bucket-a").size() - 1 +" films")
      ;

    d3.select(".bucket-c")
      .append("p")
      .attr("class","axis-label tk-futura-pt")
      .html("Gender Parity<br>(50/50 Male:Female)")
      ;

    d3.select(".bucket-c")
      .append("p")
      .attr("class","axis-count tk-futura-pt")
      .style("color",function(d){
        return d3.rgb(colorScale.range()[2]).darker(1.5);
      })
      .html(d3.selectAll(".bucket-c").size() - 1 + " films")
      ;

    d3.select(".bucket-e")
      .append("p")
      .attr("class","axis-label tk-futura-pt")
      .html("90%+<br>Female")
      ;

    d3.select(".bucket-e")
      .append("p")
      .attr("class","axis-count tk-futura-pt")
      .style("color",function(d){
        return d3.rgb(colorScale.range()[4]).darker(1.5);
      })
      .html(d3.selectAll(".bucket-e").size() - 1)
      ;

    var marker = d3.select(".histogram-two-data")
      .append("div")
      .attr("class","histogram-two-marker")
      ;

    var previewNameContainer = d3.select(".histogram-two-data")
      .append("div")
      .attr("class","histogram-two-name-container tk-futura-pt")
      ;

    var previewName = previewNameContainer.append("div")
      .attr("class","histogram-two-name tk-futura-pt")
      .text("hello")
      ;

    var previewDataBarScale = d3.scale.linear().domain([0,1]).range([0,50])

    var previewData = previewNameContainer
      .append("div")
      .attr("class","histogram-two-data-preview tk-futura-pt")
      .selectAll("div")
      .data([0.5,0.6],function(d){
        return d;
      })
      .enter()
      .append("div")
      .attr("class","histogram-two-data-preview-row")
      ;

    var previewDataLabel = previewData.append("p")
      .attr("class","histogram-two-data-preview-label tk-futura-pt")
      .text(function(d,i){
        if(i==0){
          return "female lines";
        }
        return "male lines";
      });

    var previewDataBar = previewData.append("div")
      .attr("class","histogram-two-data-preview-bar")
      .style("width",function(d){
        return previewDataBarScale(d) + "px";
      })
      .style("background-color",function(d,i){
        if (i==0){
          return "#ff1b84"
        }
        return "#0091E6";
      });

    var previewDataPercent = previewData.append("p")
      .attr("class","histogram-two-data-preview-percent tk-futura-pt")
      .text(function(d,i){
        return percentFormat(d);
      });

    histogramChartData
      .on("mouseover",function(d){
        previewName.text(d.title).style("color",colorScale(d.female_percent));

        previewData
          .data([d.female_percent,1-d.female_percent])
          .enter();

        previewData.select(".histogram-two-data-preview-percent")
          .text(function(d,i){
            return percentFormat(d);
          });

        previewData.select(".histogram-two-data-preview-bar")
          .transition()
          .duration(200)
          .style("width",function(d){
            return previewDataBarScale(d) + "px";
          });

      })

    d3.select(".histogram-two-data")
      .on("mousemove",function(d){
        var coordinates = d3.mouse(this);
        console.log(coordinates[0]);
        marker.style("left",coordinates[0]-3+"px");
        previewNameContainer.style("left",coordinates[0]-3+"px");
      })
      .on("mouseover",function(d){
        marker.style("display","block");
        d3.selectAll(".axis-count").style("visibility","hidden")
        previewNameContainer.style("visibility","visible");
      })
      .on("mouseout",function(d){
        marker.style("display",null);
        d3.selectAll(".axis-count").style("visibility","visible")
        previewNameContainer.style("visibility",null);
      })
      .on("click",function(d){

        scriptLines
          .transition()
          .duration(500)
          .style("left",valuesLines.length*2+"px")


        // scriptLines.transition().duration(500)
        //   .style("left",function(d,i){
        //     return d.index*2 + "px";
        //   })
        //   ;
      })
      ;

      console.log(movie_lines);

      var valuesLines = []
      var thisMovieLines = movie_lines["m555"];

      thisMovieLines.female_lines.forEach((x) => { valuesLines.push({gender: "f", index: x}) });
      thisMovieLines.male_lines.forEach((x) => { valuesLines.push({gender: "m", index: x}) });

      valuesLines = valuesLines.sort(function(a, b){
        var o1 = a.index;
        var o2 = b.index;

        if (o1 < o2) return -1;
        if (o1 > o2) return 1;
        return 0;
      })

      var scriptLines = d3.select(".histogram-two").append("div").style("width","100%").append("div")
        .attr("class","histogram-two-script-data")
        .style("width",valuesLines.length*2 + "px")
        .selectAll("div")
        .data(valuesLines)
        .enter()
        .append("div")
        .attr("class","line")
        .style("background",function(d){
          if(d.gender == "f"){
            return "#FF1B84";
          }
          return "#0091E6";
        })
        .style("margin-top",function(d){
          if(d.gender == "f"){
            return "0px";
          }
          return "18px";
        })
        .on("click",function(d){
        })
        ;

        scriptLines.filter(function(d){
          return d.gender == "f"
        })
        .style("left",function(d,i){
          return i*2 + "px";
        })
        ;

        scriptLines.filter(function(d){
          return d.gender == "m"
        })
        .style("left",function(d,i){
          return i*2 + "px";
        })
        ;



        ;

    // var bucketLengths = [];
    // var bucketLengthsCumulative = [];
    //
    // for (bucket in bucketScale.range()){
    //   var length = d3.selectAll("."+bucketScale.range()[bucket]).size();
    //   bucketLengths.push(length);
    //   if (bucket == 0){
    //     bucketLengthsCumulative.push(bucketLengths[bucket]);
    //   }
    //   else{
    //     var length = bucketLengths[bucket]+bucketLengthsCumulative[bucket-1];
    //     bucketLengthsCumulative.push(length);
    //   }
    // }
    // console.log(bucketLengths,bucketLengthsCumulative);
    //
    // histogramChart
    //   .style("margin-right",function(d,i){
    //     if(bucketLengthsCumulative.indexOf(i+1) > -1){
    //       return "2px";
    //     }
    //     return null;
    //   })
  //   console.log(bucketData);
  // //
  //   var y = d3.scale.linear()
  //       .domain([0, d3.max(data, function(d) { return d.y; })])
  //       .range([height, 0]);
  // //
  // //
  //   var svg = d3.select("#histogram")
  //       .attr("width", width + margin.left + margin.right)
  //       .attr("height", height + margin.top + margin.bottom)
  //     .append("g")
  //       .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
  // //
  // //
  //   var axisTickValues = [0.25, 0.5, 0.75];
  // //
  //   var yScale = d3.scale.linear()
  //           .domain([0, 1])
  //           .range([0, height - (margin.top)]);
  // //
  //   var tickLine = svg.append("g")
  //           .attr("class", "tick-line")
  //           // .attr("transform",
  //           //       "translate(" + margin + ",0)");
  // //
  //   for(var v in axisTickValues){
  //      tickLine.append("line")
  //           .attr("x1", 0 - margin.left)
  //           .attr("x2", width + margin.right)
  //           .attr("y1", yScale(axisTickValues[v]))
  //           .attr("y2", yScale(axisTickValues[v]));
  //   }
  // //
  //   var lineBreakdown = svg.append("g")
  //           .attr("class", "line-breakdown")
  //           .attr("width", width + margin.left + margin.right)
  //           .attr("height", 20)
  // //
  //   var buckets = svg.selectAll(".blocks")
  //     .data(bucketData)
  //     .enter().append("g")
  //     .attr("transform", function(d, i) {
  //       return "translate(" + d.bucket  + "," + y(d.y) + ")";
  //     });
  //
  //   buckets.append("rect")
  //     .attr("class", "block")
  //     .style("fill", (d) => {
  //
  //       var color = "black";
  //       if(d.x < 0.5){
  //         color = "#146089";
  //       } else {
  //         color = "#FF1782";
  //       }
  //       return color;
  //
  //       // var colorScale = chroma.scale(['#146089', '#FF1782']);
  //       // return colorScale(d.x).css()
  //
  //     })
  //     .attr("x", 0)
  //     .attr("width", 30)
  //     .attr("height", 2)
  //     .on("mouseover", (d, i) => {
  //
  //       var values = []
  //       var thisMovieLines = movie_lines[d.movieID];

        // thisMovieLines.female_lines.forEach((x) => { values.push({gender: "f", index: x}) });
        // thisMovieLines.male_lines.forEach((x) => { values.push({gender: "m", index: x}) });

        // lineBreakdown.append("text").text(d.title);
        // lineBreakdown.selectAll(".line-block")
        //   .data(values)
        // .enter().append("rect")
        //   //.attr("class", "line-block")
        //   .attr("height", 10)
        //   .attr("width", 2)
        //   .attr("x", (l) => { return l.index * 2})
        //   .attr("y", (l) => {
        //     if(l.gender === "f") return 10;
        //     return 20
        //   })
        //   .style("fill", (l) => {
        //     if(l.gender === "f") return "#FF1782";
        //     return "#146089"
        //   })

      // })
      // .on("mouseout", (d, i) => {
      //   lineBreakdown.selectAll("*").remove();
      // })
  //
  //
    // var xAxis = d3.svg.axis()
    //     .scale(x)
    //     .orient("bottom")
    //     .tickValues([0, 0.25, 0.5, 0.75, 1])
    //     .tickFormat((tick) => {
    //       if(tick === 0.5){ return "Gender Parity";
    //       } else if(tick === 0){ return "All Men";
    //       } else if(tick === 1){ return "All Women";
    //       } else if(tick === 0.25){ return "75% Men";
    //       } else { return "75% Women"; }
    //     });
    //
    // svg.append("g")
    //     .attr("class", "x axis tk-futura-pt")
    //     .attr("transform", "translate(0," + height + ")")
    //     .call(xAxis);

  })

}

//$(document).ready(() => {
  drawHistogram();
//});
