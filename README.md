# scripts

In the data folder, there's quite a few files...
character_list5.csv - this is the data that powers all of the calculations on polygraph.cool/films. It uses the most accurate script that we can find for a given film. People are understandably finding errors, so we will be updating this file as much as possible.
disney_films2.csv - this powers the films selected for the first chart.
lines_data.csv - this is a raw output for every script in our dataset. We have 8,000 scripts. But we only have 2,000 films. That's because most of these screenplays are garbage. Sometimes they didn't parse well because they are scanned pdfs from the 1960s. Other times we mapped them to the incorrect film. Either way, I would not use this data and focus on the character_list csv.
meta_data7.csv - this is unique list of IMDB_IDs from the character_list file, with additional meta data, such as release year and domestic, inflation-adjusted gross.
genre_mapping.csv - this is a mapping of IMDB_IDs to genres.
