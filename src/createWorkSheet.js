const moment = require("moment");
const axios = require("axios");
const API_KEY = "BQYwKrt1vg9lUe2b5Dz1tSz2rkBjQsll";
const API_URL = `https://graphql.bitquery.io/`;
var fs = require("fs");
const excelJS = require("exceljs");
const { sheetService, writeSheet } = require("./sheetService")

const createWorkSheet = async (req, res, next) => {
  const { address, from, to,key } = req.query;
  console.log("in create worksheet", address)
  const workbook = new excelJS.Workbook(); // Create a new workbook
  const path = "./files"; // Path to download excel
  const finalSheet = workbook.addWorksheet('final-result');
  try {

    for (let add of address) {
      const result = await sheetService(add, from, to, key);
      if (result?.data) {
        const walletTrxSheet = workbook.addWorksheet(`TXs-${add.slice(-6)}`);
        const walletProfitSheet = workbook.addWorksheet(`Tok-${add.slice(-6)}`);

        const res = await writeSheet(walletTrxSheet, walletProfitSheet, finalSheet, add, result.data);

        try {

          await workbook.xlsx.writeFile(`${path}/${from}-${to}.xlsx`);
          console.log("succesful");
        } catch (err) {
          console.log(err)
        }

      }
      else {
        res.send(result?.error)
      }

    }

    const filePath = `${path}/${from}-${to}.xlsx`; // Replace with the actual file path
    const fileName = `${from}-${to}.xlsx`; // Replace with the actual file name
    const fileStream = fs.createReadStream(filePath);

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName}"`
    );
    res.setHeader("Content-Type", "application/octet-stream");
    return workbook.xlsx.write(res).then(function () {
      res.status(200).send();
    });
    if (result.error) throw result.ex;
  } catch (ex) {
    next(ex);
  }
};


module.exports = { createWorkSheet }