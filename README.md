# README #

```mongo.js``` go through the database and print out a report to a file
```dataList``` reads the excel file and generate the list to be used in Elasticsearch for auto suggestion. This includes all category except skills, which has grouping logic. Filename andcategory type is hardcoded in the script. This list is then added to the preset folder to send to ES.
```limitList2JSON``` data preprocessing (trim, sort, deduplicate) and print out the list of all the skills in alphabetical order to a file.
```diversity``` reads the preprocessed skill data list, together with the excel file of the skill list to generate the skill list to be used in Elasticsearch. This list is then added to <preset folder>/skills in 'es-tools' to send to ES.
```education``` reads the education data file and generate 2 education version to be used in the FE (one for the company, one for the candidate). Put them in the search service, the FE calls the search service to get the data.