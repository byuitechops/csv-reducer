/********************************************************************
 * Declare Dependancies
 *********************************************************************/
const fs = require('fs');
const csvr = require('./main.js');
var fileNumber = parseInt(process.argv[2], 10);
if (process.argv[2] === undefined) {
    fileNumber = 0;
}

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

var updateCanDoField = false;
if (targetFiles[fileNumber].includes('R') || targetFiles[fileNumber].includes('W')) {
    updateCanDoField = true;
    console.log('This File Needs to have the can-do field updated.');
}

/********************************************************************
 * ec3 Outputs
 *********************************************************************/
// Selecting Main File
var targetFile = targetFiles[fileNumber];
// Setting Output File Locationss
var outputDirectory = './csv-tests/ec3/ec3-outputs/';
var outputName = targetFile;

/********************************************************************
 * Start Main Function
 *********************************************************************/
// Read Main File
var csv = fs.readFileSync(targetDirectory + targetFile, 'utf8');

// Declare Options
var csvrOptions = {
    headersOut: [
        'id', 'skill', 'level', 'difficultylevel', 'function', 'passagetext',
        'passagetexttype', 'passagetype', 'passageaudiotranscript', 'passagename', 'questionname', 'questioncando',
        'questiontext', 'questionlevelfeedback', 'questiontype', 'questionaudiotranscript',
        'answertext1', 'answertext2', 'answertext3', 'answertext4', 'answertext5', 'answertext6'
    ],
    initAcc: []
};

// Main Reducer Function
var reducer = function (acc, curr) {
    //Cycle through all headers. Depending on the header, do this:
    Object.keys(curr).forEach((header) => {
        if (header === 'questioncando' && updateCanDoField) { // if questioncando field, 
            if (curr.questioncando === 'f9') { // and file is for read or write,
                console.log('Updating f9 to f10!');
                curr.questioncando = 'f10'; // f9 to f10
            } else if (curr.questioncando === 'f10') {
                console.log('Updating f10 to f11!');
                curr.questioncando = 'f11'; // f10 to f11
            } else if (curr.questioncando === 'f11') {
                console.log('Updating f11 to f9!');
                curr.questioncando = 'f9'; // f11 to f9
            } else if (curr.questioncando === 'f31') {
                console.log('Updating f31 to f30!');
                curr.questioncando = 'f30'; // f31 to f30
            }
        } else if (header === 'questionname') { // if questionname field,
            var pqname = curr.questionname;
            var qname = pqname.split(/passage\s*\d+\s*/)[1]; // isolate the question#
            var pname = pqname.split(/question\s*\d+\s*/)[0]; // isolate the passage#
            curr.questionname = qname.replace(/\s/g, ''); // save, removing spaces
            curr.passagename = pname.replace(/\s/g, ''); // save, removing spaces
        } else if (header === 'passageaudiofilename') { // if passageaudiofilename field,
            curr.passageaudiotranscript = curr.passageaudiofilename; // change value to new header name
            delete curr.passageaudiofilename;
        } else if (header === 'questionaudiofilename') { // if passageaudiofilename field,
            curr.questionaudiotranscript = curr.questionaudiofilename; // change value to new header name
            delete curr.questionaudiofilename;
        } else if (header === 'passagetext') { // if passagetext field,
            curr.passagetext = curr.passagetext.replace(/<h1>Instructions<\/h1>[\S\s]*?(<h2>Warm-up<\/h2>)/i, /$1/);
            curr.passagetext = curr.passagetext.replace(/<h2>Warm-up<\/h2>[\S\s]*?(<p><strong>|<h2>Passage<\/h2>)/i, '$1');
        } else if (header === true) {
            console.log();
        }
    });
    acc.push(curr);
    return acc;
};

// ModifiedCSV Class Magic
var newcsv = csvr(csv, csvrOptions, reducer);
var csvOutput = newcsv.getFormattedCSV();

// console.log(JSON.stringify(newcsv.getReducedCSV(), null, 4));

// Output File
var outputLocation = outputDirectory + Date.now() + '_' + outputName;
fs.writeFile(outputLocation, csvOutput, function (err) {
    if (err) {
        console.error(err);
    } else {
        console.log('Output file to: ' + outputLocation);
    }
});