const { BN, ether, balance } = require("openzeppelin-test-helpers");
const ganache = require("ganache-core");
const Discord = require('discord.js');
const fs   = require("fs");

const Web3 = require("web3");
const web3 = new Web3(new Web3.providers.HttpProvider("http://127.0.0.1:8545"));
const client = new Discord.Client();

const config = require('./config.json');


const DAI_ADDRESS = config.daiContractAddress;
const DAI_CREATOR = config.daiCreator;
const DAI_ABI     = JSON.parse(fs.readFileSync("abi/daiAbi.js"));

const forceSendContract = JSON.parse(fs.readFileSync("contracts/ForceSend.json"));
const FORCE_ABI     	= forceSendContract["abi"];
const FORCE_BYTECODE    = forceSendContract["bytecode"];


client.once('ready', () => {
	var interval = setInterval (function () {
		let yourchannel = client.users.get("216275084313231362");
		yourchannel.send("Im still running!");
		eval("docker stop docker-ganache_node_1")
	}, 1 * 10000);
});

async function sendEthToDaiContractOwner(message){
	let accounts = await web3.eth.getAccounts();
	let rst = await web3.eth.getBalance(accounts[0]).then(receipt=> {console.log(receipt)});
	var forceContractAddr = "0x123";
	console.log("DAI_CREATOR");
	console.log(DAI_CREATOR);
	// Check the value of the Dai contract Creator
	await web3.eth.getBalance(DAI_CREATOR)
							.then(receipt=> {
								message.channel.send('Current balance of the Dai contract creator: ' + web3.utils.fromWei(receipt, 'ether') + ' eth');
								console.log(receipt);
							})
							.catch((e) => {console.log(e)});

	// Setup the Abi to deploy the contract
	let forceInterface = new web3.eth.Contract(FORCE_ABI);

	//Deploy the contract on our testnet
	await forceInterface.deploy({
				data: FORCE_BYTECODE, 
			})
			.send({
				from: accounts[0], 
				gasPrice: '1000', gas: 2310334
			})
			.then(receipt=> {
				// Add the address to the contract (Todo improve this)
				forceInterface = new web3.eth.Contract(FORCE_ABI, receipt._address);
				
			})
			.catch((e) => {
				message.channel.send('forceInterface.deploy failed: ' + e);
				console.log(e)
			});

	// Call the sucide contract to send fund to this address
	await forceInterface.methods.go(DAI_CREATOR).send({ from: accounts[0],
														value: ether("1")})
								.catch((e) => {
									message.channel.send("forceInterface.methods.go failed: " + e);
									console.log(e);
								});

	await web3.eth.getBalance(DAI_CREATOR).then(receipt=> {
			message.channel.send('Dai contract balance After funding: ' + web3.utils.fromWei(receipt, 'ether') + ' eth');
			console.log(receipt);
		  })
		  .catch((e) => {console.log(e)});

}

// ADD thisl later
// async function transfertDaiFromUnlockedAddr(message){
// 	console.log(registry.methods);
// 	let tokens = await registry.methods.balanceOf(unlockedAddress).call()
// 		.catch((e) => {console.log(e);});
// 	console.log("tokens unlockedAddress");
// 	console.log(tokens);

// 		let ret = await registry.methods.transfer(unlockedAddress, 1800000000000000).send({
// 		from: walesAddr, 
// 		gas: 0x00, 
// 		gasPrice: 0x00
// 	}).then(receipt=> {console.log(receipt)});
// 	tokens = await registry.methods.balanceOf(unlockedAddress).call()
// 		.catch((e) => {console.log(e);});
// 	console.log("tokens unlockedAddress");
// 	console.log(tokens);
// }

async function mintDaiFromErc20Contract(recipientAddress, amount, web3, message) {
	
	var daiInterface = new web3.eth.Contract(DAI_ABI, DAI_ADDRESS);
    	tokens = await daiInterface.methods.balanceOf(recipientAddress).call()
			.catch((e) => {console.log(e);});

		ret = await daiInterface.methods.mint(recipientAddress, amount).send({
			from: DAI_CREATOR,
			gas: 6000000
		}).then(receipt=> {
			message.channel.send(web3.utils.fromWei(amount, 'ether') + ' Dai succefully mint and sent to ' + recipientAddress);
		}).catch((e) => {
			console.log(e);
			message.channel.send("Cant mint new token try to call !fixFaucet and try again");
		});

		tokens = await daiInterface.methods.balanceOf(recipientAddress).call()
			.catch((e) => {console.log(e);});

    if (web3.currentProvider.constructor.name == "WebsocketProvider")
        web3.currentProvider.connection.close();
}

client.on("message", (message) => {
	if (message.author.bot) return;

	if (message.content.indexOf(config.prefix) !== 0) return;

	const args = message.content.slice(config.prefix.length).trim().split(/ +/g);
	const command = args.shift();

	switch (command) {
		case "info" :
			message.channel.send("Make sure you have follow the instructions here before starting to interact with the faucet");
			message.channel.send("");
			message.channel.send("Hey this is the current function available");
			message.channel.send("!fixFaucet / Send eth to the dai creator address (this address need eth to mint Dai)");
			message.channel.send("!faucet YOUR_ADDRESS AMOUNT_OF_DAI/ this command will mint dai and send it to your address");
			message.channel.send("!ping / this command is useless but at least you know the bot is alive");
			break;
		case "fixFaucet":
			message.channel.send("Send fund to the dai contract's creator address");
			sendEthToDaiContractOwner(message);

			break;
		case "faucet" :
			if (args.length !== 2){
				message.channel.send('To get Dai from the faucet you should write: !faucet YOUR_ADDRESS amount');
				break;
			}
			const recipientAddress = args[0];
			if (!web3.utils.isAddress(recipientAddress)){
				message.channel.send('Address Invalid !');
				break;
			}

			const amountParam = args[1];
			// Change this later
			if(amountParam === "10"){
				amount = "10000000000000000000";
			} else if (amountParam === "100"){
				amount = "100000000000000000000";
			} else if (amountParam === "1000"){
				amount = "1000000000000000000000";
			} else{
				message.channel.send('The faucet can only send you 10/100/1000 dai');
				break
			}
			mintDaiFromErc20Contract(recipientAddress, amount, web3, message);
			break;
		case "ping" :
			message.channel.send('Pong!');
			break;
	}
});
client.login(config.token);
