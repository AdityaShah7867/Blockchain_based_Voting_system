// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract VotingSystem {
    // Structure for Candidate
    struct Candidate {
        uint256 id;
        string name;
        string party;
        uint256 voteCount;
    }

    // Structure for Voter
    struct Voter {
        bool isRegistered;
        bool hasVoted;
        uint256 votedCandidateId;
    }

    // State variables
    address public admin;
    mapping(address => Voter) public voters;
    Candidate[] public candidates;
    uint256 public votingStart;
    uint256 public votingEnd;
    bool public votingStarted;
    bool public votingEnded;
    uint256 public totalVotes;

    // Events
    event CandidateAdded(uint256 candidateId, string name, string party);
    event VoterRegistered(address voterAddress);
    event VoteCast(address voter, uint256 candidateId);
    event VotingStarted(uint256 startTime, uint256 endTime);
    event VotingEnded(uint256 endTime, uint256 totalVotes);

    // Modifiers
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this function");
        _;
    }

    modifier votingNotStarted() {
        require(!votingStarted, "Voting has already started");
        _;
    }

    modifier votingActive() {
        require(votingStarted, "Voting has not started");
        require(!votingEnded, "Voting has ended");
        require(block.timestamp >= votingStart && block.timestamp <= votingEnd, "Not in voting period");
        _;
    }

    // Constructor
    constructor() {
        admin = msg.sender;
        totalVotes = 0;
    }

    // Function to add a candidate
    function addCandidate(string memory _name, string memory _party) public onlyAdmin votingNotStarted {
        uint256 candidateId = candidates.length;
        candidates.push(Candidate({
            id: candidateId,
            name: _name,
            party: _party,
            voteCount: 0
        }));
        emit CandidateAdded(candidateId, _name, _party);
    }

    // Function to register a voter
    function registerVoter(address _voter) public onlyAdmin {
        require(!voters[_voter].isRegistered, "Voter already registered");
        voters[_voter].isRegistered = true;
        voters[_voter].hasVoted = false;
        emit VoterRegistered(_voter);
    }

    // Function to start voting
    function startVoting(uint256 _durationInMinutes) public onlyAdmin votingNotStarted {
        require(_durationInMinutes > 0, "Duration must be greater than 0");
        votingStart = block.timestamp;
        votingEnd = votingStart + (_durationInMinutes * 1 minutes);
        votingStarted = true;
        emit VotingStarted(votingStart, votingEnd);
    }

    // Function to cast a vote
    function vote(uint256 _candidateId) public votingActive {
        Voter storage sender = voters[msg.sender];
        require(sender.isRegistered, "You are not registered to vote");
        require(!sender.hasVoted, "You have already voted");
        require(_candidateId < candidates.length, "Invalid candidate ID");

        sender.hasVoted = true;
        sender.votedCandidateId = _candidateId;

        candidates[_candidateId].voteCount++;
        totalVotes++;

        emit VoteCast(msg.sender, _candidateId);
    }

    // Function to end voting
    function endVoting() public onlyAdmin {
        require(votingStarted, "Voting has not started");
        require(!votingEnded, "Voting has already ended");
        
        votingEnded = true;
        emit VotingEnded(block.timestamp, totalVotes);
    }

    // Function to get all candidates with their vote counts
    function getAllCandidatesWithVotes() public view returns (Candidate[] memory) {
        return candidates;
    }

    // Function to get total number of candidates
    function getCandidateCount() public view returns (uint256) {
        return candidates.length;
    }

    // Function to get voting status
    function getVotingStatus() public view returns (bool started, bool ended, uint256 startTime, uint256 endTime) {
        return (votingStarted, votingEnded, votingStart, votingEnd);
    }
} 