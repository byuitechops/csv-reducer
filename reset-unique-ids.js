/********************************************************************
 * Declare Dependancies
 *********************************************************************/
// Libraries
const fs = require('fs');
const dsv = require('d3-dsv');
const csvr = require('./main.js'); 
// UUID
const uuidv4 = require('uuid/v4');
const uuidv5 = require('uuid/v5');
const applicationNS = 'EC_POC';
const targetDirectory = './csv-tests/ec3/ec3-production/ec3-csvs-originals/S/'; // for production
const outputDirectory = './csv-tests/ec3/ec3-production/ec3-csvs-outputs/ec3-csvs-no-errors/'; // for production

const csvTools = csvr();

/********************************************************************
 * read in a list of files to 
 *********************************************************************/
var getTargetFiles = function (targetDirectory) {
    var filesInDirectory = fs.readdirSync(targetDirectory);
    var desiredFilesOnly = filesInDirectory.reduce(function (acc, curr) {
        if (curr.slice(-4) === '.csv') {
            acc.push(curr);
        }
        return acc;
    }, []);
    console.log(desiredFilesOnly.length);
    return desiredFilesOnly;
};

/********************************************************************
 * async outputfile
 *********************************************************************/
var writeFile = function (outputDirectory, outputName, dataToOutput) {
    var outputLocation = outputDirectory + outputName;
    fs.writeFile(outputLocation, dataToOutput, function (err) {
        if (err) {
            console.error(err);
        } else {
            console.log('Output file to: ' + outputLocation);
        }
    });
};

/********************************************************************
 * read in a list of files to 
 *********************************************************************/
function main() {
    var targetCSVs = getTargetFiles(targetDirectory);
    targetCSVs.forEach((file) => {
        var csvString = fs.readFileSync(targetDirectory + file, 'utf8');
        csvString = csvTools.removeBOM(csvString);
        var csvObject = csvTools.parseCSV(csvString);
        var headersOut = csvObject.columns;
        if (!headersOut.includes('id')) { // if no column is an id
            headersOut.unshift('id');
        }
        var uuidedCSV = csvObject.map((row) => {
            row.id = uuidv5(applicationNS, uuidv4()); // Here is where the UUID is assigned
            return row;
        });
        var formattedCSV = dsv.csvFormat(uuidedCSV, headersOut);
        writeFile(outputDirectory, file, formattedCSV); // Write the File
    });
}

main();