/********************************************************************
 * Declare Dependancies
 *********************************************************************/
const fs = require('fs');
// const path = require('path');
const csvr = require('./main.js');
const cheerio = require('cheerio');
const asynclib = require('async');
var errorDocument = 'The Following Errors Occurred While Parsing the EC3 CSVs On ' + Date() + '\n';
var errorHeader = '\nThe Following Files Had One or More Error:\n';
var errorBody = '\n';
var uniqueString = '<div class="addclosingdiv">heylookherethisisasentancethatwillhopefullyneverappearinanyfilefromheretotherestofforeverinanyec3courseyay</div>';

const targetDirectory = './csv-tests/ec3/ec3-production/ec3-csvs-originals/'; // for production
var od_noErrors = './csv-tests/ec3/ec3-production/ec3-csvs-outputs/ec3-csvs-no-errors/'; // for production
var od_foundErrors = './csv-tests/ec3/ec3-production/ec3-csvs-outputs/ec3-csvs-found-errors/'; // for production
// const targetFiles = getTargetFiles(targetDirectory);
// const targetDirectory = './csv-tests/ec3/ec3-testing/ec3-test-originals/'; // for testing
// var od_noErrors = './csv-tests/ec3/ec3-testing/ec3-test-outputs/ec3-test-csvs-no-errors/'; // for testing
// var od_foundErrors = './csv-tests/ec3/ec3-testing/ec3-test-outputs/ec3-test-csvs-found-errors/'; // for testing
// const targetFiles = ['FP_L1_DE_T11_POC4_V1_CSS.csv','FP_R1_NA_T8_POC4_V1_CSS.csv','FP_S1_NA_T9_POC4_V1_CSS.csv','FP_W1_NE_T5_POC4_V1_CSS.csv']; // for testing

/********************************************************************
 * read in a list of files to 
 *********************************************************************/
var getTargetFiles = function (targetDirectory) {
    var filesInDirectory = fs.readdirSync(targetDirectory);
    var desiredFilesOnly = filesInDirectory.reduce(function (acc, curr) {
        if (curr.slice(-4) === '.csv' && curr.includes('V1')){
            acc.push(curr);
        }
        return acc;
    }, []);
    return desiredFilesOnly;
};

/********************************************************************
 * should the questioncando field be updated?
 *********************************************************************/
var shouldUpdateCando = function (filename) {
    var lowerFilename = filename.toLowerCase();
    if (lowerFilename[3] === 'r' || lowerFilename[3] === 'w') {
        // console.log(filename + ' needs to have cando updated.');
        return true;
    } else {
        return false;
    }
};

/********************************************************************
 * Updates the Question can-do field from incorrect values.
 *********************************************************************/
var updateQuestionCanDo = function (acc, curr) {
    if (curr.questioncando !== undefined && acc.options.updateCanDoField) {
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
        curr.completedStatus.updateCanDo.status = true;
    } else if (curr.questioncando === undefined) {
        curr.completedStatus.updateCanDo.status = false;
        curr.completedStatus.updateCanDo.message = 'questioncando field is undefined on this file!';
    } else if (acc.options.updateCanDoField === false) {
        delete curr.completedStatus.updateCanDo;
    }
};

/********************************************************************
 *  splitQuestionName into questionname and passagename
 *********************************************************************/
var splitQuestionName = function (acc, curr) {
    if (curr.questionname !== undefined){
        var pqname = curr.questionname.replace(/\s/g, ''); //remove all spaces
        curr.questionname = pqname.replace(/passage\d+/i, '');
        curr.passagename = pqname.replace(/question\d+/i, '');
        curr.completedStatus.splitField.status = true;
    } else {
        curr.completedStatus.splitField.status = false;
        curr.completedStatus.splitField.message = 'questionname field does not exist on this file!';
    }
};

/********************************************************************
 * Renames then deletes some keys on the json.
 *********************************************************************/
var deleteKeys = function (acc, curr) {
    if (curr.passageaudiofilename !== undefined && curr.questionaudiofilename !== undefined) {
        curr.passageaudiotranscript = curr.passageaudiofilename;
        curr.questionaudiotranscript = curr.questionaudiofilename;
        delete curr.passageaudiofilename;
        delete curr.questionaudiofilename;
        curr.completedStatus.keyRename.status = true;
    } else {
        curr.passageaudiotranscript = curr.passageaudiofilename;
        curr.questionaudiotranscript = curr.questionaudiofilename;
        curr.completedStatus.keyRename.status = false;
        let errorMessage = '';
        if (curr.passageaudiofilename === undefined && curr.questionaudiofilename !== undefined) {
            errorMessage = 'passageaudiofilename field is undefined on this file!...Adding blank definition...';
        } else if (curr.passageaudiofilename !== undefined && curr.questionaudiofilename === undefined) {
            errorMessage = 'questionaudiofilename field is undefined on this file!...Adding blank definition...';
        } else if (curr.passageaudiofilename === undefined && curr.questionaudiofilename === undefined) {
            errorMessage = 'Both passageaudiofilename and questionaudiofilename field are undefined on this file!...Attempting to copy keys anyway...';
        }
        curr.completedStatus.keyRename.message = errorMessage;
    }
};

