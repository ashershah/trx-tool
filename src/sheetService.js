const moment = require("moment");
const axios = require("axios");
const API_KEY = "BQYwKrt1vg9lUe2b5Dz1tSz2rkBjQsll";
const API_URL = `https://graphql.bitquery.io/`;
var fs = require("fs");
const excelJS = require("exceljs");
const _ = require("lodash");
const { ethers, providers, Wallet } = require("ethers");

const sheetService = async (address, from, to, result = {}) => {
  // console.log("sheet Service         // any: {txSender: {is: "${address}"},taker: {is: "${address}"}} ");
  const query = `
  {
    ethereum(network: ethereum) {
      dexTrades(
        options: {desc: "block.height"}
        exchangeName: {in: ["Uniswap", "Uniswap v2", "Uniswap v3"]}
        any: {txSender: {is: "${address}"},taker: {is: "${address}"}} 
        date: {since: ${from}, till: ${to}}

      )
     {
        transaction {
          hash
        }
        smartContract {
          address {
            address
          }
          contractType
          currency {
            name
          }
        }
        tradeIndex
        date {
          date
        }
        block {
          height
          timestamp {
            iso8601
          }
        }
        buyAmount
        buyAmountInUsd: buyAmount(in: USD)
        buyCurrency {
          symbol
          address
          tokenType
          tokenId
        }
        sellAmount
        sellAmountInUsd: sellAmount(in: USD)
        sellCurrency {
          symbol
          address
        }
        sellAmountInUsd: sellAmount(in: USD)
        tradeAmount(in: USD)
        transaction {
          gasValue
          gasPrice
          gasValue
          gas
        }
        timeInterval {
          day
          hour
          minute
          second
        }
        quoteCurrency {
          name
          symbol
          decimals
        }
        baseCurrency {
          name
          symbol
          decimals
        }
      }

      transactions(
        txSender: {is:  "${address}"}
        date: {since: ${from}, till: ${to}}
              ) {
        error
        txType
        amount
        hash
        gas
        gasPrice
        gasValue
        block {
          timestamp {
            iso8601
          }
        }
        to {
          address
        }
      }
    }
  }
`;
  try {
    const response = await axios.post(
      API_URL,
      {
        query,
        variables: {},
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": API_KEY,
        },
      }
    );

    // console.log("respose", response?.data?.data?.ethereum?.dexTrades);

    if (response?.data?.data?.ethereum?.dexTrades) {
      const uniqueData = _.filter(
        response?.data?.data?.ethereum?.dexTrades,
        (trx) =>
          (trx.sellCurrency.symbol === "WETH" &&
            trx.quoteCurrency.symbol === "WETH") ||
          (trx.baseCurrency.symbol === "WETH" &&
            trx.buyCurrency.symbol === "WETH")
      );

      const filteredTransaction =
        response?.data?.data?.ethereum?.transactions.filter(
          (obj) =>
            !uniqueData.some((item) => item.transaction.hash === obj.hash)
        );

      result.data = _.sortBy(
        [...uniqueData, ...filteredTransaction],
        [(o) => -new Date(o?.block?.timestamp?.iso8601)]
      );
    }
  } catch (ex) {
    thor;
    result.ex = ex;
    console.error(ex);
  } finally {
    return result;
  }
};
abi = ["function symbol() view returns (string)"];
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
]);

