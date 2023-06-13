const moment = require("moment");
const axios = require("axios");
const API_KEY = "BQYwKrt1vg9lUe2b5Dz1tSz2rkBjQsll";
const API_URL = `https://graphql.bitquery.io/`;
var fs = require("fs");
const excelJS = require("exceljs");
const _ = require("lodash");
const { ethers, providers, Wallet } = require("ethers");
const { get } = require("http");

const sheetService = async (address, from, to, result = {}) => {
  console.log("sheetService");
  var wss = "wss://eth-mainnet.g.alchemy.com/v2/tZznxykoI5rNbgmU_rjLTik6sCsPyW8o"; // mainnet

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

  const apiKey = "M9TKZC1D3W8WPPPYD1TP41DTKITVNPMNTG";
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



  const provider = new ethers.providers.AlchemyProvider(
    1,
    "tZznxykoI5rNbgmU_rjLTik6sCsPyW8o"
  );
  var customWsProvider = new ethers.providers.WebSocketProvider(wss);


  try {
    try {

      //convert timestamp to block number
      let subtractedDate = moment(from, 'YYYY-MM-DD').subtract(1, 'day').format('YYYY-MM-DD');
      let addDate = moment(to, 'YYYY-MM-DD').add(1, 'day').format('YYYY-MM-DD');
      console.log("sub add", subtractedDate, addDate);

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
                  trx.timestamp = moment.unix(trx.timeStamp).utc().format(
                    "YYYY-MM-DD hh:mm:ss"
                  );
                  trx.error = "execution reverted"
                  const transactionFee = parseInt(trx?.gasPrice) * parseInt(trx?.gasUsed);
                  trx.fee = transactionFee / 10 ** 18;
                  trx.type = 'Failed'
                }

                //if dex buy sell V2  trx
                else if (trx?.to != '0xef1c6e67703c7bd7107eed8303fbe6ec2554bf6b' && trx.functionName != '') {
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
                    console.log("decode symbol and decimals error", error);
                    throw error

                  }

                  //trx logs get and decode
                  try {
                    const receipt = await provider.getTransactionReceipt(trx.hash);
                    // console.log("reciptt", receipt)

                    const logs = receipt.logs.filter(log => log?.topics[0] == '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822');
                    const lastObject = _.last(logs);
                    const decodedLog = logIface.parseLog(lastObject);
                    trx.buyAmount = ethers.BigNumber.from(decodedLog?.args?.amount0In?._hex).toString() != '0' ? ethers.BigNumber.from(decodedLog?.args?.amount0In?._hex).toString() / 10 ** outDecimal : ethers.BigNumber.from(decodedLog?.args?.amount1In?._hex).toString() / 10 ** outDecimal;
                    trx.sellAmount = ethers.BigNumber.from(decodedLog?.args?.amount1Out?._hex).toString() != '0' ? ethers.BigNumber.from(decodedLog?.args?.amount1Out?._hex).toString() / 10 ** inDecimal : ethers.BigNumber.from(decodedLog?.args?.amount0Out?._hex).toString() / 10 ** inDecimal;
                  } catch (error) {
                    console.log("trx logs get and decode", error,trx.hash)

                    throw error

                  }

                  if (_.includes(['WETH', 'USDT', 'USDC'], trx?.outToken)) {
                    trx.type = 'BUY'
                  } else {
                    trx.type = 'SELL'
                  }
                  trx.inToken = await inTokenContract.symbol() || '';
                  const transactionFee = parseInt(trx?.gasPrice) * parseInt(trx?.gasUsed);
                  trx.fee = transactionFee / 10 ** 18
                  trx.function = trx.functionName.substring(0, trx.functionName.indexOf("("));
                }

                return trx;
              } catch (error) {
                console.error('Error decoding transaction:', error,trx?.functionName,trx.hash);
                
                return null;
              
              }
            }


            // trx batch processing
            const getDecodeTransactions = async (transactions) => {
              const batchSize = 100; // Number of transactions to process in each batch
              const batches = [];

              for (let i = 0; i < transactions.length; i += batchSize) {
                const batch = transactions.slice(i, i + batchSize);
                batches.push(batch);
              }

              const decodedTransactions = [];

              for (let i = 0; i < batches.length; i++) {
                const batch = batches[i];
                const promises = batch.map(transaction => decodeTransaction(transaction));
                const decodedBatch = await Promise.all(promises);
                decodedTransactions.push(...decodedBatch);
              }

              return decodedTransactions;
            }




            //decode  trx 
            let decodeTransactions = await getDecodeTransactions(getDateData);
            // console.log('Decoded Transactions:', decodeTransactions.slice(0, 10));





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
      { header: "Approved Token", key: "apptoken", width: 50 },
      {
        header: "Error in case of failed transaction",
        key: "error",
        width: 50,
      },
      {
        header: "Function",
        key: "function",
        width: 50,
      },
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
      const fees = inTokenFee + outTokenFee;

      const avgSellPrice =
        wethIn / uniqueSell.filter((trx) => trx !== undefined).length;
      const profitEth = wethIn - wethOut - fees;
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

    // console.log("walletSheet2",  _.reject(walletSheet2, { token: 'WETH' }));

    walletSheet2 = _.reject(walletSheet2, (obj) =>
      _.includes(["WETH", "USDT", "USDC"], obj.token)
    );

    // { token: "WETH" }, { token: 'USDC' }, { token: 'USDT' });

    // console.log("walletSheet2",  walletSheet2);

    // console.log("modifydata", uniqueBuy, uniqueSell, finalTokens);

    // console.log("getFinalData", modifyData);
    walletTrxSheet.addRows(modifyData); // Add data in walletTrxSheet
    walletProfitSheet.addRows(walletSheet2);
    let finalDataSheet = { wallets: `Wallet-${add}` };
    finalDataSheet.profit = _.sumBy(walletSheet2, "profitEth");
    finalDataSheet.fee = _.sumBy(walletSheet2, "fees");
    finalDataSheet.expense = _.sumBy(walletSheet2, "wethOut");
    finalDataSheet.expenseWithFee = finalDataSheet.expense + finalDataSheet.fee;
    finalDataSheet.buy = _.size(_.filter(modifyData, { type: "BUY" }));

    finalDataSheet.sell = _.size(_.filter(modifyData, { type: "SELL" }));
    finalDataSheet.trade = finalDataSheet.buy + finalDataSheet.sell;
    finalDataSheet.openTrade = _.size(
      _.filter(walletSheet2, (trx) => trx.tokenRemaining > 0)
    );
    finalDataSheet.expVsPro =
      finalDataSheet.profit / finalDataSheet.expenseWithFee;

    finalDataSheet.approved =
      _.sumBy(_.filter(modifyData, { error: "", type: "Approved" }), "fee") +
      finalDataSheet.expenseWithFee;

    finalDataSheet.failed =
      _.sumBy(
        _.filter(
          modifyData,
          (trx) => trx.type === "Failed" && !_.isEmpty(trx.error)
        ),
        "fee"
      ) + finalDataSheet.expenseWithFee;

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
