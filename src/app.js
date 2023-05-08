const express = require("express");
const app = express();
const Moralis = require("moralis").default;
const moment = require("moment");
const excelJS = require("exceljs");

const serverless = require('serverless-http')
const { ethers, providers, Wallet } = require("ethers");
const axios = require("axios");
var fs = require("fs");
const API_KEY = "BQYwKrt1vg9lUe2b5Dz1tSz2rkBjQsll";
const API_URL = `https://graphql.bitquery.io/`;
app.get("/walletTrx", async (req, res) => {
  const { address, from, to } = req.query;
  console.log("add", address);
  const query = `
  {
    ethereum(network: ethereum) {
      dexTrades(
        options: {desc: "block.height"}
        makerOrTaker: {is: "${address}"}
        exchangeName: {in: ["Uniswap", "Uniswap v2" , "Uniswap v3"]}
        date: {since: ${from}, till: ${to}}
        ) {
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
            dayOfMonth
            year
            hour
            second
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

    console.log("respose", response.data.data);

    if (response.data.data.ethereum.dexTrades) {
      const workbook = new excelJS.Workbook(); // Create a new workbook
      const worksheet = workbook.addWorksheet("Transaction"); // New Worksheet
      const path = "./files"; // Path to download excel
      // Column for data in excel. key must match data key
      worksheet.columns = [
        { header: "Timestamp", key: "timestamp", width: 20 },
        { header: "Transaction Hash", key: "hash", width: 80 },
        { header: "Fee (WETH)", key: "fee", width: 20 },
        { header: "Type", key: "type", width: 15 },
        { header: "In Token", key: "buyCurrencySymbol", width: 20 },
        { header: "In Amount", key: "buyAmount", width: 20 },
        { header: "Out Token", key: "symbol", width: 20 },
        { header: "Out Amount", key: "sellAmount", width: 20 },
      ];

      // let counter = 1;
      response.data.data.ethereum.dexTrades.forEach((trx) => {
        trx.timestamp = moment(trx.block.timestamp).format("YYYY-MM-DD hh:mm");
        trx.fee = trx.transaction.gasValue;
        trx.symbol = trx.sellCurrency.symbol;
        trx.buyCurrencySymbol = trx.buyCurrency.symbol;
        trx.type = trx.sellCurrency.symbol = "WETH" ? "BUY" : "SELL";
        trx.hash = trx.transaction.hash;
        worksheet.addRow(trx); // Add data in worksheet
      });
      // Making first line in excel bold
      worksheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true };
      });
      try {
        const data = await workbook.xlsx.writeFile(`${path}/history.xlsx`);
        console.log("succesful");

        const filePath = `${path}/history.xlsx`; // Replace with the actual file path
        const fileName = "history.xlsx"; // Replace with the actual file name
        const fileStream = fs.createReadStream(filePath);

        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${fileName}"`
        );
        res.setHeader("Content-Type", "application/octet-stream");
        fileStream.pipe(res);

        fileStream.on("close", () => {});
      } catch (err) {
        console.log(err);
        res.send({
          status: "error",
          message: "Something went wrong",
        });
      }
    }
  } catch (e) {
    console.error(e);
  }
});

app.listen(3002, () => {
  console.log("Server started on port 3000");
});