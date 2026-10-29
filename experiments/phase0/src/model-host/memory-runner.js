import {env,pipeline} from './transformers.js';
import {TEXT_MODEL_ID,TEXT_MODEL_REVISION,TEXT_MODEL_DTYPE,EMBEDDING_MODEL_ID,EMBEDDING_MODEL_REVISION,EMBEDDING_MODEL_DTYPE,CANDIDATE_TEXT_MODEL,CANDIDATE_EMBEDDING_MODEL,CANDIDATE_TEXT_MODEL_Q8,BASELINE_TEXT_MODEL,BASELINE_EMBEDDING_MODEL} from '../config.js';
import {cos_sim} from '../../vendor/transformers.js';
import {EMBEDDING_QUALITY_CASES,TEXT_QUALITY_PROMPTS} from './model-fixtures.js';
env.allowLocalModels=false;
const pause=ms=>new Promise(r=>setTimeout(r,ms));
export async function runCase(options,emit){
 const phase=async(name,data={})=>{emit({phase:name,...data});await pause(1000)};
 await phase('ready');
 if(options.embedding){
 const embeddingModel=options.embeddingBaseline?BASELINE_EMBEDDING_MODEL:options.embeddingCandidate?CANDIDATE_EMBEDDING_MODEL:{id:EMBEDDING_MODEL_ID,revision:EMBEDDING_MODEL_REVISION,dtype:EMBEDDING_MODEL_DTYPE};
 let extractor;let start=performance.now();
 extractor=await pipeline('feature-extraction',embeddingModel.id,{revision:embeddingModel.revision,dtype:embeddingModel.dtype,device:'wasm'});
 await phase('embedding-loaded',{model:embeddingModel.id,revision:embeddingModel.revision,dtype:embeddingModel.dtype,loadMs:Math.round(performance.now()-start)});
 start=performance.now();
 const vectors=(await extractor(['DBMS assignment on normalization','Third normal form explained','Functional dependencies tutorial','IPL cricket highlights'],{pooling:'mean',normalize:true})).tolist();
 const scores=vectors.slice(1).map(v=>cos_sim(vectors[0],v));
 if(!scores.every(Number.isFinite)||scores[0]<=scores[2]||scores[1]<=scores[2])throw Error('Embedding ranking failed');
 await phase('embedding-generated',{inferenceMs:Math.round(performance.now()-start),scores});
 if(options.embeddingSuite){
 for(const test of EMBEDDING_QUALITY_CASES){
 start=performance.now();
 const titles=[...test.related,...test.unrelated];
 const vectors=(await extractor([test.task,...titles],{pooling:'mean',normalize:true})).tolist();
 const scores=titles.map((title,i)=>({title,related:i<test.related.length,score:cos_sim(vectors[0],vectors[i+1])}));
 const passed=scores.every(v=>Number.isFinite(v.score))&&Math.min(...scores.filter(v=>v.related).map(v=>v.score))>Math.max(...scores.filter(v=>!v.related).map(v=>v.score));
 await phase('embedding-quality',{task:test.task,inferenceMs:Math.round(performance.now()-start),scores,passed});
 if(!passed)throw Error('Embedding relevance regression: '+test.task);
 }
 }
 await extractor.dispose();extractor=null;
 await phase('embedding-disposed');
 }
 if(options.text){
 const textModel=options.textBaseline?BASELINE_TEXT_MODEL:options.textCandidate==='smollm-q8'?CANDIDATE_TEXT_MODEL_Q8:options.textCandidate?CANDIDATE_TEXT_MODEL:{id:TEXT_MODEL_ID,revision:TEXT_MODEL_REVISION,dtype:TEXT_MODEL_DTYPE,task:'text-generation'};
 let generator;let start=performance.now();
 generator=await pipeline(textModel.task,textModel.id,{revision:textModel.revision,dtype:textModel.dtype,device:'wasm',session_options:options.sessionOptions??{}});
 await phase('text-loaded',{model:textModel.id,revision:textModel.revision,dtype:textModel.dtype,task:textModel.task,loadMs:Math.round(performance.now()-start)});
 for(const prompt of options.prompts??(options.textSuite?TEXT_QUALITY_PROMPTS:['Rewrite as a sad little ghost would say it: Breaking news about cricket'])){
 for(const tokens of options.tokenRuns??[options.tokens]){
 start=performance.now();
 const input=textModel.task==='text2text-generation'?prompt:[{role:'user',content:prompt}];
 const result=await generator(input,{max_new_tokens:tokens,do_sample:false,return_full_text:false});
 const output=result[0]?.generated_text;
 const raw=typeof output==='string'?output:output?.at(-1)?.content;
 if(typeof raw!=='string'||!raw.trim())throw Error('Empty generation');
 await phase('text-generated',{prompt,tokens,generationMs:Math.round(performance.now()-start),raw,line:raw.trim().split(/\r?\n/)[0]});
 }
 }
 await generator.dispose();generator=null;
 await phase('text-disposed');
 }
 await phase('done');
}
