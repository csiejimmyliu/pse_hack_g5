import { Identity, Group, generateProof, verifyProof } from "@semaphore-protocol/core"
import { buildPoseidon } from 'circomlibjs';
import { writeFile } from 'fs/promises';
//hash function
//fixing the private key for demo
const poseidon = await buildPoseidon();

//tw, usa
const identity1 = new Identity(poseidon([1n]))

//tw
const identity2 = new Identity(poseidon([2n]))
const identity3 = new Identity(poseidon([3n]))

//usa
const identity4 = new Identity(poseidon([4n]))
const identity5 = new Identity(poseidon([5n]))
const identity6 = new Identity(poseidon([6n]))

/*
//random
//tw, usa
const identity1 = new Identity()

//tw
const identity2 = new Identity()
const identity3 = new Identity()

//usa
const identity4 = new Identity()
const identity5 = new Identity()
const identity6 = new Identity()
*/

//group
const groupTW = new Group([identity1.commitment, identity2.commitment, identity3.commitment])
const groupUSA = new Group([identity1.commitment, identity4.commitment, identity5.commitment, identity6.commitment])

//scope
const scope1 ="Presidential Election"
const scope2 = "Referendum"

//message
const TW_PE_1 = "Alice"
const TW_PE_2 = "Bob"
const USA_PE_1 = "Charlie"
const USA_PE_2 = "Daniel"

const TW_R_1 = "J"
const TW_R_2 = "K"
const USA_R_1 = "X"
const USA_R_2 = "Y"
const USA_R_3 = "Z"




//vote
//TW_PE
const proof1 = await generateProof(identity1, groupTW, TW_PE_1, scope1)
const proof2 = await generateProof(identity2, groupTW, TW_PE_1, scope1)
const proof3 = await generateProof(identity3, groupTW, TW_PE_2, scope1)

//TW_R
const proof4 = await generateProof(identity2, groupTW, TW_R_1, scope2)



//USA_PE
const proof5 = await generateProof(identity1, groupUSA, USA_PE_1, scope1)
const proof6 = await generateProof(identity4, groupUSA, USA_PE_2, scope1)
const proof7 = await generateProof(identity5, groupUSA, USA_PE_2, scope1)
const proof8 = await generateProof(identity6, groupUSA, USA_PE_2, scope1)

//USA_R
const proof9 = await generateProof(identity1, groupUSA, USA_R_1, scope2)
const proof10 = await generateProof(identity4, groupUSA, USA_R_1, scope2)
const proof11 = await generateProof(identity5, groupUSA, USA_R_2, scope2)
const proof12 = await generateProof(identity6, groupUSA, USA_R_2, scope2)

//revote
const proof13 = await generateProof(identity2, groupTW, TW_R_1, scope2)

//wrong scope
const proof14 = await generateProof(identity3, groupTW, TW_R_2, "Health Insurance")

//fake group
const proof15 = await generateProof(identity4, groupUSA, TW_PE_2, scope1)
proof15.merkleTreeRoot = proof1.merkleTreeRoot

//fake result
const proof16 = proof1
proof16.message = proof3.message

var pool = [
    proof1,
    proof2,
    proof3,
    proof4,
    proof5,
    proof6,
    proof7,
    proof8,
    proof9,
    proof10,
    proof11,
    proof12,
    proof13,
    proof14,
    proof15,
    proof16
]


const jsonString = JSON.stringify(pool, null, 2);
await writeFile('vote.json', jsonString, 'utf-8');
console.log('Successfully wrote to file');

//const isValid = await verifyProof(proof);


process.exit(1);
