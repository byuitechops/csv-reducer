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
            // console.log('Updating f9 to f10!');
            curr.questioncando = 'f10'; // f9 to f10
        } else if (curr.questioncando === 'f10') {
            // console.log('Updating f10 to f11!');
            curr.questioncando = 'f11'; // f10 to f11
        } else if (curr.questioncando === 'f11') {
            // console.log('Updating f11 to f9!');
            curr.questioncando = 'f9'; // f11 to f9
        } else if (curr.questioncando === 'f31') {
            // console.log('Updating f31 to f30!');
            curr.questioncando = 'f30'; // f31 to f30
        }
        curr.completedStatus.updateCanDo.status = true;
    } else if (curr.questioncando === undefined) {
        curr.completedStatus.updateCanDo.status = false;
        curr.completedStatus.updateCanDo.message = 'WARNING: questioncando field is undefined on this file!';
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
        curr.completedStatus.splitField.message = 'WARNING: questionname field does not exist on this file!';
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
            errorMessage = 'WARNING: passageaudiofilename field is undefined on this file!...Adding blank definition...';
        } else if (curr.passageaudiofilename !== undefined && curr.questionaudiofilename === undefined) {
            errorMessage = 'WARNING: questionaudiofilename field is undefined on this file!...Adding blank definition...';
        } else if (curr.passageaudiofilename === undefined && curr.questionaudiofilename === undefined) {
            errorMessage = 'WARNING: Both passageaudiofilename and questionaudiofilename field are undefined on this file!...Attempting to copy keys anyway...';
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
var replaceText = function (acc, curr, arrIndex, $) {
    var iExists = false;
    var instructions = $('h1').add('h2').add('h3').filter((index, ele) => {
        if ($(ele).text().toLowerCase().includes('in' /*ruction'*/) || $(ele).text().toLowerCase().includes('pas' /*sage'*/) && ele.name === 'h1') {
            iExists = true;
            return $(ele);
        } else if (!$(ele).text().toLowerCase().includes('pas'/*sage'*/) && !$(ele).text().toLowerCase().includes('wa'/*rm'*/)) {
            // console.log(`${acc.options.currentFile}|h1|row ${arrIndex+2}|${$(ele).text()}`);
        }
    }).first();
    var wExists = false;
    var warmup = $('h2').filter((index, ele) => {
        // console.log($(ele).text());
        if ($(ele).text().toLowerCase().includes('wa'/*rm'*/)) {
            wExists = true;
            return $(ele);
        } else if (!$(ele).text().toLowerCase().includes('pas'/*sage'*/) && !$(ele).text().toLowerCase().includes('inst'/*ruction'*/)) {
            // console.log(`${acc.options.currentFile}|h2|row ${arrIndex+2}|${$(ele).text()}`);
        }
    }).first();
    var pExists = false;
    var passage = $('h2').filter((index, ele) => {
        if ($(ele).text().toLowerCase().includes('pas'/*sage'*/)) {
            pExists = true;
            return $(ele);
        }
    }).first();

    if (iExists && wExists) {
        instructions.nextUntil(warmup).add(instructions).add(warmup.nextUntil(passage).not($('p').has('strong'))).remove('*');
        warmup.after('<h2>Definitions</h2>');
        warmup.remove();
        curr.completedStatus.passageDelete.status = true;
    } else if (iExists && pExists) {
        instructions.nextUntil(passage).add(instructions).not($('p').has('strong')).remove('*');
        $('p').has('strong').first().before('<h2>Definitions</h2>');
        curr.completedStatus.passageDelete.status = true;
        curr.completedStatus.passageDelete.message = 'NOTE: first h2 tag is <h2>Passage</h2>';
    } else if (iExists & !wExists && !pExists) {
        curr.completedStatus.passageDelete.status = true;
        curr.completedStatus.passageDelete.message = 'NOTE: Instructions exist, but warm-up and passage do not. Assumming passage is in questiontextfield';
        instructions.nextAll().add(instructions).remove('*');
    } else {
        curr.completedStatus.passageDelete.status = false;
        if (!instructions.text().toLowerCase().includes('instructions') && warmup.text().toLowerCase().includes('wa'/*rm'*/)) {
            curr.completedStatus.passageDelete.message = 'ERR0R: Couldn\'t find "<h1>Instructions</h1>!" (replaceText Function)';
        } else if (instructions.text().toLowerCase().includes('instructions') && !warmup.text().toLowerCase().includes('wa'/*rm'*/)) {
            curr.completedStatus.passageDelete.message = 'ERR0R: Couldn\'t find "<h2>Warm-up</h2>!" (replaceText Function)';
        } else {
            curr.completedStatus.passageDelete.message = 'ERR0R: Couldn\'t find both "<h1>Instructions</h1>" and "<h2>Warm-up</h2>!" (replaceText Function)';
        }
    }
};

// TODO Redo this function to use selectors like replaceText() does.
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
        if ($('h2').first().text().toLowerCase() !== 'definitions' && $('h2').last().text().toLowerCase() === 'passage') {
            curr.completedStatus.passageClass.message = 'ERR0R: Couldn\'t find "<h2>Definitions</h2>" (addClassDefinitions Function)';
        } else if ($('h2').first().text().toLowerCase() === 'definitions' && $('h2').last().text().toLowerCase() !== 'passage') {
            curr.completedStatus.passageClass.message = 'ERR0R: Couldn\'t find "<h2>Passage</h2>" (addClassDefinitions Function)';
        } else {
            curr.completedStatus.passageClass.message = 'ERR0R: Couldn\'t find both "<h2>Definitions</h2>" and "<h2>Passage</h2>" (addClassDefinitions Function)';
        }
    }
};