/********************************************************************
 * Edit passagetext: removeText
 * 
 * USE:     in reduce function. Needs accumulator, current item, and
 *          cheerio object
 * RETURNS: void
 *********************************************************************/
var replaceText = function (acc, curr, $) {
    if ($('h1').first().text().toLowerCase() === 'instructions' && $('h2').first().text().toLowerCase() === 'warm-up') {
        $('h1').first().nextUntil('h2').add($('h1').first()).add($('h2').first().nextUntil('h2').not($('p').has('strong'))).remove('*');
        $('h2').first().after('<h2>Definitions</h2>');
        $('h2').first().remove();
        curr.completedStatus.passageDelete.status = true;
    } else {
        curr.completedStatus.passageDelete.status = false;
        curr.completedStatus.passageDelete.message = 'Couldn\'t find (one or both of) <h1>Instructions</h1> or <h2>Warm-up</h2>!';
    }
};

/********************************************************************
 * Edit passagetext: addClassDefinitions
 *
 * USE:     in reduce function. Needs accumulator, current item, and
 *          cheerio object
 * RETURNS: void
 *********************************************************************/
var addClassDefinitions = function (acc, curr, $) {
    // Gets all the <p><strong> combinations between the first h2 tag and the next one.
    if ($('h2').first().text().toLowerCase() === 'definitions' && $('h2').last().text().toLowerCase() === 'passage') {
        var pstrong = $('h2').first().nextUntil('h2').filter('p').has('strong');
        var pem = $('h2').first().nextUntil('h2').filter('p').has('em');
        pstrong.addClass('vocab-definition');
        pem.removeClass('vocab-definition');
        pem.addClass('vocab-example');
        curr.completedStatus.passageClass.status = true;
    } else {
        curr.completedStatus.passageClass.status = false;
        curr.completedStatus.passageClass.message = 'Couldn\'t find (one or both of) <h2>Warm-up</h2> or <h2>Passage</h2>';
    }
    
};

/********************************************************************
 * Edit passagetext: addDivsAround
 *
 * USE:     in reduce function. Needs accumulator, current item, and
 *          cheerio object
 * RETURNS: void
 *********************************************************************/
var addDivsAround = function (acc, curr, $) {
    if ($('h2').first().text().toLowerCase() === 'definitions') {
        $('h2').first().nextUntil('h2').add($('h2').first()).first().before($('<div class="definitions-container">'));
        $('h2').first().nextUntil('h2').add($('h2').first()).last().after($(uniqueString));
        curr.completedStatus.passageDivDefinition.status = true;
    } else {
        curr.completedStatus.passageDivDefinition.status = false;
        curr.completedStatus.passageDivDefinition.message = 'Could not find <h2>Definitions</h2>';
    }
    if ($('h2').last().text().toLowerCase() === 'passage'){
        $('h2').last().nextAll().add($('h2').last()).first().before($('<div class="passage-container">'));
        $('h2').last().nextAll().add($('h2').last()).last().after($(uniqueString));
        curr.completedStatus.passageDivPassage.status = true;
    } else {
        curr.completedStatus.passageDivPassage.status = false;
        curr.completedStatus.passageDivPassage.message = 'Could not find <h2>Passage</h2>';
    }
};
/********************************************************************
 * Edit passagetext: Fix Cheerio
 * DESCRIPTION: Cheerio thinks its so smart and needs to add stuff we
 *              don't want in both html and xml mode. This function
 *              fixes those problems by editing the string directly
 *              and putting stuff where it belongs.
 * USE: in reduce function.Needs accumulator, current item, and
 *      cheerio object 
 * RETURNS: void
 *********************************************************************/
var fixCheerio = function (acc, curr) {
    var regexForUniqueString = new RegExp(uniqueString, 'g');
    if (curr.passagetext.includes(uniqueString)) {
        curr.passagetext = curr.passagetext.replace(regexForUniqueString, '</div>');
        curr.completedStatus.fixCheerioAddCloseDiv.status = true;
    } else {
        curr.completedStatus.fixCheerioAddCloseDiv.status = false;
        curr.completedStatus.fixCheerioAddCloseDiv.message = 'THIS IS IMPORTANT!!! --> "<div class="definitions-container">" AND "<div class="passage-container">" HAVE NO "</div>" !!!';
    }
    if (curr.passagetext.includes('</link>')){
        curr.passagetext = curr.passagetext.replace(/<\/link>/g, '');
        curr.completedStatus.fixCheerioRemoveCloseLink.status = true;
    } else {
        curr.completedStatus.fixCheerioRemoveCloseLink.status = false;
        curr.completedStatus.fixCheerioRemoveCloseLink.message = 'Couldn\'t find any </link> to remove!';
    }
};

