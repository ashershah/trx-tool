const moment = require("moment");
const axios = require("axios");
const API_KEY = "BQYwKrt1vg9lUe2b5Dz1tSz2rkBjQsll";
const API_URL = `https://graphql.bitquery.io/`;
var fs = require("fs");
const excelJS = require("exceljs");
const {sheetService,writeSheet} = require("./sheetService")

const createWorkSheet = async (req, res, next) => {
  const { address, from, to } = req.query;
  console.log("in create worksheet",address)
  const workbook = new excelJS.Workbook(); // Create a new workbook
  const path = "./files"; // Path to download excel
  const finalSheet = workbook.addWorksheet('final-result');

  try {

    for (let add of address) {
      console.log("aa",add)
    const result = await sheetService( add, from, to );
    // console.log("result",result.data)


    if (result.data) {
      const walletTrxSheet = workbook.addWorksheet(`wallet-${add}`); 
      const walletProfitSheet = workbook.addWorksheet(`wallet-Token-${add}`);

      const res = await writeSheet( walletTrxSheet,walletProfitSheet,finalSheet,add,result.data );
      console.log("result of write sheet",res)

      try {

        await workbook.xlsx.writeFile(`${path}/history.xlsx`);
         console.log("succesful");
   
         // fileStream.on("close", () => {});
       } catch (err) {
        console.log(err)
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