// TODO Redo this function to use selectors like replaceText() does.
/********************************************************************
 * Edit passagetext: addDivsAround
 *
 * USE:     in reduce function. Needs accumulator, current item, and
 *          cheerio object
 * RETURNS: void
 *********************************************************************/
var addDivsAround = function (acc, curr, $) {
    // console.dir($('h2').first().text().toLowerCase());
    if ($('h2').first().text().toLowerCase() === 'definitions') {
        $('h2').first().nextUntil('h2').add($('h2').first()).first().before($('<div class="definitions-container">'));
        $('h2').first().nextUntil('h2').add($('h2').first()).last().after($(uniqueString));
        curr.completedStatus.passageDivDefinition.status = true;
    } else {
        curr.completedStatus.passageDivDefinition.status = false;
        curr.completedStatus.passageDivDefinition.message = 'ERR0R: Couldn\'t find "<h2>Definitions</h2>" (addDivsAround Function)';
    }
    if ($('h2').last().text().toLowerCase() === 'passage'){
        $('h2').last().nextAll().add($('h2').last()).first().before($('<div class="passage-container">'));
        $('h2').last().nextAll().add($('h2').last()).last().after($(uniqueString));
        curr.completedStatus.passageDivPassage.status = true;
    } else {
        curr.completedStatus.passageDivPassage.status = false;
        curr.completedStatus.passageDivPassage.message = 'ERR0R: Couldn\'t find "<h2>Passage</h2>" (addDivsAround Function)';
    }
};

/********************************************************************
 * Edit passagetext: Fix Cheerio
 * DESCRIPTION: Cheerio thinks its so smart and needs to add stuff we
 *              don't want in both html and xml mode. This function
 *              fixes those problems by editing the string directly
 *              and putting stuff where it belongs.
 * USE: in reduce function.Needs accumulator, and current item
 * RETURNS: void
 *********************************************************************/
var fixCheerio = function (acc, curr) {
    var regexForUniqueString = new RegExp(uniqueString, 'g');
    if (curr.passagetext.includes(uniqueString)) {
        curr.passagetext = curr.passagetext.replace(regexForUniqueString, '</div>');
        curr.completedStatus.fixCheerioAddCloseDiv.status = true;
    } else {
        curr.completedStatus.fixCheerioAddCloseDiv.status = false;
        curr.completedStatus.fixCheerioAddCloseDiv.message = 'ERR0R: "<div class="definitions-container">" AND "<div class="passage-container">" HAVE NO "</div>" !!!';
    }
    if (curr.passagetext.includes('</link>')){
        curr.passagetext = curr.passagetext.replace(/<\/link>/g, '');
        curr.completedStatus.fixCheerioRemoveCloseLink.status = true;
    } else {
        curr.completedStatus.fixCheerioRemoveCloseLink.status = false;
        curr.completedStatus.fixCheerioRemoveCloseLink.message = 'WARNING: Couldn\'t find any </link> to remove!';
    }
};

/********************************************************************
 * Edit passagetext
 *********************************************************************/
