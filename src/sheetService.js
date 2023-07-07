const moment = require("moment");
const axios = require("axios");
const _ = require("lodash");
const { ethers, providers, Wallet } = require("ethers");
const { get } = require("http");




// keys

// Etherscan api
const apiKey = "M9TKZC1D3W8WPPPYD1TP41DTKITVNPMNTG";




const sheetService = async (address, from, to, key = 'https://mainnet.infura.io/v3/ccd672837bb643d7a059effc74ae25cc', result = {}) => {

  const iface = new ethers.utils.Interface([
    "function swapExactETHForTokens(uint256 amountOutMin, address[] path, address to, uint256 deadline)",
    "function swapETHForExactTokens(uint amountOut, address[] calldata path, address to, uint deadline)",
    "function swapExactETHForTokensSupportingFeeOnTransferTokens(uint amountOutMin,address[] calldata path,address to,uint deadline)",

    "function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external",
    "function swapExactTokensForETHSupportingFeeOnTransferTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external",
    "function swapTokensForExactETH(uint amountOut, uint amountInMax, address[] calldata path, address to, uint deadline) external",

    "function swapExactTokensForTokens(uint amountIn,uint amountOutMin,address[] calldata path,address to,uint deadline) external",
    "function swapExactTokensForTokensSupportingFeeOnTransferTokens(uint amountIn,uint amountOutMin,address[] calldata path,address to,uint deadline) external",
    "function swapTokensForExactTokens(uint amountOut,uint amountInMax,address[] calldata path,address to,uint deadline) external",
    "function execute(bytes commands,bytes[] inputs,uint256 deadline)",
    "function approve(address _spender, uint256 _value)",
  ]);
  const logIface = new ethers.utils.Interface(["event Swap( address indexed sender, uint amount0In, uint amount1In, uint amount0Out, uint amount1Out, address indexed to)"]);
  const logIfaceV3 = new ethers.utils.Interface(["event Swap( address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)"]);
  const buyLogIface = new ethers.utils.Interface(["event Transfer(address indexed from, address indexed to, uint256 value)"]);
  const provider = new ethers.providers.JsonRpcProvider(`${key}`);



  const abi = [
    {
      "constant": true,
      "inputs": [],
      "name": "symbol",
      "outputs": [
        {
          "name": "",
          "type": "string"


        }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
    },
    {
      "constant": true,
      "inputs": [],
      "name": "decimals",
      "outputs": [
        {
          "name": "",
          "type": "uint256"
        }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
    }
  ];

  const factoryAbiV3 = [

    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        },
        {
          "internalType": "uint24",
          "name": "",
          "type": "uint24"
        }
      ],
      "name": "getPool",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }

  ];

  const factoryAbi = [
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "tokenA",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "tokenB",
          "type": "address"
        }
      ],
      "name": "getPair",
      "outputs": [
        {
          "internalType": "address",
          "name": "pair",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ];
  const transferAbi = new ethers.utils.Interface([
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "name": "from",
          "type": "address"
        },
        {
          "indexed": true,
          "name": "to",
          "type": "address"
        },
        {
          "indexed": false,
          "name": "value",
          "type": "uint256"
        }
      ],
      "name": "Transfer",
      "type": "event"
    }
  ]);

  let factoryCntract = new ethers.Contract("0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f", factoryAbi, provider);
  let factoryCntractV3 = new ethers.Contract("0x1F98431c8aD98523631AE4a59f267346ea31F984", factoryAbiV3, provider);

  try {
    try {

      //convert timestamp to block number
      let subtractedDate = moment(from, 'YYYY-MM-DD').subtract(1, 'day').format('YYYY-MM-DD');
      let addDate = moment(to, 'YYYY-MM-DD').add(1, 'day').format('YYYY-MM-DD');

      const startTime = '00:01:00';
      const endTime = '23:59:00';

      subtractedDate = moment(`${subtractedDate} ${startTime}`).format('YYYY-MM-DD HH:mm:ss');
      addDate = moment(`${addDate} ${endTime}`).format('YYYY-MM-DD HH:mm:ss');

      const startTimestamp = moment(subtractedDate).unix();
      const endTimestamp = moment(addDate).unix();


      const startResponse = await axios.get(
        `https://api.etherscan.io/api?module=block&action=getblocknobytime&timestamp=${startTimestamp}&closest=before&apikey=${apiKey}`
      );
      const endResponse = await axios.get(
        `https://api.etherscan.io/api?module=block&action=getblocknobytime&timestamp=${endTimestamp}&closest=before&apikey=${apiKey}`
      );
      const startBlock = startResponse?.data?.result;
      const endBlock = endResponse?.data?.result;

      if (startBlock && endBlock) {
        try {
          let response = await axios.get(
            `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=${startBlock}&endblock=${endBlock}&sort=asc&apikey=${apiKey}`
          );

          //if data found
          if (response?.data?.result?.length) {


            //get data by dates
            const getDateData = _.filter(response?.data?.result, obj => {
              const date = moment.unix(obj.timeStamp).utc().format(
                "YYYY-MM-DD"
              );

              return `${date}` >= JSON.parse(from) && `${date}` <= JSON.parse(to);

            });


            //trx modify and find trx type 
            const decodeTransaction = async (trx) => {
              try {
                //if approved trx
                if (trx.functionName.substring(0, trx.functionName.indexOf("(")) == 'approve' && trx.functionName != '') {
                  let contract = new ethers.Contract(trx.to, abi, provider);
                  trx.apptoken = await contract.symbol();
                  const transactionFee = parseInt(trx?.gasPrice) * parseInt(trx?.gasUsed);
                  trx.fee = transactionFee / 10 ** 18                  // console.log("symbol", await contract.symbol())
                  trx.timestamp = moment.unix(trx.timeStamp).utc().format(
                    "YYYY-MM-DD hh:mm:ss"
                  );
                  trx.type = 'Approved'
                }

                // if failed trx
                else if (trx.isError == '1' && trx.functionName != '') {
                  let customError = ''
                  // if(){
                  try {
                    const response = await axios.get(`https://api.tenderly.co/api/v1/public-contract/1/tx/${trx.hash}`);
                    // console.log("response", response?.data, response?.data?.error_message);
                    customError = response?.data?.error_message
                  } catch (err) {
                    console.log("custtom error", err)
                  }
                  trx.timestamp = moment.unix(trx.timeStamp).utc().format(
                    "YYYY-MM-DD hh:mm:ss"
                  );
                  trx.error = customError || "execution reverted"
                  const transactionFee = parseInt(trx?.gasPrice) * parseInt(trx?.gasUsed);
                  trx.fee = transactionFee / 10 ** 18;
                  trx.type = 'Failed'
                }

                //if dex buy sell V2  trx
                else if ((trx?.to != '0xef1c6e67703c7bd7107eed8303fbe6ec2554bf6b' &&  trx?.to != '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad') && trx.functionName != '') {
                                  
                  let decoded = iface.decodeFunctionData(
                    trx.functionName.substring(0, trx.functionName.indexOf("(")),
                    trx?.input
                  );
                  trx.timestamp = moment.unix(trx.timeStamp).utc().format(
                    "YYYY-MM-DD hh:mm:ss"
                  );
                  let outTokenContract = new ethers.Contract(
                    decoded?.path[0],
                    abi,
                    provider
                  );
                  let inTokenContract = new ethers.Contract(decoded?.path[1], abi, provider);

                  let outDecimal = 18;
                  let inDecimal = 18;

                  //decode symbol and decimals
                  try {
                    outDecimal = await outTokenContract.decimals();
                    inDecimal = await inTokenContract.decimals();
                    trx.outToken = await outTokenContract.symbol() || '';
                  } catch (error) {
                    // console.log("decode symbol and decimals error", error,trx.hash)
                  }

                  if (_.includes(['WETH', 'USDT', 'USDC'], trx?.outToken)) {
                    trx.type = 'BUY'
                  } else {
                    trx.type = 'SELL'
                  }

                  // console.log("decoded", decoded.path)




                  //trx logs get and decode
                  try {
                    const pairAddress = await factoryCntract.getPair(decoded?.path[0], decoded?.path[1]);

                    const receipt = await provider.getTransactionReceipt(trx.hash);
                    const logs = receipt.logs.filter(log => log?.topics[0] == '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822');
                    const buyLogs = _.filter(receipt?.logs, obj =>
                      obj.address == decoded?.path[1] &&
                      obj.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' &&
                      ethers.utils.defaultAbiCoder.decode(["address"], obj.topics[1]) == pairAddress &&
                      ethers.utils.defaultAbiCoder.decode(["address"], obj.topics[2]) == decoded?.to
                    );

                    const lastSObject = _.last(logs);
                    const lastBObject = _.last(buyLogs);
                    let taxValue = 0;
                    try {
                      if (trx?.type == 'SELL') {


                        const filteredArray = _.filter(receipt?.logs, obj =>
                          obj.address == decoded?.path[0] &&
                          obj.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' &&
                          ethers.utils.defaultAbiCoder.decode(["address"], obj.topics[1]) == decoded?.to &&
                          ethers.utils.defaultAbiCoder.decode(["address"], obj.topics[2]) != pairAddress
                        );

                        if (filteredArray.length > 0) {
                          let tax = transferAbi.parseLog(filteredArray[0]);
                          taxValue = tax.args.value.toString() / 10 ** outDecimal
                          trx.taxValue = tax.args.value.toString() / 10 ** outDecimal || 'no'
                        }


                      }


                    } catch (error) {
                      // console.log("factoryv errorrr", error)
                    }
                    let decodedLog = logIface.parseLog(lastSObject);

                    if (trx?.type == 'SELL') {
                      trx.buyAmount = ethers.BigNumber.from(decodedLog?.args?.amount0In?._hex).toString() != '0' ? ethers.BigNumber.from(decodedLog?.args?.amount0In?._hex).toString() / 10 ** outDecimal + taxValue : ethers.BigNumber.from(decodedLog?.args?.amount1In?._hex).toString() / 10 ** outDecimal + taxValue;
                      trx.sellAmount = ethers.BigNumber.from(decodedLog?.args?.amount1Out?._hex).toString() != '0' ? ethers.BigNumber.from(decodedLog?.args?.amount1Out?._hex).toString() / 10 ** inDecimal : ethers.BigNumber.from(decodedLog?.args?.amount0Out?._hex).toString() / 10 ** inDecimal;

                    }
                    if (trx?.type == 'BUY') {


                      let buyTransfer = buyLogIface.parseLog(lastBObject);
                      trx.buyAmount = ethers.BigNumber.from(decodedLog?.args?.amount0Out?._hex).toString() == '0' ? ethers.BigNumber.from(decodedLog?.args?.amount0In?._hex).toString() / 10 ** outDecimal : ethers.BigNumber.from(decodedLog?.args?.amount1Out?._hex).toString() == '0' ? ethers.BigNumber.from(decodedLog?.args?.amount1In?._hex).toString() / 10 ** outDecimal : "";
                      trx.sellAmount = ethers.BigNumber.from(buyTransfer?.args?.value?._hex).toString() ? ethers.BigNumber.from(buyTransfer?.args?.value?._hex).toString() / 10 ** inDecimal : "nill";

                    }
                  } catch (error) {
                    console.log("trx logs get and decode", trx.hash, error)

                    throw error

                  }


                  trx.inToken = await inTokenContract.symbol() || '';
                  const transactionFee = parseInt(trx?.gasPrice) * parseInt(trx?.gasUsed);
                  trx.fee = transactionFee / 10 ** 18
                }

                //if dex buy sell V3 universal router  trx
                else if ((trx?.to == '0xef1c6e67703c7bd7107eed8303fbe6ec2554bf6b'  || trx?.to == '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad') && trx.functionName != '') {
                  let V3_SWAP_EXACT_IN = "0x00";
                  let V3_SWAP_EXACT_OUT = "0x01";
                  let V2_SWAP_EXACT_IN = "0x08";
                  let V2_SWAP_EXACT_OUT = "0x09";
                  let outDecimal = 18;
                  let inDecimal = 18;
                  let taxValue = 0;


                  console.log("v3333")
                  let v3iface = new ethers.utils.Interface(["function execute(bytes commands,bytes[] inputs,uint256 deadline)"]);
                  let decoded = v3iface.decodeFunctionData(
                    'execute',
                    trx?.input
                  );
                  const splitCommands = decoded?.commands.match(/.{1,2}/g);
                  for (let i = 1; i < splitCommands.length; i++) {
                    try {
                      if (`${splitCommands[0]}${splitCommands[i]}` == V3_SWAP_EXACT_IN || `${splitCommands[0]}${splitCommands[i]}` == V3_SWAP_EXACT_OUT) {

                        trx.timestamp = moment.unix(trx.timeStamp).utc().format(
                          "YYYY-MM-DD hh:mm:ss"
                        );
                        let decodedParams = {};
                        try {
                          //check V3 In/Out
                          if (`${splitCommands[0]}${splitCommands[i]}` == V3_SWAP_EXACT_IN) {
                            console.log("V3_SWAP_EXACT_IN", trx.hash)

                            decodedParams = ethers.utils.defaultAbiCoder.decode(['address recipient', 'uint256 amountIn', 'uint256 amountOutMin', 'bytes memory path', 'bool payerIsUser'], decoded?.inputs[i - 1]);
                          } else {
                            console.log("V3_SWAP_EXACT_OUT", trx.hash)

                            decodedParams = ethers.utils.defaultAbiCoder.decode(['address recipient', 'uint256 amountOut', 'uint256 amountInMax', 'bytes memory path', 'bool payerIsUser'], decoded?.inputs[i - 1]);
                          }
                          let to = (decodedParams?.recipient == 0x0000000000000000000000000000000000000001) || (decodedParams?.recipient == 0x0000000000000000000000000000000000000002) ? trx?.from : decodedParams?.recipient

                          const startSlice = _.slice(decodedParams?.path, 0, 42);
                          const feeSlice = _.slice(decodedParams?.path, 42, 48);
                          const endSlice = _.slice(decodedParams?.path, 48, 88);


                          const path0 = startSlice.join('');
                          const feefromPath = feeSlice.join('');
                          const path1 = `0x${endSlice.join('')}`;

                          let outTokenContract = new ethers.Contract(
                            path0,
                            abi,
                            provider
                          );

                          let inTokenContract = new ethers.Contract(path1, abi, provider);

                          outDecimal = await outTokenContract.decimals();
                          inDecimal = await inTokenContract.decimals();
                          trx.outToken = await outTokenContract.symbol() || '';

                          trx.inToken = await inTokenContract.symbol() || '';

                          if (_.includes(['WETH', 'USDT', 'USDC'], trx?.outToken)) {
                            trx.type = 'BUY'
                          } else {
                            trx.type = 'SELL'
                          }
                          const transactionFee = parseInt(trx?.gasPrice) * parseInt(trx?.gasUsed);
                          trx.fee = transactionFee / 10 ** 18

                          try {
                            const pairAddress = await factoryCntractV3.getPool(path0, path1, ethers.BigNumber.from(`0x${feefromPath}`).toNumber());
                            const receipt = await provider.getTransactionReceipt(trx.hash);
                            const logs = receipt.logs.filter(log => log?.topics[0] == '0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67');
                            const buyLogs = _.filter(receipt?.logs, obj =>
                              obj.address.toLowerCase() == `${path1.toLowerCase()}`
                              &&
                              obj.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
                              &&
                              ethers.utils.defaultAbiCoder.decode(["address"], obj.topics[1])[0].toLowerCase() == pairAddress.toLowerCase()
                              &&
                              ethers.utils.defaultAbiCoder.decode(["address"], obj.topics[2])[0].toLowerCase() == to.toLowerCase()
                            );

                            const lastSObject = _.last(logs);
                            const lastBObject = _.last(buyLogs);
                            if (trx?.type == 'SELL') {


                              const filteredArray = _.filter(receipt?.logs, obj =>
                                obj.address == path0 &&
                                obj.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' &&
                                ethers.utils.defaultAbiCoder.decode(["address"], obj.topics[1])[0].toLowerCase() == to &&
                                ethers.utils.defaultAbiCoder.decode(["address"], obj.topics[2]) != pairAddress
                              );

                              if (filteredArray.length > 0) {
                                let tax = transferAbi.parseLog(filteredArray[0]);
                                taxValue = tax.args.value.toString() / 10 ** outDecimal
                                trx.taxValue = tax.args.value.toString() / 10 ** outDecimal || 'no'
                              }


                            }
                            let decodedLog = logIfaceV3.parseLog(lastSObject);
                            if (trx?.type == 'SELL') {
                              // + out - in
                              trx.buyAmount = ethers.BigNumber.from(decodedLog?.args?.amount0?._hex).toString() > '0' ? ethers.BigNumber.from(decodedLog?.args?.amount0?._hex).toString() / 10 ** outDecimal + taxValue : ethers.BigNumber.from(decodedLog?.args?.amount1?._hex).toString() / 10 ** outDecimal + taxValue || 0;
                              trx.sellAmount = ethers.BigNumber.from(decodedLog?.args?.amount0?._hex).toString() > '0' ? ethers.BigNumber.from(decodedLog?.args?.amount1?._hex).abs().toString() / 10 ** inDecimal : ethers.BigNumber.from(decodedLog?.args?.amount0?._hex).abs().toString() / 10 ** inDecimal || 0;

                            }
                            if (trx?.type == 'BUY') {
                              let buyTransfer = buyLogIface.parseLog(lastBObject);

                              trx.buyAmount = ethers.BigNumber.from(decodedLog?.args?.amount0?._hex).toString() < '0' ? ethers.BigNumber.from(decodedLog?.args?.amount1?._hex).toString() / 10 ** outDecimal : ethers.BigNumber.from(decodedLog?.args?.amount0?._hex).toString() / 10 ** outDecimal || 0;
                              trx.sellAmount = ethers.BigNumber.from(buyTransfer?.args?.value?._hex).toString() ? ethers.BigNumber.from(buyTransfer?.args?.value?._hex).toString() / 10 ** inDecimal : "nill" || 0;
                            }
                          } catch (error) {
                            console.log("Error V3_SWAP_EXACT_IN logs/pool", error)
                          }

                        } catch (error) {
                          console.log("Error V3_SWAP_EXACT_IN", error)
                        }





                      }
                      else if (`${splitCommands[0]}${splitCommands[i]}` == V2_SWAP_EXACT_IN || `${splitCommands[0]}${splitCommands[i]}` == V2_SWAP_EXACT_OUT) {
                        console.log("V2_SWAP_EXACT_IN", trx.hash)


                        trx.timestamp = moment.unix(trx.timeStamp).utc().format(
                          "YYYY-MM-DD hh:mm:ss"
                        );

                        try {
                          let decodedParams = {};

                          if (`${splitCommands[0]}${splitCommands[i]}` == V2_SWAP_EXACT_IN) {
                            console.log("V2_SWAP_EXACT_IN", trx.hash)

                            decodedParams = ethers.utils.defaultAbiCoder.decode(['address recipient', 'uint256 amountIn', 'uint256 amountOutMin', 'address[] memory path', 'bool payerIsUser'], decoded?.inputs[i - 1]);

                          } else {
                            console.log("V2_SWAP_EXACT_OUT", trx.hash)

                            decodedParams = ethers.utils.defaultAbiCoder.decode(['address recipient', 'uint256 amountOut', 'uint256 amountInMax', 'address[] memory path', 'bool payerIsUser'], decoded?.inputs[i - 1]);
                          }
                          let to = (decodedParams?.recipient == 0x0000000000000000000000000000000000000001) || (decodedParams?.recipient == 0x0000000000000000000000000000000000000002) ? trx?.from : decodedParams?.recipient
                          let outTokenContract = new ethers.Contract(
                            decodedParams?.path[0],
                            abi,
                            provider
                          );
                          let inTokenContract = new ethers.Contract(decodedParams?.path[1], abi, provider);

                          outDecimal = await outTokenContract.decimals();
                          inDecimal = await inTokenContract.decimals();
                          trx.outToken = await outTokenContract.symbol() || '';

                          trx.inToken = await inTokenContract.symbol() || '';

                          if (_.includes(['WETH', 'USDT', 'USDC'], trx?.outToken)) {
                            trx.type = 'BUY'
                          } else {
                            trx.type = 'SELL'
                          }

                          try {
                            const pairAddress = await factoryCntract.getPair(decodedParams?.path[0], decodedParams?.path[1]);

                            const receipt = await provider.getTransactionReceipt(trx.hash);
                            const logs = receipt.logs.filter(log => log?.topics[0] == '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822');
                            const buyLogs = _.filter(receipt?.logs, obj =>
                              obj.address == decodedParams?.path[1] &&
                              obj.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' &&
                              ethers.utils.defaultAbiCoder.decode(["address"], obj.topics[1])[0].toLowerCase() == pairAddress.toLowerCase()
                              &&
                              ethers.utils.defaultAbiCoder.decode(["address"], obj.topics[2])[0].toLowerCase() == to.toLowerCase()
                            );


                            const lastSObject = _.last(logs);
                            const lastBObject = _.last(buyLogs);
                      
                            if (trx?.type == 'SELL') {
                              const filteredArray = _.filter(receipt?.logs, obj =>
                                obj.address == decodedParams?.path[0] &&
                                obj.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' &&
                                ethers.utils.defaultAbiCoder.decode(["address"], obj.topics[1])[0].toLowerCase() == to &&
                                ethers.utils.defaultAbiCoder.decode(["address"], obj.topics[2]) != pairAddress
                              );

                              if (filteredArray.length > 0) {
                                let tax = transferAbi.parseLog(filteredArray[0]);
                                console.log("tax", tax)
                                taxValue = tax.args.value.toString() / 10 ** outDecimal
                                trx.taxValue = tax.args.value.toString() / 10 ** outDecimal || 'no'
                              }


                            }
                            let decodedLog = logIface.parseLog(lastSObject);
                            if (trx?.type == 'SELL') {
                              trx.buyAmount = ethers.BigNumber.from(decodedLog?.args?.amount0In?._hex).toString() != '0' ? ethers.BigNumber.from(decodedLog?.args?.amount0In?._hex).toString() / 10 ** outDecimal + taxValue : ethers.BigNumber.from(decodedLog?.args?.amount1In?._hex).toString() / 10 ** outDecimal + taxValue;
                              trx.sellAmount = ethers.BigNumber.from(decodedLog?.args?.amount1Out?._hex).toString() != '0' ? ethers.BigNumber.from(decodedLog?.args?.amount1Out?._hex).toString() / 10 ** inDecimal : ethers.BigNumber.from(decodedLog?.args?.amount0Out?._hex).toString() / 10 ** inDecimal;

                            }
                            if (trx?.type == 'BUY') {
                              let buyTransfer = buyLogIface.parseLog(lastBObject);
                              trx.buyAmount = ethers.BigNumber.from(decodedLog?.args?.amount0Out?._hex).toString() == '0' ? ethers.BigNumber.from(decodedLog?.args?.amount0In?._hex).toString() / 10 ** outDecimal : ethers.BigNumber.from(decodedLog?.args?.amount1Out?._hex).toString() == '0' ? ethers.BigNumber.from(decodedLog?.args?.amount1In?._hex).toString() / 10 ** outDecimal : "";
                              trx.sellAmount = ethers.BigNumber.from(buyTransfer?.args?.value?._hex).toString() ? ethers.BigNumber.from(buyTransfer?.args?.value?._hex).toString() / 10 ** inDecimal : "nill";

                            }
                            const transactionFee = parseInt(trx?.gasPrice) * parseInt(trx?.gasUsed);
                            trx.fee = transactionFee / 10 ** 18

                          } catch (error) {
                            console.log("Error V2_SWAP_EXACT_IN pair address/logs", error)
                          }
                        } catch (error) {
                          console.log("Error V2_SWAP_EXACT_IN", error)
                        }

                      } else {
                         console.log("elseee")
                      }
                    } catch (error) {
                      throw error
                    }
                  }
                }

                return trx;
              } catch (error) {
                console.error('Error decoding transaction:', trx.hash);
                return null;
              }
            }


            // trx batch processing
            const getDecodeTransactions = async (transactions) => {
              const batchSize = 80; // Number of transactions to process in each batch
              const batches = [];

              for (let i = 0; i < transactions.length; i += batchSize) {
                const batch = transactions.slice(i, i + batchSize);
                batches.push(batch);
              }

              const decodedTransactions = [];

              for (let i = 0; i < batches.length; i++) {
                const batch = batches[i];
                const promises = batch.map(transaction => decodeTransaction(transaction));


                try {
                  const decodedBatch = await Promise.all(promises);
                  decodedTransactions.push(...decodedBatch);
                } catch (error) {
                  console.error('Error decoding transactions:', error);
                  throw error;
                }


              }

              return decodedTransactions;
            }




            //decode  trx 
            let decodeTransactions = await getDecodeTransactions(getDateData);
            result.data = _.reject(decodeTransactions, obj => {
              return _.isNull(obj) || _.isEmpty(obj.functionName);
            });


          } else {
            result.error = response?.data?.message || "Not Found";
          }

        } catch (error) {
          console.log("trx list error", error);
        }
      } else {
        result.error = "Time period issue";
      }
    } catch (error) {
      console.log("block no error", error);
    }
  } catch (ex) {
    thor;
    result.ex = ex;
    console.error(ex);
  } finally {
    return result;
  }
};








