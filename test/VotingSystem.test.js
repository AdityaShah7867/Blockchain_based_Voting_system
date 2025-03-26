const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VotingSystem", function () {
  let votingSystem;
  let owner;
  let voter1;
  let voter2;
  let addr1;
  let addr2;

  beforeEach(async function () {
    // Get signers
    [owner, voter1, voter2, addr1, addr2] = await ethers.getSigners();

    // Deploy the contract
    const VotingSystem = await ethers.getContractFactory("VotingSystem");
    votingSystem = await VotingSystem.deploy();
  });

  describe("Deployment", function () {
    it("Should set the right admin", async function () {
      expect(await votingSystem.admin()).to.equal(owner.address);
    });

    it("Should have no candidates initially", async function () {
      expect(await votingSystem.getCandidateCount()).to.equal(0);
    });
  });

  describe("Candidate management", function () {
    it("Should allow admin to add candidates", async function () {
      await votingSystem.addCandidate("John Doe", "Party A");
      await votingSystem.addCandidate("Jane Smith", "Party B");
      
      expect(await votingSystem.getCandidateCount()).to.equal(2);
      
      const candidates = await votingSystem.getAllCandidatesWithVotes();
      expect(candidates[0].name).to.equal("John Doe");
      expect(candidates[0].party).to.equal("Party A");
      expect(candidates[1].name).to.equal("Jane Smith");
      expect(candidates[1].party).to.equal("Party B");
    });

    it("Should not allow non-admin to add candidates", async function () {
      await expect(
        votingSystem.connect(addr1).addCandidate("John Doe", "Party A")
      ).to.be.revertedWith("Only admin can call this function");
    });
  });

  describe("Voter registration", function () {
    it("Should allow admin to register voters", async function () {
      await votingSystem.registerVoter(voter1.address);
      
      const voter = await votingSystem.voters(voter1.address);
      expect(voter.isRegistered).to.equal(true);
      expect(voter.hasVoted).to.equal(false);
    });

    it("Should not allow non-admin to register voters", async function () {
      await expect(
        votingSystem.connect(addr1).registerVoter(voter1.address)
      ).to.be.revertedWith("Only admin can call this function");
    });
  });

  describe("Voting process", function () {
    beforeEach(async function () {
      // Add candidates
      await votingSystem.addCandidate("John Doe", "Party A");
      await votingSystem.addCandidate("Jane Smith", "Party B");
      
      // Register voters
      await votingSystem.registerVoter(voter1.address);
      await votingSystem.registerVoter(voter2.address);
    });

    it("Should allow admin to start voting", async function () {
      await votingSystem.startVoting(60); // 60 minutes
      
      const [started, ended, startTime, endTime] = await votingSystem.getVotingStatus();
      expect(started).to.equal(true);
      expect(ended).to.equal(false);
      expect(endTime).to.be.gt(startTime);
    });

    it("Should allow registered voters to cast votes after voting starts", async function () {
      await votingSystem.startVoting(60);
      
      await votingSystem.connect(voter1).vote(0); // vote for candidate 0
      
      const voter = await votingSystem.voters(voter1.address);
      expect(voter.hasVoted).to.equal(true);
      expect(voter.votedCandidateId).to.equal(0);
      
      const candidates = await votingSystem.getAllCandidatesWithVotes();
      expect(candidates[0].voteCount).to.equal(1);
      expect(candidates[1].voteCount).to.equal(0);
    });

    it("Should not allow unregistered voters to vote", async function () {
      await votingSystem.startVoting(60);
      
      await expect(
        votingSystem.connect(addr1).vote(0)
      ).to.be.revertedWith("You are not registered to vote");
    });

    it("Should not allow voting before voting starts", async function () {
      await expect(
        votingSystem.connect(voter1).vote(0)
      ).to.be.revertedWith("Voting has not started");
    });

    it("Should not allow voting twice", async function () {
      await votingSystem.startVoting(60);
      await votingSystem.connect(voter1).vote(0);
      
      await expect(
        votingSystem.connect(voter1).vote(1)
      ).to.be.revertedWith("You have already voted");
    });

    it("Should allow admin to end voting", async function () {
      await votingSystem.startVoting(60);
      await votingSystem.endVoting();
      
      const [started, ended, startTime, endTime] = await votingSystem.getVotingStatus();
      expect(started).to.equal(true);
      expect(ended).to.equal(true);
    });
  });
}); 