var editPassageText = function (acc, curr, arrIndex) {
    try {
        var $ = cheerio.load(curr.passagetext, {xmlMode: true}); // Declare Cheerio Object
        replaceText(acc, curr, arrIndex, $); // "Passage Content to Delete" Section
        addClassDefinitions(acc, curr, $); // "Adding Class Definitions"
        addDivsAround(acc, curr, $); // "Add Divs" Section
        curr.passagetext = $.html();
        fixCheerio(acc, curr);
        curr.completedStatus.cheerioCanReadPassage.status = true;
    } catch (err) {
        errorBody += acc.options.currentFile + '\n' + err;
        curr.completedStatus.cheerioCanReadPassage.status = false;
        curr.completedStatus.cheerioCanReadPassage.message = 'FATAL ERR0R: Cheerio was unable to edit the passagetext\'s HTML (Did it have any?)!';
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
    // TODO Add Change-Difficulty-Level Function Here
    editPassageText(acc, curr, i);
    curr.everyTaskSuccessful = Object.keys(curr.completedStatus).every(function(task){
        return curr.completedStatus[task].status;
    });
    // curr.thisFileNameIs = acc.options.currentFile;
    acc.push(curr);
    acc.options.counter++;
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
    // Override completedStatus of reducedCSV to filter which items make it onto the error log. (Any Non-Commented Lines Will effect every row on every file).
    reducedCSV.forEach(function (row) {
        try{row.completedStatus.updateCanDo.status = true;}catch(e){}               // Set Any Field to True to Ignore it in the Error Log, and vice versa.
        try{row.completedStatus.splitField.status = true;}catch(e){}                // Set Any Field to True to Ignore it in the Error Log, and vice versa.
        try{row.completedStatus.keyRename.status = true;}catch(e){}                 // Set Any Field to True to Ignore it in the Error Log, and vice versa.
        try{row.completedStatus.cheerioCanReadPassage.status = true;}catch(e){}     // Set Any Field to True to Ignore it in the Error Log, and vice versa.
        // try{row.completedStatus.passageDelete.status = true;}catch(e){}             // Set Any Field to True to Ignore it in the Error Log, and vice versa.
        try{row.completedStatus.passageClass.status = true;}catch(e){}              // Set Any Field to True to Ignore it in the Error Log, and vice versa.
        try{row.completedStatus.passageDivDefinition.status = true;}catch(e){}      // Set Any Field to True to Ignore it in the Error Log, and vice versa.
        try{row.completedStatus.passageDivPassage.status = true;}catch(e){}         // Set Any Field to True to Ignore it in the Error Log, and vice versa.
        try{row.completedStatus.fixCheerioAddCloseDiv.status = true;}catch(e){}     // Set Any Field to True to Ignore it in the Error Log, and vice versa.
        try{row.completedStatus.fixCheerioRemoveCloseLink.status = true;}catch(e){} // Set Any Field to True to Ignore it in the Error Log, and vice versa.
        row.everyTaskSuccessful = Object.keys(row.completedStatus).every(function (task) {return row.completedStatus[task].status;});
        // row.everyTaskSuccessful = true; 
    });
    allPassed = everyRowPassed(reducedCSV);
    // allPassed = true; // Setting this to true will effectively ignore adding anything FOR ALL FILES to the error log.
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
                            errorBody += ('At Row ' + (rowIndex+2).toString().padStart(2, '0') + ', task: "' + task).padEnd(45, ' ') + '": ' + row.completedStatus[task].message + '\n' + row.passagetext + '\n\t';
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
    const targetFiles = getTargetFiles(targetDirectory); // Get Array of Files to Cycle Through
    // const targetFiles = ['FP_L1_DE_T10_POC4_V1_CSS.csv', 'FP_R1_DE_T8_POC4_V1_CSS.csv', 'FP_S1_AS_T11_POC4_V1_CSS.csv', 'FP_W1_AS_T10_POC4_V1_CSS.csv'];
    // const targetFiles = ['FP_L1_DE_T11_POC4_V1_CSS.csv','FP_R1_NA_T8_POC4_V1_CSS.csv','FP_S1_NA_T9_POC4_V1_CSS.csv','FP_W1_NE_T5_POC4_V1_CSS.csv']; // for testing
    var csvrOptions = { // Set Options:
        headersOut: [
            'id', 'skill', 'level', 'difficultylevel', 'function', 'passagetext',
            'passagetexttype', 'passagetype', 'passageaudiotranscript', 'passagename',
            'questionname', 'questioncando', 'questiontext', 'questionlevelfeedback',
            'questiontype', 'questionaudiotranscript', 'answertext1', 'answertext2',
            'answertext3', 'answertext4', 'answertext5', 'answertext6'
        ],
        initAcc: [],
        updateCanDoField: false,
    };
    // cycle through each file
    var readEditWrite = function (file, callback) {
        csvrOptions.currentFile = file;
        csvrOptions.updateCanDoField = shouldUpdateCando(file); // update option's updateCanDoField variable
        var csv = fs.readFileSync(targetDirectory + file, 'utf8'); // Read-In File
        var outputtedCSV = csvr(csv, csvrOptions, reducer); // Send it through reducer
        var reducedCSV = outputtedCSV.getReducedCSV(); // get reduced, unformatted csv
        var csvOutput = outputtedCSV.getFormattedCSV(); // get reduced, formatted csv
        var allPassed = everyRowPassed(reducedCSV); // Find out if a file passed every test
        appendErrorLog(reducedCSV, allPassed); // Write Errors from each row to error log
        if (allPassed) outputDirectory = od_noErrors; // Determine whether file-output should go to >>
        else outputDirectory = od_foundErrors;        // error or no-error folder.
        outputDirectory = od_noErrors; // Uncomment this line if you want all files to go to the same place
        // TODO Create a Function that will Take Each File Name and Change it to the new Naming Format.
        // writeFile(outputDirectory, file, csvOutput); // Write the File
        var outputLocation = outputDirectory + Date.now() + '_' + file;
        // console.log('Output file to: ' + outputLocation);
        callback(null);
    };
    // This is where the cycling really happens:
    asynclib.each(targetFiles, readEditWrite, function (err) {
        if (err) console.error(err);
        else {
            errorDocument += errorHeader + errorBody;
            writeFile(od_foundErrors, '_errorLog.txt', errorDocument); // Write Error-Log Document
        }
    });
    // DONE
}

main();