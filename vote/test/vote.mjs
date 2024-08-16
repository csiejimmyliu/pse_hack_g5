import { Identity, Group, generateProof, verifyProof } from "@semaphore-protocol/core"
import { buildPoseidon } from 'circomlibjs';
import { writeFile } from 'fs/promises';
import { stringify } from 'bigint-json';
import { writeFileSync } from 'fs';
//hash function
//fixing the private key for demo
const poseidon = await buildPoseidon();

const pk1 = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
const pk2 = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
const pk3 = "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"
const pk4 = "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6"
const pk5 = "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a"
const pk6 = "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba"

//tw, usa
const identity1 = new Identity(pk1)

//tw
const identity2 = new Identity(pk2)
const identity3 = new Identity(pk3)

//usa
const identity4 = new Identity(pk4)
const identity5 = new Identity(pk5)
const identity6 = new Identity(pk6)

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
const groupTWCommitment = [identity1.commitment, identity2.commitment, identity3.commitment]
const groupUSACommitment = [identity1.commitment, identity4.commitment, identity5.commitment, identity6.commitment]

const groupTW
    = new Group([identity1.commitment, identity2.commitment, identity3.commitment])
const groupUSA = new Group([identity1.commitment, identity4.commitment, identity5.commitment, identity6.commitment])

//scope
const scope1 = "Presidential Election"
const scope2 = "Referendum"

//message
const TW_PE_1 = "0" //"Alice"
const TW_PE_2 = "1" //"Bob"
const USA_PE_1 = "0" //"Charlie"
const USA_PE_2 = "1" //"Daniel"

const TW_R_1 = "0" //"J"
const TW_R_2 = "1" //"K"
const USA_R_1 = "0" //"X"
const USA_R_2 = "1" //"Y"
const USA_R_3 = "2" //"Z"




//vote
//TW_PE
const proof1 = await generateProof(identity1, groupTW, TW_PE_1, scope1) // V
const proof2 = await generateProof(identity2, groupTW, TW_PE_1, scope1) // V
const proof3 = await generateProof(identity3, groupTW, TW_PE_2, scope1) // V


//TW_R
const proof4 = await generateProof(identity2, groupTW, TW_R_1, scope2) // V



//USA_PE
const proof5 = await generateProof(identity1, groupUSA, USA_PE_1, scope1) // V
const proof6 = await generateProof(identity4, groupUSA, USA_PE_2, scope1) // V
const proof7 = await generateProof(identity5, groupUSA, USA_PE_2, scope1) // V
const proof8 = await generateProof(identity6, groupUSA, USA_PE_2, scope1) // V

//USA_R
const proof9 = await generateProof(identity1, groupUSA, USA_R_1, scope2) // V
const proof10 = await generateProof(identity4, groupUSA, USA_R_1, scope2) // V
const proof11 = await generateProof(identity5, groupUSA, USA_R_2, scope2) // V
const proof12 = await generateProof(identity6, groupUSA, USA_R_2, scope2) // V

//revote
const proof13 = await generateProof(identity2, groupTW, TW_R_1, scope2) // V

//wrong scope
const proof14 = await generateProof(identity3, groupTW, TW_R_2, "Health Insurance") // V

//fake group
const proof15 = await generateProof(identity4, groupUSA, TW_PE_2, scope1) // V
proof15.merkleTreeRoot = proof1.merkleTreeRoot

//fake result
const proof16 = structuredClone(proof1)
proof16.message = proof3.message // V


function proof_js_to_sol(proof) {
    const arr = []
    arr.push(proof.merkleTreeDepth)
    arr.push(BigInt(proof.merkleTreeRoot))
    arr.push(BigInt(proof.nullifier))
    arr.push(BigInt(proof.message))
    arr.push(BigInt(proof.scope))
    const points = []
    for (var i = 0; i < proof.points.length; ++i) {
        points.push(BigInt(proof.points[i]))
    }
    arr.push(points)
    return arr
}

/*
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
*/

var pool = [
    "groupTWCommitment",
    groupTWCommitment,
    "groupUSACommitment",
    groupUSACommitment,
    "proof1",
    proof_js_to_sol(proof1),
    "proof2",
    proof_js_to_sol(proof2),
    "proof3",
    proof_js_to_sol(proof3),
    "proof4",
    proof_js_to_sol(proof4),
    "proof5",
    proof_js_to_sol(proof5),
    "proof6",
    proof_js_to_sol(proof6),
    "proof7",
    proof_js_to_sol(proof7),
    "proof8",
    proof_js_to_sol(proof8),
    "proof9",
    proof_js_to_sol(proof9),
    "proof10",
    proof_js_to_sol(proof10),
    "proof11",
    proof_js_to_sol(proof11),
    "proof12",
    proof_js_to_sol(proof12),
    "proof13",
    proof_js_to_sol(proof13),
    "proof14",
    proof_js_to_sol(proof14),
    "proof15",
    proof_js_to_sol(proof15),
    "proof16",
    proof_js_to_sol(proof16),
]


function formatBigIntValue(value) {
    if (Array.isArray(value)) {
        return `[${value.map(formatBigIntValue).join(', ')}]`;
    }
    return typeof value === 'bigint' ? value.toString() : value;
}

const formattedString = pool.map(formatBigIntValue).join('\n');
writeFileSync('output.txt', formattedString, 'utf-8');
/*
const jsonString = stringify(pool, null, 2);
await writeFile('vote.json', jsonString, 'utf-8');
*/
console.log('Successfully wrote to file');
process.exit(1);
