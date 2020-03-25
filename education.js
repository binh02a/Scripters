'use strict';

(() => {
  const _ = require('lodash');
  const fs = require("fs");
  const xlsx = require('node-xlsx');
  const education = xlsx.parse('edu2.xlsx');

  // compact, uniq, unify whitespaces
  const normalize = (memo, item, unique = true) => {
    item = `${item || ''}`.trim().replace(/\s+/g, ' ');
    if (item && (!unique || !memo.includes(item))) {
      memo.push(item);
    }

    return memo;
  };

  // result
  const result = {};

  // first page
  const data = education[0].data;
  const subjects = education[1].data;

  // Remove labels
  data.shift();

  const TYPES = _.map(data, '0');
  const LEVELS = _.map(data, '1');
  const RESULT_ANY = _.map(data, '2');
  const COMPANY_RESULTS = _.map(data, '3');
  const SUBJECT_TITLES = subjects.shift().map((subject) => (subject || '').trim().toLocaleLowerCase());
  const typeIndices = [];
  const levelIndices = [];
  data.forEach((item, idx) => {
    if ((item[0] || '').trim()) {
      typeIndices.push(idx);
    }

    if ((item[1] || '').trim()) {
      levelIndices.push(idx);
    }
  });

  const typeList = typeIndices.reduce((memo, item, idx) => {
    memo[TYPES[item]] = (LEVELS.slice(item, typeIndices[idx+1] || undefined)).reduce((memo, item)=> {
      if (item && item.trim()) {
        memo.push(item);
      }

      return memo;
    }, []);

    return memo;
  }, {});

  let lvIdx = 0;
  // loop the types, going with indices since we share the data
  for (let typeIdx = 0; typeIdx < typeIndices.length; typeIdx++) {
    const nextTypeIdx = typeIdx + 1;
    const nextTypeRow = typeIndices[nextTypeIdx];
    const typeObj = {};
    let anyLevel;

    // loop the levels
    while(true) {
      // break when done
      if (lvIdx >= levelIndices.length) {
        break;
      }

      const currentRow = levelIndices[lvIdx];
      // break when reaching next type
      if (nextTypeRow && currentRow >= nextTypeRow) {
        break;
      }

      const currentLevel = LEVELS[currentRow];

      // level found, gathering subjects
      const nextLvlRow = levelIndices[lvIdx + 1];
      const levelLowered = (currentLevel || '').trim().toLowerCase();
      const subjectIdx = SUBJECT_TITLES.findIndex((item) => {
        return item === levelLowered;
      });

      // adding subject
      const levelList = {
        subject: [],
        result: {},
      };

      if (subjectIdx === -1) {
        console.log('No subjects for: %O', currentLevel);
      } else {
        levelList.subject = _.map(subjects, `${subjectIdx}`).reduce(normalize, []);
      }

      // extract results
      let results = COMPANY_RESULTS.slice(currentRow, nextLvlRow);
      if (/^any$/i.test(currentLevel)) {
        levelList.result.company = results.reduce((memo, item, idx) => {
          if (!item) {
            return memo;
          }

          if (!RESULT_ANY[currentRow + idx]) {
            console.log('No mapping for "any" result: %O', currentRow + idx);
          }

          memo.push({
            label: item,
            value: `${RESULT_ANY[currentRow + idx]}_0`,
          });

          return memo;
        }, []);
      } else {
        let count = _.uniq(results).length;
        levelList.result.company = results.reduce((memo, item, idx) => {
          if (item) {
            memo.push({
              label: item,
              value: `0_${count}`,
            });

            count--;
          }

          return memo;
        }, []);
      }

      // candidate takes the rest of the data
      // meta data
      const candLevels = data.slice(currentRow, nextLvlRow);
      const items = _.flattenDeep(candLevels.map(row => row.slice(4)));
      // reduce again for the unique subjects
      levelList.result.candidate = _.orderBy(
        candLevels.reduce((memo, row, idx) => {
          // The first 4 columns in any row are irrelevant
          row.splice(4).forEach((item) => {
            if (!item || !item.trim()) {
              return;
            }

            const anyTarget = RESULT_ANY[currentRow+idx];
            if (!anyTarget) {
              console.log('Any target not found for: %O, item: \'%O\'', currentRow+idx, item);
            }

            if (!memo[item]) {
              memo[item] = {
                label: item,
                value: `${anyTarget}_${items.filter((x) => x === item).length}`,
              }
            }
          });

          return memo;
        }, {}), ['label'], ['desc']);

      // adding to result
      if (/^any$/i.test(currentLevel)) {
        anyLevel = levelList;
      } else {
        typeObj[currentLevel] = levelList;
      }

      // increase index, we are doing a while(true)
      lvIdx++;
    }

    // Adding any if exists
    if (anyLevel) {
      const merge = Object.keys(typeObj).reduce((memo, level) => {
        (typeObj[level].subject || []).forEach((subject) => {
          if (subject && !memo.includes(subject.trim())) {
            memo.push(subject.trim());
          }
        });

        return memo;
      }, []).sort();

      result[TYPES[typeIndices[typeIdx]]] = {
        'Any level': {
          subject: merge,
          result: anyLevel.result,
        },
        ...typeObj,
      };
    } else {
      result[TYPES[typeIndices[typeIdx]]] = typeObj;
    }
  }

  // Hard clone to avoid pointer brainstorming
  const clone = _.cloneDeep(result);
  Object.keys(clone).forEach((type) => {
    delete clone[type]['Any level'];

    Object.keys(clone[type]).forEach((key) => {
      clone[type][key].result = clone[type][key].result.candidate;
    });
  });

  return fs.writeFile(
    'educationList_candidate.json',
    JSON.stringify(clone, null, 2), (err) => {
      if (err) {
        throw err;
      }

      console.log('done educationList_candidate');

      Object.keys(result).forEach((type) => {
        Object.keys(result[type]).forEach((key) => {
          // Add in "any" for subjects .. doing a uniq for safety
          result[type][key].subject = _.uniq([
            'Any subject',
            ...result[type][key].subject,
          ]);
          result[type][key].result = result[type][key].result.company;
        });
      });

      return fs.writeFile(
        'educationList_company.json',
        JSON.stringify(result, null, 2), (err) => {
          if (err) {
            throw err;
          }

          console.log('done educationList_company');
        });
    });
})(); // end IIFE