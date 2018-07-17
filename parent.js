
const fs =  require('fs');
const target = './csv-tests/test-inputs/in-house/countriesDummyData.csv';
const bomRemoval = './csv-tests/test-inputs/in-house/bom.txt';
const csvr = require('./main.js');

/********************************************************************
 * START: Testing with Real CSV. :START
*********************************************************************/
var csv = fs.readFileSync(target, 'utf8');
var options = {
    verifyHeaders:['id', 'Country', 'gov', 'Religions'],
    headersOut:['id', 'Country', 'gov', 'Religions'],
    initAcc:[],
    // initAcc:{banana: 'is a fruit'},
    // initAcc:'strigy-thingy',
    // initAcc: 100,
};
var reducer = function (acc, curr) {
    Object.keys(curr).forEach(key => {
        curr[key] = curr[key].replace(/[^0-9]+/g, '');
    });
    acc.push(curr);
    return acc;
}
csvConverted = csvr(csv, options, reducer);
console.log(csvConverted.getFormattedCSV());
// csvTool = csvr();
// csvTool.setInitialCSV(csv);
// csvTool.updateParsedCSV();
// console.log(csvConverted.getObject());
/********************************************************************
 *   END: Testing with Real CSV. :END
*********************************************************************/

// /********************************************************************
//  * Getting class after giving a full constructor
// *********************************************************************/
// console.log('\nSTART FULL-CONSTRUCTOR TEST:');
// var constructed = csvr(target, {initAcc:[]}, function(acc, curr){acc.push(curr); return acc;});
// console.log(constructed.getObject());
// // console.log(constructed.reducedValue);
// console.log(constructed.getCSV());
// // console.log(constructed.newCSV);

// /********************************************************************
//  * getting a class with an empty constructor
// *********************************************************************/
// console.log('\nSTART EMPTY-CONSTRUCTOR TEST:');
// var unconstructed = csvr();
// var targetNoBOM = unconstructed.removeBOM(target);
// console.log(targetNoBOM); console.log();








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




