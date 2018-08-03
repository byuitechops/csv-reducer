/********************************************************************
 * Declare Dependancies
 *********************************************************************/
const fs = require('fs');
const csvr = require('./main.js');
const cheerio = require('cheerio');
const asynclib = require('async');
const uuidv4 = require('uuid/v4'); 
const uuidv5 = require('uuid/v5');
const applicationNS = 'EC_POC';
var errorDocument = 'The Following Errors Occurred While Parsing the EC3 CSVs On ' + Date() + '\n';
var errorHeader = '\nThe Following Files Had One or More Error:\n';
var errorBody = '\n';
var uniqueString = '<div class="addclosingdiv">heylookherethisisasentancethatwillhopefullyneverappearinanyfilefromheretotherestofforeverinanyec3courseyay</div>';
var uniqueStringForAudioTags = '<uniquetag>ReplaceAudioFileTagHere</uniquetag>';
const targetDirectory = './csv-tests/ec3/ec3-production/ec3-csvs-originals/R/'; // for production
var od_noErrors = './csv-tests/ec3/ec3-production/ec3-csvs-outputs/ec3-csvs-no-errors/'; // for production
var od_foundErrors = './csv-tests/ec3/ec3-production/ec3-csvs-outputs/ec3-csvs-found-errors/'; // for production
var counter = 0;


/********************************************************************
 * read in a list of files to 
 *********************************************************************/
