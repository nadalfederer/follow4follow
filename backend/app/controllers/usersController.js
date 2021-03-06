import moment from 'moment'
import request from 'request-promise-native'
import db from '../db'
import {
  hashPassword,
  comparePassword,
  isValidEmail,
  isEmpty,
  generateUserToken
} from '../helpers/validations'
import {
  errorMessage, successMessage, status
} from '../helpers/status'

module.exports = {
  createUser,
  updateUser,
  getUsers,
  getUser,
  siginUser,
  getUnsuscbribedUser
}

async function createUser (req, res) {
  const {
    email, password
  } = req.body

  const created_on = moment(new Date())
  if (isEmpty(email) || isEmpty(password)) {
    errorMessage.error = 'Email, password field cannot be empty'
    return res.status(status.bad).send(errorMessage)
  }
  if (!isValidEmail(email)) {
    errorMessage.error = 'Please enter a valid Email'
    return res.status(status.bad).send(errorMessage)
  }
  const hashedPassword = hashPassword(password)
  const createUserQuery = `INSERT INTO
      users(email, password, created_on)
      VALUES($1, $2, $3)
      returning *`
  const values = [
    email,
    hashedPassword,
    created_on
  ]

  try {
    const { rows } = await db.query(createUserQuery, values)
    const dbResponse = rows[0]
    delete dbResponse.password
    const token = generateUserToken(dbResponse.email, dbResponse.id, dbResponse.is_admin)
    successMessage.data = dbResponse
    successMessage.data.token = token
    return res.status(status.created).send(successMessage)
  } catch (error) {
    if (error.routine === '_bt_check_unique') {
      errorMessage.error = 'User with that EMAIL already exist'
      return res.status(status.conflict).send(errorMessage)
    }
    errorMessage.error = 'Operation was not successful'
    return res.status(status.error).send(errorMessage)
  }
}

async function updateUser (req, res) {
  const {
    github_login
  } = req.body
  const id = req.params.id
  const query = 'update users set github_login =$2, github_following=$3 where id = $1'

  const opts = {
    json: true,
    headers: {
      'User-Agent': 'request'
      // 'User-Agent': 'Mozilla/5.0 (Linux; U; Android 2.2) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1'
    }
  }

  try {
    if (!github_login) return res.status(status.created).send(successMessage)

    var response = await request.get(`https://api.github.com/users/${github_login}/following`, opts)
    console.log('responseresponseresponseresponse')
    console.log(typeof response)
    var logins = response.map(item => item.login)
    const values = [
      id,
      github_login,
      logins
    ]

    await db.query(query, values)
    return res.status(status.created).send(successMessage)
  } catch (error) {
    console.error(error)
    errorMessage.error = 'Operation was not successful'
    return res.status(status.error).send(errorMessage)
  }
}

async function getUsers (req, res) {
  const createUserQuery = 'SELECT * FROM USERS'

  try {
    const { rows } = await db.query(createUserQuery)
    const usersWithoutPassword = rows.map(user => {
      delete user.password
      return user
    })
    return res.status(status.created).send(usersWithoutPassword)
  } catch (error) {
    console.error(error)
    return res.status(status.error).send(errorMessage)
  }
}

async function getUser (req, res) {
  const id = req.params.id

  const createUserQuery = 'SELECT * FROM USERS where id=$1'
  const values = [
    id
  ]

  try {
    const { rows } = await db.query(createUserQuery, values)
    const userWithoutPassword = rows.map(user => {
      delete user.password
      return user
    })
    return res.status(status.created).send(userWithoutPassword[0])
  } catch (error) {
    console.error(error)
    if (error.routine === '_bt_check_unique') {
    }
    return res.status(status.error).send(errorMessage)
  }
}

async function siginUser (req, res) {
  const { email, password } = req.body
  if (isEmpty(email) || isEmpty(password)) {
    errorMessage.error = 'Email or Password detail is missing'
    return res.status(status.bad).send(errorMessage)
  }
  if (!isValidEmail(email)) {
    errorMessage.error = 'Please enter a valid Email or Password'
    return res.status(status.bad).send(errorMessage)
  }
  const signinUserQuery = 'SELECT * FROM users WHERE email = $1'
  try {
    const { rows } = await db.query(signinUserQuery, [email])
    const dbResponse = rows[0]
    if (!dbResponse) {
      errorMessage.error = 'User with this email does not exist'
      return res.status(status.notfound).send(errorMessage)
    }
    if (!comparePassword(dbResponse.password, password)) {
      errorMessage.error = 'The password you provided is incorrect'
      return res.status(status.bad).send(errorMessage)
    }
    const token = generateUserToken(dbResponse.email, dbResponse.id, dbResponse.is_admin)
    delete dbResponse.password
    successMessage.data = dbResponse
    successMessage.data.token = token
    return res.status(status.success).send(successMessage)
  } catch (error) {
    errorMessage.error = 'Operation was not successful'
    return res.status(status.error).send(errorMessage)
  }
}

async function getUnsuscbribedUser (req, res) {
  const createUserQuery = 'SELECT * FROM USERS'

  try {
    const { rows } = await db.query(createUserQuery)
    const usersWithoutPassword = rows.map(user => {
      delete user.password
      return user
    })
    return res.status(status.created).send(usersWithoutPassword)
  } catch (error) {
    if (error.routine === '_bt_check_unique') {
    }
    return res.status(status.error).send(errorMessage)
  }
}
