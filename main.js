/********************************************************************
 * Require Dependancies Here
*********************************************************************/
const dsv = require('d3-dsv');

/********************************************************************
 * This will check for and remove the Byte-Order-Mark if it exists
 * in the given CSV document Note: BOM can be referenced by:
 * '\ufeff' in utf8, and shows up as 'ef bb bf' in buffer form
*********************************************************************/
const removeBOM = function(stringWithBOM){
    console.log('removeBOM()');
    try {
        return stringWithBOM.replace(/\ufeff/g,'');
    } catch (error) {
        console.error('OUTPUT FAILED. THE INPUT NEEDS TO BE A STRING:');
        console.error(error);
    }
}

/********************************************************************
 * This will use d3-dsv to turn the csv into a json object.
*********************************************************************/
const parseCSV = function(csvToParse){
    console.log('parseCSV()');
    return dsv.csvParse(csvToParse);
}

/********************************************************************
 * csvReducer takes the parsed csv and edits it based on the given
 * function and the options specified
*********************************************************************/
const csvReducer = function(csvToReduce, options, reducerFunction){
    console.log('csvReducer()');
    var initAcc = Object.assign([], options.initAcc); // How to copy an object 
    var reducedCSV = csvToReduce.reduce(reducerFunction, initAcc);
    reducedCSV.columns = Object.keys(reducedCSV[0]);
    return reducedCSV;
}

/********************************************************************
 * Edits the current CSV Object and removes any keys that don't match the
 * headersOut option.
 *********************************************************************/
const limitHeaders = function(csvObject, options){
    // Choose what to do here based on options
    console.log('limitHeaders()');
    reducedCSV = csvObject.reduce(function(acc, curr){
        csvObject.columns.forEach(function(column){
            var doKeepKey = [];
            options.headersOut.forEach(function(header) {
                if (column === header) {
                    doKeepKey.push(true);
                } else {

                }
            });
            if (doKeepKey.includes(true)){
                
            } else {
                delete curr[column];
            }
        });
        acc.push(curr);
        return acc;
    },[]);
    // console.log(reducedCSV)
    return reducedCSV;
}

/********************************************************************
 * formatCSV() takes the current CSV Object and formats it into a 
 * CSV String.
*********************************************************************/
const formatCSV = function(csvObject, options){
    console.log('formatCSV()');
    return dsv.csvFormat(csvObject, options.headersOut);
}


/********************************************************************
 * 
 *********************************************************************/
const optionsChecker = function(options){
    // Choose what to do here based on options
    console.log('optionsChecker()');
    // go through each option and set default values to anything not filled out 
    // and return an error notifying the user of anything not set to a usable type.
    return options;
}

/********************************************************************
 * 
*********************************************************************/
class ModifiedCSV {
    constructor(initialCSV, options, reducerFunction){
        if (initialCSV !== undefined) {
            this.options = this.optionsChecker(options);
            this.initialCSV = this.removeBOM(initialCSV); // initial copy of the given csv
            this.parsedCSV = this.parseCSV(this.initialCSV); // the inital parsed version
            this.options.initialHeaders = this.parseCSV.columns;
            this.reducedCSV = this.csvReducer(this.parsedCSV, reducerFunction);
            this.reducedCSV = this.limitHeaders(this.reducedCSV);
            this.newCSV = this.formatCSV(this.reducedCSV);
        }
    }
    // methods
    optionsChecker(options){return optionsChecker(options);}
    removeBOM(stringWithBOM){return removeBOM(stringWithBOM);}
    parseCSV(csvToParse){return parseCSV(csvToParse);}
    csvReducer(csvToReduce, reducerFunction){return csvReducer(csvToReduce, this.options, reducerFunction);}
    limitHeaders(parsedCSV){return limitHeaders(parsedCSV, this.options);}
    formatCSV(csvToFormat){return formatCSV(csvToFormat, this.options);}
    // setters
    setOptions(options){return optionsChecker(options);}
    // setInitialCSV(initialCSV){this.initialCSV = removeBOM(initialCSV);}
    // setParsedCSV(parsedCSV){this.parsedCSV = parsedCSV}
    // getters
    getFormattedCSV(){return this.newCSV;}
    getReducedCSV(){return this.reducedCSV;}
}

/********************************************************************
 * a new class (or object) created based on the given parameters would be the export
*********************************************************************/
module.exports = (initialCSV, options, reducerFunction) => {
    return new ModifiedCSV(initialCSV, options, reducerFunction);
}