/********************************************************************
 * Edit passagetext
 *********************************************************************/
var editPassageText = function (acc, curr) {
    try {
        var $ = cheerio.load(curr.passagetext, {xmlMode: true}); // Declare Cheerio Object
        replaceText(acc, curr, $); // "Passage Content to Delete" Section
        addClassDefinitions(acc, curr, $); // "Adding Class Definitions"
        addDivsAround(acc, curr, $); // "Add Divs" Section
        curr.passagetext = $.html();
        fixCheerio(acc, curr);
        curr.completedStatus.cheerioCanReadPassage.status = true;
    } catch (err) {
        errorBody += acc.options.currentFile + '\n' + err;
        curr.completedStatus.cheerioCanReadPassage.status = false;
        curr.completedStatus.cheerioCanReadPassage.message = 'FATAL!!! : Cheerio was unable to edit the passagetext\'s HTML (Did it have any?)!';
        delete curr.completedStatus.passageDelete;
        delete curr.completedStatus.passageClass;
        delete curr.completedStatus.passageDivDefinition;
        delete curr.completedStatus.passageDivPassage;
        delete curr.completedStatus.fixCheerioAddCloseDiv;
        delete curr.completedStatus.fixCheerioRemoveCloseLink;
    }
};

/********************************************************************
 * Main Reducer Function
 *********************************************************************/
var reducer = function (acc, curr, i) {
    curr.completedStatus = {
        splitField: {
            status: false,
            message: 'Default Message'
        },
        keyRename: {
            status: false,
            message: 'Default Message'
        },
        cheerioCanReadPassage: {
            status: false,
            message: 'Default Message'
        },
        passageDelete: {
            status: false,
            message: 'Default Message'
        },
        passageClass: {
            status: false,
            message: 'Default Message'
        },
        passageDivDefinition: {
            status: false,
            message: 'Default Message'
        },
        passageDivPassage: {
            status: false,
            message: 'Default Message'
        },
        fixCheerioAddCloseDiv: {
            status: false,
            message: 'Default Message'
        },
        fixCheerioRemoveCloseLink: {
            status: false,
            message: 'Default Message'
        },
        updateCanDo: {
            status: false,
            message: 'Default Message'
        }
    };
    updateQuestionCanDo(acc, curr);
    deleteKeys(acc, curr);
    splitQuestionName(acc, curr);
    editPassageText(acc, curr);
    curr.everyTaskSuccessful = Object.keys(curr.completedStatus).every(function(task){
        return curr.completedStatus[task].status;
    });
    // curr.thisFileNameIs = acc.options.currentFile;
    acc.push(curr);
    return acc;
};


/********************************************************************
 * used as a determinator for which directory the output files should
 * go into.
 *********************************************************************/
var everyRowPassed = function (reducedCSV) {
    return reducedCSV.every(function (row) {
        if (row.everyTaskSuccessful) {
            return true;
        } else {
            return false;
        }
    });
};

/********************************************************************
 * appendErrorLog
 *********************************************************************/
var appendErrorLog = function (reducedCSV, allPassed) {
    reducedCSV.forEach(function (row) {
        // row.completedStatus.splitField = true;                // Set Any Field to True to Ignore it in the Error Log, and vice versa.
        // row.completedStatus.keyRename = true;                 // Set Any Field to True to Ignore it in the Error Log, and vice versa.
        // row.completedStatus.cheerioCanReadPassage = true;     // Set Any Field to True to Ignore it in the Error Log, and vice versa.
        // row.completedStatus.passageDelete = true;             // Set Any Field to True to Ignore it in the Error Log, and vice versa.
        // row.completedStatus.passageClass = true;              // Set Any Field to True to Ignore it in the Error Log, and vice versa.
        // row.completedStatus.passageDivDefinition =true;       // Set Any Field to True to Ignore it in the Error Log, and vice versa.
        // row.completedStatus.passageDivPassage = true;         // Set Any Field to True to Ignore it in the Error Log, and vice versa.
        // row.completedStatus.fixCheerioAddCloseDiv = true;     // Set Any Field to True to Ignore it in the Error Log, and vice versa.
        // row.completedStatus.fixCheerioRemoveCloseLink = true; // Set Any Field to True to Ignore it in the Error Log, and vice versa.
        // row.completedStatus.updateCanDo = true;               // Set Any Field to True to Ignore it in the Error Log, and vice versa.
    });
    if (!allPassed) {
        errorHeader += reducedCSV.options.currentFile + '\n';
        errorBody += '\n' + reducedCSV.options.currentFile + ':\n\t';
        reducedCSV.forEach((row, rowIndex) => {
            if (!row.everyTaskSuccessful) {
                Object.keys(row.completedStatus).forEach(function (task) {
                    if (row.completedStatus[task].status === false) {
                        if (false/* row.id !== undefined */){
                            errorBody += 'At ID -- ' + row.id + ' -- '  + 'task: "' + task.padEnd(25, ' ') + '": ' + row.completedStatus[task].message + '\n\t';
                        } else if (false/* row.passagename !== undefined && row.questionname !== undefined */) {
                            errorBody += 'At ' + row.passagename + ', ' + row.questionname + ', task: "' + task.padEnd(25, ' ') + '": ' + row.completedStatus[task].message + '\n\t';
                        } else {
                            errorBody += ('At Row ' + (rowIndex+2).toString().padStart(2, '0') + ', task: "' + task).padEnd(45, ' ') + '": ' + row.completedStatus[task].message + '\n\t';
                        }
                    }
                });
            }
        });
    } else {
        true;
    }
    
};

