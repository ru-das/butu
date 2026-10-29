import {env,pipeline} from './transformers.js';
import {TEXT_MODEL_ID,TEXT_MODEL_REVISION,TEXT_MODEL_DTYPE,EMBEDDING_MODEL_ID,EMBEDDING_MODEL_REVISION,EMBEDDING_MODEL_DTYPE} from '../config.js';
import {cos_sim} from '../../vendor/transformers.js';
env.allowLocalModels=false;
const pause=ms=>new Promise(r=>setTimeout(r,ms));
export async function runCase(options,emit){
 const phase=async(name,data={})=>{emit({phase:name,...data});await pause(1000)};
 await phase('ready');
 if(options.embedding){
 let extractor;let start=performance.now();
 extractor=await pipeline('feature-extraction',EMBEDDING_MODEL_ID,{revision:EMBEDDING_MODEL_REVISION,dtype:EMBEDDING_MODEL_DTYPE,device:'wasm'});
 await phase('embedding-loaded',{loadMs:Math.round(performance.now()-start)});
 start=performance.now();
 const vectors=(await extractor(['DBMS assignment on normalization','Third normal form explained','Functional dependencies tutorial','IPL cricket highlights'],{pooling:'mean',normalize:true})).tolist();
 const scores=vectors.slice(1).map(v=>cos_sim(vectors[0],v));
 if(!scores.every(Number.isFinite)||scores[0]<=scores[2]||scores[1]<=scores[2])throw Error('Embedding ranking failed');
 await phase('embedding-generated',{inferenceMs:Math.round(performance.now()-start),scores});
 await extractor.dispose();extractor=null;
 await phase('embedding-disposed');
 }
 if(options.text){
 let generator;let start=performance.now();
 generator=await pipeline('text-generation',TEXT_MODEL_ID,{revision:TEXT_MODEL_REVISION,dtype:TEXT_MODEL_DTYPE,device:'wasm',session_options:options.sessionOptions??{}});
 await phase('text-loaded',{loadMs:Math.round(performance.now()-start)});
 for(const tokens of options.tokenRuns??[options.tokens]){
 start=performance.now();
 const result=await generator([{role:'user',content:'Rewrite as a sad little ghost would say it: Breaking news about cricket'}],{max_new_tokens:tokens,do_sample:false,return_full_text:false});
 const raw=result[0]?.generated_text?.at(-1)?.content;
 if(typeof raw!=='string'||!raw.trim())throw Error('Empty generation');
 await phase('text-generated',{tokens,generationMs:Math.round(performance.now()-start),raw,line:raw.trim().split(/\r?\n/)[0]});
 }
 await generator.dispose();generator=null;
 await phase('text-disposed');
 }
 await phase('done');
}
