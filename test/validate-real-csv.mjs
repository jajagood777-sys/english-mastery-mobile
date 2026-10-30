import {readFileSync} from 'node:fs';import {recordsFromCSV} from '../core.mjs';
const path=process.env.REAL_VOCAB_CSV;
if(!path){console.log('Real CSV smoke test skipped (REAL_VOCAB_CSV unset).');process.exit(0)}
const parsed=recordsFromCSV(readFileSync(path,'utf8'),{includeExamples:true,source:'Original verified CSV'});
const count=kind=>parsed.items.filter(x=>x.kind===kind).length;
if(parsed.sourceRows!==180||count('word')!==180||count('sentence')!==180||parsed.errors.length)throw Error('Real 180-card CSV validation failed.');
console.log('Actual 180-card CSV OK: 180 word cards, 180 sentence cards, 0 parse errors.');
