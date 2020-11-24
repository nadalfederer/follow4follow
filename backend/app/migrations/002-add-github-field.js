import db from '../db'

module.exports = async function () {
  await addGithubField()
}

async function addGithubField () {
  const query = '\n' +
    'ALTER TABLE users\n' +
    'ADD score INTEGER'

  await db.query(query)
}
