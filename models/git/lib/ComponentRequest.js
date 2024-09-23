const axios = require('axios')

const url = "http://cjp.clidev.xyz:7001"

module.exports = {
  async createComponent (component) {
    try {
      const response = await axios.post(`${url}/api/v1/components`, component)
      console.log(response.data)
    } catch (error) {
      throw error;
    }
  }
}