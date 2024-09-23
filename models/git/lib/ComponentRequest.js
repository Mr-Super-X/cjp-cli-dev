const axios = require("axios");
const log = require("@cjp-cli-dev/log");

const url = "http://cjp.clidev.xyz:7001";

module.exports = {
  async createComponent(component) {
    try {
      const response = await axios.post(`${url}/api/v1/components`, component);
      log.verbose('components api response：', response)
      const { data } = response;
      if (data.code === 0) {
        return data.data;
      } else {
        return null;
      }
    } catch (error) {
      throw error;
    }
  },
};
