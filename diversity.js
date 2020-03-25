'use strict';

(async () => {
  const _ = require('lodash');
  const fs = require('fs').promises;
  const util = require('util');
  const xlsx = require('node-xlsx');
  const dataList = require('./dataList.json');

  // DIVERSITY METADATA
  // only first tab is valid, remove header
  let data = _.get(xlsx.parse('Skillsv10.1.xlsx'), ['0', 'data']) || [];
  data.shift();

  // remove empty lines
  data = (data || []).filter((row) => {
    // first column is ignored
    row.shift();
    return (row[0] || '').trim().length;
  });

  // splitting, preserve indices
  const [groups, members] = data.reduce((memo, row) => {
    memo[0].push(row.shift().trim());
    // lowercase, remove invalid members
    row = row.reduce((memo, item) => {
      item = (item || '').trim().toLowerCase();
      if (item.length) {
        memo.push(item);
      }

      return memo;
    }, []);
    memo[1].push(row);

    return memo;
  }, [[], []]);

  // reverse the data
  const itemOfInterest = _.uniq(_.flatten(members));
  let unknownItems = [...itemOfInterest];

  // remove current file
  await fs.writeFile('skills', '', console.error);
  await fs.writeFile('skills2', '', console.error);
  await fs.writeFile('interestedSkills', '', console.error);

  // for each skill
  for (let idx = 0; idx < dataList.length; idx++) {
    const value = dataList[idx].trim().replace(/\s+/, ' ');
    const skill = value.toLowerCase();

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

    // skill is within a group?
    let group;
    let groupIdx = itemOfInterest.indexOf(skill);
    if (groupIdx > -1) {
      group = groups.filter((group, idx) => members[idx].includes(skill));

      // uncheck the skill, for filtering later, keep indices for the loop
      itemOfInterest[groupIdx] = '';
    }

    const file = `skills${idx >= dataList.length/2 && 2 || ''}`;
    await fs.appendFile(file, '{"index": {}}\n', (err) => err && console.error(err));
    await fs.appendFile(file, `{"value": ${
      JSON.stringify(value)
    }, "type": "skills", "item.suggest": {"input": ${
      JSON.stringify(input).replace(/,\"/g, ', \"')
    }}${
      group && `, "groups": ${JSON.stringify(group)}` || ''
    }}\n`, (err) => err && console.error(err));
  }

  console.log('Skill list was created');
  const unknown = itemOfInterest.filter((skill) => skill.length);
  unknown.sort();

  console.log('Unknown skills: %O', unknown);
  console.log('Adding unknown skills to the skill list to make them pass purification');
  console.log('NOTE that IF there is a requirement to add them to the limit list');
  console.log('we have to process them again. Current flow will assume they are valid');

  if (!unknown.length) {
    return;
  }

  // for instead of forEach to enforce a sequential flow
  for (let idx = 0; idx < unknown.length; idx++) {
    const skill = unknown[idx];
    const group = groups.filter((group, idx) => members[idx].includes(skill));

    await fs.appendFile('interestedSkills', '{"index": {}}\n', (err) => err && console.error(err));
    await fs.appendFile('interestedSkills', `{"value": ${
      JSON.stringify(skill)
    }, "type": "skills", "item.suggest": {"input": []}, "groups": ${
      JSON.stringify(group)
    }}\n`, (err) => err && console.error(err));
  }
})(); // end IIFE