const writeSheet = async (
  walletTrxSheet,
  walletProfitSheet,
  finalSheet,
  add,
  data,
  result = {}
) => {
  console.log("writeSheet");
  try {
    walletTrxSheet.columns = [
      { header: "Timestamp", key: "timestamp", width: 20 },
      { header: "Transaction Hash", key: "hash", width: 70 },
      { header: "Fee (WETH)", key: "fee", width: 20 },
      { header: "Type", key: "type", width: 15 },
      { header: "In Token", key: "inToken", width: 20 },
      { header: "In Amount", key: "sellAmount", width: 20 },
      { header: "Out Token", key: "outToken", width: 20 },
      { header: "Out Amount", key: "buyAmount", width: 20 },
      // { header: "Tax Amount", key: "taxValue", width: 20 },
      { header: "Approved Token", key: "apptoken", width: 50 },
      {
        header: "Error in case of failed transaction",
        key: "error",
        width: 50,
      }
    ];
    walletProfitSheet.columns = [
      { header: "List Tokens", key: "token", width: 20 },
      { header: "Amount in token", key: "inAmount", width: 20 },
      { header: "Amount out token", key: "outAmout", width: 20 },
      { header: "Token Remaining", key: "tokenRemaining", width: 15 },
      { header: "WETH In", key: "wethIn", width: 15 },
      { header: "WETH Out", key: "wethOut", width: 15 },
      { header: "Avg Sell Price", key: "avgSellPrice", width: 15 },
      { header: "Fee", key: "fees", width: 15 },
      { header: "Profit ETH", key: "profitEth", width: 15 },
    ];

    finalSheet.columns = [
      { header: "Wallets", key: "wallets", width: 40 },
      { header: "Expense (no Fee)", key: "expense", width: 20 },
      { header: " Expenses (with fee)", key: "expenseWithFee", width: 20 },
      { header: "Profit", key: "profit", width: 20 },
      { header: "# Buy", key: "buy", width: 20 },
      { header: "# Sell", key: "sell", width: 20 },
      { header: "# Trades", key: "trade", width: 20 },
      { header: "Expense vs. Profit", key: "expVsPro", width: 20 },
      { header: "Fee", key: "fee", width: 20 },
      { header: "# Open Trades", key: "openTrade", width: 20 },
      { header: "Approval Fee Spent", key: "approved", width: 20 },
      { header: "Fee Spent in Failed Txs", key: "failed", width: 20 },
      { header: "Failed #", key: "failedCountt", width: 20 },
    ];
    // console.log("data", data.length, data.slice(0, 10))
    let modifyData = data;



    const uniqueSell = _.uniqBy(modifyData, "outToken").map(
      (trx) => trx.outToken
    );
    const uniqueBuy = _.uniqBy(modifyData, "inToken").map((trx) => trx.inToken);

    const finalTokens = _.union(uniqueSell, uniqueBuy).filter(
      (trx) => trx !== undefined
    );

    let walletSheet2 = finalTokens.map((token) => {
      const inAmount = _.sumBy(
        _.filter(modifyData, { inToken: token }),
        "sellAmount"
      );

      const outAmout = _.sumBy(
        _.filter(modifyData, { outToken: token }),
        "buyAmount"
      );
      const wethIn = _.sumBy(
        _.filter(modifyData, { inToken: "WETH", outToken: token }),
        "sellAmount"
      );
      const wethOut =
        token === "WETH"
          ? outAmout
          : _.sumBy(
            _.filter(modifyData, { outToken: "WETH", inToken: token }),
            "buyAmount"
          );
      const inTokenFee = _.sumBy(
        _.filter(modifyData, { inToken: token }),
        "fee"
      );
      const outTokenFee = _.sumBy(
        _.filter(modifyData, { outToken: token }),
        "fee"
      );
      const fees = (inAmount == 0) ? 0 : (inTokenFee + outTokenFee);

      const avgSellPrice =
        wethIn / uniqueSell.filter((trx) => trx !== undefined).length;
      const profitEth = (inAmount == 0) ? 0 : (wethIn - wethOut - fees);
      tokenRemaining = inAmount - outAmout;

      return {
        token: token,
        inAmount,
        outAmout,
        tokenRemaining,
        wethIn,
        wethOut,
        avgSellPrice,
        fees,
        profitEth,
      };
    });

    // console.log("1 walletSheet2",walletSheet2  );

    walletSheet2 = _.reject(walletSheet2, (obj) =>
      _.includes(["WETH", "USDT", "USDC"], obj.token)
    );
    // console.log("2 walletSheet2",walletSheet2  );

    walletTrxSheet.addRows(modifyData); // Add data in walletTrxSheet
    walletProfitSheet.addRows(walletSheet2);
    let finalDataSheet = { wallets: `${add}` };
    finalDataSheet.profit = _.sumBy(walletSheet2, "profitEth") - _.sumBy(_.filter(
      modifyData,
      (trx) => trx.type === "Approved"
    ), "fee") - _.sumBy(
      _.filter(
        modifyData,
        (trx) => trx.type === "Failed"
      ),
      "fee"
    );
    finalDataSheet.fee = _.sumBy(walletSheet2, "fees");
    finalDataSheet.expense = _.sumBy(walletSheet2, "wethOut");
    finalDataSheet.expenseWithFee = finalDataSheet.expense + finalDataSheet.fee + _.sumBy(_.filter(
      modifyData,
      (trx) => trx.type === "Approved"
    ), "fee") + _.sumBy(
      _.filter(
        modifyData,
        (trx) => trx.type === "Failed"
      ),
      "fee"
    );
    finalDataSheet.buy = _.size(_.filter(modifyData, { type: "BUY" }));

    finalDataSheet.sell = _.size(_.filter(modifyData, { type: "SELL" }));
    finalDataSheet.trade = finalDataSheet.buy + finalDataSheet.sell;
    finalDataSheet.openTrade = _.size(
      _.filter(walletSheet2, (trx) => trx.tokenRemaining > 0)
    );
    finalDataSheet.expVsPro =
      finalDataSheet.profit / finalDataSheet.expenseWithFee;

    finalDataSheet.approved =
      _.sumBy(_.filter(
        modifyData,
        (trx) => trx.type === "Approved"
      ), "fee");

    finalDataSheet.failed =
      _.sumBy(
        _.filter(
          modifyData,
          (trx) => trx.type === "Failed"
        ),
        "fee"
      );
    finalDataSheet.failedCountt = _.countBy(modifyData, 'type')['Failed'] || 0;

    finalSheet.addRow(finalDataSheet);
    const columnIndex = 10;

    // Iterate through each row and set the font color of the specified column to red
    walletTrxSheet.eachRow((row, rowNumber) => {
      const cell = row.getCell(columnIndex);
      cell.font = { color: { argb: "FF0000" }, bold: true, size: 13 };
    });

    // Making first line in excel bold
    walletTrxSheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, size: 13 };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "fcd703" },
      };
    });
    i++;
    // console.log("i", i);
  } catch (ex) {
    throw ex;
    result.ex = ex;
    // console.error(e);
  } finally {
    return (result = true);
  }
};

module.exports = { sheetService, writeSheet };



