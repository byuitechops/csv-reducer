/********************************************************************
 * Declare Dependancies
 *********************************************************************/
// Core Libraries
const fs = require('fs');
const csvr = require('./main.js');
// const targetDirectory = './csv-tests/ec3/ec3-production/ec3-csvs-originals/R/'; // for production
var targetDirectory = './csv-tests/ec3/ec3-production/ec3-csvs-outputs/ec3-csvs-no-errors/'; // for production
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
const targetFiles = getTargetFiles(targetDirectory); // need this line

/********************************************************************
 * 
 *********************************************************************/
var getIDFilenameRow = function (arrayOfObjectCSVs) {
    var nameRowId = [];
    arrayOfObjectCSVs.forEach((csv, cIndex) => {
        nameRowId[cIndex] = [];
        csv.forEach((row, rIndex) => {
            nameRowId[cIndex][rIndex] = {
                name: csv.thisFilenameIs,
                row: rIndex,
                id: row.id
            };
            // console.log(nameRowId[cIndex][rIndex]);
            // console.log(`${csv.thisFilenameIs} row ${rIndex} id ${row.id}`);
        });
    });
    return nameRowId;
};


/********************************************************************
 * If the ID field is the same as another id, reassign it a new ID.
 *********************************************************************/
var idIsUnique = function (nameRowId) {
    nameRowId.filter((ifile, ifIndex) => {

    });
    return nameRowId;
};


function main() {
    var allRows = targetFiles.reduce((acc, file) => {
        var plainCSV = fs.readFileSync(targetDirectory + file, 'utf8');
        plainCSV = csvTools.removeBOM(plainCSV);
        var rows = csvTools.parseCSV(plainCSV).map((row, i) => {
            return {
                file: file,
                row: i,
                id: row.id
            };
        });
        return acc.concat(rows);
    }, []);
    var nonUniqueIds = allRows.filter((needleRow, needleI) => {
        if (needleRow.id === undefined) {return false;}
        return allRows.some((hayStackRow, hayI) => {
            return needleRow.id === hayStackRow.id && needleI !== hayI;
        });
    }).sort((a,b)=>{
        if (a.id < b.id) {
            return -1;
        } else if (a.id > b.id) {
            return 1;
        } else {
            return 0;
        }
    });

    console.log(JSON.stringify(nonUniqueIds, null, 4));
    console.log(nonUniqueIds.length);
}

main();