var getTargetFiles = function (targetDirectory) {
    var filesInDirectory = fs.readdirSync(targetDirectory);
    var desiredFilesOnly = filesInDirectory.reduce(function (acc, curr) {
        if (curr.slice(-4) === '.csv'/*  && curr.includes('V1') */){
            acc.push(curr);
        }
        return acc;
    }, []);
    console.log(desiredFilesOnly.length);
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
 * If the ID field is blank or undefined, generate a unique id to fill
 * the blank field.
 *********************************************************************/
var checkIdField = function (acc, curr, arrIndex) {
    try {
        if (curr.id === undefined || curr.id === '' || curr.id === ' ') {
            curr.id = uuidv5(applicationNS, uuidv4());
            // console.log(`Generating New UUID --- ${acc.options.currentFile} --- ${curr.id} --- ${null}`);
            curr.completedStatus.idFieldFilled.status = true;
            curr.completedStatus.idFieldFilled.message = 'NOTE: The ID needed to be created, and was successfully!';
        } else {
            // console.log(`The  Existing  UUID --- ${acc.options.currentFile} --- ${curr.id} --- ${null}`);
            curr.completedStatus.idFieldFilled.status = true;
            curr.completedStatus.idFieldFilled.message = 'NOTE: The ID already existed!';
        }
        if (curr.id === undefined) {
            curr.completedStatus.idFieldFilled.status = false;
            curr.completedStatus.idFieldFilled.message = 'ERR0R: Unable to define the ID!';
        }
    } catch (e) {
        curr.completedStatus.idFieldFilled.status = false;
        curr.completedStatus.idFieldFilled.message = 'ERR0R: Something happnened when trying to set the ID!\n' + e;
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
 * Edit passagetext: setGlobalSelectors
 * 
 * NOTE:    
 * USE:     
 * RETURNS: 
 *********************************************************************/
var setGlobalSelectors = function (acc, curr, arrIndex, $) {
    var gs = {
        instructions: {
            exists: false,
            object: new Object(),
            set: () => {}
        },
        warmup: {
            exists: false,
            object: new Object(),
            set: () => {}
        },
        passage: {
            exists: false,
            object: new Object(),
            set: () => {}
        },
        definitions: {
            exists: false,
            object: new Object(),
            set: () => {}
        }
    };

    // Finding <h1>Instructions</h1> and exceptions
    gs.instructions.set = () => {
        gs.instructions.exists = false;
        var findInstructions = new Object();
        findInstructions = $('h1').add('h2').add('h3').filter((index, ele) => {
            if ($(ele).text().toLowerCase().includes('instruction')) {
                gs.instructions.exists = true;
                return $(ele);
            } else if ($(ele).text().toLowerCase().includes('in') && ele.name === 'h1') {
                // console.log($(ele).html()); // uncomment if you want to see the non-strict captures.
                gs.instructions.exists = true;
                return $(ele);
            } else if ($(ele).text().toLowerCase().includes('passage') && ele.name === 'h1') {
                console.log(`${acc.options.currentFile} - row ${arrIndex+2} - Has an ${ele.name} ${$(ele).text()} tag`);
            }
        }).first();
        gs.instructions.object = findInstructions;
        return findInstructions;
    };
    gs.instructions.set();
    // if (!gs.instructions.exists) {console.log(`${gs.instructions.exists} + ${counter++} + ${acc.options.currentFile} + row ${arrIndex+2}`);}
    
    // Finding <h2>Warm-up</h2> and exceptions
    gs.warmup.set = () => {
        gs.warmup.exists = false;
        var findWarmup = $('h2').filter((index, ele) => {
            if (($(ele).text().toLowerCase().includes('warm') || $(ele).text().toLowerCase().includes('wam')) && $(ele).text().toLowerCase().includes('up')) {
                gs.warmup.exists = true;
                return $(ele);
            }
        }).first();
        if (gs.warmup.exists) {
            gs.warmup.object = findWarmup;
            return findWarmup; 
        }
    };
    gs.warmup.set();
    
    // Finding <h2>Passage</h2> and exceptions
    gs.passage.set = () => {
        gs.passage.exists = false;
        var findPassage = $('h2').add('h3').filter((index, ele) => {
            if ($(ele).text() === 'Passage' && ele.name === 'h2') {
                gs.passage.exists = true;
                return $(ele);
            } else if ( ($(ele).text().toLowerCase().includes('passage') || $(ele).text().toLowerCase().includes('pasage')) && ele.name === 'h2' ) {
                $(ele).html('Passage'); // fix misspelling
                gs.passage.exists = true;
                return $(ele);
            } else if ($(ele).text().toLowerCase().includes('passage') && ele.name === 'h3') {
                // console.log(`${acc.options.currentFile} has ${ele.name} tags in one of its passage tags on row ${arrIndex+2}.`);
                $(ele).replaceWith('<h2>Passage</h2>');
                gs.passage.exists = true;
                return $(ele);
            }
        }).first();
        gs.passage.object = findPassage;
        return findPassage;  
    };
    gs.passage.set();
    

    // Finding <h2>Definitions</h2>
    gs.definitions.set = () => {
        gs.definitions.exists = false;
        var findDefinitions = $('h2').filter((index, ele) => {
            if ($(ele).text().toLowerCase().includes('definition')) {
                gs.definitions.exists = true;
                return $(ele);
            }
        }).first();
        gs.definitions.object = findDefinitions;
        return findDefinitions;
    };
    gs.definitions.set();
    

    return gs;
};

/********************************************************************
 * Edit passagetext: removeText
 * 
 * USE:     in reduce function. Needs accumulator, current item, and
 *          cheerio object
 * RETURNS: void
 *********************************************************************/
var replaceText = function (acc, curr, arrIndex, $, gs) {
    var instructions = gs.instructions.set();
    var iExists = gs.instructions.exists;
    var warmup = gs.warmup.set();
    var wExists = gs.warmup.exists;
    var passage = gs.passage.set();
    var pExists = gs.passage.exists;

    $('img').remove(); // They want all images removed. Any they want added in will be done in post-processing.

    if (iExists && wExists) {
        instructions.nextUntil(warmup).add(instructions).add(warmup.nextUntil(passage).not($('p').has('strong'))).remove('*');
        warmup.before('<h2>Definitions</h2>');
        warmup.remove();
        curr.completedStatus.passageDelete.status = true;
    } else if (iExists && pExists) {
        instructions.nextUntil(passage).add(instructions).not($('p').has('strong')).remove('*');
        $('p').has('strong').first().before('<h2>Definitions</h2>');
        curr.completedStatus.passageDelete.status = true;
        curr.completedStatus.passageDelete.message = 'NOTE: first h2 tag is <h2>Passage</h2>';
    } else if (iExists & !wExists && !pExists) {
        curr.completedStatus.passageDelete.status = false;
        curr.completedStatus.passageDelete.message = 'NOTE: Instructions exist, but Warm-up and Passage do not. Ask Ted what to do.';
        // instructions.nextAll().add(instructions).remove('*');
    } else {
        curr.completedStatus.passageDelete.status = true;
        if (!iExists && wExists) {
            curr.completedStatus.passageDelete.message = 'ERR0R: Couldn\'t find "<h1>Instructions</h1>!" (replaceText Function)';
        } else if (iExists && !wExists) {
            curr.completedStatus.passageDelete.message = 'ERR0R: Couldn\'t find "<h2>Warm-up</h2>!" (replaceText Function)';
        } else {
            curr.completedStatus.passageDelete.message = 'ERR0R: Couldn\'t find both "<h1>Instructions</h1>" and "<h2>Warm-up</h2>!" (replaceText Function)';
        }
    }
};

/********************************************************************
 * Edit passagetext: addClassDefinitions
 *
 * USE:     in reduce function. Needs accumulator, current item, and
 *          cheerio object
 * RETURNS: void
 *********************************************************************/
var addClassDefinitions = function (acc, curr, arrIndex, $, gs) {
    // Gets all the <p><strong> combinations between the first h2 tag and the next one.
    var definitions = gs.definitions.set();
    var dExists = gs.definitions.exists;
    var passage = gs.passage.set();
    var pExists = gs.passage.exists;

    if (!dExists) {
        console.log($('h2').first().text());
    }
    
    if (dExists && pExists) {
        var pstrong = definitions.nextUntil(passage).filter('p').has('strong');
        var pem = definitions.nextUntil(passage).filter('p').has('em');
        pstrong.addClass('vocab-definition');
        pem.removeClass('vocab-definition');
        pem.addClass('vocab-example');
        curr.completedStatus.passageClass.status = true;
    } else {
        curr.completedStatus.passageClass.status = false;
        if (!dExists && pExists) {
            curr.completedStatus.passageClass.message = 'ERR0R: Couldn\'t find "<h2>Definitions</h2>" (addClassDefinitions Function)';
        } else if (dExists && !pExists) {
            curr.completedStatus.passageClass.message = 'ERR0R: Couldn\'t find "<h2>Passage</h2>" (addClassDefinitions Function)';
        } else {
            curr.completedStatus.passageClass.message = 'ERR0R: Couldn\'t find both "<h2>Definitions</h2>" and "<h2>Passage</h2>" (addClassDefinitions Function)';
        }
    }
};

/********************************************************************
 * Edit passagetext: addDivsAround
 *
 * USE:     in reduce function. Needs accumulator, current item, and
 *          cheerio object
 * RETURNS: void
 *********************************************************************/
var addDivsAround = function (acc, curr, arrIndex, $, gs) {
    var definitions = gs.definitions.set();
    var dExists = gs.definitions.exists;
    var passage = gs.passage.set();
    var pExists = gs.passage.exists;

    if (dExists) {
        definitions.before($('<div class="definitions-container">'));
        definitions.nextUntil(passage).last().after($(uniqueString));
        curr.completedStatus.passageDivDefinition.status = true;
    } else {
        curr.completedStatus.passageDivDefinition.status = false;
        curr.completedStatus.passageDivDefinition.message = 'ERR0R: Couldn\'t find "<h2>Definitions</h2>" (addDivsAround Function)';
    }
    if (pExists){
        passage.before($('<div class="passage-container">'));
        passage.nextAll().last().after($(uniqueString));
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
        var gs = setGlobalSelectors(acc, curr, arrIndex, $);
        // TODO Replace all Audio Tags with uniqueStringForAudioTags Record whether a file had to have the audio tag replaced, and how many.
        // TODO And Also create a check for image tags doing likewise if there is enough time.
        replaceText(acc, curr, arrIndex, $, gs); // "Passage Content to Delete" Section
        addClassDefinitions(acc, curr, arrIndex, $, gs); // "Adding Class Definitions"
        addDivsAround(acc, curr, arrIndex, $, gs); // "Add Divs" Section
        curr.passagetext = $.html();
        fixCheerio(acc, curr);
        curr.completedStatus.cheerioCanReadPassage.status = true;
    } catch (err) {
        errorBody += `${acc.options.currentFile} ${arrIndex+2} '\n'${err}\n`;
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
        updateCanDo: {
            status: false,
            message: 'Default Message'
        },
        idFieldFilled: {
            status: false,
            message: 'Default Message'
        },
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
        idFieldIsUnique: {
            status: false,
            message: 'Default Message'
        },
        changeDifficulty: {
            status: false,
            message: 'Default Message'
        }
    };
    checkIdField(acc, curr, i);
    updateQuestionCanDo(acc, curr);
    deleteKeys(acc, curr);
    splitQuestionName(acc, curr);
    editPassageText(acc, curr, i);
    everyTaskSuccessful(acc, curr);
    // curr.thisFileNameIs = acc.options.currentFile;
    acc.push(curr);
    acc.options.counter++;
    return acc;
};

/********************************************************************
 * Checks to see if on the current row, every task was successful.
 *********************************************************************/
var everyTaskSuccessful = function (acc, curr) {
    curr.everyTaskSuccessful = Object.keys(curr.completedStatus).every(function (task) {
        return curr.completedStatus[task].status;
    });
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

// TODO This needs to check all files in the batch, not just within the same file. It needs to be reworked. Consider it being a post-process function??? Do Audio Processing First.
/********************************************************************
 * If the ID field is the same as another id, reassign it a new ID.
 *********************************************************************/
var idIsUnique = function (reducedCSV) {
    reducedCSV.forEach((item, iIndex) => {
        item.completedStatus.idFieldIsUnique.status = true;
        item.completedStatus.idFieldIsUnique.message = 'NOTE: Assuming ID is unique unless a match is found!';
        reducedCSV.((row, rIndex) => {
            if (row.Index === item.index && iIndex !== rIndex) {
                item.completedStatus.idFieldIsUnique.status = false;
                item.completedStatus.idFieldIsUnique.message = `FATAL ERR0R: This ID is a duplicate! ${item.id}. It is found on `;
            }
        });
    });
};

/********************************************************************
 * Changes Difficulty Level to either 0 or 1
 *********************************************************************/
var changeDifficultyLevel = function (reducedCSV) {
    var lowestDifficultyLevel = 1000;
    if (reducedCSV[0].difficultylevel !== undefined) {
        reducedCSV.forEach((row) => {
            if (row.difficultylevel < lowestDifficultyLevel && !isNaN(parseInt(row.difficultylevel, 10))) {
                lowestDifficultyLevel = row.difficultylevel;
            } else if (isNaN(parseInt(row.difficultylevel, 10))) {
                row.difficultylevel = 0;
                row.completedStatus.changeDifficulty.status = true;
                row.completedStatus.changeDifficulty.message = `ERR0R: difficultylevel input is not a number! NaN Error. It says: "${row.difficultylevel}"`;
            }
        });
        reducedCSV.forEach((row) => {
            if (row.difficultylevel > lowestDifficultyLevel && !isNaN(parseInt(row.difficultylevel, 10))) {
                row.completedStatus.changeDifficulty.status = true;
                row.difficultylevel = 1;
            } else if (!isNaN(parseInt(row.difficultylevel, 10))) {
                row.completedStatus.changeDifficulty.status = true;
                row.difficultylevel = 0;
            }
        });
    } else {
        reducedCSV.forEach((row) => {
            row.completedStatus.changeDifficulty.status = false;
            row.completedStatus.changeDifficulty.message = 'WARNING: difficultylevel field is undefined on this file!';
        });
    }
};

/********************************************************************
 * appendErrorLog
 *********************************************************************/
var appendErrorLog = function (reducedCSV, allPassed) {
    // Override completedStatus of reducedCSV to filter which items make it onto the error log. (Any Non-Commented Lines Will effect every row on every file).
    reducedCSV.forEach(function (row) {
        try{row.completedStatus.updateCanDo.status = true;}catch(e){}               // Set Any Field to True to Ignore it in the Error Log, and vice versa.
        // try{row.completedStatus.splitField.status = true;}catch(e){}                // Set Any Field to True to Ignore it in the Error Log, and vice versa.
        try{row.completedStatus.keyRename.status = true;}catch(e){}                 // Set Any Field to True to Ignore it in the Error Log, and vice versa.
        // try{row.completedStatus.cheerioCanReadPassage.status = true;}catch(e){}     // Set Any Field to True to Ignore it in the Error Log, and vice versa.
        // try{row.completedStatus.passageDelete.status = true;}catch(e){}             // Set Any Field to True to Ignore it in the Error Log, and vice versa.
        // try{row.completedStatus.passageClass.status = true;}catch(e){}              // Set Any Field to True to Ignore it in the Error Log, and vice versa.
        // try{row.completedStatus.passageDivDefinition.status = true;}catch(e){}      // Set Any Field to True to Ignore it in the Error Log, and vice versa.
        // try{row.completedStatus.passageDivPassage.status = true;}catch(e){}         // Set Any Field to True to Ignore it in the Error Log, and vice versa.
        // try{row.completedStatus.fixCheerioAddCloseDiv.status = true;}catch(e){}     // Set Any Field to True to Ignore it in the Error Log, and vice versa.
        // try{row.completedStatus.fixCheerioRemoveCloseLink.status = true;}catch(e){} // Set Any Field to True to Ignore it in the Error Log, and vice versa.
        // try{row.completedStatus.changeDifficulty.status = true;}catch(e){}          // Set Any Field to True to Ignore it in the Error Log, and vice versa.
        // try{row.completedStatus.idFieldFilled.status = true;}catch(e){}             // Set Any Field to True to Ignore it in the Error Log, and vice versa.
        // try{row.completedStatus.idFieldIsUnique.status = true;}catch(e){}           // Set Any Field to True to Ignore it in the Error Log, and vice versa.
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
                        errorBody += ('At Row ' + (rowIndex+2).toString().padStart(2, '0') + ', task: "' + task).padEnd(45, ' ') + '": ' + row.completedStatus[task].message +/*  '\n' + row.passagetext + */ '\n\t';
                    }
                });
            }
        });
    }
};

