
const fs =  require('fs');
const target = './csv-tests/countriesDummyData.csv';
const bomRemoval = './csv-tests/bom.txt';
const csvr = require('./main.js');

/********************************************************************
 * START: Testing with Real CSV. :START
*********************************************************************/
// var csv = fs.readFileSync(target, ''); // csv to test with
// var csv = fs.readFileSync(bomRemoval, ''); // bom removal to test with
// console.log(csv); // log to hand-check for BOM
// csvTool = csvr();
// let noBOMDoc = csvTool.removeBOM(csv);
// console.log(noBOMDoc);
/********************************************************************
 *   END: Testing with Real CSV. :END
*********************************************************************/

/********************************************************************
 * Getting class after giving a full constructor
*********************************************************************/
console.log('\nSTART FULL-CONSTRUCTOR TEST:');
var constructed = csvr(target, {initAcc:[]}, function(acc, curr){acc.push(curr); return acc;});
console.log(constructed.getObject());
// console.log(constructed.reducedValue);
console.log(constructed.getCSV());
// console.log(constructed.newCSV);

/********************************************************************
 * getting a class with an empty constructor
*********************************************************************/
console.log('\nSTART EMPTY-CONSTRUCTOR TEST:');
var unconstructed = csvr();
var targetNoBOM = unconstructed.removeBOM(target);
console.log(targetNoBOM); console.log();








// /********************************************************************
//  * BELOW: Experimenting and templating options parameter :BELOW
// *********************************************************************/
// var optionsStyle2 = 
// {
//     verifyHeaders:[], // Check/Verify: Do these headers exist? empty = dont check
//     headersOut:[], // Which headers should exist in the outputted csv
//     initAcc:[], // What is accumulator should be used on the reduce
//     run:
//     {
//         reduce: false,
//         // insert more options here for methods to reduce
//     }
// }
// /********************************************************************
//  * ABOVE: Experimenting and templating options parameter :ABOVE
// *********************************************************************/




