'use strict';

(async () => {
  const mongo = require('mongo-models');
  const {Profile} = mongo;
  const _ = require('lodash');
  const fs = require('fs').promises;
  const util = require('util');

  await Profile
    .find({})
    .populate('linkedUserId')
    .select('skills fullName linkedUserId active')
    .lean()
    .exec()
    .then(async (profiles) => {
      const compact = _.map(_.flattenDeep([..._.map(profiles, 'skills')]), 'name');
      await fs.writeFile('stagingSkillsCompact.txt', _.uniq(compact).sort().join('\n'), console.error);

      const skills = _.map(profiles, (profile) => {
        return `${
          profile.linkedUserId._id}: ${
          profile.linkedUserId.email} (${
          profile.linkedUserId.candidateType}, ${
          profile.linkedUserId.active && 'active' || 'inactive'})\t${
          profile.fullName}\n\t${
          _.map(profile.skills, 'name').join('\n\t') || '[]'}`;
      })
        .join('\n');

      await fs.writeFile('stagingSkills.txt', skills, console.error);
      console.log('Done fam');

      return Promise.resolve();
    })
    .catch(console.log);
})(); // end IIFE
