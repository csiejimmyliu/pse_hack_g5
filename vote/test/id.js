import { Identity, Group, generateProof, verifyProof } from "@semaphore-protocol/core"
import { buildPoseidon } from 'circomlibjs';
function stringToBigInt(str) {
    const hexStr = Buffer.from(str, 'utf8').toString('hex');
    return BigInt('0x' + hexStr);
}
const poseidon = await buildPoseidon();

const identity1 = new Identity()
const identity2 = new Identity()
const identity3 = new Identity()
const identity4 = new Identity()

const group = new Group([identity1.commitment, identity2.commitment, identity3.commitment])

const message = "Hello world"
const message2 = "Hello"
const scope = "Semaphore1"

const proof1 = await generateProof(identity1, group, message, scope)

console.log(group.)
const test = stringToBigInt(message)



const result1 = await verifyProof(proof1)




process.exit(1)
