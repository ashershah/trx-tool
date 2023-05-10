const moment = require("moment");
const axios = require("axios");
const API_KEY = "BQYwKrt1vg9lUe2b5Dz1tSz2rkBjQsll";
const API_URL = `https://graphql.bitquery.io/`;
var fs = require("fs");
const excelJS = require("exceljs");
const {sheetService} = require("./sheetService")

const createWorkSheet = async (req, res, next) => {
  const { address, from, to } = req.query;
  console.log("in create worksheet",address)
  const workbook = new excelJS.Workbook(); // Create a new workbook
  const path = "./files"; // Path to download excel

  try {
    for (let add of address) {
      console.log("aa",add)
    const result = await sheetService( add, from, to );
    console.log("result")


    if (result.data) {
      const worksheet = workbook.addWorksheet(`wallet-${add}`); // New Worksheet
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
        { header: "Error in case of failed transaction", key: "error", width: 30
      
      },
      ];

      result?.data?.forEach((trx) => {
        // console.log(trx.block.timestamp)
        trx.timestamp = moment(trx?.block?.timestamp?.iso8601).format("YYYY-MM-DD hh:mm:ss");
        trx.fee = trx?.transaction?.gasValue || trx.gasValue;
        trx.symbol = trx?.sellCurrency?.symbol;
        trx.buyCurrencySymbol = trx?.buyCurrency?.symbol;
        trx.type = trx?.quoteCurrency?.symbol ? trx?.quoteCurrency?.symbol == "WETH" ? "SELL" : "BUY" : "";
        trx.hash = trx?.transaction?.hash ||  trx.hash;
        trx.error = trx?.error;
        worksheet.addRow(trx); // Add data in worksheet

      });


      const columnIndex = 9; 

      // Iterate through each row and set the font color of the specified column to red
      worksheet.eachRow((row, rowNumber) => {
        const cell = row.getCell(columnIndex);
        cell.font = { color: { argb: 'FF0000' },bold:true ,size: 13 };
      });
  
      // Making first line in excel bold
      worksheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true,size: 13 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'fcd703' } };


      });

      
      try {
       await workbook.xlsx.writeFile(`${path}/history.xlsx`);
        console.log("succesful");

        // fileStream.on("close", () => {});
      } catch (err) {
        res.send({
          status: "error",
          message: "Something went wrong",
        });
      }
    }

 }

    const filePath = `${path}/history.xlsx`; // Replace with the actual file path
    const fileName = "history.xlsx"; // Replace with the actual file name
    const fileStream = fs.createReadStream(filePath); 

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName}"`
    );
    res.setHeader("Content-Type", "application/octet-stream");
    return workbook.xlsx.write(res).then(function () {
      res.status(200).send();
    });
    if (result.ex) throw result.ex;

    // if (result.hasConflict)
    //   throw createError(StatusCodes.CONFLICT, result.conflictMessage);

    // if (!result.data)
    //   throw createError(StatusCodes.NOT_FOUND, "Product not found");

    // return res.status(StatusCodes.OK).json({
    //   statusCode: StatusCodes.OK,
    //   message: "Product updated successfully",
    //   data: result.data
    // });
  } catch (ex) {
    next(ex);
  }
};


module.exports= {createWorkSheet}