/********************************************************************
 * async outputfile
 *********************************************************************/
var writeFile = function (outputDirectory, outputName, dataToOutput) {
    var outputLocation = outputDirectory /* + Date.now() */ + '_' + outputName;
    fs.writeFile(outputLocation, dataToOutput, function (err) {
        if (err) {
            console.error(err);
        } else {
            console.log('Output file to: ' + outputLocation);
        }
    });
};

/********************************************************************
 * main
 *********************************************************************/
function main() {
    var outputDirectory = '';
    // Get Array of Files to Cycle Through
    // const targetDirectory = './csv-tests/ec3/ec3-production/ec3-csvs-originals/'; // for production
    // var od_noErrors = './csv-tests/ec3/ec3-production/ec3-csvs-outputs/ec3-csvs-no-errors/'; // for production
    // var od_foundErrors = './csv-tests/ec3/ec3-production/ec3-csvs-outputs/ec3-csvs-found-errors/'; // for production
    const targetFiles = getTargetFiles(targetDirectory);
    // // const targetDirectory = './csv-tests/ec3/ec3-testing/ec3-test-originals/'; // for testing
    // // var od_noErrors = './csv-tests/ec3/ec3-testing/ec3-test-outputs/ec3-test-csvs-no-errors/'; // for testing
    // // var od_foundErrors = './csv-tests/ec3/ec3-testing/ec3-test-outputs/ec3-test-csvs-found-errors/'; // for testing
    // const targetFiles = ['FP_L1_DE_T11_POC4_V1_CSS.csv','FP_R1_NA_T8_POC4_V1_CSS.csv','FP_S1_NA_T9_POC4_V1_CSS.csv','FP_W1_NE_T5_POC4_V1_CSS.csv']; // for testing
    // Set Options:
    var csvrOptions = {
        headersOut: [
            'id', 'skill', 'level', 'difficultylevel', 'function', 'passagetext',
            'passagetexttype', 'passagetype', 'passageaudiotranscript', 'passagename',
            'questionname', 'questioncando', 'questiontext', 'questionlevelfeedback',
            'questiontype', 'questionaudiotranscript', 'answertext1', 'answertext2',
            'answertext3', 'answertext4', 'answertext5', 'answertext6'
        ],
        initAcc: [],
        updateCanDoField: false
    };
    // cycle through each file
    var readEditWrite = function (file, callback) {
        csvrOptions.currentFile = file;
        csvrOptions.updateCanDoField = shouldUpdateCando(file); // update option's updateCanDoField variable
        var csv = fs.readFileSync(targetDirectory + file, 'utf8'); // Read-In File
        var outputtedCSV = csvr(csv, csvrOptions, reducer); // Send it through reducer
        var reducedCSV = outputtedCSV.getReducedCSV(); // get reduced, unformatted csv
        var csvOutput = outputtedCSV.getFormattedCSV(); // get reduced, formatted csv
        var allPassed = everyRowPassed(reducedCSV);
        appendErrorLog(reducedCSV, allPassed); // Write Errors from each row to error log
        if (allPassed) outputDirectory = od_noErrors; // Determine whether file-output should go to 
        else outputDirectory = od_foundErrors;        // error or no-error folder.
        // outputDirectory = od_noErrors // Uncomment this line if you want all files to go to the same place
        // writeFile(outputDirectory, file, csvOutput);
        var outputLocation = outputDirectory + Date.now() + '_' + file;
        console.log('Output file to: ' + outputLocation);
        callback(null);
    };
    asynclib.each(targetFiles, readEditWrite, function (err) {
        if (err) console.error(err);
        else {
            errorDocument += errorHeader + errorBody;
            writeFile(od_foundErrors, '_errorLog.txt', errorDocument);
            // console.log(errorDocument); 
        }
    });
}

main();