/********************************************************************
 * setNewFileName()
 *********************************************************************/
var setNewFileName = function (originalFileName) {
    var newFileName = originalFileName.replace(/(\w\w_\w\d_\w\w_\w\d+).*/, `${/$1/}_FA18.csv` );
    newFileName = newFileName.replace(/\//g, '');
    return newFileName;
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
            // console.log('Output file to: ' + outputLocation);
        }
    });
};

/********************************************************************
 * main
 *********************************************************************/
function main() {
    var outputDirectory = od_noErrors;
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
        // var csvOutput = outputtedCSV.getFormattedCSV(); // get reduced, formatted csv // DONT NEED THIS
        idIsUnique(reducedCSV);
        changeDifficultyLevel(reducedCSV); // Edit CSV's Difficulty Level
        var csvOutput = outputtedCSV.formatCSV(reducedCSV, csvrOptions); 
        var allPassed = everyRowPassed(reducedCSV); // Find out if a file passed every test
        var newFileName = setNewFileName(file); // renames files to new format
        appendErrorLog(reducedCSV, allPassed); // Write Errors from each row to error log
        writeFile(outputDirectory, newFileName, csvOutput); // Write the File
        callback(null);
    };
    // This is where the cycling really happens:
    asynclib.each(targetFiles, readEditWrite, function (err) {
        if (err) console.error(err);
        else {
            errorDocument += errorHeader + errorBody;
            writeFile(od_foundErrors, '__errorLog.txt', errorDocument); // Write Error-Log Document
        }
    });
    // DONE
}

main();