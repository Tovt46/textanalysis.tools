import assert from "node:assert/strict";
import test from "node:test";
import {readinessSummary} from "../scripts/check-agent-readiness.mjs";

const passing=()=>Array.from({length:13},(_,index)=>({number:index+1,status:"PASS"}));

test("agent-readiness requires exactly thirteen distinct successful checks",()=>{
  assert.equal(readinessSummary(passing()).status,"PASS");
  for(const number of [1,2,3,4,5,6,7,8,9,10,11,12,13]){
    assert.equal(readinessSummary(passing().filter(check=>check.number!==number)).status,"FAIL",`Missing check ${number}`);
    const failed=passing();
    failed[number-1].status="FAIL";
    assert.equal(readinessSummary(failed).status,"FAIL",`Failed check ${number}`);
  }
  const duplicate=passing();
  duplicate[11].number=11;
  assert.equal(readinessSummary(duplicate).status,"FAIL");
  const skipped=passing();
  skipped[11].status="SKIPPED";
  assert.equal(readinessSummary(skipped).status,"FAIL");
  assert.equal(readinessSummary([]).status,"FAIL");
});
