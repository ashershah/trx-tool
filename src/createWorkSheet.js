var fs = require("fs");
const excelJS = require("exceljs");
const { sheetService, writeSheet } = require("./sheetService")

const createWorkSheet = async (req, res, next) => {

  const { address, from, to, key, X } = req.query;

  const workbook = new excelJS.Workbook(); // Create a new workbook
  const path = "./files"; // Path to download excel

  //final sheet and mofified final sheet
  const finalSheet = workbook.addWorksheet('final-result');
  const mFinalSheet = workbook.addWorksheet('modify-final-result');

  try {
    for (let add of address) {

      //get data from etherscan by wallet address and time duration
      const result = await sheetService(add, from, to, key);

      if (result?.data) {

        // TXs & Tok sheet  
        const walletTrxSheet = workbook.addWorksheet(`TXs-${add.slice(-6)}`);
        const walletProfitSheet = workbook.addWorksheet(`Tok-${add.slice(-6)}`);
        const mWalletTrxSheet = workbook.addWorksheet(`modify-TXs-${add.slice(-6)}`);
        const mWalletProfitSheet = workbook.addWorksheet(`modify-Tok-${add.slice(-6)}`);

        //if data exist then map on above sheets
        const res = await writeSheet(walletTrxSheet, walletProfitSheet, finalSheet, mWalletTrxSheet, mWalletProfitSheet, mFinalSheet, add, X, result.data);
        console.log("resss", res)
        try {

          //remove empty tab in case of X=0 or X is undefined and X made no effect
          workbook.eachSheet((worksheet) => {
            const sheetName = worksheet.name;

            if ((!X || X == 0 || res) && sheetName.toLowerCase().startsWith('modify') && sheetName.endsWith(add.slice(-6))) {
              worksheet.state = 'hidden';
            }

          });

          //add X value in modify final sheet 
          if (X) {
            const finalModifyWorksheet = workbook.getWorksheet('modify-final-result');
            const newRowNumber = address.length + 3;
            const cell = finalModifyWorksheet.getCell(`A${newRowNumber}`);
            cell.value = `you have modified this sheet with ${X} value`;
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFF00' } // Yellow color
            };
            cell.font = { bold: true, size: 13 };
          }
          await workbook.xlsx.writeFile(`${path}/history.xlsx`);


          console.log("succesful");
        } catch (err) {
          console.log(err)
        }

      }
      else {
        res.send(result?.error)
      }

    }


    // Download excel sheet
    const filePath = `${path}/history.xlsx`;
    const fileName = `${from}-${to}.xlsx`;
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