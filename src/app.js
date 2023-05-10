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
const {createWorkSheet} = require("./createWorkSheet")
app.get("/walletTrx",createWorkSheet);


app.listen(3002, () => {
  console.log("Server started on port 3002");
});



// try {
//   const response = await axios.post(
//     API_URL,
//     {
//       query,
//       variables: {},
//     },
//     {
//       headers: {
//         "Content-Type": "application/json",
//         "X-API-KEY": API_KEY,
//       },
//     }
//   );

//   console.log("respose", response.data.data);

//   if (response.data.data.ethereum.dexTrades) {
//     const workbook = new excelJS.Workbook(); // Create a new workbook
//     const worksheet = workbook.addWorksheet("Transaction"); // New Worksheet
//     const path = "./files"; // Path to download excel
//     // Column for data in excel. key must match data key
//     worksheet.columns = [
//       { header: "Timestamp", key: "timestamp", width: 20 },
//       { header: "Transaction Hash", key: "hash", width: 80 },
//       { header: "Fee (WETH)", key: "fee", width: 20 },
//       { header: "Type", key: "type", width: 15 },
//       { header: "In Token", key: "buyCurrencySymbol", width: 20 },
//       { header: "In Amount", key: "buyAmount", width: 20 },
//       { header: "Out Token", key: "symbol", width: 20 },
//       { header: "Out Amount", key: "sellAmount", width: 20 },
//       { header: "Error in case of failed transaction", key: "error", width: 30
    
//     },
//     ];

//     // let counter = 1;
//     let allTrx=[...response.data.data.ethereum.dexTrades,...response.data.data.ethereum.transactions]
//     console.log("all",allTrx)
//     allTrx.forEach((trx) => {
//       console.log(trx.block.timestamp)
//       trx.timestamp = moment(trx?.block?.timestamp?.iso8601).format("YYYY-MM-DD hh:mm:ss");
//       trx.fee = trx?.transaction?.gasValue || trx.gasValue;
//       trx.symbol = trx?.sellCurrency?.symbol;
//       trx.buyCurrencySymbol = trx?.buyCurrency?.symbol;
//       trx.type = trx?.quoteCurrency?.symbol ? trx?.quoteCurrency?.symbol == "WETH" ? "SELL" : "BUY" : "";
//       trx.hash = trx?.transaction?.hash ||  trx.hash;
//       trx.error = trx?.error;
//       worksheet.addRow(trx); // Add data in worksheet
//     });


//     const columnIndex = 9; // Change 2 to the desired column index

//     // Iterate through each row and set the font color of the specified column to red
//     worksheet.eachRow((row, rowNumber) => {
//       const cell = row.getCell(columnIndex);
//       cell.font = { color: { argb: 'FF0000' },bold:true ,size: 13 };
//     });

//     // Making first line in excel bold
//     worksheet.getRow(1).eachCell((cell) => {
//       cell.font = { bold: true,size: 13 };
//       cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'fcd703' } };


//     });
//     try {
//       const data = await workbook.xlsx.writeFile(`${path}/history.xlsx`);
//       console.log("succesful");

//       const filePath = `${path}/history.xlsx`; // Replace with the actual file path
//       const fileName = "history.xlsx"; // Replace with the actual file name
//       const fileStream = fs.createReadStream(filePath);

//       res.setHeader(
//         "Content-Disposition",
//         `attachment; filename="${fileName}"`
//       );
//       res.setHeader("Content-Type", "application/octet-stream");
//       fileStream.pipe(res);

//       fileStream.on("close", () => {});
//     } catch (err) {
//       console.log(err);
//       res.send({
//         status: "error",
//         message: "Something went wrong",
//       });
//     }
//   }
//}