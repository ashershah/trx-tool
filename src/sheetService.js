const moment = require("moment");
const axios = require("axios");
const API_KEY = "BQYwKrt1vg9lUe2b5Dz1tSz2rkBjQsll";
const API_URL = `https://graphql.bitquery.io/`;
var fs = require("fs");
const excelJS = require("exceljs");
const _ = require('lodash')

const sheetService = async (address, from, to, result = {}) => {
  console.log("sheet Service");
  const query = `
  {
    ethereum(network: ethereum) {
      dexTrades(
        options: {desc: "block.height"}
        exchangeName: {in: ["Uniswap", "Uniswap v2", "Uniswap v3"]}
        any: {txSender: {is: "${address}"}}

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

    console.log("respose", response?.data?.data?.ethereum?.dexTrade);

    if (response?.data?.data?.ethereum?.dexTrades) {
      // const uniqueData = _.uniqBy(response?.data?.data?.ethereum?.dexTrades, 'transaction.hash');

      // console.log("data",uniqueData);
      result.data = [
        // ...uniqueData,
        ...response?.data?.data?.ethereum?.dexTrades,
        ...response?.data?.data?.ethereum?.transactions,
      ];
    }
  } catch (ex) {
    thor
    result.ex = ex;
    console.error(ex);
  } finally {
    return result;
  }
};

const writeSheet = async (walletTrxSheet, walletProfitSheet,data, result = {}) => {
  console.log("write sheet");

  try {
    walletTrxSheet.columns = [
      { header: "Timestamp", key: "timestamp", width: 20 },
      { header: "Transaction Hash", key: "hash", width: 80 },
      { header: "Fee (WETH)", key: "fee", width: 20 },
      { header: "Type", key: "type", width: 15 },
      { header: "In Token", key: "inToken", width: 20 },
      { header: "In Amount", key: "buyAmount", width: 20 },
      { header: "Out Token", key: "outToken", width: 20 },
      { header: "Out Amount", key: "sellAmount", width: 20 },
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
    ];
    let modifyData=[];
    
    data?.forEach((trx) => {       
      console.log( trx?.quoteCurrency?.symbol,trx?.baseCurrency?.symbol ,trx?.quoteCurrency?.symbol == "WETH" ? "SELL" : "BUY")
      trx.timestamp = moment(trx?.block?.timestamp?.iso8601).format(
        "YYYY-MM-DD hh:mm:ss"
      );
      trx.fee = trx?.transaction?.gasValue || trx.gasValue;
      trx.outToken = trx?.baseCurrency?.symbol;
      trx.inToken = trx?.quoteCurrency?.symbol;
      trx.type = trx?.quoteCurrency?.symbol
        ? trx?.quoteCurrency?.symbol && trx?.sellCurrency?.symbol== "WETH"
          ? "SELL"
          : "BUY"
        : "";
      trx.hash = trx?.transaction?.hash || trx.hash;
      trx.error = trx?.error;
      modifyData.push(trx)
    });
    // console.log("11111modifydata",modifyData)

    const uniqueSell = _.uniqBy(modifyData, 'outToken').map(trx => trx.outToken);
    const uniqueBuy = _.uniqBy(modifyData, 'inToken').map(trx => trx.inToken);

    const finalTokens = _.union(uniqueSell, uniqueBuy).filter((trx) => trx !== undefined);
const getCsvData = finalTokens.map((token)=>{
  const inAmount = _.sumBy(_.filter(modifyData, { inToken: token }), 'buyAmount');
  const outAmout = _.sumBy(_.filter(modifyData, { outToken: token }), 'sellAmount');
  tokenRemaining = inAmount - outAmout
  return{
    token:token,
    inAmount,outAmout,tokenRemaining
  }


});

// console.log(getCsvData)
  
    console.log("modifydata",uniqueBuy,uniqueSell,finalTokens)
    walletTrxSheet.addRows(modifyData); // Add data in walletTrxSheet
    walletProfitSheet.addRows(getCsvData); // Add data in walletTrxSheet

    const columnIndex = 9;

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
  } catch (ex) {
    throw ex
    result.ex = ex;
    // console.error(e);
  } finally {
    return result=true;
  }
};

module.exports = { sheetService,writeSheet };
