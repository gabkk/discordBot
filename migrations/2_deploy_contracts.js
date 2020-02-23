var ForceSend = artifacts.require("./ForceSend.sol");

module.exports = function(deployer) {
  deployer.deploy(ForceSend);
};