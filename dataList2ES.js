'use strict';

(async () => {
  const _ = require('lodash');
  const fs = require('fs').promises;
  const util = require('util');
  const xlsx = require('node-xlsx');
  let dataList = xlsx.parse('qualificationv4.1.xlsx')[0].data;

  // first row is invalid
  dataList.shift();

  // trimming
  const classes = _.map(dataList, (row) => {
    return (row[0] || '').trim();
  });
  const qualifications = _.map(dataList, (row) => {
    return (row[1] || '').trim();
  });

  // only get the first column
  // dataList = _.uniq(_.compact(_.map(dataList, (item) => (item[0] || '').trim())));
  // dataList.sort();

  // remove current file
  await fs.writeFile('dataList', '', console.error);

  // for each skill
  let group = '';
  for (let idx = 0; idx < qualifications.length; idx++) {
    if (classes[idx]) {
      group = classes[idx];
    }
    const value = qualifications[idx];
    // drop duplicate
    const idx1 = _.findIndex(qualifications, (qualification) => {
      return qualification === value;
    });
    if (!value || idx !== idx1) {
      continue;
    }

    // tokenizer
    const input = [];
    const tokens = _.compact(
      value
        .toLowerCase()
        .split(/[\s\/\(\),\-–]+/g),
    );

    while (tokens.length) {
      input.push(tokens.join(' '));
      tokens.shift();
    }

    await fs.appendFile('dataList', '{"index": {}}\n', (err) => err && console.error(err));
    await fs.appendFile('dataList', `{"value": ${
      JSON.stringify(value)
    }, "class": ${JSON.stringify(group)}, "type": "qualifications", "item.suggest": {"input": ${
      JSON.stringify(input).replace(/,\"/g, ', \"')
    }}}\n`, (err) => err && console.error(err));
  }

  console.log('Data list was created');
})(); // end IIFE