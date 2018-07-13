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
    // Choose what to do here based on options
    console.log('csvReducer()');
    return csvToReduce.reduce(reducerFunction, options.initAcc);
}

/********************************************************************
 * editCSV is kind of messy right now, but it's function may be better
 * seperated into multiple methods
*********************************************************************/
const editCSV = function(reducedValue, options){
    // Choose what to do here based on options
    console.log('editCSV()');
    let editedCSV;
    reducedValue.acc(value => {
        Object.keys(value).forEach(key => {
            options.headersOut.forEach(header => {
                if (key === header) {
                    // return something here
                }
            });
        });
        // there was no match, so return the unedited acc here.
    });
    return '\'Editted CSV Here\'';
}

/********************************************************************
 * 
*********************************************************************/
class ModifiedCSV {
    constructor(initialCSV, options, reducerFunction){
        if(initialCSV !== undefined){
            this.newCSV = this.removeBOM(initialCSV);
            this.parsedCSV = this.parseCSV(this.newCSV);
            this.reducedValue = this.csvReducer(this.parsedCSV, options, reducerFunction);
            this.newCSV = this.editCSV(this.reducedValue, options);
        }
    }
    // methods
    removeBOM(stringWithBOM){return removeBOM(stringWithBOM);}
    parseCSV(csvToParse){return parseCSV(csvToParse);}
    csvReducer(csvToReduce, options, reducerFunction){return csvReducer(csvToReduce, options, reducerFunction);}
    editCSV(reducedValue, options, reducerFunction){return editCSV(reducedValue, options);} 
    // consider a limitKeys(parsedCSV){} method to help with editCSV
    // getters
    getObject(){return this.reducedValue;}
    getCSV(){return this.newCSV;}
}

/********************************************************************
 * a new class (or object) created based on the given parameters would be the export
*********************************************************************/
module.exports = (initialCSV, options, reducerFunction) => {
    return new ModifiedCSV(initialCSV, options, reducerFunction);
}