'use strict';

(async () => {
  const _ = require('lodash');
  const fs = require('fs').promises;
  const util = require('util');
  const xlsx = require('node-xlsx');

  // only first tab is valid, remove header
  // let dataList = xlsx.parse('jobTitles4.6.xlsx')[0].data;
  let dataList = xlsx.parse('Skillsv10.1.xlsx')[0].data;

  // only get the first column
  dataList = _.uniq(_.compact(_.map(dataList, (item) => (item[0] || '').trim())));
  dataList.sort();

  // remove current file
  await fs.writeFile('dataList.json', '', console.error);
  await fs.appendFile('dataList.json', JSON.stringify(dataList, null, 2), (err) => err && console.error(err));

  console.log('Done fam');
})(); // end IIFE