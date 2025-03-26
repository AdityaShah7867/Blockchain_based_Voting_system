import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './App.css';
import VotingSystemArtifact from './artifacts/contracts/VotingSystem.sol/VotingSystem.json';

function App() {
  // State variables
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [votingStatus, setVotingStatus] = useState({ started: false, ended: false });
  const [isRegistered, setIsRegistered] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Form state
  const [candidateName, setCandidateName] = useState('');
  const [candidateParty, setCandidateParty] = useState('');
  const [voterAddress, setVoterAddress] = useState('');
  const [votingDuration, setVotingDuration] = useState(60);
  
  // Contract address (replace with your deployed contract address)
  const contractAddress = "0xD1614ae7AE24665abCe6A936BF2569bD2212cc6B"; // Deployed on Sepolia testnet

  // Try to reconnect automatically
  const tryAutoConnect = async () => {
    try {
      // Check if user was previously connected
      const lastConnected = localStorage.getItem("walletConnected");
      
      if (lastConnected === "true" && window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          // User has accounts available, connect automatically
          await connectWallet();
        }
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error("Auto-connect error:", error);
      setLoading(false);
    }
  };

  // Initialize the app
  useEffect(() => {
    const init = async () => {
      try {
        // Check if MetaMask is installed
        if (!window.ethereum) {
          setError("Please install MetaMask to use this dApp");
          setLoading(false);
          return;
        }

        // Try to auto-connect
        await tryAutoConnect();
        
        // Listen for account changes
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        
        // Listen for chain changes
        window.ethereum.on('chainChanged', () => {
          window.location.reload();
        });
        
      } catch (err) {
        console.error("Initialization error:", err);
        setError("Failed to initialize the app. Please check your connection and try again.");
        setLoading(false);
      }
    };

    init();

    // Cleanup
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', () => {});
      }
    };
  }, []);

  // Load data when contract is set
  useEffect(() => {
    const loadContractData = async () => {
      if (contract && account) {
        try {
          // Load contract data in parallel
          await Promise.all([
            loadVotingStatus(),
            loadCandidates(),
            checkVoterStatus(account)
          ]);
          
          // Check if user is admin
          const admin = await contract.admin();
          setIsAdmin(admin.toLowerCase() === account.toLowerCase());
          
          setLoading(false);
        } catch (error) {
          console.error("Error loading contract data:", error);
          setError("Failed to load voting data. Please try reconnecting your wallet.");
          setLoading(false);
        }
      }
    };
    
    loadContractData();
  }, [contract, account]);

  // Handle account changes
  const handleAccountsChanged = async (accounts) => {
    if (accounts.length === 0) {
      // User disconnected their wallet
      setAccount('');
      setIsAdmin(false);
      setIsRegistered(false);
      setHasVoted(false);
      localStorage.setItem("walletConnected", "false");
      setError("Please connect to MetaMask.");
      return;
    }
    
    // Update account and reconnect
    if (accounts[0] !== account) {
      setAccount(accounts[0]);
      await initializeContractWithSigner(accounts[0]);
    }
  };

  // Initialize contract with signer
  const initializeContractWithSigner = async (address) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      setProvider(provider);
      
      const signer = await provider.getSigner();
      setSigner(signer);
      
      // Connect to contract
      const contract = new ethers.Contract(
        contractAddress,
        VotingSystemArtifact.abi,
        signer
      );
      setContract(contract);
      
      // Check if user is admin
      const admin = await contract.admin();
      setIsAdmin(admin.toLowerCase() === address.toLowerCase());
      
      // Check voter status
      await checkVoterStatus(address);
      
      // Load data
      await loadVotingStatus();
      await loadCandidates();
      
      // Clear any previous errors
      setError('');
    } catch (err) {
      console.error("Contract initialization error:", err);
      setError("Failed to connect to the contract. Please check your network and try again.");
    }
  };

  // Load candidates
  const loadCandidates = async () => {
    try {
      if (contract) {
        const candidates = await contract.getAllCandidatesWithVotes();
        
        // Cache candidates in localStorage
        localStorage.setItem("candidates", JSON.stringify(
          candidates.map(c => ({
            id: c.id.toString(),
            name: c.name,
            party: c.party,
            voteCount: c.voteCount.toString()
          }))
        ));
        
        setCandidates(candidates);
      } else {
        // Try to load from cache if contract not connected
        const cachedCandidates = localStorage.getItem("candidates");
        if (cachedCandidates) {
          setCandidates(JSON.parse(cachedCandidates));
        }
      }
    } catch (err) {
      console.error("Failed to load candidates:", err);
      
      // Try to load from cache on error
      const cachedCandidates = localStorage.getItem("candidates");
      if (cachedCandidates) {
        setCandidates(JSON.parse(cachedCandidates));
      }
    }
  };

  // Load voting status
  const loadVotingStatus = async () => {
    try {
      if (contract) {
        const [started, ended, startTime, endTime] = await contract.getVotingStatus();
        const status = { 
          started, 
          ended, 
          startTime: startTime.toString(), 
          endTime: endTime.toString() 
        };
        
        // Cache in localStorage
        localStorage.setItem("votingStatus", JSON.stringify(status));
        
        setVotingStatus(status);
      } else {
        // Try to load from cache if contract not connected
        const cachedStatus = localStorage.getItem("votingStatus");
        if (cachedStatus) {
          setVotingStatus(JSON.parse(cachedStatus));
        }
      }
    } catch (err) {
      console.error("Failed to load voting status:", err);
      
      // Try to load from cache on error
      const cachedStatus = localStorage.getItem("votingStatus");
      if (cachedStatus) {
        setVotingStatus(JSON.parse(cachedStatus));
      }
    }
  };

  // Check voter status
  const checkVoterStatus = async (address) => {
    try {
      if (contract && address) {
        const voter = await contract.voters(address);
        setIsRegistered(voter.isRegistered);
        setHasVoted(voter.hasVoted);
        
        // Cache in localStorage
        localStorage.setItem("voterStatus", JSON.stringify({
          address,
          isRegistered: voter.isRegistered,
          hasVoted: voter.hasVoted
        }));
      } else if (!contract) {
        // Try to load from cache if contract not connected
        const cachedStatus = localStorage.getItem("voterStatus");
        if (cachedStatus) {
          const parsed = JSON.parse(cachedStatus);
          if (parsed.address === address) {
            setIsRegistered(parsed.isRegistered);
            setHasVoted(parsed.hasVoted);
          }
        }
      }
    } catch (err) {
      console.error("Failed to check voter status:", err);
      
      // Try to load from cache on error
      const cachedStatus = localStorage.getItem("voterStatus");
      if (cachedStatus) {
        const parsed = JSON.parse(cachedStatus);
        if (parsed.address === address) {
          setIsRegistered(parsed.isRegistered);
          setHasVoted(parsed.hasVoted);
        }
      }
    }
  };

  // Add a candidate
  const addCandidate = async (e) => {
    e.preventDefault();
    if (!candidateName || !candidateParty) return;
    
    try {
      setLoading(true);
      setError('');
      const tx = await contract.addCandidate(candidateName, candidateParty);
      await tx.wait();
      
      setCandidateName('');
      setCandidateParty('');
      await loadCandidates();
      setLoading(false);
    } catch (err) {
      console.error("Failed to add candidate:", err);
      setError(err.message || "Failed to add candidate. Please try again.");
      setLoading(false);
    }
  };

  // Register a voter
  const registerVoter = async (e) => {
    e.preventDefault();
    if (!voterAddress) return;
    
    try {
      setLoading(true);
      setError('');
      const tx = await contract.registerVoter(voterAddress);
      await tx.wait();
      
      setVoterAddress('');
      if (voterAddress.toLowerCase() === account.toLowerCase()) {
        setIsRegistered(true);
        
        // Update voter status in localStorage
        const cachedStatus = localStorage.getItem("voterStatus");
        if (cachedStatus) {
          const parsed = JSON.parse(cachedStatus);
          localStorage.setItem("voterStatus", JSON.stringify({
            ...parsed,
            isRegistered: true
          }));
        }
      }
      setLoading(false);
    } catch (err) {
      console.error("Failed to register voter:", err);
      setError(err.message || "Failed to register voter. Please try again.");
      setLoading(false);
    }
  };

  // Start voting
  const startVoting = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError('');
      const tx = await contract.startVoting(votingDuration);
      await tx.wait();
      
      await loadVotingStatus();
      setLoading(false);
    } catch (err) {
      console.error("Failed to start voting:", err);
      setError(err.message || "Failed to start voting. Please try again.");
      setLoading(false);
    }
  };

  // End voting
  const endVoting = async () => {
    try {
      setLoading(true);
      setError('');
      const tx = await contract.endVoting();
      await tx.wait();
      
      await loadVotingStatus();
      setLoading(false);
    } catch (err) {
      console.error("Failed to end voting:", err);
      setError(err.message || "Failed to end voting. Please try again.");
      setLoading(false);
    }
  };

  // Cast a vote
  const vote = async (candidateId) => {
    try {
      setLoading(true);
      setError('');
      const tx = await contract.vote(candidateId);
      await tx.wait();
      
      await loadCandidates();
      setHasVoted(true);
      
      // Update voter status in localStorage
      const cachedStatus = localStorage.getItem("voterStatus");
      if (cachedStatus) {
        const parsed = JSON.parse(cachedStatus);
        localStorage.setItem("voterStatus", JSON.stringify({
          ...parsed,
          hasVoted: true
        }));
      }
      
      setLoading(false);
    } catch (err) {
      console.error("Failed to vote:", err);
      setError(err.message || "Failed to cast your vote. Please try again.");
      setLoading(false);
    }
  };

  // Connect wallet
  const connectWallet = async () => {
    try {
      setLoading(true);
      setError('');
      
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const provider = new ethers.BrowserProvider(window.ethereum);
      setProvider(provider);
      
      const signer = await provider.getSigner();
      setSigner(signer);
      
      const account = await signer.getAddress();
      setAccount(account);
      
      // Save connection status
      localStorage.setItem("walletConnected", "true");
      
      // Connect to contract
      if (contractAddress) {
        await initializeContractWithSigner(account);
      }
      
      setLoading(false);
    } catch (err) {
      console.error("Failed to connect wallet:", err);
      setError("Failed to connect wallet. Please check MetaMask and try again.");
      localStorage.setItem("walletConnected", "false");
      setLoading(false);
    }
  };

  // Disconnect wallet
  const disconnectWallet = () => {
    setAccount('');
    setIsAdmin(false);
    setContract(null);
    setSigner(null);
    localStorage.setItem("walletConnected", "false");
  };

  // Loading state
  if (loading) {
    return <div className="app loading">Loading...</div>;
  }

  // Error state
  if (error && !account) {
    return (
      <div className="app error">
        <p>{error}</p>
        {window.ethereum && (
          <button onClick={connectWallet}>Connect Wallet</button>
        )}
      </div>
    );
  }

  return (
    <div className="app">
      <header>
        <h1>Blockchain Voting System</h1>
        <div className="account-info">
          {account ? (
            <div className="connected-account">
              <p>Connected: {account.substring(0, 6)}...{account.substring(account.length - 4)}</p>
              <button className="disconnect-btn" onClick={disconnectWallet}>Disconnect</button>
            </div>
          ) : (
            <button onClick={connectWallet}>Connect Wallet</button>
          )}
        </div>
      </header>

      {error && <div className="error-message">{error}</div>}

      <div className="container">
        {/* Admin Panel */}
        {isAdmin && (
          <div className="admin-panel">
            <h2>Admin Panel</h2>
            
            {/* Add Candidate Form */}
            <div className="card">
              <h3>Add Candidate</h3>
              <form onSubmit={addCandidate}>
                <div className="form-group">
                  <label>Name</label>
                  <input 
                    type="text" 
                    value={candidateName} 
                    onChange={(e) => setCandidateName(e.target.value)}
                    placeholder="Candidate Name"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Party</label>
                  <input 
                    type="text" 
                    value={candidateParty} 
                    onChange={(e) => setCandidateParty(e.target.value)}
                    placeholder="Political Party"
                    required
                  />
                </div>
                <button type="submit" disabled={votingStatus.started}>Add Candidate</button>
              </form>
            </div>
            
            {/* Register Voter Form */}
            <div className="card">
              <h3>Register Voter</h3>
              <form onSubmit={registerVoter}>
                <div className="form-group">
                  <label>Ethereum Address</label>
                  <input 
                    type="text" 
                    value={voterAddress} 
                    onChange={(e) => setVoterAddress(e.target.value)}
                    placeholder="0x..."
                    required
                  />
                </div>
                <button type="submit">Register Voter</button>
              </form>
            </div>
            
            {/* Voting Control */}
            <div className="card">
              <h3>Voting Control</h3>
              {!votingStatus.started ? (
                <form onSubmit={startVoting}>
                  <div className="form-group">
                    <label>Duration (minutes)</label>
                    <input 
                      type="number" 
                      value={votingDuration} 
                      onChange={(e) => setVotingDuration(e.target.value)}
                      min="1"
                      required
                    />
                  </div>
                  <button type="submit">Start Voting</button>
                </form>
              ) : !votingStatus.ended ? (
                <button onClick={endVoting}>End Voting</button>
              ) : (
                <p>Voting has ended</p>
              )}
            </div>
          </div>
        )}

        {/* Voter Panel */}
        <div className="voter-panel">
          <h2>Voting Panel</h2>
          
          {/* Voting Status */}
          <div className="card">
            <h3>Voting Status</h3>
            {votingStatus.started ? (
              votingStatus.ended ? (
                <p className="status ended">Voting has ended</p>
              ) : (
                <p className="status active">Voting is active</p>
              )
            ) : (
              <p className="status not-started">Voting has not started yet</p>
            )}
          </div>
          
          {/* Voter Status */}
          <div className="card">
            <h3>Your Status</h3>
            {!account ? (
              <p>Connect your wallet to check status</p>
            ) : isRegistered ? (
              hasVoted ? (
                <p>You have already voted</p>
              ) : (
                <p>You are registered to vote</p>
              )
            ) : (
              <p>You are not registered to vote</p>
            )}
          </div>
          
          {/* Candidates List */}
          <div className="card candidates">
            <h3>Candidates</h3>
            {candidates.length > 0 ? (
              <ul>
                {candidates.map((candidate, index) => (
                  <li key={candidate.id || index}>
                    <div className="candidate-info">
                      <strong>{candidate.name}</strong> ({candidate.party})
                      <span className="vote-count">Votes: {candidate.voteCount.toString()}</span>
                    </div>
                    {account && isRegistered && !hasVoted && votingStatus.started && !votingStatus.ended && (
                      <button onClick={() => vote(candidate.id)}>Vote</button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No candidates available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App; 