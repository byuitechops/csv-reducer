/********************************************************************
 * Declare Dependancies
*********************************************************************/
const fs =  require('fs');
const csvr = require('./main.js');

/********************************************************************
 * Test Files
*********************************************************************/
const dummyTarget = './csv-tests/countriesDummyData.csv';
const bomRemoval = './csv-tests/bom.txt';

/********************************************************************
 * ec3 Test Files
*********************************************************************/
const targetDirectory = './csv-tests/ec3/';
const targetFiles = [
    'FP_L1_DE_T11_POC4_V1_CSS.csv',
    'FP_R1_NA_T8_POC4_V1_CSS.csv',
    'FP_S1_NA_T9_POC4_V1_CSS.csv',
    'FP_W1_NE_T5_POC4_V1_CSS.csv'
];

/********************************************************************
 * ec3 Outputs
 *********************************************************************/
var outputLocation = './csv-tests/ec3/ec3-outputs/';
var outputName = targetFile;

/********************************************************************
 * Start Main Function
 *********************************************************************/
//Selecting Main File
var targetFile = targetFiles[0];
// Read Main File
var csv = fs.readFileSync(targetDirectory + targetFile, 'utf8');

// Declare Options
csvrOptions = {
    headersOut:[
        'id','skill','level','difficultylevel','function','passagetext',
        'passagetexttype','passagetype','passageaudiotranscript','passagename','questionname','questioncando',
        'questiontext','questionlevelfeedback','questiontype','questionaudiotranscript',
        'answertext1','answertext2','answertext3','answertext4','answertext5','answertext6'
    ],
    initAcc:[]
};

// Main Reducer Function
reducer = function(acc, curr){
    acc.push(curr);
    return acc;
};

// ModifiedCSV Class Magic
var newcsv = csvr(csv, csvrOptions, reducer);
var csvOutput = newcsv.getFormattedCSV();


// Output File
fs.writeFile(outputLocation + outputName, csvOutput, function(err){
    if (err) {
        console.error(err);
    } else {
        console.log('Output file to: ' + outputLocation + outputName);
    }
});





