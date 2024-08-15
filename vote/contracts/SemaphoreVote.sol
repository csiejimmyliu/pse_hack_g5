// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {ISemaphore} from "node_modules/@semaphore-protocol/contracts/interfaces/ISemaphore.sol";
import {ISemaphoreVerifier} from "node_modules/@semaphore-protocol/contracts/interfaces/ISemaphoreVerifier.sol";
import {SemaphoreGroups} from "node_modules/@semaphore-protocol/contracts/base/SemaphoreGroups.sol";
import {MIN_DEPTH, MAX_DEPTH} from "node_modules/@semaphore-protocol/contracts/base/Constants.sol";


contract SemaphoreVote is ISemaphore, SemaphoreGroups {
    event PollCreated(uint256 indexed groupId, uint256 indexed pollId, string indexed scope);
    event PollSettled(uint256 indexed pollIndex, uint256 indexed result);

    struct Poll {
        uint256 groupId;
        string scope;
        uint256 optionsNum;
        uint256[] record;
        uint256 stratTime;
        uint256 duration;
        bool settled;
    }
    ISemaphoreVerifier public verifier;

    mapping(uint256 => Group) public groups;
    Poll[] public polls;

    uint256 public groupCounter = 0;
    uint256 public pollCounter = 0;
    constructor(ISemaphoreVerifier _verifier) {
        verifier = _verifier;
    }

    function createGroup() external override returns (uint256 groupId) {
        groupId = groupCounter++;
        _createGroup(groupId, msg.sender);

        groups[groupId].merkleTreeDuration = 1 hours;
    }

    function createGroup(address admin) external override returns (uint256 groupId) {
        groupId = groupCounter++;
        _createGroup(groupId, admin);

        groups[groupId].merkleTreeDuration = 1 hours;
    }

    function createGroup(address admin, uint256 merkleTreeDuration) external override returns (uint256 groupId) {
        groupId = groupCounter++;
        _createGroup(groupId, admin);

        groups[groupId].merkleTreeDuration = merkleTreeDuration;
    }

    function updateGroupAdmin(uint256 groupId, address newAdmin) external override {
        _updateGroupAdmin(groupId, newAdmin);
    }

    function acceptGroupAdmin(uint256 groupId) external override {
        _acceptGroupAdmin(groupId);
    }

    function updateGroupMerkleTreeDuration(
        uint256 groupId,
        uint256 newMerkleTreeDuration
    ) external override onlyGroupAdmin(groupId) {
        uint256 oldMerkleTreeDuration = groups[groupId].merkleTreeDuration;

        groups[groupId].merkleTreeDuration = newMerkleTreeDuration;

        emit GroupMerkleTreeDurationUpdated(groupId, oldMerkleTreeDuration, newMerkleTreeDuration);
    }

    function addMember(uint256 groupId, uint256 identityCommitment) external override {
        uint256 merkleTreeRoot = _addMember(groupId, identityCommitment);

        groups[groupId].merkleRootCreationDates[merkleTreeRoot] = block.timestamp;
    }

    function addMembers(uint256 groupId, uint256[] calldata identityCommitments) external override {
        uint256 merkleTreeRoot = _addMembers(groupId, identityCommitments);

        groups[groupId].merkleRootCreationDates[merkleTreeRoot] = block.timestamp;
    }

    function updateMember(
        uint256 groupId,
        uint256 identityCommitment,
        uint256 newIdentityCommitment,
        uint256[] calldata merkleProofSiblings
    ) external override {
        uint256 merkleTreeRoot = _updateMember(groupId, identityCommitment, newIdentityCommitment, merkleProofSiblings);

        groups[groupId].merkleRootCreationDates[merkleTreeRoot] = block.timestamp;
    }

    function removeMember(
        uint256 groupId,
        uint256 identityCommitment,
        uint256[] calldata merkleProofSiblings
    ) external override {
        uint256 merkleTreeRoot = _removeMember(groupId, identityCommitment, merkleProofSiblings);

        groups[groupId].merkleRootCreationDates[merkleTreeRoot] = block.timestamp;
    }


    function validateProof(uint256 groupId, SemaphoreProof calldata proof) public override {
        // The function will revert if the nullifier that is part of the proof,
        // was already used inside the group with id groupId.
        if (groups[groupId].nullifiers[proof.nullifier]) {
            revert Semaphore__YouAreUsingTheSameNullifierTwice();
        }

        // The function will revert if the proof is not verified successfully.
        if (!verifyProof(groupId, proof)) {
            revert Semaphore__InvalidProof();
        }

        // Saves the nullifier so that it cannot be used again to successfully verify a proof
        // that is part of the group with id groupId.
        groups[groupId].nullifiers[proof.nullifier] = true;

        emit ProofValidated(
            groupId,
            proof.merkleTreeDepth,
            proof.merkleTreeRoot,
            proof.nullifier,
            proof.message,
            proof.scope,
            proof.points
        );
    }

    function verifyProof(
        uint256 groupId,
        SemaphoreProof calldata proof
    ) public view override onlyExistingGroup(groupId) returns (bool) {
        // The function will revert if the Merkle tree depth is not supported.
        if (proof.merkleTreeDepth < MIN_DEPTH || proof.merkleTreeDepth > MAX_DEPTH) {
            revert Semaphore__MerkleTreeDepthIsNotSupported();
        }

        // Gets the number of leaves in the Incremental Merkle Tree that represents the group
        // with id groupId which is the same as the number of members in the group groupId.
        uint256 merkleTreeSize = getMerkleTreeSize(groupId);

        // The function will revert if there are no members in the group.
        if (merkleTreeSize == 0) {
            revert Semaphore__GroupHasNoMembers();
        }

        // Gets the Merkle root of the Incremental Merkle Tree that represents the group with id groupId.
        uint256 currentMerkleTreeRoot = getMerkleTreeRoot(groupId);

        // A proof could have used an old Merkle tree root.
        // https://github.com/semaphore-protocol/semaphore/issues/98
        if (proof.merkleTreeRoot != currentMerkleTreeRoot) {
            uint256 merkleRootCreationDate = groups[groupId].merkleRootCreationDates[proof.merkleTreeRoot];
            uint256 merkleTreeDuration = groups[groupId].merkleTreeDuration;

            if (merkleRootCreationDate == 0) {
                revert Semaphore__MerkleTreeRootIsNotPartOfTheGroup();
            }

            if (block.timestamp > merkleRootCreationDate + merkleTreeDuration) {
                revert Semaphore__MerkleTreeRootIsExpired();
            }
        }

        return
            verifier.verifyProof(
                [proof.points[0], proof.points[1]],
                [[proof.points[2], proof.points[3]], [proof.points[4], proof.points[5]]],
                [proof.points[6], proof.points[7]],
                [proof.merkleTreeRoot, proof.nullifier, _hash(proof.message), _hash(proof.scope)],
                proof.merkleTreeDepth
            );
    }

    function _hash(uint256 message) private pure returns (uint256) {
        return uint256(keccak256(abi.encodePacked(message))) >> 8;
    }

    // =================================================================================
    // function proof_js_to_sol(proof) {const arr = []; arr.push(proof.merkleTreeDepth); arr.push(BigInt(proof.merkleTreeRoot)); arr.push(BigInt(proof.nullifier)); arr.push(BigInt(proof.message)); arr.push(BigInt(proof.scope)); const points = []; for (var i = 0; i < proof.points.length; ++i) {points.push(BigInt(proof.points[i]));} arr.push(points); return arr}

    function createPoll(uint256 groupId, string memory scope, uint256 options, uint256 duration) public onlyGroupAdmin(groupId) {
        uint256[] memory record = new uint256[](options);
        polls.push(Poll(groupId, scope, options, record, block.timestamp, duration, false));

        emit PollCreated(groupId, pollCounter, scope);
        ++ pollCounter;
    }

    function castVote(uint256 pollId, SemaphoreProof calldata proof) public {
        require(proof.message < polls[pollId].optionsNum, "Option out of bounds");
        require(stringToUint(polls[pollId].scope) == proof.scope, "Invalid Scope");
        uint256 groupId = polls[pollId].groupId;

        validateProof(groupId, proof);

        ++ polls[pollId].record[proof.message];
    }

    function hasPollEnded() public {
        for (uint256 i = 0; i < pollCounter; ++i) {
            if (!polls[i].settled && (block.timestamp >= polls[i].stratTime + polls[i].duration)) {
                settlePoll(i);
            }
        }
    }

    function settlePoll(uint256 index) public returns (uint256) {
        require(!polls[index].settled);
        uint256[] memory record = polls[index].record;
        uint256 result;
        uint256 max = 0;

        for (uint256 j = 0; j < record.length; ++j) {
            if (record[j] > max) {
                result = j;
                max = record[j];
            }
        }

        polls[index].settled = true;
        emit PollSettled(index, result);
        return result;
    }
    function stringToUint(string memory s) public pure returns (uint256) {
        return uint256(bytes32(bytes(s)));
    }
}