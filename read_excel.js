const XLSX = require('xlsx');

const workbook = XLSX.readFile('kehe50leads.xlsx');
console.log('Sheet Names:', workbook.SheetNames);

workbook.SheetNames.forEach(name => {
    const worksheet = workbook.Sheets[name];
    const data = XLSX.utils.sheet_to_csv(worksheet);
    console.log(`\n=== ${name} ===\n${data}`);
});