const writeSheet = async (
  walletTrxSheet,
  walletProfitSheet,
  finalSheet,
  add,
  data,
  result = {}
) => {
  console.log("ashar")
  const provider = new ethers.providers.AlchemyProvider(
    1,
    "tZznxykoI5rNbgmU_rjLTik6sCsPyW8o"
  );

  var customWsProvider = new ethers.providers.WebSocketProvider(wss);

  const getTransactionToken = async (trx,index) => {
    let symbol = "";
    let transaction = await customWsProvider.getTransaction(trx);
    // console.log("trx", transaction, transaction?.data);

    let result = [];
    let methods;
    //we will use try and catch to handle the error and decode the data of the function used to swap the token
    try {
      result = iface.decodeFunctionData(
        "swapExactETHForTokens",
        transaction.data
      );
      methods = 1;
    } catch (error) {
      try {
        result = iface.decodeFunctionData(
          "swapExactETHForTokensSupportingFeeOnTransferTokens",
          transaction.data
        );
        methods = 1;
      } catch (error) {
        try {
          result = iface.decodeFunctionData(
            "swapETHForExactTokens",
            transaction.data
          );
          methods = 2;
        } catch (error) {
          try {
            result = iface.decodeFunctionData(
              "swapExactTokensForETH",
              transaction.data
            );
            methods = 3;
          } catch (error) {
            try {
              result = iface.decodeFunctionData(
                "swapTokensForExactETH",
                transaction.data
              );
              methods = 4;
            } catch (error) {
              try {
                result = iface.decodeFunctionData(
                  "swapExactTokensForETHSupportingFeeOnTransferTokens",
                  transaction.data
                );
                methods = 3;
              } catch (error) {
                try {
                  result = iface.decodeFunctionData(
                    "swapExactTokensForTokens",
                    transaction.data
                  );
                  methods = 5;
                } catch (error) {
                  try {
                    result = iface.decodeFunctionData(
                      "swapExactTokensForTokensSupportingFeeOnTransferTokens",
                      transaction.data
                    );
                    methods = 5;
                  } catch (error) {
                    try {
                      result = iface.decodeFunctionData(
                        "swapTokensForExactTokens",
                        transaction.data
                      );
                      methods = 6;
                    } catch (error) {
                      console.log("final err : ", transaction);
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    if (result.length > 0) {
      // console.log("result after methods", result);
      let contract = "";
      // if (type == "transactions") {
      //   console.log("transaction");
        // contract = new ethers.Contract(result?.to, abi, provider);
      // } else {
        // console.log("othjerx");

        contract = new ethers.Contract(result?.path[index], abi, provider);
      // }
      symbol = await contract.symbol();
      // console.log("symmmm", symbol);
    } else {
      console.log("result not exist");
    }

    return symbol;
  };
  const getApprovedToken = async (trx) => {
console.log("trx",trx)
try{
   let  contract = new ethers.Contract(trx, abi, provider);
  //  console.log("trx",contract)
   console.log("symbollllllll",await contract.symbol())

    let symbol = await contract.symbol();

    return symbol;
}catch(err){
  console.log("error",err)
}
  };

  console.log(
    "write sheet",
    // await getTransactionToken(
    //   "0x00f64efac1ee122d3dd4e765bb2e96665dabf98890f0c52b3eddb446f0e11146",
    //   0,
    //   "transactions"
    // )
    await getApprovedToken("0x7a250d5630b4cf539739df2c5dacb4c659f2488d")
  );
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
        width: 30,
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
    let modifyData = [];

    for (let trx of data) {
      trx.timestamp = moment(trx?.block?.timestamp?.iso8601).format(
        "YYYY-MM-DD hh:mm:ss"
      );
      trx.fee = trx?.transaction?.gasValue || trx.gasValue;
      trx.outToken =
        trx?.baseCurrency?.symbol == "-"
          ? await getTransactionToken(trx?.transaction?.hash, 0)
          : trx?.baseCurrency?.symbol;
      trx.inToken =
        trx?.quoteCurrency?.symbol == "-"
          ? await getTransactionToken(trx?.transaction?.hash, 1)
          : trx?.quoteCurrency?.symbol;
      trx.type = trx?.quoteCurrency?.symbol
        ? trx?.quoteCurrency?.symbol && trx?.sellCurrency?.symbol == "WETH"
          ? "SELL"
          : "BUY"
        : "";
      trx.hash = trx?.transaction?.hash || trx.hash;
      trx.error = trx?.error;
      // console.log("ashar shah",await getApprovedToken(trx?.to?.address))
      trx.apptoken=  trx?.to?.address && (trx?.error === '') ? await getApprovedToken(trx?.to?.address) : " "
      modifyData.push(trx);
    }
    // console.log("11111modifydata", modifyData);

    const uniqueSell = _.uniqBy(modifyData, "outToken").map(
      (trx) => trx.outToken
    );
    const uniqueBuy = _.uniqBy(modifyData, "inToken").map((trx) => trx.inToken);

    const finalTokens = _.union(uniqueSell, uniqueBuy).filter(
      (trx) => trx !== undefined
    );

    const walletSheet2 = finalTokens.map((token) => {
      const inAmount = _.sumBy(
        _.filter(modifyData, { inToken: token }),
        "sellAmount"
      );

      const outAmout = _.sumBy(
        _.filter(modifyData, { outToken: token }),
        "buyAmount"
      );
      const wethIn =
        token === "WETH"
          ? inAmount
          : _.sumBy(
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

    // console.log("walletSheet2", walletSheet2);

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
    finalDataSheet.expVsPro = finalDataSheet.profit / finalDataSheet.expense;

    finalDataSheet.approved = _.sumBy(
      _.filter(modifyData, { error: "", type: "" }),
      "fee"
    );
    finalDataSheet.failed = _.sumBy(
      _.filter(modifyData, (trx) => trx.type === "" && !_.isEmpty(trx.error)),
      "fee"
    );

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
    console.log("i", i);
  } catch (ex) {
    throw ex;
    result.ex = ex;
    // console.error(e);
  } finally {
    return (result = true);
  }
};

module.exports = { sheetService, writeSheet };
